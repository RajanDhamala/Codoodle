import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

const GOOGLE_LOGIN_URL =
  "https://rajandhamala.dev/api/oauth/google?client_id=7ecebaaf-a9ae-4d78-b521-0b5475a32e57";

const GITHUB_LOGIN_URL =
  "https://rajandhamala.dev/api/oauth/github?client_id=7ecebaaf-a9ae-4d78-b521-0b5475a32e57";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.86-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 fill-current"
    aria-hidden="true"
  >
    <path d="M12 .7A11.5 11.5 0 0 0 8.36 23.1c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.72 0-1.26.45-2.3 1.19-3.1-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18A10.9 10.9 0 0 1 12 6.05c.98 0 1.95.13 2.87.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.06.74.8 1.19 1.84 1.19 3.1 0 4.44-2.71 5.42-5.29 5.71.42.36.79 1.07.79 2.16v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
  </svg>
);

const LoginPage = () => {
  const redirectTo = (url: string) => {
    window.location.assign(url);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4 text-white">
      <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/30">
            <LockKeyhole className="h-5 w-5 text-violet-400" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Sign in to continue securely to your account.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => redirectTo(GOOGLE_LOGIN_URL)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white px-4 py-3.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#09090b]"
            >
              <span className="flex items-center gap-3">
                <GoogleIcon />
                Continue with Google
              </span>

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={() => redirectTo(GITHUB_LOGIN_URL)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#18181b] px-4 py-3.5 text-sm font-medium text-white transition hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#09090b]"
            >
              <span className="flex items-center gap-3">
                <GitHubIcon />
                Continue with GitHub
              </span>

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Your authentication is securely encrypted.</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
