import { useEffect, useMemo, useState } from "react";
import { Play, X } from "lucide-react";

import { AvatarBadge } from "./GameAvatar";
import type React from "react";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import {
  defaultGameSettings,
  type GameSettings,
  type User,
} from "./GameTypes";
import toast from "react-hot-toast";
import useRoomStore from "@/Zustand/RoomStore";
import { useLocation, useNavigate } from "react-router-dom";
import { createSocket } from "../Utils/socket";
import { GuestProfileSetup } from "./GuestProfileSetup";
import type { GuestProfile } from "../Utils/guestProfile";

type LobbyLocationState = {
  openProfileSetup?: boolean;
  returnTo?: string;
};

const LobbyPage = () => {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance);
  const clearSocketInstance = useSocketStore((state) => state.clearSocketInstance);
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);
  const { setRoomId } = useRoomStore()
  const navigate = useNavigate()
  const location = useLocation()
  const profileSetupState = location.state as LobbyLocationState | null;

  // const [gorupId, setGroupId] = useState<string | null>(null);
  // const [members, setMember] = useState([])

  const activeUser = useMemo<User | null>(() => {
    if (currentUser) return currentUser;
    if (!guestProfile) return null;

    return {
      id: guestProfile.id,
      username: guestProfile.username,
      avatar: guestProfile.avatar,
    };
  }, [currentUser, guestProfile]);

  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<GameSettings>(defaultGameSettings);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(
    () => !guestProfile || Boolean(profileSetupState?.openProfileSetup)
  );
  const [profileRedirect, setProfileRedirect] = useState<string | null>(
    () => profileSetupState?.returnTo ?? null
  );


  const CreateRoom = () => {
    if (!activeUser) {
      setProfileRedirect(null);
      setIsProfileModalOpen(true);
      return;
    }

    socketInstance?.emit("create-group", { settings: settingsDraft, currentUser: activeUser });
  }

  const resetProfile = () => {
    if (room) {
      toast.error("Leave the room before changing player.");
      return;
    }
    socketInstance?.disconnect();
    clearSocketInstance(socketInstance);
    clearGuestProfile();
    clearCurrentUser();
    setProfileRedirect(null);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileRedirect(null);

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    setIsProfileModalOpen(false);

    const redirect = profileRedirect;
    setProfileRedirect(null);

    if (redirect) {
      navigate(redirect, { replace: true });
      return;
    }

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  const joinRoomFromLobby = () => {
    const roomCode = joinCode.trim();
    if (!roomCode) {
      toast.error("Paste a room code.");
      return;
    }

    if (!activeUser) {
      setProfileRedirect(`/gameRoom/${roomCode}`);
      setIsProfileModalOpen(true);
      return;
    }

    navigate(`/gameRoom/${roomCode}`);
  };

  const SettingsControls = ({
    settings,
    setSettings,
    disabled,
  }: {
    settings: GameSettings;
    setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
    disabled: boolean;
  }) => (
    <div className="mt-4 space-y-4">
      <label className="block">
        <span className="text-sm text-zinc-400">Max players</span>
        <input
          type="number"
          min={3}
          max={10}
          value={settings.maxPlayers}
          disabled={disabled}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              maxPlayers: Number(event.target.value),
            }))
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4 disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-400">Turn cycles before voting</span>
        <input
          type="number"
          min={1}
          max={5}
          value={settings.turnCyclesBeforeVote}
          disabled={disabled}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              turnCyclesBeforeVote: Number(event.target.value),
            }))
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none ring-sky-400/40 transition focus:ring-4 disabled:opacity-50"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
        <span>Allow draft undo</span>
        <input
          type="checkbox"
          checked={settings.allowUndo}
          disabled={disabled}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              allowUndo: event.target.checked,
            }))
          }
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
        <span>Allow kick in lobby</span>
        <input
          type="checkbox"
          checked={settings.allowKick}
          disabled={disabled}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              allowKick: event.target.checked,
            }))
          }
        />
      </label>
    </div>
  );

  useEffect(() => {
    if (!guestProfile) {
      setIsProfileModalOpen(true);
    }
  }, [guestProfile]);

  useEffect(() => {
    if (!profileSetupState?.openProfileSetup) return;

    setIsProfileModalOpen(true);
    setProfileRedirect(profileSetupState.returnTo ?? null);
  }, [profileSetupState?.openProfileSetup, profileSetupState?.returnTo]);

  useEffect(() => {
    if (!socketInstance) {
      const io = createSocket()
      setSocketInstance(io)
      return
    };
    socketInstance.on("group-created", (data) => {
      console.log("Room created:", data);
      setRoomId(data.trimmed);
      setRoom(data.trimmed)
      console.log("current user:", currentUser)
      toast.success("Room created successfully!");
      navigate(`/gameRoom/${data.trimmed}`);
    })

    return () => {
      socketInstance.off("group-created")
    }
  }, [currentUser, navigate, setRoomId, setSocketInstance, socketInstance])

  const InfoTile = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 font-semibold text-zinc-100">{value}</p>
    </div>
  );

  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-50">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
          <section className="grid w-full gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-300">
                Drawing imposter
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Draw one stroke, hide the clue, catch the imposter.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                Create a private room, share the code, and play a fast turn-based canvas game.
                Artists see the exact word. The imposter only sees the category.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <InfoTile label="Mode" value="Live rooms" />
                <InfoTile label="Turns" value="One action" />
                <InfoTile label="Server" value={"concnceted"} />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarBadge
                    avatar={guestProfile?.avatar}
                    name={guestProfile?.username}
                    className="h-12 w-12"
                  />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Playing as
                    </p>
                    <p className="truncate font-semibold text-zinc-100">
                      {guestProfile?.username || "Set up player"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetProfile}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  {guestProfile ? "Change player" : "Set up player"}
                </button>
              </div>
            </div>

            <div className="space-y-5">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400 text-zinc-950">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Create room</h2>
                  <p className="text-sm text-zinc-400">You become the host.</p>
                </div>
              </div>
              <SettingsControls
                settings={settingsDraft}
                setSettings={setSettingsDraft}
                disabled={false}
              />
              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300"
                onClick={CreateRoom}
              >
                Create game room
              </button>
              <h2 className="font-semibold">Join room</h2>
              <p className="mt-1 text-sm text-zinc-400">Paste a room code from the host.</p>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="ABC123"
                className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] outline-none ring-sky-400/40 transition focus:ring-4"
                maxLength={6}
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                onClick={joinRoomFromLobby}
              >
                Join room
              </button>
            </div>
          </section>
        </div>
      </main>

      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-3 py-4 backdrop-blur-sm sm:px-6"
          onClick={closeProfileModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Player setup"
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProfileModal}
              className="absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/95 text-zinc-200 shadow-lg shadow-black/30 transition hover:bg-white/10 sm:-right-3 sm:-top-3"
              aria-label="Close player setup"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl">
              <GuestProfileSetup onSave={saveProfile} variant="modal" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LobbyPage
