/**
 * Creates the first platform admin.
 *
 * Payload's "create first user" screen defaults the role to Sales agent, which is the right
 * default for the invite flow and exactly wrong for the first account on a fresh database:
 * it would produce a dealer-role user with no dealership, which can do nothing at all and
 * cannot promote itself.
 *
 * So the first admin is created here instead, deliberately and repeatably.
 *
 * Run with: npm run seed:admin
 */

import config from "@payload-config";
import { getPayload } from "payload";

const EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

async function main() {
  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: EMAIL } },
    limit: 1,
    depth: 0,
  });

  if (existing.docs[0]) {
    process.stdout.write(`${EMAIL} already exists. Nothing to do.\n`);
    process.exit(0);
  }

  await payload.create({
    collection: "users",
    data: {
      email: EMAIL,
      password: PASSWORD,
      name: "Platform admin",
      role: "platform_admin",
      status: "active",
    },
  });

  process.stdout.write(`Created platform admin: ${EMAIL}\n`);
  process.stdout.write(
    "Change this password the first time you sign in. Two-factor is mandatory on this role.\n",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
