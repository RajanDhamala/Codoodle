import { useNavigate } from 'react-router-dom';

import { v4 as uuidv4 } from 'uuid';
import { validate as isValidUuid } from "uuid";
import { createSocket } from "../Utils/socket"
import useRoomStore from "@/Zustand/RoomStore";
import { Brush, CheckCircle2, Circle, Clock, Copy, Crown, Eraser, Flame, KeyRound, LogOut, Menu, MessageCircle, Minus, MousePointer2, Palette, Play, RotateCcw, Send, ShieldCheck, Sparkles, Square, Trophy, UserX, Users, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import type React from "react";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import { AvatarBadge } from "./GameAvatar";
import { encodeAvatarConfig } from "../Utils/guestProfile";
import {
  defaultGameSettings,
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
    { kind: "select", label: "Select", icon: MousePointer2 },
    { kind: "path", label: "Brush", icon: Brush },
    { kind: "eraser", label: "Eraser", icon: Eraser },
    { kind: "line", label: "Line", icon: Minus },
    { kind: "rect", label: "Rectangle", icon: Square },
    { kind: "circle", label: "Circle", icon: Circle },
  ];

const colorOptions = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#64748b"];
const eraserCursor = "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='white'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M7%2021h10'/%3E%3Cpath%20d='M20.7%208.7l-5.4-5.4a1%201%200%200%200-1.4%200L3.3%2013.9a1%201%200%200%200%200%201.4L8%2020h4l8.7-8.7a1%201%200%200%200%200-1.4Z'/%3E%3Cpath%20d='M12%206l6%206'/%3E%3C/svg%3E\") 4 20, auto";
const configuredStreamFlushInterval = Number(import.meta.env.VITE_DRAW_STREAM_THROTTLE_MS);
const STREAM_FLUSH_INTERVAL_MS = Number.isFinite(configuredStreamFlushInterval)
  ? Math.min(1000, Math.max(16, Math.round(configuredStreamFlushInterval)))
  : 50;
const MAX_POINTS_PER_STREAM_PACKET = 32;

const showSuccessToast = (message: string, id: string) => {
  toast.success(message, { id });
};

const showErrorToast = (message: string, id: string) => {
  toast.error(message, { id });
};

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
  id?: number | string | null,
  userId?: string | null,
  username?: string | null,
  playerId?: string | null,
  playerName?: string | null,
}

type StrokeSelection = {
  point: Points;
  displayPoint: Points;
  playerName: string;
  userId?: string | null;
  kind?: StrokeKind;
  color?: string | null;
}

type RoomMember = {
  id: string;
  username: string;
  avatarCode?: string;
  connected?: boolean;
  isAdmin?: boolean;
};

type RoomSettingsPayload = Partial<GameSettings> & {
  owner?: RoomMember;
  turnDurationSeconds?: number;
  maxStrokesPerTurn?: number;
};

type RoomSyncPayload = {
  success?: boolean;
  message?: string;
  roomId?: string;
  phase?: "lobby" | "drawing" | "voting" | "results";
  members?: RoomMember[];
  settings?: RoomSettingsPayload;
  owner?: RoomMember;
  gameState?: unknown[];
  activeStroke?: unknown;
  roleInfo?: RoleInfo;
  players?: RoomMember[];
  connectedPlayerCount?: number;
  currentPlayerId?: string | null;
  currentPlayerName?: string | null;
  currentRound?: number;
  maxRounds?: number;
  turnDurationSeconds?: number;
  maxStrokesPerTurn?: number;
  currentTurnStrokeCount?: number;
  turnEndsAt?: number | null;
  turnSubmittedPlayerId?: string | null;
  votingEndsAt?: number | null;
  submittedTurns?: number;
  totalTurnsBeforeVote?: number;
  votesCount?: number;
  eligibleVotes?: number;
  votedPlayerIds?: string[];
  result?: GameResult | null;
};

type ChatMessageView = {
  sender?: string;
  msg?: string;
  avatarCode?: string;
};

type RoomLifecyclePayload = {
  roomId?: string;
  message?: string;
};

type GroupMessagePayload = {
  user: {
    username?: string;
    avatarCode?: string;
  };
  message?: string;
};

type RoomMembersPayload = {
  roomId?: string;
  members?: RoomMember[];
  owner?: RoomMember;
};

type StrokeStartPayload = {
  color: string;
  width: number;
  inital: Points;
  kind: StrokeKind;
};

type RemoteStreamPayload<T> = {
  userId?: string | null;
  username?: string | null;
  data: {
    id?: string | number | null;
    uuid?: string;
    userId?: string | null;
    username?: string | null;
    data: T;
  };
};

