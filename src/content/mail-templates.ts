/**
 * The Mailer's ready-made emails to dealerships. Staff pick one, change what they like, and send.
 * Saved templates (Admin > Email templates) sit beside these, for anything sent often.
 *
 * Written in Rynet's plain voice: what it is, what it means for them, one thing to do. No claims
 * Rynet cannot back (no buyer numbers, no "leading", no results), because these go to the people
 * whose trust the whole marketplace depends on.
 */

export type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export const BUILT_IN_TEMPLATES: MailTemplate[] = [
  {
    id: "built-in-portal",
    name: "Your dealership has its own portal",
    subject: "{{dealership}}: your own place on Rynet",
    body: `Hi {{firstName}},

{{dealership}} now has its own portal on Rynet. In it you can:

- see every enquiry about your cars, and answer it on WhatsApp in one tap
- mark a car sold or reserved, and the site changes straight away
- make ready-to-post ads of any of your cars
- post them straight to your Facebook Page and Instagram

Cars you have live on Rynet right now: {{liveCars}}. If you do not have a login yet, reply to this email and we will send you one.`,
    buttonLabel: "Open your portal",
    buttonUrl: "{{portalUrl}}",
  },
  {
    id: "built-in-social",
    name: "Post your cars to Facebook and Instagram",
    subject: "Post your cars to Facebook from Rynet",
    body: `Hi {{firstName}},

You can now connect {{dealership}}'s Facebook Page to Rynet. Once it is connected:

- **Post when you choose.** Pick a car in Ads, check the words, press Post now.
- **Or let Rynet do it.** Each new car is posted with its photo and price as it goes live, at most three a day so your followers are not flooded.

Rynet only ever posts. It never reads your messages, and you can disconnect at any time.`,
    buttonLabel: "Connect your Page",
    buttonUrl: "{{portalUrl}}",
  },
  {
    id: "built-in-enquiries",
    name: "Enquiries waiting",
    subject: "Buyers are waiting to hear from {{dealership}}",
    body: `Hi {{firstName}},

Enquiries about your cars on Rynet that have not been answered yet: **{{newEnquiries}}**. A quick reply usually wins the sale, and each one opens WhatsApp with a first line already written.`,
    buttonLabel: "See your enquiries",
    buttonUrl: "{{portalUrl}}",
  },
  {
    id: "built-in-stock",
    name: "Check your stock is right",
    subject: "Is everything on {{dealership}}'s showroom still for sale?",
    body: `Hi {{firstName}},

A quick check. Cars you have live on Rynet: {{liveCars}}. If any have sold or been reserved, mark them in your portal so buyers are not asking about a car you no longer have.`,
    buttonLabel: "Check your cars",
    buttonUrl: "{{portalUrl}}",
  },
  {
    id: "built-in-blank",
    name: "Start from nothing",
    subject: "",
    body: `Hi {{firstName}},

`,
  },
];
