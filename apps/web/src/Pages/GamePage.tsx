import { useEffect, useState } from "react";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import type { GuestProfile } from "../Utils/guestProfile";
import { createSocket } from "../Utils/socket";
import { GameSessionView } from "./GameSessionView";
import { GuestProfileSetup } from "./GuestProfileSetup";
import type { ConnectionStatus, User } from "./GameTypes";

const GamePage = () => {
  const { guestProfile, setGuestProfile, clearCurrentUser, setCurrentUser } = useUserStore();
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance);
  const clearSocketInstance = useSocketStore((state) => state.clearSocketInstance);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
    guestProfile ? "connecting" : "setup"
  );
  const [connectionError, setConnectionError] = useState("");

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    setConnectionStatus("connecting");
    setConnectionError("");
  };

  useEffect(() => {
    if (!guestProfile) {
      clearSocketInstance();
      clearCurrentUser();
      setConnectionStatus("setup");
      setConnectionError("");
      return;
    }

    setConnectionStatus("connecting");
    setConnectionError("");

    const nextSocket = createSocket();
    setSocketInstance(nextSocket);

    nextSocket.on("connect", () => {
      setConnectionStatus("connected");
      setConnectionError("");
    });

    nextSocket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    nextSocket.on("connect_error", (error) => {
      setConnectionStatus("error");
      setConnectionError(error.message || "Could not connect to the game server.");
    });

    nextSocket.on("session:ready", ({ user }: { user: User }) => {
      setCurrentUser(user);
    });

    return () => {
      nextSocket.disconnect();
      clearSocketInstance(nextSocket);
    };
  }, [clearCurrentUser, clearSocketInstance, guestProfile, setCurrentUser, setSocketInstance]);

  if (!guestProfile) {
    return <GuestProfileSetup onSave={saveProfile} />;
  }

  return (
    <GameSessionView
      connectionStatus={connectionStatus}
      connectionError={connectionError}
    />
  );
};

export default GamePage;
