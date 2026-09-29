import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
export const isGoogleAuthConfigured = Boolean(googleClientId);

let scriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
const credentialListeners = new Set<(credential: string) => void>();

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const loaded = () => window.google?.accounts.id ? resolve() : reject(new Error("Google Identity Services unavailable"));
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Google Identity Services")), { once: true });
    if (!existing) {
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise!;
}

function initializeGoogle(clientId: string) {
  if (initializedClientId === clientId) return;
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (!response.credential) return;
      for (const listener of credentialListeners) listener(response.credential);
    },
  });
  initializedClientId = clientId;
}

export function GoogleAuthButton({
  onCredential,
  onError,
  disabled = false,
}: {
  onCredential: (credential: string) => void | Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!googleClientId) return;
    let active = true;
    const listener = (credential: string) => {
      if (active && !disabled) void onCredential(credential);
    };
    credentialListeners.add(listener);
    void loadGoogleIdentityServices()
      .then(() => {
        if (!active || !containerRef.current) return;
        initializeGoogle(googleClientId);
        const width = Math.max(200, Math.min(400, Math.floor(containerRef.current.getBoundingClientRect().width || 400)));
        containerRef.current.replaceChildren();
        window.google!.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        onError?.("Google sign-in is unavailable right now. Please try again.");
      });
    return () => {
      active = false;
      credentialListeners.delete(listener);
      containerRef.current?.replaceChildren();
    };
  }, [disabled, onCredential, onError]);

  if (!googleClientId) return null;
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined} aria-busy={loading}>
      <div ref={containerRef} className="min-h-11 w-full overflow-hidden rounded-lg" />
    </div>
  );
}
