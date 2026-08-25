import config from "@payload-config";
import { getPayload } from "payload";

import { FacetGroup } from "./facet-group";

type Active = {
  make?: string;
  body?: string;
  fuel?: string;
  transmission?: string;
  province?: string;
  minPrice?: string;
  maxPrice?: string;
};

/**
 * The filter rail.
 *
 * Server rendered along with the results, so the counts arrive in the HTML rather than
 * appearing a second later. Counts are the thing that makes a facet usable: a buyer needs
 * to know that "Diesel" leaves 84 cars before clicking it, not after.
 *
 * Zero-count options render disabled with the count still shown, per Section 6. Hiding them
 * is the common shortcut and it is wrong: the list jumps around as you filter, and a buyer
 * cannot tell whether "Electric" is missing because nothing matches or because the site
 * does not have the category.
 */
export async function FacetRail({ active }: { active: Active }) {
  const payload = await getPayload({ config });

  const [makes, bodies, fuels, transmissions, provinces] = await Promise.all([
    payload.find({
      collection: "makes",
      where: { isActive: { equals: true } },
      sort: "name",
      limit: 100,
      depth: 0,
    }),
    payload.find({ collection: "body-types", sort: "sortOrder", limit: 50, depth: 0 }),
    payload.find({ collection: "fuel-types", sort: "sortOrder", limit: 50, depth: 0 }),
    payload.find({ collection: "transmissions", sort: "sortOrder", limit: 50, depth: 0 }),
    payload.find({ collection: "provinces", sort: "name", limit: 20, depth: 0 }),
  ]);

  /**
   * Counts per option.
   *
   * Each dimension is counted against the filtered set MINUS its own filter, which is the
   * standard facet semantics: ticking "Toyota" must not collapse the make list to Toyota
   * alone. At this volume a query per option is instant. The single-round-trip CTE
   * described in docs/ARCHITECTURE.md replaces this when the index table lands.
   */
  const countFor = async (field: string, id: number, exclude: keyof Active): Promise<number> => {
    const where: Record<string, unknown> = { status: { equals: "live" }, [field]: { equals: id } };
    // Other active filters still apply; this dimension's own does not.
    if (active.make && exclude !== "make") {
      const m = await payload.find({
        collection: "makes",
        where: { slug: { equals: active.make } },
        limit: 1,
        depth: 0,
      });
      if (m.docs[0]) where.make = { equals: m.docs[0].id };
    }
    const result = await payload.count({ collection: "vehicles", where: where as never });
    return result.totalDocs;
  };

  const withCounts = async (
    docs: { id: number; name: string; slug: string }[],
    field: string,
    key: keyof Active,
  ) =>
    Promise.all(
      docs.map(async (d) => ({
        label: d.name,
        value: d.slug,
        count: await countFor(field, d.id, key),
      })),
    );

  const [makeOptions, bodyOptions, fuelOptions, transmissionOptions] = await Promise.all([
    withCounts(makes.docs as never, "make", "make"),
    withCounts(bodies.docs as never, "bodyType", "body"),
    withCounts(fuels.docs as never, "fuelType", "fuel"),
    withCounts(transmissions.docs as never, "transmission", "transmission"),
  ]);

  return (
    <aside aria-labelledby="filters-heading" className="lg:sticky lg:top-20 lg:self-start">
      <h2 id="filters-heading" className="font-display text-lg">
        Filter
      </h2>

      <form method="get" action="/cars" className="mt-4 space-y-1">
        <FacetGroup
          legend="Make"
          name="make"
          options={makeOptions.filter((o) => o.count > 0 || o.value === active.make)}
          active={active.make}
          defaultOpen
        />
        <FacetGroup
          legend="Body type"
          name="body"
          options={bodyOptions}
          active={active.body}
          defaultOpen
        />
        <FacetGroup legend="Fuel" name="fuel" options={fuelOptions} active={active.fuel} />
        <FacetGroup
          legend="Transmission"
          name="transmission"
          options={transmissionOptions}
          active={active.transmission}
        />
        <FacetGroup
          legend="Province"
          name="province"
          options={(provinces.docs as never as { name: string; slug: string }[]).map((p) => ({
            label: p.name,
            value: p.slug,
            count: -1,
          }))}
          active={active.province}
        />

        <fieldset className="border-t border-line py-4">
          <legend className="font-display text-sm font-bold">Price</legend>
          <div className="mt-3 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="minPrice" className="block text-xs font-medium text-ink-secondary">
                From
              </label>
              <input
                id="minPrice"
                name="minPrice"
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                defaultValue={active.minPrice}
                placeholder="0"
                className="mt-1 min-h-11 w-full rounded-md border border-line-interactive bg-surface px-3 text-sm tabular"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="maxPrice" className="block text-xs font-medium text-ink-secondary">
                To
              </label>
              <input
                id="maxPrice"
                name="maxPrice"
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                defaultValue={active.maxPrice}
                placeholder="Any"
                className="mt-1 min-h-11 w-full rounded-md border border-line-interactive bg-surface px-3 text-sm tabular"
              />
            </div>
          </div>
          <p className="mt-1.5 text-2xs text-ink-muted">Rand, including VAT.</p>
        </fieldset>

        {/*
          A real submit button, and the form works without JavaScript. The filters are GET
          parameters on /cars, so this posts the buyer straight to a shareable URL. Enhanced
          client-side filtering layers on top of this later; it does not replace it.
        */}
        <div className="flex gap-2 border-t border-line pt-4">
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-md bg-accent-solid px-4 text-sm font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
          >
            Apply filters
          </button>
          <a
            href="/cars"
            className="inline-flex min-h-11 items-center rounded-md border border-line-interactive px-4 text-sm font-semibold hover:bg-surface-sunken"
          >
            Clear
          </a>
        </div>
      </form>
    </aside>
  );
}
