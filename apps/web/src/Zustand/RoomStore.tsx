import { create } from 'zustand';

type RoomStore = {
  RoomId: string | null;
  Settings: any;
  setRoomId: (roomId: string | null) => void;
  setSettings: (settings: any) => void;
  clearRoom: () => void;
};

const useRoomStore = create<RoomStore>((set) => ({
  RoomId: null,
  Settings: null,
  setRoomId: (id) => set({ RoomId: id }),
  setSettings: (settings) => set({ Settings: settings }),
  clearRoom: () => set({ RoomId: null, Settings: null }),
}));

export default useRoomStore;
