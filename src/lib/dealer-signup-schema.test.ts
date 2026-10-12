import { describe, expect, it } from "vitest";

import { dealerSignupSchema, readSignup, signupMessage } from "./dealer-signup-schema";

const valid = {
  dealership: "Smith Motors",
  name: "Jan Smith",
  phone: "082 555 1234",
  email: "",
  website: "smithmotors.co.za",
  town: "Pretoria",
  stock: "20_50",
  consent: true,
};

describe("the dealer sign-up form", () => {
  it("accepts five answers and a tick", () => {
    expect(dealerSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("needs a phone number it can use", () => {
    const result = dealerSignupSchema.safeParse({ ...valid, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("does not need an email address, but refuses a wrong one", () => {
    expect(dealerSignupSchema.safeParse({ ...valid, email: undefined }).success).toBe(true);
    expect(dealerSignupSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("will not send without consent", () => {
    expect(dealerSignupSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
});

describe("the sign-up as the onboarding desk reads it", () => {
  it("reads back exactly what was written", () => {
    const message = signupMessage(valid as Parameters<typeof signupMessage>[0]);
    expect(readSignup(message)).toEqual({
      dealership: "Smith Motors",
      website: "smithmotors.co.za",
      town: "Pretoria",
      stock: "20 to 50 cars",
    });
  });

  it("treats no website as empty, not as the words", () => {
    const message = signupMessage({ ...valid, website: "" } as Parameters<typeof signupMessage>[0]);
    expect(readSignup(message).website).toBe("");
  });

  it("copes with a message a person has edited", () => {
    expect(readSignup("Called them back.\r\nDealership: Ace Cars\r\nTown: Durban")).toMatchObject({
      dealership: "Ace Cars",
      town: "Durban",
    });
    expect(readSignup(null).dealership).toBe("");
  });
});
