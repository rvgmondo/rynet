import { slugify } from "@/lib/slug";

/**
 * URL construction, in one place.
 *
 * Every indexable URL on the marketplace is built here rather than interpolated at the call
 * site. That matters more than it looks: the index rules in docs/SEO.md are expressed as a
 * whitelist of facet SHAPES, and a shape that can only be produced by one function is a
 * shape that can be tested. A template string in a component is a shape nobody knows exists
 * until Search Console reports it.
 */

/**
 * `/vehicles/toyota/hilux/2023-2-8-gd-6-raider-4x4-at-rn48213`
 *
 * The trailing segment carries the year, the variant and the public reference. The
 * reference is what makes it unique and stable; the rest is there for the human and for the
 * keyword. Changing make, model, variant or year writes a 301 automatically, which is why
 * nothing downstream should ever parse this string to find the vehicle. Look it up by the
 * reference.
 */
export function vehicleUrl(v: {
  makeSlug: string;
  modelSlug: string;
  modelYear: number;
  variantName: string | null;
  publicRef: string;
}): string {
  const tail = [
    v.modelYear,
    v.variantName ? slugify(v.variantName) : null,
    v.publicRef.toLowerCase(),
  ]
    .filter(Boolean)
    .join("-");
  return `/vehicles/${v.makeSlug}/${v.modelSlug}/${tail}`;
}

/**
 * The facet landing pages. These are the ONLY indexable filter URLs, and the list matches
 * docs/SEO.md exactly. Anything not expressible here is a query string on /cars and is
 * noindex, follow.
 */
export const facetUrl = {
  all: () => "/cars",
  make: (make: string) => `/cars/${make}`,
  makeModel: (make: string, model: string) => `/cars/${make}/${model}`,
  makeModelVariant: (make: string, model: string, variant: string) =>
    `/cars/${make}/${model}/${variant}`,
  province: (province: string) => `/cars/in/${province}`,
  city: (province: string, city: string) => `/cars/in/${province}/${city}`,
  provinceMake: (province: string, make: string) => `/cars/in/${province}/${make}`,
  cityMake: (province: string, city: string, make: string) =>
    `/cars/in/${province}/${city}/${make}`,
  cityMakeModel: (province: string, city: string, make: string, model: string) =>
    `/cars/in/${province}/${city}/${make}/${model}`,
  body: (body: string) => `/cars/body/${body}`,
  provinceBody: (province: string, body: string) => `/cars/in/${province}/body/${body}`,
  fuel: (fuel: string) => `/cars/fuel/${fuel}`,
  condition: (condition: "new" | "demo" | "used") => `/cars/${condition}`,
} as const;

export function dealerUrl(slug: string): string {
  return `/dealers/${slug}`;
}

export function branchUrl(dealerSlug: string, branchSlug: string): string {
  return `/dealers/${dealerSlug}/branches/${branchSlug}`;
}
