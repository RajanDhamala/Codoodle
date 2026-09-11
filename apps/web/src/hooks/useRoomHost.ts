import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import useRoomStore from "../Zustand/RoomStore";
import { createSocket } from "../Utils/socket";
import { defaultGameSettings, type GameSettings, type User } from "../Pages/GameTypes";

type CreateRoomResponse = { success?: boolean; roomId?: string; message?: string };

export function useRoomHost() {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance);
  const clearSocketInstance = useSocketStore((state) => state.clearSocketInstance);
  const setRoomId = useRoomStore((state) => state.setRoomId);
  const navigate = useNavigate();
  const creating = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const activeUser = useMemo<User | null>(() => {
    if (currentUser) return currentUser;
    if (!guestProfile) return null;

    return {
      id: guestProfile.id,
      username: guestProfile.username,
      avatar: guestProfile.avatar,
    };
  }, [currentUser, guestProfile]);

  const [settingsDraft, setSettingsDraft] =
    useState<GameSettings>(defaultGameSettings);
  const [isSocketReady, setIsSocketReady] = useState(() =>
    Boolean(socketInstance?.connected),
  );

  const createRoom = (onProfileRequired: () => void) => {
    if (creating.current) return;

    if (!activeUser) {
      onProfileRequired();
      return;
    }

    if (!socketInstance?.connected) {
      toast.error("Still connecting to the game server.");
      return;
    }

    creating.current = true;
    setIsCreating(true);
    socketInstance.timeout(10000).emit(
      "create-group",
      { settings: settingsDraft, currentUser: activeUser },
      (error: Error | null, data?: CreateRoomResponse) => {
        creating.current = false;
        setIsCreating(false);
        if (error || !data?.success || !data.roomId) {
          toast.error(data?.message || "Failed to create room.");
          return;
        }

        setRoomId(data.roomId);
        toast.success("Room created.");
        navigate(`/gameRoom/${data.roomId}`);
      },
    );
  };

  useEffect(() => {
    if (!activeUser) {
      setIsSocketReady(false);
      if (socketInstance) {
        socketInstance.disconnect();
        clearSocketInstance(socketInstance);
      }
      return;
    }

    if (!socketInstance) {
      setIsSocketReady(false);
      setSocketInstance(createSocket());
      return;
    }

    setIsSocketReady(socketInstance.connected);

    const handleConnect = () => setIsSocketReady(true);
    const handleDisconnect = () => setIsSocketReady(false);
    const handleConnectError = (error: Error) => {
      setIsSocketReady(false);
      if (error.message !== "Unauthorized") return;

      socketInstance.disconnect();
      clearSocketInstance(socketInstance);
      clearGuestProfile();
      toast.error("Your player session expired. Set up your player again.", {
        id: "player-session-expired",
      });
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("connect_error", handleConnectError);
    };
  }, [
    activeUser,
    clearGuestProfile,
    clearSocketInstance,
    setSocketInstance,
    socketInstance,
  ]);

  return { activeUser, settingsDraft, setSettingsDraft, isSocketReady, isCreating, createRoom };
}
