import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Brush,
  Minus,
  Play,
  Plus,
  Settings2,
  UserRound,
  UsersRound,
  Vote,
  X,
} from "lucide-react";

import { AvatarBadge } from "./GameAvatar";
import useSocketStore from "../SocketStore";
import useUserStore from "../UserStore";
import { defaultGameSettings, type GameSettings, type User } from "./GameTypes";
import toast from "react-hot-toast";
import useRoomStore from "@/Zustand/RoomStore";
import { useLocation, useNavigate } from "react-router-dom";
import { createSocket } from "../Utils/socket";
import { GuestProfileSetup } from "./GuestProfileSetup";
import type { GuestProfile } from "../Utils/guestProfile";

type LobbyLocationState = {
  openProfileSetup?: boolean;
  returnTo?: string;
};

type CreateRoomResponse = {
  success?: boolean;
  roomId?: string;
  message?: string;
};

type NumericSettingKey =
  "maxPlayers" | "turnCyclesBeforeVote" | "maxStrokesPerTurn";

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const strokeAnimationStyle = (dash: number, delay: string): CSSProperties =>
  ({
    "--dash-length": dash,
    animationDelay: delay,
  }) as CSSProperties;

const LobbyPage = () => {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const currentUser = useUserStore((state) => state.currentUser);
  const socketInstance = useSocketStore((state) => state.socketInstance);
  const setSocketInstance = useSocketStore((state) => state.setSocketInstance);
  const clearSocketInstance = useSocketStore(
    (state) => state.clearSocketInstance,
  );
  const clearGuestProfile = useUserStore((state) => state.clearGuestProfile);
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);
  const { setRoomId } = useRoomStore();
  const navigate = useNavigate();
  const location = useLocation();
  const profileSetupState = location.state as LobbyLocationState | null;

  const activeUser = useMemo<User | null>(() => {
    if (currentUser) return currentUser;
    if (!guestProfile) return null;

    return {
      id: guestProfile.id,
      username: guestProfile.username,
      avatar: guestProfile.avatar,
    };
  }, [currentUser, guestProfile]);

  const [room, setRoom] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] =
    useState<GameSettings>(defaultGameSettings);
  const [isSocketReady, setIsSocketReady] = useState(() =>
    Boolean(socketInstance?.connected),
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRedirect, setProfileRedirect] = useState<string | null>(
    () => profileSetupState?.returnTo ?? null,
  );

  const createRoom = () => {
    if (!activeUser) {
      setProfileRedirect(null);
      setIsProfileModalOpen(true);
      return;
    }

    if (!socketInstance?.connected) {
      toast.error("Still connecting to the game server.");
      return;
    }

    socketInstance.emit(
      "create-group",
      { settings: settingsDraft, currentUser: activeUser },
      (data: CreateRoomResponse) => {
        if (!data?.success || !data.roomId) {
          toast.error(data?.message || "Failed to create room.");
          return;
        }

        setRoomId(data.roomId);
        setRoom(data.roomId);
        toast.success("Room created.");
        navigate(`/gameRoom/${data.roomId}`);
      },
    );
  };

  const resetProfile = () => {
    if (room) {
      toast.error("Leave the room before changing player.");
      return;
    }
    socketInstance?.disconnect();
    clearSocketInstance(socketInstance);
    clearGuestProfile();
    clearCurrentUser();
    setProfileRedirect(null);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileRedirect(null);

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    setIsProfileModalOpen(false);

    const redirect = profileRedirect;
    setProfileRedirect(null);

    if (redirect) {
      navigate(redirect, { replace: true });
      return;
    }

    if (profileSetupState?.openProfileSetup) {
      navigate("/lobby", { replace: true });
    }
  };

  useEffect(() => {
    if (!guestProfile) {
      setIsProfileModalOpen(true);
    }
  }, [guestProfile]);

  useEffect(() => {
    if (!profileSetupState?.openProfileSetup) return;

    setIsProfileModalOpen(true);
    setProfileRedirect(profileSetupState.returnTo ?? null);
  }, [profileSetupState?.openProfileSetup, profileSetupState?.returnTo]);

  useEffect(() => {
    if (!socketInstance) {
      setIsSocketReady(false);
      setSocketInstance(createSocket());
      return;
    }

    setIsSocketReady(socketInstance.connected);

    const handleConnect = () => setIsSocketReady(true);
    const handleDisconnect = () => setIsSocketReady(false);

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
    };
  }, [setSocketInstance, socketInstance]);

  return (
    <>
      <LobbyMotionStyles />

      <main className="min-h-screen overflow-hidden bg-[#171512] px-4 py-5 text-[#fff8e6] [font-family:Inter,ui-sans-serif,system-ui] sm:px-6 lg:px-8">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,248,230,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,248,230,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />

        <section className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-7xl items-center gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)]">
          <div className="min-w-0 py-4 lg:py-8">
            <div className="mb-6 inline-flex items-center gap-3 rounded-[18px] border border-[#fff8e6]/15 bg-[#fff8e6]/[0.045] p-2 pr-4 shadow-[0_12px_0_rgba(0,0,0,0.38)]">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border-2 border-[#050505] bg-[#fff8e6] shadow-[4px_4px_0_#050505]">
                <img
                  src="/coloodle.svg"
                  alt=""
                  className="h-12 w-12 object-contain"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-black leading-none text-[#fff8e6] [font-family:'Trebuchet_MS',ui-sans-serif,system-ui]">
                  Coloodle
                </span>
                <span className="mt-1 block text-xs font-black uppercase tracking-[0.2em] text-[#2cd3c5]">
                  Drawing imposter lobby
                </span>
              </span>
            </div>
            <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[0.95] text-[#fff8e6] [font-family:'Trebuchet_MS',ui-sans-serif,system-ui] sm:text-6xl lg:text-7xl">
              Sketch around the secret.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#d8cab0] sm:text-lg">
              Host a private table for friends. Everyone draws from the same
              word, while one player only gets the hint and has to blend in.
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

          <aside className="rounded-lg border-2 border-[#171512] bg-[#fff1cf] p-4 text-[#171512] shadow-[14px_14px_0_#050505] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#a5412c]">
                  Host controls
                </p>
                <h2 className="mt-1 text-3xl font-black [font-family:'Trebuchet_MS',ui-sans-serif,system-ui]">
                  Create room
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#171512] bg-[#2cd3c5] text-[#171512]">
                <Settings2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-y-2 border-[#171512] py-4">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarBadge
                  avatar={guestProfile?.avatar}
                  name={guestProfile?.username}
                  className="h-12 w-12 rounded-md border-2 border-[#171512]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#6f5f45]">Playing as</p>
                  <p className="truncate text-lg font-black">
                    {guestProfile?.username || "No player yet"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetProfile}
                className="inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-[#171512] bg-[#fffdf4] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#171512] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#171512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2cd3c5]"
              >
                <UserRound className="h-4 w-4" />
                {guestProfile ? "Change" : "Set up"}
              </button>
            </div>

            <SettingsControls
              settings={settingsDraft}
              setSettings={setSettingsDraft}
              disabled={false}
            />

            <button
              type="button"
              className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-[#171512] bg-[#ff5b3d] px-4 text-base font-black text-[#171512] shadow-[5px_5px_0_#171512] transition hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#171512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2cd3c5]"
              onClick={createRoom}
            >
              <Play className="h-5 w-5 fill-[#171512]" />
              {!activeUser
                ? "Set up player first"
                : isSocketReady
                  ? "Create game room"
                  : "Connecting server"}
            </button>

            <p className="mt-4 rounded-md text-center border border-[#171512]/20 bg-[#fffdf4] px-3 py-2 text-sm font-semibold text-[#6f5f45]">
              Invite your friend and have fun
            </p>
          </aside>
        </section>
      </main>

      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171512]/85 px-3 py-4 backdrop-blur-sm sm:px-6"
          onClick={closeProfileModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Player setup"
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProfileModal}
              className="absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-md border-2 border-[#4a4032] bg-[#191816] text-[#fff8e6] shadow-[4px_4px_0_#050505] transition hover:-translate-y-0.5 hover:border-[#2cd3c5] sm:-right-3 sm:-top-3"
              aria-label="Close player setup"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="lobby-profile-sheet max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg">
              <GuestProfileSetup onSave={saveProfile} variant="modal" />
            </div>
          </div>
        </div>
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

    .lobby-profile-sheet form {
      background: #151311 !important;
      border: 2px solid #4a4032 !important;
      border-radius: 10px !important;
      box-shadow: 8px 8px 0 #050505 !important;
      color: #fff8e6 !important;
    }

    .lobby-profile-sheet form > div,
    .lobby-profile-sheet .bg-zinc-950,
    .lobby-profile-sheet .bg-zinc-950\\/70,
    .lobby-profile-sheet .bg-white\\/5,
    .lobby-profile-sheet .bg-white\\/\\[0\\.04\\] {
      background-color: #201d18 !important;
    }

    .lobby-profile-sheet form > div,
    .lobby-profile-sheet .border-white\\/10 {
      border-color: rgba(255, 248, 230, 0.16) !important;
    }

    .lobby-profile-sheet input {
      background: #12110f !important;
      border: 2px solid #4a4032 !important;
      border-radius: 8px !important;
      color: #fff8e6 !important;
    }

    .lobby-profile-sheet input::placeholder {
      color: #8f836f !important;
    }

    .lobby-profile-sheet button {
      border-color: #4a4032 !important;
      border-radius: 8px !important;
    }

    .lobby-profile-sheet button[type="button"] {
      background: #191816 !important;
      border-width: 2px !important;
      color: #fff8e6 !important;
      box-shadow: 2px 2px 0 #050505 !important;
    }

    .lobby-profile-sheet button[type="submit"] {
      background: #2f8f86 !important;
      border: 2px solid #74d8cc !important;
      color: #071512 !important;
      box-shadow: 4px 4px 0 #050505 !important;
    }

    .lobby-profile-sheet .text-white,
    .lobby-profile-sheet .text-zinc-50,
    .lobby-profile-sheet .text-zinc-100,
    .lobby-profile-sheet .text-zinc-200,
    .lobby-profile-sheet .text-zinc-300 {
      color: #fff8e6 !important;
    }

    .lobby-profile-sheet .text-zinc-400,
    .lobby-profile-sheet .text-zinc-500 {
      color: #a99a80 !important;
    }

    .lobby-profile-sheet .text-sky-300 {
      color: #74d8cc !important;
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
  <div className="relative mt-8 overflow-hidden rounded-lg border-2 border-[#050505] bg-[#fff1cf] p-3 text-[#171512] shadow-[10px_10px_0_#050505] sm:p-4">
    <svg
      viewBox="0 0 360 390"
      className="block h-[390px] w-full sm:hidden"
      role="img"
      aria-label="Animated mobile demo drawing of the word solar system with the imposter only seeing the hint space"
    >
      <rect x="0" y="0" width="360" height="390" rx="8" fill="#fff1cf" />

      <g transform="rotate(-2 78 50)">
        <g className="lobby-hint-card">
          <rect
            x="16"
            y="24"
            width="142"
            height="62"
            rx="7"
            fill="#fffdf4"
            stroke="#171512"
            strokeWidth="3"
          />
          <path
            d="M30 48 H144"
            stroke="#ff5b3d"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.22"
          />
          <text x="30" y="47" fontSize="12" fontWeight="900" fill="#a5412c">
            Artists see
          </text>
          <text x="30" y="70" fontSize="20" fontWeight="900" fill="#171512">
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
          fill="#2cd3c5"
          stroke="#171512"
          strokeWidth="3"
        />
        <text x="203" y="47" fontSize="12" fontWeight="900" fill="#06413d">
          Imposter hint
        </text>
        <text x="203" y="72" fontSize="22" fontWeight="900" fill="#171512">
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
          stroke="#171512"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="180"
          cy="194"
          rx="108"
          ry="52"
          fill="none"
          stroke="#171512"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="180"
          cy="194"
          rx="146"
          ry="72"
          fill="none"
          stroke="#171512"
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
            stroke="#171512"
            strokeWidth="6"
          />
          <path
            d="M180 144 V122 M180 266 V244 M130 194 H110 M250 194 H230 M144 158 L128 142 M232 250 L216 234 M144 230 L128 246 M232 138 L216 154"
            fill="none"
            stroke="#ff5b3d"
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
            stroke="#171512"
            strokeWidth="4"
          />
          <text x="230" y="176" fontSize="15" fontWeight="900" fill="#171512">
            Mercury
          </text>
        </g>

        <ellipse
          cx="180"
          cy="194"
          rx="108"
          ry="52"
          fill="none"
          stroke="#ff5b3d"
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
            stroke="#171512"
            strokeWidth="4"
          />
          <path
            d="M92 224 C101 233 112 234 118 226"
            fill="none"
            stroke="#fff1cf"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="72" y="260" fontSize="16" fontWeight="900" fill="#171512">
            Venus
          </text>
        </g>

        <ellipse
          cx="180"
          cy="194"
          rx="146"
          ry="72"
          fill="none"
          stroke="#2cd3c5"
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
            fill="#2cd3c5"
            stroke="#171512"
            strokeWidth="4"
          />
          <path
            d="M286 232 C295 238 305 238 312 230 M284 244 C294 250 306 250 313 242"
            fill="none"
            stroke="#06413d"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="276" y="270" fontSize="16" fontWeight="900" fill="#171512">
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
          fill="#fffdf4"
          stroke="#171512"
          strokeOpacity="0.18"
        />
        <text x="13" y="18" fontSize="12" fontWeight="900" fill="#6f5f45">
          Draw order
        </text>
        <circle cx="18" cy="30" r="5" fill="#ff5b3d" />
        <text x="29" y="34" fontSize="12" fontWeight="900" fill="#171512">
          sun
        </text>
        <circle cx="76" cy="30" r="5" fill="#7c5cff" />
        <text x="87" y="34" fontSize="12" fontWeight="900" fill="#171512">
          Mercury
        </text>
        <circle cx="164" cy="30" r="5" fill="#ff5b3d" />
        <text x="175" y="34" fontSize="12" fontWeight="900" fill="#171512">
          Venus
        </text>
        <circle cx="240" cy="30" r="5" fill="#2cd3c5" />
        <text x="251" y="34" fontSize="12" fontWeight="900" fill="#171512">
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
      <rect x="0" y="0" width="640" height="430" rx="8" fill="#fff1cf" />
      <path d="M34 358 H606" stroke="#171512" strokeWidth="2" />

      <g transform="rotate(-2 126 58)">
        <g className="lobby-hint-card">
          <rect
            x="32"
            y="28"
            width="194"
            height="76"
            rx="8"
            fill="#fffdf4"
            stroke="#171512"
            strokeWidth="3"
          />
          <path
            d="M48 56 H210"
            stroke="#ff5b3d"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.22"
          />
          <text x="50" y="55" fontSize="14" fontWeight="900" fill="#a5412c">
            Artists see
          </text>
          <text x="50" y="84" fontSize="25" fontWeight="900" fill="#171512">
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
          fill="#2cd3c5"
          stroke="#171512"
          strokeWidth="3"
        />
        <text x="446" y="55" fontSize="14" fontWeight="900" fill="#06413d">
          Imposter hint
        </text>
        <text x="446" y="84" fontSize="27" fontWeight="900" fill="#171512">
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
          stroke="#171512"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="320"
          cy="212"
          rx="154"
          ry="74"
          fill="none"
          stroke="#171512"
          strokeWidth="4"
          opacity="0.12"
        />
        <ellipse
          cx="320"
          cy="212"
          rx="214"
          ry="102"
          fill="none"
          stroke="#171512"
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
            stroke="#171512"
            strokeWidth="6"
          />
          <path
            d="M320 151 V127 M320 297 V273 M259 212 H235 M405 212 H381 M276 168 L258 150 M382 274 L364 256 M276 256 L258 274 M382 150 L364 168"
            fill="none"
            stroke="#ff5b3d"
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
            stroke="#171512"
            strokeWidth="4"
          />
          <text x="432" y="206" fontSize="15" fontWeight="900" fill="#171512">
            Mercury
          </text>
        </g>

        <ellipse
          cx="320"
          cy="212"
          rx="154"
          ry="74"
          fill="none"
          stroke="#ff5b3d"
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
            stroke="#171512"
            strokeWidth="4"
          />
          <path
            d="M198 258 C207 267 219 268 224 260"
            fill="none"
            stroke="#fff1cf"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="154" y="292" fontSize="15" fontWeight="900" fill="#171512">
            Venus
          </text>
        </g>

        <ellipse
          cx="320"
          cy="212"
          rx="214"
          ry="102"
          fill="none"
          stroke="#2cd3c5"
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
            fill="#2cd3c5"
            stroke="#171512"
            strokeWidth="4"
          />
          <path
            d="M478 270 C487 276 498 276 505 268 M475 282 C485 288 498 288 506 280"
            fill="none"
            stroke="#06413d"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <text x="505" y="306" fontSize="15" fontWeight="900" fill="#171512">
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
          fill="#fffdf4"
          stroke="#171512"
          strokeOpacity="0.18"
        />
        <text x="18" y="24" fontSize="14" fontWeight="900" fill="#6f5f45">
          Draw order
        </text>
        <circle cx="132" cy="19" r="7" fill="#ff5b3d" />
        <text x="146" y="24" fontSize="14" fontWeight="900" fill="#171512">
          sun
        </text>
        <circle cx="218" cy="19" r="7" fill="#7c5cff" />
        <text x="232" y="24" fontSize="14" fontWeight="900" fill="#171512">
          Mercury orbit
        </text>
        <circle cx="359" cy="19" r="7" fill="#ff5b3d" />
        <text x="373" y="24" fontSize="14" fontWeight="900" fill="#171512">
          Venus
        </text>
        <circle cx="438" cy="19" r="7" fill="#2cd3c5" />
        <text x="452" y="24" fontSize="14" fontWeight="900" fill="#171512">
          Earth
        </text>
      </g>
    </svg>

    <div className="grid gap-2 border-t-2 border-[#171512] pt-3 sm:grid-cols-3">
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
  <div className="rounded-md border border-[#171512]/20 bg-[#fffdf4] px-3 py-2">
    <p className="text-xs font-bold text-[#6f5f45]">{label}</p>
    <p className="mt-1 text-sm font-black">{value}</p>
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
  <div className="border-l-2 border-[#2cd3c5] bg-[#fff8e6]/[0.06] px-4 py-3">
    <div className="flex items-center gap-2 text-[#2cd3c5]">
      <Icon className="h-4 w-4" />
      <p className="text-sm font-black">{title}</p>
    </div>
    <p className="mt-2 text-sm font-semibold text-[#fff1cf]">{value}</p>
  </div>
);

const SettingsControls = ({
  settings,
  setSettings,
  disabled,
}: {
  settings: GameSettings;
  setSettings: Dispatch<SetStateAction<GameSettings>>;
  disabled: boolean;
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

  return (
    <div className="mt-5 divide-y divide-[#171512]/15 border-y border-[#171512]/20">
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
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-black">{label}</p>
        <p className="mt-1 text-sm font-semibold text-[#6f5f45]">
          {description}
        </p>
      </div>
      <output className="rounded-md border-2 border-[#171512] bg-[#fffdf4] px-3 py-1 text-lg font-black">
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
      className="mt-4 h-2 w-full accent-[#ff5b3d] disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-black">Strokes per turn</p>
        <p className="mt-1 text-sm font-semibold text-[#6f5f45]">
          Server limit is 3
        </p>
      </div>
      <div className="grid grid-cols-[40px_48px_40px] items-center gap-2">
        <button
          type="button"
          disabled={disabled || value <= 1}
          onClick={() => onChange(value - 1)}
          className="flex h-10 items-center justify-center rounded-md border-2 border-[#171512] bg-[#fffdf4] shadow-[2px_2px_0_#171512] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Reduce strokes per turn"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex h-10 items-center justify-center rounded-md border-2 border-[#171512] bg-[#2cd3c5] text-lg font-black">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled || value >= 3}
          onClick={() => onChange(value + 1)}
          className="flex h-10 items-center justify-center rounded-md border-2 border-[#171512] bg-[#fffdf4] shadow-[2px_2px_0_#171512] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
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
      <span className="block font-black">{label}</span>
      <span className="mt-1 block text-sm font-semibold text-[#6f5f45]">
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
      <span className="absolute inset-0 rounded-full border-2 border-[#171512] bg-[#fffdf4] transition peer-checked:bg-[#2cd3c5] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#ff5b3d] peer-disabled:opacity-40" />
      <span className="absolute left-1 h-6 w-6 rounded-full border-2 border-[#171512] bg-[#171512] transition peer-checked:translate-x-6" />
    </span>
  </label>
);

export default LobbyPage;
