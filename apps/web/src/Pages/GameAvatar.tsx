import { memo, type CSSProperties } from "react";
import { sanitizeAvatarConfig, type AvatarConfig } from "../Utils/guestProfile";
import { avatarDisplayColor } from "../Utils/avatarAppearance";

type AvatarDimension = number | string;

export const AvatarBadge = memo(function AvatarBadge({ avatar, name, className = "h-10 w-10", style }: {
  avatar?: AvatarConfig | string;
  name?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-2xl ${className}`} style={style}
      aria-label={name ? `${name} avatar` : "Player avatar"} role="img">
      <AvatarArtwork avatar={sanitizeAvatarConfig(avatar)} />
    </span>
  );
});

export const AvatarFromCode = memo(function AvatarFromCode({ avatarCode, name, width = 64, height = 64, className = "" }: {
  avatarCode: string;
  name?: string;
  width?: AvatarDimension;
  height?: AvatarDimension;
  className?: string;
}) {
  return <AvatarBadge avatar={avatarCode} name={name} className={className} style={{ width, height }} />;
});

export const AvatarArtwork = memo(function AvatarArtwork({ avatar, detail }: {
  avatar: AvatarConfig;
  detail?: keyof AvatarConfig;
}) {
  const skin = avatarDisplayColor("bodyColor", avatar.bodyColor);
  const hair = avatarDisplayColor("hairColor", avatar.hairColor);
  const background = avatarDisplayColor("background", avatar.background);
  const ink = "#342c2c";
  const longHair = avatar.hairStyle === "long" || avatar.hairStyle === "bob";
  const viewBox = detail === "eyeStyle" ? "35 48 90 42" : detail === "mouthStyle" ? "48 82 64 38" : "0 0 160 160";

  return (
    <svg viewBox={viewBox} className="h-full w-full" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill={background} d="M0 0h160v160H0z" />
      {avatar.pattern === "stripes" && <g stroke="#fff" strokeWidth="16" opacity=".22"><path d="m-30 100 130-130M10 170 160 20M100 180l90-90" /></g>}
      {avatar.pattern === "dots" && <g fill="#fff" opacity=".42">{[20, 50, 80, 110, 140].map(x => [20, 50, 80, 110, 140].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" />))}</g>}
      {avatar.pattern === "waves" && <g stroke="#fff" strokeWidth="2" opacity=".4"><path d="M-10 30q30-25 60 0t60 0 60 0M-10 65q30-25 60 0t60 0 60 0M-10 100q30-25 60 0t60 0 60 0M-10 135q30-25 60 0t60 0 60 0" /></g>}
      <circle cx="80" cy="78" r="60" fill="#fff" opacity=".14" />
      {longHair && <path d={avatar.hairStyle === "long" ? "M40 69c-8-69 89-76 83 1l8 66c-28 12-76 12-101 0Z" : "M39 66c-5-65 88-69 84 0l2 42c-19 16-72 16-91 0Z"} fill={hair} />}
      {avatar.hairStyle === "bun" && <g fill={hair}><circle cx="80" cy="23" r="18" /><path d="M39 62c-5-55 88-55 83 0v17H39Z" /></g>}
      <path d="M17 160c2-27 14-39 44-43h38c30 4 42 16 44 43" fill="#4d6265" />
      <path d="M61 100v18c0 17 38 17 38 0v-18" fill={skin} />
      <path d="M61 101h38v10c-13 10-27 7-38-1Z" fill="#38201c" opacity=".14" />
      <path d="M59 118c5 15 37 15 42 0l8 3c-7 25-51 25-58 0Z" fill="#fff" opacity=".7" />
      <path d="m40 145-2 15m83-15 2 15" stroke="#273e42" strokeWidth="2" opacity=".35" />
      <g fill={skin}><ellipse cx="42" cy="77" rx="8" ry="12" /><ellipse cx="118" cy="77" rx="8" ry="12" /></g>
      <path d="M41 73q-4 5 2 9m76-9q4 5-2 9" stroke="#6c3f32" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      <path d="M43 56c0-38 74-38 74 0v25c0 24-19 38-37 38S43 105 43 81Z" fill={skin} />
      <path d="M44 57v24c0 24 19 38 36 38 5 0 11-1 15-4-30 3-44-23-45-47Z" fill="#59362c" opacity=".08" />
      <ellipse cx="57" cy="88" rx="9" ry="5" fill="#c66f64" opacity=".19" /><ellipse cx="104" cy="88" rx="9" ry="5" fill="#c66f64" opacity=".19" />
      <path d="m79 76-3 13q3 3 7 0" stroke="#815044" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      <g stroke={hair} strokeWidth={avatar.eyeStyle === "bold" ? 4 : 2.7} strokeLinecap="round">
        <path d={avatar.eyeStyle === "bold" ? "m53 59 15 4m24 0 15-4" : "M53 61q7-4 14-1m26 0q7-3 14 1"} />
      </g>
      <g stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {avatar.eyeStyle === "happy" && <path d="M53 73q7-9 14 0m26 0q7-9 14 0" />}
        {avatar.eyeStyle === "sleepy" && <path d="M53 72q7 5 14 0m26 0q7 5 14 0" />}
        {(avatar.eyeStyle === "wide" || avatar.eyeStyle === "wink") && <>
          {avatar.eyeStyle === "wide" ? <><ellipse cx="60" cy="73" rx="6" ry="7" fill="#fffaf1" strokeWidth="1.5" /><ellipse cx="61" cy="74" rx="2.6" ry="4" fill={ink} stroke="none" /><circle cx="62" cy="72" r="1" fill="white" stroke="none" /></> : <path d="m54 70 12 4-12 2" />}
          <ellipse cx="100" cy="73" rx="6" ry="7" fill="#fffaf1" strokeWidth="1.5" /><ellipse cx="101" cy="74" rx="2.6" ry="4" fill={ink} stroke="none" /><circle cx="102" cy="72" r="1" fill="white" stroke="none" />
        </>}
        {(avatar.eyeStyle === "soft" || avatar.eyeStyle === "bold") && <><path d="M53 71q7-5 14 0m26 0q7-5 14 0" /><ellipse cx="61" cy="73" rx="2.3" ry="3.3" fill={ink} stroke="none" /><ellipse cx="101" cy="73" rx="2.3" ry="3.3" fill={ink} stroke="none" /></>}
      </g>
      <g stroke="#693f39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {avatar.mouthStyle === "smile" && <path d="M68 98q12 11 24 0" />}
        {avatar.mouthStyle === "flat" && <path d="M71 101h18" />}
        {avatar.mouthStyle === "smirk" && <path d="M70 101q14 4 22-6" />}
        {avatar.mouthStyle === "open" && <ellipse cx="80" cy="101" rx="5" ry="7" fill="#693f39" />}
        {avatar.mouthStyle === "grin" && <><path d="M66 96q14 4 28 0c-2 18-26 18-28 0Z" fill="#693f39" /><path d="M69 98q11 2 22 0l-2 5H71Z" fill="#fffaf1" stroke="none" /></>}
        {avatar.mouthStyle === "pout" && <><path d="M73 100q7-5 14 0-7 7-14 0Z" fill="#b66f65" stroke="none" /><path d="M73 100h14" strokeWidth="1.5" /></>}
      </g>
      <g fill={hair}>
        {avatar.hairStyle === "short" && <><path d="M41 72c-8-18-4-39 12-45 15-16 51-14 64 4 8 12 7 29 1 41l-5-25c-22 10-36 6-45-5-5 12-13 16-23 16Z" /><path d="M53 34q22-15 46-4" stroke="#fff" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" /></>}
        {avatar.hairStyle === "spiky" && <path d="m40 69-4-28 12 1-1-20 15 7 9-15 13 12 17-11 4 15 18-1-7 16 6 14-5 16-6-25-15-7-15 8-16-8-14 11Z" />}
        {avatar.hairStyle === "curly" && <><path d="M39 75V44c0-34 83-36 83 2v29l-9-22H48Z" />{[[43,44,12],[49,31,13],[65,25,13],[82,23,14],[100,27,13],[113,38,13],[120,51,10],[41,59,8]].map(([cx,cy,r],i)=><circle key={i} cx={cx} cy={cy} r={r} />)}<path d="M53 29q5-7 12-3m11-8q7-4 12 1m16 13q7-2 9 5" stroke="white" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round" /></>}
        {avatar.hairStyle === "bob" && <><path d="M39 68c-7-62 90-67 85 0l-12-21c-19 6-29-7-33-17-6 16-17 27-32 28l-3 35Z" /><path d="M42 66v32m76-33v34" stroke="#fff" strokeOpacity=".12" strokeWidth="2" /></>}
        {avatar.hairStyle === "long" && <><path d="M39 73c-9-72 91-74 85 0l-9-21c-19-2-30-14-34-22-5 18-19 25-34 27l-2 20Z" /><path d="M40 92q-5 20 0 33m80-37q6 20 3 37" stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round" /></>}
        {avatar.hairStyle === "bun" && <><path d="M40 69c-9-49 83-63 83-5l-6 10-7-29q-29 16-58-1l-7 30Z" /><path d="M51 38q26-21 53-4M69 18q8-8 18-2" stroke="#fff" strokeOpacity=".13" strokeWidth="2" strokeLinecap="round" /></>}
        {avatar.hairStyle === "cap" && <><path d="M39 54c-1-26 18-38 42-38 24 0 39 16 39 38Z" /><path d="M36 50c25-9 62-9 88 0l7 10c-30-8-64-7-95-1Z" /><path d="M80 18q-7 13-6 28" stroke="#fff" strokeOpacity=".22" strokeWidth="2" /><rect x="82" y="30" width="13" height="9" rx="3" fill="#fff" opacity=".65" /></>}
      </g>
      {avatar.accessory === "freckles" && <g fill="#81503c" opacity=".55">{[[51,85],[58,82],[64,85],[96,85],[103,82],[110,85]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="1.5" />)}</g>}
      {(avatar.accessory === "glasses" || avatar.accessory === "shades") && <g stroke={ink} strokeWidth="2.6">
        <rect x="47" y="64" width="27" height="20" rx={avatar.accessory === "glasses" ? 9 : 5} fill={avatar.accessory === "shades" ? ink : "#fff"} fillOpacity={avatar.accessory === "shades" ? 1 : .1} />
        <rect x="87" y="64" width="27" height="20" rx={avatar.accessory === "glasses" ? 9 : 5} fill={avatar.accessory === "shades" ? ink : "#fff"} fillOpacity={avatar.accessory === "shades" ? 1 : .1} />
        <path d="M74 71q6-4 13 0m-46-3 6 1m67 0 6-1" />
        {avatar.accessory === "shades" && <path d="m53 69 6 0m34 0h6" stroke="#fff" strokeOpacity=".45" strokeLinecap="round" />}
      </g>}
      {avatar.accessory === "earrings" && <g stroke="#bc893a" strokeWidth="3"><ellipse cx="42" cy="92" rx="5" ry="8" /><ellipse cx="118" cy="92" rx="5" ry="8" /></g>}
      {avatar.accessory === "mask" && <><path d="m43 80 17 12m57-12-17 12" stroke="#fffaf1" strokeWidth="2" /><path d="M57 86q23 8 46 0v17q-23 22-46 0Z" fill="#ecf0e9" /><path d="M65 95q15 4 30 0m-28 7q13 4 26 0" stroke="#bdcbc5" strokeWidth="2" /></>}
    </svg>
  );
});
