/**
 * Links into the admin lists, already filtered.
 *
 * The filter is written in the shape Payload's filter panel reads back (`or[0][and][n]`), so
 * the list opens with the filter showing and a person can see what they are looking at and
 * clear it, rather than landing on a shorter list with no explanation.
 */

export type ListCondition = {
  field: string;
  operator: "equals" | "not_equals" | "in" | "not_in" | "greater_than_equal" | "less_than";
  value: string | number | boolean | readonly (string | number)[];
};

export function adminListUrl(
  adminRoute: string,
  collection: string,
  conditions: readonly ListCondition[] = [],
  sort?: string,
): string {
  const params = new URLSearchParams();
  conditions.forEach((condition, index) => {
    const key = `where[or][0][and][${index}][${condition.field}][${condition.operator}]`;
    if (Array.isArray(condition.value)) {
      condition.value.forEach((value, i) => {
        params.append(`${key}[${i}]`, String(value));
      });
    } else {
      params.append(key, String(condition.value));
    }
  });
  if (sort) params.append("sort", sort);
  const query = params.toString();
  return `${adminRoute}/collections/${collection}${query ? `?${query}` : ""}`;
}

export function adminDocUrl(adminRoute: string, collection: string, id: string | number): string {
  return `${adminRoute}/collections/${collection}/${encodeURIComponent(String(id))}`;
}
