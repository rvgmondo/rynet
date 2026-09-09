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
  /** Carried through untouched. See the hidden inputs below. */
  q?: string;
  colour?: string;
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
   * alone. Every OTHER active filter does apply, and that is the part that was missing.
   *
   * Only `make` was being carried, so on a filtered result set the rail offered options that
   * lead nowhere with numbers that were plainly larger than the result count above them. On
   * "Bakkie, Diesel" it still advertised every hatchback in the catalogue. A facet count
   * that does not agree with what clicking it produces is worse than no count, because the
   * count is the whole reason to trust the rail.
   *
   * At this volume a query per option is instant. The single-round-trip CTE described in
   * docs/ARCHITECTURE.md replaces this when the index table lands.
   */
  const slugToId = async (collection: string, slug?: string) => {
    if (!slug) return undefined;
    const found = await payload.find({
      collection: collection as never,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    return (found.docs[0] as { id: number } | undefined)?.id;
  };

  // Resolved once, not once per option. There are five dimensions and up to a hundred
  // options, so doing this inside the loop was a hundred redundant lookups per render.
  const [activeMakeId, activeBodyId, activeFuelId, activeTransmissionId, activeProvinceId] =
    await Promise.all([
      slugToId("makes", active.make),
      slugToId("body-types", active.body),
      slugToId("fuel-types", active.fuel),
      slugToId("transmissions", active.transmission),
      slugToId("provinces", active.province),
    ]);

  const activeBranchIds = activeProvinceId
    ? (
        await payload.find({
          collection: "branches",
          where: { province: { equals: activeProvinceId } },
          limit: 500,
          depth: 0,
        })
      ).docs.map((b) => b.id)
    : undefined;

  const min = Number(active.minPrice) || undefined;
  const max = Number(active.maxPrice) || undefined;

  const countFor = async (field: string, id: number, exclude: keyof Active): Promise<number> => {
    const clauses: Record<string, unknown>[] = [
      { status: { equals: "live" } },
      { [field]: { equals: id } },
    ];

    if (activeMakeId && exclude !== "make") clauses.push({ make: { equals: activeMakeId } });
    if (activeBodyId && exclude !== "body") clauses.push({ bodyType: { equals: activeBodyId } });
    if (activeFuelId && exclude !== "fuel") clauses.push({ fuelType: { equals: activeFuelId } });
    if (activeTransmissionId && exclude !== "transmission") {
      clauses.push({ transmission: { equals: activeTransmissionId } });
    }
    if (activeBranchIds && exclude !== "province") {
      // A province with no branches means no stock, and an empty `in` matches everything.
      clauses.push({ branch: { in: activeBranchIds.length > 0 ? activeBranchIds : [-1] } });
    }
    if (min || max) {
      clauses.push({
        price: {
          ...(min ? { greater_than_equal: min } : {}),
          ...(max ? { less_than_equal: max } : {}),
        },
      });
    }

    const result = await payload.count({
      collection: "vehicles",
      where: { and: clauses } as never,
    });
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

  /*
   * Province counts, which go through the branch and so cannot use `countFor`.
   *
   * They used to render as -1, the "not counted" sentinel, so the one dimension a South
   * African buyer filters by first was the only one with no numbers beside it.
   */
  const provinceOptions = await Promise.all(
    (provinces.docs as never as { id: number; name: string; slug: string }[]).map(
      async (province) => {
        const branches = await payload.find({
          collection: "branches",
          where: { province: { equals: province.id } },
          limit: 500,
          depth: 0,
        });
        const ids = branches.docs.map((b) => b.id);
        if (ids.length === 0) return { label: province.name, value: province.slug, count: 0 };

        const counted = await payload.count({
          collection: "vehicles",
          where: {
            and: [
              { status: { equals: "live" } },
              { branch: { in: ids } },
              // Every other active filter applies. This dimension's own does not.
              ...(activeMakeId ? [{ make: { equals: activeMakeId } }] : []),
              ...(activeBodyId ? [{ bodyType: { equals: activeBodyId } }] : []),
              ...(activeFuelId ? [{ fuelType: { equals: activeFuelId } }] : []),
              ...(activeTransmissionId ? [{ transmission: { equals: activeTransmissionId } }] : []),
              ...(min || max
                ? [
                    {
                      price: {
                        ...(min ? { greater_than_equal: min } : {}),
                        ...(max ? { less_than_equal: max } : {}),
                      },
                    },
                  ]
                : []),
            ],
          } as never,
        });

        return { label: province.name, value: province.slug, count: counted.totalDocs };
      },
    ),
  );

  return (
    <aside
      aria-labelledby="filters-heading"
      /*
       * Order two on a phone, order one on a wide screen.
       *
       * This rail used to be the entire first screenful on mobile, so a buyer opening the
       * search page saw a list of manufacturer names and no cars at all. Moving it below
       * the results costs one declaration, needs no JavaScript, has no hydration flash,
       * and cannot leave the filters unreachable the way a collapsed disclosure can if its
       * script never runs. The results header carries a link straight down to it.
       */
      className="order-2 bg-surface-sunken px-5 py-6 lg:sticky lg:top-20 lg:order-1 lg:self-start"
    >
      <h2 id="filters-heading" className="rn-label scroll-mt-20">
        Filter
      </h2>

      <form method="get" action="/cars" className="mt-4 space-y-1 pb-6">
        {/*
          A GET form submits only its own controls, so anything the buyer arrived with that
          this form does not render would be silently dropped the moment they tick a facet.
          Searching "bakkie under 300" and then ticking Diesel would have thrown the bakkie
          away. These two lines are the whole fix.
        */}
        {active.q ? <input type="hidden" name="q" value={active.q} /> : null}
        {active.colour ? <input type="hidden" name="colour" value={active.colour} /> : null}

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
          options={provinceOptions}
          active={active.province}
        />

        <fieldset className="border-t border-line py-4">
          <legend className="rn-label py-3">Price</legend>
          <div className="mt-3 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="minPrice" className="rn-label rn-label--light block text-ink-muted">
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
                className="mt-1 min-h-11 w-full border-0 border-b-2 border-line-interactive bg-transparent px-0 text-base font-medium tabular"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="maxPrice" className="rn-label rn-label--light block text-ink-muted">
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
                className="mt-1 min-h-11 w-full border-0 border-b-2 border-line-interactive bg-transparent px-0 text-base font-medium tabular"
              />
            </div>
          </div>
          <p className="rn-label rn-label--light mt-2 text-ink-muted">Rand, including VAT.</p>
        </fieldset>

        {/*
          A real submit button, and the form works without JavaScript. The filters are GET
          parameters on /cars, so this posts the buyer straight to a shareable URL. Enhanced
          client-side filtering layers on top of this later; it does not replace it.
        */}
        <div className="flex gap-2 border-t border-line pt-4">
          <button
            type="submit"
            className="rn-label min-h-11 flex-1 bg-accent-solid px-4 text-ink-on-accent hover:bg-accent-solid-hover"
          >
            Apply filters
          </button>
          <a
            href="/cars"
            className="rn-label inline-flex min-h-11 items-center border border-line-interactive px-4 hover:bg-ink hover:text-ink-inverse"
          >
            Clear
          </a>
        </div>
      </form>
    </aside>
  );
}
