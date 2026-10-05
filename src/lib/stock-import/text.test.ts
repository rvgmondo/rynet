import { describe, expect, it } from "vitest";

import {
  cleanDescription,
  colourFamilyOf,
  firstNumber,
  lexicalParagraphs,
  lexicalToText,
  normaliseKey,
  tidyColourName,
  tidyPunctuation,
  toParagraphs,
  wholeRands,
} from "./text";

/**
 * The cleaning tests are the ones that matter.
 *
 * Every example below is the shape of real text from amicomotors.co.za, word for word, because the
 * thing being guarded against is a salesperson's name and cellphone number going up on Rynet under a
 * dealership's listing, and an invented shape would only prove the regular expression matches the
 * invented shape. The names and numbers themselves are replaced with made-up ones, so this file
 * does not republish the people it exists to protect.
 */

describe("taking people out of a description", () => {
  it("removes a first name and the cellphone number beside it", () => {
    const { text, removedPhones } = cleanDescription(
      "This car still sparkles, looked after with original service books. Still available Call whatsapp Thandi 0820000001",
    );
    expect(text).toBe(
      "This car still sparkles, looked after with original service books. Still available",
    );
    expect(removedPhones).toBe(1);
    expect(text).not.toMatch(/Thandi|0820000001/);
  });

  it("removes a whole row of salespeople", () => {
    const { text, removedPhones } = cleanDescription(
      "Full service record, looked after, reliable, eazy maintenance Pieter 082 000 0002 Sipho 061 000 0003 Johan 068 000 0004 Lerato 074 000 0005 Thandi 082 000 0001",
    );
    expect(text).toBe("Full service record, looked after, reliable, eazy maintenance");
    expect(removedPhones).toBe(5);
  });

  it("removes a landline written with brackets and a dash", () => {
    const { text, removedPhones } = cleanDescription("Come and see it. Phone (012) 000-0006 today");
    expect(text).toBe("Come and see it. today");
    expect(removedPhones).toBe(1);
  });

  it("removes a number written with the country code", () => {
    const { text, removedPhones } = cleanDescription("Call us on +27 82 000 0001 for a test drive");
    expect(removedPhones).toBe(1);
    expect(text).not.toMatch(/\d/);
  });

  it("removes an email address", () => {
    const { text, removedEmails } = cleanDescription(
      "A lovely car. Email sales@example.co.za to book a viewing",
    );
    expect(removedEmails).toBe(1);
    expect(text).toBe("A lovely car. to book a viewing");
  });

  it("leaves prices, mileages, engine sizes and years alone", () => {
    const { text, removedPhones } = cleanDescription(
      "Priced at R299,900, this 2019 model has covered 170,000 km, uses 5.4 litres per 100 km and reaches 203 km/h.",
    );
    expect(removedPhones).toBe(0);
    expect(text).toContain("R299,900");
    expect(text).toContain("170,000 km");
    expect(text).toContain("2019");
    expect(text).toContain("5.4 litres");
  });

  it("leaves a description with nobody in it exactly as it was", () => {
    const original =
      "Discover the stylish Chevrolet Spark 1.2 LS, a compact hatchback perfect for city adventures.";
    expect(cleanDescription(original).text).toBe(original);
  });

  it("gives an empty description back as an empty string", () => {
    expect(cleanDescription(null).text).toBe("");
    expect(cleanDescription(undefined).removedPhones).toBe(0);
  });

  it("takes the whole line when the words in front are joined up", () => {
    // "Call or whatsapp" used to lose only its second half and leave "Call or" on the end.
    const { text } = cleanDescription(
      "Comes with a full service record and spare keys, value for money and peace of mind . Call or whatsapp Thandi 082 000 0001",
    );
    expect(text).toBe(
      "Comes with a full service record and spare keys, value for money and peace of mind.",
    );
  });

  it("takes a name typed after the number as well as before it", () => {
    const { text } = cleanDescription(
      "A fun family car !! Call /whatsapp : 0820000001 Thandi No forms needed",
    );
    expect(text).toBe("A fun family car!! No forms needed");
    expect(text).not.toMatch(/Thandi/);
  });

  it("does not mistake the next sentence for a name", () => {
    const { text } = cleanDescription("Great car. Call 082 000 0001 Monday to Friday.");
    expect(text).toBe("Great car. Monday to Friday.");
  });

  it("takes out a person asked for by name with no number beside them", () => {
    const { text, removedNames } = cleanDescription("Ask for Thandi when you visit.");
    expect(removedNames).toBe(1);
    expect(text).not.toMatch(/Thandi/);
  });

  it("leaves a team asked for by what it does", () => {
    const original = "Contact the sales team today to arrange a test drive.";
    expect(cleanDescription(original).text).toBe(original);
  });

  it("tidies the gap a removed number leaves behind", () => {
    const { text } = cleanDescription("Neat car , great value . Call Thandi 082 000 0001 .");
    expect(text).toBe("Neat car, great value.");
  });
});

