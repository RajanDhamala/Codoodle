import jwt from "jsonwebtoken";
import { v4 as uuidv4, validate as isValidUuid } from "uuid";
import cookie from "cookie";
import { getOptionalIntEnv, getRequiredEnv } from "./env.js";
import { WORD_BANK } from "./WordBank.js";
let socketInstance;

const ActiveUser = new Map();
const Rooms = new Map();
const GameState = new Map()
const ActiveStrokes = new Map();
const EMPTY_ROOM_CLEANUP_MS = 30000;
const DEFAULT_HOST_DISCONNECT_GRACE_MS = 30000;
const MIN_PLAYERS_TO_START = 3;
const DEFAULT_MAX_PLAYERS = 6;
const MIN_MAX_PLAYERS = 3;
const MAX_MAX_PLAYERS = 10;
const DEFAULT_TURN_CYCLES_BEFORE_VOTE = 3;
const MIN_TURN_CYCLES_BEFORE_VOTE = 1;
const MAX_TURN_CYCLES_BEFORE_VOTE = 5;
const DEFAULT_TURN_DURATION_SECONDS = 30;
const MIN_TURN_DURATION_SECONDS = 5;
const MAX_TURN_DURATION_SECONDS = 120;
const DEFAULT_MAX_STROKES_PER_TURN = 1;
const MIN_MAX_STROKES_PER_TURN = 1;
const MAX_MAX_STROKES_PER_TURN = 3;
const VOTING_DURATION_MS = 15000;
const RESULT_DURATION_MS = 7000;

const normalizeAvatarCode = (user = {}) => {
  if (typeof user.avatarCode === "string" && user.avatarCode.trim()) {
    return user.avatarCode.trim();
  }

  if (typeof user.avatar === "string" && user.avatar.trim()) {
    return user.avatar.trim();
  }

  return null;
};

const normalizeUser = (socket) => {
  const socketUser = ActiveUser.get(socket.id);
  if (!socketUser?.id) return null;

  return {
    id: socketUser.id,
    username: socketUser.username,
    ...(socketUser.avatarCode ? { avatarCode: socketUser.avatarCode } : {}),
  };
};

const getRandomItem = (items) => {
  return items[Math.floor(Math.random() * items.length)];
};

const clampTurnDurationSeconds = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return DEFAULT_TURN_DURATION_SECONDS;

  return Math.min(
    MAX_TURN_DURATION_SECONDS,
    Math.max(MIN_TURN_DURATION_SECONDS, Math.round(normalized))
  );
};

const clampMaxStrokesPerTurn = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return DEFAULT_MAX_STROKES_PER_TURN;

  return Math.min(
    MAX_MAX_STROKES_PER_TURN,
    Math.max(MIN_MAX_STROKES_PER_TURN, Math.round(normalized))
  );
};

const clampMaxPlayers = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return DEFAULT_MAX_PLAYERS;

  return Math.min(
    MAX_MAX_PLAYERS,
    Math.max(MIN_MAX_PLAYERS, Math.round(normalized))
  );
};

const clampTurnCyclesBeforeVote = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return DEFAULT_TURN_CYCLES_BEFORE_VOTE;

  return Math.min(
    MAX_TURN_CYCLES_BEFORE_VOTE,
    Math.max(MIN_TURN_CYCLES_BEFORE_VOTE, Math.round(normalized))
  );
};

const normalizeRoomSettings = (settings = {}) => {
  return {
    ...settings,
    maxPlayers: clampMaxPlayers(settings.maxPlayers),
    turnCyclesBeforeVote: clampTurnCyclesBeforeVote(settings.turnCyclesBeforeVote),
    maxStrokesPerTurn: clampMaxStrokesPerTurn(settings.maxStrokesPerTurn),
  };
};

const shuffle = (items) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }

  return copy;
};

