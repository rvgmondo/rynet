/**
 * Taxonomy seed data.
 *
 * This is real South African market data, not filler. The provinces are the nine provinces,
 * the makes are makes actually sold here, and the aliases are what South Africans actually
 * type into a search box. "Bakkie" is not a joke entry: it is what the entire country calls
 * a pickup, and a search box that does not understand it is broken on arrival.
 */

export const PROVINCES = [
  { name: "Gauteng", aliases: ["gp", "jhb", "joburg", "pta"] },
  { name: "Western Cape", aliases: ["wc", "cape town", "cpt"] },
  { name: "KwaZulu-Natal", aliases: ["kzn", "durban", "natal"] },
  { name: "Eastern Cape", aliases: ["ec", "gqeberha", "pe", "port elizabeth"] },
  { name: "Free State", aliases: ["fs", "bloemfontein", "bloem"] },
  { name: "Mpumalanga", aliases: ["mp", "nelspruit", "mbombela"] },
  { name: "Limpopo", aliases: ["lp", "polokwane", "pietersburg"] },
  { name: "North West", aliases: ["nw", "rustenburg", "potch"] },
  { name: "Northern Cape", aliases: ["nc", "kimberley", "upington"] },
] as const;

export const CITIES = [
  {
    name: "Pretoria",
    province: "Gauteng",
    latitude: -25.7479,
    longitude: 28.2293,
    aliases: ["pta", "tshwane"],
  },
  { name: "Centurion", province: "Gauteng", latitude: -25.8603, longitude: 28.1894 },
  {
    name: "Johannesburg",
    province: "Gauteng",
    latitude: -26.2041,
    longitude: 28.0473,
    aliases: ["jhb", "joburg", "jozi"],
  },
  { name: "Sandton", province: "Gauteng", latitude: -26.1076, longitude: 28.0567 },
  { name: "Randburg", province: "Gauteng", latitude: -26.0936, longitude: 27.9997 },
  { name: "Roodepoort", province: "Gauteng", latitude: -26.1625, longitude: 27.8725 },
  { name: "Boksburg", province: "Gauteng", latitude: -26.2124, longitude: 28.2624 },
  { name: "Benoni", province: "Gauteng", latitude: -26.1885, longitude: 28.3208 },
  { name: "Kempton Park", province: "Gauteng", latitude: -26.1, longitude: 28.2294 },
  { name: "Vereeniging", province: "Gauteng", latitude: -26.6731, longitude: 27.9261 },
  {
    name: "Cape Town",
    province: "Western Cape",
    latitude: -33.9249,
    longitude: 18.4241,
    aliases: ["cpt", "kaapstad"],
  },
  { name: "Bellville", province: "Western Cape", latitude: -33.8903, longitude: 18.6292 },
  { name: "Somerset West", province: "Western Cape", latitude: -34.0785, longitude: 18.8449 },
  { name: "Paarl", province: "Western Cape", latitude: -33.7274, longitude: 18.9558 },
  { name: "George", province: "Western Cape", latitude: -33.963, longitude: 22.4617 },
  { name: "Stellenbosch", province: "Western Cape", latitude: -33.9321, longitude: 18.8602 },
  {
    name: "Durban",
    province: "KwaZulu-Natal",
    latitude: -29.8587,
    longitude: 31.0218,
    aliases: ["dbn", "ethekwini"],
  },
  { name: "Umhlanga", province: "KwaZulu-Natal", latitude: -29.7275, longitude: 31.0846 },
  { name: "Pinetown", province: "KwaZulu-Natal", latitude: -29.8155, longitude: 30.8583 },
  {
    name: "Pietermaritzburg",
    province: "KwaZulu-Natal",
    latitude: -29.6006,
    longitude: 30.3794,
    aliases: ["pmb", "maritzburg"],
  },
  { name: "Richards Bay", province: "KwaZulu-Natal", latitude: -28.7807, longitude: 32.0383 },
  {
    name: "Gqeberha",
    province: "Eastern Cape",
    latitude: -33.9608,
    longitude: 25.6022,
    aliases: ["port elizabeth", "pe"],
  },
  { name: "East London", province: "Eastern Cape", latitude: -33.0292, longitude: 27.8546 },
  {
    name: "Bloemfontein",
    province: "Free State",
    latitude: -29.0852,
    longitude: 26.1596,
    aliases: ["bloem"],
  },
  {
    name: "Mbombela",
    province: "Mpumalanga",
    latitude: -25.4753,
    longitude: 30.9694,
    aliases: ["nelspruit"],
  },
  {
    name: "Polokwane",
    province: "Limpopo",
    latitude: -23.9045,
    longitude: 29.4689,
    aliases: ["pietersburg"],
  },
  { name: "Rustenburg", province: "North West", latitude: -25.6672, longitude: 27.2424 },
  {
    name: "Potchefstroom",
    province: "North West",
    latitude: -26.7145,
    longitude: 27.0977,
    aliases: ["potch"],
  },
  { name: "Kimberley", province: "Northern Cape", latitude: -28.7282, longitude: 24.7499 },
] as const;