type ServerStrokeRecord = {
  kind?: StrokeKind;
  initial?: unknown;
  intermediate?: unknown[];
  final?: unknown;
  color?: string | null;
  width?: number | string | null;
  size?: number | string | null;
  id?: string | number | null;
  userId?: string | null;
  username?: string | null;
  playerId?: string | null;
  playerName?: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const GameRoom = () => {
  const nagivate = useNavigate();

  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance)
  const { setSettings, setRoomId, clearRoom, RoomId } = useRoomStore()

  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const activeUser = useMemo<(User & { avatarCode?: string }) | null>(() => {
    if (currentUser) return currentUser;
    if (!guestProfile) return null;

    return {
      id: guestProfile.id,
      username: guestProfile.username,
      avatar: guestProfile.avatar,
    };
  }, [currentUser, guestProfile]);


  const [room, setRoom] = useState<RoomSyncPayload | null>(null);
  const [activeTool, setActiveTool] = useState<StrokeKind>("path");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(7);
  const [chatHistry, setChatHistry] = useState<ChatMessageView[]>([]);
  const [isMobileRoomMenuOpen, setIsMobileRoomMenuOpen] = useState(false)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const isMobileChatOpenRef = useRef(false)
  const [Msg, setMsg] = useState<string>("")
  const [members, setMember] = useState<RoomMember[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestGameStateRef = useRef<unknown[]>([])
  const latestActiveStrokeRef = useRef<unknown>(null)
  const [admin, setAdmin] = useState<RoomMember | null>(null)
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null)
  const [turnDurationSeconds, setTurnDurationSeconds] = useState(30)
  const [maxStrokesPerTurn, setMaxStrokesPerTurn] = useState(defaultGameSettings.maxStrokesPerTurn)
  const [now, setNow] = useState(Date.now())
  const [autoSubmit, setAutoSubmit] = useState(false)
  const lastJoinedRoomKeyRef = useRef("")
  const leavingRoomIdRef = useRef<string | null>(null)

  const url = useParams()
  const roomRef = useRef("")
  roomRef.current = typeof url.id === "string" ? url.id : ""
  const isRoomIdValid = isValidUuid(roomRef.current)

  const socketUserPayload = useMemo(() => {
    if (!activeUser) return null;

    const avatarCode = activeUser.avatarCode || encodeAvatarConfig(activeUser.avatar);

    return {
      id: activeUser.id,
      username: activeUser.username,
      avatarCode,
    };
  }, [activeUser]);

  useEffect(() => {
    if (!room?.turnEndsAt && !room?.votingEndsAt) {
      return
    }

    setNow(Date.now())
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [room?.turnEndsAt, room?.votingEndsAt])

  useEffect(() => {
    const unlockAudio = () => {
      void unlockResultAudio()
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true })
    window.addEventListener("keydown", unlockAudio, { once: true })

    return () => {
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
    }
  }, [])

  const LeaveRoom = () => {
    if (!RoomId || !isValidUuid(RoomId)) {
      nagivate("/lobby")
      return
    }
    leavingRoomIdRef.current = RoomId
    socketInstance?.emit("leave-group", { id: RoomId })
    showSuccessToast("Room left successfully!", "room-leave")
    setRoom(null)
    setMember([])
    setAdmin(null)
    setRoleInfo(null)
    lastJoinedRoomKeyRef.current = ""
    setRoomId(null)
    nagivate("/lobby")
  }

  useLayoutEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistry, isMobileChatOpen]);

  useEffect(() => {
    if (!isMobileRoomMenuOpen && !isMobileChatOpen) {
      return
    }

    const closeMobileOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }

      isMobileChatOpenRef.current = false
      setIsMobileRoomMenuOpen(false)
      setIsMobileChatOpen(false)
    }

    window.addEventListener("keydown", closeMobileOverlay)

    return () => {
      window.removeEventListener("keydown", closeMobileOverlay)
    }
  }, [isMobileChatOpen, isMobileRoomMenuOpen])

  const toggleMobileRoomMenu = () => {
    setIsMobileRoomMenuOpen((isOpen) => !isOpen)
    isMobileChatOpenRef.current = false
    setIsMobileChatOpen(false)
  }

  const closeMobileRoomMenu = () => {
    setIsMobileRoomMenuOpen(false)
  }

  const toggleMobileChat = () => {
    setIsMobileChatOpen((isOpen) => {
      const nextIsOpen = !isOpen
      isMobileChatOpenRef.current = nextIsOpen
      if (nextIsOpen) {
        setUnreadChatCount(0)
      }
      return nextIsOpen
    })
    setIsMobileRoomMenuOpen(false)
  }

  const closeMobileChat = () => {
    isMobileChatOpenRef.current = false
    setIsMobileChatOpen(false)
  }

  const SendGroupMessage = () => {
    if (!RoomId || !isValidUuid(RoomId)) {
      return
    }
    const trimmed = Msg.trim()
    if (!trimmed) {
      return
    }
    socketInstance?.emit("send-group-message", { id: RoomId, message: trimmed })
    setChatHistry((prev) => {
      return [
        ...prev,
        {
          sender: "you",
          msg: Msg,
          avatarCode: socketUserPayload?.avatarCode,
        }]
    })
    setMsg("")
  }

  const CopyRoomCode = () => {
    const textField = document.createElement('textarea')
    textField.innerText = typeof window !== "undefined" ? window.location.href : RoomId || "not avilable"
    document.body.appendChild(textField)
    textField.select()
    document.execCommand('copy')
    textField.remove()
    showSuccessToast("Invite link copied", "invite-copy")
  }

  const applyMembersSnapshot = (nextMembers: RoomMember[] = [], owner?: RoomMember) => {
    const normalizedMembers = nextMembers.map((member) => ({
      ...member,
      isAdmin: Boolean(member.isAdmin || (owner?.id && member.id === owner.id)),
    }));
    const visibleOwner = owner || normalizedMembers.find((member) => member.isAdmin) || null;

    setMember(normalizedMembers);
    setAdmin(visibleOwner);
  }

  const clearSyncedRoom = () => {
    setRoom(null)
    setMember([])
    setAdmin(null)
    setRoleInfo(null)
    clearRoom()
    lastJoinedRoomKeyRef.current = ""
  }

  const applyRoomSync = (data: RoomSyncPayload) => {
    const nextRoomId = data.roomId || roomRef.current
    if (leavingRoomIdRef.current === nextRoomId) {
      return
    }

    setRoomId(nextRoomId)
    setRoom(data)
    setSettings(data.settings)
    applyMembersSnapshot(data.members || [], data.owner || data.settings?.owner)
    if (data.roleInfo) {
      setRoleInfo(data.roleInfo)
    } else if (data.phase === "lobby") {
      setRoleInfo(null)
    }
    const nextTurnDuration = data.turnDurationSeconds || data.settings?.turnDurationSeconds
    if (nextTurnDuration) {
      setTurnDurationSeconds(Number(nextTurnDuration))
    }
    const nextMaxStrokes = data.maxStrokesPerTurn || data.settings?.maxStrokesPerTurn
    if (nextMaxStrokes) {
      setMaxStrokesPerTurn(Math.min(3, Math.max(1, Number(nextMaxStrokes))))
    }
    latestGameStateRef.current = data.gameState || []
    latestActiveStrokeRef.current = data.activeStroke || null
    DrawGameState(latestGameStateRef.current)
    drawActiveStroke(latestActiveStrokeRef.current)
  }

  const StartGame = () => {
    if (!RoomId || !isValidUuid(RoomId)) {
      showErrorToast("Join a room before starting.", "game-start");
      return;
    }

    socketInstance?.emit("start-game", { roomId: RoomId, turnDurationSeconds, maxStrokesPerTurn }, (data: RoomSyncPayload) => {
      if (!data?.success) {
        showErrorToast(data?.message || "Failed to start game.", "game-start");
        return;
      }

      applyRoomSync(data);
      showSuccessToast(data.message || "Game started.", "game-start");
    });
  }

  const SubmitTurn = () => {
    if (!RoomId || !isValidUuid(RoomId)) {
      showErrorToast("Join a room before submitting.", "turn-submit");
      return;
    }

    socketInstance?.emit("submit-turn", { roomId: RoomId }, (data: RoomSyncPayload) => {
      if (!data?.success) {
        showErrorToast(data?.message || "Failed to submit turn.", "turn-submit");
        return;
      }

      applyRoomSync(data);
      showSuccessToast(data.message || "Turn submitted.", "turn-submit");
    });
  }

  const SubmitVote = (targetId: string) => {
    if (!RoomId || !isValidUuid(RoomId)) {
      showErrorToast("Join a room before voting.", "vote-submit");
      return;
    }

    socketInstance?.emit("submit-vote", { roomId: RoomId, targetId }, (data: RoomSyncPayload) => {
      if (!data?.success) {
        showErrorToast(data?.message || "Failed to submit vote.", "vote-submit");
        return;
      }

      applyRoomSync(data);
      showSuccessToast(data.message || "Vote submitted.", "vote-submit");
    });
  }

  const joinRoom = useCallback((id: string, options: { reconnect?: boolean; silent?: boolean } = {}) => {
    const normalizedCode = id.trim()
    if (!normalizedCode) {
      showErrorToast("Invalid room ID", "room-join");
      return;
    }
    if (!isValidUuid(normalizedCode)) {
      showErrorToast("Invalid room ID", "room-join");
      return;
    }
    if (!activeUser || !socketUserPayload) {
      showErrorToast("Set up player before joining.", "room-join");
      return;
    }
    if (!socketInstance?.connected) {
      return;
    }
    if (leavingRoomIdRef.current === normalizedCode) {
      return;
    }

    const joinKey = `${socketInstance.id || "connected"}:${normalizedCode}`
    if (lastJoinedRoomKeyRef.current === joinKey) {
      return;
    }

    lastJoinedRoomKeyRef.current = joinKey;
    socketInstance?.emit("join-group", {
      id: normalizedCode,
      roomId: normalizedCode,
      currentUser: socketUserPayload,
      reconnect: Boolean(options.reconnect),
    }, (data: RoomSyncPayload) => {
      if (leavingRoomIdRef.current === normalizedCode) {
        return;
      }
      if (!data?.success) {
        clearSyncedRoom()
        showErrorToast(data?.message || "Room not found or expired.", "room-join");
        return;
      }

      applyRoomSync(data)
      if (!options.silent) {
        showSuccessToast(data.message || "Joined room successfully", "room-join");
      }
    });
    // The room join callback uses ref-backed room state; adding render-local helpers here causes repeated join attempts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, socketInstance, socketUserPayload]);

  useEffect(() => {
    if (!isRoomIdValid) {
      clearSyncedRoom()
      showErrorToast("Invalid room ID", "room-join")
      return
    }

    if (!socketInstance) {
      const io = createSocket()
      setSocketInstance(io)
      return
    };

    const syncCurrentRoom = (reconnect = false) => {
      const roomCode = roomRef.current
      if (!isValidUuid(roomCode)) {
        showErrorToast("Invalid room ID", "room-join")
        return;
      }
      if (leavingRoomIdRef.current === roomCode) {
        return;
      }

      joinRoom(roomCode, {
        reconnect,
        silent: reconnect || RoomId === roomCode,
      })

      if (!isMobileChatOpenRef.current && window.matchMedia("(max-width: 639px)").matches) {
        setUnreadChatCount((count) => count + 1)
      }
    }

    const handleConnect = () => {
      syncCurrentRoom(Boolean(RoomId))
    }

    const handleDisconnect = () => {
      lastJoinedRoomKeyRef.current = ""
    }

    const handleMembersUpdated = (data: RoomSyncPayload) => {
      if (leavingRoomIdRef.current === (data.roomId || roomRef.current)) {
        return
      }
      applyMembersSnapshot(data.members || [], data.owner)
    }

    const handleRoomStateUpdated = (data: RoomSyncPayload) => {
      applyRoomSync(data)
    }

    const handleRoleInfo = (data: RoleInfo) => {
      setRoleInfo(data)
    }

    const handleDrawBlocked = (data: { message?: string }) => {
      isUDrawing.current = false
      draftSnapshotRef.current = null
      clearThrottleTimer()
      redrawHistoryUntil(pointerIndexRef.current)
      showErrorToast(data.message || "You cannot draw right now.", "draw-blocked")
    }

    const leaveClosedRoom = (data: RoomLifecyclePayload, fallbackMessage: string) => {
      const eventRoomId = data.roomId || roomRef.current
      if (eventRoomId && eventRoomId !== roomRef.current && eventRoomId !== RoomId) {
        return
      }

      leavingRoomIdRef.current = eventRoomId || roomRef.current
      if (eventRoomId && isValidUuid(eventRoomId)) {
        socketInstance.emit("leave-group", { id: eventRoomId })
      }
      clearSyncedRoom()
      showErrorToast(data.message || fallbackMessage, "room-closed")
      nagivate("/lobby")
    }

    const handleRoomClosed = (data: RoomLifecyclePayload = {}) => {
      leaveClosedRoom(data, "Room closed.")
    }

    const handleRoomOwnerDisconnected = (data: RoomLifecyclePayload = {}) => {
      leaveClosedRoom(data, "Admin disconnected. Returning to lobby.")
    }

    const handleGroupMessage = (data: GroupMessagePayload) => {
      setChatHistry((prev) => {
        return [
          ...prev, {
            sender: data.user.username,
            msg: data.message,
            avatarCode: data.user.avatarCode,
          }
        ]

      })
    }

    const handleNewUserJoined = (data: RoomMembersPayload) => {
      if (leavingRoomIdRef.current === (data.roomId || roomRef.current)) {
        return
      }
      if (data.members) {
        applyMembersSnapshot(data.members, data.owner)
      }
    }


    const handleStartStream = (data: RemoteStreamPayload<StrokeStartPayload>) => {
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
        userId: data.userId ?? data.data?.userId ?? null,
        username: data.username ?? data.data?.username ?? null,
      }
      ctx.strokeStyle = data.data.data.color
      ctx.lineWidth = data.data.data.width
    }

    const handleSendStream = (data: RemoteStreamPayload<Points[]>) => {
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
      const points = data.data.data
      const lastPoint = getLastStrokePoint(currentStroke)
      if (lastPoint && !isShapeTool(currentStroke.kind)) {
        drawLineSegments(ctx, lastPoint, points, currentStroke)
      }
      currentStroke.intermediate.push(...points)
    }

    const handleEndStream = (data: RemoteStreamPayload<Points>) => {
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
      delete remoteStrokeMapRef.current[streamId]
      isOpponentDrawing.current = Object.keys(remoteStrokeMapRef.current).length > 0
    }

    socketInstance.on("connect", handleConnect)
    socketInstance.on("disconnect", handleDisconnect)
    socketInstance.on("recive-group-message", handleGroupMessage)
    socketInstance.on("new-user-joined", handleNewUserJoined)
    socketInstance.on("room-members-updated", handleMembersUpdated)
    socketInstance.on("room-state-updated", handleRoomStateUpdated)
    socketInstance.on("role-info", handleRoleInfo)
    socketInstance.on("draw-blocked", handleDrawBlocked)
    socketInstance.on("room-closed", handleRoomClosed)
    socketInstance.on("room-owner-disconnected", handleRoomOwnerDisconnected)
    socketInstance.on("recieve-start-stream", handleStartStream)
    socketInstance.on("recieve-send-stream", handleSendStream)
    socketInstance.on("recieve-end-stream", handleEndStream)

    if (socketInstance.connected) {
      syncCurrentRoom(Boolean(RoomId))
    } else {
      socketInstance.connect()
    }

    return () => {
      socketInstance.off("connect", handleConnect)
      socketInstance.off("disconnect", handleDisconnect)
      socketInstance.off("recive-group-message", handleGroupMessage)
      socketInstance.off("new-user-joined", handleNewUserJoined)
      socketInstance.off("room-members-updated", handleMembersUpdated)
      socketInstance.off("room-state-updated", handleRoomStateUpdated)
      socketInstance.off("role-info", handleRoleInfo)
      socketInstance.off("draw-blocked", handleDrawBlocked)
      socketInstance.off("room-closed", handleRoomClosed)
      socketInstance.off("room-owner-disconnected", handleRoomOwnerDisconnected)
      socketInstance.off("recieve-start-stream", handleStartStream)
      socketInstance.off("recieve-send-stream", handleSendStream)
      socketInstance.off("recieve-end-stream", handleEndStream)


    }
    // Socket handlers read ref-backed canvas/room state; resubscribing on every drawing helper change drops active streams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [RoomId, isRoomIdValid, joinRoom, socketInstance])


  const normalizePoint = (point: unknown): Points | null => {
    if (!isRecord(point) || typeof point.x !== "number" || typeof point.y !== "number") {
      return null
    }

    return { x: point.x, y: point.y }
  }

  const normalizeStrokeFromServer = (item: unknown, requireFinal = true): Stroke | null => {
    if (!isRecord(item)) {
      return null
    }

    const record = item as ServerStrokeRecord
    const initial = normalizePoint(record.initial)
    const final = normalizePoint(record.final)

    if (!initial || (requireFinal && !final)) {
      return null
    }

    return {
      kind: record.kind ?? "path",
      initial,
      intermediate: Array.isArray(record.intermediate)
        ? record.intermediate.map(normalizePoint).filter(Boolean) as Points[]
        : [],
      final,
      color: record.color ?? "black",
      width: Number(record.width ?? record.size ?? 5),
      id: record.id ?? null,
      userId: record.userId ?? record.playerId ?? record.user?.id ?? null,
      username: record.username ?? record.playerName ?? record.user?.username ?? null,
      playerId: record.playerId ?? null,
      playerName: record.playerName ?? null,
    }
  }

  const DrawGameState = (data: unknown) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const strokes = Array.isArray(data)
      ? data.map((item) => normalizeStrokeFromServer(item)).filter(Boolean) as Stroke[]
      : []

    ctx.save()
    ctx.globalCompositeOperation = "source-over"
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    strokes.forEach((stroke) => {
      drawStoredStroke(ctx, stroke)
    })

    setHistry(strokes)
    historyLengthRef.current = strokes.length
    pointerIndexRef.current = strokes.length - 1
    remoteStrokeMapRef.current = {}
    isOpponentDrawing.current = false

    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
    ctx.lineCap = "round"
    ctx.globalCompositeOperation = "source-over"
  }

  const drawActiveStroke = (data: unknown) => {
    const activeStroke = normalizeStrokeFromServer(data, false)
    if (!activeStroke?.initial || !activeStroke.id) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const streamId = String(activeStroke.id)
    remoteStrokeMapRef.current[streamId] = activeStroke
    isOpponentDrawing.current = true

    if (isShapeTool(activeStroke.kind)) {
      const previewPoint = activeStroke.final ?? activeStroke.intermediate[activeStroke.intermediate.length - 1]
      if (previewPoint) {
        drawShapeStroke(ctx, activeStroke, previewPoint)
      }
      return
    }

    const points = activeStroke.final
      ? [...activeStroke.intermediate, activeStroke.final]
      : activeStroke.intermediate
    drawLineSegments(ctx, activeStroke.initial, points, activeStroke)
  }

  const isUDrawing = useRef(false)
  const isOpponentDrawing = useRef(false)
  const bgColor = "white"

  const localStrokeRef = useRef<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,
    id: null,
    userId: null,
    username: null,
  })
  const activeIdref = useRef<string | null>(null)
  const pointerIndexRef = useRef<number>(-1)
  const historyLengthRef = useRef(0)
  const [Histry, setHistry] = useState<Stroke[]>([])
  const [selectedStrokeInfo, setSelectedStrokeInfo] = useState<StrokeSelection | null>(null)
  const remoteStrokeMapRef = useRef<Record<string, Stroke>>({})
  const draftSnapshotRef = useRef<ImageData | null>(null)
  const localColorRef = useRef<string>("#111827")
  const localWidthRef = useRef<number>(7)
  const activePointerIdRef = useRef<number | null>(null)
  const latestStrokePointRef = useRef<Points | null>(null)

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
    return data.intermediate.slice(bufferRef.current)
  }

  const clearThrottleTimer = () => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = null
    }
    isActiveRef.current = false
  }

  const flushBufferedPoints = (data: Stroke) => {
    const points = collectBufferedPoints(data)
    if (points.length === 0) {
      return
    }

    bufferRef.current = data.intermediate.length
    SendEventStream(points)
  }

  const Thottler = (data: Stroke) => {
    if (isActiveRef.current) {
      return
    }
    if (collectBufferedPoints(data).length === 0) {
      return
    }

    isActiveRef.current = true
    throttleTimerRef.current = setTimeout(() => {
      flushBufferedPoints(data)
      isActiveRef.current = false
      throttleTimerRef.current = null
    }, STREAM_FLUSH_INTERVAL_MS)
  }

  const StartEventStream = (data: StrokeStartPayload) => {
    if (!RoomId || !isValidUuid(RoomId)) {
      return
    }
    const uuid = uuidv4()
    activeIdref.current = uuid
    socketInstance?.emit("start-stream", { data, uuid, "roomId": RoomId })
  }
  const SendEventStream = (data: Points[]) => {
    if (isBlockedref.current) {
      return
    }
    if (!RoomId || !isValidUuid(RoomId)) {
      return
    }
    for (let index = 0; index < data.length; index += MAX_POINTS_PER_STREAM_PACKET) {
      socketInstance?.emit("send-stream", {
        data: data.slice(index, index + MAX_POINTS_PER_STREAM_PACKET),
        id: activeIdref.current,
        "roomId": RoomId,
      })
    }
  }

  const EndEventStream = () => {
    const data = localStrokeRef.current
    clearThrottleTimer()
    if (!RoomId || !isValidUuid(RoomId)) {
      isBlockedref.current = true
      activeIdref.current = null
      return
    }

    flushBufferedPoints(data)
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
    drawLineSegments(ctx, start, [end], stroke)
  }

  const drawLineSegments = (
    ctx: CanvasRenderingContext2D,
    start: Points,
    points: Points[],
    stroke: Stroke
  ) => {
    if (points.length === 0) {
      return
    }

    ctx.save()
    applyStrokeStyle(ctx, stroke)
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    points.forEach((point) => {
      ctx.lineTo(point.x, point.y)
    })
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

  const getDistance = (pointA: Points, pointB: Points) => {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)
  }

  const getDistanceToSegment = (point: Points, start: Points, end: Points) => {
    const segmentX = end.x - start.x
    const segmentY = end.y - start.y
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY

    if (segmentLengthSquared === 0) {
      return getDistance(point, start)
    }

    const projection = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared)
    )
    const closestPoint = {
      x: start.x + projection * segmentX,
      y: start.y + projection * segmentY,
    }

    return getDistance(point, closestPoint)
  }

  const getHitTolerance = (stroke: Stroke) => {
    return Math.max(Number(stroke.width ?? 5) / 2 + 8, 12)
  }

  const isPointNearStroke = (point: Points, stroke: Stroke) => {
    if (!stroke.initial || !stroke.final) {
      return false
    }

    const tolerance = getHitTolerance(stroke)

    if (stroke.kind === "circle") {
      const radius = getDistance(stroke.initial, stroke.final)
      const distanceFromCenter = getDistance(point, stroke.initial)
      return Math.abs(distanceFromCenter - radius) <= tolerance
    }

    if (stroke.kind === "rect") {
      const minX = Math.min(stroke.initial.x, stroke.final.x)
      const maxX = Math.max(stroke.initial.x, stroke.final.x)
      const minY = Math.min(stroke.initial.y, stroke.final.y)
      const maxY = Math.max(stroke.initial.y, stroke.final.y)
      const isInsideExpandedBox =
        point.x >= minX - tolerance &&
        point.x <= maxX + tolerance &&
        point.y >= minY - tolerance &&
        point.y <= maxY + tolerance

      if (!isInsideExpandedBox) {
        return false
      }

      const nearVerticalEdge =
        Math.min(Math.abs(point.x - minX), Math.abs(point.x - maxX)) <= tolerance &&
        point.y >= minY - tolerance &&
        point.y <= maxY + tolerance
      const nearHorizontalEdge =
        Math.min(Math.abs(point.y - minY), Math.abs(point.y - maxY)) <= tolerance &&
        point.x >= minX - tolerance &&
        point.x <= maxX + tolerance

      return nearVerticalEdge || nearHorizontalEdge
    }

    if (stroke.kind === "line") {
      return getDistanceToSegment(point, stroke.initial, stroke.final) <= tolerance
    }

    const strokePoints = [stroke.initial, ...stroke.intermediate, stroke.final]
    for (let index = 1; index < strokePoints.length; index++) {
      if (getDistanceToSegment(point, strokePoints[index - 1], strokePoints[index]) <= tolerance) {
        return true
      }
    }

    return false
  }

  const getStrokeAuthorName = (stroke: Stroke) => {
    const authorId = stroke.userId ?? stroke.playerId ?? null
    const member = authorId ? members.find((item) => item.id === authorId) : null

    return stroke.username || stroke.playerName || member?.username || "Unknown player"
  }

  const selectStrokeAtPoint = (point: Points, displayPoint: Points) => {
    const lastVisibleIndex = Math.min(pointerIndexRef.current, Histry.length - 1)

    if (lastVisibleIndex < 0) {
      setSelectedStrokeInfo(null)
      return
    }

    const visibleHistory = Histry.slice(0, lastVisibleIndex + 1)
    for (let index = visibleHistory.length - 1; index >= 0; index--) {
      const stroke = visibleHistory[index]

      if (isPointNearStroke(point, stroke)) {
        setSelectedStrokeInfo({
          point,
          displayPoint,
          playerName: getStrokeAuthorName(stroke),
          userId: stroke.userId ?? stroke.playerId ?? null,
          kind: stroke.kind,
          color: stroke.color,
        })
        return
      }
    }

    setSelectedStrokeInfo(null)
  }

  const releaseCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const resetLocalStroke = () => {
    localStrokeRef.current = {
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null,
      userId: null,
      username: null,
    }
    draftSnapshotRef.current = null
    bufferRef.current = 0
    activePointerIdRef.current = null
    latestStrokePointRef.current = null
  }

  const getCommitPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const latestPoint = latestStrokePointRef.current
    if (latestPoint) {
      return { ...latestPoint }
    }

    return getMousePos(e)
  }

  const onMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    const displayPoint = getCanvasDisplayPoint(e)

    if (activeTool === "select") {
      if (!hasStarted) {
        return
      }

      selectStrokeAtPoint(pos, displayPoint)
      return
    }

    if (!canDraw) {
      showErrorToast(drawBlockMessage, "draw-blocked")
      return
    }

    if (isUDrawing.current) {
      return
    }

    setSelectedStrokeInfo(null)
    isUDrawing.current = true
    activePointerIdRef.current = e.pointerId
    latestStrokePointRef.current = { ...pos }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)

    localStrokeRef.current = {
      kind: activeTool,
      initial: { x: pos.x, y: pos.y },
      intermediate: [],
      final: null,
      color: localColorRef.current,
      width: localWidthRef.current,
      id: null,
      userId: activeUser?.id ?? null,
      username: activeUser?.username ?? null,
    }
    draftSnapshotRef.current = isShapeTool(activeTool)
      ? ctx.getImageData(0, 0, canvas.width, canvas.height)
      : null
    const data = { color: localColorRef.current, width: localWidthRef.current, inital: { x: pos.x, y: pos.y }, kind: activeTool }
    isBlockedref.current = false
    StartEventStream(data)
  }

  const onMouseUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isUDrawing.current) return
    if (activePointerIdRef.current !== e.pointerId) return
    if (!canDraw) {
      isUDrawing.current = false
      releaseCanvasPointer(e)
      clearThrottleTimer()
      redrawHistoryUntil(pointerIndexRef.current)
      resetLocalStroke()
      return
    }
    isUDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    releaseCanvasPointer(e)
    const pos = getCommitPoint(e)

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
    EndEventStream()
    resetLocalStroke()
  }

  const onMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isUDrawing.current) {
      return
    }
    if (activePointerIdRef.current !== e.pointerId) {
      return
    }
    if (!canDraw) {
      isUDrawing.current = false
      clearThrottleTimer()
      redrawHistoryUntil(pointerIndexRef.current)
      resetLocalStroke()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const nativeEvent = e.nativeEvent
    const coalescedEvents = typeof nativeEvent.getCoalescedEvents === "function"
      ? nativeEvent.getCoalescedEvents()
      : []
    const pointerSamples = coalescedEvents.length > 0 ? coalescedEvents : [nativeEvent]
    const canvasRect = canvas.getBoundingClientRect()
    const points = pointerSamples.map((event) => getCanvasPoint(event.clientX, event.clientY, canvasRect))
    const latestPoint = points[points.length - 1]
    latestStrokePointRef.current = { ...latestPoint }

    if (isShapeTool(localStrokeRef.current.kind)) {
      restoreDraftSnapshot(ctx)
      drawShapeStroke(ctx, localStrokeRef.current, latestPoint)
      return
    }

    const lastPoint = localStrokeRef.current.intermediate[localStrokeRef.current.intermediate.length - 1] ?? localStrokeRef.current.initial
    if (lastPoint) {
      drawLineSegments(ctx, lastPoint, points, localStrokeRef.current)
    }

    localStrokeRef.current.intermediate.push(...points)
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
    setSelectedStrokeInfo(null)
    const currentIndex = Math.min(pointerIndexRef.current, Histry.length - 1)

    if (currentIndex <= -1) {
      pointerIndexRef.current = -1
      return
    }

    const nextIndex = currentIndex - 1
    pointerIndexRef.current = nextIndex
    redrawHistoryUntil(nextIndex)
  }

  const getCanvasPoint = (clientX: number, clientY: number, canvasRect?: DOMRect) => {
    const canvas = canvasRef.current!;
    const rect = canvasRect ?? canvas.getBoundingClientRect();
    const x = rect.width
      ? ((clientX - rect.left) / rect.width) * canvas.width
      : 0
    const y = rect.height
      ? ((clientY - rect.top) / rect.height) * canvas.height
      : 0

    return {
      x: Math.min(canvas.width, Math.max(0, x)),
      y: Math.min(canvas.height, Math.max(0, y)),
    };
  };

  const getMousePos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    return getCanvasPoint(e.clientX, e.clientY)
  };

  const getCanvasDisplayPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getRemoteStreamId = (data: RemoteStreamPayload<unknown>) => {
    return String(data.data.uuid ?? data.data.id ?? "remote")
  }

  const getLastStrokePoint = (stroke: Stroke) => {
    const lastIntermediate = stroke.intermediate[stroke.intermediate.length - 1]
    return lastIntermediate ?? stroke.initial
  }

  const visibleMembers = members;
  const visibleMessages = chatHistry;
  const visibleAdmin = admin;
  const connectedMembersCount = visibleMembers.filter((member) => member.connected).length;
  const isAdminUser = Boolean(activeUser?.id && visibleAdmin?.id === activeUser.id);
  const hasStarted = room?.phase === "drawing";
  const isVotingPhase = room?.phase === "voting";
  const isResultPhase = room?.phase === "results";
  const currentPlayer = visibleMembers.find((member) => member.id === room?.currentPlayerId);
  const isMyTurn = Boolean(activeUser?.id && room?.currentPlayerId === activeUser.id);
  const currentPlayerName = currentPlayer?.username || (isMyTurn ? activeUser?.username : "Player") || "Player";
  const currentPlayerAvatar = currentPlayer?.avatarCode || (isMyTurn ? socketUserPayload?.avatarCode : undefined);
  const hasSubmittedThisTurn = Boolean(activeUser?.id && room?.turnSubmittedPlayerId === activeUser.id);
  const currentTurnStrokeCount = Number(room?.currentTurnStrokeCount || 0);
  const strokesRemaining = Math.max(0, maxStrokesPerTurn - currentTurnStrokeCount);
  const canDraw = hasStarted && isMyTurn && strokesRemaining > 0;
  const canInspectStroke = hasStarted && activeTool === "select";
  const canUseDrawingTool = canDraw && activeTool !== "select";
  const canSubmitTurn = hasStarted && isMyTurn && hasSubmittedThisTurn;
  const canStartGame = isAdminUser && room?.phase === "lobby" && connectedMembersCount >= 3;
  const hasVoted = Boolean(activeUser?.id && room?.votedPlayerIds?.includes(activeUser.id));
  const turnHeading = isMyTurn
    ? strokesRemaining <= 0
      ? "Submit your action"
      : hasSubmittedThisTurn
        ? "Draw another stroke or submit"
        : "Your turn"
    : `${currentPlayer?.username || "Player"} is drawing`;
  const turnSecondsRemaining = room?.turnEndsAt
    ? Math.max(0, Math.ceil((room.turnEndsAt - now) / 1000))
    : 0;
  const votingSecondsRemaining = room?.votingEndsAt
    ? Math.max(0, Math.ceil((room.votingEndsAt - now) / 1000))
    : 0;
  const turnTimePercent = hasStarted && turnDurationSeconds > 0
    ? Math.max(0, Math.min(100, (turnSecondsRemaining / turnDurationSeconds) * 100))
    : 0;
  const votingPlayers = ((room?.players || visibleMembers) as RoomMember[]).filter((player) => player.id !== activeUser?.id);
  const drawBlockMessage = !hasStarted
    ? "Waiting for admin to start."
    : !isMyTurn
      ? "Wait for your turn."
      : strokesRemaining <= 0
        ? "Stroke limit reached. Submit action to pass the turn."
        : hasSubmittedThisTurn
          ? "Draw another stroke or submit action."
          : "Draw before submitting.";
  const canvasCursor = canInspectStroke
    ? "pointer"
    : canDraw
      ? activeTool === "eraser" ? eraserCursor : "crosshair"
      : "not-allowed";

  useEffect(() => {
    if (!hasStarted) return;

    DrawGameState(latestGameStateRef.current)
    drawActiveStroke(latestActiveStrokeRef.current)
    // Redraws are keyed to game progress; draw helpers are stable for this render path but not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, room?.currentPlayerId, room?.submittedTurns])

  useEffect(() => {
    if (!hasStarted) {
      setSelectedStrokeInfo(null)
    }
  }, [hasStarted])

  const autoSubmittedTurnKeyRef = useRef("")
  useEffect(() => {
    if (!autoSubmit) return
    if (!hasStarted || !isMyTurn || strokesRemaining > 0) return
    const turnKey = `${room?.currentPlayerId ?? ""}-${room?.currentRound ?? ""}`
    if (autoSubmittedTurnKeyRef.current === turnKey) return
    autoSubmittedTurnKeyRef.current = turnKey
    SubmitTurn()
    // SubmitTurn reads ref-backed room state; resubscribing on every helper change drops active streams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, hasStarted, isMyTurn, strokesRemaining, room?.currentPlayerId, room?.currentRound])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f7f9] text-[#0f172a] [font-family:Inter,ui-sans-serif,system-ui]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-[#f6f7f9]/85 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleMobileRoomMenu}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] sm:hidden"
              aria-label={isMobileRoomMenuOpen ? "Close players menu" : "Open players menu"}
              aria-controls="mobile-room-menu"
              aria-expanded={isMobileRoomMenuOpen}
            >
              {isMobileRoomMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-[#64748b]">
                <span>Room</span>
                <button
                  onClick={CopyRoomCode}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 font-mono text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a]"
                >
                  Copy invite
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-[-0.02em] [font-family:'Space_Grotesk',Inter,ui-sans-serif]">
                Drawing Imposter
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={LeaveRoom}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-semibold text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
            >
              <LogOut className="h-4 w-4" />
              Leave
            </button>
          </div>
        </div>
      </header>

      {isMobileRoomMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[1px] sm:hidden"
          onClick={closeMobileRoomMenu}
          aria-label="Close players menu"
        />
      ) : null}

      {isMobileChatOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[1px] sm:hidden"
          onClick={closeMobileChat}
          aria-label="Close chat"
        />
      ) : null}

      <div className="relative mx-auto grid max-w-[1500px] gap-4 px-4 pb-24 pt-4 sm:py-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside
          id="mobile-room-menu"
          className={`fixed inset-y-0 left-0 z-[60] order-1 w-[min(88vw,360px)] space-y-4 overflow-y-auto bg-[#f6f7f9] p-4 shadow-2xl transition-transform duration-200 sm:visible sm:static sm:z-auto sm:w-auto sm:translate-x-0 sm:overflow-visible sm:bg-transparent sm:p-0 sm:shadow-none sm:transition-none xl:order-1 ${isMobileRoomMenuOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
          role={isMobileRoomMenuOpen ? "dialog" : undefined}
          aria-modal={isMobileRoomMenuOpen ? "true" : undefined}
          aria-label="Players and turn information"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white p-3 elev-1 sm:hidden">
            <h2 className="flex items-center gap-2 font-bold text-[#0f172a]">
              <Users className="h-4 w-4 text-[#0f766e]" />
              Room overview
            </h2>
            <button
              type="button"
              onClick={closeMobileRoomMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#334155] transition hover:border-[#0f172a] hover:text-[#0f172a]"
              aria-label="Close players menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {hasStarted ? (
            <Panel className="hidden sm:block">
              <p className="text-sm font-medium text-[#64748b]">Turn</p>
              <h2 className="mt-1 text-lg font-bold text-[#0f172a]">
                {turnHeading}
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Round {room?.currentRound || 1}/{room?.maxRounds || 1}
              </p>
              {roleInfo ? (
                <p className="mt-2 text-sm font-semibold text-[#0f766e]">
                  {roleInfo.role === "imposter"
                    ? `You are the imposter. Category: ${roleInfo.category}`
                    : `Word: ${roleInfo.word} | Category: ${roleInfo.category}`}
                </p>
              ) : null}
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-[#0f172a]">
                <Users className="h-4 w-4 text-[#0f766e]" />
                Players
              </h2>
              <span className="rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2 py-1 text-xs font-semibold text-[#334155]">
                {visibleMembers.length}
              </span>
            </div>
            <div className="cld-scroll mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {visibleMembers.length > 0 ? (
                visibleMembers.map((item, index) => {
                  const isCurrentMember = item.id === activeUser?.id;
                  const isAdminMember = Boolean(item.isAdmin || item.id === visibleAdmin?.id);
                  const isTurnMember = hasStarted && item.id === room?.currentPlayerId;

                  return (
                    <div
                      key={`${item.id ?? item.username ?? "member"}-${index}`}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition ${isTurnMember
                        ? "border-[#bbf7d0] bg-[#ecfdf5]"
                        : isAdminMember
                          ? "border-[#fde68a] bg-[#fffbeb]"
                          : "border-[#e5e7eb] bg-[#f3f4f6]"
                        }`}
                    >
                      <AvatarBadge
                        avatar={item.avatarCode}
                        name={item.username}
                        className="h-10 w-10 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0f172a]">
                          {item.username || "Player"}
                        </p>
                        <p className={`text-xs ${isAdminMember ? "text-[#92400e]" : "text-[#64748b]"}`}>
                          {isTurnMember
                            ? `Drawing now${turnSecondsRemaining ? ` · ${turnSecondsRemaining}s` : ""}`
                            : isAdminMember ? (isCurrentMember ? "Admin, you" : "Admin") : isCurrentMember ? "You" : item.connected ? "Connected" : "Offline"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdminMember ? <Crown className="h-4 w-4 text-[#b45309]" /> : null}
                        <span className={`h-2.5 w-2.5 rounded-full ${isTurnMember
                          ? "bg-[#10b981] shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                          : item.connected
                            ? "bg-[#34d399]"
                            : "bg-[#cbd2da]"
                          }`} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#f3f4f6] p-4 text-center">
                  <UserX className="mx-auto h-5 w-5 text-[#64748b]" />
                  <p className="mt-2 text-sm text-[#64748b]">Waiting for players</p>
                </div>
              )}
            </div>
          </Panel>
        </aside>

        <section className="order-2 min-w-0 space-y-4 xl:order-2">
          {!hasStarted && !isVotingPhase && !isResultPhase ? (
            <WaitingForAdminStart
              adminName={visibleAdmin?.username}
              connectedMembersCount={connectedMembersCount}
              turnDurationSeconds={turnDurationSeconds}
              maxStrokesPerTurn={maxStrokesPerTurn}
            />
          ) : null}

          {hasStarted ? (
            <>
              <Panel className={`relative overflow-hidden border-2 p-3 transition-[border-color,box-shadow] duration-200 ${isMyTurn
                ? "!border-2 !border-[#22c55e] ring-2 ring-[#86efac] shadow-[0_12px_30px_rgba(22,163,74,0.16)]"
                : "border-[#0f172a] elev-3"
                }`}>
                <div className="mb-3 rounded-xl border border-[#dbe4ea] bg-[#f8fafc] p-3 sm:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                        Turn
                        <span className="h-1 w-1 rounded-full bg-[#94a3b8]" />
                        Round {room?.currentRound || 1}/{room?.maxRounds || 1}
                      </p>
                      <h2 className="mt-1 truncate text-lg font-bold text-[#0f172a]">
                        {turnHeading}
                      </h2>
                    </div>
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#bbf7d0] bg-[#ecfdf5] px-2.5 py-1.5 text-sm font-bold text-[#047857] tabular-nums"
                      aria-label={`${turnSecondsRemaining} seconds remaining in this turn`}
                    >
                      <Clock className="h-4 w-4" />
                      {turnSecondsRemaining}s
                    </span>
                  </div>
                  {roleInfo ? (
                    <p className="mt-2 rounded-lg border border-[#99f6e4] bg-[#f0fdfa] px-2.5 py-2 text-sm font-semibold leading-5 text-[#0f766e]">
                      {roleInfo.role === "imposter"
                        ? `You are the imposter. Category: ${roleInfo.category}`
                        : `Word: ${roleInfo.word} | Category: ${roleInfo.category}`}
                    </p>
                  ) : null}
                </div>

                <div className="mb-3 flex">
                  <div className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 elev-1 ${isMyTurn
                    ? "border-[#22c55e] bg-[#dcfce7] shadow-[0_0_0_3px_rgba(34,197,94,0.14)]"
                    : "border-[#e5e7eb] bg-white"
                    }`}>
                    <AvatarBadge
                      avatar={currentPlayerAvatar}
                      name={currentPlayerName}
                      className="h-8 w-8 rounded-full"
                    />
                    <span className="min-w-0 truncate text-sm font-bold text-[#0f172a]">
                      {currentPlayerName}
                    </span>
                    {isMyTurn ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#166534]">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-[#16a34a] ring-2 ring-white shadow-[0_0_0_3px_rgba(22,163,74,0.22)]" />
                        Your turn
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-medium text-[#64748b]">Drawing</span>
                    )}
                  </div>
                </div>

                <div className="relative mx-auto w-full max-w-[860px] overflow-hidden rounded-xl bg-white">
                  <canvas
                    ref={canvasRef}
                    className="block h-[72vw] min-h-[300px] max-h-[380px] w-full bg-white sm:h-auto sm:min-h-0 sm:max-h-none"
                    style={{ cursor: canvasCursor, touchAction: hasStarted ? "none" : "auto" }}
                    aria-label={`${currentPlayerName} drawing canvas`}
                    onPointerDown={onMouseDown}
                    height={500}
                    width={800}
                    onPointerMove={onMouseMove}
                    onPointerUp={onMouseUp}
                    onPointerCancel={onMouseUp}
                  />
                  <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                    <Brush className="h-3 w-3" />
                    Canvas
                  </div>
                  {selectedStrokeInfo ? (
                    <>
                      <div
                        className="pointer-events-none absolute z-10 h-4 w-4 rounded-full border-2 border-white bg-[#0f766e] shadow-[0_0_0_3px_rgba(15,118,110,0.25)]"
                        style={{
                          left: `${selectedStrokeInfo.displayPoint.x + 8}px`,
                          top: `${selectedStrokeInfo.displayPoint.y + 8}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border border-[#e5e7eb] bg-white/95 px-4 py-3 text-[#0f172a] elev-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                          {selectedStrokeInfo.kind === "eraser" ? "Erased by" : "Drawn by"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-[#e5e7eb]"
                            style={{ background: selectedStrokeInfo.color || "#111827" }}
                          />
                          <p className="max-w-40 truncate text-sm font-semibold text-[#0f172a]">
                            {selectedStrokeInfo.playerName}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </Panel>

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {toolOptions.map((tool) => {
                      const Icon = tool.icon;
                      const isSelectTool = tool.kind === "select";
                      const isToolDisabled = isSelectTool ? !hasStarted : !canDraw;
                      return (
                        <button
                          key={tool.kind}
                          onClick={() => setActiveTool(tool.kind)}
                          disabled={isToolDisabled}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${activeTool === tool.kind
                            ? "border-[#0f172a] bg-[#0f172a] text-white elev-1"
                            : "border-[#e5e7eb] bg-white text-[#334155] hover:border-[#0f172a] hover:text-[#0f172a]"
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
                      <Palette className="h-4 w-4 text-[#64748b]" />
                      {colorOptions.map((color) => {
                        const isSelectedColor = strokeColor.toLowerCase() === color.toLowerCase();
                        return (
                          <button
                            key={color}
                            disabled={!canUseDrawingTool}
                            onClick={() => {
                              HandelColorSelect(color)
                            }}
                            className={`h-7 w-7 rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${isSelectedColor
                              ? "scale-110 border-white shadow-[0_0_0_3px_rgba(15,17,21,0.25)]"
                              : "border-[#e5e7eb] hover:border-[#0f172a]/50"
                              }`}
                            style={{ background: color }}
                            aria-label={`Use color ${color}`}
                          />
                        );
                      })}
                      <input
                        type="color"
                        value={strokeColor}
                        disabled={!canUseDrawingTool}
                        onChange={(event) => {
                          HandelColorSelect(event.currentTarget.value)
                        }}
                        className="h-8 w-9 rounded-lg border border-[#e5e7eb] bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-[#64748b]">
                      Size
                      <input
                        type="range"
                        min={2}
                        max={32}
                        value={strokeSize}
                        disabled={!canUseDrawingTool}
                        onChange={(e) => {
                          setStrokeSize(Number(e.currentTarget.value))
                          const value = Number(e.currentTarget.value)
                          localWidthRef.current = value
                        }}
                        className="w-24 accent-[#0f172a] disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] pt-4">
                  <p className="text-sm font-medium text-[#64748b]">
                    {canInspectStroke
                      ? "Click a stroke to see who made it."
                      : canDraw ? `Draw up to ${maxStrokesPerTurn} stroke${maxStrokesPerTurn === 1 ? "" : "s"}. ${strokesRemaining} left.` : drawBlockMessage}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition sm:inline-flex ${autoSubmit
                      ? "border-[#0f766e] bg-[#f0fdfa] text-[#0f766e]"
                      : "border-[#e5e7eb] bg-[#f3f4f6] text-[#334155] hover:border-[#0f172a]/40"
                      }`}>
                      <input
                        type="checkbox"
                        checked={autoSubmit}
                        onChange={(event) => setAutoSubmit(event.currentTarget.checked)}
                        className="h-4 w-4 accent-[#0f766e]"
                      />
                      Auto-submit
                    </label>
                    <button
                      onClick={HandelUndo}
                      disabled={!canDraw}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Undo draft
                    </button>
                    <button
                      onClick={SubmitTurn}
                      disabled={!canSubmitTurn}
                      className="hidden rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white elev-2 transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40 sm:inline-block"
                    >
                      Submit action
                    </button>
                  </div>
                </div>
              </Panel>
            </>
          ) : null}

          {isVotingPhase ? (
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#64748b]">Voting</p>
                  <h2 className="mt-1 text-lg font-bold text-[#0f172a]">Choose the imposter</h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    {room?.votesCount || 0}/{room?.eligibleVotes || 0} votes locked
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm font-semibold text-[#92400e]">
                  <Clock className="h-4 w-4" />
                  {votingSecondsRemaining}s
                </div>
              </div>
            </Panel>
          ) : null}

          {isResultPhase && room?.result ? (
            <ResultsPanel
              result={room.result}
              activeUserId={activeUser?.id}
              players={room.players || visibleMembers}
              onLeave={LeaveRoom}
            />
          ) : null}
        </section>

        <aside className="order-3 space-y-4">
          <Panel
            id="mobile-chat"
            className={`${isMobileChatOpen ? "fixed inset-x-3 bottom-20 z-[70] flex max-h-[calc(100vh-7rem)] flex-col shadow-2xl" : "hidden"} sm:static sm:block sm:max-h-none`}
            role={isMobileChatOpen ? "dialog" : undefined}
            aria-modal={isMobileChatOpen ? true : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold text-[#0f172a]">
                <MessageCircle className="h-4 w-4 text-[#0f766e]" />
                Chat
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2 py-1 text-xs font-semibold text-[#334155]">
                  {visibleMessages.length}
                </span>
                <button
                  type="button"
                  onClick={closeMobileChat}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#334155] transition hover:border-[#0f172a] hover:text-[#0f172a] sm:hidden"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={chatMessagesRef} className="cld-scroll mt-4 flex h-[min(55vh,24rem)] min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] p-3 sm:h-64">

              {visibleMessages.length > 0 ? (
                visibleMessages.map((item, index) => {
                  const isMine = item.sender === "you";

                  return (
                    <div
                      key={`${item.sender ?? "message"}-${index}`}
                      className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      {!isMine ? (
                        <AvatarBadge
                          avatar={item.avatarCode}
                          name={item.sender}
                          className="h-8 w-8 rounded-lg"
                        />
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${isMine
                          ? "bg-[#0f172a] text-white"
                          : "border border-[#e5e7eb] bg-white text-[#334155]"
                          }`}
                      >
                        <p className={`mb-1 text-[11px] font-semibold ${isMine ? "text-white/80" : "text-[#0f766e]"}`}>
                          {item.sender || "Player"}
                        </p>
                        <p className="break-words">{item.msg}</p>
                      </div>
                      {isMine ? (
                        <AvatarBadge
                          avatar={item.avatarCode}
                          name={item.sender}
                          className="h-8 w-8 rounded-lg"
                        />
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm font-medium text-[#64748b]">
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
                className="min-w-0 flex-1 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none ring-[#0f766e]/25 transition placeholder:text-[#94a3b8] focus:border-[#0f766e] focus:ring-4"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f172a] text-white elev-1 transition hover:bg-[#334155]"
                aria-label="Send chat"
                onClick={SendGroupMessage}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </Panel>

          {hasStarted ? (
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold text-[#0f172a]">
                  <Clock className="h-4 w-4 text-[#0f766e]" />
                  Turn timer
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#bbf7d0] bg-[#ecfdf5] px-2.5 py-1 text-sm font-bold text-[#047857] tabular-nums">
                  {turnSecondsRemaining}s
                </span>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-medium text-[#64748b]">
                  <span>Turn timer</span>
                  <span>{turnDurationSeconds}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full bg-[#10b981] transition-[width]"
                    style={{ width: `${turnTimePercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-medium text-[#64748b]">
                  <span>Action progress</span>
                  <span>
                    {room?.submittedTurns || 0}/{room?.totalTurnsBeforeVote || 0}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full bg-[#0f172a]"
                    style={{
                      width: room?.totalTurnsBeforeVote
                        ? `${Math.min(100, ((room.submittedTurns || 0) / room.totalTurnsBeforeVote) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-medium text-[#64748b]">
                  <span>Strokes this turn</span>
                  <span>{currentTurnStrokeCount}/{maxStrokesPerTurn}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full bg-[#f97316]"
                    style={{ width: `${Math.min(100, (currentTurnStrokeCount / maxStrokesPerTurn) * 100)}%` }}
                  />
                </div>
              </div>
            </Panel>
          ) : null}

          {!hasStarted && !isVotingPhase && !isResultPhase ? (
            <LobbyStartControls
              isAdminUser={isAdminUser}
              canStartGame={canStartGame}
              turnDurationSeconds={turnDurationSeconds}
              maxStrokesPerTurn={maxStrokesPerTurn}
              onTurnDurationChange={setTurnDurationSeconds}
              onMaxStrokesChange={setMaxStrokesPerTurn}
              onStart={StartGame}
            />
          ) : null}
        </aside>
      </div>

      <button
        type="button"
        onClick={toggleMobileChat}
        className="fixed bottom-4 left-4 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0f172a] text-white shadow-[0_12px_30px_rgba(15,23,42,0.3)] transition hover:bg-[#334155] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] sm:hidden"
        aria-label={isMobileChatOpen ? "Close chat" : "Open chat"}
        aria-controls="mobile-chat"
        aria-expanded={isMobileChatOpen}
      >
        {isMobileChatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {unreadChatCount > 0 && !isMobileChatOpen ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#ef4444] px-1 text-[11px] font-bold leading-none text-white">
            {unreadChatCount > 99 ? "99+" : unreadChatCount}
          </span>
        ) : null}
      </button>

      {hasStarted && !isMobileChatOpen && !isMobileRoomMenuOpen ? (
        <div className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 sm:hidden">
          <label className={`inline-flex h-12 items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition ${autoSubmit
            ? "border-[#0f766e] bg-[#f0fdfa] text-[#0f766e]"
            : "border-[#e5e7eb] bg-white text-[#334155]"
            }`}>
            <input
              type="checkbox"
              checked={autoSubmit}
              onChange={(event) => setAutoSubmit(event.currentTarget.checked)}
              className="h-4 w-4 accent-[#0f766e]"
            />
            Auto
          </label>
          <button
            type="button"
            onClick={SubmitTurn}
            disabled={!canSubmitTurn}
            className="h-12 rounded-xl bg-[#0f172a] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit action
          </button>
        </div>
      ) : null}
      {
        isVotingPhase ? (
          <VotingModal
            players={votingPlayers}
            activeUserId={activeUser?.id}
            hasVoted={hasVoted}
            secondsRemaining={votingSecondsRemaining}
            votesCount={room?.votesCount || 0}
            eligibleVotes={room?.eligibleVotes || 0}
            onVote={SubmitVote}
          />
        ) : null
      }
    </main >
  );
};

const Panel = ({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"section">) => (
  <section {...props} className={`rounded-2xl border border-[#e5e7eb] bg-white p-4 elev-2 ${className}`}>
    {children}
  </section>
);

const WaitingForAdminStart = ({
  adminName,
  connectedMembersCount,
  turnDurationSeconds,
  maxStrokesPerTurn,
}: {
  adminName?: string;
  connectedMembersCount: number;
  turnDurationSeconds: number;
  maxStrokesPerTurn: number;
}) => {
  const neededPlayers = Math.max(0, 3 - connectedMembersCount);
  const readyPercent = Math.min(100, Math.round((connectedMembersCount / 3) * 100));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white elev-2">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#64748b]">Lobby</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0f172a]">Waiting for the host</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#64748b]">
            {neededPlayers > 0
              ? `${neededPlayers} more player${neededPlayers === 1 ? "" : "s"} needed before this room can start.`
              : "Everyone needed is connected. The host can start the round."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-3 py-2 text-sm font-semibold text-[#047857]">
          <CheckCircle2 className="h-4 w-4" />
          {connectedMembersCount}/3 ready
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#64748b]">Round setup</p>
              <h3 className="mt-1 text-lg font-bold text-[#0f172a]">Sketch warm-up</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-sm font-semibold text-[#c2410c]">
              <Flame className="h-4 w-4" />
              {adminName || "Host"}
            </div>
          </div>

          <div className="relative mt-4 h-[300px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white text-[#0f172a] elev-1 sm:h-[330px]">
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-white">
              <Brush className="h-3.5 w-3.5 text-[#5eead4]" />
              Live sketch
            </div>
            <svg
              aria-hidden="true"
              className="absolute inset-x-6 top-12 h-[68%] w-[calc(100%-3rem)]"
              viewBox="0 0 720 260"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="lobby-scene-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#18181b" floodOpacity="0.16" />
                </filter>
                <filter id="lobby-pencil-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <path d="M44 218 H676" fill="none" stroke="#d4d4d8" strokeLinecap="round" strokeWidth="10" />

              <g opacity="0">
                <animate attributeName="opacity" dur="5.8s" keyTimes="0;0.08;0.86;1" repeatCount="indefinite" values="0;1;1;0" />
                <circle cx="592" cy="50" r="34" fill="#fde047" />
                <path
                  d="M592 6 V24 M592 76 V96 M548 50 H566 M618 50 H638 M560 18 L572 30 M612 70 L626 84 M624 18 L612 30 M572 70 L558 84"
                  fill="none"
                  stroke="#f97316"
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray="210"
                  strokeDashoffset="210"
                >
                  <animate attributeName="stroke-dashoffset" dur="5.8s" keyTimes="0;0.16;0.72;1" repeatCount="indefinite" values="210;0;0;210" />
                </path>
              </g>

              <g opacity="0" filter="url(#lobby-scene-shadow)">
                <animate attributeName="opacity" begin="0.25s" dur="5.8s" keyTimes="0;0.1;0.78;1" repeatCount="indefinite" values="0;1;1;0" />
                <path
                  d="M342 70 C352 48 382 48 392 70 C404 62 428 68 430 88 C432 108 412 118 392 112 H326 C304 112 292 96 304 80 C312 68 328 66 342 70Z"
                  fill="#e0f2fe"
                  stroke="#14b8a6"
                  strokeWidth="6"
                  strokeLinejoin="round"
                  strokeDasharray="360"
                  strokeDashoffset="360"
                >
                  <animate attributeName="stroke-dashoffset" begin="0.25s" dur="5.8s" keyTimes="0;0.2;0.72;1" repeatCount="indefinite" values="360;0;0;360" />
                </path>
              </g>

              <g filter="url(#lobby-scene-shadow)">
                <path d="M138 212 L154 122 L186 122 L204 212 Z" fill="#a16207" opacity="0">
                  <animate attributeName="opacity" begin="0.6s" dur="5.8s" keyTimes="0;0.08;0.76;1" repeatCount="indefinite" values="0;1;1;0" />
                </path>
                <path
                  d="M138 212 L154 122 L186 122 L204 212 Z"
                  fill="none"
                  stroke="#713f12"
                  strokeLinejoin="round"
                  strokeWidth="8"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                >
                  <animate attributeName="stroke-dashoffset" begin="0.6s" dur="5.8s" keyTimes="0;0.18;0.74;1" repeatCount="indefinite" values="300;0;0;300" />
                </path>
                <path
                  d="M94 122 C84 82 124 58 154 78 C166 42 222 46 230 88 C266 92 276 142 236 158 C218 194 158 186 148 156 C116 164 86 150 94 122Z"
                  fill="#22c55e"
                  opacity="0"
                >
                  <animate attributeName="opacity" begin="0.85s" dur="5.8s" keyTimes="0;0.08;0.76;1" repeatCount="indefinite" values="0;1;1;0" />
                </path>
                <path
                  d="M94 122 C84 82 124 58 154 78 C166 42 222 46 230 88 C266 92 276 142 236 158 C218 194 158 186 148 156 C116 164 86 150 94 122Z"
                  fill="none"
                  stroke="#15803d"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="8"
                  strokeDasharray="560"
                  strokeDashoffset="560"
                >
                  <animate attributeName="stroke-dashoffset" begin="0.85s" dur="5.8s" keyTimes="0;0.24;0.74;1" repeatCount="indefinite" values="560;0;0;560" />
                </path>
                {[138, 184, 224].map((x, index) => (
                  <circle key={`lobby-fruit-${index}`} cx={x} cy={index === 0 ? 118 : index === 1 ? 88 : 130} r="10" fill="#ef4444" opacity="0">
                    <animate attributeName="opacity" begin={`${1.15 + index * 0.12}s`} dur="5.8s" keyTimes="0;0.08;0.72;1" repeatCount="indefinite" values="0;1;1;0" />
                  </circle>
                ))}
              </g>

              <g filter="url(#lobby-scene-shadow)">
                <path
                  d="M342 180 L374 136 H510 C540 136 566 156 580 180 H620 C634 180 646 192 646 206 V218 H318 V202 C318 190 330 180 342 180Z"
                  fill="#ef4444"
                  opacity="0"
                >
                  <animate attributeName="opacity" begin="1.45s" dur="5.8s" keyTimes="0;0.08;0.7;1" repeatCount="indefinite" values="0;1;1;0" />
                </path>
                <path d="M386 146 H504 C522 146 540 160 550 180 H352 Z" fill="#bae6fd" opacity="0">
                  <animate attributeName="opacity" begin="1.65s" dur="5.8s" keyTimes="0;0.08;0.68;1" repeatCount="indefinite" values="0;1;1;0" />
                </path>
                <path
                  id="lobby-car-outline"
                  d="M342 180 L374 136 H510 C540 136 566 156 580 180 H620 C634 180 646 192 646 206 V218 H318 V202 C318 190 330 180 342 180Z"
                  fill="none"
                  stroke="#991b1b"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="8"
                  strokeDasharray="760"
                  strokeDashoffset="760"
                >
                  <animate attributeName="stroke-dashoffset" begin="1.45s" dur="5.8s" keyTimes="0;0.28;0.7;1" repeatCount="indefinite" values="760;0;0;760" />
                </path>
                <path
                  d="M386 146 H504 C522 146 540 160 550 180 H352 Z M454 146 V180"
                  fill="none"
                  stroke="#0369a1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="6"
                  strokeDasharray="330"
                  strokeDashoffset="330"
                >
                  <animate attributeName="stroke-dashoffset" begin="1.85s" dur="5.8s" keyTimes="0;0.2;0.66;1" repeatCount="indefinite" values="330;0;0;330" />
                </path>
                {[384, 574].map((x, index) => (
                  <g key={`lobby-wheel-${index}`} opacity="0">
                    <animate attributeName="opacity" begin={`${2.15 + index * 0.15}s`} dur="5.8s" keyTimes="0;0.08;0.64;1" repeatCount="indefinite" values="0;1;1;0" />
                    <circle cx={x} cy="218" r="24" fill="#18181b" />
                    <circle cx={x} cy="218" r="10" fill="#e5e7eb" />
                  </g>
                ))}
              </g>

              <g filter="url(#lobby-pencil-glow)">
                <path d="M0 -10 L22 0 L0 10 L6 0 Z" fill="#18181b" />
                <circle cx="6" cy="0" r="3" fill="#f97316" />
                <animateMotion dur="5.8s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#lobby-car-outline" />
                </animateMotion>
              </g>
            </svg>

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              <div className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 elev-1">
                <p className="text-xs font-semibold text-[#334155]">{connectedMembersCount}/3 players</p>
              </div>
              <div className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 elev-1">
                <p className="text-xs font-semibold text-[#334155]">{turnDurationSeconds}s turns</p>
              </div>
              <div className="rounded-full border border-[#ccfbf1] bg-[#f0fdfa] px-3 py-2 elev-1">
                <p className="text-xs font-semibold text-[#0f766e]">{maxStrokesPerTurn} stroke{maxStrokesPerTurn === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 elev-1">
                <p className="text-xs font-semibold text-[#c2410c]">{readyPercent}% ready</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">

            <div className="min-w-36">
              <p className="text-sm font-medium text-[#64748b]">Start readiness</p>
              <p className="mt-2 text-lg font-bold text-[#0f172a]">{readyPercent}%</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
            <div
              className="h-full rounded-full bg-[#f97316] transition-[width]"
              style={{ width: `${readyPercent}%` }}
            />
          </div>
        </section>
      </div>
    </section>
  );
};

const LobbyStartControls = ({
  isAdminUser,
  canStartGame,
  turnDurationSeconds,
  maxStrokesPerTurn,
  onTurnDurationChange,
  onMaxStrokesChange,
  onStart,
}: {
  isAdminUser: boolean;
  canStartGame: boolean;
  turnDurationSeconds: number;
  maxStrokesPerTurn: number;
  onTurnDurationChange: (value: number) => void;
  onMaxStrokesChange: (value: number) => void;
  onStart: () => void;
}) => (
  <Panel className="border-[#fed7aa] bg-[#fff7ed]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[#c2410c]">Host controls</p>
        <h2 className="mt-1 text-lg font-bold text-[#0f172a]">
          {isAdminUser ? "Start when ready" : "Waiting for host"}
        </h2>
      </div>
      <Flame className="h-5 w-5 text-[#f97316]" />
    </div>

    <label className="mt-4 block text-sm font-medium text-[#334155]">
      Turn seconds
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={5}
          max={120}
          value={turnDurationSeconds}
          disabled={!isAdminUser}
          onChange={(event) => onTurnDurationChange(Number(event.currentTarget.value))}
          className="min-w-0 flex-1 accent-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="number"
          min={5}
          max={120}
          value={turnDurationSeconds}
          disabled={!isAdminUser}
          onChange={(event) => onTurnDurationChange(Number(event.currentTarget.value))}
          className="h-10 w-20 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#0f172a] outline-none ring-[#0f766e]/25 transition focus:border-[#0f766e] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </label>

    <label className="mt-4 block text-sm font-medium text-[#334155]">
      Strokes per turn
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={3}
          value={maxStrokesPerTurn}
          disabled={!isAdminUser}
          onChange={(event) => onMaxStrokesChange(Math.min(3, Math.max(1, Number(event.currentTarget.value))))}
          className="min-w-0 flex-1 accent-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="number"
          min={1}
          max={3}
          value={maxStrokesPerTurn}
          disabled={!isAdminUser}
          onChange={(event) => onMaxStrokesChange(Math.min(3, Math.max(1, Number(event.currentTarget.value))))}
          className="h-10 w-20 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#0f172a] outline-none ring-[#0f766e]/25 transition focus:border-[#0f766e] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <span className="mt-1 block text-xs font-medium text-[#c2410c]">
        Server enforced, max 3.
      </span>
    </label>

    {isAdminUser ? (
      <button
        onClick={onStart}
        disabled={!canStartGame}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-bold text-white elev-2 transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play className="h-4 w-4" />
        Start game
      </button>
    ) : (
      <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm font-medium text-[#64748b]">
        Host starts the room after 3 players connect.
      </div>
    )}
  </Panel>
);

const VotingModal = ({
  players,
  activeUserId,
  hasVoted,
  secondsRemaining,
  votesCount,
  eligibleVotes,
  onVote,
}: {
  players: RoomMember[];
  activeUserId?: string;
  hasVoted: boolean;
  secondsRemaining: number;
  votesCount: number;
  eligibleVotes: number;
  onVote: (targetId: string) => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-2xl rounded-2xl border border-[#e5e7eb] bg-white p-5 elev-modal">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-4">
        <div>
          <p className="text-sm font-medium text-[#64748b]">Voting</p>
          <h2 className="mt-1 text-xl font-bold text-[#0f172a]">Pick the imposter</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            {votesCount}/{eligibleVotes} votes submitted
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm font-semibold text-[#92400e]">
          <Clock className="h-4 w-4" />
          {secondsRemaining}s
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {players.length > 0 ? (
          players.map((player) => (
            <button
              key={player.id}
              type="button"
              disabled={hasVoted || player.id === activeUserId}
              onClick={() => onVote(player.id)}
              className="flex min-h-20 items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 text-left elev-1 transition hover:-translate-y-0.5 hover:border-[#0f172a] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <AvatarBadge
                avatar={player.avatarCode}
                name={player.username}
                className="h-12 w-12 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0f172a]">{player.username || "Player"}</p>
                <p className="mt-1 text-xs text-[#64748b]">
                  {player.connected ? "Connected" : "Offline"}
                </p>
              </div>
              <span className="rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-2 py-1 text-xs font-semibold text-[#334155]">
                {hasVoted ? "Locked" : "Vote"}
              </span>
            </button>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-[#e5e7eb] bg-[#f3f4f6] p-6 text-center text-sm font-medium text-[#64748b]">
            No voting options available
          </div>
        )}
      </div>

      {hasVoted ? (
        <p className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-3 py-2 text-sm font-medium text-[#047857]">
          Vote locked. Results appear when the timer ends.
        </p>
      ) : (
        <p className="mt-4 text-sm font-medium text-[#64748b]">
          Voting closes automatically when the 15 second timer ends.
        </p>
      )}
    </div>
  </div>
);

const lastResultSound = {
  key: "",
  playedAt: 0,
}

let resultAudioContext: AudioContext | null = null

const getResultAudioContext = () => {
  if (typeof window === "undefined") {
    return null
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return null
  }

  resultAudioContext ||= new AudioContextCtor()
  return resultAudioContext
}

const unlockResultAudio = async () => {
  const audioContext = getResultAudioContext()
  if (audioContext?.state === "suspended") {
    await audioContext.resume()
  }
}

const playResultRevealSound = (didWin: boolean, soundKey: string, force = false) => {
  const now = Date.now()
  if (!force && lastResultSound.key === soundKey && now - lastResultSound.playedAt < 2000) {
    return
  }

  const audioContext = getResultAudioContext()
  if (!audioContext) {
    return
  }

  try {
    void unlockResultAudio()
    const masterGain = audioContext.createGain()
    const startTime = audioContext.currentTime
    const notes = didWin ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63]
    const soundDuration = didWin ? 1.05 : 0.9

    lastResultSound.key = soundKey
    lastResultSound.playedAt = now

    masterGain.gain.setValueAtTime(0.0001, startTime)
    masterGain.gain.exponentialRampToValueAtTime(0.32, startTime + 0.04)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + soundDuration)
    masterGain.connect(audioContext.destination)

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const noteGain = audioContext.createGain()
      const noteStart = startTime + index * 0.12

      oscillator.type = didWin ? (index % 2 === 0 ? "triangle" : "sine") : "triangle"
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      noteGain.gain.setValueAtTime(0.0001, noteStart)
      noteGain.gain.exponentialRampToValueAtTime(didWin ? 0.36 : 0.3, noteStart + 0.02)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32)
      oscillator.connect(noteGain)
      noteGain.connect(masterGain)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.36)
    })

    window.setTimeout(() => {
      masterGain.disconnect()
    }, 1300)
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
}

type ResultPlayerView = {
  id: string;
  username: string;
  avatarCode?: string;
}

const ResultsPanel = ({
  result,
  activeUserId,
  players,
  onLeave,
}: {
  result: GameResult;
  activeUserId?: string;
  players: RoomMember[];
  onLeave: () => void;
}) => {
  const playerById = new Map(players.map((player) => [player.id, player]))
  const participantIds = Array.from(new Set([
    ...result.voteCounts.map((count) => count.playerId),
    result.imposterId,
  ]))
  const resultPlayers: ResultPlayerView[] = participantIds.map((playerId) => {
    const roomPlayer = playerById.get(playerId)
    const votePlayer = result.voteCounts.find((count) => count.playerId === playerId)

    return {
      id: playerId,
      username: roomPlayer?.username || votePlayer?.playerName || (playerId === result.imposterId ? result.imposterName : "Player"),
      avatarCode: roomPlayer?.avatarCode,
    }
  })
  const imposterPlayer = resultPlayers.find((player) => player.id === result.imposterId) || {
    id: result.imposterId,
    username: result.imposterName,
  }
  const artistPlayers = resultPlayers.filter((player) => player.id !== result.imposterId)
  const hasPersonalOutcome = Boolean(activeUserId && resultPlayers.some((player) => player.id === activeUserId))
  const isCurrentUserImposter = Boolean(hasPersonalOutcome && activeUserId === result.imposterId)
  const didCurrentUserWin = hasPersonalOutcome
    ? isCurrentUserImposter ? !result.artistsWin : result.artistsWin
    : result.artistsWin
  const outcomeLabel = didCurrentUserWin ? "Victory" : "Defeat"
  const outcomeTitle = !hasPersonalOutcome
    ? result.artistsWin ? "The artist team won" : "The imposter won"
    : isCurrentUserImposter
      ? didCurrentUserWin ? "You escaped!" : "You were caught"
      : didCurrentUserWin ? "Your team won!" : "Your team lost"
  const outcomeDescription = !hasPersonalOutcome
    ? result.artistsWin
      ? `${result.imposterName} was identified as the imposter.`
      : `${result.imposterName} stayed hidden until the end.`
    : isCurrentUserImposter
      ? didCurrentUserWin
        ? "The artists did not find you."
        : "The artists found you."
      : didCurrentUserWin
        ? `${result.imposterName} was caught. The artists win together.`
        : `${result.imposterName} escaped. The artists lose together.`
  const displayedPlayers = isCurrentUserImposter ? [imposterPlayer] : artistPlayers
  const displayedTeamTitle = isCurrentUserImposter ? "You · Imposter" : "Your artist team"
  const soundKey = `${activeUserId || "spectator"}:${result.imposterId}:${result.selectedTargetId || "none"}:${result.artistsWin}:${result.word}`

  useEffect(() => {
    playResultRevealSound(didCurrentUserWin, soundKey)
  }, [didCurrentUserWin, soundKey])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0f172a]/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-title"
    >
      <section className="cld-scroll max-h-[94svh] w-full max-w-lg overflow-y-auto rounded-[26px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className={`relative h-36 overflow-hidden border-b ${didCurrentUserWin
          ? "border-[#86efac] bg-[#ecfdf5]"
          : "border-[#fecdd3] bg-[#fff1f2]"
          }`}>
          <ResultCelebrationSvg artistsWin={didCurrentUserWin} />
        </div>

        <div className="p-5 text-center sm:p-6">
          <div className={`mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${didCurrentUserWin
            ? "border-[#4ade80] bg-[#ecfdf5] text-[#15803d]"
            : "border-[#fb7185] bg-[#fff1f2] text-[#be123c]"
            }`}>
            {didCurrentUserWin ? <Trophy className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
            {outcomeLabel}
          </div>
          <h2 id="game-result-title" className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#0f172a] sm:text-3xl">
            {outcomeTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">{outcomeDescription}</p>

          <div className="mt-5 text-left">
            <ResultTeamCard
              title={displayedTeamTitle}
              players={displayedPlayers}
              activeUserId={activeUserId}
              isWinner={didCurrentUserWin}
              team={isCurrentUserImposter ? "imposter" : "artists"}
            />
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => playResultRevealSound(didCurrentUserWin, soundKey, true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
          >
            <Volume2 className="h-4 w-4" />
            Play sound
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#334155]"
          >
            <LogOut className="h-4 w-4" />
            Back to lobby
          </button>
        </footer>
      </section>
    </div>
  )
}

const ResultTeamCard = ({
  title,
  players,
  activeUserId,
  isWinner,
  team,
}: {
  title: string;
  players: ResultPlayerView[];
  activeUserId?: string;
  isWinner: boolean;
  team: "artists" | "imposter";
}) => {
  return (
    <div className={`rounded-2xl border p-4 ${isWinner
      ? "border-[#4ade80] bg-[#ecfdf5]"
      : "border-[#fecdd3] bg-[#fff7f8]"
      }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-[0.12em] ${isWinner ? "text-[#15803d]" : "text-[#be123c]"}`}>
            {isWinner ? "Winning team" : "Lost this round"}
          </p>
          <h4 className="mt-1 truncate text-lg font-bold text-[#0f172a]">{title}</h4>
        </div>
        <div className={`rounded-xl border bg-white p-2 ${isWinner
          ? "border-[#86efac] text-[#16a34a]"
          : "border-[#fecdd3] text-[#e11d48]"
          }`}>
          {isWinner
            ? <Sparkles className="h-5 w-5" />
            : team === "artists" ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {players.map((player) => {
          const isCurrentUser = player.id === activeUserId

          return (
            <div
              key={`${title}-${player.id}`}
              className="flex items-center gap-3 rounded-xl border border-white bg-white/85 p-2"
            >
              <AvatarBadge
                avatar={player.avatarCode}
                name={player.username}
                className="h-9 w-9 rounded-xl"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0f172a]">
                {player.username}
              </span>
              {isCurrentUser ? (
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${isWinner
                  ? "bg-[#dcfce7] text-[#166534]"
                  : "bg-[#ffe4e6] text-[#9f1239]"
                  }`}>
                  You
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ResultCelebrationSvg = ({ artistsWin }: { artistsWin: boolean }) => {
  const accent = artistsWin ? "#10b981" : "#fb7185"
  const accentDark = artistsWin ? "#047857" : "#be123c"

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 900 380"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="result-stage-glow" cx="50%" cy="42%" r="64%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="48%" stopColor="#e2e8f0" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#f3f4f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="result-ribbon" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
        <filter id="result-soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.14" />
        </filter>
      </defs>

      <rect width="900" height="380" fill="#f3f4f6" />
      <rect width="900" height="380" fill="url(#result-stage-glow)" />
      <path
        d="M110 320 C230 260 342 360 450 306 C560 252 670 262 790 318"
        fill="none"
        stroke={accent}
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.35"
        strokeDasharray="22 18"
      >
        <animate attributeName="stroke-dashoffset" dur="2.4s" repeatCount="indefinite" values="0;-80" />
      </path>

      {[80, 160, 252, 698, 778, 842].map((x, index) => (
        <g key={`result-confetti-${index}`} opacity={artistsWin ? "0.9" : "0.12"}>
          <animateTransform
            attributeName="transform"
            dur={`${2.6 + index * 0.22}s`}
            repeatCount="indefinite"
            type="translate"
            values={`0 ${-90 - index * 12}; 0 410`}
          />
          <rect
            x={x}
            y={20 + index * 16}
            width={index % 2 === 0 ? 12 : 8}
            height={index % 2 === 0 ? 8 : 14}
            rx="2"
            fill={index % 3 === 0 ? "#facc15" : index % 3 === 1 ? accent : "#cfc9ff"}
          >
            <animateTransform
              attributeName="transform"
              dur={`${0.9 + index * 0.08}s`}
              repeatCount="indefinite"
              type="rotate"
              values={`0 ${x} ${20 + index * 16}; 180 ${x} ${20 + index * 16}; 360 ${x} ${20 + index * 16}`}
            />
          </rect>
        </g>
      ))}

      <g filter="url(#result-soft-shadow)" opacity={artistsWin ? "1" : "0.12"}>
        <ellipse cx="450" cy="316" rx="178" ry="28" fill="#0f172a" opacity="0.10" />
        <path
          d="M294 116 C314 178 350 220 410 226 L410 254 L374 276 L526 276 L490 254 L490 226 C550 220 586 178 606 116 L546 116 C536 148 512 170 490 176 L490 98 L410 98 L410 176 C388 170 364 148 354 116 Z"
          fill="#facc15"
        >
          <animateTransform
            attributeName="transform"
            dur="1.5s"
            repeatCount="indefinite"
            type="translate"
            values="0 0; 0 -8; 0 0"
          />
        </path>
        <path
          d="M318 134 C336 170 356 188 410 194 M582 134 C564 170 544 188 490 194 M410 98 H490 V176 C490 204 470 222 450 222 C430 222 410 204 410 176 Z"
          fill="none"
          stroke="#92400e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
          opacity="0.55"
        />
        <path d="M400 276 H500 L518 318 H382 Z" fill="url(#result-ribbon)" />
        <path d="M420 318 H480" fill="none" stroke="#fef3c7" strokeLinecap="round" strokeWidth="8" />
      </g>

      <g transform="translate(450 154)">
        {artistsWin ? (
          <g>
            <path
              d="M0 -48 C26 -34 52 -32 72 -32 V8 C72 54 40 82 0 96 C-40 82 -72 54 -72 8 V-32 C-52 -32 -26 -34 0 -48Z"
              fill={accentDark}
              stroke="#a7f3d0"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path d="M-28 12 L-8 34 L34 -18" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12">
              <animate attributeName="stroke-dasharray" dur="1.8s" repeatCount="indefinite" values="0 110;110 0;110 0" />
            </path>
          </g>
        ) : (
          <g>
            <path
              d="M-70 -18 C-38 -48 38 -48 70 -18 C62 46 38 72 0 72 C-38 72 -62 46 -70 -18Z"
              fill={accentDark}
              stroke="#f5d0fe"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path d="M-42 4 C-24 -6 -10 -6 4 6 M42 4 C24 -6 10 -6 -4 6" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="8" />
            <path d="M-20 38 C-8 48 8 48 20 38" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="7" />
          </g>
        )}
      </g>

      {[302, 598].map((x, index) => (
        <g key={`result-spark-${index}`} opacity={artistsWin ? "1" : "0.18"}>
          <path
            d={`M${x} 72 L${x + 10} 100 L${x + 40} 108 L${x + 10} 118 L${x} 146 L${x - 10} 118 L${x - 40} 108 L${x - 10} 100 Z`}
            fill={index === 0 ? "#0f766e" : "#facc15"}
            opacity="0.88"
          >
            <animateTransform
              attributeName="transform"
              dur={`${1.4 + index * 0.2}s`}
              repeatCount="indefinite"
              type="scale"
              values="0.78;1.08;0.78"
            />
          </path>
        </g>
      ))}
    </svg>
  )
}

export default GameRoom;
