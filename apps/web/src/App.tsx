import { Suspense, useEffect } from "react";
import "./index.css";
import { LazyGamePage, LazyTestPage } from "./LazyLoading/LazyLoading";
import { BrowserRouter as Router, Routes, Route, } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import { Toaster } from "react-hot-toast";
import useUserStore from "./UserStore.tsx";
import api from "./Utils/AxiosWrapper.ts";
import { sanitizeAvatarConfig, type GuestProfile } from "./Utils/guestProfile.ts";

type ServerUser = {
  id?: string | number;
  userId?: string | number;
  username?: string;
  name?: string;
  avatar?: unknown;
};

type MeResponse = ServerUser & {
  user?: ServerUser;
  data?: ServerUser;
};

const normalizeServerUser = (payload: MeResponse): GuestProfile | null => {
  const user = payload.user || payload.data || payload;
  const id = user.userId ?? user.id;
  const username = (user.username || user.name || "").trim();

  if (!id || !username) return null;

  const existingProfile = useUserStore.getState().guestProfile;
  const now = new Date().toISOString();

  return {
    schemaVersion: 2,
    id: String(id),
    username,
    avatar: sanitizeAvatarConfig(user.avatar),
    createdAt: existingProfile?.id === String(id) ? existingProfile.createdAt : now,
    updatedAt: now,
  };
};

function App() {
  const beginUserBootstrap = useUserStore((state) => state.beginUserBootstrap);
  const completeUserBootstrap = useUserStore((state) => state.completeUserBootstrap);
  const hasBootstrappedUser = useUserStore((state) => state.hasBootstrappedUser);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    beginUserBootstrap();

    const bootstrapUser = async () => {
      try {
        const payload = (await api.get("/user/me", {
          signal: controller.signal,
        })) as unknown as MeResponse;

        if (!isActive) return;

        completeUserBootstrap(normalizeServerUser(payload));
      } catch {
        if (!isActive || controller.signal.aborted) return;
        completeUserBootstrap(null);
      }
    };

    void bootstrapUser();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [beginUserBootstrap, completeUserBootstrap]);

  if (!hasBootstrappedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<LazyGamePage />} />
            <Route path="/game" element={<LazyGamePage />} />
            <Route path="/test" element={<LazyTestPage />} />

            <Route path="*" element={<div className="p-10 text-center text-red-500 font-bold">404 | Page Not Found</div>} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
