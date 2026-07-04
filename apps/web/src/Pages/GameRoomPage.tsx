

import { v4 as uuidv4 } from 'uuid';
import { validate as isValidUuid } from "uuid";
import { createSocket } from "../Utils/socket"
import useRoomStore from "@/Zustand/RoomStore";
import { Brush, Circle, Copy, Crown, Eraser, LogOut, MessageCircle, Minus, Palette, Play, RotateCcw, Send, Square, Trophy, UserX, Users } from "lucide-react";
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
const eraserCursor = "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='white'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M7%2021h10'/%3E%3Cpath%20d='M20.7%208.7l-5.4-5.4a1%201%200%200%200-1.4%200L3.3%2013.9a1%201%200%200%200%200%201.4L8%2020h4l8.7-8.7a1%201%200%200%200%200-1.4Z'/%3E%3Cpath%20d='M12%206l6%206'/%3E%3C/svg%3E\") 4 20, auto";

const GameRoom = () => {

  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance)
  const clearSocketInstance = useSocketStore((state) => state.clearSocketInstance);
  const { setSettings, setRoomId, clearRoom, Settings, RoomId } = useRoomStore()

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
  const [chatHistry, setChatHistry] = useState([]);
  const [Msg, setMsg] = useState<string>("")
  const [members, setMember] = useState([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [admin, setAdmin] = useState(null)

  const url = useParams()
  const roomRef = useRef("")
  roomRef.current = String(url.id)

  const LeaveRoom = () => {
    if (!roomRef) {
      return
    }
    socketInstance?.emit("leave-group", { id: RoomId })
    toast.success("room left successfully!")
    setRoom(null)
    setRoomId(null)
  }

  const SendGroupMessage = () => {
    if (!RoomId) {
      return
    }
    const trimmed = Msg.trim()
    if (!trimmed) {
      return
    }
    socketInstance?.emit("send-group-message", { id: RoomId, message: trimmed })
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

  const joinRoom = (id) => {
    const normalizedCode = id.trim()
    if (!normalizedCode) {
      toast.error("invalid room id");
      return;
    }
    console.log("ready to join?", normalizedCode)
    setJoinCode(normalizedCode);
    socketInstance?.emit("join-group", {
      id: normalizedCode,
      roomId: normalizedCode,
      currentUser: activeUser,
    });
    setRoomId(normalizedCode)
    // setRoom({ code: normalizedCode, phase: "lobby", strokes: [], players: [], connectedPlayerCount: 0, totalTurnsBeforeVote: 0, submittedTurns: 0, eligibleVotes: 0 });
  };

  useEffect(() => {
    if (!socketInstance) {
      const io = createSocket()
      setSocketInstance(io)
      return
    };

    if (!RoomId) {
      console.log("meaining user is visiting the url")
      if (!isValidUuid(roomRef.current)) {
        console.log("Invalid UUID");
        toast.error("invlaid uuid")
        return;
      }
      joinRoom(roomRef.current)
    }

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

    socketInstance.on("group-created", (data) => {
      console.log("Room created:", data);
      setRoomId(data.trimmed);
      setRoom(data.trimmed)
      console.log("current user:", currentUser)
      toast.success("Room created successfully!");
    })

    socketInstance.on("group-joined", (data) => {
      console.log(currentUser?.username || currentUser?.id)
      const filteredMembers = data.members.filter(member => {
        const isCurrentUsername = currentUser?.username && member.username === currentUser.username;
        const isCurrentId = currentUser?.id && member.id === currentUser.id;

        return !(isCurrentUsername || isCurrentId);
      });
      setSettings(data.settings)
      console.log("settings i got :", data.settings)
      console.log("owner:", data.settings)
      toast.success(`Joined room successfully`);
    })

    socketInstance.on("recieve-start-stream", (data: any) => {
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
      ctx.moveTo(postion.x, postion.y)
      remoteStrokeMapRef.current[streamId] = {
        kind: data.data.data.kind ?? "path",
        initial: { x: postion.x, y: postion.y },
        intermediate: [],
        final: null,
        color: data.data.data.color,
        width: Number(data.data.data.width),
        id: streamId,
      }
      ctx.strokeStyle = data.data.data.color
      ctx.lineWidth = data.data.data.width
      console.log("drawing has been started btw whoa re u", data)
    })

    socketInstance.on("recieve-send-stream", (data: any) => {
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
        if (!isShapeTool(currentStroke.kind)) {
          drawLineSegment(ctx, lastPoint, res, currentStroke)
        }
        currentStroke.intermediate.push(res)
      })
    })

    socketInstance.on("recieve-end-stream", (data: any) => {
      console.log("some one ended drawing", data)
      const pos = data.data.data
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const streamId = getRemoteStreamId(data)
      const currentStroke = remoteStrokeMapRef.current[streamId]
      if (!currentStroke) return

      currentStroke.final = { x: pos.x, y: pos.y }
      if (isShapeTool(currentStroke.kind)) {
        drawShapeStroke(ctx, currentStroke, currentStroke.final)
      } else {
        const lastPoint = getLastStrokePoint(currentStroke)
        if (lastPoint) {
          drawLineSegment(ctx, lastPoint, currentStroke.final, currentStroke)
        }
      }
      addStrokeToHistory(currentStroke)
      console.log("stroke index:", pointerIndexRef.current)
      delete remoteStrokeMapRef.current[streamId]
      isOpponentDrawing.current = Object.keys(remoteStrokeMapRef.current).length > 0
    })


    return () => {
      socketInstance.off("recive-group-message")
      socketInstance.off("new-user-joined")
      socketInstance.off("group-created")
      socketInstance.off("group-joined")
      socketInstance.off("recieve-start-stream")
      socketInstance.off("recieve-send-stream")
      socketInstance.off("recieve-end-stream")


    }
  }, [socketInstance])

  type Points = {
    x: number,
    y: number
  }
  type Stroke = {
    kind?: StrokeKind,
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
  const draftSnapshotRef = useRef<ImageData | null>(null)
  const dummyColor = ["red", "blue", "green", "yellow", "brown", "purple", "pink", "black"]
  const [isConnecting, setisConnecting] = useState<Boolean>(false)
  const [isConnected, setisConnected] = useState<Boolean>(false)
  const localColorRef = useRef<string>("#111827")
  const localWidthRef = useRef<number>(7)
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
    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
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
    }, 300)
  }

  const StartEventStream = (data) => {
    const uuid = uuidv4()
    activeIdref.current = uuid
    socketInstance?.emit("start-stream", { data, uuid, "roomId": RoomId })
  }
  const SendEventStream = (data: any) => {
    if (isBlockedref.current) {
      return
    }
    socketInstance?.emit("send-stream", { data, id: activeIdref.current, "roomId": RoomId })
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

      socketInstance?.emit("send-stream", {
        data: duplicated,
        id: activeIdref.current,
        "roomId": RoomId
      })
    }

    isBlockedref.current = true
    socketInstance?.emit("end-stream", {
      data: data.final,
      id: activeIdref.current,
      "roomId": RoomId
    })

    activeIdref.current = null
  }

  const isShapeTool = (kind?: StrokeKind) => {
    return kind === "line" || kind === "rect" || kind === "circle"
  }

  const applyStrokeStyle = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = stroke.width ?? localWidthRef.current
    ctx.strokeStyle = stroke.color ?? localColorRef.current
    ctx.globalCompositeOperation = stroke.kind === "eraser" ? "destination-out" : "source-over"
  }

  const drawLineSegment = (
    ctx: CanvasRenderingContext2D,
    start: Points,
    end: Points,
    stroke: Stroke
  ) => {
    ctx.save()
    applyStrokeStyle(ctx, stroke)
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.closePath()
    ctx.restore()
  }

  const drawShapeStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    finalPoint: Points
  ) => {
    if (!stroke.initial) {
      return
    }

    ctx.save()
    applyStrokeStyle(ctx, stroke)
    ctx.beginPath()

    if (stroke.kind === "line") {
      ctx.moveTo(stroke.initial.x, stroke.initial.y)
      ctx.lineTo(finalPoint.x, finalPoint.y)
    }

    if (stroke.kind === "rect") {
      ctx.rect(
        stroke.initial.x,
        stroke.initial.y,
        finalPoint.x - stroke.initial.x,
        finalPoint.y - stroke.initial.y
      )
    }

    if (stroke.kind === "circle") {
      const radius = Math.hypot(finalPoint.x - stroke.initial.x, finalPoint.y - stroke.initial.y)
      ctx.arc(stroke.initial.x, stroke.initial.y, radius, 0, Math.PI * 2)
    }

    ctx.stroke()
    ctx.closePath()
    ctx.restore()
  }

  const restoreDraftSnapshot = (ctx: CanvasRenderingContext2D) => {
    if (draftSnapshotRef.current) {
      ctx.putImageData(draftSnapshotRef.current, 0, 0)
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isUDrawing.current) {
      isUDrawing.current = true
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getMousePos(e)

    localStrokeRef.current = {
      kind: activeTool,
      initial: { x: pos.x, y: pos.y },
      intermediate: [],
      final: null,
      color: localColorRef.current,
      width: localWidthRef.current,
      id: null,
    }
    draftSnapshotRef.current = isShapeTool(activeTool)
      ? ctx.getImageData(0, 0, canvas.width, canvas.height)
      : null
    const data = { color: localColorRef.current, width: localWidthRef.current, inital: { x: pos.x, y: pos.y }, kind: activeTool }
    isBlockedref.current = false
    StartEventStream(data)
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isUDrawing.current) return
    isUDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getMousePos(e)

    if (isShapeTool(localStrokeRef.current.kind)) {
      restoreDraftSnapshot(ctx)
      drawShapeStroke(ctx, localStrokeRef.current, pos)
    } else {
      const lastPoint = localStrokeRef.current.intermediate[localStrokeRef.current.intermediate.length - 1] ?? localStrokeRef.current.initial
      if (lastPoint) {
        drawLineSegment(ctx, lastPoint, pos, localStrokeRef.current)
      }
    }

    localStrokeRef.current.final = { x: pos.x, y: pos.y }
    localStrokeRef.current.width = localWidthRef.current
    localStrokeRef.current.color = localColorRef.current
    const finishedStroke = {
      ...localStrokeRef.current,
      initial: localStrokeRef.current.initial ? { ...localStrokeRef.current.initial } : null,
      intermediate: [...localStrokeRef.current.intermediate],
      final: localStrokeRef.current.final ? { ...localStrokeRef.current.final } : null,
    }
    addStrokeToHistory(finishedStroke)
    // EmitStroker(currentStroke)
    const data = {
      final: localStrokeRef.current.final,
      color: localStrokeRef.current.color,
      width: localStrokeRef.current.width,
      kind: localStrokeRef.current.kind,
    }
    EndEventStream(data)
    localStrokeRef.current = {
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null
    }
    draftSnapshotRef.current = null
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
    const pos = getMousePos(e)

    if (isShapeTool(localStrokeRef.current.kind)) {
      restoreDraftSnapshot(ctx)
      drawShapeStroke(ctx, localStrokeRef.current, pos)
      return
    }

    const lastPoint = localStrokeRef.current.intermediate[localStrokeRef.current.intermediate.length - 1] ?? localStrokeRef.current.initial
    if (lastPoint) {
      drawLineSegment(ctx, lastPoint, pos, localStrokeRef.current)
    }

    console.log("postion iz", pos)
    localStrokeRef.current.intermediate.push(pos)
    Thottler(localStrokeRef.current)
  }

  const HandelColorSelect = (color: string) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    setStrokeColor(color)
    localColorRef.current = color
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = color
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = strokeSize
    localWidthRef.current = strokeSize
  }, [strokeSize])


  const drawStoredStroke = (ctx: CanvasRenderingContext2D, item: Stroke) => {
    if (!item.initial || !item.final) {
      return
    }

    if (isShapeTool(item.kind)) {
      drawShapeStroke(ctx, item, item.final)
      return
    }

    ctx.save()
    applyStrokeStyle(ctx, item)
    ctx.beginPath()
    ctx.moveTo(item.initial.x, item.initial.y)

    item.intermediate.forEach((position) => {
      ctx.lineTo(position.x, position.y)
    })

    ctx.lineTo(item.final.x, item.final.y)
    ctx.stroke()
    ctx.closePath()
    ctx.restore()
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
    ctx.globalCompositeOperation = "source-over"
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
    return String(data.data.uuid ?? data.data.id ?? "remote")
  }

  const getLastStrokePoint = (stroke: Stroke) => {
    const lastIntermediate = stroke.intermediate[stroke.intermediate.length - 1]
    return lastIntermediate ?? stroke.initial
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
                  textField.innerText = RoomId || "not avilable"
                  document.body.appendChild(textField)
                  textField.select()
                  document.execCommand('copy')
                  textField.remove()
                  toast.success("code copied")

                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-zinc-100 transition hover:bg-white/10"
              >
                {RoomId || "not avilable"}
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
              style={{ cursor: activeTool === "eraser" ? eraserCursor : "crosshair" }}
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
                  {colorOptions.map((color) => {
                    const isSelectedColor = strokeColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        onClick={() => {

                          HandelColorSelect(color)

                        }}
                        className={`h-7 w-7 rounded-full border-2 transition ${isSelectedColor
                          ? "scale-110 border-white shadow-[0_0_0_4px_rgba(14,165,233,0.45)]"
                          : "border-transparent hover:border-white/50"
                          }`}
                        style={{ background: color }}
                        aria-label={`Use color ${color}`}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(event) => {
                      HandelColorSelect(event.currentTarget.value)
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
                    value={strokeSize}
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
          {room?.phase === "voting" && (
            <Panel>
              <h2 className="font-semibold">Vote</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {room?.votesCount}/{room.eligibleVotes} connected players voted.
              </p>
              <div className="mt-4 space-y-2">
                {room?.players
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

          {room?.phase === "results" && room.result && <ResultsPanel result={room.result} />}

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


export default GameRoom;
