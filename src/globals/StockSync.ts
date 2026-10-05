import type { GlobalConfig } from "payload";

import { isPlatformStaff } from "@/access/roles";

/**
 * What the live site remembers about reading a dealership's stock list.
 *
 * WHY A RECORD AND NOT A LOG FILE
 *
 * The sync runs inside the deployed app, and the host gives nobody a terminal to read a log in.
 * So each run writes what it did here, where staff can read it on the admin home screen, and
 * where the next run can see whether another process is already busy.
 *
 * `runningSince` is the lease. Passenger can run more than one Node process against the same
 * database, and two processes importing the same stock list at the same time would fetch the same
 * pages twice and race each other's writes. A process only starts a run if this is empty or older
 * than the stale limit, and clears it when it finishes, including when it fails.
 */
export const StockSync: GlobalConfig = {
  slug: "stock-sync",
  label: "Stock sync",
  admin: {
    group: "Website settings",
    description:
      "Reading Amico Motors' own website and keeping their cars on Rynet up to date. Written by the site itself.",
  },
  access: {
    read: ({ req }) => isPlatformStaff(req.user),
    update: ({ req }) => isPlatformStaff(req.user),
  },
  fields: [
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: true,
      label: "Keep the stock list in step",
      admin: {
        description:
          "Off stops the site reading the dealership's website. Their cars stay exactly as they are now.",
      },
    },
    {
      name: "runningSince",
      type: "date",
      label: "A run started at",
      admin: {
        readOnly: true,
        description:
          "Set while a run is busy and cleared when it ends. If it is stuck here from a crash, it is ignored after an hour.",
      },
    },
    {
      name: "lastFinishedAt",
      type: "date",
      label: "Last finished",
      admin: { readOnly: true },
    },
    {
      name: "initialImportDoneAt",
      type: "date",
      label: "First full import finished",
      admin: {
        readOnly: true,
        description:
          "The first run that read the whole stock list and left every car either live or held back with a reason. The demonstration stock is put away on that day.",
      },
    },
    {
      name: "demonstrationStockHiddenAt",
      type: "date",
      label: "Demonstration stock put away",
      admin: {
        readOnly: true,
        description:
          "When the example cars and example dealerships were hidden, because a real dealership's stock went live. Nothing was deleted.",
      },
    },
    {
      name: "runs",
      type: "array",
      label: "Recent runs",
      maxRows: 20,
      admin: { readOnly: true, initCollapsed: true },
      fields: [
        { name: "finishedAt", type: "date", label: "Finished" },
        { name: "summary", type: "textarea", label: "What happened" },
        { name: "ok", type: "checkbox", label: "Finished without an error" },
      ],
    },
  ],
};
