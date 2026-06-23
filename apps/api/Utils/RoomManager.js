const ROOM_IDLE_MS = 1000 * 60 * 60 * 2;
const MAX_CHAT_LENGTH = 280;

const DEFAULT_SETTINGS = {
  maxPlayers: 6,
  turnCyclesBeforeVote: 3,
  allowUndo: true,
  allowKick: true,
};

const WORD_BANK = [
  { word: "apple", category: "fruit" },
  { word: "bicycle", category: "vehicle" },
  { word: "umbrella", category: "object" },
  { word: "pizza", category: "food" },
  { word: "guitar", category: "instrument" },
  { word: "rocket", category: "vehicle" },
  { word: "castle", category: "place" },
  { word: "snowman", category: "character" },
  { word: "camera", category: "object" },
  { word: "elephant", category: "animal" },
];

const createId = (prefix) => {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const randomItem = (items) => {
  return items[Math.floor(Math.random() * items.length)];
};

const shuffle = (items) => {
  return [...items].sort(() => Math.random() - 0.5);
};

const normalizeName = (user) => {
  return user.fullname || user.email || "Player";
};

const normalizePoint = (point) => {
  const x = Number(point?.x);
  const y = Number(point?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
};

const normalizeColor = (value) => {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#111827";
};

const normalizeStroke = (rawStroke, player, options = {}) => {
  const kind = rawStroke?.kind;
  const isPreview = Boolean(options.isPreview);
  const allowedKinds = new Set(["path", "eraser", "line", "rect", "circle"]);

  if (!allowedKinds.has(kind)) {
    throw new Error("Unsupported drawing action.");
  }

  const baseStroke = {
    kind,
    color: normalizeColor(rawStroke.color),
    size: clampNumber(rawStroke.size, 2, 40, 6),
    playerId: player.id,
    playerName: normalizeName(player),
  };

  if (kind === "path" || kind === "eraser") {
    const points = Array.isArray(rawStroke.points)
      ? rawStroke.points.map(normalizePoint).filter(Boolean).slice(0, 1000)
      : [];

    if (points.length < (isPreview ? 1 : 2)) {
      throw new Error("Draw a longer stroke before submitting.");
    }

    return {
      ...baseStroke,
      points,
      color: kind === "eraser" ? "#ffffff" : baseStroke.color,
    };
  }

  const start = normalizePoint(rawStroke.start);
  const end = normalizePoint(rawStroke.end);

  if (!start || !end) {
    throw new Error("Shape is missing coordinates.");
  }

  if (
    !isPreview &&
    Math.abs(start.x - end.x) < 0.005 &&
    Math.abs(start.y - end.y) < 0.005
  ) {
    throw new Error("Shape is too small to submit.");
  }

  return {
    ...baseStroke,
    start,
    end,
  };
};

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    let code = "";
    do {
      code = Math.random().toString(36).slice(2, 8).toUpperCase();
    } while (this.rooms.has(code));

    return code;
  }

  createPlayer(user, socketId) {
    return {
      id: user.id,
      email: user.email,
      fullname: normalizeName(user),
      avatar: user.avatar || null,
      connected: true,
      joinedAt: new Date().toISOString(),
      socketIds: new Set([socketId]),
    };
  }

  createRoom(user, socketId, settings = {}) {
    const roomCode = this.generateRoomCode();
    const player = this.createPlayer(user, socketId);
    const room = {
      code: roomCode,
      hostId: user.id,
      phase: "lobby",
      settings: this.normalizeSettings(settings, 1),
      players: new Map([[user.id, player]]),
      wordEntry: null,
      imposterId: null,
      turnOrder: [],
      currentTurnIndex: 0,
      submittedTurns: 0,
      strokes: [],
      chat: [],
      activity: [],
      votes: new Map(),
      result: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.addActivity(room, `${normalizeName(user)} created the room.`);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode) {
    return this.rooms.get(String(roomCode || "").trim().toUpperCase()) || null;
  }

  joinRoom(roomCode, user, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error("Room was not found.");

    const existingPlayer = room.players.get(user.id);
    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.socketIds.add(socketId);
      this.touch(room);
      this.addActivity(room, `${normalizeName(user)} rejoined.`);
      return room;
    }

    if (room.phase !== "lobby") {
      throw new Error("This game already started.");
    }

    if (room.players.size >= room.settings.maxPlayers) {
      throw new Error("Room is full.");
    }

    room.players.set(user.id, this.createPlayer(user, socketId));
    this.touch(room);
    this.addActivity(room, `${normalizeName(user)} joined.`);
    return room;
  }

  updateSettings(roomCode, userId, settings = {}) {
    const room = this.requireRoom(roomCode);
    this.requireHost(room, userId);

    if (room.phase !== "lobby") {
      throw new Error("Settings can only be changed in the lobby.");
    }

    room.settings = this.normalizeSettings(settings, room.players.size, room.settings);
    this.touch(room);
    this.addActivity(room, "Room settings were updated.");
    return room;
  }

  kickPlayer(roomCode, hostId, targetId) {
    const room = this.requireRoom(roomCode);
    this.requireHost(room, hostId);

    if (room.phase !== "lobby") {
      throw new Error("Players can only be kicked from the lobby.");
    }

    if (!room.settings.allowKick) {
      throw new Error("Kicking is disabled for this room.");
    }

    if (hostId === targetId) {
      throw new Error("Host cannot kick themselves.");
    }

    const target = room.players.get(targetId);
    if (!target) throw new Error("Player is not in this room.");

    const targetSocketIds = [...target.socketIds];
    room.players.delete(targetId);
    this.addActivity(room, `${target.fullname} was removed from the room.`);
    this.syncHost(room);
    this.touch(room);

    if (!room.players.size) this.rooms.delete(room.code);

    return { room: this.rooms.get(room.code) || null, targetSocketIds };
  }

  startGame(roomCode, hostId) {
    const room = this.requireRoom(roomCode);
    this.requireHost(room, hostId);

    if (room.phase !== "lobby" && room.phase !== "results") {
      throw new Error("Game can only be started from the lobby or results screen.");
    }

    const players = [...room.players.values()].filter((player) => player.connected);
    if (players.length < 3) {
      throw new Error("At least 3 connected players are needed.");
    }

    const wordEntry = randomItem(WORD_BANK);
    const imposter = randomItem(players);

    room.players = new Map(players.map((player) => [player.id, player]));
    room.phase = "drawing";
    room.wordEntry = wordEntry;
    room.imposterId = imposter.id;
    room.turnOrder = shuffle(players.map((player) => player.id));
    room.currentTurnIndex = 0;
    room.submittedTurns = 0;
    room.strokes = [];
    room.votes = new Map();
    room.result = null;

    this.addActivity(room, "Game started. The secret word was assigned.");
    this.touch(room);
    return room;
  }

  submitStroke(roomCode, userId, rawStroke) {
    const room = this.requireRoom(roomCode);
    const player = room.players.get(userId);
    if (!player) throw new Error("You are not in this room.");

    if (room.phase !== "drawing") {
      throw new Error("Drawing is not active.");
    }

    if (this.getCurrentPlayerId(room) !== userId) {
      throw new Error("It is not your turn.");
    }

    const stroke = {
      ...normalizeStroke(rawStroke, player),
      id: createId("stroke"),
      turnNumber: room.strokes.length + 1,
      createdAt: new Date().toISOString(),
    };

    room.strokes.push(stroke);
    room.submittedTurns += 1;
    this.addActivity(room, `${player.fullname} drew one action.`);

    const totalTurns = room.turnOrder.length * room.settings.turnCyclesBeforeVote;
    let votingStarted = false;

    if (room.submittedTurns >= totalTurns) {
      room.phase = "voting";
      room.currentTurnIndex = null;
      room.votes = new Map();
      votingStarted = true;
      this.addActivity(room, "Voting started.");
    } else {
      room.currentTurnIndex = this.getNextTurnIndex(room);
    }

    this.touch(room);
    return { room, stroke, votingStarted };
  }

  previewStroke(roomCode, userId, rawStroke) {
    const room = this.requireRoom(roomCode);
    const player = room.players.get(userId);
    if (!player) throw new Error("You are not in this room.");

    if (room.phase !== "drawing") {
      throw new Error("Drawing is not active.");
    }

    if (this.getCurrentPlayerId(room) !== userId) {
      throw new Error("It is not your turn.");
    }

    return {
      ...normalizeStroke(rawStroke, player, { isPreview: true }),
      preview: true,
    };
  }

  sendChat(roomCode, userId, message) {
    const room = this.requireRoom(roomCode);
    const player = room.players.get(userId);
    if (!player) throw new Error("You are not in this room.");

    const cleanMessage = String(message || "").trim().slice(0, MAX_CHAT_LENGTH);
    if (!cleanMessage) throw new Error("Message cannot be empty.");

    const chatMessage = {
      id: createId("chat"),
      playerId: player.id,
      playerName: player.fullname,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };

    room.chat.push(chatMessage);
    room.chat = room.chat.slice(-50);
    this.touch(room);
    return chatMessage;
  }

  submitVote(roomCode, userId, targetId) {
    const room = this.requireRoom(roomCode);
    const player = room.players.get(userId);
    if (!player) throw new Error("You are not in this room.");

    if (room.phase !== "voting") {
      throw new Error("Voting is not active.");
    }

    if (userId === targetId) {
      throw new Error("You cannot vote for yourself.");
    }

    if (!room.players.has(targetId)) {
      throw new Error("Selected player is not in this room.");
    }

    room.votes.set(userId, targetId);
    this.addActivity(room, `${player.fullname} voted.`);
    this.touch(room);

    if (this.haveAllConnectedPlayersVoted(room)) {
      this.finishVoting(room);
    }

    return room;
  }

  leaveRoom(roomCode, userId, socketId, explicit = false) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.get(userId);
    if (!player) return room;

    player.socketIds.delete(socketId);

    if (explicit && room.phase === "lobby") {
      room.players.delete(userId);
      this.addActivity(room, `${player.fullname} left the room.`);
    } else if (!player.socketIds.size) {
      player.connected = false;
      this.addActivity(room, `${player.fullname} disconnected.`);
    }

    this.syncHost(room);
    this.skipDisconnectedTurn(room);

    if (room.phase === "voting" && this.haveAllConnectedPlayersVoted(room)) {
      this.finishVoting(room);
    }

    this.touch(room);

    if (!room.players.size) {
      this.rooms.delete(room.code);
      return null;
    }

    return room;
  }

  cleanupIdleRooms(now = Date.now()) {
    for (const room of this.rooms.values()) {
      const hasConnectedPlayers = [...room.players.values()].some((player) => player.connected);
      const updatedAt = new Date(room.updatedAt).getTime();

      if (!hasConnectedPlayers && now - updatedAt > ROOM_IDLE_MS) {
        this.rooms.delete(room.code);
      }
    }
  }

  getPrivateRole(room, userId) {
    if (!room || room.phase === "lobby" || !room.wordEntry) return null;

    if (room.imposterId === userId) {
      return {
        role: "imposter",
        category: room.wordEntry.category,
      };
    }

    return {
      role: "artist",
      word: room.wordEntry.word,
      category: room.wordEntry.category,
    };
  }

  getRoomSnapshot(room) {
    if (!room) return null;

    const players = [...room.players.values()].map((player) => ({
      id: player.id,
      fullname: player.fullname,
      avatar: player.avatar,
      connected: player.connected,
      isHost: player.id === room.hostId,
    }));

    const connectedPlayers = players.filter((player) => player.connected);
    const participantCount = room.turnOrder.length || room.players.size;
    const totalTurnsBeforeVote = participantCount * room.settings.turnCyclesBeforeVote;

    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      settings: room.settings,
      players,
      connectedPlayerCount: connectedPlayers.length,
      turnOrder: room.turnOrder,
      currentPlayerId: this.getCurrentPlayerId(room),
      submittedTurns: room.submittedTurns,
      totalTurnsBeforeVote,
      strokes: room.strokes,
      chat: room.chat,
      activity: room.activity,
      votesCount: room.votes.size,
      eligibleVotes: connectedPlayers.length,
      votedPlayerIds: [...room.votes.keys()],
      result: room.result,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  normalizeSettings(settings = {}, playerCount = 1, fallback = DEFAULT_SETTINGS) {
    const maxPlayers = clampNumber(
      settings.maxPlayers,
      Math.max(3, playerCount),
      10,
      fallback.maxPlayers
    );

    return {
      maxPlayers,
      turnCyclesBeforeVote: clampNumber(
        settings.turnCyclesBeforeVote,
        1,
        5,
        fallback.turnCyclesBeforeVote
      ),
      allowUndo:
        typeof settings.allowUndo === "boolean" ? settings.allowUndo : fallback.allowUndo,
      allowKick:
        typeof settings.allowKick === "boolean" ? settings.allowKick : fallback.allowKick,
    };
  }

  requireRoom(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error("Room was not found.");
    return room;
  }

  requireHost(room, userId) {
    if (room.hostId !== userId) {
      throw new Error("Only the host can do that.");
    }
  }

  addActivity(room, message) {
    room.activity.push({
      id: createId("activity"),
      message,
      createdAt: new Date().toISOString(),
    });
    room.activity = room.activity.slice(-50);
  }

  touch(room) {
    room.updatedAt = new Date().toISOString();
  }

  syncHost(room) {
    const canTransferHost = room.phase === "lobby" || room.phase === "results";

    if (room.players.has(room.hostId)) {
      const host = room.players.get(room.hostId);
      if (!canTransferHost || host.connected) return;
    }

    const connectedPlayer = [...room.players.values()].find((player) => player.connected);
    const nextPlayer = connectedPlayer || [...room.players.values()][0];

    if (nextPlayer) {
      room.hostId = nextPlayer.id;
      this.addActivity(room, `${nextPlayer.fullname} is now the host.`);
    }
  }

  getCurrentPlayerId(room) {
    if (room.phase !== "drawing" || room.currentTurnIndex === null) return null;
    return room.turnOrder[room.currentTurnIndex] || null;
  }

  getNextTurnIndex(room) {
    if (!room.turnOrder.length) return 0;

    for (let offset = 1; offset <= room.turnOrder.length; offset += 1) {
      const nextIndex = (room.currentTurnIndex + offset) % room.turnOrder.length;
      const nextPlayer = room.players.get(room.turnOrder[nextIndex]);

      if (nextPlayer?.connected) return nextIndex;
    }

    return (room.currentTurnIndex + 1) % room.turnOrder.length;
  }

  skipDisconnectedTurn(room) {
    if (room.phase !== "drawing") return;

    const currentPlayer = room.players.get(this.getCurrentPlayerId(room));
    if (currentPlayer?.connected) return;

    const previousPlayerName = currentPlayer?.fullname || "A disconnected player";
    room.currentTurnIndex = this.getNextTurnIndex(room);
    this.addActivity(room, `${previousPlayerName}'s turn was skipped.`);
  }

  haveAllConnectedPlayersVoted(room) {
    const connectedVoters = [...room.players.values()].filter((player) => player.connected);
    if (!connectedVoters.length) return false;

    return connectedVoters.every((player) => room.votes.has(player.id));
  }

  finishVoting(room) {
    const voteCounts = [...room.players.keys()].map((playerId) => ({
      playerId,
      playerName: room.players.get(playerId)?.fullname || "Unknown",
      votes: 0,
    }));

    for (const targetId of room.votes.values()) {
      const entry = voteCounts.find((count) => count.playerId === targetId);
      if (entry) entry.votes += 1;
    }

    voteCounts.sort((a, b) => b.votes - a.votes);

    const topVotes = voteCounts[0]?.votes || 0;
    const tiedTopVotes = voteCounts.filter((count) => count.votes === topVotes);
    const selectedTarget = topVotes > 0 && tiedTopVotes.length === 1 ? voteCounts[0] : null;
    const artistsWin = selectedTarget?.playerId === room.imposterId;

    room.phase = "results";
    room.result = {
      word: room.wordEntry.word,
      category: room.wordEntry.category,
      imposterId: room.imposterId,
      imposterName: room.players.get(room.imposterId)?.fullname || "Unknown",
      selectedTargetId: selectedTarget?.playerId || null,
      selectedTargetName: selectedTarget?.playerName || null,
      artistsWin,
      voteCounts,
      completedAt: new Date().toISOString(),
    };
    this.addActivity(room, artistsWin ? "Artists found the imposter." : "The imposter survived.");
  }
}

export { DEFAULT_SETTINGS, ROOM_IDLE_MS, WORD_BANK };
export default new RoomManager();
