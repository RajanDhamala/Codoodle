import { io } from "socket.io-client";
import { apiBaseUrl } from "./env";

const socketBaseUrl = apiBaseUrl;

const createSocket = () => {
  return io(socketBaseUrl, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3,
  });
};

export { createSocket, socketBaseUrl };
