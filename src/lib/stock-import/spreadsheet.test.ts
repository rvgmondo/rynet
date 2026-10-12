import { describe, expect, it } from "vitest";

import { mapHeaders, parseCsv, readSpreadsheet, templateCsv } from "./spreadsheet";

describe("parseCsv", () => {
  it("reads quoted fields with commas, doubled quotes and line breaks inside them", () => {
    const rows = parseCsv('a,b,c\r\n"1,5","say ""hi""","two\nlines"\r\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1,5", 'say "hi"', "two\nlines"],
    ]);
  });

  it("reads the semicolons South African Excel saves with", () => {
    expect(parseCsv("Make;Price\nToyota;R 249 900,00")).toEqual([
      ["Make", "Price"],
      ["Toyota", "R 249 900,00"],
    ]);
  });

  it("drops a byte order mark and blank rows", () => {
    expect(parseCsv("﻿Make\n\n,\nFord\n")).toEqual([["Make"], ["Ford"]]);
  });
});

describe("mapHeaders", () => {
  it("understands the headings dealerships actually use", () => {
    expect(
      mapHeaders([
        "Stock #",
        "MAKE",
        "Model",
        "Derivative",
        "Reg Year",
        "KM",
        "Selling Price",
        "Odd",
      ]),
    ).toEqual(["stockNumber", "make", "model", "variant", "year", "mileage", "price", null]);
  });

  it("takes the first of two columns that mean the same thing", () => {
    expect(mapHeaders(["Price", "Retail price"])).toEqual(["price", null]);
  });
});

describe("readSpreadsheet", () => {
  it("turns each row into a listing", () => {
    const csv = [
      "Stock No,Make,Model,Variant,Year,Mileage,Price,Colour,Photos",
      'H1,Toyota,Hilux,2.8 GD-6 Raider,2021,"64 000",R 549 900,White,https://a.example/1.jpg https://a.example/2.jpg',
    ].join("\n");
    const read = readSpreadsheet(csv, "upload:dealer-1");
    expect(read.problems).toEqual([]);
    expect(read.listings).toHaveLength(1);
    expect(read.listings[0]).toMatchObject({
      externalId: "H1",
      makeText: "Toyota",
      modelText: "Hilux",
      year: 2021,
      mileageKm: 64000,
      price: 549900,
      exteriorColourText: "White",
      title: "2021 Toyota Hilux 2.8 GD-6 Raider",
      photoUrls: ["https://a.example/1.jpg", "https://a.example/2.jpg"],
    });
  });

  it("leaves a missing price empty rather than zero, so the car is held back", () => {
    const read = readSpreadsheet("Make,Model,Price\nFord,Ranger,POA", "s");
    expect(read.listings[0]?.price).toBeNull();
  });

  it("gives a row with no stock number a key that a re-upload of the same car finds again", () => {
    const csv = "Make,Model,Year,Mileage\nFord,Ranger,2019,80000";
    const first = readSpreadsheet(csv, "s").listings[0]?.externalId;
    const again = readSpreadsheet(csv, "s").listings[0]?.externalId;
    expect(first).toMatch(/^row-/);
    expect(first).toBe(again);
  });

  it("skips rows without a make and repeated stock numbers, and says which", () => {
    const read = readSpreadsheet("Stock,Make\nA,Ford\nB,\nA,Toyota", "s");
    expect(read.listings.map((listing) => listing.externalId)).toEqual(["A"]);
    expect(read.problems).toEqual([
      "Row 3 has no make, so it was skipped.",
      "Row 4 has the same stock number as an earlier row (A), so it was skipped.",
    ]);
  });

  it("refuses a sheet with no make column, and says what it did understand", () => {
    const read = readSpreadsheet("Car,Price\nHilux,1", "s");
    expect(read.listings).toEqual([]);
    expect(read.problems[0]).toMatch(/no Make column/);
    expect(read.understood).toEqual([{ header: "Price", column: "price" }]);
    expect(read.ignored).toEqual(["Car"]);
  });

  it("takes phone numbers out of a description", () => {
    const read = readSpreadsheet('Make,Description\nFord,"Call Johan on 082 555 1234 today"', "s");
    expect(read.listings[0]?.description).not.toMatch(/082/);
  });

  it("reads its own template", () => {
    const read = readSpreadsheet(templateCsv(), "s");
    expect(read.problems).toEqual([]);
    expect(read.listings[0]).toMatchObject({ makeText: "Toyota", price: 549900, mileageKm: 64000 });
  });
});
