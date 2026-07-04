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
  schemaVersion: typeof GUEST_PROFILE_SCHEMA_VERSION;
  id: string;
  username: string;
  avatar: AvatarConfig;
  createdAt: string;
  updatedAt: string;
};

type StoredGuestProfile = Omit<GuestProfile, "avatar"> & {
  avatar: string | AvatarConfig;
};

type AvatarChoice<T extends string = string> = {
  id: T;
  label: string;
};

const avatarBackgroundOptions: AvatarChoice[] = [
  { id: "#312e81", label: "Night" },
  { id: "#0f766e", label: "Mint" },
  { id: "#1d4ed8", label: "Blue" },
  { id: "#7f1d1d", label: "Rose" },
  { id: "#7c2d12", label: "Amber" },
  { id: "#365314", label: "Lime" },
];

const avatarBodyColorOptions: AvatarChoice[] = [
  { id: "#38bdf8", label: "Sky" },
  { id: "#5eead4", label: "Mint" },
  { id: "#bef264", label: "Lime" },
  { id: "#fbbf24", label: "Amber" },
  { id: "#fb7185", label: "Rose" },
  { id: "#a78bfa", label: "Violet" },
  { id: "#f8fafc", label: "Paper" },
];

const avatarHairColorOptions: AvatarChoice[] = [
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

const AVATAR_CODE_LENGTH = 8;

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

const hasLocalStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const getDigitForOption = (options: readonly AvatarChoice[], value: string) => {
  const index = options.findIndex((option) => option.id === value);
  return index >= 0 && index <= 9 ? String(index) : "0";
};

const getOptionFromDigit = <T extends string>(
  options: readonly AvatarChoice<T>[],
  digit: string
) => {
  if (!/^\d$/.test(digit)) return null;

  return options[Number(digit)]?.id ?? null;
};

const encodeAvatarConfig = (avatar: AvatarConfig) =>
  [
    getDigitForOption(avatarBackgroundOptions, avatar.background),
    getDigitForOption(avatarEyeOptions, avatar.eyeStyle),
    getDigitForOption(avatarMouthOptions, avatar.mouthStyle),
    getDigitForOption(avatarHairStyleOptions, avatar.hairStyle),
    getDigitForOption(avatarHairColorOptions, avatar.hairColor),
    getDigitForOption(avatarBodyColorOptions, avatar.bodyColor),
    getDigitForOption(avatarAccessoryOptions, avatar.accessory),
    getDigitForOption(avatarPatternOptions, avatar.pattern),
  ].join("");

const decodeAvatarCode = (avatarCode: unknown): AvatarConfig | null => {
  if (typeof avatarCode !== "string") return null;

  const code = avatarCode.trim();
  if (code.length !== AVATAR_CODE_LENGTH) return null;

  const [
    backgroundDigit,
    eyeStyleDigit,
    mouthStyleDigit,
    hairStyleDigit,
    hairColorDigit,
    bodyColorDigit,
    accessoryDigit,
    patternDigit,
  ] = code;

  const background = getOptionFromDigit(avatarBackgroundOptions, backgroundDigit);
  const eyeStyle = getOptionFromDigit(avatarEyeOptions, eyeStyleDigit);
  const mouthStyle = getOptionFromDigit(avatarMouthOptions, mouthStyleDigit);
  const hairStyle = getOptionFromDigit(avatarHairStyleOptions, hairStyleDigit);
  const hairColor = getOptionFromDigit(avatarHairColorOptions, hairColorDigit);
  const bodyColor = getOptionFromDigit(avatarBodyColorOptions, bodyColorDigit);
  const accessory = getOptionFromDigit(avatarAccessoryOptions, accessoryDigit);
  const pattern = getOptionFromDigit(avatarPatternOptions, patternDigit);

  if (
    !background ||
    !eyeStyle ||
    !mouthStyle ||
    !hairStyle ||
    !hairColor ||
    !bodyColor ||
    !accessory ||
    !pattern
  ) {
    return null;
  }

  return {
    background,
    pattern,
    bodyColor,
    hairStyle,
    hairColor,
    eyeStyle,
    mouthStyle,
    accessory,
  };
};

const sanitizeAvatarConfig = (avatar: unknown): AvatarConfig => {
  const decodedAvatar = decodeAvatarCode(avatar);
  if (decodedAvatar) return decodedAvatar;

  if (!avatar || typeof avatar !== "object") return defaultAvatarConfig;

  const value = avatar as Partial<AvatarConfig>;

  return {
    background:
      typeof value.background === "string" ? value.background : defaultAvatarConfig.background,
    pattern: value.pattern || defaultAvatarConfig.pattern,
    bodyColor:
      typeof value.bodyColor === "string" ? value.bodyColor : defaultAvatarConfig.bodyColor,
    hairStyle: value.hairStyle || defaultAvatarConfig.hairStyle,
    hairColor:
      typeof value.hairColor === "string" ? value.hairColor : defaultAvatarConfig.hairColor,
    eyeStyle: value.eyeStyle || defaultAvatarConfig.eyeStyle,
    mouthStyle: value.mouthStyle || defaultAvatarConfig.mouthStyle,
    accessory: value.accessory || defaultAvatarConfig.accessory,
  };
};

const loadGuestProfile = (): GuestProfile | null => {
  if (!hasLocalStorage()) return null;

  const rawProfile = window.localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
  if (!rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile) as Partial<StoredGuestProfile>;
    const username = typeof profile.username === "string" ? profile.username.trim() : "";

    if (
      profile.schemaVersion === GUEST_PROFILE_SCHEMA_VERSION &&
      typeof profile.id === "string" &&
      profile.id.length > 0 &&
      username.length > 0 &&
      typeof profile.createdAt === "string" &&
      typeof profile.updatedAt === "string"
    ) {
      return {
        schemaVersion: GUEST_PROFILE_SCHEMA_VERSION,
        id: profile.id,
        username,
        avatar: sanitizeAvatarConfig(profile.avatar),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    }
  } catch {
    // Bad localStorage data should behave like a missing profile.
  }

  window.localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
  return null;
};

const saveGuestProfile = (profile: GuestProfile) => {
  if (!hasLocalStorage()) return;

  const storedProfile: StoredGuestProfile = {
    ...profile,
    avatar: encodeAvatarConfig(profile.avatar),
  };

  window.localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(storedProfile));
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
  AVATAR_CODE_LENGTH,
  avatarEyeOptions,
  avatarHairColorOptions,
  avatarHairStyleOptions,
  avatarMouthOptions,
  avatarPatternOptions,
  clearGuestProfile,
  decodeAvatarCode,
  defaultAvatarConfig,
  encodeAvatarConfig,
  loadGuestProfile,
  sanitizeAvatarConfig,
  saveGuestProfile,
};
export type { AvatarChoice, AvatarConfig, GuestProfile };
