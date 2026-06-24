import jwt from "jsonwebtoken";
import cookie from "cookie";
let socketInstance;


const ActiveUser = new Map()

const InitWs = async (io) => {
  io.use((socket, next) => {
    const data = cookie.parse(socket.handshake.headers.cookie || "");
    const token = data.info
    try {
      const decoded = jwt.verify(token, process.env.INFO_SECRET);
      ActiveUser.set(socket.id, {
        id: decoded.id,
        username: decoded.username,
      });
    } catch (err) {
      console.error("Socket handshake error:", err);
      return next(new Error("Unauthorized"));
    }
    return next();
  });

  io.on("connection", (socket) => {
    const userdata = ActiveUser.get(socket.id)
    console.log("user connected", userdata)
    socket.on("disconnect", () => {
      console.log("user disconnected")
      ActiveUser.delete(socket.id)
    });
  });

  socketInstance = io;
  return io;
};

export { InitWs, socketInstance };
