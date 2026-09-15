import config from "@payload-config";
import { ArrowRight, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import {
  DealerDirectoryCard,
  type DirectoryDealer,
} from "@/components/dealers/dealer-directory-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { relId, relName, relSlug } from "@/lib/relations";
import { vehiclePhoto } from "@/lib/vehicle-photo";
import type { Vehicle } from "@/payload-types";

/**
 * Rendered on demand, not prerendered.
 *
 * This reads the dealership list from the database. Prerendering it would freeze that list
 * at build time, so a newly verified dealership would not appear until the next deploy, and
 * it would fail the build outright anywhere there is no database, which is exactly what
 * happened in CI.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find a dealership",
  description:
    "Every dealership on Rynet is checked before it can list, and private sellers cannot list at all. Browse dealerships by province and see what each one has in stock.",
  alternates: { canonical: "/dealers" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || null;

/**
 * The dealership directory.
 *
 * Only verified dealerships appear, filtered here and enforced again in the collection's read
 * rule. A pending or suspended dealership is invisible rather than greyed out: on a platform
 * whose promise is "checked dealerships only", a half-listed business is worse than none.
 *
 * The filter is a GET form with a submit button, so it works before any JavaScript arrives and
 * a filtered directory is a link that can be shared. Both fields live in the one form, so neither
 * needs a hidden input to survive the other being changed.
 *
 * Stock figures come from one query over live stock with only four columns selected, rather than
 * a count per dealership. At a few thousand live listings that is still cheaper than twelve
 * round trips; past that, the dealership's maintained `listingCount` is the figure to read.
 */
export default async function DealersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const provinceSlug = one(params.province);
  const nameQuery = one(params.q)?.slice(0, 80) ?? null;

  const payload = await getPayload({ config });

  const [dealers, branches, provinces, stock] = await Promise.all([
    payload.find({
      collection: "dealers",
      where: { verificationStatus: { equals: "verified" } },
      sort: "tradingName",
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: "branches",
      sort: "-isPrimary",
      limit: 500,
      depth: 1,
    }),
    payload.find({
      collection: "provinces",
      sort: "name",
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: "vehicles",
      where: { status: { equals: "live" } },
      pagination: false,
      depth: 0,
      select: { dealer: true, make: true, price: true, priceType: true },
    }),
  ]);

  const makeIds = [...new Set(stock.docs.map((v) => relId(v.make)).filter((id) => id !== null))];
  const makes = makeIds.length
    ? await payload.find({
        collection: "makes",
        where: { id: { in: makeIds } },
        limit: makeIds.length,
        depth: 0,
      })
    : { docs: [] };
  const makeName = new Map(makes.docs.map((m) => [m.id, m.name]));

  /*
   * Three photographs per dealership, from its newest photographed stock, so the directory shows
   * what each one sells rather than twelve identical text cards. One small query per dealership,
   * in parallel, reading only the gallery; thumbnails are the 320px rendition and lazy.
   */
  const photosFor = new Map<number, { url: string; width: number; height: number }[]>();
  await Promise.all(
    dealers.docs.map(async (dealer) => {
      const found = await payload.find({
        collection: "vehicles",
        where: { and: [{ dealer: { equals: dealer.id } }, { status: { equals: "live" } }] },
        sort: "-publishedAt",
        limit: 12,
        depth: 1,
        select: { gallery: true, make: true, model: true },
      });
      const seen = new Set<string>();
      const shots: { url: string; width: number; height: number }[] = [];
      for (const doc of found.docs as unknown as Vehicle[]) {
        const photo = vehiclePhoto(doc, "thumbnail");
        if (!photo || seen.has(photo.url)) continue;
        seen.add(photo.url);
        shots.push({ url: photo.url, width: photo.width, height: photo.height });
        if (shots.length === 3) break;
      }
      photosFor.set(dealer.id, shots);
    }),
  );

  const branchesFor = new Map<number, typeof branches.docs>();
  for (const branch of branches.docs) {
    const dealerId = relId(branch.dealer);
    if (!dealerId) continue;
    branchesFor.set(dealerId, [...(branchesFor.get(dealerId) ?? []), branch]);
  }

  type Tally = {
    count: number;
    min: number | null;
    max: number | null;
    makes: Map<string, number>;
  };
  const tallies = new Map<number, Tally>();
  for (const vehicle of stock.docs) {
    const dealerId = relId(vehicle.dealer);
    if (!dealerId) continue;
    const tally = tallies.get(dealerId) ?? { count: 0, min: null, max: null, makes: new Map() };
    tally.count += 1;
    if (vehicle.priceType !== "poa" && typeof vehicle.price === "number" && vehicle.price > 0) {
      tally.min = tally.min === null ? vehicle.price : Math.min(tally.min, vehicle.price);
      tally.max = tally.max === null ? vehicle.price : Math.max(tally.max, vehicle.price);
    }
    const name = makeName.get(relId(vehicle.make) ?? -1);
    if (name) tally.makes.set(name, (tally.makes.get(name) ?? 0) + 1);
    tallies.set(dealerId, tally);
  }

  const all: (DirectoryDealer & { provinces: string[] })[] = dealers.docs.map((dealer) => {
    const own = branchesFor.get(dealer.id) ?? [];
    const primary = own.find((b) => b.isPrimary) ?? own[0];
    const tally = tallies.get(dealer.id);
    return {
      id: dealer.id,
      slug: dealer.slug,
      tradingName: dealer.tradingName,
      isDemonstration: Boolean(dealer.isDemonstration),
      foundedYear: dealer.foundedYear ?? null,
      location: primary
        ? [relName(primary.city), relName(primary.province)].filter(Boolean).join(", ") || null
        : null,
      branchCount: own.length,
      stockCount: tally?.count ?? 0,
      makes: tally
        ? [...tally.makes.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
        : [],
      minPrice: tally?.min ?? null,
      maxPrice: tally?.max ?? null,
      photos: photosFor.get(dealer.id) ?? [],
      provinces: [...new Set(own.map((b) => relSlug(b.province)).filter(Boolean))],
    };
  });

  const provinceOptions = provinces.docs
    .map((province) => ({
      slug: province.slug,
      name: province.name,
      count: all.filter((d) => d.provinces.includes(province.slug)).length,
    }))
    .filter((option) => option.count > 0 || option.slug === provinceSlug);
  const province = provinceOptions.find((p) => p.slug === provinceSlug) ?? null;

  const needle = nameQuery?.toLowerCase() ?? null;
  const shown = all.filter(
    (dealer) =>
      (!province || dealer.provinces.includes(province.slug)) &&
      (!needle || dealer.tradingName.toLowerCase().includes(needle)),
  );
  const filtered = Boolean(province || needle);

  const demoCount = all.filter((d) => d.isDemonstration).length;
  const allDemo = all.length > 0 && demoCount === all.length;

  const resultLine = [
    `${shown.length} ${shown.length === 1 ? "dealership" : "dealerships"}`,
    province ? `in ${province.name}` : null,
    nameQuery ? `matching "${nameQuery}"` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <section className="border-b border-line bg-card">
        <div className="container-page pt-6 pb-[calc(var(--section-tight)+2.5rem)] sm:pt-8">
          {/* No visible trail on a top-level page; the structured data still carries it. */}
          <Breadcrumbs trail={[{ href: "/dealers", label: "Dealerships" }]} />

          <div className="max-w-3xl">
            <p className="rn-eyebrow">Dealership directory</p>
            <h1 className="rn-h1 mt-3">Find a dealership</h1>
            <p className="rn-lead mt-4 text-pretty">
              Every car on Rynet is listed by a dealership, and every dealership is checked before
              it can list. There are no private sellers, so whoever you deal with has a name, a
              premises and a reputation to keep.
            </p>
            <Link href="/how-verification-works" className="rn-link-arrow mt-4">
              How we check dealerships
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page relative -mt-10">
        <search className="rn-panel block p-4 sm:p-5">
          <form
            method="get"
            action="/dealers"
            className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
          >
            <Field id="dealer-q" label="Dealership name">
              <Input
                type="search"
                name="q"
                defaultValue={nameQuery ?? ""}
                placeholder="Any dealership"
                autoComplete="off"
                enterKeyHint="search"
              />
            </Field>
            <Field id="dealer-province" label="Province">
              <Select name="province" defaultValue={province?.slug ?? ""}>
                <option value="">All provinces ({all.length})</option>
                {provinceOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name} ({option.count})
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="submit"
              className={buttonClasses({ variant: "secondary", block: "mobile" })}
            >
              <Search aria-hidden="true" />
              Show dealerships
            </button>
          </form>
        </search>
      </div>

      <section
        aria-labelledby="directory-results"
        className="container-page pt-8 pb-[var(--section-base)] sm:pt-10"
      >
        {demoCount > 0 ? (
          <Notice
            compact
            title={
              allDemo
                ? "These are demo dealerships. None is a real business."
                : "Dealerships marked Demo dealership are not real businesses."
            }
            details="What that means"
            className="mb-8"
          >
            {allDemo
              ? "Every dealership in this directory is a demonstration, created to show how Rynet works. None of their cars is for sale."
              : "They are demonstrations, created to show how Rynet works, and their cars are not for sale."}
          </Notice>
        ) : null}

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="directory-results" className="text-xl font-semibold tracking-tight text-heading">
            {resultLine}
          </h2>
          {filtered ? (
            <Link href="/dealers" className="rn-link-arrow">
              Show every dealership
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {shown.length > 0 ? (
          <ul className="rn-grid mt-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((dealer) => (
              <li key={dealer.id}>
                <DealerDirectoryCard dealer={dealer} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Store}
            headingLevel={3}
            className="mt-6"
            title={filtered ? "No dealership matches that search" : "No dealerships are listed yet"}
            action={
              filtered ? (
                <Link href="/dealers" className={buttonClasses({ variant: "primary" })}>
                  Show every dealership
                </Link>
              ) : (
                <Link href="/cars" className={buttonClasses({ variant: "primary" })}>
                  Browse cars for sale
                </Link>
              )
            }
          >
            {province && needle
              ? `Nothing in ${province.name} has a name containing "${nameQuery}". Try the name on its own, or another province.`
              : province
                ? `There is no dealership on Rynet in ${province.name} yet. Try a neighbouring province for now.`
                : needle
                  ? `No dealership name contains "${nameQuery}". Check the spelling, or try one word from the name.`
                  : "Dealerships appear here once they have been checked and approved."}
          </EmptyState>
        )}
      </section>

      <section
        aria-labelledby="list-your-stock"
        className="container-page pb-[var(--section-base)]"
      >
        <div className="on-navy relative isolate overflow-hidden rounded-lg px-6 py-10 sm:px-10 sm:py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-14">
          <div className="max-w-2xl">
            <p className="rn-eyebrow text-on-navy-muted">For dealerships</p>
            <h2 id="list-your-stock" className="rn-h2 mt-3">
              List your stock on Rynet
            </h2>
            <p className="mt-4 text-base text-on-navy-muted sm:text-lg">
              A buyer on Rynet is only ever looking at dealership stock, because private sellers
              cannot list here. Tell us your trading name, your CIPC registration number and roughly
              how many units you carry, and we will take it from there.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
            <Link
              href="/contact"
              className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
            >
              List your stock
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/how-verification-works"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              What we check first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
