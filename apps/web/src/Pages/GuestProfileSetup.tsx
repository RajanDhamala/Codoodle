import { ChevronLeft, ChevronRight, Shuffle, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  avatarAccessoryOptions,
  avatarBackgroundOptions,
  avatarBodyColorOptions,
  avatarEyeOptions,
  avatarHairColorOptions,
  avatarHairStyleOptions,
  avatarMouthOptions,
  avatarPatternOptions,
  encodeAvatarConfig,
  type AvatarConfig,
  type GuestProfile,
} from "../Utils/guestProfile";
import { AvatarBadge } from "./GameAvatar";
import api from "../Utils/AxiosWrapper";

type InitUserResponse = {
  data?: {
    id?: string | number;
  };
  id?: string | number;
};

type GuestProfileSetupProps = {
  onSave: (profile: GuestProfile) => void;
  variant?: "page" | "modal";
};

const usernameSuggestions = [
  "Blue Marker",
  "Quick Sketch",
  "Hidden Artist",
  "Canvas Champ",
  "Fast Doodle",
  "Secret Line",
];

const pickRandom = <T,>(items: readonly T[]) => {
  const index = Math.floor(Math.random() * items.length);
  return items[index] || items[0];
};

const normalizeUsername = (value: string) => value.trim().replace(/\s+/g, " ");

const isValidUsername = (value: string) => {
  const username = normalizeUsername(value);
  return username.length >= 2 && username.length <= 20;
};

const getRandomUsername = () => pickRandom(usernameSuggestions);

const getGuestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export const GuestProfileSetup = ({ onSave, variant = "page" }: GuestProfileSetupProps) => {
  const [username, setUsername] = useState(() => getRandomUsername());
  const [avatar, setAvatar] = useState<AvatarConfig>(() => createRandomAvatar());
  const [error, setError] = useState("");
  const [mobileAvatarStep, setMobileAvatarStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const canSave = isValidUsername(username);

  const updateAvatar = (patch: Partial<AvatarConfig>) => {
    setAvatar((previousAvatar) => ({ ...previousAvatar, ...patch }));
    setError("");
  };

  const randomizeProfile = () => {
    setUsername(getRandomUsername());
    setAvatar(createRandomAvatar());
    setError("");
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError("Use a name between 2 and 20 characters.");
      return;
    }

    setIsSaving(true);
    setError("");
    const now = new Date().toISOString();
    const profile: GuestProfile = {
      schemaVersion: 2,
      id: getGuestId(),
      username: normalizedUsername,
      avatar,
      createdAt: now,
      updatedAt: now,
    };

    let payload: InitUserResponse;
    try {
      payload = (await api.post("/user/init", {
        name: profile.username,
        avatar: encodeAvatarConfig(profile.avatar),
      })) as unknown as InitUserResponse;
    } catch {
      setIsSaving(false);
      setError("Could not save your profile. Try again.");
      return;
    }

    const serverId = payload.data?.id ?? payload.id;
    setIsSaving(false);
    onSave({
      ...profile,
      id: serverId ? String(serverId) : profile.id,
      updatedAt: new Date().toISOString(),
    });
  };

  const avatarSteps: Array<{
    key: string;
    label: string;
    value: string;
    options: ReadonlyArray<{ id: string; label: string }>;
    showSwatch: boolean;
    onChange: (value: string) => void;
  }> = [
    {
      key: "hairStyle",
      label: "Hair style",
      value: avatar.hairStyle,
      options: avatarHairStyleOptions,
      showSwatch: false,
      onChange: (value) => updateAvatar({ hairStyle: value as AvatarConfig["hairStyle"] }),
    },
    {
      key: "hairColor",
      label: "Hair color",
      value: avatar.hairColor,
      options: avatarHairColorOptions,
      showSwatch: true,
      onChange: (value) => updateAvatar({ hairColor: value as AvatarConfig["hairColor"] }),
    },
    {
      key: "eyes",
      label: "Eyes",
      value: avatar.eyeStyle,
      options: avatarEyeOptions,
      showSwatch: false,
      onChange: (value) => updateAvatar({ eyeStyle: value as AvatarConfig["eyeStyle"] }),
    },
    {
      key: "accessory",
      label: "Accessory",
      value: avatar.accessory,
      options: avatarAccessoryOptions,
      showSwatch: false,
      onChange: (value) => updateAvatar({ accessory: value as AvatarConfig["accessory"] }),
    },
    {
      key: "bodyColor",
      label: "Body color",
      value: avatar.bodyColor,
      options: avatarBodyColorOptions,
      showSwatch: true,
      onChange: (value) => updateAvatar({ bodyColor: value as AvatarConfig["bodyColor"] }),
    },
    {
      key: "background",
      label: "Background",
      value: avatar.background,
      options: avatarBackgroundOptions,
      showSwatch: true,
      onChange: (value) => updateAvatar({ background: value as AvatarConfig["background"] }),
    },
    {
      key: "mouth",
      label: "Mouth",
      value: avatar.mouthStyle,
      options: avatarMouthOptions,
      showSwatch: false,
      onChange: (value) => updateAvatar({ mouthStyle: value as AvatarConfig["mouthStyle"] }),
    },
    {
      key: "pattern",
      label: "Pattern",
      value: avatar.pattern,
      options: avatarPatternOptions,
      showSwatch: false,
      onChange: (value) => updateAvatar({ pattern: value as AvatarConfig["pattern"] }),
    },
  ];

  const activeMobileStep = avatarSteps[mobileAvatarStep] ?? avatarSteps[0];
  const activeMobileOptionIndex = activeMobileStep.options.findIndex(
    (option) => option.id === activeMobileStep.value
  );
  const activeMobileOption =
    activeMobileStep.options[activeMobileOptionIndex >= 0 ? activeMobileOptionIndex : 0];

  const stepMobileAvatarValue = (direction: -1 | 1) => {
    if (!activeMobileStep.options.length) return;

    const currentIndex = activeMobileOptionIndex >= 0 ? activeMobileOptionIndex : 0;
    const nextIndex =
      (currentIndex + direction + activeMobileStep.options.length) %
      activeMobileStep.options.length;
    const nextOption = activeMobileStep.options[nextIndex];

    if (nextOption) {
      activeMobileStep.onChange(nextOption.id);
    }
  };

  const formClassName = [
    "w-full rounded-2xl border border-[#e5e7eb] bg-white p-4 sm:p-6",
    variant === "page" ? "max-w-3xl elev-3" : "elev-modal",
  ]
    .filter(Boolean)
    .join(" ");

  const form = (
    <form onSubmit={submitProfile} className={formClassName}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            Guest profile
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#0f172a] [font-family:'Space_Grotesk',Inter,ui-sans-serif]">
            Set up your player
          </h2>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#ccfbf1] bg-[#f0fdfa] text-[#0f766e]">
          <UserRound className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            placeholder="Enter your name"
            maxLength={20}
            className="h-12 min-w-0 flex-1 rounded-xl border border-[#e5e7eb] bg-white px-4 text-base font-medium text-[#0f172a] outline-none ring-[#0f766e]/25 transition placeholder:text-[#94a3b8] focus:border-[#0f766e] focus:ring-4"
          />

          <button
            type="button"
            onClick={randomizeProfile}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a]"
          >
            <Shuffle className="h-4 w-4" />
            Random
          </button>
        </div>

        <div className="mt-5 lg:hidden">
          <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
              {mobileAvatarStep + 1}/{avatarSteps.length} · {activeMobileStep.label}
            </p>

            <div className="mt-4 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
              <button
                type="button"
                onClick={() => stepMobileAvatarValue(-1)}
                className="flex h-11 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a]"
                aria-label={`Previous ${activeMobileStep.label}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div>
                <AvatarBadge
                  avatar={avatar}
                  name={username}
                  className="mx-auto h-36 w-36 rounded-[28px] border-none bg-transparent shadow-none"
                />
                <p className="mt-3 text-xl font-bold text-[#0f172a]">
                  {username.trim() || "Player"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#64748b]">
                  Guest profile
                </p>
              </div>

              <button
                type="button"
                onClick={() => stepMobileAvatarValue(1)}
                className="flex h-11 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a]"
                aria-label={`Next ${activeMobileStep.label}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-3">
              <div className="flex items-center justify-center gap-2">
                {activeMobileStep.showSwatch && activeMobileOption ? (
                  <span
                    className="h-5 w-5 rounded-md border border-[#e5e7eb]"
                    style={{ backgroundColor: activeMobileOption.id }}
                  />
                ) : null}
                <span className="text-sm font-semibold text-[#0f172a]">
                  {activeMobileOption?.label}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {avatarSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setMobileAvatarStep(index)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${index === mobileAvatarStep
                    ? "border-[#0f766e]/40 bg-[#f0fdfa] text-[#0f766e]"
                    : "border-[#e5e7eb] bg-white text-[#334155] hover:border-[#0f172a] hover:text-[#0f172a]"
                    }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 hidden items-center gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
          <div className="grid gap-3">
            <AvatarCycleControl
              label="Hair style"
              value={avatar.hairStyle}
              options={avatarHairStyleOptions}
              onChange={(hairStyle) => updateAvatar({ hairStyle })}
            />
            <AvatarCycleControl
              label="Hair color"
              value={avatar.hairColor}
              options={avatarHairColorOptions}
              onChange={(hairColor) => updateAvatar({ hairColor })}
              showSwatch
            />
            <AvatarCycleControl
              label="Eyes"
              value={avatar.eyeStyle}
              options={avatarEyeOptions}
              onChange={(eyeStyle) => updateAvatar({ eyeStyle })}
            />
            <AvatarCycleControl
              label="Accessory"
              value={avatar.accessory}
              options={avatarAccessoryOptions}
              onChange={(accessory) => updateAvatar({ accessory })}
            />
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-4 py-5 text-center">
            <AvatarBadge
              avatar={avatar}
              name={username}
              className="mx-auto h-40 w-40 rounded-[28px] border-none bg-transparent shadow-none"
            />
            <p className="mt-3 text-xl font-bold text-[#0f172a]">
              {username.trim() || "Player"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#64748b]">
              Guest profile
            </p>
          </div>

          <div className="grid gap-3">
            <AvatarCycleControl
              label="Body color"
              value={avatar.bodyColor}
              options={avatarBodyColorOptions}
              onChange={(bodyColor) => updateAvatar({ bodyColor })}
              showSwatch
            />
            <AvatarCycleControl
              label="Background"
              value={avatar.background}
              options={avatarBackgroundOptions}
              onChange={(background) => updateAvatar({ background })}
              showSwatch
            />
            <AvatarCycleControl
              label="Mouth"
              value={avatar.mouthStyle}
              options={avatarMouthOptions}
              onChange={(mouthStyle) => updateAvatar({ mouthStyle })}
            />
            <AvatarCycleControl
              label="Pattern"
              value={avatar.pattern}
              options={avatarPatternOptions}
              onChange={(pattern) => updateAvatar({ pattern })}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-[#b91c1c]">{error}</p>}

        <button
          type="submit"
          disabled={!canSave || isSaving}
          aria-busy={isSaving}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 text-lg font-bold text-white elev-accent transition hover:bg-[#0d6a63] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserRound className="h-5 w-5" />
          {isSaving ? "Saving player..." : "Continue as guest"}
        </button>
      </div>
    </form>
  );

  if (variant === "modal") {
    return form;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f7f9] px-4 py-8 text-[#0f172a] [font-family:Inter,ui-sans-serif,system-ui]">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        {form}
      </div>
    </main>
  );
};

const AvatarCycleControl = <T extends string>({
  label,
  value,
  options,
  onChange,
  showSwatch = false,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
  showSwatch?: boolean;
}) => {
  const selectedIndex = options.findIndex((option) => option.id === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];

  const step = (direction: -1 | 1) => {
    if (!options.length) return;

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    const nextOption = options[nextIndex];

    if (nextOption) {
      onChange(nextOption.id);
    }
  };

  if (!selectedOption) return null;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 elev-1">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#334155]">{label}</p>
        <p className="text-[11px] font-medium text-[#64748b]">
          {selectedIndex + 1 || 1}/{options.length}
        </p>
      </div>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-10 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] text-[#334155] transition hover:border-[#0f172a] hover:text-[#0f172a]"
          aria-label={`Previous ${label}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-center">
          {showSwatch && (
            <span
              className="h-5 w-5 shrink-0 rounded-md border border-[#e5e7eb]"
              style={{ backgroundColor: selectedOption.id }}
            />
          )}
          <span className="truncate text-sm font-semibold text-[#0f172a]">
            {selectedOption.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-10 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] text-[#334155] transition hover:border-[#0f172a] hover:text-[#0f172a]"
          aria-label={`Next ${label}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
