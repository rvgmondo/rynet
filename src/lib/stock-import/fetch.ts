import { assertPublicUrl } from "./address-guard";

/**
 * Reading somebody else's website without being a nuisance on it.
 *
 * Amico's site is a shared WordPress box that exists to sell cars to people, not to serve an
 * import. So every request this makes says who it is, waits its turn, and leaves a gap behind it.
 * One request at a time is not a performance compromise to be optimised away later: a hundred
 * parallel requests at a small host is the difference between reading a site and knocking it over,
 * and Rynet's own host went down once already for exactly that kind of pile up.
 *
 * The user agent names Rynet and carries an address a person can look up, so anyone reading their
 * access log can tell at a glance who this is and how to stop it.
 */

export const DEFAULT_USER_AGENT =
  "RynetStockImport/1.0 (+https://rynet.co.za/; stock import with the dealership's permission)";

export type PoliteFetcher = {
  text: (url: string) => Promise<string>;
  bytes: (url: string) => Promise<{ body: Buffer; contentType: string | null }>;
  /** How many requests have been made, for the run report. */
  count: () => number;
};

export type PoliteFetcherOptions = {
  userAgent?: string;
  /** The least time between the end of one request and the start of the next. */
  delayMs?: number;
  timeoutMs?: number;
  /** For tests: a stand-in for global fetch. */
  fetchImpl?: typeof fetch;
  /** The largest page or photograph read, in bytes. A dealership's photo is a few megabytes. */
  maxBytes?: number;
  /** Refuse private and internal addresses. Off only in tests, which have no network. */
  checkAddress?: boolean;
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function createPoliteFetcher(options: PoliteFetcherOptions = {}): PoliteFetcher {
  const {
    userAgent = DEFAULT_USER_AGENT,
    delayMs = 700,
    timeoutMs = 30_000,
    fetchImpl = fetch,
    maxBytes = 25 * 1024 * 1024,
    checkAddress = true,
  } = options;

  let requests = 0;
  // One promise chained after another, so two callers cannot overlap even if nobody awaits.
  let queue: Promise<unknown> = Promise.resolve();

  const run = async <T>(job: () => Promise<T>): Promise<T> => {
    const next = queue.then(async () => {
      try {
        return await job();
      } finally {
        // The gap is left after a failure too. A server that has just answered with an error is
        // the last one that should be asked again straight away.
        await wait(delayMs);
      }
    });
    // Keep the chain going whether this one worked or not.
    queue = next.catch(() => undefined);
    return next;
  };

  // Redirects are followed by hand, a few at most, so every hop goes through the address check
  // rather than only the first. See address-guard.ts.
  const request = async (url: string): Promise<Response> => {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (checkAddress) await assertPublicUrl(current);
      requests += 1;
      const response = await fetchImpl(current, {
        headers: { "user-agent": userAgent, accept: "*/*" },
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > maxBytes) throw new Error(`${url} is larger than this import will read`);
      return response;
    }
    throw new Error(`${url} redirects too many times`);
  };

  const body = async (response: Response, url: string): Promise<Buffer> => {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error(`${url} is larger than this import will read`);
    return buffer;
  };

  return {
    text: (url) => run(async () => (await body(await request(url), url)).toString("utf8")),
    bytes: (url) =>
      run(async () => {
        const response = await request(url);
        return {
          body: await body(response, url),
          contentType: response.headers.get("content-type"),
        };
      }),
    count: () => requests,
  };
}

const MAX_REDIRECTS = 5;
