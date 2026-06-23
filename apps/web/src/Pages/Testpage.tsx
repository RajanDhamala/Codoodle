
import { useState, useEffect } from "react";
import type { Socket } from "socket.io-client";
import { createSocket, socketBaseUrl } from "../Utils/socket";

const TestPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const connection = createSocket();
    setIsConnecting(true);
    setSocket(connection);

    return () => {
      connection.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      setIsConnecting(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-semibold">Test Page ⚡</h1>
      <p className="text-gray-500 mt-2">Use this page for experiments.</p>
      <p className="mt-2 text-xs text-gray-400">Socket URL: {socketBaseUrl}</p>
      {
        isConnected ? (
          <p className="text-green-500 mt-4">Connected to server</p>
        ) : isConnecting ? (
          <p className="text-yellow-500 mt-4">Connecting to server</p>
        ) : (
          <p className="text-red-500 mt-4">Disconnected from server</p>
        )
      }
    </div>
  );
};

export default TestPage;