export const BODY_TYPES = [
  {
    name: "Bakkie",
    aliases: ["pickup", "pick-up", "ute", "double cab", "single cab", "lorrie"],
    sortOrder: 1,
  },
  { name: "SUV", aliases: ["4x4", "crossover", "suv"], sortOrder: 2 },
  { name: "Hatchback", aliases: ["hatch"], sortOrder: 3 },
  { name: "Sedan", aliases: ["saloon"], sortOrder: 4 },
  { name: "Station Wagon", aliases: ["estate", "wagon", "touring", "sportbrake"], sortOrder: 5 },
  { name: "MPV", aliases: ["combi", "kombi", "people carrier", "minivan", "mpv"], sortOrder: 6 },
  { name: "Coupe", aliases: ["coupé", "2 door"], sortOrder: 7 },
  { name: "Convertible", aliases: ["cabriolet", "cabrio", "roadster", "soft top"], sortOrder: 8 },
  { name: "Panel Van", aliases: ["van", "panelvan"], sortOrder: 9 },
] as const;

export const FUEL_TYPES = [
  { name: "Petrol", aliases: ["gasoline", "unleaded"], sortOrder: 1 },
  { name: "Diesel", aliases: ["tdi", "crdi", "gd-6", "d-4d"], sortOrder: 2 },
  { name: "Hybrid", aliases: ["hev", "self-charging hybrid"], sortOrder: 3 },
  { name: "Plug-in Hybrid", aliases: ["phev"], sortOrder: 4 },
  { name: "Electric", aliases: ["ev", "battery electric", "bev"], sortOrder: 5 },
] as const;

export const TRANSMISSIONS = [
  { name: "Manual", aliases: ["stick", "mt", "5-speed", "6-speed manual"], sortOrder: 1 },
  { name: "Automatic", aliases: ["auto", "at", "tiptronic", "steptronic"], sortOrder: 2 },
  { name: "Dual Clutch", aliases: ["dsg", "dct", "pdk", "powershift", "s tronic"], sortOrder: 3 },
  { name: "CVT", aliases: ["continuously variable", "xtronic"], sortOrder: 4 },
] as const;

export const DRIVETRAINS = [
  { name: "Front Wheel Drive", aliases: ["fwd", "2x4 front"], sortOrder: 1 },
  { name: "Rear Wheel Drive", aliases: ["rwd", "4x2"], sortOrder: 2 },
  {
    name: "All Wheel Drive",
    aliases: ["awd", "quattro", "4motion", "xdrive", "4matic"],
    sortOrder: 3,
  },
  { name: "Four Wheel Drive", aliases: ["4x4", "4wd", "part-time 4wd"], sortOrder: 4 },
] as const;

export const COLOURS = [
  { name: "Glacier White", family: "white", swatch: "#F4F5F7" },
  { name: "Pearl White", family: "white", swatch: "#F0F0EC" },
  { name: "Silver", family: "silver", swatch: "#C4C7CC" },
  { name: "Platinum Silver", family: "silver", swatch: "#B6BABF" },
  { name: "Graphite Grey", family: "grey", swatch: "#5A5E63" },
  { name: "Titanium Grey", family: "grey", swatch: "#7A7E84" },
  { name: "Midnight Black", family: "black", swatch: "#141518" },
  { name: "Panther Black", family: "black", swatch: "#1B1C1F" },
  { name: "Deep Sea Blue", family: "blue", swatch: "#1F3A5F" },
  { name: "Aegean Blue", family: "blue", swatch: "#2C5C8A" },
  { name: "Chilli Red", family: "red", swatch: "#B4232C" },
  { name: "Emotion Red", family: "red", swatch: "#C0242E" },
  { name: "Racing Green", family: "green", swatch: "#1E3B2A" },
  { name: "Sandstone Beige", family: "beige", swatch: "#C9BBA3" },
  { name: "Bronze", family: "brown", swatch: "#6E4B32" },
  { name: "Solar Orange", family: "orange", swatch: "#D2622A" },
] as const;

