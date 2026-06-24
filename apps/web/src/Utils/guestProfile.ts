const GUEST_PROFILE_STORAGE_KEY = "drawing-imposter:guest-profile:v2";
const GUEST_PROFILE_SCHEMA_VERSION = 2;

type AvatarConfig = {
  background: string;
  pattern: "none" | "stripes" | "dots";
  bodyColor: string;
  hairStyle: "none" | "short" | "spiky" | "curly" | "cap";
  hairColor: string;
  eyeStyle: "happy" | "wide" | "sleepy" | "wink";
  mouthStyle: "smile" | "flat" | "open" | "smirk";
  accessory: "none" | "glasses" | "mask";
};

type GuestProfile = {
  schemaVersion: 2;
  id: string;
  username: string;
  avatar: AvatarConfig;
  createdAt: string;
  updatedAt: string;
};

type AvatarChoice<T extends string = string> = {
  id: T;
  label: string;
};

const avatarBackgroundOptions = [
  { id: "#312e81", label: "Night" },
  { id: "#0f766e", label: "Mint" },
  { id: "#1d4ed8", label: "Blue" },
  { id: "#7f1d1d", label: "Rose" },
  { id: "#7c2d12", label: "Amber" },
  { id: "#365314", label: "Lime" },
];

const avatarBodyColorOptions = [
  { id: "#38bdf8", label: "Sky" },
  { id: "#5eead4", label: "Mint" },
  { id: "#bef264", label: "Lime" },
  { id: "#fbbf24", label: "Amber" },
  { id: "#fb7185", label: "Rose" },
  { id: "#a78bfa", label: "Violet" },
  { id: "#f8fafc", label: "Paper" },
];

const avatarHairColorOptions = [
  { id: "#111827", label: "Ink" },
  { id: "#7c2d12", label: "Brown" },
  { id: "#f59e0b", label: "Gold" },
  { id: "#be123c", label: "Red" },
  { id: "#4338ca", label: "Indigo" },
  { id: "#f8fafc", label: "White" },
];

const avatarHairStyleOptions: AvatarChoice<AvatarConfig["hairStyle"]>[] = [
  { id: "none", label: "None" },
  { id: "short", label: "Short" },
  { id: "spiky", label: "Spiky" },
  { id: "curly", label: "Curly" },
  { id: "cap", label: "Cap" },
];

const avatarEyeOptions: AvatarChoice<AvatarConfig["eyeStyle"]>[] = [
  { id: "happy", label: "Happy" },
  { id: "wide", label: "Wide" },
  { id: "sleepy", label: "Sleepy" },
  { id: "wink", label: "Wink" },
];

const avatarMouthOptions: AvatarChoice<AvatarConfig["mouthStyle"]>[] = [
  { id: "smile", label: "Smile" },
  { id: "flat", label: "Flat" },
  { id: "open", label: "Open" },
  { id: "smirk", label: "Smirk" },
];

const avatarAccessoryOptions: AvatarChoice<AvatarConfig["accessory"]>[] = [
  { id: "none", label: "None" },
  { id: "glasses", label: "Glasses" },
  { id: "mask", label: "Mask" },
];

const avatarPatternOptions: AvatarChoice<AvatarConfig["pattern"]>[] = [
  { id: "none", label: "Plain" },
  { id: "stripes", label: "Stripes" },
  { id: "dots", label: "Dots" },
];

const defaultAvatarConfig: AvatarConfig = {
  background: avatarBackgroundOptions[0].id,
  pattern: "stripes",
  bodyColor: avatarBodyColorOptions[0].id,
  hairStyle: "short",
  hairColor: avatarHairColorOptions[0].id,
  eyeStyle: "happy",
  mouthStyle: "smile",
  accessory: "none",
};

const usernameSuggestions = [
  "Blue Marker",
  "Quick Sketch",
  "Hidden Artist",
  "Canvas Champ",
  "Fast Doodle",
  "Secret Line",
];

const hasLocalStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const getRandomId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const pickRandom = <T,>(items: readonly T[]) => {
  const index = Math.floor(Math.random() * items.length);
  return items[index] || items[0];
};

const normalizeUsername = (username: string) => username.trim().replace(/\s+/g, " ");

