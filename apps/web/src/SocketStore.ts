import type { Socket } from "socket.io-client";
import { create } from "zustand";

type SocketStore = {
  socketInstance: Socket | null;
  setSocketInstance: (socketInstance: Socket | null) => void;
  clearSocketInstance: (socketInstance?: Socket | null) => void;
};

const useSocketStore = create<SocketStore>((set, get) => ({
  socketInstance: null,
  setSocketInstance: (socketInstance) => set({ socketInstance }),
  clearSocketInstance: (socketInstance) => {
    if (!socketInstance || get().socketInstance === socketInstance) {
      set({ socketInstance: null });
    }
  },
}));

export default useSocketStore;
