import { createHash } from "node:crypto";

import { cleanDescription, firstNumber, wholeRands } from "./text";
import type { SourceListing } from "./types";

/**
 * A dealership's stock from a spreadsheet, saved as CSV.
 *
 * Every dealership already has its stock in a spreadsheet or can export one from its dealer
 * management system, so this is the route that works for everyone the website reader cannot
 * read. The column names are matched loosely, because nobody will rename their columns for us:
 * "Stock No", "Stock #" and "stock number" are the same column, and so are "KM", "Mileage" and
 * "Odometer". Columns Rynet does not know are ignored rather than refused.
 *
 * What comes out is the same `SourceListing` a website page produces, so everything after this
 * (matching makes and models, holding back a car with no price, the photographs) is the same code
 * for both.
 */

export type Column =
  | "stockNumber"
  | "vin"
  | "make"
  | "model"
  | "variant"
  | "year"
  | "mileage"
  | "price"
  | "colour"
  | "transmission"
  | "fuel"
  | "body"
  | "drive"
  | "description"
  | "photos";

/** The columns of the template, in order, with the header a person sees. */
export const TEMPLATE_COLUMNS: { column: Column; header: string; example: string }[] = [
  { column: "stockNumber", header: "Stock number", example: "AM1042" },
  { column: "make", header: "Make", example: "Toyota" },
  { column: "model", header: "Model", example: "Hilux" },
  { column: "variant", header: "Variant", example: "2.8 GD-6 Raider double cab auto" },
  { column: "year", header: "Year", example: "2021" },
  { column: "mileage", header: "Mileage (km)", example: "64000" },
  { column: "price", header: "Price (R)", example: "549900" },
  { column: "colour", header: "Colour", example: "Glacier White" },
  { column: "transmission", header: "Transmission", example: "Automatic" },
  { column: "fuel", header: "Fuel", example: "Diesel" },
  { column: "body", header: "Body type", example: "Double cab" },
  { column: "drive", header: "Drive", example: "4x4" },
  { column: "description", header: "Description", example: "One owner, full service history." },
  {
    column: "photos",
    header: "Photo links",
    example: "https://theirsite.co.za/photos/1.jpg https://theirsite.co.za/photos/2.jpg",
  },
];

/** Every way a column has been seen headed, written as normaliseHeader writes them. */
const HEADER_ALIASES: Record<Column, string[]> = {
  stockNumber: [
    "stocknumber",
    "stockno",
    "stock",
    "stockref",
    "ref",
    "reference",
    "refno",
    "stockcode",
    "id",
  ],
  vin: ["vin", "vinnumber", "chassisnumber", "chassis"],
  make: ["make", "manufacturer", "brand"],
  model: ["model", "modelname", "series"],
  variant: ["variant", "derivative", "trim", "version", "spec", "modeldescription"],
  year: ["year", "modelyear", "regyear", "registrationyear", "yearmodel"],
  mileage: ["mileage", "mileagekm", "km", "kms", "kilometres", "kilometers", "odometer", "odo"],
  price: ["price", "pricer", "sellingprice", "retailprice", "askingprice", "amount", "priceincvat"],
  colour: ["colour", "color", "exteriorcolour", "exteriorcolor"],
  transmission: ["transmission", "gearbox", "trans"],
  fuel: ["fuel", "fueltype"],
  body: ["body", "bodytype", "bodystyle", "type"],
  drive: ["drive", "drivetrain", "drivetype", "wheeldrive"],
  description: ["description", "comments", "notes", "sellerscomments", "extras", "details"],
  photos: ["photos", "photolinks", "photourls", "images", "imagelinks", "imageurls", "pictures"],
};

export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Which column each header is, or null for one Rynet does not use. */
export function mapHeaders(headers: string[]): (Column | null)[] {
  const taken = new Set<Column>();
  return headers.map((header) => {
    const key = normaliseHeader(header);
    for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [Column, string[]][]) {
      if (!taken.has(column) && aliases.includes(key)) {
        taken.add(column);
        return column;
      }
    }
    return null;
  });
}

