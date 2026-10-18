"use client";

import { Eye, Save, Send, TestTube } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MailTemplate } from "@/content/mail-templates";
import type { MailerDealer } from "@/lib/mail/mailer";

/**
 * The Mailer, on one screen, top to bottom in the order a person thinks: what to say, who gets
 * it, what it looks like, send.
 *
 * Module-level components only (see onboard-desk.tsx for why: a component defined inside another
 * remounts on every keystroke and wipes what was typed).
 */

export type MailingSummary = {
  id: number;
  subject: string;
  audience: string;
  createdAt: string;
  sent: number;
  queued: number;
  failed: number;
  skipped: number;
};

type Draft = { subject: string; body: string; buttonLabel: string; buttonUrl: string };

type Pick = { id: string; label: string; test: (dealer: MailerDealer) => boolean };

const PICKS: Pick[] = [
  { id: "all", label: "Every dealership", test: () => true },
  { id: "verified", label: "Verified", test: (dealer) => dealer.verified },
  { id: "no-login", label: "No portal login yet", test: (dealer) => !dealer.hasLogin },
  { id: "login", label: "Using the portal", test: (dealer) => dealer.hasLogin },
  { id: "no-social", label: "Facebook not connected", test: (dealer) => !dealer.socialConnected },
  { id: "enquiries", label: "Enquiries waiting", test: (dealer) => dealer.newEnquiries > 0 },
  { id: "none", label: "Clear", test: () => false },
];

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = ((await response?.json().catch(() => ({}))) ?? {}) as T;
  return { ok: Boolean(response?.ok), data };
}

const whyNot = (dealer: MailerDealer): string | null =>
  dealer.optedOut ? "asked for no emails" : !dealer.email ? "no email address" : null;

