import { io } from "socket.io-client";
import { apiBaseUrl } from "./env";

const isRelativeApiBaseUrl = apiBaseUrl.startsWith("/");
const socketBaseUrl = isRelativeApiBaseUrl && typeof window !== "undefined"
  ? window.location.origin
  : apiBaseUrl;

const createSocket = () => {
  return io(socketBaseUrl, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnectionAttempts: 3,
  });
};

export { createSocket, socketBaseUrl };
