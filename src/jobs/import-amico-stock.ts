import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import config from "@payload-config";
import { getPayload } from "payload";

import { formatReport } from "@/lib/stock-import/report";
import { importAmicoStock } from "@/lib/stock-import/run";

/**
 * Reads Amico Motors' own website and brings their stock onto Rynet.
 *
 *   npm run import:amico -- --dry-run     read everything, write nothing, print the report
 *   npm run import:amico                  do it
 *   npm run import:amico -- --limit 5     read the first five cars only, for a quick look
 *   npm run import:amico -- --allow-large-removal
 *                                         let one run hide more than half of their cars, after a
 *                                         person has checked their site really shows that
 *
 * RUN IT HERE, NOT ON THE HOST.
 *
 * It converts photographs with sharp, and the live site is a shared CloudLinux account that went
 * down once when image encoding piled up on it. So this is a command a person runs on a machine
 * with a terminal, against the local database, and the result reaches the live site the way every
 * other change does: through a deploy. It never runs inside a page request, and it never converts
 * two images at once.
 *
 * ALWAYS DRY RUN FIRST. The dry run makes exactly the same decisions, on the same pages, and
 * prints what it would do without touching the database or their photographs.
 *
 * The report is printed and also written to import-reports/, which is not in git: it names a real
 * dealership's stock and belongs next to the database rather than in the repository.
 */

const REPORTS = "import-reports";

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

export async function runAmicoImport(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const limitText = flagValue("--limit");
  const limit = limitText ? Number.parseInt(limitText, 10) : undefined;

  const payload = await getPayload({ config });
  const write = (line: string) => process.stdout.write(`${line}\n`);

  write(dryRun ? "Dry run. Nothing will be written." : "Importing. This writes to the database.");

  const report = await importAmicoStock({
    payload,
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined,
    allowLargeRemoval: process.argv.includes("--allow-large-removal"),
    log: write,
  });

  const text = formatReport(report);
  write("");
  write(text);

  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const file = path.join(
    process.cwd(),
    REPORTS,
    `${report.source.replace(/\./g, "-")}-${dryRun ? "dry-run-" : ""}${stamp}.md`,
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${text}\n`, "utf8");
  write(`Report written to ${path.relative(process.cwd(), file)}`);
}

// Run directly: `npx tsx src/jobs/import-amico-stock.ts [--dry-run] [--limit 5]`
if (process.argv[1]?.includes("import-amico-stock")) {
  runAmicoImport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
