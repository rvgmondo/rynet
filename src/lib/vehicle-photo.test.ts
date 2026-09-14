import { describe, expect, it } from "vitest";

import type { Media, Vehicle } from "@/payload-types";

import { pick, vehiclePhoto } from "./vehicle-photo";

/** Payload's own shape for a size it skipped: an object, with every field null. */
const skipped = {
  url: null,
  width: null,
  height: null,
  mimeType: null,
  filesize: null,
  filename: null,
};

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    alt: "Toyota Hilux",
    url: "http://localhost:3000/api/media/file/hilux.webp",
    width: 1400,
    height: 900,
    sizes: {
      thumbnail: { ...skipped, url: "/api/media/file/hilux-320x240.jpg", width: 320, height: 240 },
      card: { ...skipped, url: "/api/media/file/hilux-640x480.jpg", width: 640, height: 480 },
      gallery: { ...skipped, url: "/api/media/file/hilux-1280x960.jpg", width: 1280, height: 960 },
      hero: { ...skipped },
    },
    updatedAt: "",
    createdAt: "",
    ...overrides,
  } as Media;
}

describe("pick", () => {
  it("skips a size Payload stored as an empty object instead of giving up", () => {
    // The listing gallery asked for hero first with `??`, took this empty object, found no url
    // and drew the colour plate on every photographed listing.
    expect(pick(media(), "hero")?.url).toBe("/api/media/file/hilux-1280x960.jpg");
  });

  it("uses the original before a smaller copy for a large slot", () => {
    const noGallery = media({
      sizes: { ...media().sizes, gallery: { ...skipped }, hero: { ...skipped } } as Media["sizes"],
    });
    expect(pick(noGallery, "gallery")).toEqual({
      url: "/api/media/file/hilux.webp",
      width: 1400,
      height: 900,
    });
  });

  it("falls back to the original when there are no derivatives at all", () => {
    const bare = media({
      url: "/api/media/file/demo-toyota-hilux--1.webp",
      sizes: {
        thumbnail: { ...skipped },
        card: { ...skipped },
        gallery: { ...skipped },
        hero: { ...skipped },
      } as Media["sizes"],
    });
    expect(pick(bare, "card")?.url).toBe("/api/media/file/demo-toyota-hilux--1.webp");
    expect(pick(bare, "thumbnail")?.url).toBe("/api/media/file/demo-toyota-hilux--1.webp");
  });

  it("turns a same-origin absolute url into a path", () => {
    expect(pick(media({ sizes: undefined }), "card")?.url).toBe("/api/media/file/hilux.webp");
  });

  it("returns null for a record with nothing drawable", () => {
    expect(pick(media({ url: null, sizes: undefined }), "card")).toBeNull();
  });
});

describe("vehiclePhoto", () => {
  it("reads the first gallery image", () => {
    const vehicle = { id: 9, gallery: [{ image: media(), alt: null }] } as unknown as Vehicle;
    expect(vehiclePhoto(vehicle, "card")).toMatchObject({
      url: "/api/media/file/hilux-640x480.jpg",
      count: 1,
    });
  });

  it("is null for a listing with no photographs", () => {
    expect(vehiclePhoto({ id: 9, gallery: [] } as unknown as Vehicle)).toBeNull();
  });
});
