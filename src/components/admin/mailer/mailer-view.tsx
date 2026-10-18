import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { BUILT_IN_TEMPLATES, type MailTemplate } from "@/content/mail-templates";
import { mailerDealers, mailServerReady } from "@/lib/mail/mailer";
import { MERGE_FIELDS } from "@/lib/mail/merge";

import { MailerDesk, type MailingSummary } from "./mailer-desk";

/**
 * Admin > Mailer (`/admin/mailer`): email many dealerships at once, or a chosen few.
 *
 * Pick a template or write one, choose who gets it (quick picks like "no portal login yet", or
 * tick them one by one), see exactly what one dealership will receive, send yourself a test,
 * then send. The history underneath shows each mailing and how many went. Staff only.
 */
export async function MailerView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/mailer`)}`);

  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="rn-admin-home rn-onboard rn-mailer">{children}</Gutter>
    </DefaultTemplate>
  );

  const head = (lead: string) => (
    <header className="rn-admin-home__head">
      <h1 className="rn-admin-home__title">Mailer</h1>
      <p className="rn-admin-home__lead">{lead}</p>
    </header>
  );

  if (!isPlatformStaff(user)) return template(head("Only Rynet staff can email dealerships."));

  const [dealers, saved, mailings] = await Promise.all([
    mailerDealers(payload),
    payload.find({
      collection: "email-templates",
      sort: "name",
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "mailings",
      sort: "-createdAt",
      limit: 15,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const templates: MailTemplate[] = [
    ...BUILT_IN_TEMPLATES,
    ...(saved.docs as unknown as Record<string, unknown>[]).map((doc) => ({
      id: `saved-${String(doc.id)}`,
      name: `${String(doc.name ?? "")} (saved)`,
      subject: String(doc.subject ?? ""),
      body: String(doc.body ?? ""),
      buttonLabel: (doc.buttonLabel as string | null) ?? undefined,
      buttonUrl: (doc.buttonUrl as string | null) ?? undefined,
    })),
  ];

  const history: MailingSummary[] = await Promise.all(
    (mailings.docs as unknown as Record<string, unknown>[]).map(async (doc) => {
      const count = (status: string) =>
        payload
          .count({
            collection: "mail-deliveries",
            where: { and: [{ mailing: { equals: doc.id } }, { status: { equals: status } }] },
            overrideAccess: true,
          })
          .then((result) => result.totalDocs);
      const [sent, queued, failed, skipped] = await Promise.all([
        count("sent"),
        count("queued"),
        count("failed"),
        count("skipped"),
      ]);
      return {
        id: doc.id as number,
        subject: String(doc.subject ?? ""),
        audience: String(doc.audience ?? ""),
        createdAt: String(doc.createdAt ?? ""),
        sent,
        queued,
        failed,
        skipped,
      };
    }),
  );

  return template(
    <>
      {head(
        "Email every dealership, a group of them, or just a few. Each one is personalised, and every email has a link to stop them.",
      )}
      <MailerDesk
        dealers={dealers}
        templates={templates}
        fields={Object.entries(MERGE_FIELDS).map(([name, help]) => ({ name, help }))}
        history={history}
        mailServer={mailServerReady()}
        staffEmail={(user as { email?: string }).email ?? ""}
        adminRoute={adminRoute}
      />
    </>,
  );
}
