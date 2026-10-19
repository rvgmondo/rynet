"use client";

import { Check, Clock, Mic, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { replacePhrase } from "@/components/search/understand";

import { understandSearch } from "./floor-action";
import type { Understood } from "./floor-types";

/**
 * The home page search: say the car, and the floor lights up.
 *
 * WITHOUT JAVASCRIPT it is a GET form to /cars with one box, and /cars reads the words with the
 * same parser this asks on every keystroke. Everything below is that form, made to talk back:
 *
 *   the chips      what the words were understood as, each removable, which edits the sentence
 *   the count      on the button, the same number /cars will show
 *   close calls    when the answer is thin, the one rewrite that finds more, with how many more
 *   the floor      the photographed cars behind the search; matches light, the rest go dark
 *   the mic        speech to the same box, where the browser can do it
 *
 * The sentence in the box stays the single source of truth. Nothing here holds a filter the
 * words do not say, so whatever the buyer sees in the box is exactly what /cars is asked.
 */

type Props = {
  /** Every live car, for the count before anything is typed. */
  all: number;
  /** The button before anything is typed: "Search 397 cars", or the demo wording. */
  idleLabel: string;
  /** The line under the floor before anything is typed, worded for demonstration stock when it is. */
  idleStatus: string;
  /** What a result is called: cars, or demo listings while the stock is demonstration data. */
  noun: [string, string];
  /** Ready-made searches, each with the count it finds today. Only ones that find cars. */
  examples: { text: string; count: number }[];
};

type Speech = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const RECENT_KEY = "rynet-recent-searches";
const DEBOUNCE = 180;
/** Short enough to show whole on a 320px phone. */
const PLACEHOLDER = "Try: SUV under R 250 000";

const readRecent = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
};

