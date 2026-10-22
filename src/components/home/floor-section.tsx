import type { ReactNode } from "react";

import type { FloorTile } from "@/components/home/floor-stock";
import { formatRand } from "@/lib/format";

/**
 * The navy band and the floor of cars under the search.
 *
 * Server rendered and never hydrated as a component: eighty-odd tiles drawn by a client component
 * were a second and a half of script on a throttled phone. The search (FloorSearch) lights tiles
 * by setting `data-on` on them, and lays their photographs once the page is idle, so the tiles
 * arrive as plain HTML with the photograph's address in `data-src` and nothing to download.
 *
 * The floor is decoration with links in it, so it is hidden from assistive technology and the
 * links are out of the tab order: every car is reachable from the search and from /cars.
 */
export function FloorSection({ tiles, children }: { tiles: FloorTile[]; children: ReactNode }) {
  return (
    <section aria-labelledby="floor-heading" className="rn-floor flex flex-col">
      <div className="rn-floor__stage" aria-hidden="true">
        <div className="rn-floor__drift">
          <div className="rn-floor__lot" id="rn-floor-lot">
            {tiles.map((tile, i) => (
              <a
                key={tile.id}
                href={tile.href}
                tabIndex={-1}
                className="rn-floor__tile"
                data-id={tile.id}
                style={{ "--d": `${((i * 37) % 23) * 0.018}s` } as React.CSSProperties}
              >
                {/* biome-ignore lint/performance/noImgElement: the host never resizes on request (images.unoptimized), and these are the stored 320px thumbnails already. */}
                <img
                  data-src={tile.photo.url}
                  alt=""
                  width={tile.photo.width}
                  height={tile.photo.height}
                  decoding="async"
                />
                <b>{formatRand(tile.price)}</b>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="rn-floor__shade" />
      {children}
    </section>
  );
}
