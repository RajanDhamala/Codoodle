import { create } from "zustand";
import {
  clearGuestProfile,
  loadGuestProfile,
  saveGuestProfile,
  type GuestProfile,
} from "./Utils/guestProfile";
import type { User } from "./Pages/GameTypes";

type UserAuthStatus = "bootstrapping" | "authenticated" | "guest" | "anonymous";

interface UserStore {
  guestProfile: GuestProfile | null;
  currentUser: User | null;
  authStatus: UserAuthStatus;
  hasBootstrappedUser: boolean;
  beginUserBootstrap: () => void;
  completeUserBootstrap: (profile: GuestProfile | null) => void;
  setGuestProfile: (profile: GuestProfile) => void;
  clearGuestProfile: () => void;
  setCurrentUser: (user: User) => void;
  clearCurrentUser: () => void;
}

const profileToUser = (profile: GuestProfile): User => ({
  id: profile.id,
  username: profile.username,
  avatar: profile.avatar,
});

const useUserStore = create<UserStore>((set) => ({
  guestProfile: loadGuestProfile(),
  currentUser: null,
  authStatus: "bootstrapping",
  hasBootstrappedUser: false,
  beginUserBootstrap: () => {
    set({ authStatus: "bootstrapping", hasBootstrappedUser: false });
  },
  completeUserBootstrap: (profile) => {
    if (profile) {
      saveGuestProfile(profile);
      set({
        guestProfile: profile,
        currentUser: profileToUser(profile),
        authStatus: "authenticated",
        hasBootstrappedUser: true,
      });
      return;
    }

    set((state) => ({
      currentUser: null,
      authStatus: state.guestProfile ? "guest" : "anonymous",
      hasBootstrappedUser: true,
    }));
  },
  setGuestProfile: (profile) => {
    saveGuestProfile(profile);
    set({ guestProfile: profile, authStatus: "guest" });
  },
  clearGuestProfile: () => {
    clearGuestProfile();
    set({ guestProfile: null, currentUser: null, authStatus: "anonymous" });
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
}));

export default useUserStore;
