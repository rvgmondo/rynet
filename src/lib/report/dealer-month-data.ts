import type { getPayload } from "payload";

import { MESSAGE_TYPES, type MonthStats, monthRange } from "./dealer-month";

type Payload = Awaited<ReturnType<typeof getPayload>>;

const count = async (
  payload: Payload,
  collection: "vehicles" | "leads",
  where: Record<string, unknown>,
) => (await payload.count({ collection, where: where as never, overrideAccess: true })).totalDocs;

/** Reads one dealership's month from the database. Every number is a count of real rows. */
export async function monthStats(
  payload: Payload,
  dealerId: number,
  month: string,
): Promise<MonthStats> {
  const { from, to } = monthRange(month);
  const dealer = await payload.findByID({ collection: "dealers", id: dealerId, depth: 0 });
  const inMonth = (field: string) => ({
    and: [{ [field]: { greater_than_equal: from } }, { [field]: { less_than: to } }],
  });
  const mine = { dealer: { equals: dealerId } };

  const [carsLive, carsAdded, carsSold, messages, phoneReveals, whatsappTaps] = await Promise.all([
    count(payload, "vehicles", { and: [mine, { status: { equals: "live" } }] }),
    count(payload, "vehicles", { and: [mine, inMonth("publishedAt")] }),
    count(payload, "vehicles", { and: [mine, inMonth("soldAt")] }),
    count(payload, "leads", {
      and: [mine, inMonth("createdAt"), { type: { in: [...MESSAGE_TYPES] } }],
    }),
    count(payload, "leads", {
      and: [mine, inMonth("createdAt"), { type: { equals: "phone_reveal" } }],
    }),
    count(payload, "leads", {
      and: [mine, inMonth("createdAt"), { type: { equals: "whatsapp_click" } }],
    }),
  ]);

  const viewRows = await payload.find({
    collection: "car-views",
    where: { and: [mine, { day: { like: `${month}-` } }] },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const perCar = new Map<number, number>();
  let views = 0;
  for (const row of viewRows.docs) {
    if (!row.day.startsWith(`${month}-`)) continue;
    const id = typeof row.vehicle === "number" ? row.vehicle : row.vehicle.id;
    perCar.set(id, (perCar.get(id) ?? 0) + row.views);
    views += row.views;
  }

  const top = [...perCar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topCars = await Promise.all(
    top.map(async ([id, carViews]) => {
      const car = await payload.findByID({ collection: "vehicles", id, depth: 1 });
      const name = (rel: unknown) =>
        rel && typeof rel === "object" && "name" in rel ? String(rel.name) : null;
      const title = [car.modelYear, name(car.make), name(car.model)].filter(Boolean).join(" ");
      return { title, views: carViews };
    }),
  );

  return {
    dealer: dealer.tradingName,
    month,
    carsLive,
    carsAdded,
    carsSold,
    views,
    messages,
    phoneReveals,
    whatsappTaps,
    topCars,
  };
}
