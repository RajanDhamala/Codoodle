import { create } from "zustand";
import {
  clearGuestProfile,
  loadGuestProfile,
  saveGuestProfile,
  type GuestProfile,
} from "./Utils/guestProfile";
import type { User } from "./Pages/GameTypes";

type CurrentUser = User & {
  avatarCode?: string;
};

type ProfileWithAvatarCode = GuestProfile & {
  avatarCode?: string;
};

interface UserStore {
  guestProfile: GuestProfile | null;
  currentUser: CurrentUser | null;
  setGuestProfile: (profile: ProfileWithAvatarCode) => void;
  clearGuestProfile: () => void;
  setCurrentUser: (user: CurrentUser) => void;
  clearCurrentUser: () => void;
}

const profileToUser = (profile: ProfileWithAvatarCode): CurrentUser => ({
  id: profile.id,
  username: profile.username,
  avatar: profile.avatar,
  ...(profile.avatarCode ? { avatarCode: profile.avatarCode } : {}),
});

const stripAvatarCode = (profile: ProfileWithAvatarCode): GuestProfile => ({
  schemaVersion: profile.schemaVersion,
  id: profile.id,
  username: profile.username,
  avatar: profile.avatar,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

const initialGuestProfile = loadGuestProfile();

const useUserStore = create<UserStore>((set) => ({
  guestProfile: initialGuestProfile,
  currentUser: initialGuestProfile ? profileToUser(initialGuestProfile) : null,
  setGuestProfile: (profile) => {
    const guestProfile = stripAvatarCode(profile);
    saveGuestProfile(guestProfile);
    set({ guestProfile, currentUser: profileToUser(profile) });
  },
  clearGuestProfile: () => {
    clearGuestProfile();
    set({ guestProfile: null, currentUser: null });
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
}));

export default useUserStore;
