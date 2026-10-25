"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { MOCKUP_CTA, MOCKUP_OFFER, MOCKUP_STEPS } from "@/content/agency/mockup-offer";

/*
 * THE FREE MOCKUP, SHOWN. A phone holding a typical dealership homepage of the kind we review
 * every week (a slider, "Welcome to our website", three empty dropdowns and no car), and as the
 * reader scrolls a scan line wipes it into the homepage we would make: a car on the first screen,
 * its price, and a way to call. Both screens are illustrations of "Your Dealership", labelled as
 * such; no real dealership's site is shown, in either state.
 *
 * One custom property, --w, from 0 to 1 as the phone crosses the screen, set from scroll the same
 * way as the hero. Before the script runs, and with reduced motion, the phone shows the two
 * halves side by side at 0.5, so the comparison still reads without any motion.
 */

function BeforeScreen() {
  return (
    <div className="rn-wipe__screen rn-wipe__before">
      <div className="rn-wipe__b-top">
        <span>YOUR DEALERSHIP</span>
        <span className="rn-wipe__b-burger" />
      </div>
      <div className="rn-wipe__b-slider">
        <span>Welcome to our website</span>
        <span className="rn-wipe__b-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
      <p className="rn-wipe__b-h">FIND YOUR NEXT VEHICLE</p>
      {["Any make", "Any model", "Any year"].map((label) => (
        <span key={label} className="rn-wipe__b-select">
          {label}
        </span>
      ))}
      <span className="rn-wipe__b-search">SEARCH</span>
      <p className="rn-wipe__b-copy">
        We are a family business dedicated to quality and service. Contact us today.
      </p>
    </div>
  );
}

function AfterScreen() {
  return (
    <div className="rn-wipe__screen rn-wipe__after">
      <div className="rn-wipe__a-top">
        <span>Your Dealership</span>
        <span className="rn-wipe__a-call">Call</span>
      </div>
      <p className="rn-wipe__a-h">
        64 cars on our floor. <em>Bakkies from R 189 900.</em>
      </p>
      <div className="rn-wipe__a-card">
        <svg viewBox="0 0 240 90" aria-hidden="true">
          <path
            d="M10 62 L10 47 Q11 41 19 40 L58 37 L78 17 Q81 13 88 13 L146 13 Q151 13 151 18 L151 40 L226 40 Q231 40 231 45 L231 62 Z"
            fill="#c62a32"
          />
          <path
            d="M85 19 L110 19 L110 35 L71 35 Z M114 19 L145 19 L145 35 L114 35 Z"
            fill="#dbe4ef"
          />
          <circle cx="52" cy="64" r="15" fill="#0b1626" />
          <circle cx="196" cy="64" r="15" fill="#0b1626" />
        </svg>
        <p className="rn-wipe__a-name">2021 Hilux 2.8 GD-6 Raider</p>
        <p className="rn-wipe__a-price">R 474 900</p>
      </div>
      <div className="rn-wipe__a-chips">
        <span>Bakkies</span>
        <span>SUVs</span>
        <span>Under R 200 000</span>
      </div>
      <span className="rn-wipe__a-cta">WhatsApp us about this car</span>
    </div>
  );
}

export function MockupWipe() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const phone = el.querySelector<HTMLElement>(".rn-wipe__phone");
    if (!phone) return;
    el.dataset.live = "true";
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = phone.getBoundingClientRect();
      // 0 when the phone's top reaches 80% down the screen, 1 when its middle reaches 35%.
      const start = innerHeight * 0.8;
      const end = innerHeight * 0.35 - box.height / 2;
      const w = Math.min(1, Math.max(0, (start - box.top) / (start - end)));
      el.style.setProperty("--w", w.toFixed(4));
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
    <section ref={root} aria-labelledby="wipe-heading" className="rn-wipe">
      <div className="container-page rn-wipe__grid">
        <div className="rn-wipe__copy">
          <p className="rn-eyebrow">The free mockup</p>
          <h2 id="wipe-heading" className="rn-h2 mt-2">
            {MOCKUP_OFFER.headline}
          </h2>
          <p className="mt-4 text-body sm:text-lg">{MOCKUP_OFFER.promise}</p>

          <ol className="mt-8 space-y-5">
            {MOCKUP_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-heading">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={MOCKUP_CTA.href} className="rn-btn rn-btn--primary rn-btn--lg">
              {MOCKUP_CTA.label}
              <ArrowRight aria-hidden="true" />
            </Link>
            <span className="flex items-center gap-2 text-sm text-body">
              <Check aria-hidden="true" className="size-4 text-success" />
              Free, private, no obligation
            </span>
          </div>
        </div>

        <figure className="rn-wipe__figure">
          <div className="rn-wipe__phone" aria-hidden="true">
            <BeforeScreen />
            <AfterScreen />
            <span className="rn-wipe__line" />
            <span className="rn-wipe__tag rn-wipe__tag--before">Before</span>
            <span className="rn-wipe__tag rn-wipe__tag--after">Your mockup</span>
          </div>
          <figcaption className="mt-4 text-center text-sm text-body">
            An illustration: a typical dealership homepage, and the kind of first screen we design
            instead. Your mockup uses your own cars and photographs.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
