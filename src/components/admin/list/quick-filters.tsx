"use client";

import { useListQuery } from "@payloadcms/ui";
import type { Where } from "payload";
import { useId } from "react";

import type { ListCondition } from "@/lib/admin-links";
import { quickFilterWhere, sameWhere } from "@/lib/admin-list";

/**
 * One-click filters above a list: "Needs a reply", "Live", "Waiting for checks".
 *
 * Each button sets the list's own filter, in the shape Payload's filter panel reads back, so the
 * panel shows what is applied and the address bar can be shared or bookmarked. Buttons rather
 * than links, because the same list opens inside a picker drawer (choosing the car on an
 * enquiry), where a link would take the whole page away.
 *
 * The filter that is on is marked with aria-pressed and drawn filled with a tick, so the state is
 * never shown by colour alone. A filter set by hand in the panel that matches no button leaves
 * them all off.
 */

export type QuickFilter = {
  label: string;
  /** No conditions: the button that clears the filter. */
  conditions: ListCondition[];
};

export function QuickFilters({ filters = [] }: { filters?: QuickFilter[] }) {
  const { query, refineListData } = useListQuery();
  const labelId = useId();
  if (filters.length === 0) return null;

  return (
    <div className="rn-admin-quick-filters">
      <span className="rn-admin-quick-filters__label" id={labelId}>
        Show
      </span>
      <ul aria-labelledby={labelId} className="rn-admin-quick-filters__list">
        {filters.map((filter) => {
          const where = quickFilterWhere(filter.conditions);
          const pressed = sameWhere(query?.where, where);
          return (
            <li key={filter.label}>
              <button
                aria-pressed={pressed}
                className="rn-admin-quick-filter"
                onClick={() => {
                  void refineListData({ where: where as Where, page: 1 });
                }}
                type="button"
              >
                {filter.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
