import type { AvatarConfig } from "./guestProfile";

// Display palettes are separate from the stable option IDs used by the codec.
const skinColors: Record<string, string> = {
  "#38bdf8": "#e8b995", "#5eead4": "#ce956c", "#bef264": "#af7653",
  "#fbbf24": "#895539", "#fb7185": "#f0c4b1", "#a78bfa": "#603d30", "#f8fafc": "#f5dbc6",
};
const backgrounds: Record<string, string> = {
  "#312e81": "#d9d5eb", "#0f766e": "#c8dfd4", "#1d4ed8": "#ccdfed",
  "#7f1d1d": "#ebced0", "#7c2d12": "#f0dcba", "#365314": "#dbe2bd",
};
const hairColors: Record<string, string> = {
  "#111827": "#2c2728", "#7c2d12": "#674334", "#f59e0b": "#bd8b49",
  "#be123c": "#a1533d", "#4338ca": "#686082", "#f8fafc": "#d9d5ce",
};
export const avatarDisplayColor = (key: keyof AvatarConfig, value: string) => {
  if (key === "bodyColor") return skinColors[value] ?? skinColors["#38bdf8"];
  if (key === "background") return backgrounds[value] ?? backgrounds["#312e81"];
  if (key === "hairColor") return hairColors[value] ?? hairColors["#111827"];
  return value;
};
