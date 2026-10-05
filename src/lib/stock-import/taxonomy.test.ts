import { describe, expect, it } from "vitest";

import {
  chooseModel,
  designatedModel,
  findEntry,
  findLeading,
  modelFromSlug,
  modelTextFromTitle,
  pickModel,
  SOURCE_ALIASES,
  splitModelName,
  tidyModelName,
  trimOutside,
} from "./taxonomy";
import type { TaxonomyEntry } from "./types";

const entry = (id: number, name: string, extra: Partial<TaxonomyEntry> = {}): TaxonomyEntry => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  aliases: null,
  ...extra,
});

const MAKES = [entry(1, "Volkswagen"), entry(2, "Mercedes-Benz"), entry(3, "Toyota")];
const VW_MODELS = [
  entry(10, "Polo", { parent: 1 }),
  entry(11, "Polo Vivo", { parent: 1 }),
  entry(12, "Amarok", { parent: 1 }),
  entry(13, "T-Cross", { parent: 1 }),
];
const BODIES = [entry(20, "Hatchback"), entry(21, "Bakkie"), entry(22, "SUV"), entry(23, "Sedan")];
const GEARBOXES = [entry(30, "Manual"), entry(31, "Automatic"), entry(32, "Dual Clutch")];

describe("matching what a source says to a list Rynet keeps", () => {
  it("matches on the name, whatever the capitals", () => {
    expect(findEntry(MAKES, "volkswagen")?.id).toBe(1);
    expect(findEntry(MAKES, "Mercedes-Benz")?.id).toBe(2);
  });

  it("matches on a name the source uses instead", () => {
    expect(findEntry(MAKES, "VW", SOURCE_ALIASES.makes)?.id).toBe(1);
    expect(findEntry(MAKES, "Mercedes", SOURCE_ALIASES.makes)?.id).toBe(2);
  });

  it("matches on a name the list itself records", () => {
    const withAlias = [entry(40, "Bakkie", { aliases: ["pickup", "double cab"] })];
    expect(findEntry(withAlias, "Double Cab")?.id).toBe(40);
  });

  it("does not mind a plural", () => {
    expect(findEntry(BODIES, "Hatchbacks")?.id).toBe(20);
    expect(findEntry(BODIES, "Sedans")?.id).toBe(23);
    expect(findEntry(BODIES, "Bakkies")?.id).toBe(21);
  });

  it("maps the gearbox names this source writes", () => {
    expect(findEntry(GEARBOXES, "S-Tronic", SOURCE_ALIASES.transmissions)?.id).toBe(32);
    expect(findEntry(GEARBOXES, "Steptronic", SOURCE_ALIASES.transmissions)?.id).toBe(31);
    expect(findEntry(GEARBOXES, "Manual")?.id).toBe(30);
  });

  it("gives up rather than finding the nearest thing", () => {
    // The whole point. A Q2 must never come back as a Q3.
    expect(findEntry(VW_MODELS, "Golf")).toBeNull();
    expect(findEntry(MAKES, "")).toBeNull();
    expect(findEntry(MAKES, null)).toBeNull();
  });
});

describe("splitting a model from the trim beside it", () => {
  it("matches the longest model and hands the rest on", () => {
    expect(findLeading(VW_MODELS, "Polo Vivo 1.4 Trendline")).toEqual({
      entry: VW_MODELS[1],
      residue: "1.4 Trendline",
    });
    expect(findLeading(VW_MODELS, "Polo GP 1.2 TSI")).toEqual({
      entry: VW_MODELS[0],
      residue: "GP 1.2 TSI",
    });
  });

  it("matches a model on its own with nothing left over", () => {
    expect(findLeading(VW_MODELS, "Amarok")).toEqual({ entry: VW_MODELS[2], residue: "" });
  });

  it("finds nothing when the model is not one of ours", () => {
    expect(findLeading(VW_MODELS, "Touareg 3.0 V6")).toBeNull();
  });
});

