import { RefreshCw } from "lucide-react";
import type { PayloadRequest } from "payload";

import { AMICO_SOURCE } from "@/lib/stock-import/amico";
import type { SyncSettings } from "@/lib/stock-import/schedule";

import { RunSyncButton } from "./run-sync-button";

/**
 * What the site has been doing with the dealership's stock list, in plain words.
 *
 * The sync runs inside the live app on a timer, where nobody can see it. Without this panel the
 * only evidence that it is working would be cars quietly appearing, and the only evidence that it
 * had stopped would be cars quietly going stale.
 */

function when(value: string | null | undefined, now: Date): string | null {
  if (!value) return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return null;

  const minutes = Math.round((now.getTime() - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export async function StockSyncPanel({
  req,
  now,
  canRun,
}: {
  req: PayloadRequest;
  now: Date;
  canRun: boolean;
}) {
  let settings: SyncSettings;
  try {
    settings = (await req.payload.findGlobal({
      slug: "stock-sync",
      depth: 0,
      req,
      overrideAccess: false,
    })) as SyncSettings;
  } catch {
    // A person who may not read the settings simply does not see the panel.
    return null;
  }

  const runs = (settings.runs ?? []).slice(0, 3);
  const last = runs[0];
  const lastWhen = when(settings.lastFinishedAt, now);
  const busy = Boolean(settings.runningSince);

  return (
    <section className="rn-admin-panel" aria-labelledby="rn-admin-home-sync">
      <div className="rn-admin-panel__head">
        <h2 id="rn-admin-home-sync" className="rn-admin-panel__title">
          <RefreshCw aria-hidden="true" className="rn-admin-panel__icon" />
          Stock from {AMICO_SOURCE}
        </h2>
        {canRun ? <RunSyncButton /> : null}
      </div>

      {settings.enabled === false ? (
        <p className="rn-admin-panel__empty">
          Switched off in Stock sync settings. Their cars stay exactly as they are.
        </p>
      ) : busy ? (
        <p className="rn-admin-panel__empty">Reading their website now.</p>
      ) : last ? (
        <p className="rn-admin-panel__lead">
          {lastWhen ? `Updated ${lastWhen}: ` : ""}
          {last.summary}
        </p>
      ) : (
        <p className="rn-admin-panel__empty">
          Nothing read yet. The first run starts shortly after the site does.
        </p>
      )}

      {runs.length > 1 ? (
        <ul className="rn-admin-panel__list">
          {runs.slice(1).map((run) => (
            <li key={run.finishedAt ?? run.summary} className="rn-admin-panel__row">
              <span className="rn-admin-panel__row-main">{run.summary}</span>
              <span className="rn-admin-panel__row-meta">{when(run.finishedAt, now)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {settings.demonstrationStockHiddenAt ? (
        <p className="rn-admin-panel__note">
          The example cars and example dealerships were put away{" "}
          {when(settings.demonstrationStockHiddenAt, now)}, when this dealership's cars went live.
          Nothing was deleted.
        </p>
      ) : null}
    </section>
  );
}
