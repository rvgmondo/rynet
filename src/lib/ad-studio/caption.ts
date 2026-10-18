import { formatKm, formatRand } from "@/lib/format";

/**
 * The words on an ad and under it, kept apart from the drawing so they can be tested.
 *
 * Everything here is taken from the car's own record. Nothing is added that the listing does not
 * say: no "great condition", no "must see", no claim about finance a buyer has not been offered.
 */

export type AdCar = {
  id: number;
  title: string;
  year: number | null;
  price: number | null;
  mileageKm: number | null;
  transmission: string | null;
  town: string | null;
  url: string;
  photos: string[];
};

export type AdDealer = {
  tradingName: string;
  logoUrl: string | null;
  showroomUrl: string;
  town: string | null;
};

/** "64 000 km  |  Automatic  |  Pretoria", leaving out whatever the car does not say. */
export function detailLine(car: AdCar): string {
  return [car.mileageKm !== null ? formatKm(car.mileageKm) : null, car.transmission, car.town]
    .filter((part): part is string => Boolean(part))
    .join("  |  ");
}

export function priceLabel(price: number | null): string | null {
  return price && price > 0 ? formatRand(price) : null;
}

/** The text to paste under the post on Facebook, Instagram or a WhatsApp status. */
export function carCaption(car: AdCar, dealer: AdDealer): string {
  const price = priceLabel(car.price);
  const facts = [car.title, price, detailLine(car)].filter(Boolean).join(", ");
  return [
    `Fresh on Rynet: ${facts}.`,
    `At ${dealer.tradingName}${dealer.town ? ` in ${dealer.town}` : ""}, a dealership Rynet has checked.`,
    "",
    car.url,
  ].join("\n");
}

export function showroomCaption(dealer: AdDealer, liveCars: number): string {
  return [
    `${dealer.tradingName} is on Rynet${dealer.town ? `, in ${dealer.town}` : ""}.`,
    `${liveCars === 1 ? "1 car" : `${liveCars} cars`} in their showroom, every one from a dealership Rynet has checked.`,
    "",
    dealer.showroomUrl,
  ].join("\n");
}

/**
 * The same car in the dealership's own voice, for posting on its own Page: "we", not "a dealership
 * Rynet has checked", which reads oddly from the dealership itself.
 */
export function ownCaption(car: AdCar): string {
  const price = priceLabel(car.price);
  const facts = [car.title, price, detailLine(car)].filter(Boolean).join(", ");
  return [
    `Just in: ${facts}.`,
    "Send us a message to see it or book a test drive.",
    "",
    car.url,
  ].join("\n");
}

export function ownShowroomCaption(dealer: AdDealer, liveCars: number): string {
  return [
    `${liveCars === 1 ? "1 car" : `${liveCars} cars`} ready to drive away, all on Rynet.`,
    "Have a look and send us a message about any of them.",
    "",
    dealer.showroomUrl,
  ].join("\n");
}
