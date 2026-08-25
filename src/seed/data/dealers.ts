/**
 * Demonstration dealerships.
 *
 * EVERY ONE OF THESE IS INVENTED. They are not real businesses, and the names were chosen
 * to be plainly generic rather than to resemble any actual dealership. Each is flagged
 * `isDemonstration: true`, which surfaces a "Demonstration listing" label everywhere the
 * dealership or its stock appears on the public site.
 *
 * That flag is not decoration. Putting invented dealerships on a live site without labelling
 * them, on a platform whose entire promise is "only verified real dealerships", would be the
 * exact thing the product exists to prevent.
 *
 * The addresses are real streets in real suburbs so the geocoding, the province and city
 * facets, and the radius search all exercise properly. The phone numbers use the 08600
 * non-geographic range so none of them can ring an actual person.
 *
 * Everything here is listed in docs/CONTENT-NEEDED.md for replacement with real signed
 * dealerships before launch.
 */

export type BranchSeed = {
  name: string;
  addressLine1: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  isPrimary?: boolean;
};

export type DealerSeed = {
  tradingName: string;
  legalName: string;
  slug: string;
  foundedYear: number;
  about: string;
  franchises: string[];
  accreditations: string[];
  plan: string;
  principalName: string;
  branches: BranchSeed[];
  /** Which makes this dealership stocks. Drives the generated inventory. */
  stockMakes: string[];
  /**
   * Body types this dealership actually trades in.
   *
   * Without this the generator gave Durban Bakkie Centre a floor of Starlets and Land
   * Cruisers, because those makes happen to have hatchback and SUV variants. A dealership
   * whose name says bakkies selling hatchbacks is the sort of detail that makes a person
   * stop trusting everything else on the page.
   *
   * Omit it for a general dealership, which then gets the market-shaped mix.
   */
  bodyFocus?: string[];
  stockCount: number;
};

