import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { Alert, Badge, Button } from "@movecues/ui";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { SiteStatus } from "../../types/api";
import { CopyButton, NoSiteMessage, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

const VERIFICATION_POLL_MS = 1_000;

type LiveTestState = "idle" | "checking" | "connected" | "not_detected" | "error";

function installationSnippet(siteId: string) {
  return `<script async src="https://cdn.movcues.com/v1.js" data-site-id="${siteId}"></script>`;
}

function lastEventLabel(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function waitForNextPoll() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, VERIFICATION_POLL_MS));
}

export function InstallationSettings() {
  const { currentOrg, currentSite } = useWorkspace();
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveTestState>("idle");
  const verificationAttempt = useRef(0);

  const refreshStatus = useCallback(async () => {
    if (!currentOrg || !currentSite) return;
    setLoading(true);
    setStatusError(null);
    try {
      setStatus(await sitesApi.getSiteStatus(currentOrg.orgId, currentSite.id));
    } catch {
      setStatusError("Couldn't refresh installation status.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg, currentSite]);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  useEffect(() => {
    verificationAttempt.current += 1;
    setLiveState("idle");
    return () => { verificationAttempt.current += 1; };
  }, [currentOrg?.orgId, currentSite?.id]);

  async function testSdkConnection() {
    if (!currentOrg || !currentSite) return;
    const attempt = ++verificationAttempt.current;
    setLiveState("checking");
    try {
      const created = await sitesApi.createSdkVerification(currentOrg.orgId, currentSite.id);
      while (verificationAttempt.current === attempt) {
        const result = await sitesApi.getSdkVerification(currentOrg.orgId, currentSite.id, created.verification.id);
        if (verificationAttempt.current !== attempt) return;
        if (result.verification.status === "connected") {
          setLiveState("connected");
          return;
        }
        if (result.verification.status === "expired") {
          setLiveState("not_detected");
          return;
        }
        await waitForNextPoll();
      }
    } catch {
      if (verificationAttempt.current === attempt) setLiveState("error");
    }
  }

  const productUrl = status?.domain ?? currentSite?.domain;
  const liveCopy = liveState === "checking"
    ? { title: "Checking for SDK…", detail: "Open or refresh your product while this test is running." }
    : liveState === "connected"
      ? { title: "SDK connected", detail: "Detected just now" }
      : liveState === "not_detected"
        ? { title: "SDK not detected", detail: `Open or refresh ${productUrl ?? "your product"} and try again.` }
        : liveState === "error"
          ? { title: "Connection test failed", detail: "Something went wrong while checking. Please try again." }
          : { title: "Test the live SDK runtime", detail: "This checks whether the SDK is running on your product right now." };

  return (
    <div>
      <SettingsHeading title="Installation" description="Install Movecues and verify that this site is sending data." />
      {!currentSite ? <NoSiteMessage /> : <>
        {statusError && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{statusError}</Alert>}
        <SettingsGroup title="SDK connection">
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {status?.hasReceivedEvents ? "Receiving data" : "Waiting for data"}
                <Badge variant="outline">{status?.hasReceivedEvents ? "Active" : "No data yet"}</Badge>
              </div>
              <p className="mt-1 mb-0 text-xs text-muted-foreground">
                {status?.lastEventAt ? `Last event ${lastEventLabel(status.lastEventAt)}` : "Install the SDK and open your product."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh status"}
            </Button>
          </div>
        </SettingsGroup>
        <SettingsGroup title="Live SDK test">
          <div className="flex items-center justify-between gap-4 p-3.5">
            <div className="flex min-w-0 items-start gap-2.5">
              {liveState === "checking" && <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Checking" />}
              {liveState === "connected" && <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Connected" />}
              {(liveState === "not_detected" || liveState === "error") && <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label={liveState === "error" ? "Error" : "Not detected"} />}
              <div>
                <div className="text-sm font-medium">{liveCopy.title}</div>
                <p className="mt-1 mb-0 text-xs text-muted-foreground">{liveCopy.detail}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void testSdkConnection()} disabled={liveState === "checking"}>
              {liveState === "checking" ? "Checking…" : liveState === "idle" ? "Test SDK connection" : "Try again"}
            </Button>
          </div>
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow label="Site ID" value={currentSite.siteId} mono action={<CopyButton value={currentSite.siteId} label="Site ID" />} />
        </SettingsGroup>
        <SettingsGroup title="Installation snippet">
          <div className="relative">
            <pre className="mono m-0 overflow-auto p-4 pr-24 text-xs leading-5 text-muted-foreground">{installationSnippet(currentSite.siteId)}</pre>
            <div className="absolute top-2 right-2"><CopyButton value={installationSnippet(currentSite.siteId)} label="installation snippet" /></div>
          </div>
        </SettingsGroup>
      </>}
    </div>
  );
}
