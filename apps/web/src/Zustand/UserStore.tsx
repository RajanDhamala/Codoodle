
import { create } from 'zustand'

type UserStore = {
  CurrentUser: unknown;
  setCurrentUser: (user: unknown) => void;
  clearCurrentUser: () => void;
};

const useUserStore = create<UserStore>((set) => ({
  CurrentUser: null,
  setCurrentUser: (user) => set({ CurrentUser: user }),
  clearCurrentUser: () => set({ CurrentUser: null }),
}))

export default useUserStore
