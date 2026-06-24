import type { AvatarConfig } from "../Utils/guestProfile";

export type GamePhase = "lobby" | "drawing" | "voting" | "results";
export type StrokeKind = "path" | "eraser" | "line" | "rect" | "circle";

export type Point = {
  x: number;
  y: number;
};

export type User = {
  id: string;
  username: string;
  avatar: AvatarConfig;
};

export type Player = {
  id: string;
  username: string;
  avatar: AvatarConfig;
  connected: boolean;
  isHost: boolean;
};

export type GameSettings = {
  maxPlayers: number;
  turnCyclesBeforeVote: number;
  allowUndo: boolean;
  allowKick: boolean;
};

export type Stroke = {
  id?: string;
  kind: StrokeKind;
  color: string;
  size: number;
  points?: Point[];
  start?: Point;
  end?: Point;
  playerId?: string;
  playerName?: string;
  turnNumber?: number;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  message: string;
  createdAt: string;
};

export type GameResult = {
  word: string;
  category: string;
  imposterId: string;
  imposterName: string;
  selectedTargetId: string | null;
  selectedTargetName: string | null;
  artistsWin: boolean;
  voteCounts: Array<{
    playerId: string;
    playerName: string;
    votes: number;
  }>;
};

export type RoomSnapshot = {
  code: string;
  hostId: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  connectedPlayerCount: number;
  turnOrder: string[];
  currentPlayerId: string | null;
  submittedTurns: number;
  totalTurnsBeforeVote: number;
  strokes: Stroke[];
  chat: ChatMessage[];
  activity: Activity[];
  votesCount: number;
  eligibleVotes: number;
  votedPlayerIds: string[];
  result: GameResult | null;
};

export type RoleInfo =
  | {
      role: "artist";
      word: string;
      category: string;
    }
  | {
      role: "imposter";
      category: string;
    };
