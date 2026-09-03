import type { LucideIcon } from "lucide-react";
import { BarChart3, Camera, Globe, Megaphone, RefreshCw, Search, Workflow } from "lucide-react";

/**
 * Rynet Digital's seven services.
 *
 * Content, not chrome, so it lives here rather than in a page component. One template
 * renders all seven, which is the difference between seven pages that stay consistent and
 * seven that drift apart the first time one of them is edited in a hurry.
 *
 * Three rules the copy follows, and they are the brief's rules rather than mine.
 *
 * 1. **No numbers we have not measured.** There is not a single percentage, multiple or
 *    "average uplift" anywhere in this file. Rynet Digital has no clients yet, so any figure
 *    here would be invented, and an invented number on an agency site is the fastest way to
 *    lose the one dealer who checks.
 *
 * 2. **Specific enough to be wrong.** Every service names what actually gets done, in terms
 *    a dealer principal can check. "We optimise your digital presence" commits to nothing and
 *    so proves nothing.
 *
 * 3. **It says what we do not do.** A services page that only lists reassurances reads as a
 *    brochure. `notThis` is the part a buyer actually trusts.
 *
 * Every claim here is about method. The only results claimed anywhere on this site are
 * Rynet Showroom's own, because that is the one build we can show.
 */

export type Service = {
  slug: string;
  Icon: LucideIcon;
  /** Nav and card label. Short. */
  name: string;
  /** The page's h1. Says the outcome, not the category. */
  title: string;
  /** One sentence, used as the meta description and the page intro. */
  summary: string;
  /** The problem, in a dealer's words rather than an agency's. */
  problem: string;
  /** What is actually delivered. Each one checkable. */
  includes: readonly string[];
  /** Where the line is. */
  notThis: readonly string[];
  /** What a dealer walks away with. */
  outcome: string;
};

