import { Suspense, type ReactNode, useEffect } from "react";
import "./index.css";
import { LazyLobbyPage, GameRoomPage, LazyPageNotFound, LazyNewPage } from "./LazyLoading/LazyLoading";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import toast, { Toaster } from "react-hot-toast";
import useUserStore from "./UserStore.tsx";
import useSocketStore from "./SocketStore.ts";
import api from "./Utils/AxiosWrapper.ts";
import { sanitizeAvatarConfig, type GuestProfile } from "./Utils/guestProfile.ts";

type ServerUser = {
  id?: string | number;
  userId?: string | number;
  username?: string;
  name?: string;
  avatar?: unknown;
};

type CurrentUserProfile = GuestProfile & {
  avatarCode?: string;
};

type MeResponse = ServerUser & {
  user?: ServerUser;
  data?: ServerUser;
};

type ApiError = {
  status?: number;
};

const getAvatarCode = (avatar: unknown) => {
  if (typeof avatar !== "string") return undefined;
  const avatarCode = avatar.trim();
  return avatarCode.length > 0 ? avatarCode : undefined;
};

const normalizeServerUser = (
  payload: MeResponse,
  existingProfile: GuestProfile
): CurrentUserProfile | null => {
  const user = payload.user || payload.data || payload;
  const id = user.userId ?? user.id;
  const username = (user.username || user.name || "").trim();
  const avatarCode = getAvatarCode(user.avatar);

  if (!id || !username) return null;

  const now = new Date().toISOString();

  return {
    schemaVersion: 2,
    id: String(id),
    username,
    avatar: sanitizeAvatarConfig(user.avatar),
    ...(avatarCode ? { avatarCode } : {}),
    createdAt: existingProfile?.id === String(id) ? existingProfile.createdAt : now,
    updatedAt: now,
  };
};

const RequireGameRoomProfile = ({ children }: { children: ReactNode }) => {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return guestProfile ? (
    children
  ) : (
    <Navigate
      to="/lobby"
      replace
      state={{ openProfileSetup: true, returnTo }}
    />
  );
};

function App() {
  const guestProfileId = useUserStore((state) => state.guestProfile?.id);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);

  useEffect(() => {
    if (!guestProfileId) return;

    const controller = new AbortController();
    let isActive = true;

    const syncCurrentUser = async () => {
      try {
        const existingProfile = useUserStore.getState().guestProfile;
        if (!existingProfile) return;

        const payload = (await api.get("/user/me", {
          signal: controller.signal,
        })) as unknown as MeResponse;

        if (!isActive) return;
        const profile = normalizeServerUser(payload, existingProfile);
        if (profile) setGuestProfile(profile);
      } catch (error) {
        if (!isActive || (error as ApiError)?.status !== 401) return;

        const { socketInstance, clearSocketInstance } =
          useSocketStore.getState();
        socketInstance?.disconnect();
        clearSocketInstance(socketInstance);
        clearGuestProfile();
        toast.error("Your player session expired. Set up your player again.", {
          id: "player-session-expired",
        });
      }
    };

    void syncCurrentUser();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [clearGuestProfile, guestProfileId, setGuestProfile]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<LazyLobbyPage />} />
            <Route path="/lobby" element={<LazyLobbyPage />} />

            <Route path="/new" element={<LazyNewPage />} />

            <Route
              path="/gameRoom/:id"
              element={
                <RequireGameRoomProfile>
                  <GameRoomPage />
                </RequireGameRoomProfile>
              }
            />
            <Route path="*" element={<LazyPageNotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
