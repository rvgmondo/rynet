import config from "@payload-config";
import { getPayload } from "payload";

/*
 * LIVE FROM THE MARKETPLACE. Three figures read from Rynet itself when the page is asked for: the
 * real cars live, the checked dealerships selling them, and how long ago a dealership's stock was
 * last read from its own website. The third is the stock feed this agency sells, shown working,
 * with its own timestamp, rather than described.
 *
 * Demonstration stock and dealerships are never counted: these figures are the proof, and an
 * example car in them would be a claim. If the read fails, or there is nothing real to count yet,
 * the strip is not drawn at all; it never shows a zero or a guess.
 */

type Proof = { cars: number; dealers: number; lastRead: Date | null };

async function readProof(): Promise<Proof | null> {
  try {
    const payload = await getPayload({ config });
    const real = { isDemonstration: { not_equals: true } };
    const [cars, dealers, newest] = await Promise.all([
      payload.count({
        collection: "vehicles",
        where: { and: [{ status: { equals: "live" } }, real] },
      }),
      payload.count({
        collection: "dealers",
        where: { and: [{ verificationStatus: { equals: "verified" } }, real] },
      }),
      payload.find({
        collection: "vehicles",
        where: {
          and: [{ status: { equals: "live" } }, real, { lastSeenInSourceAt: { exists: true } }],
        },
        sort: "-lastSeenInSourceAt",
        limit: 1,
        depth: 0,
        select: { lastSeenInSourceAt: true },
      }),
    ]);
    if (cars.totalDocs === 0 || dealers.totalDocs === 0) return null;
    const seen = newest.docs[0]?.lastSeenInSourceAt;
    return {
      cars: cars.totalDocs,
      dealers: dealers.totalDocs,
      lastRead: seen ? new Date(seen) : null,
    };
  } catch (error) {
    console.error("Agency home: could not read the live proof.", error);
    return null;
  }
}

/** "12 minutes ago", "3 hours ago", "2 days ago": rounded down, never "0". */
function ago(then: Date, now = new Date()): string {
  const minutes = Math.max(1, Math.floor((now.getTime() - then.getTime()) / 60000));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

const n = (value: number) => value.toLocaleString("en-ZA").replace(/[,  ]/g, " ");

export async function LiveProof() {
  const proof = await readProof();
  if (!proof) return null;

  const items = [
    {
      figure: n(proof.cars),
      label: proof.cars === 1 ? "car live on Rynet now" : "cars live on Rynet now",
    },
    {
      figure: n(proof.dealers),
      label:
        proof.dealers === 1
          ? "checked dealership selling them"
          : "checked dealerships selling them",
    },
    ...(proof.lastRead
      ? [
          {
            figure: ago(proof.lastRead),
            label:
              "a dealership's stock was last read from its own website, by the feed we would build for you",
          },
        ]
      : []),
  ];

  return (
    <div className="rn-live">
      <p className="rn-live__head">
        <span className="rn-live__pulse" aria-hidden="true" />
        Live from the marketplace, as this page loaded
      </p>
      <dl className="rn-live__grid">
        {items.map((item) => (
          <div key={item.label} className="rn-live__item">
            <dt className="rn-live__label">{item.label}</dt>
            <dd className="rn-live__figure tabular">{item.figure}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
