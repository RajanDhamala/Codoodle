import {
  Brush,
  Circle,
  Copy,
  Crown,
  Eraser,
  LogOut,
  MessageCircle,
  Minus,
  Palette,
  Play,
  RotateCcw,
  Send,
  Square,
  Trophy,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";
import { createSocket, socketBaseUrl } from "../Utils/socket";

type GamePhase = "lobby" | "drawing" | "voting" | "results";
type StrokeKind = "path" | "eraser" | "line" | "rect" | "circle";

type Point = {
  x: number;
  y: number;
};

type User = {
  id: string;
  email: string;
  fullname: string;
  avatar?: string | null;
};

type Player = {
  id: string;
  fullname: string;
  avatar?: string | null;
  connected: boolean;
  isHost: boolean;
};

type GameSettings = {
  maxPlayers: number;
  turnCyclesBeforeVote: number;
  allowUndo: boolean;
  allowKick: boolean;
};

type Stroke = {
  id?: string;
  kind: StrokeKind;
  color: string;
  size: number;
  points?: Point[];
  start?: Point;
  end?: Point;
  playerId?: string;
  playerName?: string;
  turnNumber?: number;
};

type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
};

type Activity = {
  id: string;
  message: string;
  createdAt: string;
};

type GameResult = {
  word: string;
  category: string;
  imposterId: string;
  imposterName: string;
  selectedTargetId: string | null;
  selectedTargetName: string | null;
  artistsWin: boolean;
  voteCounts: Array<{
    playerId: string;
    playerName: string;
    votes: number;
  }>;
};

type RoomSnapshot = {
  code: string;
  hostId: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  connectedPlayerCount: number;
  turnOrder: string[];
  currentPlayerId: string | null;
  submittedTurns: number;
  totalTurnsBeforeVote: number;
  strokes: Stroke[];
  chat: ChatMessage[];
  activity: Activity[];
  votesCount: number;
  eligibleVotes: number;
  votedPlayerIds: string[];
  result: GameResult | null;
};

type RoleInfo =
  | {
      role: "artist";
      word: string;
      category: string;
    }
  | {
      role: "imposter";
      category: string;
    };

const defaultSettings: GameSettings = {
  maxPlayers: 6,
  turnCyclesBeforeVote: 3,
  allowUndo: true,
  allowKick: true,
};

const toolOptions: Array<{
  kind: StrokeKind;
  label: string;
  icon: typeof Brush;
}> = [
  { kind: "path", label: "Brush", icon: Brush },
  { kind: "eraser", label: "Eraser", icon: Eraser },
  { kind: "line", label: "Line", icon: Minus },
  { kind: "rect", label: "Rectangle", icon: Square },
  { kind: "circle", label: "Circle", icon: Circle },
];

const colorOptions = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#8b5cf6"];

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Fallback copy failed.");
  }
};

const pointToCanvas = (point: Point, width: number, height: number) => ({
  x: point.x * width,
  y: point.y * height,
});

const drawStroke = (
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) => {
  context.save();
  context.lineWidth = stroke.size;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke.kind === "eraser" ? "#ffffff" : stroke.color;

  if ((stroke.kind === "path" || stroke.kind === "eraser") && stroke.points?.length) {
    const [firstPoint, ...restPoints] = stroke.points;
    const start = pointToCanvas(firstPoint, width, height);

    context.beginPath();
    context.moveTo(start.x, start.y);
    restPoints.forEach((point) => {
      const next = pointToCanvas(point, width, height);
      context.lineTo(next.x, next.y);
    });
    context.stroke();
    context.restore();
    return;
  }

  if (!stroke.start || !stroke.end) {
    context.restore();
    return;
  }

  const start = pointToCanvas(stroke.start, width, height);
  const end = pointToCanvas(stroke.end, width, height);
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const boxWidth = Math.abs(end.x - start.x);
  const boxHeight = Math.abs(end.y - start.y);

  context.beginPath();
  if (stroke.kind === "line") {
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  } else if (stroke.kind === "rect") {
    context.rect(left, top, boxWidth, boxHeight);
  } else if (stroke.kind === "circle") {
    context.ellipse(
      left + boxWidth / 2,
      top + boxHeight / 2,
      boxWidth / 2,
      boxHeight / 2,
      0,
      0,
      Math.PI * 2
    );
  }
  context.stroke();
  context.restore();
};

const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
};