export const FEATURE_CATEGORIES = [
  { name: "Safety", sortOrder: 1 },
  { name: "Comfort and convenience", sortOrder: 2 },
  { name: "Infotainment", sortOrder: 3 },
  { name: "Exterior", sortOrder: 4 },
  { name: "Driver assistance", sortOrder: 5 },
  { name: "Off-road", sortOrder: 6 },
] as const;

export const FEATURES = [
  { name: "ABS with EBD", category: "Safety" },
  { name: "Electronic stability control", category: "Safety", aliases: ["esp", "esc", "vsc"] },
  { name: "Driver and passenger airbags", category: "Safety" },
  { name: "Side and curtain airbags", category: "Safety" },
  { name: "ISOFIX child seat anchors", category: "Safety", aliases: ["isofix"] },
  { name: "Tyre pressure monitoring", category: "Safety", aliases: ["tpms"] },

  { name: "Climate control", category: "Comfort and convenience", isHighlight: true },
  { name: "Dual-zone climate control", category: "Comfort and convenience" },
  { name: "Leather upholstery", category: "Comfort and convenience", isHighlight: true },
  { name: "Heated front seats", category: "Comfort and convenience" },
  { name: "Electric driver seat", category: "Comfort and convenience" },
  { name: "Keyless entry and start", category: "Comfort and convenience", isHighlight: true },
  { name: "Cruise control", category: "Comfort and convenience" },
  { name: "Electric windows all round", category: "Comfort and convenience" },

  { name: "Touchscreen infotainment", category: "Infotainment", isHighlight: true },
  {
    name: "Apple CarPlay and Android Auto",
    category: "Infotainment",
    isHighlight: true,
    aliases: ["carplay", "android auto"],
  },
  { name: "Bluetooth", category: "Infotainment" },
  { name: "Premium sound system", category: "Infotainment" },
  { name: "Wireless phone charging", category: "Infotainment" },

  { name: "Alloy wheels", category: "Exterior" },
  { name: "LED headlights", category: "Exterior", isHighlight: true },
  { name: "Tow bar", category: "Exterior", aliases: ["towbar", "tow hitch"] },
  { name: "Roof rails", category: "Exterior" },
  { name: "Sunroof", category: "Exterior", isHighlight: true },
  { name: "Canopy", category: "Exterior", aliases: ["canopy", "hardtop"] },
  { name: "Roll bar", category: "Exterior", aliases: ["rollbar", "sports bar"] },

  { name: "Reverse camera", category: "Driver assistance", isHighlight: true },
  {
    name: "Park distance control",
    category: "Driver assistance",
    aliases: ["pdc", "parking sensors"],
  },
  { name: "360 degree camera", category: "Driver assistance" },
  { name: "Blind spot monitoring", category: "Driver assistance" },
  { name: "Lane keep assist", category: "Driver assistance" },
  { name: "Adaptive cruise control", category: "Driver assistance" },

  { name: "Differential lock", category: "Off-road", aliases: ["diff lock", "rear diff lock"] },
  { name: "Low range transfer case", category: "Off-road", aliases: ["low range"] },
  { name: "Hill descent control", category: "Off-road" },
  { name: "Underbody protection", category: "Off-road", aliases: ["sump guard", "skid plate"] },
] as const;

export const ACCREDITATIONS = [
  { name: "RMI member", aliases: ["retail motor industry"] },
  { name: "NADA member", aliases: ["national automobile dealers association"] },
  { name: "MIWA accredited", aliases: ["motor industry workshop association"] },
  { name: "SAMBRA approved", aliases: ["south african motor body repairers association"] },
] as const;
