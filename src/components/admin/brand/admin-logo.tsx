import { RynetLockup } from "@/components/brand/rynet-mark";

/**
 * The Rynet lockup where Payload would draw its own logo: the sign-in screen, and the other
 * signed-out screens (forgotten password, signed out) that share its template.
 *
 * Named "Rynet", because on the screens that have no heading it is the only thing saying
 * whose system this is.
 */
export function AdminLogo() {
  return <RynetLockup className="rn-admin-logo" title="Rynet" />;
}
