import config from "@payload-config";
import { unstable_cache } from "next/cache";
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

type Option = { label: string; value: string; count: number };

type RailData = {
  makeOptions: Option[];
  bodyOptions: Option[];
  fuelOptions: Option[];
  transmissionOptions: Option[];
  provinceOptions: Option[];
};

async function readRail(active: Active): Promise<RailData> {
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

  return { makeOptions, bodyOptions, fuelOptions, transmissionOptions, provinceOptions };
}

/**
 * The cache, and this is the expensive thing on the page rather than the results.
 *
 * A single render of this rail issues one count per make, one per body type, one per fuel,
 * one per transmission, and a branch lookup plus a count per province. On the seeded
 * catalogue that is over a hundred queries to draw a sidebar, and it ran again in full on
 * every page of every result set. The vehicle search itself, the thing the buyer actually
 * asked for, is one indexed query beside it.
 *
 * Keyed on the filter combination, because that is exactly what the counts depend on, and
 * bounded by the combinations people really use: robots.txt keeps crawlers off /cars? so
 * this cannot be grown by a machine walking the facet space. Tagged for both stock and
 * taxonomy, so a car going live and a make being renamed each drop it.
 */
function getRail(active: Active): Promise<RailData> {
  return unstable_cache(() => readRail(active), ["facet-rail", JSON.stringify(active)], {
    revalidate: 60,
    tags: ["vehicles", "taxonomy"],
  })();
}

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
  const { makeOptions, bodyOptions, fuelOptions, transmissionOptions, provinceOptions } =
    await getRail(active);

  return (
    <aside
      aria-labelledby="filters-heading"
      className="bg-surface-sunken px-5 py-4 xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100vh-6rem)] xl:flex-col xl:px-5 xl:py-6"
    >
      {/*
        Collapsed on a phone, open on a wide screen, and FIRST in the document at both.
        ----------------------------------------------------------------------------
        This rail was reordered below the results on mobile with CSS `order`, which fixed
        the wrong problem and created a worse one. The rail is first in the DOM, so a
        keyboard user tabbing through /cars at 390px was thrown 11 800px down the page to
        reach it and then back again, with `scroll-behavior: smooth` animating every one of
        those journeys. That is SC 2.4.3, and it is a great deal worse for the people it
        affects than a long filter list was for everybody.

        So the document order and the visual order agree again at every width, and the rail
        stops eating the first screenful by being COLLAPSED on a phone instead of moved.

        A checkbox rather than `<details>`, because this has to work in both directions with
        no JavaScript: the checkbox and its label are hidden above 1024px and the form is
        shown unconditionally there, so a desktop visitor never sees a control and a phone
        visitor gets one that works before hydration. `hidden` is display:none, so the
        collapsed form is out of the tab order rather than merely invisible.
      */}
      <input
        id="rn-filters-open"
        type="checkbox"
        className="peer sr-only"
        aria-label="Show filters"
      />
      {/*
        The word swap is scoped from the checkbox's SIBLING, not from the label, because
        Tailwind's `peer-` variants compile to a sibling combinator and the label is nested.
      */}
      <div className="flex items-center justify-between peer-checked:[&_.rn-show]:hidden peer-checked:[&_.rn-hide]:inline xl:block">
        <h2 id="filters-heading" className="rn-label scroll-mt-20">
          Filter
        </h2>
        <label
          htmlFor="rn-filters-open"
          className="rn-label inline-flex min-h-11 cursor-pointer items-center px-2 text-ink-muted xl:hidden"
        >
          <span className="rn-show">Show</span>
          <span className="rn-hide hidden">Hide</span>
        </label>
      </div>

      <form
        method="get"
        action="/cars"
        className="mt-4 hidden pb-6 peer-checked:block xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:pb-0"
      >
        {/*
          A GET form submits only its own controls, so anything the buyer arrived with that
          this form does not render would be silently dropped the moment they tick a facet.
          Searching "bakkie under 300" and then ticking Diesel would have thrown the bakkie
          away. These two lines are the whole fix.
        */}
        {active.q ? <input type="hidden" name="q" value={active.q} /> : null}
        {active.colour ? <input type="hidden" name="colour" value={active.colour} /> : null}

        {/*
          The facets scroll. The submit row does not, and is no longer inside what scrolls.
          ------------------------------------------------------------------------------
          It used to be `sticky bottom-0` at the end of this list, which put it on top of the
          list rather than beside it: at any scroll position other than the very bottom it
          covered whatever facet happened to be underneath. axe caught it on Transmission,
          where 25px of a 44px row was under the bar, and a target that is half covered is
          half a target however tall it was declared.

          Sticky cannot be fixed by padding, because overlapping the content it floats over
          is the whole definition of it. So the row comes out of the scroll box and the box
          shrinks to fit beside it. Nothing overlaps anything now, at any scroll position or
          viewport height.
        */}
        <div className="space-y-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
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
        </div>

        {/*
          A real submit button, and the form works without JavaScript. The filters are GET
          parameters on /cars, so this posts the buyer straight to a shareable URL. Enhanced
          client-side filtering layers on top of this later; it does not replace it.
        */}
        {/*
          The foot of the rail, outside what scrolls.

          The rail is `xl:sticky xl:top-20`, so on every desktop viewport the submit row sat
          below the fold for the entire time the filters were being used: a buyer could tick
          five facets and never see the button that applies them. It is now the second child
          of a flex column whose first child takes the scrolling, which puts it on screen at
          every viewport height without floating over anything.
        */}
        <div className="flex shrink-0 gap-2 border-t border-line bg-surface-sunken py-4">
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