function Compose({
  draft,
  setDraft,
  templates,
  fields,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  templates: MailTemplate[];
  fields: { name: string; help: string }[];
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState("");

  const insert = (name: string) => {
    const area = bodyRef.current;
    const token = `{{${name}}}`;
    if (!area) {
      setDraft({ ...draft, body: `${draft.body}${token}` });
      return;
    }
    const start = area.selectionStart ?? draft.body.length;
    const end = area.selectionEnd ?? start;
    setDraft({ ...draft, body: `${draft.body.slice(0, start)}${token}${draft.body.slice(end)}` });
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <section className="rn-admin-panel rn-onboard__step" aria-labelledby="mailer-compose">
      <h2 id="mailer-compose" className="rn-admin-home__h2">
        <span className="rn-onboard__number">1</span> What to say
      </h2>
      <div className="rn-mailer__compose">
        <div className="rn-onboard__field">
          <label htmlFor="mailer-template" className="rn-onboard__label">
            Start from
          </label>
          <select
            id="mailer-template"
            className="rn-onboard__input"
            defaultValue=""
            onChange={(event) => {
              const chosen = templates.find((each) => each.id === event.target.value);
              if (chosen) {
                setDraft({
                  subject: chosen.subject,
                  body: chosen.body,
                  buttonLabel: chosen.buttonLabel ?? "",
                  buttonUrl: chosen.buttonUrl ?? "",
                });
              }
            }}
          >
            <option value="" disabled>
              Choose a template
            </option>
            {templates.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rn-onboard__field">
          <label htmlFor="mailer-subject" className="rn-onboard__label">
            Subject
          </label>
          <input
            id="mailer-subject"
            className="rn-onboard__input"
            value={draft.subject}
            onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
          />
        </div>
        <div className="rn-onboard__field">
          <label htmlFor="mailer-body" className="rn-onboard__label">
            The email
          </label>
          <textarea
            id="mailer-body"
            ref={bodyRef}
            className="rn-onboard__input rn-onboard__textarea"
            rows={12}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            aria-describedby="mailer-body-hint"
          />
          <p id="mailer-body-hint" className="rn-onboard__hint">
            A blank line starts a paragraph. A line starting with a dash and a space is a bullet.
            **Two stars** make bold, [words](https://...) make a link.
          </p>
        </div>
        <div className="rn-onboard__field">
          <span className="rn-onboard__label" id="mailer-fields">
            Fill in for each dealership
          </span>
          <ul className="rn-mailer__fields" aria-labelledby="mailer-fields">
            {fields.map((field) => (
              <li key={field.name}>
                <button
                  type="button"
                  className="rn-mailer__field"
                  title={field.help}
                  onClick={() => insert(field.name)}
                >
                  {`{{${field.name}}}`}
                  <span className="rn-onboard__sr">: {field.help}. Adds it to the email.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rn-mailer__row">
          <div className="rn-onboard__field">
            <label htmlFor="mailer-button-label" className="rn-onboard__label">
              Button words <span className="rn-onboard__optional">(optional)</span>
            </label>
            <input
              id="mailer-button-label"
              className="rn-onboard__input"
              value={draft.buttonLabel}
              onChange={(event) => setDraft({ ...draft, buttonLabel: event.target.value })}
            />
          </div>
          <div className="rn-onboard__field">
            <label htmlFor="mailer-button-url" className="rn-onboard__label">
              Button goes to
            </label>
            <input
              id="mailer-button-url"
              className="rn-onboard__input"
              placeholder="{{portalUrl}}"
              value={draft.buttonUrl}
              onChange={(event) => setDraft({ ...draft, buttonUrl: event.target.value })}
            />
          </div>
        </div>
        <div className="rn-onboard__inline">
          <label htmlFor="mailer-save-name" className="rn-onboard__sr">
            Name for the template
          </label>
          <input
            id="mailer-save-name"
            className="rn-onboard__input"
            placeholder="Name it to save it as a template"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
          />
          <button
            type="button"
            className="rn-onboard__button"
            disabled={!saveName.trim()}
            onClick={async () => {
              const { ok, data } = await postJson<{ problems?: string[] }>("/api/mailer/template", {
                ...draft,
                name: saveName,
              });
              setSaved(ok ? `Saved as "${saveName.trim()}".` : (data.problems ?? []).join(" "));
              if (ok) setSaveName("");
            }}
          >
            <Save aria-hidden="true" /> Save as a template
          </button>
        </div>
        {saved ? (
          <p className="rn-onboard__hint" role="status">
            {saved}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Recipients({
  dealers,
  chosen,
  setChosen,
}: {
  dealers: MailerDealer[];
  chosen: Set<number>;
  setChosen: (next: Set<number>) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = dealers.filter((dealer) =>
    dealer.tradingName.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const reach = dealers.filter((dealer) => chosen.has(dealer.id) && !whyNot(dealer)).length;

  return (
    <section className="rn-admin-panel rn-onboard__step" aria-labelledby="mailer-who">
      <h2 id="mailer-who" className="rn-admin-home__h2">
        <span className="rn-onboard__number">2</span> Who gets it
      </h2>
      <fieldset className="rn-mailer__picks">
        <legend className="rn-onboard__sr">Choose quickly</legend>
        {PICKS.map((pick) => (
          <button
            key={pick.id}
            type="button"
            className="rn-onboard__button"
            onClick={() => setChosen(new Set(dealers.filter(pick.test).map((dealer) => dealer.id)))}
          >
            {pick.label}
          </button>
        ))}
      </fieldset>
      <div className="rn-onboard__field rn-mailer__search">
        <label htmlFor="mailer-search" className="rn-onboard__label">
          Find a dealership
        </label>
        <input
          id="mailer-search"
          className="rn-onboard__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p className="rn-mailer__count" role="status">
        {chosen.size} chosen. {reach === chosen.size ? "All" : reach} will get it
        {reach === chosen.size ? "." : `; ${chosen.size - reach} cannot (see below).`}
      </p>
      <ul className="rn-mailer__list">
        {shown.map((dealer) => {
          const reason = whyNot(dealer);
          return (
            <li key={dealer.id}>
              <label className="rn-mailer__dealer">
                <input
                  type="checkbox"
                  checked={chosen.has(dealer.id)}
                  onChange={(event) => {
                    const next = new Set(chosen);
                    if (event.target.checked) next.add(dealer.id);
                    else next.delete(dealer.id);
                    setChosen(next);
                  }}
                />
                <span className="rn-mailer__dealer-name">{dealer.tradingName}</span>
                <span className="rn-mailer__dealer-meta">
                  {reason ? (
                    <span className="rn-mailer__warn">Cannot email: {reason}</span>
                  ) : (
                    dealer.email
                  )}
                  {"  |  "}
                  {dealer.liveCars} live
                  {dealer.hasLogin ? "  |  portal" : ""}
                  {dealer.socialConnected ? "  |  Facebook" : ""}
                  {dealer.newEnquiries > 0 ? `  |  ${dealer.newEnquiries} waiting` : ""}
                </span>
              </label>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="rn-onboard__hint">No dealership by that name.</li>
        ) : null}
      </ul>
    </section>
  );
}

function Preview({
  draft,
  dealers,
  chosen,
}: {
  draft: Draft;
  dealers: MailerDealer[];
  chosen: Set<number>;
}) {
  const first = dealers.find((dealer) => chosen.has(dealer.id)) ?? dealers[0];
  const [as, setAs] = useState<number | undefined>(first?.id);
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    if (first && (as === undefined || !dealers.some((dealer) => dealer.id === as))) setAs(first.id);
  }, [first, as, dealers]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data } = await postJson<{ html?: string; subject?: string; problems?: string[] }>(
        "/api/mailer/preview",
        { ...draft, dealerId: as },
      );
      setHtml(data.html ?? "");
      setSubject(data.subject ?? "");
      setProblems(data.problems ?? []);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, as]);

  return (
    <section className="rn-admin-panel rn-onboard__step" aria-labelledby="mailer-preview">
      <h2 id="mailer-preview" className="rn-admin-home__h2">
        <span className="rn-onboard__number">3</span> What they will see
      </h2>
      <div className="rn-onboard__field rn-mailer__as">
        <label htmlFor="mailer-as" className="rn-onboard__label">
          <Eye aria-hidden="true" className="rn-mailer__icon" /> Preview it as
        </label>
        <select
          id="mailer-as"
          className="rn-onboard__input"
          value={as ?? ""}
          onChange={(event) => setAs(Number(event.target.value))}
        >
          {dealers.map((dealer) => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.tradingName}
            </option>
          ))}
        </select>
      </div>
      <p className="rn-mailer__subject">
        <span className="rn-onboard__label">Subject:</span> {subject}
      </p>
      {problems.length > 0 ? (
        <ul className="rn-onboard__problems">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
      <iframe className="rn-mailer__frame" title="Preview of the email" sandbox="" srcDoc={html} />
    </section>
  );
}

export function MailerDesk({
  dealers,
  templates,
  fields,
  history,
  mailServer,
  staffEmail,
  adminRoute,
}: {
  dealers: MailerDealer[];
  templates: MailTemplate[];
  fields: { name: string; help: string }[];
  history: MailingSummary[];
  mailServer: boolean;
  staffEmail: string;
  adminRoute: string;
}) {
  const [draft, setDraft] = useState<Draft>({
    subject: "",
    body: "",
    buttonLabel: "",
    buttonUrl: "",
  });
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const audience = useMemo(() => {
    const names = dealers.filter((dealer) => chosen.has(dealer.id)).map((d) => d.tradingName);
    return names.length <= 3 ? names.join(", ") : `${names.length} dealerships`;
  }, [dealers, chosen]);

  const reach = dealers.filter((dealer) => chosen.has(dealer.id) && !whyNot(dealer)).length;

  async function send() {
    if (!window.confirm(`Send "${draft.subject}" to ${reach} dealerships?`)) return;
    setBusy(true);
    setResult(null);
    const { ok, data } = await postJson<{
      queued?: number;
      leftOut?: number;
      mailServer?: boolean;
      problems?: string[];
    }>("/api/mailer/send", { ...draft, dealerIds: [...chosen], audience });
    setBusy(false);
    if (!ok) {
      setResult({ ok: false, text: (data.problems ?? ["That did not go. Try again."]).join(" ") });
      return;
    }
    setResult({
      ok: true,
      text: data.mailServer
        ? `Sending to ${data.queued} dealerships now, about 20 a minute.${data.leftOut ? ` ${data.leftOut} left out.` : ""} Reload to follow it below.`
        : `Saved for ${data.queued} dealerships. They go out as soon as the mail server is set up.`,
    });
  }

  return (
    <div className="rn-onboard__steps">
      {!mailServer ? (
        <p className="rn-onboard__result rn-onboard__result--bad" role="note">
          There is no mail server on this host yet, so nothing actually leaves. You can write,
          preview and queue mailings; they send once SMTP_HOST is set in cPanel
          (docs/PRODUCTION-READINESS.md, section 1).
        </p>
      ) : null}

      <div className="rn-mailer__grid">
        <Compose draft={draft} setDraft={setDraft} templates={templates} fields={fields} />
        <Preview draft={draft} dealers={dealers} chosen={chosen} />
      </div>

      <Recipients dealers={dealers} chosen={chosen} setChosen={setChosen} />

      <section className="rn-admin-panel rn-onboard__step" aria-labelledby="mailer-send">
        <h2 id="mailer-send" className="rn-admin-home__h2">
          <span className="rn-onboard__number">4</span> Send it
        </h2>
        <div className="rn-onboard__actions">
          <button
            type="button"
            className="rn-onboard__button"
            disabled={busy}
            onClick={async () => {
              setResult(null);
              const asDealer = dealers.find((dealer) => chosen.has(dealer.id))?.id;
              const { ok, data } = await postJson<{ sentTo?: string; problems?: string[] }>(
                "/api/mailer/test",
                { ...draft, dealerId: asDealer },
              );
              setResult(
                ok
                  ? { ok: true, text: `Test sent to ${data.sentTo}.` }
                  : { ok: false, text: (data.problems ?? ["The test did not go."]).join(" ") },
              );
            }}
          >
            <TestTube aria-hidden="true" /> Send a test to {staffEmail || "me"}
          </button>
          <button
            type="button"
            className="rn-onboard__button rn-onboard__button--primary"
            disabled={busy || reach === 0 || !draft.subject.trim() || !draft.body.trim()}
            onClick={() => void send()}
          >
            <Send aria-hidden="true" />
            {busy ? "Sending" : `Send to ${reach} ${reach === 1 ? "dealership" : "dealerships"}`}
          </button>
        </div>
        {result ? (
          <p
            className={`rn-onboard__result${result.ok ? "" : " rn-onboard__result--bad"}`}
            role={result.ok ? "status" : "alert"}
          >
            {result.text}
          </p>
        ) : null}
      </section>

      <section className="rn-admin-panel rn-onboard__step" aria-labelledby="mailer-history">
        <h2 id="mailer-history" className="rn-admin-home__h2">
          Sent before
        </h2>
        {history.length === 0 ? (
          <p className="rn-onboard__hint">Nothing sent from the Mailer yet.</p>
        ) : (
          <table className="rn-mailer__history">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">To</th>
                <th scope="col">Sent</th>
                <th scope="col">Waiting</th>
                <th scope="col">Did not send</th>
                <th scope="col">Left out</th>
              </tr>
            </thead>
            <tbody>
              {history.map((mailing) => (
                <tr key={mailing.id}>
                  <td>
                    <a href={`${adminRoute}/collections/mailings/${mailing.id}`}>
                      {mailing.subject}
                    </a>
                  </td>
                  <td>{mailing.audience}</td>
                  <td>{mailing.sent}</td>
                  <td>{mailing.queued}</td>
                  <td>{mailing.failed}</td>
                  <td>{mailing.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="rn-onboard__hint">
          Every copy and why any did not go:{" "}
          <a href={`${adminRoute}/collections/mail-deliveries`}>Mail deliveries</a>.
        </p>
      </section>
    </div>
  );
}
