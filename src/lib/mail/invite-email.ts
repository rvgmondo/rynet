import { renderEmail } from "@/lib/mail/layout";
import { firstNameOf, MONTHLY_REPORT_LINE } from "@/lib/onboarding/whatsapp";
import { INVITE_DAYS } from "@/lib/portal/invite-message";

/** The portal invite as an email, for a dealership that would rather have it there than on WhatsApp. */
export function inviteEmail(options: { name: string; tradingName: string; link: string }) {
  const first = firstNameOf(options.name);
  const { html, text } = renderEmail({
    preheader: `Choose a password for ${options.tradingName} on Rynet.`,
    heading: `Your login for ${options.tradingName}`,
    body: `Hi${first ? ` ${first}` : ""},

Here is your own login to Rynet's portal for ${options.tradingName}. In it you will find:

- every enquiry about your cars, with WhatsApp a tap away
- your cars, to mark sold or reserved the moment it happens
- ready-made ads, and posting to your Facebook Page and Instagram

${MONTHLY_REPORT_LINE}

Choose your password with the button below. The link works for ${INVITE_DAYS} days and only once. Nobody at Rynet will ever know your password.`,
    button: { label: "Choose your password", url: options.link },
    footnote: "Not expecting this? Ignore it and nothing happens.",
  });
  return { subject: `Your Rynet login for ${options.tradingName}`, html, text };
}
