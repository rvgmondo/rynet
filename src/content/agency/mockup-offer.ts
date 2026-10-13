/**
 * The free mockup: Rynet Digital's way in, written once.
 *
 * A dealership tells us who it is, and we send back a private preview of a new homepage built
 * from its own stock, photographs and brand. It is the agency's no-brainer in the same way free
 * listing is the marketplace's: the dealer risks nothing, and sees the work before any
 * conversation about money. A mockup sent unasked has already turned a dealership into a request
 * for a quote; this lets a dealer ask for one themselves.
 *
 * THE TURNAROUND IS A PROMISE. "Two working days" is printed on the page and in the confirmation,
 * so it must be one the team can keep. Change it here if it cannot.
 *
 * Every mockup is a real design for that dealership, never a template with their logo swapped in.
 * The page says so, so it has to stay true.
 */

export const MOCKUP_OFFER = {
  turnaround: "two working days",
  headline: "See your new website before you spend a cent",
  promise:
    "Tell us your dealership. We design a new homepage for it, from your own stock, photographs and brand, and send you a private link to see it. Free, and you owe us nothing.",
} as const;

export const MOCKUP_CTA = {
  href: "/digital/free-mockup",
  label: "Get a free mockup",
  short: "Free mockup",
} as const;

export const MOCKUP_STEPS = [
  {
    title: "Tell us who you are",
    body: "Your dealership and your website, if you have one. Under a minute.",
  },
  {
    title: "We design your homepage",
    body: `A real design for your dealership, from your own cars and photographs. Within ${MOCKUP_OFFER.turnaround}.`,
  },
  {
    title: "You get a private link",
    body: "Open it on your phone and your laptop. Only you have it, and search engines never see it.",
  },
] as const;

export const MOCKUP_GETS = [
  "Your homepage, designed for your dealership rather than filled into a template",
  "Your own cars, prices and photographs in it, not stock images",
  "Built for a buyer's phone first, because that is where your buyers are",
  "A private link only you have, kept out of search engines",
  "No cost and no obligation, whatever you think of it",
] as const;

export const MOCKUP_FAQS = [
  {
    question: "Is it really free?",
    answer:
      "Yes. There is nothing to sign and nothing to pay, and you do not have to talk to us afterwards if you would rather not.",
  },
  {
    question: "Why would you do that?",
    answer:
      "Because a dealership can judge a website it can see far better than a proposal it has to imagine. If you like it, we quote for building the whole site. If you do not, it cost you a minute.",
  },
  {
    question: "What do you need from me?",
    answer:
      "Your dealership's name and your website, if you have one. We work from what you already publish. If you have no website, tell us where your stock is listed and we work from that.",
  },
  {
    question: "Who else sees it?",
    answer:
      "Nobody. The link is private, it is hidden from search engines, and we never show your mockup to another dealership.",
  },
  {
    question: "What happens if I like it?",
    answer:
      "We quote for the full site in writing. You own everything we build: the code, the domain and the accounts.",
  },
] as const;
