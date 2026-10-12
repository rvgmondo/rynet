import { describe, expect, it } from "vitest";

import { assertPublicUrl, isPrivateAddress } from "./address-guard";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "not an address",
  ])("refuses %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["41.185.8.10", "8.8.8.8", "172.32.0.1", "2001:4860:4860::8888"])("allows %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  const publicHost = async () => ["41.185.8.10"];

  it("allows a public website", async () => {
    await expect(assertPublicUrl("https://amicomotors.co.za/", publicHost)).resolves.toBeInstanceOf(
      URL,
    );
  });

  it("refuses a name that resolves inside the network", async () => {
    await expect(
      assertPublicUrl("https://sneaky.example/", async () => ["10.0.0.5"]),
    ).rejects.toThrow(/public internet/);
  });

  it("refuses when any one of several addresses is private", async () => {
    await expect(
      assertPublicUrl("https://mixed.example/", async () => ["41.185.8.10", "127.0.0.1"]),
    ).rejects.toThrow(/public internet/);
  });

  it.each([
    "http://localhost:3000/",
    "http://127.0.0.1/admin",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd",
    "ftp://example.com/",
    "https://user:pass@example.com/",
    "http://printer.local/",
  ])("refuses %s", async (address) => {
    await expect(assertPublicUrl(address, publicHost)).rejects.toThrow();
  });
});
