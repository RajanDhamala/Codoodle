
import { io } from "socket.io-client"
import { v4 as uuidv4 } from 'uuid';

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
import type React from "react";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import { socketBaseUrl } from "../Utils/socket";
import { AvatarBadge } from "./GameAvatar";
import {
  defaultGameSettings,
  type ConnectionStatus,
  type GameResult,
  type GameSettings,
  type RoleInfo,
  type StrokeKind,
  type User,
} from "./GameTypes";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

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


type GameSessionViewProps = {
  connectionStatus: ConnectionStatus;
  connectionError: string;
};

export const GameSessionView = ({
  connectionStatus,
  connectionError,
}: GameSessionViewProps) => {

  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const clearSocketInstance = useSocketStore((state) => state.clearSocketInstance);
  const [gorupId, setGroupId] = useState<string | null>(null);

  const activeUser = useMemo<User | null>(() => {
    if (currentUser) return currentUser;
    if (!guestProfile) return null;

    return {
      id: guestProfile.id,
      username: guestProfile.username,
      avatar: guestProfile.avatar,
    };
  }, [currentUser, guestProfile]);

  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<GameSettings>(defaultGameSettings);
  const [activeTool, setActiveTool] = useState<StrokeKind>("path");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(7);
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [chatHistry, setChatHistry] = useState([]);
  const [Msg, setMsg] = useState<string>("")
  const [members, setMember] = useState([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState()
  const [admin, setAdmin] = useState(null)

  const url = useParams()
  const roomId = url.roomId

  console.log("room id:", roomId, url)

  useEffect(() => {
    if (!socketInstance) return;
    return () => {
    };
  }, [activeUser, joinCode, settingsDraft, socketInstance]);

  const resetProfile = () => {
    if (room) {
      toast.error("Leave the room before changing player.");
      return;
    }
    socketInstance?.disconnect();
    clearSocketInstance(socketInstance);
    clearGuestProfile();
    clearCurrentUser();
  };


  const CreateRoom = () => {
    socketInstance?.emit("create-group", { settings: settingsDraft, currentUser: activeUser });
    toast.success("Room created successfully!");
  }

  const joinRoom = () => {
    const normalizedCode = joinCode.trim()
    if (!normalizedCode) {
      toast.error("Enter a room code.");
      return;
    }
    setJoinCode(normalizedCode);
    socketInstance?.emit("join-group", {
      id: normalizedCode,
      roomId: normalizedCode,
      currentUser: activeUser,
    });
    setGroupId(normalizedCode)
    setRoom({ code: normalizedCode, phase: "lobby", strokes: [], players: [], connectedPlayerCount: 0, totalTurnsBeforeVote: 0, submittedTurns: 0, eligibleVotes: 0 });
  };

  const LeaveRoom = () => {
    if (!gorupId) {
      return
    }
    socketInstance?.emit("leave-group", { id: gorupId })
    toast.success("room left successfully!")
    setRoom(null)
    setGroupId(null)
  }

  const SendGroupMessage = () => {
    if (!gorupId) {
      return
    }
    const trimmed = Msg.trim()
    if (!trimmed) {
      return
    }
    socketInstance?.emit("send-group-message", { id: gorupId, message: trimmed })
    toast.success("message sent successfully!")
    setChatHistry((prev) => {
      return [
        ...prev,
        {
          sender: "you",
          msg: Msg
        }]
    })
    setMsg("")
  }

  useEffect(() => {
    if (!socketInstance) return;
    socketInstance.on("group-created", (data) => {
      console.log("Room created:", data);
      setGroupId(data.trimmed);
      setRoom(data.trimmed)
      console.log("current user:", currentUser)
      setAdmin(currentUser)

    })

    socketInstance.on("recive-group-message", (data) => {
      console.log("message recived:", data);
      setChatHistry((prev) => {
        return [
          ...prev, {
            sender: data.user.username,
            msg: data.message,
          }
        ]

      })
    })

    socketInstance.on("new-user-joined", (data) => {
      console.log("joined gorup data:", data.user)
      const newuser = data.user
      setMember((prev) => {
        return [
          ...prev,
          newuser
        ]
      })
    })

    socketInstance.on("group-joined", (data) => {
      console.log("data from joining:", data)
      console.log(currentUser?.username || currentUser?.id)
      const filteredMembers = data.members.filter(member => {
        const isCurrentUsername = currentUser?.username && member.username === currentUser.username;
        const isCurrentId = currentUser?.id && member.id === currentUser.id;

        return !(isCurrentUsername || isCurrentId);
      });
      setSettings(data.settings)
      console.log("settings i got :", data.settings)
      setAdmin(data.settings.owner)
      console.log("owner:", data.settings.owner)
      setMember(filteredMembers);
    })
    return () => {
      socketInstance.off("group-created")
      socketInstance.off("recive-group-message")
      socketInstance.off("new-user-joined")
      socketInstance.off("group-joined")
    }
  })

  type Points = {
    x: number,
    y: number
  }
  type Stroke = {
    initial: Points | null,
    intermediate: Points[],
    final: Points | null,
    color: string | null,
    width: number | null,
    id?: Number | string | null,
  }

  const isUDrawing = useRef(false)
  const isOpponentDrawing = useRef(false)
  const [bgColor, setbgColor] = useState("white")
  // const [strokeSize, setstrokeSize] = useState(5)

  const localStrokeRef = useRef<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,
    id: null,
  })
  const activeIdref = useRef(null)
  const pointerIndexRef = useRef<number>(-1)
  const historyLengthRef = useRef(0)
  const [Histry, setHistry] = useState<Stroke[]>([])
  const remoteStrokeMapRef = useRef<Record<string, Stroke>>({})
  const dummyColor = ["red", "blue", "green", "yellow", "brown", "purple", "pink", "black"]
  const [isConnecting, setisConnecting] = useState<Boolean>(false)
  const [isConnected, setisConnected] = useState<Boolean>(false)
  const localColorRef = useRef<string>("black")
  const localWidthRef = useRef<number>(5)
  const [socket, setSocket] = useState<any>()

  const addStrokeToHistory = (stroke: Stroke) => {
    pointerIndexRef.current = historyLengthRef.current
    historyLengthRef.current++

    setHistry((prev) => {
      const updatedHistory: Stroke[] = []

      prev.forEach((item) => {
        updatedHistory.push(item)
      })

      updatedHistory.push(stroke)
      return updatedHistory
    })
  }

  useEffect(() => {
    const socketinstance = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
    })
    setisConnecting(true)

    socketinstance.on("connected", (data) => {
      setisConnected(true)
      setisConnecting(false)
      setSocket(socketinstance)
    })

    setSocket(socketinstance)

    return () => {
      socketinstance.off("connected")
      setisConnecting(false)
      setisConnected(false)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "black"
    ctx.lineWidth = strokeSize
    // canvas.style.cursor = "not-allowed";
    // will be shown when not user turn
    ctx.lineCap = "round"

    canvas.style.cursor = "crosshair";
  }, [])

  const isActiveRef = useRef(false)
  const isBlockedref = useRef(false)
  const bufferRef = useRef(0)
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectBufferedPoints = (data: Stroke) => {
    const points: Points[] = []
    const bufferIndex = bufferRef.current

    data.intermediate.forEach((position, index) => {
      if (index >= bufferIndex) {
        points.push(position)
      }
    })

    return points
  }

  const clearThrottleTimer = () => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = null
    }
    isActiveRef.current = false
  }

  const Thottler = (data: any) => {
    if (isActiveRef.current) {
      return
    }
    const arrayLength = data.intermediate.length

    // console.log("buufer index:", bufferIndex, "length:", arrayLength)
    const duplicated = collectBufferedPoints(data)
    const bufferLength2send = duplicated.length
    // console.log("sent length:", bufferLength2send)
    if (bufferLength2send == 0) {
      // console.log("not enough stores to emit")
      return
    }

    isActiveRef.current = true
    throttleTimerRef.current = setTimeout(() => {
      SendEventStream(duplicated)
      bufferRef.current = arrayLength
      isActiveRef.current = false
      throttleTimerRef.current = null
    }, 100)
  }

  const StartEventStream = (data) => {
    const uuid = uuidv4()
    activeIdref.current = uuid
    socket.emit("start-stream", { data, uuid })
  }
  const SendEventStream = (data: any) => {
    if (isBlockedref.current) {
      return
    }
    socket.emit("send-stream", { data, id: activeIdref.current })
    console.log("event stream sent")
  }

  const EndEventStream = (data: any) => {
    data = localStrokeRef.current
    clearThrottleTimer()

    const arrayLength = data.intermediate.length


    console.log("buufer index:", bufferRef.current, "length:", arrayLength)
    const duplicated = collectBufferedPoints(data)
    const bufferLength2send = duplicated.length
    console.log("sent length:", bufferLength2send)

    if (bufferLength2send > 0) {
      bufferRef.current = arrayLength

      socket.emit("send-stream", {
        data: duplicated,
        id: activeIdref.current
      })
    }

    isBlockedref.current = true
    socket.emit("end-stream", {
      data: data.final,
      id: activeIdref.current
    })

    activeIdref.current = null
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isUDrawing.current) {
      isUDrawing.current = true
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    const pos = getMousePos(e)
    ctx.moveTo(pos.x, pos.y)

    localStrokeRef.current.initial = { x: pos.x, y: pos.y }
    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
    const data = { color: localColorRef.current, width: localWidthRef.current, inital: { x: pos.x, y: pos.y } }
    isBlockedref.current = false
    StartEventStream(data)
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getMousePos(e)

    const lastPoint = localStrokeRef.current.intermediate[localStrokeRef.current.intermediate.length - 1] ?? localStrokeRef.current.initial
    if (lastPoint) {
      ctx.beginPath()
      ctx.strokeStyle = localColorRef.current
      ctx.lineWidth = localWidthRef.current
      ctx.lineCap = "round"
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.closePath()
    }

    localStrokeRef.current.final = { x: pos.x, y: pos.y }
    const selected = ctx.strokeStyle
    const width = ctx.lineWidth
    localStrokeRef.current.width = width
    localStrokeRef.current.color = String(selected)
    ctx.closePath()
    const finishedStroke = { ...localStrokeRef.current }
    addStrokeToHistory(finishedStroke)
    // EmitStroker(currentStroke)
    const data = {
      final: localStrokeRef.current.final,
      color: localStrokeRef.current.color,
      width: localStrokeRef.current.width,
    }
    EndEventStream(data)
    localStrokeRef.current = {
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null
    }
    bufferRef.current = 0
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("mouse is moving btw")
    if (!isUDrawing.current) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const res = getMousePos(e)
    ctx.lineTo(res.x, res.y)
    ctx.stroke()

    const pos = getMousePos(e)
    console.log("postion iz", pos)
    localStrokeRef.current.intermediate.push(pos)
    Thottler(localStrokeRef.current)
  }

  const HandelColorSelect = (color: string) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    localColorRef.current = color
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = strokeSize
  }, [strokeSize])


  const drawStoredStroke = (ctx: CanvasRenderingContext2D, item: Stroke) => {
    if (!item.initial || !item.final) {
      return
    }

    ctx.beginPath()
    ctx.lineCap = "round"
    ctx.lineWidth = item.width ?? 5
    ctx.strokeStyle = item.color ?? "black"
    ctx.moveTo(item.initial.x, item.initial.y)

    item.intermediate.forEach((position) => {
      ctx.lineTo(position.x, position.y)
    })

    ctx.lineTo(item.final.x, item.final.y)
    ctx.stroke()
    ctx.closePath()
  }

  const redrawHistoryUntil = (targetIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    Histry.forEach((item, index) => {
      if (index <= targetIndex) {
        drawStoredStroke(ctx, item)
      }
    })

    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
    ctx.lineCap = "round"
  }


  const HandelUndo = () => {
    const currentIndex = Math.min(pointerIndexRef.current, Histry.length - 1)
    console.log("inital strokeIndex before undo:", currentIndex)
    console.log("Ready to Undo")

    if (currentIndex <= -1) {
      console.log("no index to undo")
      pointerIndexRef.current = -1
      return
    }

    const nextIndex = currentIndex - 1
    pointerIndexRef.current = nextIndex
    redrawHistoryUntil(nextIndex)
    console.log("final strokeIndex after undo:", nextIndex)
  }

  const HandleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistry([])
    historyLengthRef.current = 0
    pointerIndexRef.current = -1
    activeIdref.current = null
  }


  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };


  const HandelRedo = () => {
    console.log("redoing stroke")

    const currentIndex = Math.min(pointerIndexRef.current, Histry.length - 1)
    console.log("inital strokeIndex before redo:", currentIndex)
    if (currentIndex >= Histry.length - 1) {
      console.log("no histry to redo")
      return
    }

    const nextIndex = currentIndex + 1
    pointerIndexRef.current = nextIndex
    redrawHistoryUntil(nextIndex)
    console.log("final strokeIndex after redo:", nextIndex)
  }

  const getRemoteStreamId = (data: any) => {
    return String(data.data.id ?? "remote")
  }

  const getLastStrokePoint = (stroke: Stroke) => {
    const lastIntermediate = stroke.intermediate[stroke.intermediate.length - 1]
    return lastIntermediate ?? stroke.initial
  }

  useEffect(() => {
    if (!socket) {
      return
    }

    socket.on("recieve-start-stream", (data: any) => {
      console.log("some one started drawing")
      if (!isOpponentDrawing.current) {
        isOpponentDrawing.current = true
      }
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.beginPath()
      const postion = data.data.data.inital
      const streamId = getRemoteStreamId(data)
      console.log("postion:", postion)
      ctx.moveTo(postion.x, postion.y)
      remoteStrokeMapRef.current[streamId] = {
        initial: { x: postion.x, y: postion.y },
        intermediate: [],
        final: null,
        color: data.data.data.color,
        width: Number(data.data.data.width),
        id: streamId,
      }
      ctx.strokeStyle = data.data.data.color
      ctx.lineWidth = data.data.data.width
      console.log(data.data.data.color, data.data.data.width)
    })

    socket.on("recieve-send-stream", (data: any) => {
      console.log("some one is drawing", data)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const streamId = getRemoteStreamId(data)
      const currentStroke = remoteStrokeMapRef.current[streamId]
      if (!currentStroke) return

      ctx.strokeStyle = currentStroke.color ?? "black"
      ctx.lineWidth = currentStroke.width ?? 5
      ctx.lineCap = "round"
      data.data.data.forEach((res: any) => {
        const lastPoint = getLastStrokePoint(currentStroke)
        if (!lastPoint) return
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(res.x, res.y)
        ctx.stroke()
        ctx.closePath()
        currentStroke.intermediate.push(res)
      })
    })

    socket.on("recieve-end-stream", (data: any) => {
      console.log("some one ended drawing", data)
      const pos = data.data.data
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const streamId = getRemoteStreamId(data)
      const currentStroke = remoteStrokeMapRef.current[streamId]
      if (!currentStroke) return

      const lastPoint = getLastStrokePoint(currentStroke)
      if (lastPoint) {
        ctx.beginPath()
        ctx.strokeStyle = currentStroke.color ?? "black"
        ctx.lineWidth = currentStroke.width ?? 5
        ctx.lineCap = "round"
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        ctx.closePath()
      }

      currentStroke.final = { x: pos.x, y: pos.y }
      addStrokeToHistory(currentStroke)
      console.log("stroke index:", pointerIndexRef.current)
      delete remoteStrokeMapRef.current[streamId]
      isOpponentDrawing.current = Object.keys(remoteStrokeMapRef.current).length > 0
    })

    return () => {
      socket.off("draw")
      socket.off("recieve-start-stream")
      socket.off("recieve-send-stream")
      socket.off("recieve-end-stream")
    }
  }, [socket])

  if (connectionStatus === "error" && !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
        <section className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-2xl font-semibold">Could not connect</h1>
          <p className="mt-3 text-sm leading-6 text-red-100/80">
            The game server rejected this guest player. Server said: {connectionError}
          </p>
          <button
            type="button"
            onClick={resetProfile}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Set up player again
          </button>
        </section>
      </main>
    );
  }

  if (!room) {
    if (!guestProfile) return null;

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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarBadge
                    avatar={guestProfile.avatar}
                    name={guestProfile.username}
                    className="h-12 w-12"
                  />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Playing as
                    </p>
                    <p className="truncate font-semibold text-zinc-100">
                      {guestProfile.username}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetProfile}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  Change player
                </button>
              </div>
              <p className="mt-5 text-xs text-zinc-500">Socket URL: {socketBaseUrl}</p>
            </div>

            <div className="space-y-5">

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
                onClick={CreateRoom}
              >
                Create game room
              </button>

              <h2 className="font-semibold">Join room</h2>
              <p className="mt-1 text-sm text-zinc-400">Paste a room code from the host.</p>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="ABC123"
                className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] outline-none ring-sky-400/40 transition focus:ring-4"
                maxLength={6}
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                onClick={joinRoom}
              >
                Join room
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const visibleMembers = members as Array<Partial<User>>;
  const visibleMessages = chatHistry as Array<{ sender?: string; msg?: string }>;
  const visibleAdmin = admin as Partial<User> | null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-zinc-950/95 px-4 py-4">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Room</span>
              <button
                onClick={() => {
                  var textField = document.createElement('textarea')
                  textField.innerText = gorupId || "not avilable"
                  document.body.appendChild(textField)
                  textField.select()
                  document.execCommand('copy')
                  textField.remove()
                  toast.success("code copied")

                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-zinc-100 transition hover:bg-white/10"
              >
                {gorupId || "not avilable"}
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Drawing Imposter</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={LeaveRoom}
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
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300">
                {visibleMembers.length + 1}
              </span>
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div className="flex items-center gap-3 rounded-2xl border border-sky-300/25 bg-sky-400/10 p-3">
                <AvatarBadge
                  avatar={activeUser?.avatar}
                  name={activeUser?.username}
                  className="h-10 w-10 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {activeUser?.username || "You"}
                  </p>
                  <p className="text-xs text-sky-200">You</p>
                </div>
                {visibleAdmin?.id === activeUser?.id || visibleAdmin?.username === activeUser?.username ? (
                  <Crown className="h-4 w-4 text-amber-300" />
                ) : null}
              </div>

              {visibleMembers.length > 0 ? (
                visibleMembers.map((item, index) => (
                  <div
                    key={`${item.id ?? item.username ?? "member"}-${index}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <AvatarBadge
                      avatar={item.avatar}
                      name={item.username}
                      className="h-10 w-10 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {item.username || "Player"}
                      </p>
                      <p className="text-xs text-zinc-500">Connected</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                  <UserX className="mx-auto h-5 w-5 text-zinc-500" />
                  <p className="mt-2 text-sm text-zinc-400">Waiting for players</p>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="flex items-center gap-2 font-semibold">
              <Crown className="h-4 w-4 text-amber-300" />
              Host
            </h2>
            {visibleAdmin ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
                <AvatarBadge
                  avatar={visibleAdmin.avatar}
                  name={visibleAdmin.username}
                  className="h-10 w-10 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {visibleAdmin.username || "Host"}
                  </p>
                  <p className="text-xs text-amber-100/70">Room owner</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">Host will appear here</p>
            )}
          </Panel>
        </aside>

        <section className="min-w-0 space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Turn</p>

              </div>
              <div className="min-w-44">
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>Action progress</span>
                  <span>
                    {room.submittedTurns}/{room.totalTurnsBeforeVote || 0}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">

                </div>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden p-2">
            <canvas
              ref={canvasRef}
              className=" rounded-xl bg-white "
              onPointerDown={onMouseDown}
              height={500}
              width={800}
              onPointerMove={onMouseMove}
              onPointerUp={onMouseUp} />
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
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${activeTool === tool.kind
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
                      onClick={() => {

                        HandelColorSelect(color)

                      }}
                      className={`h-7 w-7 rounded-full border-2 ${strokeColor === color ? "border-white" : "border-transparent"
                        }`}
                      style={{ background: color }}
                      aria-label={`Use color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(event) => {
                      HandelColorSelect(strokeColor)
                    }
                    }
                    className="h-8 w-9 rounded-lg border border-white/10 bg-transparent"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  Size
                  <input
                    type="range"
                    min={2}
                    max={32}
                    value={localWidthRef.current}
                    onChange={(e) => {
                      setStrokeSize(Number(e.currentTarget.value))
                      const value = Number(e.currentTarget.value)
                      localWidthRef.current = value
                    }}
                    className="w-24"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">

              <div className="flex gap-2">
                <button

                  onClick={HandelUndo}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Undo draft
                </button>
                <button
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
                  .filter((player) => player.id !== activeUser?.id)
                  .map((player) => (
                    <button
                      key={player.id}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{player.username}</span>
                      <span className="text-xs text-zinc-500">
                        {player.connected ? "online" : "offline"}
                      </span>
                    </button>
                  ))}
              </div>
            </Panel>
          )}

          {room.phase === "results" && room.result && <ResultsPanel result={room.result} />}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <MessageCircle className="h-4 w-4 text-sky-300" />
                Chat
              </h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300">
                {visibleMessages.length}
              </span>
            </div>

            <div className="mt-4 flex h-80 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
              {visibleMessages.length > 0 ? (
                visibleMessages.map((item, index) => {
                  const isMine = item.sender === "you";

                  return (
                    <div
                      key={`${item.sender ?? "message"}-${index}`}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${isMine
                          ? "bg-sky-400 text-zinc-950"
                          : "border border-white/10 bg-white/[0.06] text-zinc-100"
                          }`}
                      >
                        <p className={`mb-1 text-[11px] font-semibold ${isMine ? "text-zinc-800" : "text-sky-200"}`}>
                          {item.sender || "Player"}
                        </p>
                        <p className="break-words">{item.msg}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
                  No messages yet
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={Msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key == "Enter") {
                    SendGroupMessage()
                  }
                }}
                placeholder="Message"
                maxLength={280}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 transition hover:bg-zinc-200"
                aria-label="Send chat"
                onClick={SendGroupMessage}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </Panel>

          <Panel>
            <h2 className="font-semibold">Activity</h2>
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
              Room activity will appear here
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


const ResultsPanel = ({ result }: { result: GameResult }) => (
  <Panel>
    <h2 className="flex items-center gap-2 text-lg font-semibold">
      <Trophy className="h-5 w-5 text-amber-300" />
      {result.artistsWin ? "Artists win" : "Imposter wins"}
    </h2>
    <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
      <p>
        Word: <span className="font-semibold text-white">{result.word}</span>
      </p>
      <p>
        Category: <span className="font-semibold text-white">{result.category}</span>
      </p>
      <p>
        Imposter: <span className="font-semibold text-white">{result.imposterName}</span>
      </p>
      <p>
        Voted out:{" "}
        <span className="font-semibold text-white">
          {result.selectedTargetName || "No clear majority"}
        </span>
      </p>
    </div>
    <div className="mt-4 space-y-2">
      {result.voteCounts.map((count) => (
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
);

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
