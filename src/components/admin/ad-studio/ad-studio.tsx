"use client";

import { Copy, Download, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AdCar,
  type AdDealer,
  carCaption,
  detailLine,
  ownCaption,
  ownShowroomCaption,
  priceLabel,
  showroomCaption,
} from "@/lib/ad-studio/caption";
import {
  AD_FORMATS,
  type AdContent,
  type AdFormat,
  downloadCanvas,
  loadImage,
  loadLockup,
  renderAd,
} from "@/lib/ad-studio/render";
import { slugify } from "@/lib/slug";

/**
 * The Ad studio: choose a car (or the whole showroom), see it drawn in every size, download.
 *
 * Module-level components only, for the reason given in onboard-desk.tsx.
 */

const SHOWROOM = "showroom";

/** The family the admin's own text is set in, so the ads match the site. */
function pageFont(): string {
  if (typeof window === "undefined") return "Arial, sans-serif";
  return getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
}

function Preview({
  format,
  content,
  filename,
}: {
  format: AdFormat;
  content: AdContent | null;
  filename: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canvas.current && content) renderAd(canvas.current, format, content);
  }, [format, content]);

  return (
    <figure className="rn-studio__preview">
      <div className="rn-studio__frame" style={{ aspectRatio: `${format.w} / ${format.h}` }}>
        <canvas
          ref={canvas}
          className="rn-studio__canvas"
          role="img"
          aria-label={`${format.label} ad, ${format.w} by ${format.h}`}
        />
      </div>
      <figcaption className="rn-studio__caption">
        <span className="rn-studio__format">{format.label}</span>
        <span className="rn-onboard__hint">{format.hint}</span>
        <button
          type="button"
          className="rn-onboard__button"
          disabled={!content || busy}
          onClick={async () => {
            if (!canvas.current) return;
            setBusy(true);
            await downloadCanvas(canvas.current, `${filename}-${format.id}`).catch(() => undefined);
            setBusy(false);
          }}
        >
          <Download aria-hidden="true" /> Download
        </button>
      </figcaption>
    </figure>
  );
}

export type StudioSocial = {
  accounts: { id: number; network: "facebook" | "instagram"; displayName: string }[];
  /** Only a principal or manager posts to the dealership's Page. */
  canPost: boolean;
};

/**
 * Post it: the square ad, drawn again at full size, sent to the dealership's own Page and
 * Instagram through Rynet. Only on the dealership's own screen.
 */
