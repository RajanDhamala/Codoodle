import { create } from 'zustand';
import type { GameSettings } from "../Pages/GameTypes";

type RoomSettings = (Partial<GameSettings> & {
  owner?: unknown;
  turnDurationSeconds?: number;
  maxStrokesPerTurn?: number;
}) | null;

type RoomStore = {
  RoomId: string | null;
  Settings: RoomSettings;
  setRoomId: (roomId: string | null) => void;
  setSettings: (settings?: RoomSettings) => void;
  clearRoom: () => void;
};

const useRoomStore = create<RoomStore>((set) => ({
  RoomId: null,
  Settings: null,
  setRoomId: (id) => set({ RoomId: id }),
  setSettings: (settings = null) => set({ Settings: settings }),
  clearRoom: () => set({ RoomId: null, Settings: null }),
}));

export default useRoomStore;
