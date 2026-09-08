import { describe, expect, it } from "vitest";

import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  hotp,
  matchRecoveryCode,
  normaliseRecoveryCode,
  otpauthUrl,
  totp,
  verifyTotp,
} from "./totp";

/**
 * The point of writing TOTP rather than installing it is that the RFCs publish the answers.
 * Every vector below is copied from the specification, so a pass here is not "the code agrees
 * with itself", it is "the code agrees with the standard every authenticator app implements".
 *
 * If these fail, do not debug the login flow. Debug this.
 */

// RFC 6238 Appendix B uses the ASCII secret "12345678901234567890" for SHA-1.
const RFC6238_SECRET = Buffer.from("12345678901234567890", "ascii");

describe("base32, RFC 4648", () => {
  // Section 10. The RFC prints these padded; authenticator apps use them unpadded, so the
  // expectations have the padding stripped and `base32Decode` is tested against both.
  const VECTORS: [string, string][] = [
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
  ];

  for (const [plain, encoded] of VECTORS) {
    it(`encodes ${plain || "an empty string"}`, () => {
      expect(base32Encode(Buffer.from(plain, "ascii"))).toBe(encoded);
    });

    it(`decodes ${encoded || "an empty string"}`, () => {
      expect(base32Decode(encoded).toString("ascii")).toBe(plain);
    });
  }

  it("accepts padding, lower case and the spacing an app displays", () => {
    expect(base32Decode("mzxw6ytboi======").toString("ascii")).toBe("foobar");
    expect(base32Decode("MZXW 6YTB OI").toString("ascii")).toBe("foobar");
  });

  it("refuses characters that are not in the alphabet", () => {
    // 0, 1 and 8 are excluded from base32 precisely because they are misread.
    expect(() => base32Decode("MZXW0")).toThrow();
  });

  it("round-trips random secrets", () => {
    for (let i = 0; i < 50; i += 1) {
      const secret = generateSecret();
      expect(base32Encode(base32Decode(secret))).toBe(secret);
    }
  });
});

describe("HOTP, RFC 4226 Appendix D", () => {
  // The RFC's table of the first ten counters for the standard secret.
  const EXPECTED = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];

  for (const [counter, code] of EXPECTED.entries()) {
    it(`counter ${counter} produces ${code}`, () => {
      expect(hotp(RFC6238_SECRET, counter)).toBe(code);
    });
  }
});

describe("TOTP, RFC 6238 Appendix B", () => {
  // Every SHA-1 row of the RFC's table. Eight digits, because that is what the RFC prints.
  const VECTORS: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];

  for (const [seconds, code] of VECTORS) {
    it(`at unix time ${seconds} produces ${code}`, () => {
      expect(totp(RFC6238_SECRET, seconds * 1000, { digits: 8 })).toBe(code);
    });
  }

  it("produces the six digit code an authenticator app would show", () => {
    // The six digit code is the last six of the eight digit one, which is what makes the RFC
    // vectors usable for the length we actually ship.
    expect(totp(RFC6238_SECRET, 59_000)).toBe("287082");
  });

  it("accepts a base32 secret as well as a buffer", () => {
    const encoded = base32Encode(RFC6238_SECRET);
    expect(totp(encoded, 59_000, { digits: 8 })).toBe("94287082");
  });

  it("changes every thirty seconds and not before", () => {
    const at = 1_700_000_000_000;
    const start = Math.floor(at / 30_000) * 30_000;
    expect(totp(RFC6238_SECRET, start)).toBe(totp(RFC6238_SECRET, start + 29_999));
    expect(totp(RFC6238_SECRET, start)).not.toBe(totp(RFC6238_SECRET, start + 30_000));
  });
});

