import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Brush,
  UserRound,
  UsersRound,
  Vote,
} from "lucide-react";

import RoomHostControls from "./RoomHostControls";
import { useRoomHost } from "../hooks/useRoomHost";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import type { GameSettings } from "./GameTypes";
import { useLocation, useNavigate } from "react-router-dom";
import { createSocket } from "../Utils/socket";
import { GuestProfileSetup } from "./GuestProfileSetup";
import type { GuestProfile } from "../Utils/guestProfile";

type LobbyLocationState = {
  openProfileSetup?: boolean;
  returnTo?: string;
};

const pendingProfileReturnKey = "coloodle:pending-profile-return";

const normalizeProfileReturnTo = (returnTo?: string | null) => {
  if (!returnTo) return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;

  return returnTo;
};

const readPendingProfileReturn = () => {
  if (typeof window === "undefined") return null;

  return normalizeProfileReturnTo(
    window.sessionStorage.getItem(pendingProfileReturnKey),
  );
};

const savePendingProfileReturn = (returnTo: string | null) => {
  if (typeof window === "undefined") return;

  if (returnTo) {
    window.sessionStorage.setItem(pendingProfileReturnKey, returnTo);
    return;
  }

  window.sessionStorage.removeItem(pendingProfileReturnKey);
};

const strokeAnimationStyle = (dash: number, delay: string): CSSProperties =>
  ({
    "--dash-length": dash,
    animationDelay: delay,
  }) as CSSProperties;

const LobbyPage = () => {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance);
  const clearSocketInstance = useSocketStore(
    (state) => state.clearSocketInstance,
  );
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);
  const navigate = useNavigate();
  const location = useLocation();
  const profileSetupState = location.state as LobbyLocationState | null;
  const routeProfileReturnTo = normalizeProfileReturnTo(
    profileSetupState?.returnTo,
  );

  const { activeUser, settingsDraft, setSettingsDraft, isSocketReady, isCreating, createRoom } = useRoomHost();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const [profileRedirect, setProfileRedirect] = useState<string | null>(
    () => routeProfileReturnTo ?? readPendingProfileReturn(),
  );

  const resetProfile = () => {
    setProfileRedirect(null);
    savePendingProfileReturn(null);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileRedirect(null);
    savePendingProfileReturn(null);

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    setIsProfileModalOpen(false);

    socketInstance?.disconnect();
    clearSocketInstance(socketInstance);
    setSocketInstance(createSocket());

    const redirect =
      profileRedirect ?? routeProfileReturnTo ?? readPendingProfileReturn();
    setProfileRedirect(null);
    savePendingProfileReturn(null);

    if (redirect) {
      navigate(redirect, { replace: true });
      return;
    }

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  useEffect(() => {
    if (isProfileModalOpen) profileDialog.current?.showModal();
  }, [isProfileModalOpen]);

  useEffect(() => {
    if (!profileSetupState?.openProfileSetup) return;

    const redirect = normalizeProfileReturnTo(profileSetupState.returnTo);
    setIsProfileModalOpen(true);
    setProfileRedirect(redirect);
    savePendingProfileReturn(redirect);
  }, [profileSetupState?.openProfileSetup, profileSetupState?.returnTo]);


  return (
    <>
      <LobbyMotionStyles />

      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] px-4 pb-10 text-[#0f172a] [font-family:Inter,ui-sans-serif,system-ui] sm:px-6 lg:px-8">
        <header className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center justify-between border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-[#e5e7eb] bg-white elev-1">
              <img
                src="/coloodle.svg"
                alt=""
                className="h-10 w-10 object-contain"
                aria-hidden="true"
              />
            </span>
            <div className="leading-none">
              <p className="text-xl font-bold tracking-[-0.02em] [font-family:'Space_Grotesk',Inter,ui-sans-serif]">
                Coloodle
              </p>
              <p className="mt-1 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b] sm:block">
                Drawing imposter
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetProfile}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-semibold text-[#334155] elev-1 transition hover:border-[#0f172a] hover:text-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
          >
            <UserRound className="h-4 w-4" />
            {guestProfile ? "Change player" : "Set up player"}
          </button>
        </header>

        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)]">
          <div className="min-w-0">
            <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-0.02em] text-[#0f172a] [font-family:'Space_Grotesk',Inter,ui-sans-serif] sm:text-6xl lg:text-7xl">
              Draw together. Spot the imposter.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">
              Host a clean sketch table for friends. Artists draw the same
              word while the imposter only sees the category and tries to blend
              in.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <GameSignal
                icon={Brush}
                title="Stroke economy"
                value={`${settingsDraft.maxStrokesPerTurn} per turn`}
              />
              <GameSignal
                icon={UsersRound}
                title="Table size"
                value={`${settingsDraft.maxPlayers} players max`}
              />
              <GameSignal
                icon={Vote}
                title="Vote pressure"
                value={`${settingsDraft.turnCyclesBeforeVote} drawing cycles`}
              />
            </div>

            <SketchTable
              settings={settingsDraft}
              isSocketReady={isSocketReady}
            />
          </div>

          <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-4 text-[#0f172a] elev-accent sm:p-5">
            <RoomHostControls
              guestProfile={guestProfile}
              activeUser={activeUser}
              settingsDraft={settingsDraft}
              setSettingsDraft={setSettingsDraft}
              isSocketReady={isSocketReady}
              isCreating={isCreating}
              resetProfile={resetProfile}
              createRoom={() => createRoom(resetProfile)}
            />
          </aside>
        </section>
      </main>

      {isProfileModalOpen && (
        <dialog
          ref={profileDialog}
          className="player-setup-dialog"
          aria-labelledby="player-setup-title"
          onCancel={(event) => event.preventDefault()}
        >
          <GuestProfileSetup onSave={saveProfile} onClose={closeProfileModal} variant="modal" initialProfile={guestProfile} />
        </dialog>
      )}
    </>
  );
};

