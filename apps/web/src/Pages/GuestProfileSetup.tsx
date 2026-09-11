import { ArrowRight, Check, CircleUserRound, Eye, Palette, RotateCcw, Scissors, Shuffle, Smile, Glasses, X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import {
  avatarAccessoryOptions, avatarBackgroundOptions, avatarBodyColorOptions, avatarEyeOptions,
  avatarHairColorOptions, avatarHairStyleOptions, avatarMouthOptions, avatarPatternOptions,
  encodeAvatarConfig, type AvatarChoice, type AvatarConfig, type GuestProfile,
} from "../Utils/guestProfile";
import { avatarDisplayColor } from "../Utils/avatarAppearance";
import { AvatarArtwork, AvatarBadge } from "./GameAvatar";
import api from "../Utils/AxiosWrapper";
import "./GuestProfileSetup.css";

type InitUserResponse = {
  data?: {
    id?: string | number;
  };
  id?: string | number;
};

type GuestProfileSetupProps = {
  onSave: (profile: GuestProfile) => void;
  onClose?: () => void;
  variant?: "page" | "modal";
  initialProfile?: GuestProfile | null;
};

const pickRandom = <T,>(items: readonly T[]) => {
  const index = Math.floor(Math.random() * items.length);
  return items[index] || items[0];
};

const normalizeUsername = (value: string) => value.trim().replace(/\s+/g, " ");

const isValidUsername = (value: string) => {
  const username = normalizeUsername(value);
  return username.length >= 2 && username.length <= 20;
};

const getGuestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const categories = [
  { id: "skin", label: "Skin", icon: CircleUserRound },
  { id: "hair", label: "Hair", icon: Scissors },
  { id: "eyes", label: "Eyes", icon: Eye },
  { id: "mouth", label: "Mouth", icon: Smile },
  { id: "extras", label: "Extras", icon: Glasses },
  { id: "background", label: "Backdrop", icon: Palette },
] as const;

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

export const GuestProfileSetup = ({ onSave, onClose, variant = "page", initialProfile }: GuestProfileSetupProps) => {
  const [startingUsername] = useState(() => initialProfile?.username ?? "");
  const [username, setUsername] = useState(startingUsername);
  const [startingAvatar] = useState(() => initialProfile?.avatar ?? createRandomAvatar());
  const [avatar, setAvatar] = useState<AvatarConfig>(startingAvatar);
  const [category, setCategory] = useState<(typeof categories)[number]["id"]>("skin");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const closeConfirmation = useRef<HTMLDialogElement>(null);
  const canSave = isValidUsername(username);
  const hasUnsavedChanges = normalizeUsername(username) !== normalizeUsername(startingUsername)
    || encodeAvatarConfig(avatar) !== encodeAvatarConfig(startingAvatar);
  const updateAvatar = (key: keyof AvatarConfig, value: string) => setAvatar(current => ({ ...current, [key]: value }));
  const choiceProps = { avatar, onChange: updateAvatar };

  const requestClose = () => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      closeConfirmation.current?.showModal();
    } else {
      onClose?.();
    }
  };

  const persistProfile = async () => {
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

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persistProfile();
  };

  const form = (
    <form onSubmit={submitProfile} className="player-setup" aria-labelledby="player-setup-title">
      {onClose && (
        <button type="button" onClick={requestClose} disabled={isSaving}
          className="player-setup-dialog__close" aria-label="Close player setup">
          <X className="h-5 w-5" />
        </button>
      )}
      <header className="player-setup__header">
        <p className="player-setup__eyebrow">Your player</p>
        <h2 id="player-setup-title">Make it your own.</h2>
        <p>A familiar face. A suspiciously good poker face.</p>
      </header>

      <fieldset disabled={isSaving} className="player-setup__fields">
        <legend className="sr-only">Customize your player</legend>
        <div className="player-setup__workspace">
          <aside className="player-setup__identity">
            <div className="player-setup__preview-area">
              <AvatarBadge avatar={avatar} name={username.trim() || "Your player"} className="player-setup__preview" />
              <div className="player-setup__preview-actions">
                <button type="button" onClick={() => setAvatar(createRandomAvatar())} className="player-setup__shuffle">
                  <Shuffle size={14} aria-hidden="true" /> Shuffle
                </button>
                <button type="button" onClick={() => setAvatar(startingAvatar)} className="player-setup__reset" aria-label="Reset avatar changes" title="Reset avatar changes">
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="player-setup__name">
              <label htmlFor="player-name">Your name</label>
              <input id="player-name" value={username}
                onChange={(event) => { setUsername(event.target.value); setError(""); }}
                placeholder="Enter your name" minLength={2} maxLength={20} required autoComplete="nickname"
                aria-describedby={error ? "player-name-hint player-setup-error" : "player-name-hint"}
                aria-invalid={!canSave} />
              <p id="player-name-hint">Required · 2–20 characters</p>
            </div>
          </aside>

          <div className="player-setup__editor">
            <div className="player-setup__categories" role="group" aria-label="Avatar features">
              {categories.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} aria-controls="avatar-feature-options">
                  <Icon size={18} aria-hidden="true" /><span>{label}</span>
                </button>
              ))}
            </div>
            <div id="avatar-feature-options" className="player-setup__panel">
              {category === "skin" && <>
                <ChoiceField {...choiceProps} property="bodyColor" label="Skin tone" options={avatarBodyColorOptions} swatches />
                <p className="player-setup__hint">A little more you. Every feature is yours to change.</p>
              </>}
              {category === "hair" && <>
                <ChoiceField {...choiceProps} property="hairStyle" label="Hair style" options={avatarHairStyleOptions} />
                <ChoiceField {...choiceProps} property="hairColor" label="Hair color" options={avatarHairColorOptions} swatches />
              </>}
              {category === "eyes" && <>
                <ChoiceField {...choiceProps} property="eyeStyle" label="Eyes" options={avatarEyeOptions} />
                {(avatar.accessory === "shades" || avatar.accessory === "glasses") && <p className="player-setup__hint">Your eyewear stays on in the preview. Change it under Extras.</p>}
              </>}
              {category === "mouth" && <>
                <ChoiceField {...choiceProps} property="mouthStyle" label="Mouth" options={avatarMouthOptions} />
                {avatar.accessory === "mask" && <p className="player-setup__hint">Your mask covers the mouth. Remove it under Extras to see the change.</p>}
              </>}
              {category === "extras" && <ChoiceField {...choiceProps} property="accessory" label="Finishing touches" options={avatarAccessoryOptions} />}
              {category === "background" && <>
                <ChoiceField {...choiceProps} property="background" label="Background color" options={avatarBackgroundOptions} swatches />
                <ChoiceField {...choiceProps} property="pattern" label="Pattern" options={avatarPatternOptions} />
              </>}
            </div>
          </div>
        </div>
      </fieldset>
      {error && <p id="player-setup-error" className="player-setup__error" role="alert">{error}</p>}
      <footer className="player-setup__footer">
        <p>You can change your look in the lobby.</p>
        <button type="submit" disabled={!canSave || isSaving} aria-busy={isSaving} className="player-setup__submit">
          {isSaving ? "Saving…" : initialProfile ? "Save player" : "Let’s play"}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </form>
  );
  return <>
    {variant === "modal" ? form : <main className="player-setup-page">{form}</main>}
    {onClose && (
      <dialog ref={closeConfirmation} className="player-setup-confirm backdrop:bg-black/70"
        aria-labelledby="player-confirm-title" aria-describedby="player-confirm-description"
        onCancel={(event) => event.preventDefault()}>
        <p className="player-setup__eyebrow">Unsaved changes</p>
        <h2 id="player-confirm-title">Save your player?</h2>
        <p id="player-confirm-description">You’ve changed your name or avatar. Save your changes before leaving, or keep editing.</p>
        {!canSave && <p className="player-setup-confirm__note">Enter a name with 2–20 characters in the editor before saving.</p>}
        {error && <p className="player-setup__error" role="alert">{error}</p>}
        <div className="player-setup-confirm__actions">
          <button type="button" className="player-setup-confirm__keep" disabled={isSaving}
            autoFocus onClick={() => closeConfirmation.current?.close()}>Keep editing</button>
          <button type="button" className="player-setup__submit" disabled={!canSave || isSaving}
            aria-busy={isSaving} onClick={() => void persistProfile()}>
            {isSaving ? "Saving…" : "Save and exit"}
          </button>
        </div>
      </dialog>
    )}
  </>;
};

