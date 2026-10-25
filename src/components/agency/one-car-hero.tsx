"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef } from "react";

/*
 * ONE CAR, EVERYWHERE. The agency home page's opening, and the argument for Rynet Digital in one
 * scroll: a dealership's problem is not "a website", it is one car that has to be right in six
 * places at once.
 *
 * A line of stock data, the way a dealership's system exports it, sits in the middle. As the
 * reader scrolls, six places that car has to live come in from depth and lock round it: the
 * dealership's own site, Rynet, a Google result, a Facebook ad, a WhatsApp share and the month's
 * report. Then the price changes on the source line and in all six together, then the car sells
 * and all six say so. That is a stock feed, shown rather than explained.
 *
 * The car is an example and says so: no dealership's name, photograph or price is borrowed.
 *
 * HOW IT MOVES. One custom property, --p, from 0 to 1 across the section, set from scroll in a
 * single rAF-throttled listener. Everything else is CSS: each surface works out its own progress
 * from --p with clamp(), so there is no animation library, nothing to hydrate beyond this one
 * effect, and the first paint is the static end state (every surface in place, the new price,
 * not yet sold) until the script runs. With reduced motion the script never runs and that end
 * state is what the reader sees.
 */

const SURFACES = [
  { id: "site", label: "Your website" },
  { id: "rynet", label: "Rynet" },
  { id: "google", label: "Google" },
  { id: "facebook", label: "A Facebook ad" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "report", label: "Your monthly report" },
] as const;

const CAR = "2021 Toyota Hilux 2.8 GD-6 Raider";
const WAS = "R 489 900";
const NOW = "R 474 900";

function Price() {
  return (
    <span className="rn-onecar__price">
      <span className="rn-onecar__was">{WAS}</span>
      <span className="rn-onecar__now">{NOW}</span>
    </span>
  );
}

function Sold() {
  return (
    <span className="rn-onecar__sold" aria-hidden="true">
      Sold
    </span>
  );
}

/** A plain side view of a double cab bakkie, drawn rather than photographed: the car is an example. */
function Bakkie({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 90" className={className} aria-hidden="true">
      <path
        d="M10 62 L10 47 Q11 41 19 40 L58 37 L78 17 Q81 13 88 13 L146 13 Q151 13 151 18 L151 40 L226 40 Q231 40 231 45 L231 62 Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path d="M85 19 L110 19 L110 35 L71 35 Z M114 19 L145 19 L145 35 L114 35 Z" fill="#c9d6e6" />
      <path d="M156 40 L226 40" stroke="#0b1626" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="52" cy="64" r="15" fill="#0b1626" />
      <circle cx="52" cy="64" r="7" fill="#9aa8ba" />
      <circle cx="196" cy="64" r="15" fill="#0b1626" />
      <circle cx="196" cy="64" r="7" fill="#9aa8ba" />
    </svg>
  );
}