const LobbyMotionStyles = () => (
  <style>{`
    @keyframes lobby-solar-stroke-one {
      0% {
        opacity: 0;
        stroke-dashoffset: var(--dash-length);
      }
      4% {
        opacity: 1;
      }
      18% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
      100% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
    }

    @keyframes lobby-solar-stroke-two {
      0%, 20% {
        opacity: 0;
        stroke-dashoffset: var(--dash-length);
      }
      24% {
        opacity: 1;
      }
      40% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
      100% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
    }

    @keyframes lobby-solar-stroke-three {
      0%, 42% {
        opacity: 0;
        stroke-dashoffset: var(--dash-length);
      }
      46% {
        opacity: 1;
      }
      62% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
      100% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
    }

    @keyframes lobby-solar-stroke-four {
      0%, 64% {
        opacity: 0;
        stroke-dashoffset: var(--dash-length);
      }
      68% {
        opacity: 1;
      }
      84% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
      100% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
    }

    @keyframes lobby-card-twitch {
      0%, 100% {
        transform: translateY(0) rotate(-1.5deg);
      }
      50% {
        transform: translateY(-4px) rotate(1deg);
      }
    }

    @keyframes lobby-active-dot {
      0%, 100% {
        transform: translate3d(0, 0, 0);
        opacity: 0;
      }
      6%, 18% {
        transform: translate3d(-86px, 8px, 0);
        opacity: 1;
      }
      28%, 40% {
        transform: translate3d(126px, -58px, 0);
        opacity: 1;
      }
      50%, 62% {
        transform: translate3d(172px, 44px, 0);
        opacity: 1;
      }
      72%, 84% {
        transform: translate3d(-132px, 52px, 0);
        opacity: 1;
      }
      91% {
        opacity: 0;
      }
    }

    .lobby-solar-stroke {
      stroke-dasharray: var(--dash-length);
      stroke-dashoffset: var(--dash-length);
    }

    .lobby-solar-stroke-one {
      animation: lobby-solar-stroke-one 8s ease-in-out infinite;
    }

    .lobby-solar-stroke-two {
      animation: lobby-solar-stroke-two 8s ease-in-out infinite;
    }

    .lobby-solar-stroke-three {
      animation: lobby-solar-stroke-three 8s ease-in-out infinite;
    }

    .lobby-solar-stroke-four {
      animation: lobby-solar-stroke-four 8s ease-in-out infinite;
    }

    .lobby-active-dot {
      animation: lobby-active-dot 8s ease-in-out infinite;
    }

    .lobby-hint-card {
      animation: lobby-card-twitch 4.5s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .lobby-solar-stroke,
      .lobby-active-dot,
      .lobby-hint-card {
        animation: none !important;
      }

      .lobby-solar-stroke {
        opacity: 1;
        stroke-dashoffset: 0;
      }

      .lobby-active-dot {
        display: none;
      }
    }
  `}</style>
);