export const SERVICES: readonly Service[] = [
  {
    slug: "dealership-websites",
    Icon: Globe,
    name: "Dealership websites",
    title: "A dealership website that loads on a phone in a parking lot",
    summary:
      "A fast, accessible dealership site with your stock on it, built to be found and built to be used on the connection your buyers actually have.",
    problem:
      "Most dealership sites in South Africa are a template with a stock feed bolted on. They take eight seconds to load on 4G, the search filters do not survive a back button, and the phone number is an image. The buyer leaves before they ever see a car.",
    includes: [
      "A build measured on a mid-range Android over a throttled connection, because that is what your buyers are holding, not a laptop on fibre",
      "Your stock, searchable by the things people actually search by: price, monthly instalment, area, body type, transmission",
      "Every filter in the URL, so a search can be sent to a spouse or opened again tomorrow",
      "WCAG 2.2 AA, tested with automated checks on every change rather than audited once at the end",
      "Structured data for vehicles and for the dealership, so listings and your branch details are eligible for the richer result",
      "You own the code and the domain. If you leave, you take the site",
    ],
    notThis: [
      "We do not resell a licensed template with your logo dropped into it",
      "We do not lock the site to a monthly fee that stops it working when you stop paying",
      "We do not fit an accessibility overlay widget. They do not fix the underlying problems and they frequently make things worse. We fix the site",
    ],
    outcome:
      "A site that is quick on a phone, that a buyer can search without frustration, and that Google can read properly.",
  },
  {
    slug: "stock-feeds-and-inventory",
    Icon: RefreshCw,
    name: "Stock feeds",
    title: "Your stock, correct everywhere, without anyone retyping it",
    summary:
      "Getting your DMS stock onto your site and onto the portals, mapped properly, with the errors surfaced instead of swallowed.",
    problem:
      "There is no common stock feed standard in South Africa. Every DMS exports something different, and the usual result is a car that sold on Tuesday still live on Friday, a price that is right in one place and wrong in another, and photos that arrive in the wrong order.",
    includes: [
      "A mapping from your DMS export to the fields each destination needs, written for your feed rather than a generic one",
      "A dry run before anything goes live, showing exactly what would be created, changed and removed",
      "Errors surfaced per row with the reason, not a job that fails silently and leaves you to notice",
      "Sold detection, so a car that leaves your floor leaves your site",
      "Scheduled syncs with a record of what changed and when",
      "A rollback path, because the first import is never the last one",
    ],
    notThis: [
      "We do not promise an integration with a DMS before we have seen its actual export",
      "We do not build a one-way import you cannot audit or undo",
    ],
    outcome: "One place where stock is true, and every other place following it within the hour.",
  },
  {
    slug: "paid-media",
    Icon: Megaphone,
    name: "Paid media",
    title: "Advertising spend you can trace to a test drive",
    summary:
      "Google and Meta campaigns built around the stock you actually want to move, reported against leads rather than impressions.",
    problem:
      "Most dealership ad reporting stops at the click. You are shown a cost per click and an impression share, and neither answers the only question that matters, which is how many people walked in.",
    includes: [
      "Campaigns built from your live stock, so you are not paying to advertise a car that sold",
      "Ageing stock prioritised, because a unit sitting at ninety days costs you more than the ad spend",
      "Landing on the vehicle, not the home page",
      "Lead tracking end to end, from the click through to the enquiry in your inbox",
      "Reporting in cost per lead and cost per test drive booked, with the arithmetic shown",
      "Spend and results split by branch where you have more than one",
    ],
    notThis: [
      "We do not report impressions and reach as though they were results",
      "We do not take a percentage of spend, because that pays us to spend more rather than to spend well",
      "We do not run campaigns whose results we cannot attribute",
    ],
    outcome:
      "A number you can defend at a management meeting: what you spent, what came back, on which cars.",
  },
  {
    slug: "seo-and-local-search",
    Icon: Search,
    name: "SEO and local search",
    title: "Found by the people already looking for what is on your floor",
    summary:
      "Technical and local search work aimed at the searches that end in a visit, with the trade-offs written down.",
    problem:
      "A dealership competes with the national portals for every model query and will usually lose. It does not have to lose the local ones, and those are the searches that end at your gate.",
    includes: [
      "Technical audit of what is actually blocking indexing, in priority order with effort against impact",
      "Model and area landing pages that answer a real search rather than repeating a keyword",
      "Google Business Profile per branch, with hours, photos and the review flow set up properly",
      "Structured data so vehicles, the dealership and its branches are legible to a search engine",
      "A crawl budget policy, so thousands of filter permutations do not get indexed and dilute the pages that matter",
      "Reporting against the queries that convert, not total impressions",
    ],
    notThis: [
      "We do not guarantee a position. Nobody can, and anyone who does is either guessing or lying",
      "We do not buy links",
      "We do not publish filler articles to hit a word count",
    ],
    outcome:
      "The searches near you, answered by your pages, and a plan you can read for the ones you cannot win yet.",
  },
  {
    slug: "photography-and-video",
    Icon: Camera,
    name: "Photography and video",
    title: "Photographs that look like the car, taken at your speed",
    summary:
      "A repeatable process your own staff can run, so a car that lands on Monday is online properly on Monday.",
    problem:
      "The single biggest reason a listing gets skipped is the photographs. Six pictures taken on a phone in a shaded corner, no interior, no dashboard, no odometer. The dealer who shoots properly gets the enquiry.",
    includes: [
      "A shot list per vehicle covering the angles buyers actually look for, including the odometer and the interior",
      "A backdrop and lighting setup that works in your yard, with what to buy and where to stand",
      "Training for the person who will actually take the photographs, because a photographer you have to book is a photographer you will stop booking",
      "Automatic processing: crop, straighten, compress, and generate the sizes the site needs",
      "Alt text generated from the vehicle details and editable per image, so listings are usable by someone on a screen reader",
      "Walkaround video for the units you want to move",
    ],
    notThis: [
      "We do not retouch a car into a condition it is not in. That is a complaint waiting to happen",
      "We do not composite a studio background onto a vehicle without saying so",
    ],
    outcome:
      "Every car on your floor photographed the same way, to the same standard, within a day of arriving.",
  },
  {
    slug: "crm-and-lead-routing",
    Icon: Workflow,
    name: "CRM and lead routing",
    title: "The lead reaches a person before it goes cold",
    summary:
      "Enquiries from every source in one inbox, routed to the right salesperson, with a timer on the response.",
    problem:
      "Leads arrive by email, WhatsApp, the portals and the website, and each one lands somewhere different. The car buyer who waited two hours has already phoned someone else.",
    includes: [
      "Every source into one inbox: your site, the portals, WhatsApp, phone",
      "Routing by branch, by make, or by whoever is on the floor",
      "A response timer per lead, and a visible queue of the ones that have been waiting",
      "Duplicate detection, so the same buyer enquiring on three cars is one conversation",
      "POPIA consent captured and recorded with the lead, word for word, with the date and the policy version",
      "Reporting on response time and on what happened to the lead, by salesperson and by branch",
    ],
    notThis: [
      "We do not sell you a CRM licence you do not need if the one you have can be made to work",
      "We do not set up automated replies that pretend to be a person",
    ],
    outcome: "Nothing sits unanswered, and you can see who answered what, how fast.",
  },
  {
    slug: "reporting",
    Icon: BarChart3,
    name: "Reporting",
    title: "One page a month that a principal can act on",
    summary:
      "Reporting that answers what sold, what did not, what it cost to get each lead, and what to do next.",
    problem:
      "Agency reporting is usually a forty page export of everything the platform can measure, which is a way of appearing thorough without ever saying anything. Nobody reads it, and nobody changes anything because of it.",
    includes: [
      "One page: spend, leads, cost per lead, and which stock moved",
      "Stock ageing, so the units that are costing you money are visible",
      "Lead source attribution that survives the buyer switching device",
      "Branch by branch where it applies",
      "A short written recommendation each month, and what we got wrong last month",
      "The underlying data available in full if you want it, rather than instead of the summary",
    ],
    notThis: [
      "We do not report on metrics that cannot change a decision",
      "We do not quietly drop a number that went the wrong way",
    ],
    outcome: "A monthly page you can read in five minutes and act on in ten.",
  },
] as const;

export const serviceBySlug = (slug: string): Service | undefined =>
  SERVICES.find((service) => service.slug === slug);
