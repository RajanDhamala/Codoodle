import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";
import useUserStore from "../UserStore";
import type { GuestProfile } from "../Utils/guestProfile";
import { createSocket } from "../Utils/socket";
import { GameSessionView } from "./GameSessionView";
import { GuestProfileSetup } from "./GuestProfileSetup";
import type {
  GameSettings,
  Point,
  RoleInfo,
  RoomSnapshot,
  Stroke,
  StrokeKind,
} from "./GameTypes";

const defaultSettings: GameSettings = {
  maxPlayers: 6,
  turnCyclesBeforeVote: 3,
  allowUndo: true,
  allowKick: true,
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

const GamePage = () => {
  const {
    guestProfile,
    currentUser,
    setGuestProfile,
    clearGuestProfile,
    setCurrentUser,
    clearCurrentUser,
  } = useUserStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(() =>
    guestProfile ? "connecting" : "setup"
  );
  const [connectionError, setConnectionError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<GameSettings>(defaultSettings);
  const [activeTool, setActiveTool] = useState<StrokeKind>("path");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(7);
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
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
    room?.phase === "drawing" && currentUser && room.currentPlayerId === currentUser.id
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

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    setConnectionStatus("connecting");
    setConnectionError("");
  };

  const resetProfile = () => {
    if (room) {
      toast.error("Leave the room before changing player.");
      return;
    }

    socket?.disconnect();
    clearGuestProfile();
    setConnectionStatus("setup");
    setConnectionError("");
  };

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
    if (draftStroke) drawStroke(context, draftStroke, width, height);
  }, [draftStroke, room?.strokes]);

  useEffect(() => {
    if (!guestProfile) {
      setSocket(null);
      clearCurrentUser();
      setConnectionStatus("setup");
      return;
    }

    setConnectionStatus("connecting");
    setConnectionError("");

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

    nextSocket.on("session:ready", ({ user }) => {
      setCurrentUser(user);
    });

    nextSocket.on("group-created", ({ room }: { room: RoomSnapshot }) => {
      setRoom(room);
      setRoleInfo(null);
      setJoinCode(room.code);
    });

    nextSocket.on("group-joined", ({ room }: { room: RoomSnapshot }) => {
      setRoom(room);
      setRoleInfo(null);
    });

    nextSocket.on("group-updated", ({ room }: { room: RoomSnapshot }) => {
      setRoom(room);
    });

    nextSocket.on("group-error", ({ message }: { message: string }) => {
      toast.error(message);
    });

    nextSocket.on("group-left", () => {
      setRoom(null);
      setRoleInfo(null);
      setDraftStroke(null);
    });

    return () => {
      nextSocket.disconnect();
      setSocket((previousSocket) => (previousSocket === nextSocket ? null : previousSocket));
    };
  }, [clearCurrentUser, guestProfile, setCurrentUser]);

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
    socket?.emit("create-group", { settings: settingsDraft });
  };

  const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Enter a room code.");
      return;
    }

    socket?.emit("join-group", { roomId: joinCode.trim().toUpperCase() });
  };

  const updateSettings = () => {
    setRoom((previousRoom) =>
      previousRoom ? { ...previousRoom, settings: settingsDraft } : previousRoom
    );
  };

  const startGame = () => {
    // Game phases are intentionally not part of the minimal socket test.
  };

  const leaveRoom = () => {
    socket?.emit("leave-group");
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
    void playerId;
  };

  const submitDraftStroke = () => {
    if (!draftStroke) return;
    setDraftStroke(null);
  };

  const undoDraftStroke = () => {
    setDraftStroke(null);
    setIsDrawing(false);
  };

  const sendChat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChatDraft("");
  };

  const submitVote = (playerId: string) => {
    void playerId;
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

        return nextStroke;
      }

      const nextStroke = {
        ...previousStroke,
        end: point,
      };

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
        return nextStroke;
      }

      const nextStroke = { ...previousStroke, end: point };
      return nextStroke;
    });
  };

  if (!guestProfile) {
    return <GuestProfileSetup onSave={saveProfile} />;
  }

  return (
    <GameSessionView
      room={room}
      roleInfo={roleInfo}
      connectionStatus={connectionStatus}
      connectionError={connectionError}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      settingsDraft={settingsDraft}
      setSettingsDraft={setSettingsDraft}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      strokeColor={strokeColor}
      setStrokeColor={setStrokeColor}
      strokeSize={strokeSize}
      setStrokeSize={setStrokeSize}
      draftStrokeExists={Boolean(draftStroke)}
      isMyTurn={isMyTurn}
      canvasCursorClass={canvasCursorClass}
      hasVoted={hasVoted}
      progressPercent={progressPercent}
      currentPlayer={currentPlayer}
      isHost={isHost}
      chatDraft={chatDraft}
      setChatDraft={setChatDraft}
      canvasRef={canvasRef}
      onResetProfile={resetProfile}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onUpdateSettings={updateSettings}
      onStartGame={startGame}
      onLeaveRoom={leaveRoom}
      onCopyRoomCode={copyRoomCode}
      onKickPlayer={kickPlayer}
      onUndoDraftStroke={undoDraftStroke}
      onSubmitDraftStroke={submitDraftStroke}
      onSubmitVote={submitVote}
      onSendChat={sendChat}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
};

export default GamePage;
