import { ArrowRight, Terminal, Zap, LayoutTemplate } from "lucide-react";

const Pill = ({ label }: { label: string }) => (
  <span className="rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-mono text-muted-foreground 
  shadow-sm shadow-black/5 backdrop-blur">
    {label}
  </span>
);

const FeatureCard = ({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) => (
  <div className="space-y-1 rounded-xl border bg-card/70 p-3 shadow-sm shadow-black/5">
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
      <Icon className="h-3.5 w-3.5" />
      <span>{title}</span>
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/90 to-background/60 text-foreground">
      {/* soft glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-[-7rem] h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-6rem] h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl" />
      </div>

      {/* NAVBAR */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 md:py-8">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background/80 shadow-sm shadow-black/5 backdrop-blur">
            <span className="bg-gradient-to-tr from-primary to-primary/70 bg-clip-text text-xl font-semibold text-transparent">
              SF
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight md:text-base">
              StackForge
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 md:text-[12px]">
              stack-installer-cli
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-4 text-xs font-medium text-muted-foreground md:flex">
          <button className="rounded-full border border-transparent px-4 py-1.5 transition hover:border-border hover:bg-muted/60">
            Docs (soon)
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border bg-foreground px-4 py-1.5 font-semibold text-background shadow-sm shadow-black/10 transition hover:bg-foreground/90"
            onClick={() => {
              window.open("https://github.com/RajanDhamala/stackforge-cli", "_blank", "noopener,noreferrer");
            }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 -0.5 25 25"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="m12.301 0h.093c2.242 0 4.34.613 6.137 1.68l-.055-.031c1.871 1.094 3.386 2.609 4.449 4.422l.031.058c1.04 1.769 1.654 3.896 1.654 6.166 0 5.406-3.483 10-8.327 11.658l-.087.026c-.063.02-.135.031-.209.031-.162 0-.312-.054-.433-.144l.002.001c-.128-.115-.208-.281-.208-.466 0-.005 0-.01 0-.014v.001q0-.048.008-1.226t.008-2.154c.007-.075.011-.161.011-.249 0-.792-.323-1.508-.844-2.025.618-.061 1.176-.163 1.718-.305l-.076.017c.573-.16 1.073-.373 1.537-.642l-.031.017c.508-.28.938-.636 1.292-1.058l.006-.007c.372-.476.663-1.036.84-1.645l.009-.035c.209-.683.329-1.468.329-2.281 0-.045 0-.091-.001-.136v.007c0-.022.001-.047.001-.072 0-1.248-.482-2.383-1.269-3.23l.003.003c.168-.44.265-.948.265-1.479 0-.649-.145-1.263-.404-1.814l.011.026c-.115-.022-.246-.035-.381-.035-.334 0-.649.078-.929.216l.012-.005c-.568.21-1.054.448-1.512.726l.038-.022-.609.384c-.922-.264-1.981-.416-3.075-.416s-2.153.152-3.157.436l.081-.02q-.256-.176-.681-.433c-.373-.214-.814-.421-1.272-.595l-.066-.022c-.293-.154-.64-.244-1.009-.244-.124 0-.246.01-.364.03l.013-.002c-.248.524-.393 1.139-.393 1.788 0 .531.097 1.04.275 1.509l-.01-.029c-.785.844-1.266 1.979-1.266 3.227 0 .025 0 .051.001.076v-.004c-.001.039-.001.084-.001.13 0 .809.12 1.591.344 2.327l-.015-.057c.189.643.476 1.202.85 1.693l-.009-.013c.354.435.782.793 1.267 1.062l.022.011c.432.252.933.465 1.46.614l.046.011c.466.125 1.024.227 1.595.284l.046.004c-.431.428-.718 1-.784 1.638l-.001.012c-.207.101-.448.183-.699.236l-.021.004c-.256.051-.549.08-.85.08-.022 0-.044 0-.066 0h.003c-.394-.008-.756-.136-1.055-.348l.006.004c-.371-.259-.671-.595-.881-.986l-.007-.015c-.198-.336-.459-.614-.768-.827l-.009-.006c-.225-.169-.49-.301-.776-.38l-.016-.004-.32-.048c-.023-.002-.05-.003-.077-.003-.14 0-.273.028-.394.077l.007-.003q-.128.072-.08.184c.039.086.087.16.145.225l-.001-.001c.061.072.13.135.205.19l.003.002.112.08c.283.148.516.354.693.603l.004.006c.191.237.359.505.494.792l.01.024.16.368c.135.402.38.738.7.981l.005.004c.3.234.662.402 1.057.478l.016.002c.33.064.714.104 1.106.112h.007c.045.002.097.002.15.002.261 0 .517-.021.767-.062l-.027.004.368-.064q0 .609.008 1.418t.008.873v.014c0 .185-.08.351-.208.466h-.001c-.119.089-.268.143-.431.143-.075 0-.147-.011-.214-.032l.005.001c-4.929-1.689-8.409-6.283-8.409-11.69 0-2.268.612-4.393 1.681-6.219l-.032.058c1.094-1.871 2.609-3.386 4.422-4.449l.058-.031c1.739-1.034 3.835-1.645 6.073-1.645h.098-.005zm-7.64 17.666q.048-.112-.112-.192-.16-.048-.208.032-.048.112.112.192.144.096.208-.032zm.497.545q.112-.08-.032-.256-.16-.144-.256-.048-.112.08.032.256.159.157.256.047zm.48.72q.144-.112 0-.304-.128-.208-.272-.096-.144.08 0 .288t.272.112zm.672.673q.128-.128-.064-.304-.192-.192-.32-.048-.144.128.064.304.192.192.32.044zm.913.4q.048-.176-.208-.256-.24-.064-.304.112t.208.24q.24.097.304-.096zm1.009.08q0-.208-.272-.176-.256 0-.256.176 0 .208.272.176.256.001.256-.175zm.929-.16q-.032-.176-.288-.144-.256.048-.224.24t.288.128.225-.224z" />
            </svg>

            <span>Star the CLI</span>
          </button>
        </nav>
      </header>

      {/* MAIN */}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-16 pt-2 md:flex-row md:items-center md:gap-12 md:pb-24">
        {/* LEFT */}
        <section className="flex-1 space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-[11px]
           font-medium text-muted-foreground shadow-sm shadow-black/5 backdrop-blur">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] text-emerald-500">
              ●
            </span>
            <span className="hidden sm:inline">New</span>
            <span className="text-foreground/80">React / TS / Express stack in one shot</span>
          </div>

          <div className="space-y-3">
            <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-semibold leading-tight
             tracking-tight text-transparent sm:text-5xl md:text-5xl">
              Your own full‑stack boilerplate,
              <br className="hidden sm:block" /> shipped from the CLI.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              <strong>stack-installer-cli</strong> by StackForge spins up React + TypeScript on the
              front, and Express, Mongoose, and Prisma on the back. Opinionated,
              batteries‑included, and styled like a modern React starter — without
              the noise.
            </p>
          </div>

          {/* CTA + command */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5
             text-sm font-semibold text-background shadow-[0_18px_45px_-18px_rgba(0,0,0,0.7)] transition hover:-translate-y-[1px] hover:bg-foreground/95"
              onClick={() => {
                window.open("https://www.npmjs.com/package/stack-installer-cli", "_blank");
              }}>
              <Zap className="h-4 w-4" />
              Init my stack
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <Pill label="npx stack-installer-cli" />
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <FeatureCard
              icon={LayoutTemplate}
              title="Full boilerplate"
              text="Landing, auth, test page, API layer, and routing ready from init."
            />
            <FeatureCard
              icon={Zap}
              title="Modern stack"
              text="React + TS + Vite, Zustand, React Query, Axios, Tailwind, and more."
            />
            <FeatureCard
              icon={Terminal}
              title="Backend wired"
              text="Express server with Mongo via Mongoose plus Prisma ORM, pre‑hooked."
            />
          </div>
        </section>

        {/* RIGHT – preview card */}
        <section className="flex-1">
          <div className="relative mx-auto max-w-md rounded-3xl border bg-card/90 p-4 shadow-[0_22px_60px_-26px_rgba(0,0,0,0.9)] backdrop-blur">
            {/* window chrome */}
            <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                stack-forge • dev
              </span>
            </div>

            <div className="space-y-3 rounded-2xl border bg-background/90 p-3">
              {/* fake UI */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="h-2.5 w-28 rounded-full bg-gradient-to-r from-primary/90 via-primary/60 to-primary/20" />
                  <div className="h-2 w-20 rounded-full bg-muted" />
                </div>
                <div className="h-7 w-20 rounded-full bg-gradient-to-r from-foreground via-foreground/80 to-foreground/50" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 rounded-xl bg-muted" />
                <div className="h-14 rounded-xl bg-muted" />
                <div className="h-14 rounded-xl bg-muted" />
              </div>

              {/* terminal preview */}
              <div className="space-y-1 rounded-xl border bg-black/95 p-3 text-[11px] font-mono text-emerald-100">
                <div className="flex items-center gap-2 text-emerald-400/80">
                  <Terminal className="h-3 w-3" />
                  <span>stack-forge ▸ init</span>
                </div>
                <p>$ npx stack-installer-cli</p>
                <p className="text-emerald-400/90">✔ Scaffolding React + TS + Vite app…</p>
                <p className="text-emerald-400/90">
                  ✔ Adding Express, Mongoose, Prisma boilerplate…
                </p>
                <p className="text-emerald-400/90">
                  ✔ Wiring Zustand store, React Query, and Axios wrapper…
                </p>
                <p className="text-emerald-400/90">✔ Dropping in landing + auth pages…</p>
                <p className="text-emerald-300/90">Done. Run: npm run dev</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;

