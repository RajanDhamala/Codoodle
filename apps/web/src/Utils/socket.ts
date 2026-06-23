import { io } from "socket.io-client";

const socketBaseUrl = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`
).replace(/\/$/, "");

const createSocket = () => {
  return io(socketBaseUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3,
  });
};

export { createSocket, socketBaseUrl };