export const DEALERS: DealerSeed[] = [
  {
    tradingName: "Highveld Motor Group",
    legalName: "Highveld Motor Group (Pty) Ltd",
    slug: "highveld-motor-group",
    foundedYear: 2004,
    about:
      "A three-branch group across Pretoria and Centurion, trading mainly in Toyota and Volkswagen. Most of the stock is one-owner and comes in on trade against new units, so the service history is usually complete and the books are usually there.",
    franchises: ["Toyota", "Volkswagen"],
    accreditations: ["RMI member", "NADA member"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["Toyota", "Volkswagen"],
    stockCount: 34,
    branches: [
      {
        name: "Menlyn",
        addressLine1: "254 Garsfontein Road",
        suburb: "Menlyn",
        city: "Pretoria",
        province: "Gauteng",
        postalCode: "0181",
        latitude: -25.7847,
        longitude: 28.2769,
        phone: "086 000 0101",
        isPrimary: true,
      },
      {
        name: "Centurion",
        addressLine1: "1122 Lenchen Avenue North",
        suburb: "Centurion Central",
        city: "Centurion",
        province: "Gauteng",
        postalCode: "0157",
        latitude: -25.8603,
        longitude: 28.1894,
        phone: "086 000 0102",
      },
    ],
  },
  {
    tradingName: "Cape Peninsula Auto",
    legalName: "Cape Peninsula Auto (Pty) Ltd",
    slug: "cape-peninsula-auto",
    foundedYear: 2011,
    about:
      "Independent used-car dealership in Bellville, buying and selling across the Peninsula. Strong on hatchbacks and small SUVs, which is what moves in this market. Everything goes over a pit before it goes on the floor.",
    franchises: [],
    accreditations: ["RMI member", "MIWA accredited"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["Volkswagen", "Hyundai", "Suzuki", "Kia"],
    bodyFocus: ["Hatchback", "SUV"],
    stockCount: 28,
    branches: [
      {
        name: "Bellville",
        addressLine1: "18 Voortrekker Road",
        suburb: "Bellville",
        city: "Bellville",
        province: "Western Cape",
        postalCode: "7530",
        latitude: -33.8903,
        longitude: 18.6292,
        phone: "086 000 0201",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Durban Bakkie Centre",
    legalName: "Durban Bakkie Centre CC",
    slug: "durban-bakkie-centre",
    foundedYear: 1998,
    about:
      "Bakkies, and not much else. Double cabs, single cabs, 4x2 and 4x4, mostly ex-fleet and ex-farm. If it has a load bin they will look at it, and they will tell you straight whether it has worked hard.",
    franchises: [],
    accreditations: ["RMI member"],
    plan: "professional",
    principalName: "Demonstration Principal",
    stockMakes: ["Toyota", "Ford", "Isuzu", "Nissan", "Mahindra"],
    bodyFocus: ["Bakkie"],
    stockCount: 31,
    branches: [
      {
        name: "Pinetown",
        addressLine1: "42 Josiah Gumede Road",
        suburb: "Pinetown Central",
        city: "Pinetown",
        province: "KwaZulu-Natal",
        postalCode: "3610",
        latitude: -29.8155,
        longitude: 30.8583,
        phone: "086 000 0301",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Sandton Prestige Cars",
    legalName: "Sandton Prestige Cars (Pty) Ltd",
    slug: "sandton-prestige-cars",
    foundedYear: 2015,
    about:
      "German premium, mostly under five years old and under 80 000km. Low volume, high spec. Every car comes with the full service history and a report from an independent workshop, and they will send you both before you drive out.",
    franchises: ["BMW", "Mercedes-Benz", "Audi"],
    accreditations: ["RMI member", "NADA member"],
    plan: "enterprise",
    principalName: "Demonstration Principal",
    stockMakes: ["BMW", "Mercedes-Benz", "Audi"],
    bodyFocus: ["Sedan", "SUV", "Hatchback"],
    stockCount: 22,
    branches: [
      {
        name: "Sandton",
        addressLine1: "9 Fredman Drive",
        suburb: "Sandown",
        city: "Sandton",
        province: "Gauteng",
        postalCode: "2196",
        latitude: -26.1076,
        longitude: 28.0567,
        phone: "086 000 0401",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Garden Route Motors",
    legalName: "Garden Route Motors (Pty) Ltd",
    slug: "garden-route-motors",
    foundedYear: 2008,
    about:
      "George-based, serving the Garden Route from Mossel Bay to Plettenberg Bay. Family owned, two branches, and they will deliver anywhere in the Western Cape on their own truck rather than putting your car on a transporter.",
    franchises: ["Hyundai", "Kia"],
    accreditations: ["RMI member"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["Hyundai", "Kia", "Toyota", "Renault"],
    stockCount: 26,
    branches: [
      {
        name: "George",
        addressLine1: "112 York Street",
        suburb: "George Central",
        city: "George",
        province: "Western Cape",
        postalCode: "6529",
        latitude: -33.963,
        longitude: 22.4617,
        phone: "086 000 0501",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "East Rand Value Cars",
    legalName: "East Rand Value Cars CC",
    slug: "east-rand-value-cars",
    foundedYear: 2013,
    about:
      "Entry-level and first-car stock on the East Rand. Nothing over R 350 000, most of it under R 250 000, and they work with the banks on affordability rather than pushing you into a balloon you cannot carry.",
    franchises: [],
    accreditations: ["RMI member"],
    plan: "professional",
    principalName: "Demonstration Principal",
    stockMakes: ["Volkswagen", "Suzuki", "Hyundai", "Renault", "Nissan"],
    bodyFocus: ["Hatchback", "SUV"],
    stockCount: 29,
    branches: [
      {
        name: "Boksburg",
        addressLine1: "76 Trichardts Road",
        suburb: "Beyers Park",
        city: "Boksburg",
        province: "Gauteng",
        postalCode: "1459",
        latitude: -26.2124,
        longitude: 28.2624,
        phone: "086 000 0601",
        isPrimary: true,
      },
      {
        name: "Benoni",
        addressLine1: "31 Elston Avenue",
        suburb: "Benoni Central",
        city: "Benoni",
        province: "Gauteng",
        postalCode: "1501",
        latitude: -26.1885,
        longitude: 28.3208,
        phone: "086 000 0602",
      },
    ],
  },
  {
    tradingName: "Bay Auto Traders",
    legalName: "Bay Auto Traders (Pty) Ltd",
    slug: "bay-auto-traders",
    foundedYear: 2006,
    about:
      "Gqeberha independent with a workshop on site. Mixed stock, family cars and bakkies, and they do their own reconditioning rather than sending it out, which is why their turnaround on a trade-in is a week rather than a month.",
    franchises: [],
    accreditations: ["RMI member", "MIWA accredited", "SAMBRA approved"],
    plan: "professional",
    principalName: "Demonstration Principal",
    stockMakes: ["Toyota", "Ford", "Volkswagen", "Isuzu"],
    stockCount: 24,
    branches: [
      {
        name: "Gqeberha",
        addressLine1: "204 Cape Road",
        suburb: "Mill Park",
        city: "Gqeberha",
        province: "Eastern Cape",
        postalCode: "6001",
        latitude: -33.9608,
        longitude: 25.6022,
        phone: "086 000 0701",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Umhlanga Auto Boutique",
    legalName: "Umhlanga Auto Boutique (Pty) Ltd",
    slug: "umhlanga-auto-boutique",
    foundedYear: 2018,
    about:
      "Small, curated floor in Umhlanga Ridge. Around twenty units at a time, chosen rather than bought at auction. Appointment-based viewing, which suits the stock and suits the buyer who does not want to spend a Saturday on a forecourt.",
    franchises: ["BMW", "Volkswagen"],
    accreditations: ["RMI member"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["BMW", "Volkswagen", "Audi", "Mercedes-Benz"],
    stockCount: 18,
    branches: [
      {
        name: "Umhlanga Ridge",
        addressLine1: "5 Ncondo Place",
        suburb: "Umhlanga Ridge",
        city: "Umhlanga",
        province: "KwaZulu-Natal",
        postalCode: "4319",
        latitude: -29.7275,
        longitude: 31.0846,
        phone: "086 000 0801",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Free State Family Cars",
    legalName: "Free State Family Cars CC",
    slug: "free-state-family-cars",
    foundedYear: 2001,
    about:
      "Bloemfontein dealership trading across the Free State and Northern Cape. Seven-seaters, bakkies and anything that will do 300km of gravel without complaining. They know what the farm roads do to a vehicle and they price accordingly.",
    franchises: [],
    accreditations: ["RMI member"],
    plan: "professional",
    principalName: "Demonstration Principal",
    stockMakes: ["Toyota", "Isuzu", "Mahindra", "Ford"],
    bodyFocus: ["Bakkie", "SUV"],
    stockCount: 25,
    branches: [
      {
        name: "Bloemfontein",
        addressLine1: "88 Zastron Street",
        suburb: "Westdene",
        city: "Bloemfontein",
        province: "Free State",
        postalCode: "9301",
        latitude: -29.0852,
        longitude: 26.1596,
        phone: "086 000 0901",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Lowveld Vehicle Sales",
    legalName: "Lowveld Vehicle Sales (Pty) Ltd",
    slug: "lowveld-vehicle-sales",
    foundedYear: 2010,
    about:
      "Mbombela-based, serving the Lowveld and the Kruger gateway towns. Heavy on 4x4 and towing-capable stock, because that is what the area buys. Tow bars fitted and rated on site.",
    franchises: ["Toyota"],
    accreditations: ["RMI member", "MIWA accredited"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["Toyota", "Ford", "Isuzu", "Suzuki"],
    bodyFocus: ["Bakkie", "SUV"],
    stockCount: 23,
    branches: [
      {
        name: "Mbombela",
        addressLine1: "17 Samora Machel Drive",
        suburb: "Nelspruit Central",
        city: "Mbombela",
        province: "Mpumalanga",
        postalCode: "1200",
        latitude: -25.4753,
        longitude: 30.9694,
        phone: "086 000 1001",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Platinum Belt Motors",
    legalName: "Platinum Belt Motors (Pty) Ltd",
    slug: "platinum-belt-motors",
    foundedYear: 2014,
    about:
      "Rustenburg dealership working mainly with mine employees, so they understand payroll deduction and the paperwork that goes with it. Mixed stock, strong on double cabs and reliable commuters.",
    franchises: ["Haval", "Chery"],
    accreditations: ["RMI member"],
    plan: "professional",
    principalName: "Demonstration Principal",
    stockMakes: ["Haval", "Chery", "Toyota", "Nissan"],
    stockCount: 27,
    branches: [
      {
        name: "Rustenburg",
        addressLine1: "45 Nelson Mandela Drive",
        suburb: "Rustenburg Central",
        city: "Rustenburg",
        province: "North West",
        postalCode: "0299",
        latitude: -25.6672,
        longitude: 27.2424,
        phone: "086 000 1101",
        isPrimary: true,
      },
    ],
  },
  {
    tradingName: "Winelands Auto",
    legalName: "Winelands Auto (Pty) Ltd",
    slug: "winelands-auto",
    foundedYear: 2009,
    about:
      "Paarl and Stellenbosch, trading mostly in low-mileage local cars. A lot of their stock comes from one-owner sales in the area, so the histories are clean and traceable, and they will show you the previous owner's service invoices.",
    franchises: ["Volkswagen", "Audi"],
    accreditations: ["RMI member", "NADA member"],
    plan: "growth",
    principalName: "Demonstration Principal",
    stockMakes: ["Volkswagen", "Audi", "Toyota", "Suzuki"],
    stockCount: 24,
    branches: [
      {
        name: "Paarl",
        addressLine1: "203 Main Road",
        suburb: "Paarl Central",
        city: "Paarl",
        province: "Western Cape",
        postalCode: "7646",
        latitude: -33.7274,
        longitude: 18.9558,
        phone: "086 000 1201",
        isPrimary: true,
      },
      {
        name: "Stellenbosch",
        addressLine1: "12 Bird Street",
        suburb: "Stellenbosch Central",
        city: "Stellenbosch",
        province: "Western Cape",
        postalCode: "7600",
        latitude: -33.9321,
        longitude: 18.8602,
        phone: "086 000 1202",
      },
    ],
  },
];

export const PLANS = [
  {
    name: "Starter",
    slug: "starter",
    monthlyPrice: 1500,
    listingLimit: 25,
    branchLimit: 1,
    userLimit: 3,
    allowsMicrositeTheming: false,
    allowsFeedImport: false,
    summary: "For a single floor getting its stock online properly for the first time.",
    features: [
      "Up to 25 live listings",
      "One branch",
      "Three user accounts",
      "Lead inbox and email routing",
    ],
  },
  {
    name: "Professional",
    slug: "professional",
    monthlyPrice: 3500,
    listingLimit: 75,
    branchLimit: 2,
    userLimit: 8,
    allowsMicrositeTheming: false,
    allowsFeedImport: true,
    summary: "For an established independent running real volume across one or two branches.",
    features: [
      "Up to 75 live listings",
      "Two branches",
      "Eight user accounts",
      "Scheduled stock feed import",
      "Lead pipeline and response reporting",
    ],
  },
  {
    name: "Growth",
    slug: "growth",
    monthlyPrice: 6500,
    listingLimit: 200,
    branchLimit: 5,
    userLimit: 20,
    allowsMicrositeTheming: true,
    allowsFeedImport: true,
    summary: "For a multi-branch dealership that wants its own branded presence on the platform.",
    features: [
      "Up to 200 live listings",
      "Five branches",
      "Twenty user accounts",
      "Branded microsite with your own colours",
      "Scheduled stock feed import",
      "Per-branch reporting",
    ],
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyPrice: 12500,
    listingLimit: 1000,
    branchLimit: 25,
    userLimit: 100,
    allowsMicrositeTheming: true,
    allowsFeedImport: true,
    summary: "For a dealer group. Priced per group rather than per floor.",
    features: [
      "Unlimited practical listing volume",
      "Up to 25 branches",
      "Group-level reporting across every floor",
      "Branded microsite per dealership",
      "Priority placement in search",
      "Named account manager at Rynet Digital",
    ],
  },
] as const;