describe("naming a model Rynet does not have yet", () => {
  it("cuts at the engine size", () => {
    expect(splitModelName("spark 1.2 LS")).toEqual({ name: "spark", trim: "1.2 LS" });
    expect(splitModelName("RAV4 2.0 GX")).toEqual({ name: "RAV4", trim: "2.0 GX" });
    expect(splitModelName("Corolla Quest 1.8 Prestige")).toEqual({
      name: "Corolla Quest",
      trim: "1.8 Prestige",
    });
  });

  it("cuts at a generation number", () => {
    expect(splitModelName("Accent IV 1.6 GLS Fluid")).toEqual({
      name: "Accent",
      trim: "IV 1.6 GLS Fluid",
    });
  });

  it("never lets a trim become the model name", () => {
    // Three words at most, or one dealership's Rangers would end up under four different models.
    expect(splitModelName("Ranger XL Double Cab 4x4 Pick Up").name.split(" ")).toHaveLength(3);
  });

  it("writes the name the way a list should read", () => {
    expect(tidyModelName("spark")).toBe("Spark");
    expect(tidyModelName("JUKE")).toBe("Juke");
    expect(tidyModelName("RAV4")).toBe("RAV4");
    expect(tidyModelName("X-Trail")).toBe("X-Trail");
    expect(tidyModelName("i20")).toBe("i20");
  });
});

describe("when the table says nothing", () => {
  it("takes the model out of the page title", () => {
    expect(modelTextFromTitle("Suzuki Swift 1.2 GL 2014", "Suzuki")).toBe("Swift 1.2 GL");
    expect(modelTextFromTitle("Volkswagen Polo 2015", "Volkswagen")).toBe("Polo");
  });

  it("gives back nothing when the title is only the make and a year", () => {
    expect(modelTextFromTitle("BMW 2018", "BMW")).toBe("");
  });

  it("recognises a model in the web address, but only one Rynet already has", () => {
    expect(modelFromSlug(VW_MODELS, "volkswagen-amarok-2-0-bi-tdi-2012", "volkswagen")?.id).toBe(
      12,
    );
    expect(modelFromSlug(VW_MODELS, "volkswagen-vw-t-cross-1-0-tsi-2019", "volkswagen")?.id).toBe(
      13,
    );
    // Nothing in the list matches, so the car waits for a person rather than inventing "Vw Move".
    expect(modelFromSlug(VW_MODELS, "volkswagen-vw-move-up-3-door-2016", "volkswagen")).toBeNull();
  });

  it("prefers the longer model name in an address", () => {
    expect(modelFromSlug(VW_MODELS, "volkswagen-polo-vivo-1-4-hatch-2023", "volkswagen")?.id).toBe(
      11,
    );
  });
});

describe("model names taken from a title", () => {
  it("drops a bracketed aside at the front", () => {
    expect(splitModelName("(VW) Move up! 3 Door").name).toBe("Move up!");
  });

  it("cuts at a bracketed chassis code", () => {
    expect(splitModelName("218i (F45) Active Tourer Steptronic").name).toBe("218i");
  });

  it("does not mistake a model whose name has digits in it for a code", () => {
    // "Grand i10" is the model. Cutting at "i10" left a Hyundai Grand.
    expect(splitModelName("Grand i10 1.25 Fluid")).toEqual({
      name: "Grand i10",
      trim: "1.25 Fluid",
    });
    expect(splitModelName("CX-3 2.0 Active Auto").name).toBe("CX-3");
  });
});

/*
 * The model decisions below are the ones Amico's own pages forced, each written as it appears on
 * amicomotors.co.za: the Model row from the details table first, then the page title with the make
 * taken off.
 */

const AUDI = [entry(50, "A3", { parent: 5 }), entry(51, "Q3", { parent: 5 })];
const FORD = [entry(60, "Ranger", { parent: 6 }), entry(61, "EcoSport", { parent: 6 })];
const MERCEDES = [entry(70, "C-Class", { parent: 2 }), entry(71, "A-Class", { parent: 2 })];
const NISSAN = [entry(80, "X-Trail", { parent: 8 })];

const decide = (models: TaxonomyEntry[], make: string, table: string | null, title: string) =>
  chooseModel(pickModel(models, make, table), pickModel(models, make, title), title);

