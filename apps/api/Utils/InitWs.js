import roomManager from "./RoomManager.js";
import { getSessionFromSocket } from "./Session.js";

let socketInstance;

const emitRoomError = (socket, message) => {
  socket.emit("room:error", { message });
};

const emitRoomSnapshot = (io, room) => {
  if (!room) return;
  io.to(room.code).emit("room:snapshot", roomManager.getRoomSnapshot(room));
};

const emitPrivateRole = (io, room, playerId) => {
  const player = room.players.get(playerId);
  const role = roomManager.getPrivateRole(room, playerId);

  if (!player || !role) return;

  for (const socketId of player.socketIds) {
    io.to(socketId).emit("game:role", role);
  }
};

const emitPrivateRoles = (io, room) => {
  for (const playerId of room.players.keys()) {
    emitPrivateRole(io, room, playerId);
  }
};

const leaveCurrentRoom = (io, socket, explicit = false) => {
  const roomCode = socket.data.roomCode;
  const user = socket.data.user;

  if (!roomCode || !user) return null;

  const room = roomManager.leaveRoom(roomCode, user.id, socket.id, explicit);
  socket.leave(roomCode);
  socket.data.roomCode = null;

  emitRoomSnapshot(io, room);
  return room;
};

const InitWs = async (io) => {
  io.use((socket, next) => {
    const user = getSessionFromSocket(socket);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;
    return next();
  });

  io.on("connection", (socket) => {
    socket.emit("session:ready", { user: socket.data.user });

    socket.on("room:create", (payload = {}) => {
      try {
        leaveCurrentRoom(io, socket, true);

        const room = roomManager.createRoom(
          socket.data.user,
          socket.id,
          payload.settings || {}
        );

        socket.join(room.code);
        socket.data.roomCode = room.code;
        socket.emit("room:created", { roomCode: room.code });
        emitRoomSnapshot(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not create room.");
      }
    });

    socket.on("room:join", (payload = {}) => {
      try {
        leaveCurrentRoom(io, socket, true);

        const room = roomManager.joinRoom(
          payload.roomCode,
          socket.data.user,
          socket.id
        );

        socket.join(room.code);
        socket.data.roomCode = room.code;
        emitRoomSnapshot(io, room);
        emitPrivateRole(io, room, socket.data.user.id);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not join room.");
      }
    });

    socket.on("room:update-settings", (payload = {}) => {
      try {
        const room = roomManager.updateSettings(
          socket.data.roomCode,
          socket.data.user.id,
          payload.settings || {}
        );

        emitRoomSnapshot(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not update settings.");
      }
    });

    socket.on("room:kick", (payload = {}) => {
      try {
        const { room, targetSocketIds } = roomManager.kickPlayer(
          socket.data.roomCode,
          socket.data.user.id,
          payload.playerId
        );

        for (const socketId of targetSocketIds) {
          const targetSocket = io.sockets.sockets.get(socketId);
          targetSocket?.emit("room:kicked", { message: "You were removed from the room." });
          targetSocket?.leave(socket.data.roomCode);
          if (targetSocket?.data.roomCode === socket.data.roomCode) {
            targetSocket.data.roomCode = null;
          }
        }

        emitRoomSnapshot(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not kick player.");
      }
    });

    socket.on("game:start", () => {
      try {
        const room = roomManager.startGame(socket.data.roomCode, socket.data.user.id);

        emitRoomSnapshot(io, room);
        emitPrivateRoles(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not start game.");
      }
    });

    socket.on("draw:submit", (payload = {}) => {
      try {
        const { room, stroke, votingStarted } = roomManager.submitStroke(
          socket.data.roomCode,
          socket.data.user.id,
          payload.stroke
        );

        io.to(room.code).emit("draw:preview-clear", {
          playerId: socket.data.user.id,
        });
        io.to(room.code).emit("draw:stroke", stroke);
        if (votingStarted) {
          io.to(room.code).emit("vote:started", {
            votesCount: room.votes.size,
            eligibleVotes: roomManager.getRoomSnapshot(room).eligibleVotes,
          });
        }

        emitRoomSnapshot(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not submit drawing.");
      }
    });

    socket.on("draw:preview", (payload = {}) => {
      try {
        const stroke = roomManager.previewStroke(
          socket.data.roomCode,
          socket.data.user.id,
          payload.stroke
        );
        const room = roomManager.getRoom(socket.data.roomCode);

        if (!room) return;

        socket.to(room.code).emit("draw:preview", stroke);
      } catch {
        socket.emit("draw:preview-clear", {
          playerId: socket.data.user.id,
        });
      }
    });

    socket.on("draw:preview-clear", () => {
      const room = roomManager.getRoom(socket.data.roomCode);
      if (!room) return;

      socket.to(room.code).emit("draw:preview-clear", {
        playerId: socket.data.user.id,
      });
    });

    socket.on("chat:send", (payload = {}) => {
      try {
        const message = roomManager.sendChat(
          socket.data.roomCode,
          socket.data.user.id,
          payload.message
        );
        const room = roomManager.getRoom(socket.data.roomCode);

        io.to(room.code).emit("chat:new", message);
        emitRoomSnapshot(io, room);
      } catch (error) {
        emitRoomError(socket, error.message || "Could not send message.");
      }
    });

    socket.on("vote:submit", (payload = {}) => {
      try {
        const room = roomManager.submitVote(
          socket.data.roomCode,
          socket.data.user.id,
          payload.playerId
        );

        emitRoomSnapshot(io, room);
        if (room.phase === "results") {
          io.to(room.code).emit("game:results", room.result);
        }
      } catch (error) {
        emitRoomError(socket, error.message || "Could not submit vote.");
      }
    });

    socket.on("room:leave", () => {
      leaveCurrentRoom(io, socket, true);
      socket.emit("room:left");
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket, false);
    });
  });

  const cleanupTimer = setInterval(() => {
    roomManager.cleanupIdleRooms();
  }, 1000 * 60 * 15);
  cleanupTimer.unref?.();

  socketInstance = io;
  return io;
};

export { InitWs, socketInstance };