function PostPanel({
  social,
  content,
  caption,
  vehicleId,
}: {
  social: StudioSocial;
  content: AdContent | null;
  caption: string;
  vehicleId: number | null;
}) {
  const [chosen, setChosen] = useState<number[]>(social.accounts.map((account) => account.id));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const square = AD_FORMATS.find((format) => format.id === "post");

  if (social.accounts.length === 0) {
    return (
      <p className="rn-onboard__hint">
        Connect your Facebook Page in <a href="/portal/social">Social</a> and you can post this
        straight to it from here.
      </p>
    );
  }
  if (!social.canPost) {
    return (
      <p className="rn-onboard__hint">
        Your dealer principal or a manager can post this to your Page. Download it to share it
        yourself.
      </p>
    );
  }

  async function post() {
    if (!content || !square || chosen.length === 0) return;
    setBusy(true);
    setResult(null);
    const canvas = document.createElement("canvas");
    renderAd(canvas, square, content);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setBusy(false);
      setResult({ ok: false, text: "The picture could not be made. Try again." });
      return;
    }
    const form = new FormData();
    form.set("image", blob, "ad.jpg");
    form.set("caption", caption);
    form.set("accounts", chosen.join(","));
    if (vehicleId) form.set("vehicleId", String(vehicleId));
    const response = await fetch("/api/portal/social/post", {
      method: "POST",
      credentials: "include",
      body: form,
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    setResult(
      response?.ok
        ? { ok: true, text: "Sent. It is on its way to your Page now. Follow it in Social." }
        : { ok: false, text: body?.error ?? "That did not go. Try again." },
    );
  }

  return (
    <div className="rn-onboard__field">
      <fieldset className="rn-studio__targets">
        <legend className="rn-onboard__label">Post the square ad to</legend>
        {social.accounts.map((account) => (
          <label key={account.id} className="rn-studio__target">
            <input
              type="checkbox"
              checked={chosen.includes(account.id)}
              onChange={(event) =>
                setChosen((now) =>
                  event.target.checked
                    ? [...now, account.id]
                    : now.filter((id) => id !== account.id),
                )
              }
            />
            {account.network === "instagram" ? "Instagram" : "Facebook"}: {account.displayName}
          </label>
        ))}
      </fieldset>
      <div className="rn-onboard__actions">
        <button
          type="button"
          className="rn-onboard__button rn-onboard__button--primary"
          disabled={busy || !content || chosen.length === 0}
          onClick={() => void post()}
        >
          <Send aria-hidden="true" /> {busy ? "Sending" : "Post now"}
        </button>
      </div>
      {result ? (
        <p
          className={`rn-onboard__result${result.ok ? "" : " rn-onboard__result--bad"}`}
          role={result.ok ? "status" : "alert"}
        >
          {result.text}
        </p>
      ) : null}
    </div>
  );
}

export function AdStudio({
  dealer,
  cars,
  totalLive,
  siteUrl,
  emptyText,
  own = false,
  social = null,
}: {
  dealer: AdDealer;
  cars: AdCar[];
  totalLive: number;
  siteUrl: string;
  /** What to say when there is nothing to advertise. */
  emptyText?: string;
  /** True on the dealership's own screen, where "their" becomes "your". */
  own?: boolean;
  /** The dealership's connected Page, on its own screen. Staff post nothing from here. */
  social?: StudioSocial | null;
}) {
  const [choice, setChoice] = useState<string>(cars[0] ? String(cars[0].id) : SHOWROOM);
  const [content, setContent] = useState<AdContent | null>(null);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);

  const car = cars.find((candidate) => String(candidate.id) === choice) ?? null;
  const domain = siteUrl.replace(/^https?:\/\//, "");

  const caption = useMemo(
    () =>
      own
        ? car
          ? ownCaption(car)
          : ownShowroomCaption(dealer, totalLive)
        : car
          ? carCaption(car, dealer)
          : showroomCaption(dealer, totalLive),
    [car, dealer, totalLive, own],
  );
  const [text, setText] = useState(caption);
  useEffect(() => setText(caption), [caption]);

  const filename = slugify(
    car ? `${dealer.tradingName} ${car.title}` : `${dealer.tradingName} showroom`,
  );

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setProblem("");

    const photoUrls = car
      ? car.photos.slice(0, 1)
      : cars.slice(0, 3).map((each) => each.photos[0] ?? "");
    const family = pageFont();

    Promise.all([
      // A photograph that will not load is left out rather than allowed to blank the whole ad.
      Promise.allSettled(photoUrls.filter(Boolean).map(loadImage)).then((results) =>
        results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
      ),
      dealer.logoUrl ? loadImage(dealer.logoUrl).catch(() => null) : Promise.resolve(null),
      loadLockup().catch(() => null),
      document.fonts?.load(`700 64px ${family}`).catch(() => undefined),
    ])
      .then(([photos, dealerLogo, siteLogo]) => {
        if (cancelled) return;
        setContent({
          headline: car ? car.title : dealer.tradingName,
          subline: car
            ? detailLine(car)
            : `${totalLive} ${totalLive === 1 ? "car" : "cars"} in their showroom${dealer.town ? `  |  ${dealer.town}` : ""}`,
          price: car ? priceLabel(car.price) : null,
          cta: car ? `At ${dealer.tradingName}` : "Every dealership checked",
          domain,
          photos,
          dealerLogo,
          siteLogo,
          font: family,
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setProblem(`A photograph could not be loaded: ${error.message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [car, cars, dealer, totalLive, domain]);

  if (cars.length === 0) {
    return (
      <p className="rn-onboard__result rn-onboard__result--bad">
        {emptyText ??
          `${dealer.tradingName} has no live cars with photographs yet, so there is nothing to make an ad of. Load their cars on the onboarding screen first.`}
      </p>
    );
  }

  return (
    <div className="rn-onboard__steps">
      <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-pick">
        <h2 id="studio-pick" className="rn-admin-home__h2">
          What to advertise
        </h2>
        <div className="rn-onboard__field rn-studio__pick">
          <label htmlFor="studio-car" className="rn-onboard__label">
            {own ? "A car, or your whole showroom" : "A car, or their whole showroom"}
          </label>
          <select
            id="studio-car"
            className="rn-onboard__input"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value={SHOWROOM}>
              {own ? "Your" : "The"} whole showroom ({totalLive} cars)
            </option>
            {cars.map((each) => (
              <option key={each.id} value={each.id}>
                {each.title}
                {each.price ? `, ${priceLabel(each.price)}` : ""}
              </option>
            ))}
          </select>
        </div>
        {problem ? (
          <p className="rn-onboard__result rn-onboard__result--bad" role="alert">
            {problem}
          </p>
        ) : null}
      </section>

      {own ? (
        <>
          <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-words">
            <h2 id="studio-words" className="rn-admin-home__h2">
              The words to post with it
            </h2>
            <div className="rn-onboard__field">
              <label htmlFor="studio-caption" className="rn-onboard__label">
                Caption
              </label>
              <textarea
                id="studio-caption"
                className="rn-onboard__input rn-onboard__textarea"
                rows={5}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <div className="rn-onboard__actions">
              <button
                type="button"
                className="rn-onboard__button"
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy the caption"}
              </button>
            </div>
          </section>
          {social ? (
            <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-post">
              <h2 id="studio-post" className="rn-admin-home__h2">
                Post it
              </h2>
              <PostPanel
                social={social}
                content={content}
                caption={text}
                vehicleId={car?.id ?? null}
              />
            </section>
          ) : null}
          <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-ads">
            <h2 id="studio-ads" className="rn-admin-home__h2">
              The ads
            </h2>
            <div className="rn-studio__grid">
              {AD_FORMATS.map((format) => (
                <Preview key={format.id} format={format} content={content} filename={filename} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-ads">
            <h2 id="studio-ads" className="rn-admin-home__h2">
              The ads
            </h2>
            <div className="rn-studio__grid">
              {AD_FORMATS.map((format) => (
                <Preview key={format.id} format={format} content={content} filename={filename} />
              ))}
            </div>
          </section>

          <section className="rn-admin-panel rn-onboard__step" aria-labelledby="studio-words">
            <h2 id="studio-words" className="rn-admin-home__h2">
              The words to post with it
            </h2>
            <div className="rn-onboard__field">
              <label htmlFor="studio-caption" className="rn-onboard__label">
                Caption
              </label>
              <textarea
                id="studio-caption"
                className="rn-onboard__input rn-onboard__textarea"
                rows={5}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <div className="rn-onboard__actions">
              <button
                type="button"
                className="rn-onboard__button"
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy the caption"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