const InitWs = async (io) => {
  const wsLimits = {
    maxPayloadBytes: getOptionalIntEnv("WS_MAX_PAYLOAD_BYTES", 20000),
    rateLimitWindowMs: getOptionalIntEnv("WS_RATE_LIMIT_WINDOW_MS", 10000),
    maxEventsPerWindow: getOptionalIntEnv("WS_MAX_EVENTS_PER_WINDOW", 80),
    maxStreamEventsPerWindow: getOptionalIntEnv("WS_MAX_STREAM_EVENTS_PER_WINDOW", 240),
    maxChatMessageLength: getOptionalIntEnv("WS_MAX_CHAT_MESSAGE_LENGTH", 280),
    maxPointsPerSend: getOptionalIntEnv("WS_MAX_POINTS_PER_SEND", 32),
    maxPointsPerStroke: getOptionalIntEnv("WS_MAX_POINTS_PER_STROKE", 4000),
    hostDisconnectGraceMs: getOptionalIntEnv("WS_HOST_DISCONNECT_GRACE_MS", DEFAULT_HOST_DISCONNECT_GRACE_MS),
  };

  const emitWsError = (socket, message) => {
    socket.emit("ws-error", { message });
  };

  const getPayloadByteLength = (payload) => {
    try {
      return Buffer.byteLength(JSON.stringify(payload), "utf8");
    } catch {
      return wsLimits.maxPayloadBytes + 1;
    }
  };

  const isPayloadAllowed = (payload) => {
    return getPayloadByteLength(payload) <= wsLimits.maxPayloadBytes;
  };

  const isRateLimited = (socket, eventName) => {
    if (!socket.data.rateLimitBuckets) {
      socket.data.rateLimitBuckets = new Map();
    }

    const now = Date.now();
    const bucketKey = String(eventName || "unknown");
    const bucket = socket.data.rateLimitBuckets.get(bucketKey);

    if (!bucket || now - bucket.startedAt > wsLimits.rateLimitWindowMs) {
      socket.data.rateLimitBuckets.set(bucketKey, {
        startedAt: now,
        count: 1,
      });
      return false;
    }

    bucket.count += 1;
    const maxEvents = eventName === "send-stream"
      ? wsLimits.maxStreamEventsPerWindow
      : wsLimits.maxEventsPerWindow;

    return bucket.count > maxEvents;
  };

  const rejectSocketPacket = (socket, packet, message) => {
    const maybeAck = packet[packet.length - 1];
    if (typeof maybeAck === "function") {
      maybeAck({ success: false, message });
    }
    emitWsError(socket, message);
  };

  const getValidRoomId = (value) => {
    return typeof value === "string" && isValidUuid(value) ? value : null;
  };

  const normalizeChatMessage = (message) => {
    const normalized = String(message || "").trim();

    if (!normalized) {
      return null;
    }

    if (normalized.length > wsLimits.maxChatMessageLength) {
      return null;
    }

    return normalized;
  };

  const normalizePoint = (point) => {
    const x = Number(point?.x);
    const y = Number(point?.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x, y };
  };

  const normalizePointList = (points) => {
    if (!Array.isArray(points) || points.length > wsLimits.maxPointsPerSend) {
      return null;
    }

    const normalizedPoints = points.map(normalizePoint);
    if (normalizedPoints.some((point) => !point)) {
      return null;
    }

    return normalizedPoints;
  };

  const normalizeStrokeStartPayload = (payload) => {
    const initial = normalizePoint(payload?.inital);
    const width = Number(payload?.width);
    const allowedKinds = new Set(["path", "eraser", "line", "rect", "circle"]);
    const kind = allowedKinds.has(payload?.kind) ? payload.kind : "path";
    const color = typeof payload?.color === "string" && payload.color.length <= 32
      ? payload.color
      : "#111827";

    if (!initial || !Number.isFinite(width)) {
      return null;
    }

    return {
      kind,
      inital: initial,
      color,
      width: Math.min(64, Math.max(1, Math.round(width))),
    };
  };

  io.use((socket, next) => {
    const data = cookie.parse(socket.handshake.headers.cookie || "");
    const token = data.info;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, getRequiredEnv("INFO_SECRET"));
      const id = String(decoded.id || "").trim();
      const username = String(decoded.username || "").trim();

      if (!id || !username) {
        return next(new Error("Unauthorized"));
      }

      ActiveUser.set(socket.id, {
        id,
        username,
        avatarCode: normalizeAvatarCode(decoded),
      });
    } catch (err) {
      console.error("Socket handshake error");
      return next(new Error("Unauthorized"));
    }
    return next();
  });

  const clearRoom = (roomId) => {
    const room = Rooms.get(roomId);
    if (room?.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
    }
    if (room?.turnTimer) {
      clearTimeout(room.turnTimer);
    }
    if (room?.votingTimer) {
      clearTimeout(room.votingTimer);
    }
    if (room?.resultTimer) {
      clearTimeout(room.resultTimer);
    }
    if (room?.ownerCleanupTimer) {
      clearTimeout(room.ownerCleanupTimer);
    }

    Rooms.delete(roomId);
    GameState.delete(roomId);
    ActiveStrokes.delete(roomId);
  };

  const closeRoom = (roomId, message = "Room closed.") => {
    io.to(roomId).emit("room-closed", { roomId, message });
    io.in(roomId).socketsLeave(roomId);
    clearRoom(roomId);
  };

  const getConnectedMemberCount = (room) => {
    return Array.from(room.members.values()).filter((member) => member.socketIds.size > 0).length;
  };

  const getConnectedMembers = (room) => {
    return Array.from(room.members.values()).filter((member) => member.socketIds.size > 0);
  };

  const getGroupMembers = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.members.values()).map((member) => ({
      id: member.id,
      username: member.username,
      avatarCode: member.avatarCode,
      connected: member.socketIds.size > 0,
      isAdmin: member.id === room.owner.id,
    }));
  };

  const getCurrentPlayer = (room) => {
    if (!room.currentPlayerId) return null;
    return room.members.get(room.currentPlayerId) || null;
  };

  const getTurnStrokeKey = (room, userId) => {
    return `${room.turnsElapsed}:${userId}`;
  };

  const getTurnStrokeCount = (room, userId = room.currentPlayerId) => {
    if (!room || !userId) return 0;
    return Number(room.turnStrokeCounts?.get(getTurnStrokeKey(room, userId)) || 0);
  };

  const incrementTurnStrokeCount = (room, userId) => {
    if (!room.turnStrokeCounts) {
      room.turnStrokeCounts = new Map();
    }

    const key = getTurnStrokeKey(room, userId);
    const nextCount = getTurnStrokeCount(room, userId) + 1;
    room.turnStrokeCounts.set(key, nextCount);

    return nextCount;
  };

  const getMaxStrokesPerTurn = (room) => {
    return clampMaxStrokesPerTurn(room?.maxStrokesPerTurn ?? room?.settings?.maxStrokesPerTurn);
  };

  const isPlayerConnected = (room, playerId) => {
    const member = room.members.get(playerId);
    return Boolean(member && member.socketIds.size > 0);
  };

  const isRoomMember = (room, userId) => {
    return Boolean(room?.members?.has(userId));
  };

  const findNextConnectedTurnIndex = (room, startIndex) => {
    if (!room.turnOrder.length) return -1;

    for (let offset = 0; offset < room.turnOrder.length; offset++) {
      const index = (startIndex + offset) % room.turnOrder.length;
      const playerId = room.turnOrder[index];

      if (isPlayerConnected(room, playerId)) {
        return index;
      }
    }

    return -1;
  };

  const getPublicRoomState = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return null;

    const currentPlayer = getCurrentPlayer(room);
    const players = getGroupMembers(roomId).map((member) => ({
      ...member,
      isHost: member.isAdmin,
    }));

    return {
      code: roomId,
      phase: room.phase,
      players,
      connectedPlayerCount: players.filter((player) => player.connected).length,
      currentPlayerId: room.currentPlayerId,
      currentPlayerName: currentPlayer?.username || null,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      turnDurationSeconds: room.turnDurationSeconds,
      maxStrokesPerTurn: getMaxStrokesPerTurn(room),
      currentTurnStrokeCount: getTurnStrokeCount(room),
      turnEndsAt: room.turnEndsAt,
      turnSubmittedPlayerId: room.turnSubmittedPlayerId,
      submittedTurns: room.turnsElapsed,
      totalTurnsBeforeVote: room.totalTurnsBeforeVote,
      votingEndsAt: room.votingEndsAt,
      votesCount: room.votes?.size || 0,
      eligibleVotes: room.eligibleVoterIds?.size || 0,
      votedPlayerIds: Array.from(room.votes?.keys?.() || []),
      result: room.result || null,
    };
  };

  const getRoomSync = (roomId) => {
    const room = Rooms.get(roomId);

    return {
      roomId,
      members: getGroupMembers(roomId),
      ...getPublicRoomState(roomId),
      settings: {
        ...room.settings,
        owner: room.owner,
      },
      owner: room.owner,
      gameState: GameState.get(roomId) || [],
      activeStroke: ActiveStrokes.get(roomId) || null,
    };
  };

  const getRoleInfo = (room, userId) => {
    if (!room.word || !room.category || !room.imposterId) return null;

    if (userId === room.imposterId) {
      return {
        role: "imposter",
        category: room.category,
      };
    }

    return {
      role: "artist",
      word: room.word,
      category: room.category,
    };
  };

  const emitRoleToSocket = (socketId, room, userId) => {
    const roleInfo = getRoleInfo(room, userId);
    if (!roleInfo) return;

    io.to(socketId).emit("role-info", roleInfo);
  };

  const emitRolesToRoom = (room) => {
    room.members.forEach((member) => {
      member.socketIds.forEach((socketId) => {
        emitRoleToSocket(socketId, room, member.id);
      });
    });
  };

  const emitRoomState = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit("room-state-updated", getRoomSync(roomId));
  };

  const finalizeActiveStroke = (roomId, requestedFinalPoint = null, options = {}) => {
    const room = Rooms.get(roomId);
    const activeStroke = ActiveStrokes.get(roomId);
    if (!room || !activeStroke) return null;

    const finalPoint = normalizePoint(requestedFinalPoint)
      || activeStroke.intermediate[activeStroke.intermediate.length - 1]
      || activeStroke.initial;
    if (!finalPoint) return null;

    activeStroke.final = finalPoint;
    activeStroke.strokeNumber = incrementTurnStrokeCount(room, activeStroke.userId);

    if (!GameState.has(roomId)) {
      GameState.set(roomId, []);
    }
    GameState.get(roomId).push(activeStroke);
    ActiveStrokes.delete(roomId);
    room.turnSubmittedPlayerId = activeStroke.userId;

    io.to(roomId).emit("recieve-end-stream", {
      userId: activeStroke.userId,
      username: activeStroke.username,
      data: {
        id: activeStroke.id,
        roomId,
        data: finalPoint,
      },
    });

    if (options.emitState !== false) {
      emitRoomState(roomId);
    }

    return activeStroke;
  };

  const resetRoomToLobby = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return;

    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
      room.votingTimer = null;
    }
    if (room.resultTimer) {
      clearTimeout(room.resultTimer);
      room.resultTimer = null;
    }

    room.phase = "lobby";
    room.word = null;
    room.category = null;
    room.imposterId = null;
    room.turnOrder = [];
    room.activePlayerIds = new Set();
    room.currentTurnIndex = 0;
    room.currentPlayerId = null;
    room.currentRound = 0;
    room.maxStrokesPerTurn = getMaxStrokesPerTurn(room);
    room.turnStrokeCounts = new Map();
    room.turnsElapsed = 0;
    room.totalTurnsBeforeVote = 0;
    room.turnEndsAt = null;
    room.turnSubmittedPlayerId = null;
    room.votingEndsAt = null;
    room.eligibleVoterIds = new Set();
    room.votes = new Map();
    room.result = null;
    ActiveStrokes.delete(roomId);
    GameState.set(roomId, []);
    emitRoomState(roomId);
  };

  const finishVotingPhase = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room || room.phase !== "voting") return;

    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
      room.votingTimer = null;
    }

    const voteCounts = Array.from(room.activePlayerIds || []).map((playerId) => {
      const member = room.members.get(playerId);
      let votes = 0;

      room.votes.forEach((targetId) => {
        if (targetId === playerId) votes += 1;
      });

      return {
        playerId,
        playerName: member?.username || "Player",
        votes,
      };
    });

    const highestVotes = Math.max(0, ...voteCounts.map((count) => count.votes));
    const topTargets = voteCounts.filter((count) => highestVotes > 0 && count.votes === highestVotes);
    const selectedTargetId = topTargets.length === 1 ? topTargets[0].playerId : null;
    const selectedTargetMember = selectedTargetId ? room.members.get(selectedTargetId) : null;
    const imposterMember = room.members.get(room.imposterId);

    room.phase = "results";
    room.currentPlayerId = null;
    room.turnEndsAt = null;
    room.turnSubmittedPlayerId = null;
    room.votingEndsAt = null;
    room.result = {
      word: room.word,
      category: room.category,
      imposterId: room.imposterId,
      imposterName: imposterMember?.username || "Imposter",
      selectedTargetId,
      selectedTargetName: selectedTargetMember?.username || null,
      artistsWin: selectedTargetId === room.imposterId,
      voteCounts,
    };

    emitRoomState(roomId);
    room.resultTimer = setTimeout(() => {
      const latestRoom = Rooms.get(roomId);
      if (!latestRoom) return;

      if (!isPlayerConnected(latestRoom, latestRoom.owner.id)) {
        clearRoom(roomId);
        return;
      }

      resetRoomToLobby(roomId);
    }, RESULT_DURATION_MS);
  };

  const startVotingPhase = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return;

    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }

    room.phase = "voting";
    room.currentPlayerId = null;
    room.turnEndsAt = null;
    room.turnSubmittedPlayerId = null;
    room.votingEndsAt = Date.now() + VOTING_DURATION_MS;
    room.eligibleVoterIds = new Set(
      Array.from(room.activePlayerIds || []).filter((playerId) => isPlayerConnected(room, playerId))
    );
    room.votes = new Map();
    ActiveStrokes.delete(roomId);
    emitRoomState(roomId);
    room.votingTimer = setTimeout(() => {
      finishVotingPhase(roomId);
    }, VOTING_DURATION_MS);
  };

  const finishDrawingPhase = (roomId) => {
    startVotingPhase(roomId);
  };

  const beginTurn = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room || room.phase !== "drawing") return;

    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }

    const connectedTurnIndex = findNextConnectedTurnIndex(room, room.currentTurnIndex);
    if (connectedTurnIndex === -1) {
      room.currentPlayerId = null;
      room.turnEndsAt = null;
      room.turnSubmittedPlayerId = null;
      ActiveStrokes.delete(roomId);
      emitRoomState(roomId);
      return;
    }

    room.currentTurnIndex = connectedTurnIndex;
    const playerId = room.turnOrder[connectedTurnIndex];
    room.currentPlayerId = playerId || null;
    room.currentRound = Math.floor(room.turnsElapsed / room.turnOrder.length) + 1;
    room.turnSubmittedPlayerId = null;
    room.turnEndsAt = Date.now() + room.turnDurationSeconds * 1000;
    ActiveStrokes.delete(roomId);

    emitRoomState(roomId);
    room.turnTimer = setTimeout(() => {
      advanceTurn(roomId, true);
    }, room.turnDurationSeconds * 1000);
  };

  const advanceTurn = (roomId, shouldCountTurn = true) => {
    const room = Rooms.get(roomId);
    if (!room || room.phase !== "drawing") return;

    finalizeActiveStroke(roomId, null, { emitState: false });
    if (shouldCountTurn) {
      room.turnsElapsed += 1;
    }

    if (room.turnsElapsed >= room.totalTurnsBeforeVote) {
      finishDrawingPhase(roomId);
      return;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    beginTurn(roomId);
  };

  const skipDisconnectedCurrentPlayer = (roomId, userId) => {
    const room = Rooms.get(roomId);
    if (!room || room.phase !== "drawing" || room.currentPlayerId !== userId) return;

    if (!isPlayerConnected(room, userId)) {
      advanceTurn(roomId, true);
    }
  };

  const getDrawBlockReason = (roomId, user, options = {}) => {
    const room = Rooms.get(roomId);

    if (!user) return "Join the room before drawing.";
    if (!room) return "Room not found or expired.";
    if (!isRoomMember(room, user.id)) return "Join the room before drawing.";
    if (room.phase !== "drawing") return "Waiting for admin to start.";
    if (room.currentPlayerId !== user?.id) return "Wait for your turn.";
    if (options.startingStroke) {
      if (ActiveStrokes.has(roomId)) return "Finish the active stroke first.";
      if (getTurnStrokeCount(room, user.id) >= getMaxStrokesPerTurn(room)) {
        return "Stroke limit reached. Submit action to pass the turn.";
      }
    }

    return null;
  };

  const getSubmitBlockReason = (roomId, user) => {
    const room = Rooms.get(roomId);

    if (!user) return "Join the room before submitting.";
    if (!room) return "Room not found or expired.";
    if (!isRoomMember(room, user.id)) return "Join the room before submitting.";
    if (room.phase !== "drawing") return "Waiting for admin to start.";
    if (room.currentPlayerId !== user?.id) return "Wait for your turn.";
    if (ActiveStrokes.has(roomId)) return "Finish the active stroke first.";
    if (getTurnStrokeCount(room, user.id) <= 0) return "Draw before submitting.";

    return null;
  };

  const emitDrawBlocked = (socket, message) => {
    socket.emit("draw-blocked", { message });
  };

  const emitRoomMembers = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit("room-members-updated", {
      roomId,
      members: getGroupMembers(roomId),
      owner: room.owner,
    });
  };

  const scheduleEmptyRoomCleanup = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room || getConnectedMemberCount(room) > 0) return;

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
    }

    room.cleanupTimer = setTimeout(() => {
      const currentRoom = Rooms.get(roomId);
      if (!currentRoom || getConnectedMemberCount(currentRoom) > 0) return;

      clearRoom(roomId);
    }, EMPTY_ROOM_CLEANUP_MS);
  };

  const cancelRoomCleanup = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room?.cleanupTimer) return;

    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  };

  const scheduleOwnerMissingCleanup = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room || isPlayerConnected(room, room.owner.id)) return;

    if (room.ownerCleanupTimer) {
      clearTimeout(room.ownerCleanupTimer);
    }

    io.to(roomId).emit("room-owner-disconnected", {
      roomId,
      message: "Admin disconnected. The room will close if they do not return.",
    });

    room.ownerCleanupTimer = setTimeout(() => {
      const currentRoom = Rooms.get(roomId);
      if (!currentRoom || isPlayerConnected(currentRoom, currentRoom.owner.id)) return;

      closeRoom(roomId, "Admin left. Room resources were cleaned up.");
    }, wsLimits.hostDisconnectGraceMs);
  };

  const cancelOwnerCleanup = (roomId) => {
    const room = Rooms.get(roomId);
    if (!room?.ownerCleanupTimer) return;

    clearTimeout(room.ownerCleanupTimer);
    room.ownerCleanupTimer = null;
  };

  const addSocketToRoom = (socket, roomId) => {
    const room = Rooms.get(roomId);
    if (!room) return null;

    const user = normalizeUser(socket);
    if (!user) return null;
    ActiveUser.set(socket.id, user);

    const existingMember = room.members.get(user.id);
    const member = existingMember || {
      id: user.id,
      username: user.username,
      avatarCode: user.avatarCode,
      socketIds: new Set(),
    };

    member.username = user.username;
    member.avatarCode = user.avatarCode || member.avatarCode;
    member.socketIds.add(socket.id);
    room.members.set(user.id, member);

    if (room.owner.id === user.id) {
      cancelOwnerCleanup(roomId);
      room.owner = {
        ...room.owner,
        username: user.username,
        ...(user.avatarCode ? { avatarCode: user.avatarCode } : {}),
      };
    }

    if (!socket.data.joinedRooms) {
      socket.data.joinedRooms = new Set();
    }
    socket.data.joinedRooms.add(roomId);

    cancelRoomCleanup(roomId);
    return member;
  };

  const removeSocketFromRoomState = (socket, roomId, shouldForgetMember = false) => {
    const room = Rooms.get(roomId);
    const user = ActiveUser.get(socket.id);
    if (!room || !user) return;
    const wasOwner = room.owner.id === user.id;

    const member = room.members.get(user.id);
    if (member) {
      member.socketIds.delete(socket.id);

      if (shouldForgetMember) {
        room.members.delete(user.id);
      }
    }

    socket.data.joinedRooms?.delete(roomId);

    if (getConnectedMemberCount(room) === 0) {
      scheduleEmptyRoomCleanup(roomId);
      return;
    }

    if (wasOwner && !isPlayerConnected(room, user.id)) {
      scheduleOwnerMissingCleanup(roomId);
    }

    skipDisconnectedCurrentPlayer(roomId, user.id);
    emitRoomMembers(roomId);
  };

  io.on("connection", (socket) => {
    const userdata = ActiveUser.get(socket.id);
    socket.emit("connected", { data: userdata });

    socket.use((packet, next) => {
      const eventName = String(packet[0] || "unknown");

      if (isRateLimited(socket, eventName)) {
        rejectSocketPacket(socket, packet, "Too many websocket events. Slow down.");
        return;
      }

      if (!isPayloadAllowed(packet.slice(1))) {
        rejectSocketPacket(socket, packet, "Websocket payload is too large.");
        return;
      }

      next();
    });

    socket.on("send-stroke", (data) => {
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId || data?.id);
      const room = roomId ? Rooms.get(roomId) : null;
      if (!user || !room || !isRoomMember(room, user.id)) {
        emitWsError(socket, "Join the room before drawing.");
        return;
      }

      const obj = {
        sendername: user.username,
        id: user.id,
        data: data,
      };
      socket.to(roomId).emit("recieve-stroke", obj);
    });

    socket.on("create-group", (data, callback) => {
      const ack = typeof callback === "function" ? callback : () => {};
      const roomId = uuidv4();
      const trimmed = roomId
      const owner = normalizeUser(socket);
      if (!owner) {
        ack({ success: false, message: "Unauthorized." });
        return;
      }
      socket.join(trimmed);
      const settings = normalizeRoomSettings(data?.settings || {});
      Rooms.set(trimmed, {
        settings,
        cretedAt: Date.now(),
        owner,
        members: new Map(),
        cleanupTimer: null,
        turnTimer: null,
        votingTimer: null,
        resultTimer: null,
        ownerCleanupTimer: null,
        phase: "lobby",
        word: null,
        category: null,
        imposterId: null,
        turnOrder: [],
        activePlayerIds: new Set(),
        currentTurnIndex: 0,
        currentPlayerId: null,
        currentRound: 0,
        maxRounds: clampTurnCyclesBeforeVote(settings.turnCyclesBeforeVote),
        turnDurationSeconds: DEFAULT_TURN_DURATION_SECONDS,
        maxStrokesPerTurn: settings.maxStrokesPerTurn,
        turnStrokeCounts: new Map(),
        turnsElapsed: 0,
        totalTurnsBeforeVote: 0,
        turnEndsAt: null,
        turnSubmittedPlayerId: null,
        votingEndsAt: null,
        eligibleVoterIds: new Set(),
        votes: new Map(),
        result: null,
      });
      GameState.set(trimmed, []);
      addSocketToRoom(socket, trimmed);

      ack({
        success: true,
        message: "Group created successfully",
        roomId: trimmed,
        ...getRoomSync(trimmed),
      })
    });

    socket.on("join-group", (data, callback) => {
      const ack = typeof callback === "function" ? callback : () => {};
      const roomId = getValidRoomId(data?.id);
      if (!roomId) {
        ack({
          success: false,
          message: "Invalid room id.",
          roomId: data?.id,
        });
        return
      }
      const isRoom = Rooms.get(roomId)
      if (!isRoom) {
        ack({
          success: false,
          message: "Room not found or expired.",
          roomId,
        });
        return
      }

      const joiningUser = normalizeUser(socket);
      if (!joiningUser) {
        ack({ success: false, message: "Unauthorized.", roomId });
        return;
      }
      const existingMember = isRoom.members.get(joiningUser.id);
      const roomMaxPlayers = clampMaxPlayers(isRoom.settings?.maxPlayers);
      if (!existingMember && getConnectedMemberCount(isRoom) >= roomMaxPlayers) {
        ack({
          success: false,
          message: "Room is full.",
          roomId,
        });
        return
      }
      if (isRoom.phase !== "lobby" && !isRoom.activePlayerIds?.has(joiningUser.id)) {
        ack({
          success: false,
          message: "Match already started. Wait for the next lobby.",
          roomId,
        });
        return
      }

      socket.join(roomId);
      addSocketToRoom(socket, roomId);

      const room = Rooms.get(roomId);
      const user = ActiveUser.get(socket.id);
      const roleInfo = getRoleInfo(room, user?.id);

      ack({
        success: true,
        message: data?.reconnect ? "Room reconnected." : "Joined room successfully.",
        ...(roleInfo ? { roleInfo } : {}),
        ...getRoomSync(roomId),
      });

      if (roleInfo) {
        emitRoleToSocket(socket.id, room, user.id);
      }

      socket.to(roomId).emit("new-user-joined", {
        user: ActiveUser.get(socket.id),
        members: getGroupMembers(roomId),
        owner: Rooms.get(roomId).owner,
      });
      emitRoomMembers(roomId);
    });

    socket.on("start-game", (data, callback) => {
      const ack = typeof callback === "function" ? callback : () => {};
      const roomId = getValidRoomId(data?.roomId || data?.id);
      if (!roomId) {
        ack({ success: false, message: "Invalid room id." });
        return;
      }
      const room = Rooms.get(roomId);
      const user = ActiveUser.get(socket.id);

      if (!room || !user) {
        ack({ success: false, message: "Room not found or expired." });
        return;
      }

      if (room.owner.id !== user.id) {
        ack({ success: false, message: "Only admin can start the game." });
        return;
      }

      if (room.phase !== "lobby") {
        ack({ success: false, message: "Game already started." });
        return;
      }

      const connectedMembers = getConnectedMembers(room);
      if (connectedMembers.length < MIN_PLAYERS_TO_START) {
        ack({
          success: false,
          message: `Need at least ${MIN_PLAYERS_TO_START} connected players to start.`,
        });
        return;
      }

      const wordData = getRandomItem(WORD_BANK);
      const turnOrder = shuffle(connectedMembers.map((member) => member.id));
      const imposter = getRandomItem(connectedMembers);
      const maxRounds = clampTurnCyclesBeforeVote(room.settings?.turnCyclesBeforeVote);
      const turnDurationSeconds = clampTurnDurationSeconds(
        data?.turnDurationSeconds || room.settings?.turnDurationSeconds
      );
      const maxStrokesPerTurn = clampMaxStrokesPerTurn(
        data?.maxStrokesPerTurn || room.settings?.maxStrokesPerTurn
      );

      room.phase = "drawing";
      room.word = wordData.word;
      room.category = wordData.category;
      room.imposterId = imposter.id;
      room.turnOrder = turnOrder;
      room.activePlayerIds = new Set(turnOrder);
      room.currentTurnIndex = 0;
      room.currentPlayerId = null;
      room.currentRound = 1;
      room.maxRounds = maxRounds;
      room.turnDurationSeconds = turnDurationSeconds;
      room.maxStrokesPerTurn = maxStrokesPerTurn;
      room.settings = {
        ...room.settings,
        turnDurationSeconds,
        maxStrokesPerTurn,
      };
      room.turnStrokeCounts = new Map();
      room.turnsElapsed = 0;
      room.totalTurnsBeforeVote = turnOrder.length * maxRounds;
      room.turnSubmittedPlayerId = null;
      room.turnEndsAt = null;
      room.votingEndsAt = null;
      room.eligibleVoterIds = new Set();
      room.votes = new Map();
      room.result = null;
      ActiveStrokes.delete(roomId);

      emitRolesToRoom(room);
      beginTurn(roomId);

      ack({
        success: true,
        message: "Game started.",
        ...getRoomSync(roomId),
        roleInfo: getRoleInfo(room, user.id),
      });
    });

    socket.on("send-group-message", (data) => {
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.id);
      const room = roomId ? Rooms.get(roomId) : null;
      const message = normalizeChatMessage(data?.message);
      if (!user || !room || !isRoomMember(room, user.id) || !message) {
        emitWsError(socket, "Invalid chat message.");
        return;
      }

      socket.to(roomId).emit("recive-group-message", {
        user,
        message,
      });
    });

    socket.on("start-stream", (data) => {
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId);
      const streamPayload = normalizeStrokeStartPayload(data?.data);
      if (!roomId || !streamPayload || !isValidUuid(data?.uuid)) {
        emitWsError(socket, "Invalid stroke payload.");
        return;
      }
      const blockReason = getDrawBlockReason(roomId, user, { startingStroke: true });
      if (!user || blockReason) {
        emitDrawBlocked(socket, blockReason || "Join the room before drawing.");
        return;
      }

      const stroke = {
        id: data.uuid,
        kind: streamPayload.kind,
        initial: streamPayload.inital,
        intermediate: [],
        final: null,
        color: streamPayload.color,
        width: streamPayload.width,
        userId: user.id,
        username: user.username,
      }
      ActiveStrokes.set(roomId, stroke)
      socket.to(roomId).emit("recieve-start-stream", {
        userId: user.id,
        username: user.username,
        data: {
          ...data,
          data: streamPayload,
        },
      })
    })

    socket.on("send-stream", (data) => {
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId);
      const points = normalizePointList(data?.data);
      if (!roomId || !points) {
        emitWsError(socket, "Invalid stroke payload.");
        return;
      }
      const blockReason = getDrawBlockReason(roomId, user);
      if (!user || blockReason) {
        emitDrawBlocked(socket, blockReason || "Join the room before drawing.");
        return;
      }

      const activeStroke = ActiveStrokes.get(roomId)
      if (!activeStroke) return;
      if (activeStroke.userId !== user.id || activeStroke.id !== data.id) {
        emitDrawBlocked(socket, "This stroke is not active anymore.");
        return;
      }
      if (activeStroke.intermediate.length + points.length > wsLimits.maxPointsPerStroke) {
        emitDrawBlocked(socket, "This stroke has too many points.");
        return;
      }
      activeStroke.intermediate.push(...points)
      socket.to(roomId).emit("recieve-send-stream", {
        userId: user.id,
        username: user.username,
        data: {
          ...data,
          data: points,
        },
      })
    })

    socket.on("end-stream", (data) => {
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId);
      const finalPoint = normalizePoint(data?.data);
      if (!roomId || !finalPoint) {
        emitWsError(socket, "Invalid stroke payload.");
        return;
      }
      const blockReason = getDrawBlockReason(roomId, user);
      if (!user || blockReason) {
        emitDrawBlocked(socket, blockReason || "Join the room before drawing.");
        return;
      }

      const activeStroke = ActiveStrokes.get(roomId)
      if (!activeStroke) return
      if (activeStroke.userId !== user.id || activeStroke.id !== data.id) {
        emitDrawBlocked(socket, "This stroke is not active anymore.");
        return;
      }
      finalizeActiveStroke(roomId, finalPoint);
    })

    socket.on("submit-turn", (data, callback) => {
      const ack = typeof callback === "function" ? callback : () => {};
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId || data?.id);
      if (!roomId) {
        ack({ success: false, message: "Invalid room id." });
        return;
      }
      const blockReason = getSubmitBlockReason(roomId, user);

      if (!user || blockReason) {
        const message = blockReason || "Join the room before submitting.";
        ack({ success: false, message });
        emitDrawBlocked(socket, message);
        return;
      }

      advanceTurn(roomId);
      ack({
        success: true,
        message: "Turn submitted.",
        ...getRoomSync(roomId),
      });
    })

    socket.on("submit-vote", (data, callback) => {
      const ack = typeof callback === "function" ? callback : () => {};
      const user = ActiveUser.get(socket.id);
      const roomId = getValidRoomId(data?.roomId || data?.id);
      if (!roomId) {
        ack({ success: false, message: "Invalid room id." });
        return;
      }
      const targetId = data?.targetId;
      const room = Rooms.get(roomId);

      if (!room || !user) {
        ack({ success: false, message: "Room not found or expired." });
        return;
      }

      if (room.phase !== "voting") {
        ack({ success: false, message: "Voting is not open." });
        return;
      }

      if (!room.eligibleVoterIds?.has(user.id)) {
        ack({ success: false, message: "You are not eligible to vote this round." });
        return;
      }

      if (room.votes?.has(user.id)) {
        ack({ success: false, message: "You already voted." });
        return;
      }

      if (!room.activePlayerIds?.has(targetId) || targetId === user.id) {
        ack({ success: false, message: "Choose a valid player." });
        return;
      }

      room.votes.set(user.id, targetId);
      emitRoomState(roomId);
      ack({
        success: true,
        message: "Vote submitted.",
        ...getRoomSync(roomId),
      });
    })

    socket.on("leave-group", (data) => {
      const roomId = getValidRoomId(data?.roomId || data?.id);
      if (!Rooms.has(roomId)) return;

      removeSocketFromRoomState(socket, roomId, true);
      socket.leave(roomId);
    })

    socket.on("disconnecting", () => {
      socket.data.disconnectingRooms = Array.from(socket.rooms).filter((roomId) => {
        return roomId !== socket.id && Rooms.has(roomId);
      });
    })

    socket.on("disconnect", () => {
      const roomIds = socket.data.disconnectingRooms || Array.from(socket.data.joinedRooms || []);

      roomIds.forEach((roomId) => {
        removeSocketFromRoomState(socket, roomId, false);
      });

      ActiveUser.delete(socket.id);
    });
  });


  socketInstance = io;
  return io;
};

export { InitWs, socketInstance };