export function FloorSearch({ all, idleLabel, idleStatus, noun, examples }: Props) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Understood | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech = useRef<Speech | null>(null);

  /*
   * The floor (FloorSection, server rendered) is laid once the page has loaded and gone quiet, and
   * only where it can be seen: a tile gets its photograph when it comes into view below the solid
   * navy at the top, and not before. Most of the lot is off screen or under the heading at any
   * moment, and on a phone a third of it is not drawn at all, so this is a third of the bytes of
   * laying everything. The drift brings new tiles into view slowly, a few at a time.
   */
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const go = () => {
      const start = () => {
        if (typeof IntersectionObserver === "undefined") return;
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const img = entry.target.querySelector<HTMLImageElement>("img[data-src]");
              if (img?.dataset.src) img.src = img.dataset.src;
              observer?.unobserve(entry.target);
            }
          },
          { rootMargin: "-30% 0px 0px 0px", threshold: 0.25 },
        );
        for (const tile of document.querySelectorAll("#rn-floor-lot [data-id]"))
          observer.observe(tile);
      };
      const idle = (
        window as unknown as {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      setTimeout(() => (idle ? idle(start, { timeout: 3000 }) : start()), 800);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("load", go);
    };
  }, []);

  const ask = useCallback((words: string) => {
    latest.current = words;
    if (timer.current) clearTimeout(timer.current);
    if (!words.trim()) {
      setAnswer(null);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const reply = await understandSearch(words);
        // A slow reply to words the buyer has since changed is dropped, never drawn.
        if (reply && latest.current === words) setAnswer(reply);
      });
    }, DEBOUNCE);
  }, []);

  const say = useCallback(
    (words: string) => {
      setText(words);
      ask(words);
    },
    [ask],
  );

  useEffect(() => {
    setRecent(readRecent());
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setCanListen(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));

    // A shared link to the home page with words on it opens on that search.
    const shared = new URLSearchParams(window.location.search).get("q");
    if (shared) say(shared.slice(0, 200));

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea, select, [contenteditable]"))
        return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [say]);

  const remember = () => {
    const words = text.trim();
    if (!words || !answer?.total) return;
    const next = [words, ...recent.filter((r) => r.toLowerCase() !== words.toLowerCase())].slice(
      0,
      3,
    );
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Private browsing or storage switched off: the search still works, it just is not kept.
    }
  };

  const listen = () => {
    if (speech.current) {
      speech.current.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => Speech;
      webkitSpeechRecognition?: new () => Speech;
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) return;
    try {
      const rec = new Recognition();
      rec.lang = "en-ZA";
      rec.interimResults = true;
      rec.onresult = (event) => {
        const words = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ");
        say(words.slice(0, 200));
      };
      rec.onerror = (event) =>
        setNotice(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Your browser blocked the microphone. Type it instead."
            : "That did not come through. Try again, or type it.",
        );
      rec.onend = () => {
        speech.current = null;
        setListening(false);
      };
      speech.current = rec;
      setNotice(null);
      setText("");
      rec.start();
      setListening(true);
    } catch {
      speech.current = null;
      setListening(false);
      setNotice("Voice search is not available in this browser. Type it instead.");
    }
  };

  // The last answer stays up while the next one is on its way, so nothing flickers as you type.
  const shown = text.trim() ? answer : null;
  const hunting = Boolean(shown && text.trim() && shown.chips.some((chip) => chip.key !== "sort"));
  const total = shown && text.trim() ? shown.total : all;
  const buttonLabel =
    shown && text.trim() ? `Show ${total} ${total === 1 ? noun[0] : noun[1]}` : idleLabel;

  // Light the floor. The tiles are server HTML (see FloorSection), so this sets attributes on them
  // rather than rendering them: hydrating eighty-odd links cost more than the floor is worth.
  useEffect(() => {
    const lot = document.getElementById("rn-floor-lot");
    if (!lot) return;
    lot.toggleAttribute("data-hunting", hunting);
    const lit = new Set(shown?.ids ?? []);
    for (const tile of lot.querySelectorAll<HTMLElement>("[data-id]")) {
      tile.toggleAttribute("data-on", hunting && lit.has(Number(tile.dataset.id)));
    }
  }, [hunting, shown]);

  const tries = [
    ...recent.map((r) => ({ text: r, count: null as number | null, recent: true })),
    ...examples.filter((e) => !recent.includes(e.text)).map((e) => ({ ...e, recent: false })),
  ].slice(0, 6);

  return (
    <>
      <div className="container-page rn-floor__content">
        <p className="rn-floor__promise">
          <Check aria-hidden="true" strokeWidth={3} />
          Only checked dealerships. No private sellers.
        </p>
        <h1 id="floor-heading" className="rn-floor__title">
          Say the car. <span>Watch it light up.</span>
        </h1>

        <search className="rn-floor__ask">
          <form action="/cars" method="get" onSubmit={remember}>
            <label htmlFor="floor-q" className="sr-only">
              Describe the car you want, for example a diesel bakkie under R 300 000
            </label>
            <div className="rn-floor__box">
              <Search aria-hidden="true" />
              <input
                ref={input}
                id="floor-q"
                name="q"
                type="search"
                className="rn-floor__input"
                value={text}
                maxLength={200}
                autoComplete="off"
                enterKeyHint="search"
                placeholder={listening ? "Listening. Say the car you want." : PLACEHOLDER}
                aria-describedby="floor-status"
                onChange={(event) => say(event.target.value)}
              />
              {canListen ? (
                <button
                  type="button"
                  className="rn-floor__mic"
                  aria-pressed={listening}
                  aria-label={listening ? "Stop listening" : "Say it out loud"}
                  onClick={listen}
                >
                  <Mic aria-hidden="true" />
                </button>
              ) : null}
              <button type="submit" className="rn-btn rn-btn--primary rn-floor__go">
                {buttonLabel}
              </button>
            </div>

            <div className="rn-floor__said">
              {shown && text.trim() ? (
                <>
                  {shown.chips.length > 0 ? (
                    <span className="rn-floor__label">Looking for</span>
                  ) : null}
                  {shown.chips.map((chip) => (
                    <span
                      key={`${chip.key}-${chip.phrase}`}
                      className="rn-floor__pill"
                      data-unstocked={chip.unstocked ? "" : undefined}
                    >
                      {chip.label}
                      {chip.hint ? <small>({chip.hint})</small> : null}
                      <button
                        type="button"
                        aria-label={`Remove ${chip.label}`}
                        onClick={() =>
                          say(
                            [chip.phrase, ...chip.also].reduce(
                              (words, phrase) => replacePhrase(words, phrase, ""),
                              text,
                            ),
                          )
                        }
                      >
                        <X aria-hidden="true" strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  {shown.unmatched.length > 0 ? (
                    <span className="rn-floor__miss">
                      Not searchable yet: {shown.unmatched.join(", ")}
                    </span>
                  ) : null}
                  {shown.calls.length > 0 ? (
                    <div className="rn-floor__calls">
                      <span className="rn-floor__label">Close calls</span>
                      {shown.calls.map((call) => (
                        <button
                          key={call.text}
                          type="button"
                          className="rn-floor__try"
                          onClick={() => say(call.text)}
                        >
                          <span>+{call.gain}</span>
                          {call.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                tries.map((t) => (
                  <button
                    key={t.text}
                    type="button"
                    className="rn-floor__try"
                    data-recent={t.recent ? "" : undefined}
                    onClick={() => say(t.text)}
                  >
                    {t.recent ? (
                      <Clock aria-hidden="true" className="ml-1.5 size-4" />
                    ) : (
                      <span>{t.count}</span>
                    )}
                    {t.text}
                    {t.recent ? <span className="sr-only"> (a recent search)</span> : null}
                  </button>
                ))
              )}
            </div>
            {shown?.disclaimer && text.trim() ? (
              <p className="rn-floor__note">{shown.disclaimer}</p>
            ) : null}
            {notice ? (
              <p className="rn-floor__note" role="alert">
                {notice}
              </p>
            ) : null}
          </form>
        </search>
      </div>

      <p className="rn-floor__status" id="floor-status" aria-live="polite">
        <span>
          {shown && text.trim() ? (
            shown.nothing ? (
              "None of those words is a make, model, body type or town we know yet."
            ) : (
              <>
                <b>{total}</b> of <b>{all}</b>{" "}
                {total === 1 ? `${noun[0]} matches` : `${noun[1]} match`}
              </>
            )
          ) : (
            idleStatus
          )}
        </span>
      </p>
    </>
  );
}
