/**
 * Fire and forget, from the browser. A beacon survives the page handing over to the dialler or
 * WhatsApp; fetch with keepalive is the fallback. A failed count never surfaces to the buyer.
 */
export function sendTrack(path: string, vehicleRef: string): void {
  if (!vehicleRef) return;
  const body = JSON.stringify({ vehicleRef });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.(path, blob)) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
