import { ChevronLeft, ChevronRight, Shuffle, UserRound } from "lucide-react";
import { useState } from "react";
import {
  avatarAccessoryOptions,
  avatarBackgroundOptions,
  avatarBodyColorOptions,
  avatarEyeOptions,
  avatarHairColorOptions,
  avatarHairStyleOptions,
  avatarMouthOptions,
  avatarPatternOptions,
  createGuestProfile,
  createRandomAvatar,
  getRandomUsername,
  isValidUsername,
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

export const GuestProfileSetup = ({ onSave }: { onSave: (profile: GuestProfile) => void }) => {
  const [username, setUsername] = useState(() => getRandomUsername());
  const [avatar, setAvatar] = useState<AvatarConfig>(() => createRandomAvatar());
  const [error, setError] = useState("");
  const [mobileAvatarStep, setMobileAvatarStep] = useState(0);
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

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const profile = createGuestProfile(username, avatar);
    if (!profile) {
      setError("Use a name between 2 and 20 characters and finish your avatar.");
      return;
    }

    try {
      const payload = (await api.post("/user/init", {
        name: profile.username,
        avatar: profile.avatar,
      })) as unknown as InitUserResponse;
      const serverId = payload.data?.id ?? payload.id;
      const now = new Date().toISOString();

      onSave({
        ...profile,
        id: serverId ? String(serverId) : profile.id,
        updatedAt: now,
      });
    } catch {
      setError("Could not save your profile. Try again.");
    }
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#25116d] px-4 py-8 text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.28),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.16))]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <form
          onSubmit={submitProfile}
          className="w-full max-w-3xl rounded-[28px] border border-white/15 bg-[#34108f]/90 p-4 shadow-[0_24px_80px_rgba(6,2,35,0.55)] backdrop-blur sm:p-6"
        >
          <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
                placeholder="Enter your name"
                maxLength={20}
                className="h-12 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 text-base font-medium text-zinc-900 outline-none ring-lime-300/40 transition placeholder:text-zinc-400 focus:ring-4"
              />

              <button
                type="button"
                onClick={randomizeProfile}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Shuffle className="h-4 w-4" />
                Random
              </button>
            </div>

            <div className="mt-5 lg:hidden">
              <div className="rounded-[24px] border border-white/10 bg-[#2b0b7c]/80 px-4 py-5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {mobileAvatarStep + 1}/{avatarSteps.length} · {activeMobileStep.label}
                </p>

                <div className="mt-4 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
                  <button
                    type="button"
                    onClick={() => stepMobileAvatarValue(-1)}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    aria-label={`Previous ${activeMobileStep.label}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div>
                    <AvatarBadge
                      avatar={avatar}
                      name={username}
                      className="mx-auto h-36 w-36 rounded-[28px] border-none bg-transparent"
                    />
                    <p className="mt-3 text-xl font-semibold text-white">
                      {username.trim() || "Player"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/55">
                      Guest profile
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => stepMobileAvatarValue(1)}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    aria-label={`Next ${activeMobileStep.label}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {activeMobileStep.showSwatch && activeMobileOption ? (
                      <span
                        className="h-5 w-5 rounded-md border border-white/20"
                        style={{ backgroundColor: activeMobileOption.id }}
                      />
                    ) : null}
                    <span className="text-sm font-semibold text-white">
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
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${index === mobileAvatarStep
                        ? "border-lime-300/60 bg-lime-300/15 text-lime-100"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
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

              <div className="rounded-[24px] border border-white/10 bg-[#2b0b7c]/80 px-4 py-5 text-center">
                <AvatarBadge
                  avatar={avatar}
                  name={username}
                  className="mx-auto h-40 w-40 rounded-[28px] border-none bg-transparent"
                />
                <p className="mt-3 text-xl font-semibold text-white">
                  {username.trim() || "Player"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/55">
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

            {error && <p className="mt-4 text-sm text-red-200">{error}</p>}

            <button
              type="submit"
              disabled={!canSave}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#18ff13] px-4 text-xl font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserRound className="h-5 w-5" />
              Continue as guest
            </button>
          </div>
        </form>
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
    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
        <p className="text-[11px] text-white/45">
          {selectedIndex + 1 || 1}/{options.length}
        </p>
      </div>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          aria-label={`Previous ${label}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-center">
          {showSwatch && (
            <span
              className="h-5 w-5 shrink-0 rounded-md border border-white/20"
              style={{ backgroundColor: selectedOption.id }}
            />
          )}
          <span className="truncate text-sm font-semibold text-white">
            {selectedOption.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          aria-label={`Next ${label}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