describe("taking the make off the front of a title", () => {
  it("takes it off however the page wrote it", () => {
    expect(modelTextFromTitle("Suzuki Swift 1.2 GL 2014", "Suzuki")).toBe("Swift 1.2 GL");
    expect(modelTextFromTitle("Volkswagen Polo 2015", "Volkswagen")).toBe("Polo");
    expect(modelTextFromTitle("Mercedes Benz C 200K Classic 2008", "Mercedes-Benz")).toBe(
      "C 200K Classic",
    );
    expect(
      modelTextFromTitle("VW Polo Vivo 1.4 Hatch 2023", "Volkswagen", SOURCE_ALIASES.makes),
    ).toBe("Polo Vivo 1.4 Hatch");
    expect(
      modelTextFromTitle("Volkswagen VW Amarok 2.0 BiTDI 2012", "Volkswagen", SOURCE_ALIASES.makes),
    ).toBe("Amarok 2.0 BiTDI");
  });

  it("leaves a bracketed aside for the model reader to skip", () => {
    const rest = modelTextFromTitle("Volkswagen (VW) Move up! 3 Door 2016", "Volkswagen");
    expect(rest).toBe("(VW) Move up! 3 Door");
    expect(pickModel([], "Volkswagen", rest)?.name).toBe("Up");
  });

  it("gives back nothing when the title is only the make and a year", () => {
    expect(modelTextFromTitle("BMW 2018", "BMW")).toBe("");
  });
});

describe("reading a maker's designation", () => {
  it("reads the series off a BMW number", () => {
    expect(designatedModel("BMW", "218i (F45) Active Tourer Steptronic")).toBe("2 Series");
    expect(designatedModel("BMW", "318i (G20) M-Sport Auto")).toBe("3 Series");
    expect(designatedModel("BMW", "X1 sDrive 18i")).toBeNull();
  });

  it("reads the class off a Mercedes-Benz designation", () => {
    expect(designatedModel("Mercedes-Benz", "A 180 Classic Automatic")).toBe("A-Class");
    expect(designatedModel("Mercedes-Benz", "B200 Blue Efficiency")).toBe("B-Class");
    expect(designatedModel("Mercedes-Benz", "C 200K (135 kW) Classic")).toBe("C-Class");
    expect(designatedModel("Mercedes-Benz", "ML 350 BlueTEC")).toBe("M-Class");
    expect(designatedModel("Mercedes-Benz", "GLA 200 CDi")).toBe("GLA");
    expect(designatedModel("Mercedes-Benz", "GL 500")).toBe("GL-Class");
  });

  it("says nothing for a make that does not name cars by number", () => {
    expect(designatedModel("Toyota", "218i")).toBeNull();
  });

  it("keeps the designation in the trim", () => {
    const pick = pickModel([], "BMW", "218i (F45) Active Tourer Steptronic");
    expect(pick).toMatchObject({
      name: "2 Series",
      residue: "218i (F45) Active Tourer Steptronic",
      known: true,
    });
  });
});

describe("the model a piece of text names", () => {
  it("prefers the model Rynet already keeps", () => {
    expect(pickModel(AUDI, "Audi", "Q3 1.4 TFSI")).toMatchObject({
      entry: AUDI[1],
      residue: "1.4 TFSI",
      known: true,
    });
  });

  it("uses a model's other name, and keeps the words that were trim", () => {
    expect(pickModel([], "MINI", "Cooper S Countryman (141 kW) Steptronic")).toMatchObject({
      entry: null,
      name: "Countryman",
      residue: "Cooper S (141 kW) Steptronic",
      known: true,
    });
    expect(pickModel([], "Land Rover", "Evoque 2.0 Si4 Dynamic")).toMatchObject({
      name: "Range Rover Evoque",
      residue: "2.0 Si4 Dynamic",
    });
    expect(pickModel([], "Mahindra", "XUV 300 1.2T (W8)")).toMatchObject({
      name: "XUV300",
      residue: "1.2T (W8)",
    });
  });

  it("matches a name typed with the gap in a different place", () => {
    expect(pickModel(NISSAN, "Nissan", "Xtrail 2.0 XE 4X2")?.entry).toBe(NISSAN[0]);
  });

  it("cuts a new name from the text only when nothing else matched", () => {
    expect(pickModel([], "Ford", "Kuga 1.5 EcoBoost Ambiente Auto")).toMatchObject({
      entry: null,
      name: "Kuga",
      residue: "1.5 EcoBoost Ambiente Auto",
      known: false,
    });
  });

  it("has nothing to say about nothing", () => {
    expect(pickModel(AUDI, "Audi", "")).toBeNull();
    expect(pickModel(AUDI, "Audi", null)).toBeNull();
  });
});