const SketchTable = ({
  settings,
  isSocketReady,
}: {
  settings: GameSettings;
  isSocketReady: boolean;
}) => (
  <div className="relative mt-8 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-3 text-[#0f172a] elev-accent sm:p-4">
    <svg
      viewBox="0 0 360 390"
      className="block h-[390px] w-full sm:hidden"
      role="img"
      aria-label="Animated mobile demo drawing of the word solar system with the imposter only seeing the hint space"
    >
      <rect x="0" y="0" width="360" height="390" rx="8" fill="#f3f4f6" />

      <g transform="rotate(-2 78 50)">
        <g className="lobby-hint-card">
          <rect
            x="16"
            y="24"
            width="142"
            height="62"
            rx="7"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="3"
          />
          <path
            d="M30 48 H144"
            stroke="#0f766e"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.22"
          />
          <text x="30" y="47" fontSize="12" fontWeight="900" fill="#134e4a">
            Artists see
          </text>
          <text x="30" y="70" fontSize="20" fontWeight="900" fill="#0f172a">
            solar system
          </text>
        </g>
      </g>

      <g transform="rotate(2 267 50)">
        <rect
          x="190"
          y="24"
          width="152"
          height="62"
          rx="7"
          fill="#0f766e"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <text x="203" y="47" fontSize="12" fontWeight="900" fill="#134e4a">
          Imposter hint
        </text>
        <text x="203" y="72" fontSize="22" fontWeight="900" fill="#0f172a">
          space
        </text>
      </g>

      <g transform="translate(0 12)">
        <ellipse
          cx="180"
          cy="194"
          rx="68"
          ry="32"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="180"
          cy="194"
          rx="108"
          ry="52"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="180"
          cy="194"
          rx="146"
          ry="72"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />

        <g
          className="lobby-solar-stroke lobby-solar-stroke-one"
          style={strokeAnimationStyle(360, "0s")}
        >
          <circle
            cx="180"
            cy="194"
            r="31"
            fill="#f2c94c"
            stroke="#0f172a"
            strokeWidth="6"
          />
          <path
            d="M180 144 V122 M180 266 V244 M130 194 H110 M250 194 H230 M144 158 L128 142 M232 250 L216 234 M144 230 L128 246 M232 138 L216 154"
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeWidth="7"
          />
        </g>

        <ellipse
          cx="180"
          cy="194"
          rx="68"
          ry="32"
          fill="none"
          stroke="#7c5cff"
          strokeLinecap="round"
          strokeWidth="7"
          className="lobby-solar-stroke lobby-solar-stroke-two"
          style={strokeAnimationStyle(330, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-two"
          style={strokeAnimationStyle(84, "0s")}
        >
          <circle
            cx="248"
            cy="194"
            r="9"
            fill="#9b8a79"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <text x="230" y="176" fontSize="15" fontWeight="900" fill="#0f172a">
            Mercury
          </text>
        </g>

        <ellipse
          cx="180"
          cy="194"
          rx="108"
          ry="52"
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="7"
          className="lobby-solar-stroke lobby-solar-stroke-three"
          style={strokeAnimationStyle(510, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-three"
          style={strokeAnimationStyle(92, "0s")}
        >
          <circle
            cx="103"
            cy="230"
            r="14"
            fill="#f97316"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <path
            d="M92 224 C101 233 112 234 118 226"
            fill="none"
            stroke="#f3f4f6"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="72" y="260" fontSize="16" fontWeight="900" fill="#0f172a">
            Venus
          </text>
        </g>

        <ellipse
          cx="180"
          cy="194"
          rx="146"
          ry="72"
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="7"
          className="lobby-solar-stroke lobby-solar-stroke-four"
          style={strokeAnimationStyle(690, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-four"
          style={strokeAnimationStyle(100, "0s")}
        >
          <circle
            cx="296"
            cy="238"
            r="15"
            fill="#0f766e"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <path
            d="M286 232 C295 238 305 238 312 230 M284 244 C294 250 306 250 313 242"
            fill="none"
            stroke="#134e4a"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="276" y="270" fontSize="16" fontWeight="900" fill="#0f172a">
            Earth
          </text>
        </g>
      </g>

      <g transform="translate(20 318)">
        <rect
          x="0"
          y="0"
          width="320"
          height="42"
          rx="7"
          fill="#ffffff"
          stroke="#0f172a"
          strokeOpacity="0.18"
        />
        <text x="13" y="18" fontSize="12" fontWeight="900" fill="#64748b">
          Draw order
        </text>
        <circle cx="18" cy="30" r="5" fill="#0f766e" />
        <text x="29" y="34" fontSize="12" fontWeight="900" fill="#0f172a">
          sun
        </text>
        <circle cx="76" cy="30" r="5" fill="#7c5cff" />
        <text x="87" y="34" fontSize="12" fontWeight="900" fill="#0f172a">
          Mercury
        </text>
        <circle cx="164" cy="30" r="5" fill="#0f766e" />
        <text x="175" y="34" fontSize="12" fontWeight="900" fill="#0f172a">
          Venus
        </text>
        <circle cx="240" cy="30" r="5" fill="#0f766e" />
        <text x="251" y="34" fontSize="12" fontWeight="900" fill="#0f172a">
          Earth
        </text>
      </g>
    </svg>

    <svg
      viewBox="0 0 640 430"
      className="hidden w-full sm:block sm:h-[470px]"
      role="img"
      aria-label="Animated demo drawing of the word solar system with the imposter only seeing the hint space"
    >
      <rect x="0" y="0" width="640" height="430" rx="8" fill="#f3f4f6" />
      <path d="M34 358 H606" stroke="#0f172a" strokeWidth="2" />

      <g transform="rotate(-2 126 58)">
        <g className="lobby-hint-card">
          <rect
            x="32"
            y="28"
            width="194"
            height="76"
            rx="8"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="3"
          />
          <path
            d="M48 56 H210"
            stroke="#0f766e"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.22"
          />
          <text x="50" y="55" fontSize="14" fontWeight="900" fill="#134e4a">
            Artists see
          </text>
          <text x="50" y="84" fontSize="25" fontWeight="900" fill="#0f172a">
            solar system
          </text>
        </g>
      </g>

      <g transform="rotate(2 514 62)">
        <rect
          x="428"
          y="28"
          width="180"
          height="76"
          rx="8"
          fill="#0f766e"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <text x="446" y="55" fontSize="14" fontWeight="900" fill="#134e4a">
          Imposter hint
        </text>
        <text x="446" y="84" fontSize="27" fontWeight="900" fill="#0f172a">
          space
        </text>
      </g>

      <g transform="translate(0 18)">
        <ellipse
          cx="320"
          cy="212"
          rx="98"
          ry="46"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="320"
          cy="212"
          rx="154"
          ry="74"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="320"
          cy="212"
          rx="214"
          ry="102"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          opacity="0.12"
        />

        <g
          className="lobby-solar-stroke lobby-solar-stroke-one"
          style={strokeAnimationStyle(460, "0s")}
        >
          <circle
            cx="320"
            cy="212"
            r="36"
            fill="#f2c94c"
            stroke="#0f172a"
            strokeWidth="6"
          />
          <path
            d="M320 151 V127 M320 297 V273 M259 212 H235 M405 212 H381 M276 168 L258 150 M382 274 L364 256 M276 256 L258 274 M382 150 L364 168"
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeWidth="8"
          />
        </g>

        <ellipse
          cx="320"
          cy="212"
          rx="98"
          ry="46"
          fill="none"
          stroke="#7c5cff"
          strokeLinecap="round"
          strokeWidth="8"
          className="lobby-solar-stroke lobby-solar-stroke-two"
          style={strokeAnimationStyle(480, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-two"
          style={strokeAnimationStyle(72, "0s")}
        >
          <circle
            cx="418"
            cy="212"
            r="10"
            fill="#9b8a79"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <text x="432" y="206" fontSize="15" fontWeight="900" fill="#0f172a">
            Mercury
          </text>
        </g>

        <ellipse
          cx="320"
          cy="212"
          rx="154"
          ry="74"
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="8"
          className="lobby-solar-stroke lobby-solar-stroke-three"
          style={strokeAnimationStyle(720, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-three"
          style={strokeAnimationStyle(92, "0s")}
        >
          <circle
            cx="210"
            cy="264"
            r="15"
            fill="#f97316"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <path
            d="M198 258 C207 267 219 268 224 260"
            fill="none"
            stroke="#f3f4f6"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="154" y="292" fontSize="15" fontWeight="900" fill="#0f172a">
            Venus
          </text>
        </g>

        <ellipse
          cx="320"
          cy="212"
          rx="214"
          ry="102"
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="8"
          className="lobby-solar-stroke lobby-solar-stroke-four"
          style={strokeAnimationStyle(980, "0s")}
        />
        <g
          className="lobby-solar-stroke lobby-solar-stroke-four"
          style={strokeAnimationStyle(108, "0s")}
        >
          <circle
            cx="488"
            cy="276"
            r="17"
            fill="#0f766e"
            stroke="#0f172a"
            strokeWidth="4"
          />
          <path
            d="M478 270 C487 276 498 276 505 268 M475 282 C485 288 498 288 506 280"
            fill="none"
            stroke="#134e4a"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="505" y="306" fontSize="15" fontWeight="900" fill="#0f172a">
            Earth
          </text>
        </g>
      </g>

      <g transform="translate(40 374)">
        <rect
          x="0"
          y="0"
          width="560"
          height="38"
          rx="7"
          fill="#ffffff"
          stroke="#0f172a"
          strokeOpacity="0.18"
        />
        <text x="18" y="24" fontSize="14" fontWeight="900" fill="#64748b">
          Draw order
        </text>
        <circle cx="132" cy="19" r="7" fill="#0f766e" />
        <text x="146" y="24" fontSize="14" fontWeight="900" fill="#0f172a">
          sun
        </text>
        <circle cx="218" cy="19" r="7" fill="#7c5cff" />
        <text x="232" y="24" fontSize="14" fontWeight="900" fill="#0f172a">
          Mercury orbit
        </text>
        <circle cx="359" cy="19" r="7" fill="#0f766e" />
        <text x="373" y="24" fontSize="14" fontWeight="900" fill="#0f172a">
          Venus
        </text>
        <circle cx="438" cy="19" r="7" fill="#0f766e" />
        <text x="452" y="24" fontSize="14" fontWeight="900" fill="#0f172a">
          Earth
        </text>
      </g>
    </svg>

    <div className="grid gap-2 border-t border-[#e5e7eb] pt-3 sm:grid-cols-3">
      <SketchMetric label="Players" value={`3-${settings.maxPlayers}`} />
      <SketchMetric
        label="Turns"
        value={`${settings.turnCyclesBeforeVote} cycles`}
      />
      <SketchMetric
        label="Server"
        value={isSocketReady ? "ready" : "connecting"}
      />
    </div>
  </div>
);

const SketchMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">{label}</p>
    <p className="mt-1 text-sm font-bold text-[#0f172a] tabular-nums">{value}</p>
  </div>
);

const GameSignal = ({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Brush;
  title: string;
  value: string;
}) => (
  <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 elev-1">
    <div className="flex items-center gap-2 text-[#0f766e]">
      <Icon className="h-4 w-4" />
      <p className="text-sm font-bold">{title}</p>
    </div>
    <p className="mt-2 text-sm font-semibold text-[#334155] tabular-nums">{value}</p>
  </div>
);

export default LobbyPage;