describe("colour names", () => {
  it("keeps a maker's own colour name", () => {
    expect(tidyColourName("Candy White")).toBe("Candy White");
    expect(tidyColourName("Dark Grey Metallic")).toBe("Dark Grey Metallic");
  });

  it("separates the words in a colour typed as one", () => {
    expect(tidyColourName("greymetallic")).toBe("Grey Metallic");
    expect(tidyColourName("lightsilver")).toBe("Light Silver");
    expect(tidyColourName("purewhite")).toBe("Pure White");
    expect(tidyColourName("darksilver")).toBe("Dark Silver");
  });

  it("capitalises a plain lower case colour", () => {
    expect(tidyColourName("grey")).toBe("Grey");
  });

  it("files a colour under the group a buyer filters by", () => {
    expect(colourFamilyOf("Dark Grey Metallic")).toBe("grey");
    expect(colourFamilyOf("Candy White")).toBe("white");
    expect(colourFamilyOf("Charcoal")).toBe("grey");
    expect(colourFamilyOf("Bronze")).toBe("brown");
    expect(colourFamilyOf("Iridium Silver")).toBe("silver");
  });

  it("gives up rather than guessing a group", () => {
    expect(colourFamilyOf("Danakil")).toBeNull();
    expect(colourFamilyOf("")).toBeNull();
  });
});

describe("rich text", () => {
  it("builds a paragraph per line and reads back the same words", () => {
    const value = lexicalParagraphs(["One line.", "Another line."]);
    expect(value?.root.children).toHaveLength(2);
    expect(lexicalToText(value)).toBe("One line. Another line.");
  });

  it("is nothing at all when there is nothing to say", () => {
    expect(lexicalParagraphs([])).toBeNull();
    expect(lexicalParagraphs(["   "])).toBeNull();
  });

  it("splits text on blank lines only", () => {
    expect(toParagraphs("One.\nStill one.\n\nTwo.")).toEqual(["One. Still one.", "Two."]);
  });
});

describe("small helpers", () => {
  it("reads the first whole number out of a value", () => {
    expect(firstNumber("R169 000")).toBe(169000);
    expect(firstNumber("122000km")).toBe(122000);
    expect(firstNumber("2015")).toBe(2015);
    expect(firstNumber("no numbers here")).toBeNull();
    expect(firstNumber(null)).toBeNull();
  });

  it("reads a price in whole rands, cents or none", () => {
    expect(wholeRands("R169 000")).toBe(169000);
    expect(wholeRands("R 169,000")).toBe(169000);
    // Read as one number, "169 000.00" is R 16 900 000.
    expect(wholeRands("R169 000.00")).toBe(169000);
    expect(wholeRands("POA")).toBeNull();
  });

  it("compares names without their punctuation or capitals", () => {
    expect(normaliseKey("Mercedes-Benz")).toBe("mercedes benz");
    expect(normaliseKey("  T-Cross ")).toBe("t cross");
  });

  it("puts spacing back the way a person would type it", () => {
    expect(tidyPunctuation("Neat car , great value .")).toBe("Neat car, great value.");
  });
});
