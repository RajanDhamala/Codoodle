import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound404Page = () => {
  const goBack = () => {
    window.history.back();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#171512] px-4 py-5 text-[#fff8e6] [font-family:Inter,ui-sans-serif,system-ui] sm:px-6 lg:px-8">
      <style>
        {`
          @keyframes not-found-draw {
            0% {
              opacity: 0;
              stroke-dashoffset: var(--draw-length);
            }
            8% {
              opacity: 1;
            }
            58%, 82% {
              opacity: 1;
              stroke-dashoffset: 0;
            }
            100% {
              opacity: 0;
              stroke-dashoffset: var(--draw-length);
            }
          }

          @keyframes not-found-float {
            0%, 100% {
              transform: translateY(0) rotate(-1deg);
            }
            50% {
              transform: translateY(-10px) rotate(1deg);
            }
          }

          @keyframes not-found-wiggle {
            0%, 100% {
              transform: rotate(-4deg);
            }
            50% {
              transform: rotate(5deg);
            }
          }

          @keyframes not-found-scan {
            0%, 100% {
              opacity: 0.45;
              transform: translateX(-14px);
            }
            50% {
              opacity: 1;
              transform: translateX(14px);
            }
          }

          .not-found-float {
            animation: not-found-float 5.5s ease-in-out infinite;
            transform-origin: center;
          }

          .not-found-wiggle {
            animation: not-found-wiggle 2.8s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }

          .not-found-scan {
            animation: not-found-scan 2.4s ease-in-out infinite;
          }

          .not-found-number-line {
            --draw-length: 430;
            animation: not-found-draw 5.8s ease-in-out infinite;
            stroke-dasharray: 430;
            stroke-dashoffset: 430;
          }

          .not-found-number-second {
            animation-delay: 0.45s;
          }

          .not-found-number-third {
            animation-delay: 0.9s;
          }

          @media (prefers-reduced-motion: reduce) {
            .not-found-motion * {
              animation-duration: 1ms !important;
              animation-iteration-count: 1 !important;
            }

            .not-found-number-line {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,248,230,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,248,230,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(44,211,197,0.14),transparent)]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-7xl items-center gap-8 py-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
        <div className="min-w-0 py-2 sm:py-6">
          <div className="mb-6 inline-flex max-w-full items-center gap-3 rounded-lg border border-[#fff8e6]/15 bg-[#fff8e6]/[0.045] p-2 pr-4 shadow-[0_10px_0_rgba(0,0,0,0.38)]">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-[#050505] bg-[#fff8e6] shadow-[4px_4px_0_#050505]">
              <img
                src="/coloodle.svg"
                alt=""
                className="h-12 w-12 object-contain"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xl font-black leading-none text-[#fff8e6] [font-family:'Trebuchet_MS',ui-sans-serif,system-ui]">
                Coloodle
              </span>
              <span className="mt-1 block truncate text-xs font-black uppercase text-[#2cd3c5]">
                Missing route
              </span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border border-[#2cd3c5]/35 bg-[#2cd3c5]/10 px-3 py-2 text-sm font-black text-[#9ef7ef]">
            <SearchX className="h-4 w-4" />
            404 not found
          </div>

          <h1 className="mt-5 max-w-3xl text-6xl font-black leading-none text-[#fff8e6] [font-family:'Trebuchet_MS',ui-sans-serif,system-ui] sm:text-7xl lg:text-8xl">
            Wrong canvas.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#d8cab0] sm:text-lg">
            This page is not on the board anymore. Head back to the lobby and start from a fresh sketch.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/lobby"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-md border-2 border-[#171512] bg-[#ff5b3d] px-5 text-base font-black text-[#171512] shadow-[5px_5px_0_#050505] transition hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#050505] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2cd3c5]"
            >
              <Home className="h-5 w-5" />
              Back to lobby
            </Link>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-md border-2 border-[#fff8e6]/20 bg-[#fff8e6]/[0.06] px-5 text-base font-black text-[#fff8e6] shadow-[5px_5px_0_rgba(0,0,0,0.42)] transition hover:-translate-y-0.5 hover:border-[#2cd3c5]/60 hover:bg-[#fff8e6]/10 hover:shadow-[8px_8px_0_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2cd3c5]"
            >
              <ArrowLeft className="h-5 w-5" />
              Go back
            </button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -left-2 top-8 hidden h-16 w-16 rotate-[-8deg] rounded-md border-2 border-[#050505] bg-[#2cd3c5] shadow-[5px_5px_0_#050505] sm:block" />
          <div className="absolute -right-2 bottom-12 hidden h-20 w-20 rotate-[7deg] rounded-md border-2 border-[#050505] bg-[#ff5b3d] shadow-[5px_5px_0_#050505] sm:block" />

          <svg
            className="not-found-motion h-auto w-full"
            viewBox="0 0 760 560"
            role="img"
            aria-labelledby="not-found-title not-found-description"
          >
            <title id="not-found-title">Missing Coloodle page sketch</title>
            <desc id="not-found-description">
              A hand-drawn game board with a 404 route, pencil, players, and animated sketch marks.
            </desc>

            <path
              d="M105 492H655"
              fill="none"
              stroke="#050505"
              strokeLinecap="round"
              strokeWidth="16"
              opacity="0.28"
            />

            <g className="not-found-float">
              <path
                d="M118 80H622C646 80 664 98 664 122V434C664 458 646 476 622 476H118C94 476 76 458 76 434V122C76 98 94 80 118 80Z"
                fill="#050505"
              />
              <rect
                x="88"
                y="64"
                width="576"
                height="396"
                rx="8"
                fill="#fff1cf"
                stroke="#171512"
                strokeWidth="8"
              />
              <path
                d="M128 118H624"
                fill="none"
                stroke="#171512"
                strokeLinecap="round"
                strokeWidth="6"
              />
              <circle cx="128" cy="94" r="10" fill="#ff5b3d" stroke="#171512" strokeWidth="5" />
              <circle cx="162" cy="94" r="10" fill="#f5c44d" stroke="#171512" strokeWidth="5" />
              <circle cx="196" cy="94" r="10" fill="#2cd3c5" stroke="#171512" strokeWidth="5" />




              <g className="not-found-scan">
                <path
                  d="M220 158H520"
                  fill="none"
                  stroke="#171512"
                  strokeDasharray="14 18"
                  strokeLinecap="round"
                  strokeWidth="6"
                  opacity="0.48"
                />
                <path
                  d="M202 386H538"
                  fill="none"
                  stroke="#171512"
                  strokeDasharray="10 18"
                  strokeLinecap="round"
                  strokeWidth="5"
                  opacity="0.32"
                />
              </g>

              <g aria-label="404" role="img">
                <g
                  fill="none"
                  stroke="#050505"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="31"
                  opacity="0.2"
                  transform="translate(8 10)"
                >
                  <path d="M272 184L216 278H304M286 187V324" />
                  <path d="M386 188C323 190 314 318 380 325C446 332 456 198 393 188" />
                  <path d="M522 184L466 278H554M536 187V324" />
                </g>
                <g
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="22"
                >
                  <path
                    className="not-found-number-line"
                    d="M272 184L216 278H304M286 187V324"
                    stroke="#171512"
                  />
                  <path
                    className="not-found-number-line not-found-number-second"
                    d="M386 188C323 190 314 318 380 325C446 332 456 198 393 188"
                    stroke="#171512"
                  />
                  <path
                    className="not-found-number-line not-found-number-third"
                    d="M522 184L466 278H554M536 187V324"
                    stroke="#171512"
                  />
                </g>
                <g
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="8"
                >
                </g>
              </g>
            </g>

            <g className="not-found-wiggle">
              <path
                d="M610 375L678 310L704 337L637 404L604 414L610 375Z"
                fill="#f5c44d"
                stroke="#171512"
                strokeLinejoin="round"
                strokeWidth="7"
              />

              <path
                d="M604 414L616 382L637 404Z"
                fill="#fff8e6"
                stroke="#171512"
                strokeLinejoin="round"
                strokeWidth="6"
              />
            </g>

            <g>
              <circle cx="168" cy="500" r="23" fill="#2cd3c5" stroke="#050505" strokeWidth="6" />
              <path d="M142 538C151 516 185 516 194 538" fill="#ff5b3d" stroke="#050505" strokeWidth="6" />
              <circle cx="262" cy="504" r="23" fill="#ff5b3d" stroke="#050505" strokeWidth="6" />
              <path d="M236 542C245 520 279 520 288 542" fill="#fff8e6" stroke="#050505" strokeWidth="6" />
              <circle cx="356" cy="500" r="23" fill="#f5c44d" stroke="#050505" strokeWidth="6" />
              <path d="M330 538C339 516 373 516 382 538" fill="#2cd3c5" stroke="#050505" strokeWidth="6" />
            </g>
          </svg>
        </div>
      </section>
    </main>
  );
};

export default NotFound404Page;
