import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import cookie from "cookie";
let socketInstance;

const ActiveUser = new Map();
const Rooms = new Map();
const GameState = new Map()
const ActiveStrokes = new Map();

const InitWs = async (io) => {
  io.use((socket, next) => {
    const data = cookie.parse(socket.handshake.headers.cookie || "");
    const token = data.info;
    console.log("token:", token);
    try {
      const decoded = jwt.verify(token, process.env.INFO_SECRET);
      ActiveUser.set(socket.id, {
        id: decoded.id,
        username: decoded.username,
        avatar: decoded.avatar
      });
      console.log("avtar code:", decoded.avatar)
    } catch (err) {
      console.error("Socket handshake error:", err);
      return next(new Error("Unauthorized"));
    }
    return next();
  });

  const getGroupMembers = (roomId) => {
    const socketIds = io.sockets.adapter.rooms.get(roomId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map((id) => ActiveUser.get(id))
      .filter(Boolean);
  };

  io.on("connection", (socket) => {
    const userdata = ActiveUser.get(socket.id);
    console.log("user connected", userdata);
    socket.emit("connected", { data: userdata });

    socket.on("send-stroke", (data) => {
      const obj = {
        sendername: userdata.username,
        id: userdata.id,
        data: data,
      };
      console.log("event recived boradcasting", obj);
      socket.broadcast.emit("recieve-stroke", obj);
    });

    socket.on("create-group", (data) => {
      const roomId = uuidv4();
      const trimmed = roomId
      socket.join(trimmed);
      const settings = data.settings;
      console.log("setings:", settings);
      Rooms.set(trimmed, {
        settings,
        cretedAt: Date.now(),
        owner: data.currentUser,
      });
      socket.emit("group-created", { trimmed });
      GameState.set(trimmed, []);
      const stroke = {
        kind: null,
        initial: {},
        intermediate: [],
        final: {},
        color: "black",
        width: 5,
        id: null,
      };
      GameState.get(trimmed).push(stroke);
    });

    socket.on("join-group", (data) => {
      console.log("Data:", data);
      const roomId = data.id;
      const isRoom = Rooms.get(data.id)
      // if (!isRoom) {
      //   console.log("room not found")
      //   return
      // }
      socket.join(roomId);
      const gameData = GameState.get(roomId)
      if (gameData) {
        console.log("game data:", gameData)
        socket.emit("group-joined", {
          roomId,
          members: getGroupMembers(roomId),
          settings: Rooms.get(data.id),
          gameState: gameData,
          owner: gameData.owner
        });
        socket.to(roomId).emit("new-user-joined", {
          user: ActiveUser.get(socket.id),
        });
      }
    });

    socket.on("send-group-message", (data) => {
      console.log("group msg recived:", data);
      socket.to(data.id).emit("recive-group-message", {
        user: ActiveUser.get(socket.id),
        message: data.message,
      });
    });

    socket.on("start-stream", (data) => {
      console.log("stroke postion streaming started", data)
      const stroke = {
        id: data.uuid,
        kind: data.data.kind,
        initial: data.data.inital,
        intermediate: [],
        final: null,
        color: data.data.color,
        width: data.data.width,
      }
      ActiveStrokes.set(data.roomId, stroke)
      socket.to(data.roomId).emit("recieve-start-stream", { userId: userdata.id, username: userdata.username, data })
    })

    socket.on("send-stream", (data) => {
      console.log("stroke intermediate positions streaming", data)
      const activeStroke = ActiveStrokes.get(data.roomId)
      if (!activeStroke) return;
      activeStroke.intermediate.push(...data.data)
      socket.to(data.roomId).emit("recieve-send-stream", { userId: userdata.id, username: userdata.username, data })
    })

    socket.on("end-stream", (data) => {
      console.log("stoke positions streaming ended", data)

      const activeStroke = ActiveStrokes.get(data.roomId)
      if (!activeStroke) return
      activeStroke.final = data.data
      const exists = GameState.get(data.roomId)
      if (!exists) {
        GameState.set(data.roomId, [])
      }
      GameState.get(data.roomId).push(activeStroke);
      ActiveStrokes.delete(data.roomId);
      socket.to(data.roomId).emit("recieve-end-stream", { userId: userdata.id, username: userdata.username, data })
    })

    socket.on("disconnect", () => {
      console.log("user disconnected");
      ActiveUser.delete(socket.id);
    });
  });


  socketInstance = io;
  return io;
};

export { InitWs, socketInstance };