describe("deciding between the table and the title", () => {
  it("takes the model when both agree, with the trim the title gives", () => {
    const choice = decide(FORD, "Ford", "Ranger 2.2 TDCi", "Ranger IX 2.2 TDCi XL Super Cab");
    expect(choice).toMatchObject({ kind: "pick", trim: "IX 2.2 TDCi XL Super Cab" });
    expect(choice.kind === "pick" && choice.pick.entry).toBe(FORD[0]);
  });

  it("takes the fuller name when the title names a model the table only starts", () => {
    const sport = decide([], "Land Rover", "Discovery", "Discovery Sport 2.2 SD4 SE (140 kW)");
    expect(sport).toMatchObject({ kind: "pick", trim: "2.2 SD4 SE (140 kW)" });
    expect(sport.kind === "pick" && sport.pick.name).toBe("Discovery Sport");

    const evoque = decide([], "Land Rover", "Range Rover", "Evoque 2.0 Si4 Dynamic");
    expect(evoque.kind === "pick" && evoque.pick.name).toBe("Range Rover Evoque");
  });

  it("takes the table when its model is named anywhere in the title", () => {
    const choice = decide([], "MINI", "Cooper Countryman", "Cooper S Mark III (135 kW) Countryman");
    expect(choice).toMatchObject({ kind: "pick", trim: "Cooper S Mark III (135 kW)" });
    expect(choice.kind === "pick" && choice.pick.name).toBe("Countryman");
  });

  it("uses whichever one there is", () => {
    const choice = decide([], "Suzuki", null, "Swift 1.2 GL");
    expect(choice.kind === "pick" && choice.pick.name).toBe("Swift");
    expect(decide([], "Suzuki", null, "")).toEqual({ kind: "none" });
  });

  /*
   * The cases the rule exists for. Each of these is a real Amico page whose details table and
   * title name different models. Filing any of them under either model would be a guess.
   */
  it("refuses to choose when the page names two different models", () => {
    expect(decide(AUDI, "Audi", "Q3", "Q2 2.0 TDI Sport S-tronic").kind).toBe("conflict");
    expect(decide(FORD, "Ford", "Escort", "Ecosport 1.5 Ambiente").kind).toBe("conflict");
    expect(decide([], "MINI", "Cooper", "One 1.6").kind).toBe("conflict");
    expect(decide(MERCEDES, "Mercedes-Benz", "GL-Class", "GLA 200 CDi").kind).toBe("conflict");
    expect(
      decide([], "Toyota", "Corolla Quest 1.8 Prestige", "Corolla 1.6 Prestige Auto").kind,
    ).toBe("conflict");
  });

  it("refuses the same way once one of the two models is on the list", () => {
    // The Corolla Quest must not be read as a Corolla with a trim called Quest just because a
    // Corolla has been added in the meantime. The answer cannot depend on the order of the list.
    const withCorolla = [entry(90, "Corolla", { parent: 9 })];
    expect(
      decide(withCorolla, "Toyota", "Corolla Quest 1.8 Prestige", "Corolla 1.6 Prestige Auto").kind,
    ).toBe("conflict");
  });
});

describe("the trim outside the model's own words", () => {
  it("takes the model's words out wherever they are", () => {
    expect(trimOutside("Cooper S Mark III (135 kW) Countryman", "Countryman", "")).toBe(
      "Cooper S Mark III (135 kW)",
    );
    expect(trimOutside("Polo GP 1.2 TSI", "Polo", "")).toBe("GP 1.2 TSI");
  });

  it("falls back when the model's name is not in the text", () => {
    expect(trimOutside("A 180 Classic", "A-Class", "A 180 Classic")).toBe("A 180 Classic");
  });
});