function Surface({ id, index }: { id: (typeof SURFACES)[number]["id"]; index: number }) {
  const style = { "--i": index } as CSSProperties;
  const label = SURFACES[index]?.label;

  return (
    <div className={`rn-onecar__surface rn-onecar__surface--${id}`} style={style}>
      <p className="rn-onecar__where">{label}</p>
      <div className="rn-onecar__card">
        {id === "site" ? (
          <>
            <p className="rn-onecar__bar">yourdealership.co.za/stock</p>
            <Bakkie className="rn-onecar__pic" />
            <p className="rn-onecar__name">{CAR}</p>
            <Price />
          </>
        ) : null}
        {id === "rynet" ? (
          <>
            <p className="rn-onecar__bar">rynet.co.za</p>
            <Bakkie className="rn-onecar__pic" />
            <p className="rn-onecar__name">{CAR}</p>
            <p className="rn-onecar__meta">Verified dealership, 84 000 km</p>
            <Price />
          </>
        ) : null}
        {id === "google" ? (
          <>
            <p className="rn-onecar__url">yourdealership.co.za</p>
            <p className="rn-onecar__link">{CAR} for sale | Your Dealership</p>
            <p className="rn-onecar__meta">
              <Price />, 84 000 km, diesel, in stock now.
            </p>
          </>
        ) : null}
        {id === "facebook" ? (
          <>
            <p className="rn-onecar__meta">Your Dealership, Sponsored</p>
            <Bakkie className="rn-onecar__pic" />
            <p className="rn-onecar__name">{CAR}</p>
            <p className="rn-onecar__row">
              <Price />
              <span className="rn-onecar__btn">Send message</span>
            </p>
          </>
        ) : null}
        {id === "whatsapp" ? (
          <div className="rn-onecar__bubble">
            <p className="rn-onecar__name">{CAR}</p>
            <p className="rn-onecar__meta">
              <Price />, 84 000 km
            </p>
            <p className="rn-onecar__msg">Is this one still available?</p>
          </div>
        ) : null}
        {id === "report" ? (
          <>
            <p className="rn-onecar__name">Where this car's enquiries came from</p>
            {["Website", "Rynet", "Google", "Facebook", "WhatsApp"].map((source, n) => (
              <p key={source} className="rn-onecar__bars">
                <span>{source}</span>
                <span className="rn-onecar__bars-track">
                  <span style={{ width: `${[72, 58, 40, 30, 22][n]}%` }} />
                </span>
              </p>
            ))}
          </>
        ) : null}
        <Sold />
      </div>
    </div>
  );
}

export function OneCarHero({
  mockup,
  review,
}: {
  mockup: { href: string; label: string };
  review: { href: string; label: string };
}) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.live = "true";
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const run = box.height - innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : 1;
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={section} className="rn-onecar on-navy" aria-labelledby="onecar-heading">
      <div className="rn-onecar__stage">
        <div className="rn-onecar__copy container-page">
          <p className="rn-eyebrow text-on-navy-muted">
            Rynet Digital, for South African car dealerships
          </p>
          <h1 id="onecar-heading" className="rn-onecar__title">
            <span className="rn-onecar__step rn-onecar__step--1">
              One car. Six places it has to be right.
            </span>
            <span className="rn-onecar__step rn-onecar__step--2" aria-hidden="true">
              Change the price once.
            </span>
            <span className="rn-onecar__step rn-onecar__step--3" aria-hidden="true">
              Sell it once. <em>Everywhere knows.</em>
            </span>
          </h1>
        </div>

        <div className="rn-onecar__scene" aria-hidden="true">
          <div className="rn-onecar__source">
            <p className="rn-onecar__source-head">Your stock export, one line</p>
            <p className="rn-onecar__source-line">
              <span>2021</span>
              <span>Toyota</span>
              <span>Hilux 2.8 GD-6 Raider</span>
              <span>84 000 km</span>
              <Price />
              <span className="rn-onecar__status">
                <span className="rn-onecar__instock">In stock</span>
                <span className="rn-onecar__soldtext">Sold</span>
              </span>
            </p>
          </div>
          {SURFACES.map((surface, index) => (
            <Surface key={surface.id} id={surface.id} index={index} />
          ))}
        </div>

        <div className="rn-onecar__foot container-page">
          <p className="rn-onecar__lead">
            Websites, stock feeds and advertising for car dealerships, from the team that built the
            Rynet marketplace. Your cars go everywhere a buyer looks, and stay right there. You own
            everything we build.
          </p>
          <div className="rn-onecar__actions">
            <Link href={mockup.href} className="rn-btn rn-btn--primary rn-btn--lg">
              {mockup.label}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href={review.href} className="rn-onecar__ghost">
              {review.label}
            </Link>
          </div>
          <p className="rn-onecar__note">
            An example car. Scroll to see the price change and the car sell.
          </p>
        </div>
      </div>
    </section>
  );
}