function ChoiceField({ avatar, property, label, options, swatches = false, onChange }: {
  avatar: AvatarConfig;
  property: keyof AvatarConfig;
  label: string;
  options: readonly AvatarChoice[];
  swatches?: boolean;
  onChange: (key: keyof AvatarConfig, value: string) => void;
}) {
  const selected = options.find(option => option.id === avatar[property]);
  return (
    <fieldset className="player-setup__choices">
      <legend>{label}<span>{selected?.label}</span></legend>
      <div className={swatches ? "player-setup__swatches" : "player-setup__grid"}>
        {options.map(option => {
          const preview = { ...avatar, [property]: option.id };
          // Feature cards reveal the eyes/mouth even when the full avatar wears a mask or shades.
          if (property === "eyeStyle" || property === "mouthStyle") preview.accessory = "none";
          return (
            <label key={option.id} className={`player-setup__option${swatches ? " player-setup__option--swatch" : ""}`}>
              <input type="radio" name={`avatar-${property}`} value={option.id} checked={avatar[property] === option.id}
                onClick={() => {
                  if (avatar[property] === option.id && options[0]) {
                    onChange(property, options[0].id);
                  }
                }}
                onChange={() => onChange(property, option.id)} aria-label={`${label}: ${option.label}`} />
              <span className="player-setup__option-art" style={swatches ? { backgroundColor: avatarDisplayColor(property, option.id) } : undefined}>
                {!swatches && <AvatarArtwork avatar={preview} detail={property} />}
                {avatar[property] === option.id && <span className="player-setup__check"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>}
              </span>
              <span className="player-setup__option-name">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
