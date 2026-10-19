import type { SaidBack } from "@/components/search/understand";

/** What the home page search action answers with. Kept apart: a "use server" file exports only functions. */
export type Understood = {
  /** The words this answers, so a late reply to old words can be ignored. */
  text: string;
  total: number;
  /** Every live car, for "14 of 397". */
  all: number;
  /** The matching cars, so the floor can light the ones it shows. */
  ids: number[];
  chips: SaidBack[];
  unmatched: string[];
  /** Words were typed and none of them meant anything. */
  nothing: boolean;
  calls: { label: string; text: string; gain: number }[];
  /** The finance disclaimer, present whenever a monthly figure is on screen. */
  disclaimer: string | null;
  href: string;
};
