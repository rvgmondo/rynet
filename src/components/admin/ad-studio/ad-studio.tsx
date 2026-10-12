"use client";

import { Copy, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AdCar,
  type AdDealer,
  carCaption,
  detailLine,
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

export function AdStudio({
  dealer,
  cars,
  totalLive,
  siteUrl,
}: {
  dealer: AdDealer;
  cars: AdCar[];
  totalLive: number;
  siteUrl: string;
}) {
  const [choice, setChoice] = useState<string>(cars[0] ? String(cars[0].id) : SHOWROOM);
  const [content, setContent] = useState<AdContent | null>(null);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);

  const car = cars.find((candidate) => String(candidate.id) === choice) ?? null;
  const domain = siteUrl.replace(/^https?:\/\//, "");

  const caption = useMemo(
    () => (car ? carCaption(car, dealer) : showroomCaption(dealer, totalLive)),
    [car, dealer, totalLive],
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
        {dealer.tradingName} has no live cars with photographs yet, so there is nothing to make an
        ad of. Load their cars on the onboarding screen first.
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
            A car, or their whole showroom
          </label>
          <select
            id="studio-car"
            className="rn-onboard__input"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value={SHOWROOM}>The whole showroom ({totalLive} cars)</option>
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
    </div>
  );
}
