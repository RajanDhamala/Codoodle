import express from "express"
import { Server } from "socket.io";
import { InitWs } from "./Utils/InitWs.js"
import http from "http"
import cors from "cors"
import dotenv from "dotenv"
import GameRouter from "./Routes/GameRouter.js"
import UserRouter from "./Routes/UserRouter.js"
import cookieParser from "cookie-parser";
import { HandelOauthCallback } from "./Controllers/UserController.js"

dotenv.config()

const app = express()
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://192.168.18.26:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  console.log("Hello World")
  return res.json({ message: "Hello World" })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
})

app.use("/user", UserRouter)
app.use("/game", GameRouter)
app.get("/oauth/callback", HandelOauthCallback)

await InitWs(io)
try {
  server.listen(3000, () => {
    console.log("Server is running on port 3000")
  })
} catch (error) {
  console.error("Error starting server:", error)
}
