"use client";

import { type CSSProperties, useEffect, useRef } from "react";

import { STAGES } from "@/components/agency/agency-content";

/*
 * THE FIVE STAGES, AS A ROAD. The agency home page's version of StageSteps: the same five stages
 * from the same list, set along a road that the hero's bakkie drives as the reader scrolls,
 * lighting each stage as it reaches it. On a phone the road runs down the left edge instead of
 * across.
 *
 * --r runs 0 to 1 while the road crosses the middle of the screen, set from scroll in one
 * rAF-throttled listener. Before the script runs, and with reduced motion, the bakkie is parked
 * at the end and every stage is lit, which is the whole list, readable, with nothing moving.
 */

function Bakkie() {
  return (
    <svg viewBox="0 0 240 90" aria-hidden="true">
      <path
        d="M10 62 L10 47 Q11 41 19 40 L58 37 L78 17 Q81 13 88 13 L146 13 Q151 13 151 18 L151 40 L226 40 Q231 40 231 45 L231 62 Z"
        fill="#c62a32"
      />
      <path d="M85 19 L110 19 L110 35 L71 35 Z M114 19 L145 19 L145 35 L114 35 Z" fill="#dbe4ef" />
      <circle cx="52" cy="64" r="15" fill="#0b1626" />
      <circle cx="52" cy="64" r="7" fill="#9aa8ba" />
      <circle cx="196" cy="64" r="15" fill="#0b1626" />
      <circle cx="196" cy="64" r="7" fill="#9aa8ba" />
    </svg>
  );
}

export function StageRoad() {
  const root = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.live = "true";
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const start = innerHeight * 0.85;
      const end = innerHeight * 0.3 - box.height;
      const r = Math.min(1, Math.max(0, (start - box.top) / (start - end)));
      el.style.setProperty("--r", r.toFixed(4));
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
    <ol ref={root} className="rn-road">
      <li aria-hidden="true" className="rn-road__track">
        <span className="rn-road__done" />
        <span className="rn-road__car">
          <Bakkie />
        </span>
      </li>
      {STAGES.map((stage, index) => (
        <li
          key={stage.name}
          className="rn-road__stage"
          style={{ "--k": index / (STAGES.length - 1) } as CSSProperties}
        >
          <span aria-hidden="true" className="rn-road__dot">
            {index + 1}
          </span>
          <h3 className="rn-road__name">{stage.name}</h3>
          {stage.duration ? <p className="rn-road__when">{stage.duration}</p> : null}
          <p className="rn-road__what">{stage.short}</p>
        </li>
      ))}
    </ol>
  );
}