const isValidUsername = (username: string) => {
  const normalized = normalizeUsername(username);
  return normalized.length >= 2 && normalized.length <= 20;
};

const includesId = <T extends string>(items: readonly AvatarChoice<T>[], value: unknown): value is T =>
  typeof value === "string" && items.some((item) => item.id === value);

const includesColor = (items: readonly AvatarChoice[], value: unknown) =>
  typeof value === "string" && items.some((item) => item.id === value);

const isValidAvatarConfig = (avatar: unknown): avatar is AvatarConfig => {
  if (!avatar || typeof avatar !== "object") return false;

  const config = avatar as Partial<AvatarConfig>;

  return (
    includesColor(avatarBackgroundOptions, config.background) &&
    includesId(avatarPatternOptions, config.pattern) &&
    includesColor(avatarBodyColorOptions, config.bodyColor) &&
    includesId(avatarHairStyleOptions, config.hairStyle) &&
    includesColor(avatarHairColorOptions, config.hairColor) &&
    includesId(avatarEyeOptions, config.eyeStyle) &&
    includesId(avatarMouthOptions, config.mouthStyle) &&
    includesId(avatarAccessoryOptions, config.accessory)
  );
};

const sanitizeAvatarConfig = (avatar: unknown): AvatarConfig => {
  if (isValidAvatarConfig(avatar)) return avatar;
  return defaultAvatarConfig;
};

const isGuestProfile = (value: unknown): value is GuestProfile => {
  if (!value || typeof value !== "object") return false;

  const profile = value as Partial<GuestProfile>;

  return (
    profile.schemaVersion === GUEST_PROFILE_SCHEMA_VERSION &&
    typeof profile.id === "string" &&
    profile.id.length > 0 &&
    typeof profile.username === "string" &&
    isValidUsername(profile.username) &&
    isValidAvatarConfig(profile.avatar) &&
    typeof profile.createdAt === "string" &&
    typeof profile.updatedAt === "string"
  );
};

const createRandomAvatar = (): AvatarConfig => ({
  background: pickRandom(avatarBackgroundOptions).id,
  pattern: pickRandom(avatarPatternOptions).id,
  bodyColor: pickRandom(avatarBodyColorOptions).id,
  hairStyle: pickRandom(avatarHairStyleOptions).id,
  hairColor: pickRandom(avatarHairColorOptions).id,
  eyeStyle: pickRandom(avatarEyeOptions).id,
  mouthStyle: pickRandom(avatarMouthOptions).id,
  accessory: pickRandom(avatarAccessoryOptions).id,
});

const getRandomUsername = () => pickRandom(usernameSuggestions);

const createGuestProfile = (username: string, avatar: AvatarConfig): GuestProfile | null => {
  const normalizedUsername = normalizeUsername(username);

  if (!isValidUsername(normalizedUsername) || !isValidAvatarConfig(avatar)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    schemaVersion: GUEST_PROFILE_SCHEMA_VERSION,
    id: getRandomId(),
    username: normalizedUsername,
    avatar,
    createdAt: now,
    updatedAt: now,
  };
};

const loadGuestProfile = () => {
  if (!hasLocalStorage()) return null;

  const rawProfile = window.localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
  if (!rawProfile) return null;

  try {
    const parsedProfile = JSON.parse(rawProfile) as unknown;
    if (isGuestProfile(parsedProfile)) return parsedProfile;
  } catch {
    // Malformed localStorage should behave the same as a missing profile.
  }

  window.localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
  return null;
};

const saveGuestProfile = (profile: GuestProfile) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

const clearGuestProfile = () => {
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
};

export {
  GUEST_PROFILE_STORAGE_KEY,
  avatarAccessoryOptions,
  avatarBackgroundOptions,
  avatarBodyColorOptions,
  avatarEyeOptions,
  avatarHairColorOptions,
  avatarHairStyleOptions,
  avatarMouthOptions,
  avatarPatternOptions,
  clearGuestProfile,
  createGuestProfile,
  createRandomAvatar,
  defaultAvatarConfig,
  getRandomUsername,
  isValidAvatarConfig,
  isValidUsername,
  loadGuestProfile,
  sanitizeAvatarConfig,
  saveGuestProfile,
};
export type { AvatarChoice, AvatarConfig, GuestProfile };
