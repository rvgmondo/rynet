import { groupByKind, QUALITY_MEANING } from "./quality";
import type { ImportReport } from "./run";

/**
 * The run, written out for a person rather than for a log parser.
 *
 * An import is a thing that happened to somebody's stock, so the report answers the questions the
 * person who ran it will actually ask: how many cars went up, which ones did not and why, what was
 * added to the lists, and what is wrong with the dealership's own data. The last of those is the
 * point of the "Worth telling the dealership" section: this reads their website more carefully
 * than anyone has in months, so what it trips over is worth passing back to them.
 */

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export function formatReport(report: ImportReport): string {
  const lines: string[] = [];
  const heading = report.dryRun ? "Dry run" : "Import";

  lines.push(`# ${heading} of ${report.source}`);
  lines.push("");
  lines.push(`Started ${report.startedAt}, finished ${report.finishedAt}.`);
  lines.push(`${plural(report.requests, "request", "requests")} to ${report.source}.`);
  lines.push("");

  lines.push("## What happened");
  lines.push("");
  lines.push(`- ${plural(report.listingsFound, "car", "cars")} on the stock list`);
  lines.push(
    `- ${plural(report.created, "car", "cars")} ${report.dryRun ? "would be added" : "added"}`,
  );
  lines.push(
    `- ${plural(report.updated, "car", "cars")} ${report.dryRun ? "would change" : "changed"}`,
  );
  lines.push(`- ${plural(report.unchanged, "car", "cars")} already correct`);
  lines.push(
    `- ${plural(report.expired, "car", "cars")} no longer on the stock list, so ${report.dryRun ? "would be hidden" : "hidden"}`,
  );
  lines.push(`- ${plural(report.heldBack, "car", "cars")} kept hidden, see below`);
  lines.push(
    `- ${plural(report.leftAlone, "car", "cars")} left alone, because a person had decided`,
  );
  if (report.unreadable > 0) {
    lines.push(`- ${plural(report.unreadable, "listing page", "listing pages")} could not be read`);
  }
  if (report.failed > 0) lines.push(`- ${plural(report.failed, "car", "cars")} could not be saved`);
  lines.push(
    `- ${plural(report.photosSaved, "photograph", "photographs")} downloaded and converted, ${report.photosReused} already here and used again, ${report.photosSkipped} skipped`,
  );
  if (report.liveAfter !== null) {
    lines.push(
      `- ${plural(report.liveAfter, "car", "cars")} from this stock list live on Rynet now`,
    );
  }
  lines.push(
    `- ${plural(report.contactDetailsRemoved, "contact detail", "contact details")} taken out of the descriptions`,
  );
  lines.push("");

  const additions: [string, string[]][] = [
    ["Makes added", report.makesAdded],
    ["Models added", report.modelsAdded],
    ["Colours added", report.coloursAdded],
  ];
  for (const [title, values] of additions) {
    const unique = [...new Set(values)].sort();
    if (unique.length === 0) continue;
    lines.push(`## ${title}`);
    lines.push("");
    for (const value of unique) lines.push(`- ${value}`);
    lines.push("");
  }

  if (report.expiryWithheld) {
    lines.push("## Nothing was hidden for being missing");
    lines.push("");
    lines.push(`Because ${report.expiryWithheld}.`);
    lines.push("");
  }

  const held = report.cars.filter((car) => car.outcome === "held back" || car.reasons.length > 0);
  if (held.length > 0) {
    lines.push("## Cars kept hidden, and why");
    lines.push("");
    for (const car of held) {
      const why = car.note ?? car.reasons.join(", ");
      lines.push(`- ${car.name || car.externalId}: ${why}`);
      if (car.url) lines.push(`  ${car.url}`);
    }
    lines.push("");
  }

  const expired = report.cars.filter((car) => car.outcome === "expired");
  if (expired.length > 0) {
    lines.push("## Hidden, because the stock list no longer shows them");
    lines.push("");
    for (const car of expired) lines.push(`- ${car.name || car.externalId}`);
    lines.push("");
  }

  // A page already reported for naming two models is not reported again for its address.
  const conflicted = new Set(
    report.dataQuality
      .filter((note) => note.kind === "the details and the title name different models")
      .map((note) => note.url),
  );
  const quality = groupByKind(
    report.dataQuality.filter(
      (note) => note.kind !== "model does not match the address" || !conflicted.has(note.url),
    ),
  );
  if (quality.size > 0) {
    lines.push("## Worth telling the dealership");
    lines.push("");
    for (const [kind, notes] of quality) {
      lines.push(`### ${plural(notes.length, "car", "cars")}: ${kind}`);
      lines.push("");
      lines.push(QUALITY_MEANING[kind]);
      lines.push("");
      // The ones a car is hidden for are listed in full: each is a car that is not on the site.
      const shown =
        kind === "the details and the title name different models" ||
        kind === "a detail a buyer needs is missing"
          ? notes
          : notes.slice(0, 8);
      for (const note of shown) lines.push(`- ${note.url} (${note.detail})`);
      if (notes.length > shown.length) lines.push(`- and ${notes.length - shown.length} more`);
      lines.push("");
    }
  }

  if (report.problems.length > 0) {
    lines.push("## What the import could not do");
    lines.push("");
    for (const problem of [...new Set(report.problems)]) lines.push(`- ${problem}`);
    lines.push("");
  }

  lines.push("## Every car");
  lines.push("");
  for (const car of report.cars) {
    const detail = [
      car.outcome,
      car.photos > 0 ? `${car.photos} photos` : "no photos",
      car.changed.length > 0 ? `changed: ${car.changed.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${car.name || car.externalId}: ${detail}`);
  }
  lines.push("");

  return lines.join("\n");
}
