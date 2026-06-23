import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

type OAuthCallbackProps = {
  backendUrl: string;
  successRedirect: string;
  errorRedirect?: string;
  tokenParam?: string;
};

const OAuthCallback = ({
  backendUrl,
  successRedirect,
  errorRedirect,
  tokenParam = "token",
}: OAuthCallbackProps) => {
  const [error, setError] = useState("");

  const backendCallbackUrl = useMemo(() => {
    const url = new URL(backendUrl, window.location.origin);
    const params = new URLSearchParams(window.location.search);

    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }, [backendUrl]);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams(window.location.search);

    if (!params.get(tokenParam)) {
      setError("OAuth callback did not include a token.");
      return;
    }

    const finishSignIn = async () => {
      try {
        const response = await fetch(backendCallbackUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "OAuth session could not be created.");
        }

        window.history.replaceState({}, "", "/oauth/callback");
        window.location.replace(successRedirect);
      } catch (err) {
        if (errorRedirect) {
          window.location.replace(errorRedirect);
          return;
        }

        if (isMounted) {
          setError(err instanceof Error ? err.message : "OAuth sign in failed.");
        }
      }
    };

    finishSignIn();

    return () => {
      isMounted = false;
    };
  }, [backendCallbackUrl, errorRedirect, successRedirect, tokenParam]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">OAuth sign in failed</h1>
          <p className="mt-2 text-sm leading-6 text-red-100/80">{error}</p>
          <a
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            Back to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Finishing sign in</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Creating your session securely.
          </p>
        </div>
      </div>
    </main>
  );
};

export default OAuthCallback;