const GamePage = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<GameSettings>(defaultSettings);
  const [activeTool, setActiveTool] = useState<StrokeKind>("path");
  const [strokeColor, setStrokeColor] = useState(colorOptions[0]);
  const [strokeSize, setStrokeSize] = useState(7);
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [livePreviewStroke, setLivePreviewStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentPlayer = useMemo(() => {
    if (!room?.currentPlayerId) return null;
    return room.players.find((player) => player.id === room.currentPlayerId) || null;
  }, [room]);

  const selfPlayer = useMemo(() => {
    if (!currentUser || !room) return null;
    return room.players.find((player) => player.id === currentUser.id) || null;
  }, [currentUser, room]);

  const isHost = Boolean(selfPlayer?.isHost);
  const isMyTurn = Boolean(
    room?.phase === "drawing" &&
      currentUser &&
      room.currentPlayerId === currentUser.id
  );
  const canStartAction = isMyTurn && !draftStroke;
  const canvasCursorClass = isMyTurn
    ? draftStroke && !isDrawing
      ? "cursor-not-allowed"
      : "cursor-crosshair"
    : "cursor-default";
  const hasVoted = Boolean(currentUser && room?.votedPlayerIds.includes(currentUser.id));
  const progressPercent = room?.totalTurnsBeforeVote
    ? Math.min(100, Math.round((room.submittedTurns / room.totalTurnsBeforeVote) * 100))
    : 0;

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    room?.strokes.forEach((stroke) => drawStroke(context, stroke, width, height));
    if (livePreviewStroke) drawStroke(context, livePreviewStroke, width, height);
    if (draftStroke) drawStroke(context, draftStroke, width, height);
  }, [draftStroke, livePreviewStroke, room?.strokes]);

  useEffect(() => {
    const nextSocket = createSocket();
    setSocket(nextSocket);

    nextSocket.on("connect", () => {
      setConnectionStatus("connected");
      setConnectionError("");
    });

    nextSocket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    nextSocket.on("connect_error", (error) => {
      setConnectionStatus("error");
      setConnectionError(error.message || "Could not connect to the game server.");
    });

    nextSocket.on("session:ready", ({ user }: { user: User }) => {
      setCurrentUser(user);
    });

    nextSocket.on("room:snapshot", (snapshot: RoomSnapshot) => {
      setRoom(snapshot);
      if (snapshot.phase !== "drawing") {
        setLivePreviewStroke(null);
      }
      if (snapshot.phase === "lobby") {
        setRoleInfo(null);
      }
    });

    nextSocket.on("game:role", (role: RoleInfo) => {
      setRoleInfo(role);
    });

    nextSocket.on("room:error", ({ message }: { message: string }) => {
      toast.error(message);
    });

    nextSocket.on("room:kicked", ({ message }: { message: string }) => {
      toast.error(message);
      setRoom(null);
      setRoleInfo(null);
      setDraftStroke(null);
      setLivePreviewStroke(null);
    });

    nextSocket.on("room:left", () => {
      setRoom(null);
      setRoleInfo(null);
      setDraftStroke(null);
      setLivePreviewStroke(null);
    });

    nextSocket.on("draw:preview", (stroke: Stroke) => {
      setLivePreviewStroke(stroke);
    });

    nextSocket.on("draw:preview-clear", ({ playerId }: { playerId?: string }) => {
      setLivePreviewStroke((previousStroke) => {
        if (!previousStroke) return previousStroke;
        if (!playerId || previousStroke.playerId === playerId) return null;
        return previousStroke;
      });
    });

    nextSocket.on("game:results", (result: GameResult) => {
      setLivePreviewStroke(null);
      setRoom((previousRoom) =>
        previousRoom ? { ...previousRoom, phase: "results", result } : previousRoom
      );
    });

    return () => {
      nextSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (room?.settings) {
      setSettingsDraft(room.settings);
    }
  }, [room?.code, room?.settings]);

  useEffect(() => {
    if (isMyTurn) return;

    setDraftStroke(null);
    setIsDrawing(false);
  }, [isMyTurn]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => redrawCanvas());
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [redrawCanvas]);

  const createRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    socket?.emit("room:create", { settings: settingsDraft });
  };

  const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Enter a room code.");
      return;
    }

    socket?.emit("room:join", { roomCode: joinCode.trim().toUpperCase() });
  };

  const updateSettings = () => {
    socket?.emit("room:update-settings", { settings: settingsDraft });
  };

  const startGame = () => {
    socket?.emit("game:start");
  };

  const leaveRoom = () => {
    socket?.emit("room:leave");
  };

  const copyRoomCode = async () => {
    if (!room) return;

    try {
      await copyText(room.code);
      toast.success("Room code copied.");
    } catch {
      toast.error("Could not copy room code.");
    }
  };

  const kickPlayer = (playerId: string) => {
    socket?.emit("room:kick", { playerId });
  };

  const submitDraftStroke = () => {
    if (!draftStroke) return;
    socket?.emit("draw:submit", { stroke: draftStroke });
    socket?.emit("draw:preview-clear");
    setDraftStroke(null);
  };

  const undoDraftStroke = () => {
    socket?.emit("draw:preview-clear");
    setDraftStroke(null);
    setIsDrawing(false);
  };

  const sendChat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatDraft.trim()) return;

    socket?.emit("chat:send", { message: chatDraft.trim() });
    setChatDraft("");
  };

  const submitVote = (playerId: string) => {
    socket?.emit("vote:submit", { playerId });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canStartAction) return;

    const point = getCanvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);

    if (activeTool === "path" || activeTool === "eraser") {
      const nextStroke = {
        kind: activeTool,
        color: strokeColor,
        size: strokeSize,
        points: [point],
      } satisfies Stroke;

      setDraftStroke(nextStroke);
      socket?.emit("draw:preview", { stroke: nextStroke });
      return;
    }

    const nextStroke = {
      kind: activeTool,
      color: strokeColor,
      size: strokeSize,
      start: point,
      end: point,
    } satisfies Stroke;

    setDraftStroke(nextStroke);
    socket?.emit("draw:preview", { stroke: nextStroke });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(event);

    setDraftStroke((previousStroke) => {
      if (!previousStroke) return previousStroke;

      if (previousStroke.kind === "path" || previousStroke.kind === "eraser") {
        const nextStroke = {
          ...previousStroke,
          points: [...(previousStroke.points || []), point],
        };

        socket?.emit("draw:preview", { stroke: nextStroke });
        return nextStroke;
      }

      const nextStroke = {
        ...previousStroke,
        end: point,
      };

      socket?.emit("draw:preview", { stroke: nextStroke });
      return nextStroke;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(event);
    setIsDrawing(false);

    setDraftStroke((previousStroke) => {
      if (!previousStroke) return previousStroke;

      if (previousStroke.kind === "path" || previousStroke.kind === "eraser") {
        const points = [...(previousStroke.points || []), point];
        const nextStroke = points.length > 1 ? { ...previousStroke, points } : null;
        if (nextStroke) {
          socket?.emit("draw:preview", { stroke: nextStroke });
        } else {
          socket?.emit("draw:preview-clear");
        }
        return nextStroke;
      }

      const nextStroke = { ...previousStroke, end: point };
      socket?.emit("draw:preview", { stroke: nextStroke });
      return nextStroke;
    });
  };

  if (connectionStatus === "error" && !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
        <section className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="mt-3 text-sm leading-6 text-red-100/80">
            The game socket needs your OAuth session cookie. Server said: {connectionError}
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Go to login
          </a>
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-50">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
          <section className="grid w-full gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-300">
                Drawing imposter
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Draw one stroke, hide the clue, catch the imposter.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                Create a private room, share the code, and play a fast turn-based canvas game.
                Artists see the exact word. The imposter only sees the category.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <InfoTile label="Mode" value="Live rooms" />
                <InfoTile label="Turns" value="One action" />
                <InfoTile label="Server" value={connectionStatus} />
              </div>
              <p className="mt-5 text-xs text-zinc-500">Socket URL: {socketBaseUrl}</p>
            </div>

            <div className="space-y-5">
              <form
                onSubmit={createRoom}
                className="rounded-3xl border border-white/10 bg-white/[0.05] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400 text-zinc-950">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Create room</h2>
                    <p className="text-sm text-zinc-400">You become the host.</p>
                  </div>
                </div>

                <SettingsControls
                  settings={settingsDraft}
                  setSettings={setSettingsDraft}
                  disabled={false}
                />

                <button
                  type="submit"
                  className="mt-5 w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300"
                >
                  Create game room
                </button>
              </form>

              <form
                onSubmit={joinRoom}
                className="rounded-3xl border border-white/10 bg-white/[0.05] p-5"
              >
                <h2 className="font-semibold">Join room</h2>
                <p className="mt-1 text-sm text-zinc-400">Paste a room code from the host.</p>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] outline-none ring-sky-400/40 transition focus:ring-4"
                  maxLength={6}
                />
                <button
                  type="submit"
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                  Join room
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-zinc-950/95 px-4 py-4">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Room</span>
              <button
                onClick={copyRoomCode}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-zinc-100 transition hover:bg-white/10"
              >
                {room.code}
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Drawing Imposter</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PhasePill phase={room.phase} />
            <button
              onClick={leaveRoom}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Leave
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 xl:grid-cols-[290px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4 text-sky-300" />
                Players
              </h2>
              <span className="text-xs text-zinc-400">
                {room.connectedPlayerCount}/{room.settings.maxPlayers}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          player.connected ? "bg-emerald-400" : "bg-zinc-600"
                        }`}
                      />
                      <p className="truncate text-sm font-medium">{player.fullname}</p>
                      {player.isHost && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {player.id === currentUser?.id ? "You" : player.connected ? "Online" : "Offline"}
                    </p>
                  </div>
                  {isHost &&
                    room.phase === "lobby" &&
                    room.settings.allowKick &&
                    player.id !== currentUser?.id && (
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                        aria-label={`Kick ${player.fullname}`}
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="font-semibold">Role</h2>
            <RoleCard roleInfo={roleInfo} phase={room.phase} />
          </Panel>

          {(room.phase === "lobby" || room.phase === "results") && (
            <Panel>
              <h2 className="font-semibold">Host controls</h2>
              <SettingsControls
                settings={settingsDraft}
                setSettings={setSettingsDraft}
                disabled={!isHost || room.phase !== "lobby"}
              />
              {room.phase === "lobby" && (
                <button
                  onClick={updateSettings}
                  disabled={!isHost}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save settings
                </button>
              )}
              <button
                onClick={startGame}
                disabled={!isHost}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                {room.phase === "results" ? "Play again" : "Start game"}
              </button>
              {!isHost && (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Waiting for the host to change settings or start.
                </p>
              )}
            </Panel>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Turn</p>
                <h2 className="text-xl font-semibold">
                  {room.phase === "drawing"
                    ? isMyTurn
                      ? "Your turn: draw one action"
                      : `${currentPlayer?.fullname || "Next player"} is drawing`
                    : room.phase === "voting"
                      ? "Vote for the imposter"
                      : room.phase === "results"
                        ? "Round complete"
                        : "Waiting in lobby"}
                </h2>
              </div>
              <div className="min-w-44">
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>Action progress</span>
                  <span>
                    {room.submittedTurns}/{room.totalTurnsBeforeVote || 0}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-2">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`h-[min(62vh,620px)] min-h-[360px] w-full rounded-2xl bg-white shadow-inner ${canvasCursorClass}`}
              style={{ touchAction: "none" }}
            />
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {toolOptions.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.kind}
                      onClick={() => setActiveTool(tool.kind)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        activeTool === tool.kind
                          ? "border-sky-300 bg-sky-400 text-zinc-950"
                          : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tool.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-zinc-400" />
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      className={`h-7 w-7 rounded-full border-2 ${
                        strokeColor === color ? "border-white" : "border-transparent"
                      }`}
                      style={{ background: color }}
                      aria-label={`Use color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(event) => setStrokeColor(event.target.value)}
                    className="h-8 w-9 rounded-lg border border-white/10 bg-transparent"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  Size
                  <input
                    type="range"
                    min={2}
                    max={32}
                    value={strokeSize}
                    onChange={(event) => setStrokeSize(Number(event.target.value))}
                    className="w-24"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-sm text-zinc-400">
                {draftStroke
                  ? "Draft ready. Submit it to pass the turn."
                  : isMyTurn
                    ? "Draw one brush action, eraser action, or shape."
                    : "Canvas is locked until your turn."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={undoDraftStroke}
                  disabled={!draftStroke || !room.settings.allowUndo}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Undo draft
                </button>
                <button
                  onClick={submitDraftStroke}
                  disabled={!draftStroke}
                  className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit action
                </button>
              </div>
            </div>
          </Panel>
        </section>

        <aside className="space-y-4">
          {room.phase === "voting" && (
            <Panel>
              <h2 className="font-semibold">Vote</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {room.votesCount}/{room.eligibleVotes} connected players voted.
              </p>
              <div className="mt-4 space-y-2">
                {room.players
                  .filter((player) => player.id !== currentUser?.id)
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => submitVote(player.id)}
                      disabled={hasVoted}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{player.fullname}</span>
                      <span className="text-xs text-zinc-500">
                        {player.connected ? "online" : "offline"}
                      </span>
                    </button>
                  ))}
              </div>
              {hasVoted && <p className="mt-3 text-xs text-emerald-300">Vote submitted.</p>}
            </Panel>
          )}

          {room.phase === "results" && room.result && (
            <Panel>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-5 w-5 text-amber-300" />
                {room.result.artistsWin ? "Artists win" : "Imposter wins"}
              </h2>
              <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
                <p>
                  Word: <span className="font-semibold text-white">{room.result.word}</span>
                </p>
                <p>
                  Category:{" "}
                  <span className="font-semibold text-white">{room.result.category}</span>
                </p>
                <p>
                  Imposter:{" "}
                  <span className="font-semibold text-white">{room.result.imposterName}</span>
                </p>
                <p>
                  Voted out:{" "}
                  <span className="font-semibold text-white">
                    {room.result.selectedTargetName || "No clear majority"}
                  </span>
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {room.result.voteCounts.map((count) => (
                  <div
                    key={count.playerId}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                  >
                    <span>{count.playerName}</span>
                    <span className="font-semibold">{count.votes}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4 text-sky-300" />
              Chat
            </h2>
            <div className="mt-4 flex max-h-72 flex-col-reverse gap-2 overflow-y-auto pr-1">
              {[...room.chat].reverse().map((message) => (
                <div key={message.id} className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="truncate font-medium text-zinc-300">{message.playerName}</span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 break-words text-sm text-zinc-100">{message.message}</p>
                </div>
              ))}
              {!room.chat.length && <p className="text-sm text-zinc-500">No messages yet.</p>}
            </div>
            <form onSubmit={sendChat} className="mt-3 flex gap-2">
              <input
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Message"
                maxLength={280}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4"
              />
              <button
                type="submit"
                className="rounded-xl bg-white px-3 py-2 text-zinc-950 transition hover:bg-zinc-200"
                aria-label="Send chat"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </Panel>

          <Panel>
            <h2 className="font-semibold">Activity</h2>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {[...room.activity].reverse().map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 px-3 py-2">
                  <p className="text-sm text-zinc-200">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatTime(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
};

const Panel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}>
    {children}
  </section>
);

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <p className="mt-2 font-semibold text-zinc-100">{value}</p>
  </div>
);

const PhasePill = ({ phase }: { phase: GamePhase }) => {
  const label = {
    lobby: "Lobby",
    drawing: "Drawing",
    voting: "Voting",
    results: "Results",
  }[phase];

  return (
    <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-sm font-medium text-sky-200">
      {label}
    </span>
  );
};

const RoleCard = ({ roleInfo, phase }: { roleInfo: RoleInfo | null; phase: GamePhase }) => {
  if (phase === "lobby") {
    return <p className="mt-3 text-sm leading-6 text-zinc-400">Your role appears when the host starts.</p>;
  }

  if (!roleInfo) {
    return <p className="mt-3 text-sm leading-6 text-zinc-400">Waiting for your private role.</p>;
  }

  if (roleInfo.role === "imposter") {
    return (
      <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200">Imposter</p>
        <p className="mt-2 text-sm text-red-50">
          You only know the category: <span className="font-semibold">{roleInfo.category}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Artist</p>
      <p className="mt-2 text-sm text-emerald-50">
        Word: <span className="font-semibold">{roleInfo.word}</span>
      </p>
      <p className="mt-1 text-xs text-emerald-100/70">Category: {roleInfo.category}</p>
    </div>
  );
};

const SettingsControls = ({
  settings,
  setSettings,
  disabled,
}: {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  disabled: boolean;
}) => (
  <div className="mt-4 space-y-4">
    <label className="block">
      <span className="text-sm text-zinc-400">Max players</span>
      <input
        type="number"
        min={3}
        max={10}
        value={settings.maxPlayers}
        disabled={disabled}
        onChange={(event) =>
          setSettings((previous) => ({
            ...previous,
            maxPlayers: Number(event.target.value),
          }))
        }
        className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4 disabled:opacity-50"
      />
    </label>
    <label className="block">
      <span className="text-sm text-zinc-400">Turn cycles before voting</span>
      <input
        type="number"
        min={1}
        max={5}
        value={settings.turnCyclesBeforeVote}
        disabled={disabled}
        onChange={(event) =>
          setSettings((previous) => ({
            ...previous,
            turnCyclesBeforeVote: Number(event.target.value),
          }))
        }
        className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4 disabled:opacity-50"
      />
    </label>
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
      <span>Allow draft undo</span>
      <input
        type="checkbox"
        checked={settings.allowUndo}
        disabled={disabled}
        onChange={(event) =>
          setSettings((previous) => ({
            ...previous,
            allowUndo: event.target.checked,
          }))
        }
      />
    </label>
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
      <span>Allow kick in lobby</span>
      <input
        type="checkbox"
        checked={settings.allowKick}
        disabled={disabled}
        onChange={(event) =>
          setSettings((previous) => ({
            ...previous,
            allowKick: event.target.checked,
          }))
        }
      />
    </label>
  </div>
);

export default GamePage;
