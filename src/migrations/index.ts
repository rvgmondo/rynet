import * as migration_20260825_073448_initial from "./20260825_073448_initial";

export const migrations = [
  {
    up: migration_20260825_073448_initial.up,
    down: migration_20260825_073448_initial.down,
    name: "20260825_073448_initial",
  },
];
