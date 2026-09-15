/** "Toyota", "Toyota and Volkswagen", "Toyota, Volkswagen and Ford". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Up to three makes by name; past that, the top two and how many more. */
export function makesSummary(makes: string[]): string | null {
  if (makes.length === 0) return null;
  if (makes.length <= 3) return joinNames(makes);
  return `${makes[0]}, ${makes[1]} and ${makes.length - 2} more`;
}

/** "1 car", "34 cars". */
export function carsCount(count: number): string {
  return `${count} ${count === 1 ? "car" : "cars"}`;
}
