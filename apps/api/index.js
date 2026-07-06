import express from "express"
import { Server } from "socket.io";
import { InitWs } from "./Utils/InitWs.js"
import http from "http"
import cors from "cors"
import dotenv from "dotenv"
import UserRouter from "./Routes/UserRouter.js"
import cookieParser from "cookie-parser";
import { getAllowedOrigins, getOptionalEnv, getOptionalIntEnv, getRequiredIntEnv } from "./Utils/env.js"

dotenv.config()

const app = express()
const allowedOrigins = getAllowedOrigins();
const port = getRequiredIntEnv("PORT");
const httpJsonLimit = getOptionalEnv("HTTP_JSON_LIMIT", "32kb");
const socketMaxPayloadBytes = getOptionalIntEnv("WS_MAX_PAYLOAD_BYTES", 20000);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

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

app.use(express.json({ limit: httpJsonLimit }))
app.use(cookieParser())

app.get("/", (req, res) => {
  console.log("Hello World")
  return res.json({ message: "Hello World" })
})

const server = http.createServer(app)
const io = new Server(server, {
  maxHttpBufferSize: socketMaxPayloadBytes,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
})

app.use("/user", UserRouter)

await InitWs(io)
try {
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
} catch (error) {
  console.error("Error starting server:", error)
}
