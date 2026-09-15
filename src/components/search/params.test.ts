import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  carriedPairs,
  cleanQuery,
  hrefFor,
  paramsFromSearch,
  rangeLabel,
  readState,
  statePairs,
  withValue,
  yearLabel,
} from "./params";

const rand = (n: number) => `R ${n}`;

describe("readState", () => {
  it("reads the single-value links the site has always produced", () => {
    const state = readState({
      make: "toyota",
      body: "bakkie",
      sort: "price-asc",
      maxPrice: "300000",
    });
    expect(state.make).toEqual(["toyota"]);
    expect(state.body).toEqual(["bakkie"]);
    expect(state.sort).toBe("price-asc");
    expect(state.maxPrice).toBe(300000);
  });

  it("reads repeated parameters, which is what two ticked checkboxes submit", () => {
    const state = readState(paramsFromSearch(new URLSearchParams("make=toyota&make=ford")));
    expect(state.make).toEqual(["toyota", "ford"]);
  });

  it("drops empty fields, which a GET form always sends", () => {
    const state = readState({ make: "", minPrice: "", maxYear: "", q: "  " });
    expect(state.make).toEqual([]);
    expect(state.minPrice).toBeUndefined();
    expect(state.maxYear).toBeUndefined();
    expect(state.q).toBeUndefined();
  });

  it("drops invalid values instead of throwing", () => {
    const state = readState({
      make: "<script>",
      minPrice: "abc",
      maxPrice: "-5",
      minYear: "1e99",
      maxMileage: "99999999999",
      sort: "drop table",
      condition: "stolen",
    });
    expect(state.make).toEqual([]);
    expect(state.minPrice).toBeUndefined();
    expect(state.maxPrice).toBeUndefined();
    expect(state.minYear).toBeUndefined();
    expect(state.maxMileage).toBeUndefined();
    expect(state.sort).toBe("newest");
    expect(state.condition).toBeUndefined();
  });

  it("swaps a price or year range entered the wrong way round", () => {
    const state = readState({
      minPrice: "400000",
      maxPrice: "200000",
      minYear: "2024",
      maxYear: "2019",
    });
    expect([state.minPrice, state.maxPrice]).toEqual([200000, 400000]);
    expect([state.minYear, state.maxYear]).toEqual([2019, 2024]);
  });

  it("keeps the price a buyer can realistically ask for, so the smoke test's R 9 000 000 still reads", () => {
    expect(readState({ minPrice: "9000000" }).minPrice).toBe(9000000);
  });
});

describe("writing a search back to a URL", () => {
  it("round-trips a search through its pairs", () => {
    const state = readState(
      paramsFromSearch(
        new URLSearchParams("make=toyota&make=ford&body=bakkie&minYear=2019&sort=mileage"),
      ),
    );
    const again = readState(paramsFromSearch(new URLSearchParams(statePairs(state))));
    expect(again).toEqual(state);
  });

  it("leaves the default sort out of the URL", () => {
    expect(statePairs(readState({ sort: "newest" }))).toEqual([]);
  });

  it("carries everything the buyer arrived with except what the form renders", () => {
    const pairs = carriedPairs(
      { q: "bakkie", colour: "red", sort: "price-asc", page: "2", utm_source: "x" },
      ["sort", "page"],
    );
    expect(pairs).toEqual([
      ["q", "bakkie"],
      ["colour", "red"],
      ["utm_source", "x"],
    ]);
  });

  it("builds a clean query string without empty fields or a page number", () => {
    expect(
      cleanQuery([
        ["make", "toyota"],
        ["minPrice", ""],
        ["page", "3"],
        ["q", " "],
      ]),
    ).toBe("make=toyota");
    expect(hrefFor("/cars", [])).toBe("/cars");
    expect(hrefFor("/cars", [["make", "toyota"]])).toBe("/cars?make=toyota");
  });
});

describe("labels", () => {
  it("counts a range once and ignores sort", () => {
    const state = readState({
      make: ["toyota", "ford"],
      minPrice: "1",
      maxPrice: "2",
      sort: "mileage",
    });
    expect(activeFilterCount(state)).toBe(3);
  });

  it("describes a price range in words", () => {
    expect(rangeLabel(100, 200, rand)).toBe("R 100 to R 200");
    expect(rangeLabel(undefined, 200, rand)).toBe("Up to R 200");
    expect(rangeLabel(100, undefined, rand)).toBe("From R 100");
    expect(rangeLabel(undefined, undefined, rand)).toBeNull();
  });

  it("describes a year range in words", () => {
    expect(yearLabel(2019, 2023)).toBe("2019 to 2023");
    expect(yearLabel(2021, 2021)).toBe("2021");
    expect(yearLabel(2019, undefined)).toBe("2019 or newer");
    expect(yearLabel(undefined, 2023)).toBe("2023 or older");
  });

  it("adds a typed price to the list of steps so the select can show it", () => {
    expect(withValue([100, 300], 275)).toEqual([100, 275, 300]);
    expect(withValue([100, 300], 300)).toEqual([100, 300]);
  });
});
