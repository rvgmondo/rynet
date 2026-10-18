/**
 * The one place Facebook and Instagram are called, ported from Klippy's social module, where every
 * rule here was checked against Meta's own reference (docs/SOCIAL-POSTING.md lists the sources).
 *
 *  1. A REQUEST THAT NEVER RETURNS WOULD WEDGE THE PUBLISHER, so every call has a timeout.
 *  2. TOKENS MUST NOT REACH A LOG. The Graph API carries the token in the query string, so a raw
 *     URL is a credential and is scrubbed before it is logged or kept with an error.
 *  3. RETRY OR GIVE UP IS ONE DECISION, MADE ON META'S ERROR CODES, never on the wording, which
 *     Meta changes without notice.
 */

export type Network = "facebook" | "instagram";

export const NETWORK_LABEL: Record<Network, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

export class SocialApiError extends Error {
  readonly retryable: boolean;
  readonly network: Network;
  readonly code: string | null;
  /** True when the only fix is connecting the account again. */
  readonly reconnect: boolean;

  constructor(
    network: Network,
    message: string,
    options: { retryable: boolean; code?: string | null; reconnect?: boolean },
  ) {
    super(message);
    this.name = "SocialApiError";
    this.network = network;
    this.retryable = options.retryable;
    this.code = options.code ?? null;
    this.reconnect = options.reconnect === true;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/token|secret|code|signature/i.test(key)) parsed.searchParams.set(key, "[redacted]");
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&](?:access_token|client_secret|code)=)[^&]+/gi, "$1[redacted]");
  }
}

/** Meta's error body, turned into a decision. */
export function classifyMetaError(
  body: unknown,
  status: number,
): { message: string; retryable: boolean; code: string; reconnect: boolean } {
  const error = (body as { error?: Record<string, unknown> } | null)?.error ?? {};
  const code = Number(error.code ?? 0);
  const sub = Number(error.error_subcode ?? 0);
  const message = String(error.error_user_msg ?? error.message ?? `HTTP ${status}`);
  const label = sub ? `${code}/${sub}` : String(code || status);
  const plain = { message, code: label, reconnect: false };

  if (error.is_transient === true) return { ...plain, retryable: true };

  // Instagram's spam guard. Retrying makes it worse.
  if (code === 4 && sub === 2207051) {
    return {
      ...plain,
      message:
        "Instagram has paused posting on this account for a while. Try again later or post it by hand.",
      retryable: false,
    };
  }

  // The 190 family: the token is no good, and only connecting again fixes it.
  if (code === 190 || (code >= 100 && sub >= 458 && sub <= 492)) {
    return {
      message: "Facebook no longer accepts this connection. Connect the page again.",
      code: label,
      retryable: false,
      reconnect: true,
    };
  }

  // Transient faults and rate limits.
  if ([1, 2, 4, 17, 32, 341, 368, 613, 80001, 80002].includes(code)) {
    return { ...plain, retryable: true };
  }

  // Instagram publishing subcodes worth another go, and an expired container.
  if ([2207001, 2207003, 2207008, 2207020, 2207027, 2207032, 2207042, 2207053].includes(sub)) {
    return { ...plain, retryable: true };
  }

  // Permissions and validation are permanent.
  return { ...plain, retryable: false };
}

export async function httpJson<T = unknown>(
  url: string,
  options: {
    network: Network;
    method?: "GET" | "POST";
    form?: Record<string, string | undefined>;
    timeoutMs?: number;
  },
): Promise<T> {
  const { network, method = "GET", form, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    const init: RequestInit = { method, signal: controller.signal };
    if (form) {
      const body = new URLSearchParams();
      for (const [key, value] of Object.entries(form))
        if (value !== undefined) body.set(key, value);
      init.body = body;
      init.headers = { "content-type": "application/x-www-form-urlencoded" };
    }
    response = await fetch(url, init);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new SocialApiError(
      network,
      aborted
        ? `${NETWORK_LABEL[network]} did not answer within ${Math.round(timeoutMs / 1000)} seconds.`
        : `Could not reach ${NETWORK_LABEL[network]}.`,
      { retryable: true, code: aborted ? "timeout" : "network" },
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }

  if (!response.ok || (body as { error?: unknown } | null)?.error) {
    const verdict = classifyMetaError(body, response.status);
    throw new SocialApiError(network, verdict.message, verdict);
  }
  return body as T;
}
