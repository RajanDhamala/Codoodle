import { sanitizeAvatarConfig, type AvatarConfig } from "../Utils/guestProfile";

export const AvatarBadge = ({
  avatar,
  name,
  className = "h-10 w-10",
}: {
  avatar?: AvatarConfig;
  name?: string;
  className?: string;
}) => {
  const safeAvatar = sanitizeAvatarConfig(avatar);

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 ${className}`}
      aria-label={name ? `${name} avatar` : "Player avatar"}
      role="img"
    >
      <AvatarSvg avatar={safeAvatar} />
    </span>
  );
};

const AvatarSvg = ({ avatar }: { avatar: AvatarConfig }) => {
  const eyeStroke = "#082f49";
  const mouthStroke = "#082f49";

  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <rect width="96" height="96" rx="18" fill={avatar.background} />
      {avatar.pattern === "stripes" && (
        <g opacity="0.22" stroke="#ffffff" strokeWidth="6" strokeLinecap="round">
          <path d="M-6 74 74-6" />
          <path d="M18 102 102 18" />
          <path d="M-10 34 34-10" />
        </g>
      )}
      {avatar.pattern === "dots" && (
        <g fill="#ffffff" opacity="0.18">
          <circle cx="20" cy="20" r="4" />
          <circle cx="76" cy="22" r="3" />
          <circle cx="17" cy="70" r="3" />
          <circle cx="78" cy="75" r="5" />
          <circle cx="48" cy="14" r="2.5" />
        </g>
      )}

      <path d="M19 86c5-20 17-31 29-31s24 11 29 31H19Z" fill={avatar.bodyColor} />
      <circle cx="48" cy="39" r="22" fill={avatar.bodyColor} />

      {avatar.hairStyle === "short" && (
        <path d="M27 38c1-17 12-27 27-25 12 2 19 11 18 25-12-8-30-9-45 0Z" fill={avatar.hairColor} />
      )}
      {avatar.hairStyle === "spiky" && (
        <path d="m25 38 7-20 8 12 8-18 8 18 8-12 7 20c-14-8-32-8-46 0Z" fill={avatar.hairColor} />
      )}
      {avatar.hairStyle === "curly" && (
        <g fill={avatar.hairColor}>
          <circle cx="29" cy="34" r="8" />
          <circle cx="38" cy="23" r="9" />
          <circle cx="50" cy="21" r="10" />
          <circle cx="62" cy="25" r="9" />
          <circle cx="68" cy="36" r="8" />
        </g>
      )}
      {avatar.hairStyle === "cap" && (
        <g fill={avatar.hairColor}>
          <path d="M27 36c2-15 14-24 29-21 10 2 16 10 16 21H27Z" />
          <path d="M58 34h23c2 0 4 2 4 4s-2 4-4 4H56Z" />
        </g>
      )}

      {avatar.eyeStyle === "happy" && (
        <g fill="none" stroke={eyeStroke} strokeWidth="4" strokeLinecap="round">
          <path d="M33 37c3-4 8-4 11 0" />
          <path d="M52 37c3-4 8-4 11 0" />
        </g>
      )}
      {avatar.eyeStyle === "wide" && (
        <g fill="#f8fafc" stroke={eyeStroke} strokeWidth="3">
          <circle cx="38" cy="38" r="5" />
          <circle cx="58" cy="38" r="5" />
          <circle cx="38" cy="38" r="1.8" fill={eyeStroke} />
          <circle cx="58" cy="38" r="1.8" fill={eyeStroke} />
        </g>
      )}
      {avatar.eyeStyle === "sleepy" && (
        <g stroke={eyeStroke} strokeWidth="4" strokeLinecap="round">
          <path d="M33 38h11" />
          <path d="M53 38h11" />
        </g>
      )}
      {avatar.eyeStyle === "wink" && (
        <g stroke={eyeStroke} strokeWidth="4" strokeLinecap="round" fill="#f8fafc">
          <path d="M33 38h11" />
          <circle cx="58" cy="38" r="5" />
          <circle cx="58" cy="38" r="1.8" fill={eyeStroke} stroke="none" />
        </g>
      )}

      {avatar.accessory === "glasses" && (
        <g fill="none" stroke="#020617" strokeWidth="3">
          <circle cx="38" cy="39" r="9" />
          <circle cx="58" cy="39" r="9" />
          <path d="M47 39h2" />
        </g>
      )}
      {avatar.accessory === "mask" && (
        <path d="M31 40h34v14c-8 7-25 7-34 0V40Z" fill="#0f172a" opacity="0.82" />
      )}

      {avatar.mouthStyle === "smile" && (
        <path d="M37 50c5 8 17 8 22 0" fill="none" stroke={mouthStroke} strokeWidth="4" strokeLinecap="round" />
      )}
      {avatar.mouthStyle === "flat" && (
        <path d="M38 53h20" stroke={mouthStroke} strokeWidth="4" strokeLinecap="round" />
      )}
      {avatar.mouthStyle === "open" && (
        <ellipse cx="48" cy="54" rx="8" ry="6" fill={mouthStroke} />
      )}
      {avatar.mouthStyle === "smirk" && (
        <path d="M38 52c6 4 14 4 21-2" fill="none" stroke={mouthStroke} strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
};
