import config from "@payload-config";
import { getPayload } from "payload";

import { installDemoPhotos, removeDemoPhotos } from "./demo-photos";

/**
 * Put the demonstration photographs onto the demonstration stock, from the command line.
 *
 *   npm run seed:photos                 # install, if nothing is installed yet
 *   npm run seed:photos -- --refresh    # take them out and put them back
 *   npm run seed:photos -- --clear      # take them out
 *
 * The work is in src/seed/demo-photos.ts, which the live host also runs, through a database
 * migration, because it has no terminal to run this from. See that file for the rules: what is
 * claimed about the photographs, why one listing in twelve stays bare, and why it refuses to
 * touch a platform with any real stock on it.
 */
async function main() {
  const refresh = process.argv.includes("--refresh");
  const clear = process.argv.includes("--clear");

  const payload = await getPayload({ config });

  if (clear || refresh) {
    const removed = await removeDemoPhotos(payload);
    console.log(`removed ${removed} demonstration photographs`);
    if (clear) return;
  }

  const result = await installDemoPhotos(payload, { log: (message) => console.log(message) });
  console.log(result.installed ? "done" : `nothing installed: ${result.reason}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
