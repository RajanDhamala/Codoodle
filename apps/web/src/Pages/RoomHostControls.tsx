import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Minus, Play, Plus, Settings2, UserRound } from "lucide-react";
import { AvatarBadge } from "./GameAvatar";
import type { GameSettings, User } from "./GameTypes";
import type { GuestProfile } from "../Utils/guestProfile";

type NumericSettingKey =
  "maxPlayers" | "turnCyclesBeforeVote" | "maxStrokesPerTurn";

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

type RoomHostControlsProps = {
  guestProfile: GuestProfile | null;
  activeUser: User | null;
  settingsDraft: GameSettings;
  setSettingsDraft: Dispatch<SetStateAction<GameSettings>>;
  isSocketReady: boolean;
  isCreating: boolean;
  resetProfile: () => void;
  createRoom: () => void;
  titleId?: string;
  headerAction?: ReactNode;
  isModal?: boolean;
};

export default function RoomHostControls({
  guestProfile, activeUser, settingsDraft, setSettingsDraft,
  isSocketReady, isCreating, resetProfile, createRoom, titleId, headerAction, isModal = false,
}: RoomHostControlsProps) {
  return (
    <div className={isModal ? "[--room-ink:#191923] [--room-muted:#77716a] [--room-border:#e7e1d6] [--room-soft:#f6f2e9] [--room-accent:#956008] [--room-tint:#fff2cd] [--room-accent-border:#edd89e]" : undefined}>
      <div className="flex items-center justify-between gap-4">
        <div>
          {!isModal && <p className="text-sm font-semibold text-[#475569]">Host controls</p>}
          <h2 id={titleId} className={isModal ? "text-2xl font-bold tracking-[-0.035em] [font-family:inherit]" : "mt-1 text-3xl font-bold tracking-[-0.02em] [font-family:'Space_Grotesk',Inter,ui-sans-serif]"}>
            {isModal ? "Create a room" : "Create room"}
          </h2>
        </div>
        {headerAction ?? <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--room-accent-border,#ccfbf1)] bg-[var(--room-tint,#f0fdfa)] text-[var(--room-accent,#0f766e)]">
          <Settings2 className="h-5 w-5" />
        </div>}
      </div>

      <div className={isModal ? "mt-5 flex items-center justify-between gap-3 border-b border-[#ececec] pb-5" : "mt-5 flex items-center justify-between gap-3 border-y border-[var(--room-border,#e5e7eb)] py-4"}>
        <div className="flex min-w-0 items-center gap-3">
          <AvatarBadge
            avatar={guestProfile?.avatar}
            name={guestProfile?.username}
            className={isModal ? "h-10 w-10 shrink-0 rounded-full" : "h-12 w-12 rounded-xl"}
          />
          <div className="min-w-0">
            {!isModal && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--room-muted,#64748b)]">Playing as</p>}
            <p className={isModal ? "truncate text-sm font-semibold text-[#191923]" : "truncate text-lg font-bold text-[var(--room-ink,#0f172a)]"}>
              {guestProfile?.username || "No player yet"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetProfile}
          disabled={isCreating}
          className={isModal ? "min-h-11 shrink-0 cursor-pointer px-1 text-sm text-[#69696f] underline underline-offset-4 hover:text-[#191923] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956008] disabled:opacity-50" : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--room-border,#e5e7eb)] bg-white px-3 py-2 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-[var(--room-ink,#0f172a)] hover:text-[var(--room-ink,#0f172a)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--room-accent,#0f766e)]"}
        >
          {!isModal && <UserRound className="h-4 w-4" />}
          {guestProfile ? "Change" : "Set up"}
        </button>
      </div>

      <SettingsControls
        settings={settingsDraft}
        setSettings={setSettingsDraft}
        disabled={isCreating}
        isModal={isModal}
      />

      <div className={isModal ? "mt-5" : undefined}>
      <button
        type="button"
        className={isModal
          ? "inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-[#ffbd32] px-6 text-sm font-bold text-[#191923] transition hover:bg-[#ffca59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956008] disabled:cursor-not-allowed disabled:opacity-60"
          : "mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[var(--room-ink,#0f172a)] px-4 text-base font-bold text-white shadow-md transition hover:bg-[#1e293b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--room-accent,#0f766e)] disabled:cursor-not-allowed disabled:opacity-60"}
        onClick={createRoom}
        disabled={isCreating || Boolean(activeUser && !isSocketReady)}
      >
        {!isModal && <Play className="h-4 w-4 fill-current" />}
        {isCreating
          ? "Creating room…"
          : !activeUser
          ? "Set up player first"
          : isSocketReady
            ? isModal ? "Create room" : "Create game room"
            : "Connecting server"}
      </button>

      {!isModal && <p className="mt-4 rounded-lg border border-[var(--room-border,#e5e7eb)] bg-[var(--room-soft,#f3f4f6)] px-3 py-2 text-center text-sm font-medium text-[var(--room-muted,#64748b)]">
        Invite friends with the room link after creation.
      </p>}
      </div>
    </div>
  );
}

const SettingsControls = ({
  settings,
  setSettings,
  disabled,
  isModal,
}: {
  settings: GameSettings;
  setSettings: Dispatch<SetStateAction<GameSettings>>;
  disabled: boolean;
  isModal: boolean;
}) => {
  const updateNumericSetting = (
    key: NumericSettingKey,
    value: number,
    min: number,
    max: number,
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: clampNumber(value, min, max),
    }));
  };

  if (isModal) {
    return (
      <div className="divide-y divide-[#ececec]">
        {([
          { key: "maxPlayers", label: "Max players", min: 3, max: 10 },
          { key: "turnCyclesBeforeVote", label: "Drawing cycles", min: 1, max: 5 },
        ] as const).map(({ key, label, min, max }) => (
          <label key={key} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="text-sm font-medium text-[#191923]">{label}</span>
            <select
              value={settings[key]}
              disabled={disabled}
              onChange={(event) => updateNumericSetting(key, Number(event.currentTarget.value), min, max)}
              className="h-11 w-[136px] cursor-pointer rounded-lg border border-[#dedee2] bg-white px-3 text-sm font-medium text-[#191923] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956008] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
                <option key={value} value={value}>
                  {key === "maxPlayers" ? `${value} players` : `${value} ${value === 1 ? "cycle" : "cycles"}`}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span id="room-strokes-label" className="text-sm font-medium text-[#191923]">Strokes per turn</span>
          <div role="radiogroup" aria-labelledby="room-strokes-label" className="flex shrink-0 gap-1 rounded-lg bg-[#f3f3f4] p-1">
            {[1, 2, 3].map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="room-strokes"
                  value={value}
                  checked={settings.maxStrokesPerTurn === value}
                  disabled={disabled}
                  onChange={() => updateNumericSetting("maxStrokesPerTurn", value, 1, 3)}
                  className="peer sr-only"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-[#777780] peer-checked:bg-white peer-checked:text-[#191923] peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-[#956008] peer-disabled:cursor-not-allowed peer-disabled:opacity-40">{value}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "mt-5" : "mt-5 border-y border-[var(--room-border,#e5e7eb)]"}>
      <div className={isModal ? "grid min-w-0 gap-x-8 sm:grid-cols-2 [&>div:last-child]:border-t [&>div:last-child]:border-[#e7e1d6] sm:[&>div:last-child]:col-span-2" : "divide-y divide-[var(--room-border,#e5e7eb)]"}>
      <SettingSlider
        label="Max players"
        description="Room capacity"
        value={settings.maxPlayers}
        min={3}
        max={10}
        disabled={disabled}
        onChange={(value) => updateNumericSetting("maxPlayers", value, 3, 10)}
      />
      <SettingSlider
        label="Drawing cycles"
        description="Rounds before voting"
        value={settings.turnCyclesBeforeVote}
        min={1}
        max={5}
        disabled={disabled}
        onChange={(value) =>
          updateNumericSetting("turnCyclesBeforeVote", value, 1, 5)
        }
      />
      <StrokeSetting
        value={settings.maxStrokesPerTurn}
        disabled={disabled}
        onChange={(value) =>
          updateNumericSetting("maxStrokesPerTurn", value, 1, 3)
        }
      />
      </div>
      {!isModal && <div className="divide-y divide-[var(--room-border,#e5e7eb)] border-t border-[var(--room-border,#e5e7eb)]">
      <ToggleSetting
        label="Draft undo"
        description="Players can undo before submitting"
        checked={settings.allowUndo}
        disabled={disabled}
        onChange={(checked) =>
          setSettings((previous) => ({
            ...previous,
            allowUndo: checked,
          }))
        }
      />
      <ToggleSetting
        label="Host removal"
        description="Host can remove players in the lobby"
        checked={settings.allowKick}
        disabled={disabled}
        onChange={(checked) =>
          setSettings((previous) => ({
            ...previous,
            allowKick: checked,
          }))
        }
      />
      </div>}
    </div>
  );
};

const SettingSlider = ({
  label,
  description,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) => (
  <label className="block py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-bold text-[var(--room-ink,#0f172a)]">{label}</p>
        <p className="mt-1 text-sm font-medium text-[var(--room-muted,#64748b)]">
          {description}
        </p>
      </div>
      <output className="rounded-lg border border-[var(--room-border,#e5e7eb)] bg-[var(--room-soft,#f3f4f6)] px-3 py-1 text-lg font-bold text-[var(--room-ink,#0f172a)] tabular-nums">
        {value}
      </output>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      className="mt-4 h-2 w-full accent-[var(--room-ink,#0f172a)] disabled:cursor-not-allowed disabled:opacity-50"
    />
  </label>
);

const StrokeSetting = ({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) => (
  <div className="py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-bold text-[var(--room-ink,#0f172a)]">Strokes per turn</p>
        <p className="mt-1 text-sm font-medium text-[var(--room-muted,#64748b)]">
          Up to 3 strokes each
        </p>
      </div>
      <div className="grid shrink-0 grid-cols-[36px_40px_36px] items-center gap-1">
        <button
          type="button"
          disabled={disabled || value <= 1}
          onClick={() => onChange(value - 1)}
          className="flex h-10 items-center justify-center rounded-lg border border-[var(--room-border,#e5e7eb)] bg-white text-[#334155] shadow-sm transition hover:border-[var(--room-ink,#0f172a)] hover:text-[var(--room-ink,#0f172a)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Reduce strokes per turn"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex h-10 items-center justify-center rounded-lg border border-[var(--room-accent-border,#ccfbf1)] bg-[var(--room-tint,#f0fdfa)] text-lg font-bold text-[var(--room-accent,#0f766e)] tabular-nums">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled || value >= 3}
          onClick={() => onChange(value + 1)}
          className="flex h-10 items-center justify-center rounded-lg border border-[var(--room-border,#e5e7eb)] bg-white text-[#334155] shadow-sm transition hover:border-[var(--room-ink,#0f172a)] hover:text-[var(--room-ink,#0f172a)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Increase strokes per turn"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

const ToggleSetting = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
    <span>
      <span className="block font-bold text-[var(--room-ink,#0f172a)]">{label}</span>
      <span className="mt-1 block text-sm font-medium text-[var(--room-muted,#64748b)]">
        {description}
      </span>
    </span>
    <span className="relative inline-flex h-8 w-14 shrink-0 items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full border border-[var(--room-border,#e5e7eb)] bg-[var(--room-soft,#f3f4f6)] transition peer-checked:border-[var(--room-accent,#0f766e)] peer-checked:bg-[var(--room-tint,#f0fdfa)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--room-accent,#0f766e)] peer-disabled:opacity-40" />
      <span className="absolute left-1 h-6 w-6 rounded-full bg-[#94a3b8] transition peer-checked:translate-x-6 peer-checked:bg-[var(--room-accent,#0f766e)]" />
    </span>
  </label>
);