/**
 * CSV as Excel and Google Sheets write it: commas or semicolons, quoted fields with doubled
 * quotes inside, line breaks inside quotes, a byte order mark at the start. South African Excel
 * often saves with semicolons, because the comma is the decimal separator there.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

export type SpreadsheetRead = {
  listings: SourceListing[];
  /** Columns found, in the person's own words, so the screen can show what was understood. */
  understood: { header: string; column: Column }[];
  ignored: string[];
  /** Row-level problems, by the row number a person sees in their spreadsheet. */
  problems: string[];
};

const linkPattern = /https?:\/\/[^\s|,;"']+/gi;

/** Reads a whole CSV into listings, one per row that names at least a make. */
export function readSpreadsheet(text: string, source: string): SpreadsheetRead {
  const rows = parseCsv(text);
  const [headers = [], ...body] = rows;
  const columns = mapHeaders(headers);

  const understood: SpreadsheetRead["understood"] = [];
  const ignored: string[] = [];
  headers.forEach((header, index) => {
    const column = columns[index];
    if (column) understood.push({ header: header.trim(), column });
    else if (header.trim()) ignored.push(header.trim());
  });

  const problems: string[] = [];
  if (!columns.includes("make")) {
    problems.push("There is no Make column, so no car can be read. Use the template's headings.");
    return { listings: [], understood, ignored, problems };
  }

  const listings: SourceListing[] = [];
  const seen = new Set<string>();

  body.forEach((cells, index) => {
    const rowNumber = index + 2;
    const value = (column: Column): string | null => {
      const at = columns.indexOf(column);
      const cell = at >= 0 ? (cells[at] ?? "").trim() : "";
      return cell.length > 0 ? cell : null;
    };

    const make = value("make");
    if (!make) {
      problems.push(`Row ${rowNumber} has no make, so it was skipped.`);
      return;
    }
    const model = value("model");
    const variant = value("variant");
    const year = firstNumber(value("year"));
    const mileageKm = firstNumber(value("mileage"));
    const price = wholeRands(value("price") ?? "");
    const stock = value("stockNumber") ?? value("vin");

    // The stock number is what the next upload matches this car on. Without one, the car's own
    // description stands in, which survives a re-upload as long as nothing about the car changes.
    const externalId =
      stock ??
      `row-${createHash("sha1")
        .update([make, model, variant, year, mileageKm].join("|"))
        .digest("hex")
        .slice(0, 16)}`;
    if (seen.has(externalId)) {
      problems.push(
        `Row ${rowNumber} has the same stock number as an earlier row (${externalId}), so it was skipped.`,
      );
      return;
    }
    seen.add(externalId);

    const description = cleanDescription(value("description") ?? "");
    const title = [year, make, model, variant].filter(Boolean).join(" ");

    listings.push({
      source,
      externalId,
      url: `${source}#row-${rowNumber}`,
      slug: "",
      title: title || null,
      makeText: make,
      modelText: model,
      year: year && year >= 1950 && year <= 2100 ? year : null,
      mileageKm,
      price: price && price > 0 ? price : null,
      exteriorColourText: value("colour"),
      interiorColourText: null,
      transmissionText: value("transmission"),
      fuelText: value("fuel"),
      bodyText: value("body"),
      driveText: value("drive"),
      description: description.text,
      removedContactDetails:
        description.removedPhones + description.removedEmails + description.removedNames,
      features: [],
      photoUrls: [...new Set(value("photos")?.match(linkPattern) ?? [])],
    });
  });

  return { listings, understood, ignored, problems };
}

/** The template a dealership fills in: the headings and one example row. */
export function templateCsv(): string {
  const quote = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return [
    TEMPLATE_COLUMNS.map((column) => quote(column.header)).join(","),
    TEMPLATE_COLUMNS.map((column) => quote(column.example)).join(","),
  ].join("\r\n");
}