describe("verifyTotp", () => {
  const at = 1_700_000_000_000;

  it("accepts the current code", () => {
    expect(verifyTotp(RFC6238_SECRET, totp(RFC6238_SECRET, at), at)).toBe(true);
  });

  it("accepts one step either side, for a phone whose clock has drifted", () => {
    expect(verifyTotp(RFC6238_SECRET, totp(RFC6238_SECRET, at - 30_000), at)).toBe(true);
    expect(verifyTotp(RFC6238_SECRET, totp(RFC6238_SECRET, at + 30_000), at)).toBe(true);
  });

  it("refuses two steps away, which is the point of having a window at all", () => {
    expect(verifyTotp(RFC6238_SECRET, totp(RFC6238_SECRET, at - 60_000), at)).toBe(false);
    expect(verifyTotp(RFC6238_SECRET, totp(RFC6238_SECRET, at + 60_000), at)).toBe(false);
  });

  it("forgives the space authenticator apps put in the middle", () => {
    const code = totp(RFC6238_SECRET, at);
    expect(verifyTotp(RFC6238_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, at)).toBe(true);
  });

  it("refuses anything that is not six digits", () => {
    for (const rubbish of ["", "12345", "1234567", "abcdef", "12 34", "  ", "000000x"]) {
      expect(verifyTotp(RFC6238_SECRET, rubbish, at), rubbish).toBe(false);
    }
  });

  it("refuses a code from a different secret", () => {
    const other = base32Decode(generateSecret());
    expect(verifyTotp(RFC6238_SECRET, totp(other, at), at)).toBe(false);
  });

  it("does not accept a code that is merely numerically close", () => {
    const code = totp(RFC6238_SECRET, at);
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    expect(verifyTotp(RFC6238_SECRET, wrong, at)).toBe(false);
  });
});

describe("otpauthUrl", () => {
  it("names the issuer in both places an app might read it", () => {
    const url = otpauthUrl({ secret: "ABCDEFGH", account: "ruben@rynet.co.za" });
    // The label carries "Issuer:account", and issuer is repeated as a parameter, because
    // which one an app reads depends on how old it is.
    expect(url).toContain("otpauth://totp/Rynet%3Aruben%40rynet.co.za");
    expect(url).toContain("issuer=Rynet");
    expect(url).toContain("secret=ABCDEFGH");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
    expect(url).toContain("algorithm=SHA1");
  });
});

describe("recovery codes", () => {
  const PEPPER = "test-pepper-not-a-real-secret";

  it("generates ten distinct codes", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("leaves out the characters people misread", () => {
    // No 0/O, 1/I/L or 8/B confusion: these get written on paper and typed back months later.
    for (const code of generateRecoveryCodes(200)) {
      expect(code).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,
      );
    }
  });

  it("normalises what somebody actually types", () => {
    expect(normaliseRecoveryCode("abcde-fghjk")).toBe("ABCDEFGHJK");
    expect(normaliseRecoveryCode("ABCDE FGHJK")).toBe("ABCDEFGHJK");
    expect(normaliseRecoveryCode("ABCDEFGHJK")).toBe("ABCDEFGHJK");
  });

  it("matches a code however it was typed, and returns the hash that matched", () => {
    const [code = ""] = generateRecoveryCodes(1);
    const hashes = [hashRecoveryCode(code, PEPPER)];

    expect(matchRecoveryCode(code, hashes, PEPPER)).toBe(hashes[0]);
    expect(matchRecoveryCode(code.toLowerCase(), hashes, PEPPER)).toBe(hashes[0]);
    expect(matchRecoveryCode(code.replace("-", " "), hashes, PEPPER)).toBe(hashes[0]);
  });

  it("refuses a code that was not issued", () => {
    const issued = generateRecoveryCodes(3);
    const hashes = issued.map((c) => hashRecoveryCode(c, PEPPER));
    const [stranger = ""] = generateRecoveryCodes(1);

    expect(matchRecoveryCode(stranger, hashes, PEPPER)).toBeNull();
  });

  it("refuses a valid code under a different pepper, so a stolen table is not enough", () => {
    const [code = ""] = generateRecoveryCodes(1);
    const hashes = [hashRecoveryCode(code, PEPPER)];

    expect(matchRecoveryCode(code, hashes, "a-different-pepper")).toBeNull();
  });

  it("stores nothing that reveals the code", () => {
    const [code = ""] = generateRecoveryCodes(1);
    const hash = hashRecoveryCode(code, PEPPER);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(normaliseRecoveryCode(code));
  });
});
