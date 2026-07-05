import { Suspense, type ReactNode, useEffect } from "react";
import "./index.css";
import { LazyTestPage, LazyLobbyPage, GameRoomPage } from "./LazyLoading/LazyLoading";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import { Toaster } from "react-hot-toast";
import useUserStore from "./UserStore.tsx";
import api from "./Utils/AxiosWrapper.ts";
import { sanitizeAvatarConfig, type GuestProfile } from "./Utils/guestProfile.ts";
import CanvasPage from "./Pages/CanvasPage.tsx"

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

  return guestProfile ? (
    children
  ) : (
    <Navigate
      to="/lobby"
      replace
      state={{ openProfileSetup: true, returnTo: location.pathname }}
    />
  );
};

function App() {
  const guestProfileId = useUserStore((state) => state.guestProfile?.id);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);

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
      } catch {
        return;
      }
    };

    void syncCurrentUser();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [guestProfileId, setGuestProfile]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<LazyLobbyPage />} />
            <Route path="/test" element={<LazyTestPage />} />
            <Route path="/lobby" element={<LazyLobbyPage />} />

            <Route
              path="/gameRoom/:id"
              element={
                <RequireGameRoomProfile>
                  <GameRoomPage />
                </RequireGameRoomProfile>
              }
            />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="*" element={<div className="p-10 text-center text-red-500 font-bold">404 | Page Not Found</div>} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
