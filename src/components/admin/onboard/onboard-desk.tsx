"use client";

import {
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  ImageIcon,
  KeyRound,
  MessageCircle,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { adminListUrl } from "@/lib/admin-links";
import { liveMessage, whatsappLink, whatsappNumber } from "@/lib/onboarding/whatsapp";
import { INVITE_DAYS, inviteMessage } from "@/lib/portal/invite-message";

/**
 * The onboarding desk: four steps on one screen.
 *
 *   1. Who they are. Creates the dealership and its branch, verified.
 *   2. Their cars. From their website when Rynet can read it, otherwise from a spreadsheet.
 *   3. Tell them. Their showroom link and a WhatsApp message with it, ready to send.
 *   4. Their login. An account and a link for them to choose a password, for /portal.
 *
 * Loading cars runs in the background on the server and this screen asks how it is going every
 * few seconds, because a full stock list takes minutes and nobody should sit on a spinner.
 *
 * Every piece below is a module-level component. A component defined inside another gets a new
 * identity on every render and remounts, which silently wipes whatever was typed into it.
 */

export type Place = { id: number; name: string; parent?: number | null };

/** A dealership that asked to list from /list-your-stock and has not been onboarded yet. */
export type DeskSignup = {
  id: number;
  dealership: string;
  website: string;
  town: string;
  stock: string;
  contactName: string;
  phone: string;
  email: string;
  askedAt: string;
};

/** What a sign-up fills in on the form, so staff never retype what the dealership gave. */
type Prefill = Partial<FormState> & { signupLeadId?: number };

export type DeskDealer = {
  id: number;
  tradingName: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  whatsapp: string | null;
  websiteUrl: string | null;
  readsWebsite: boolean;
};

type Probe =
  | {
      readable: true;
      origin: string;
      source: string;
      count: number;
      sample: {
        title: string | null;
        price: number | null;
        year: number | null;
        mileageKm: number | null;
        photos: number;
      } | null;
    }
  | { readable: false; reason: string };

type Status = {
  live: number;
  heldBack: number;
  lastReadAt: string | null;
  lastSummary: string | null;
  busy: boolean;
};

type SheetRead = {
  listings: unknown[];
  understood: { header: string; column: string }[];
  ignored: string[];
  problems: string[];
};

const rand = (value: number) => `R ${value.toLocaleString("en-ZA").replace(/[,\s ]/g, " ")}`;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, data };
}

/* ------------------------------------------------------------------------------ step 1: the form */

type FormState = {
  tradingName: string;
  legalName: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string;
  websiteUrl: string;
  registrationNumber: string;
  addressLine1: string;
  suburb: string;
  provinceId: string;
  cityId: string;
  confirmedHow: string;
};

const EMPTY_FORM: FormState = {
  tradingName: "",
  legalName: "",
  contactName: "",
  phone: "",
  whatsapp: "",
  email: "",
  websiteUrl: "",
  registrationNumber: "",
  addressLine1: "",
  suburb: "",
  provinceId: "",
  cityId: "",
  confirmedHow: "",
};

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
}: {
  id: keyof FormState;
  label: string;
  hint?: string;
  value: string;
  onChange: (id: keyof FormState, value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="rn-onboard__field">
      <label htmlFor={`onboard-${id}`} className="rn-onboard__label">
        {label}
        {required ? null : <span className="rn-onboard__optional"> (optional)</span>}
      </label>
      <input
        id={`onboard-${id}`}
        className="rn-onboard__input"
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        aria-describedby={hint ? `onboard-${id}-hint` : undefined}
        onChange={(event) => onChange(id, event.target.value)}
      />
      {hint ? (
        <p id={`onboard-${id}-hint`} className="rn-onboard__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function WhoForm({
  provinces,
  cities,
  onCreated,
  prefill,
}: {
  provinces: Place[];
  cities: Place[];
  onCreated: (dealer: DeskDealer) => void;
  prefill?: Prefill;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...prefill });
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const set = useCallback((id: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [id]: value,
      // A new province empties the town, so a town from another province cannot be sent.
      ...(id === "provinceId" ? { cityId: "" } : {}),
    }));
  }, []);

  const towns = useMemo(
    () => cities.filter((city) => !form.provinceId || city.parent === Number(form.provinceId)),
    [cities, form.provinceId],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblems([]);
    const { ok, data } = await postJson<{ dealerId?: number; slug?: string; problems?: string[] }>(
      "/api/onboard/dealership",
      {
        ...form,
        provinceId: Number(form.provinceId),
        cityId: Number(form.cityId),
        signupLeadId: prefill?.signupLeadId,
      },
    );
    setSaving(false);
    if (!ok || !data.dealerId || !data.slug) {
      setProblems(data.problems ?? ["Something went wrong. Try again."]);
      return;
    }
    onCreated({
      id: data.dealerId,
      tradingName: form.tradingName.trim(),
      slug: data.slug,
      contactName: form.contactName.trim(),
      contactEmail: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || form.phone.trim(),
      websiteUrl: form.websiteUrl.trim() || null,
      readsWebsite: false,
    });
  }

  return (
    <form className="rn-onboard__form" onSubmit={submit} noValidate>
      <fieldset className="rn-onboard__group">
        <legend className="rn-onboard__legend">The dealership</legend>
        <TextField
          id="tradingName"
          label="Dealership name"
          value={form.tradingName}
          onChange={set}
          required
          placeholder="Smith Motors"
        />
        <TextField
          id="websiteUrl"
          label="Their own website"
          value={form.websiteUrl}
          onChange={set}
          placeholder="https://smithmotors.co.za"
          hint="Not AutoTrader or Cars.co.za. If Rynet can read it, their cars load from it and stay up to date."
        />
        <TextField
          id="legalName"
          label="Registered company name"
          value={form.legalName}
          onChange={set}
          hint="Ask for it later if they do not know it now."
        />
        <TextField
          id="registrationNumber"
          label="CIPC registration number"
          value={form.registrationNumber}
          onChange={set}
          placeholder="2015/123456/07"
        />
      </fieldset>

      <fieldset className="rn-onboard__group">
        <legend className="rn-onboard__legend">Who you spoke to</legend>
        <TextField
          id="contactName"
          label="Their name"
          value={form.contactName}
          onChange={set}
          required
        />
        <TextField
          id="phone"
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={set}
          required
          placeholder="012 345 6789"
        />
        <TextField
          id="whatsapp"
          label="WhatsApp, if different"
          type="tel"
          value={form.whatsapp}
          onChange={set}
          hint="Buyers message this number from the site."
        />
        <TextField id="email" label="Email" type="email" value={form.email} onChange={set} />
      </fieldset>

      <fieldset className="rn-onboard__group">
        <legend className="rn-onboard__legend">Where they are</legend>
        <TextField
          id="addressLine1"
          label="Street address"
          value={form.addressLine1}
          onChange={set}
          required
        />
        <TextField id="suburb" label="Suburb" value={form.suburb} onChange={set} />
        <div className="rn-onboard__field">
          <label htmlFor="onboard-provinceId" className="rn-onboard__label">
            Province
          </label>
          <select
            id="onboard-provinceId"
            className="rn-onboard__input"
            value={form.provinceId}
            required
            onChange={(event) => set("provinceId", event.target.value)}
          >
            <option value="">Choose a province</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rn-onboard__field">
          <label htmlFor="onboard-cityId" className="rn-onboard__label">
            Town
          </label>
          <select
            id="onboard-cityId"
            className="rn-onboard__input"
            value={form.cityId}
            required
            disabled={!form.provinceId}
            onChange={(event) => set("cityId", event.target.value)}
          >
            <option value="">
              {form.provinceId ? "Choose a town" : "Choose the province first"}
            </option>
            {towns.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="rn-onboard__group rn-onboard__group--wide">
        <legend className="rn-onboard__legend">The check</legend>
        <div className="rn-onboard__field">
          <label htmlFor="onboard-confirmedHow" className="rn-onboard__label">
            How you confirmed they are a registered dealership that agreed to list
          </label>
          <textarea
            id="onboard-confirmedHow"
            className="rn-onboard__input rn-onboard__textarea"
            rows={2}
            required
            value={form.confirmedHow}
            placeholder="Visited the showroom on 12 October, spoke to the dealer principal, who agreed to list."
            aria-describedby="onboard-confirmedHow-hint"
            onChange={(event) => set("confirmedHow", event.target.value)}
          />
          <p id="onboard-confirmedHow-hint" className="rn-onboard__hint">
            Saved on their record as the reason they are verified. Only verified dealerships can put
            cars live.
          </p>
        </div>
      </fieldset>

      {problems.length > 0 ? (
        <ul className="rn-onboard__problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      <div className="rn-onboard__actions">
        <button
          type="submit"
          className="rn-onboard__button rn-onboard__button--primary"
          disabled={saving}
        >
          {saving ? "Creating their showroom" : "Create their showroom"}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------------- step 2: their cars */

function WebsiteLoader({
  dealer,
  onStarted,
}: {
  dealer: DeskDealer;
  onStarted: (fromWebsite: boolean) => void;
}) {
  const [url, setUrl] = useState(dealer.websiteUrl ?? "");
  const [probe, setProbe] = useState<Probe | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);

  async function check() {
    if (!url.trim()) return;
    setChecking(true);
    setProbe(null);
    setMessage("");
    const { data } = await postJson<Probe & { error?: string }>("/api/onboard/probe", { url });
    setChecking(false);
    setProbe(data.error ? { readable: false, reason: data.error } : data);
  }

  async function start() {
    setStarting(true);
    const { data } = await postJson<{ started: boolean; message: string }>("/api/onboard/website", {
      dealerId: dealer.id,
      url,
    });
    setStarting(false);
    setMessage(data.message);
    if (data.started) onStarted(true);
  }

  return (
    <section className="rn-onboard__source" aria-labelledby="onboard-website">
      <h3 id="onboard-website" className="rn-onboard__source-title">
        <Globe aria-hidden="true" /> From their website
      </h3>
      <p className="rn-onboard__hint">
        Best when it works: their cars load by themselves and stay up to date, with new cars added,
        prices changed and sold cars taken off.
      </p>
      <div className="rn-onboard__inline">
        <label htmlFor="onboard-website-url" className="rn-onboard__sr">
          Their website
        </label>
        <input
          id="onboard-website-url"
          className="rn-onboard__input"
          type="url"
          value={url}
          placeholder="https://theirdealership.co.za"
          onChange={(event) => {
            setUrl(event.target.value);
            setProbe(null);
          }}
        />
        <button
          type="button"
          className="rn-onboard__button"
          onClick={check}
          disabled={checking || !url.trim()}
        >
          {checking ? "Checking" : "Check it"}
        </button>
      </div>

      {probe?.readable === true ? (
        <div className="rn-onboard__result rn-onboard__result--good" role="status">
          <p>
            <Check aria-hidden="true" /> Rynet can read this site:{" "}
            <strong>{probe.count} cars</strong> on {probe.source}.
          </p>
          {probe.sample ? (
            <p className="rn-onboard__hint">
              The first one reads as {probe.sample.title ?? "a car with no name"}
              {probe.sample.price ? `, ${rand(probe.sample.price)}` : ", no price"}
              {probe.sample.mileageKm !== null
                ? `, ${probe.sample.mileageKm.toLocaleString("en-ZA")} km`
                : ""}
              , {probe.sample.photos} photographs.
            </p>
          ) : null}
          <button
            key="read-all"
            type="button"
            className="rn-onboard__button rn-onboard__button--primary"
            onClick={start}
            disabled={starting}
          >
            {starting ? "Starting" : `Read all ${probe.count} cars and keep them up to date`}
          </button>
        </div>
      ) : null}
      {probe?.readable === false ? (
        <p className="rn-onboard__result rn-onboard__result--bad" role="status">
          {probe.reason}
        </p>
      ) : null}
      {message ? (
        <p className="rn-onboard__hint" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function SpreadsheetLoader({
  dealer,
  onStarted,
}: {
  dealer: DeskDealer;
  onStarted: (fromWebsite: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [whole, setWhole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [read, setRead] = useState<SheetRead | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setRead(null);
    const body = new FormData();
    body.set("dealerId", String(dealer.id));
    body.set("wholeStock", whole ? "true" : "false");
    body.set("file", file);
    const response = await fetch("/api/onboard/spreadsheet", {
      method: "POST",
      credentials: "include",
      body,
    });
    const data = (await response.json().catch(() => ({}))) as {
      started?: boolean;
      message?: string;
      read?: SheetRead;
    };
    setBusy(false);
    setMessage(data.message ?? "Something went wrong. Try again.");
    setRead(data.read ?? null);
    if (data.started) onStarted(false);
  }

  return (
    <section className="rn-onboard__source" aria-labelledby="onboard-sheet">
      <h3 id="onboard-sheet" className="rn-onboard__source-title">
        <FileSpreadsheet aria-hidden="true" /> From a spreadsheet
      </h3>
      <p className="rn-onboard__hint">
        For any dealership. Their own stock export works, saved as CSV; the column names do not have
        to match. Or send them <a href="/api/onboard/template">the template</a>.
      </p>
      <div className="rn-onboard__field">
        <label htmlFor="onboard-sheet-file" className="rn-onboard__label">
          Stock sheet (CSV)
        </label>
        <input
          id="onboard-sheet-file"
          className="rn-onboard__file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <label className="rn-onboard__check">
        <input
          type="checkbox"
          checked={whole}
          onChange={(event) => setWhole(event.target.checked)}
        />
        This is their whole stock. Take off any of their cars that are not on it.
      </label>
      <div className="rn-onboard__actions">
        <button
          type="button"
          className="rn-onboard__button"
          onClick={upload}
          disabled={!file || busy}
        >
          {busy ? "Reading the sheet" : "Load these cars"}
        </button>
      </div>
      {message ? (
        <p className="rn-onboard__hint" role="status">
          {message}
        </p>
      ) : null}
      {read ? (
        <div className="rn-onboard__sheet-read">
          {read.understood.length > 0 ? (
            <p className="rn-onboard__hint">
              Understood: {read.understood.map((column) => column.header).join(", ")}.
              {read.ignored.length > 0 ? ` Not used: ${read.ignored.join(", ")}.` : ""}
            </p>
          ) : null}
          {read.problems.length > 0 ? (
            <ul className="rn-onboard__problems">
              {read.problems.slice(0, 12).map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
              {read.problems.length > 12 ? <li>And {read.problems.length - 12} more.</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Progress({
  status,
  dealerId,
  adminRoute,
}: {
  status: Status | null;
  dealerId: number;
  adminRoute: string;
}) {
  if (!status) return null;
  const held = adminListUrl(adminRoute, "vehicles", [
    { field: "dealer", operator: "equals", value: String(dealerId) },
    { field: "status", operator: "equals", value: "draft" },
  ]);
  return (
    <div className="rn-onboard__progress" role="status" aria-live="polite">
      <p className="rn-onboard__counts">
        <strong>{status.live}</strong> {status.live === 1 ? "car" : "cars"} live
        {status.heldBack > 0 ? (
          <>
            ,{" "}
            <a href={held}>
              <strong>{status.heldBack}</strong> held back for a missing detail
            </a>
          </>
        ) : null}
        {status.busy ? <span className="rn-onboard__busy"> Loading now</span> : null}
      </p>
      {status.lastSummary ? <p className="rn-onboard__hint">{status.lastSummary}</p> : null}
      {status.heldBack > 0 ? (
        <p className="rn-onboard__hint">
          A car is held back until it has a price, a mileage and at least one photograph. Open it,
          add what is missing and set it live.
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------- step 3: tell them */

function TellThem({
  dealer,
  status,
  siteUrl,
  adminRoute,
}: {
  dealer: DeskDealer;
  status: Status | null;
  siteUrl: string;
  adminRoute: string;
}) {
  const showroom = `${siteUrl}/dealers/${dealer.slug}`;
  const suggested = liveMessage({
    contactName: dealer.contactName,
    showroomUrl: showroom,
    liveCars: status?.live ?? 0,
    fromWebsite: dealer.readsWebsite,
    loading: status?.busy ?? false,
  });
  const [text, setText] = useState(suggested);
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep the suggestion current as cars arrive, until the person changes it themselves.
  useEffect(() => {
    if (!edited) setText(suggested);
  }, [suggested, edited]);

  const number = whatsappNumber(dealer.whatsapp);

  const empty = (status?.live ?? 0) === 0;

  return (
    <div className="rn-onboard__tell">
      {empty ? (
        <p className="rn-onboard__result rn-onboard__result--bad" role="note">
          None of their cars is live yet, so their showroom is empty. Send this once some are.
        </p>
      ) : null}
      <div className="rn-onboard__inline">
        <a className="rn-onboard__link" href={showroom} target="_blank" rel="noreferrer">
          {showroom.replace(/^https?:\/\//, "")} <ExternalLink aria-hidden="true" />
        </a>
        <button
          type="button"
          className="rn-onboard__button"
          onClick={async () => {
            await navigator.clipboard.writeText(showroom);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="rn-onboard__field">
        <label htmlFor="onboard-message" className="rn-onboard__label">
          The message
        </label>
        <textarea
          id="onboard-message"
          className="rn-onboard__input rn-onboard__textarea"
          rows={6}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setEdited(true);
          }}
        />
      </div>
      <div className="rn-onboard__actions">
        <a
          className="rn-onboard__button rn-onboard__button--whatsapp"
          href={whatsappLink(number, text)}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle aria-hidden="true" />
          {number ? `Send on WhatsApp to ${dealer.whatsapp}` : "Open WhatsApp"}
        </a>
        <a className="rn-onboard__button" href={`${adminRoute}/ad-studio?dealer=${dealer.id}`}>
          <ImageIcon aria-hidden="true" /> Make their ads
        </a>
        <a className="rn-onboard__button" href={`${adminRoute}/collections/dealers/${dealer.id}`}>
          Open their record
        </a>
      </div>
      {!number ? (
        <p className="rn-onboard__hint">
          No South African mobile number on their record, so WhatsApp will ask who to send it to.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Step 4: their own login. Makes the account and a link for them to choose a password, sent the
 * same way as everything else, from staff's own WhatsApp. Asking again sends a fresh link.
 */
function GiveLogin({ dealer }: { dealer: DeskDealer }) {
  const [name, setName] = useState(dealer.contactName ?? "");
  const [email, setEmail] = useState(dealer.contactEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function make(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblems([]);
    const { ok, data } = await postJson<{ path?: string; problems?: string[] }>(
      "/api/onboard/login",
      { dealerId: dealer.id, name, email, phone: dealer.whatsapp },
    );
    setBusy(false);
    if (!ok || !data.path) {
      setProblems(data.problems ?? ["That did not work. Try again."]);
      return;
    }
    setLink(`${window.location.origin}${data.path}`);
  }

  const text = link ? inviteMessage({ name, tradingName: dealer.tradingName, link }) : "";
  const number = whatsappNumber(dealer.whatsapp);

  return (
    <div className="rn-onboard__tell">
      <p className="rn-onboard__hint">
        Their own place on Rynet: their cars, their enquiries and their ads. They choose the
        password, so nobody at Rynet ever knows it. The link works for {INVITE_DAYS} days.
      </p>
      <form className="rn-onboard__form" onSubmit={make} noValidate>
        <div className="rn-onboard__field">
          <label htmlFor="login-name" className="rn-onboard__label">
            Their name
          </label>
          <input
            id="login-name"
            className="rn-onboard__input"
            value={name}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="rn-onboard__field">
          <label htmlFor="login-email" className="rn-onboard__label">
            Their email, which they sign in with
          </label>
          <input
            id="login-email"
            type="email"
            className="rn-onboard__input"
            value={email}
            autoComplete="off"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {problems.length > 0 ? (
          <ul className="rn-onboard__problems" role="alert">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        <div className="rn-onboard__actions">
          <button
            type="submit"
            className="rn-onboard__button rn-onboard__button--primary"
            disabled={busy}
          >
            <KeyRound aria-hidden="true" />
            {busy ? "Making it" : link ? "Make a fresh link" : "Give them a login"}
          </button>
        </div>
      </form>
      {link ? (
        <>
          <div className="rn-onboard__field">
            <label htmlFor="login-message" className="rn-onboard__label">
              The message
            </label>
            <textarea
              id="login-message"
              className="rn-onboard__input rn-onboard__textarea"
              rows={6}
              readOnly
              value={text}
            />
          </div>
          <div className="rn-onboard__actions">
            <a
              className="rn-onboard__button rn-onboard__button--whatsapp"
              href={whatsappLink(number, text)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              {number ? `Send on WhatsApp to ${dealer.whatsapp}` : "Open WhatsApp"}
            </a>
            <button
              type="button"
              className="rn-onboard__button"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy the link"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------------------- the desk */

/**
 * "Can Rynet read this prospect's website?", before anyone has said yes. Creates nothing and
 * copies nothing: it reads the site's car list and one car, which is what makes the opening line
 * "we can load all 43 of your cars automatically" true rather than hopeful.
 */
function ProspectCheck() {
  const [url, setUrl] = useState("");
  const [probe, setProbe] = useState<Probe | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    if (!url.trim()) return;
    setChecking(true);
    setProbe(null);
    const { data } = await postJson<Probe & { error?: string }>("/api/onboard/probe", { url });
    setChecking(false);
    setProbe(data.error ? { readable: false, reason: data.error } : data);
  }

  return (
    <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-prospect">
      <h2 id="onboard-prospect" className="rn-admin-home__h2">
        Check a website
      </h2>
      <p className="rn-onboard__hint">
        Before you contact a dealership: paste their own website to see whether Rynet can load their
        cars from it, and how many. Nothing is saved.
      </p>
      <div className="rn-onboard__inline">
        <label htmlFor="onboard-prospect-url" className="rn-onboard__sr">
          Their website
        </label>
        <input
          id="onboard-prospect-url"
          className="rn-onboard__input"
          type="url"
          value={url}
          placeholder="https://theirdealership.co.za"
          onChange={(event) => {
            setUrl(event.target.value);
            setProbe(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void check();
            }
          }}
        />
        <button
          type="button"
          className="rn-onboard__button"
          onClick={check}
          disabled={checking || !url.trim()}
        >
          {checking ? "Checking" : "Check it"}
        </button>
      </div>
      {probe?.readable === true ? (
        <div className="rn-onboard__result rn-onboard__result--good" role="status">
          <p>
            <Check aria-hidden="true" /> Rynet can load <strong>{probe.count} cars</strong> from{" "}
            {probe.source} and keep them up to date.
          </p>
          {probe.sample ? (
            <p className="rn-onboard__hint">
              The first one reads as {probe.sample.title ?? "a car with no name"}
              {probe.sample.price ? `, ${rand(probe.sample.price)}` : ", no price"}, with{" "}
              {probe.sample.photos} photographs.
            </p>
          ) : null}
        </div>
      ) : null}
      {probe?.readable === false ? (
        <p className="rn-onboard__result rn-onboard__result--bad" role="status">
          {probe.reason}
        </p>
      ) : null}
    </section>
  );
}

function Signups({
  signups,
  onChoose,
}: {
  signups: DeskSignup[];
  onChoose: (signup: DeskSignup) => void;
}) {
  return (
    <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-signups">
      <h2 id="onboard-signups" className="rn-admin-home__h2">
        Asked to list ({signups.length})
      </h2>
      <p className="rn-onboard__hint">
        From the sign-up form on rynet.co.za/list-your-stock. Call them, then press Onboard: the
        form below fills itself in.
      </p>
      <ul className="rn-onboard__signups">
        {signups.map((signup) => (
          <li key={signup.id} className="rn-onboard__signup">
            <div className="rn-onboard__signup-main">
              <strong>{signup.dealership || "A dealership"}</strong>
              <span className="rn-onboard__hint">
                {[signup.town, signup.stock, signup.website].filter(Boolean).join(", ")}
              </span>
              <span className="rn-onboard__hint">
                {signup.contactName},{" "}
                <a href={`tel:${signup.phone.replace(/\s/g, "")}`}>{signup.phone}</a>
                {signup.email ? `, ${signup.email}` : ""}
              </span>
            </div>
            <button type="button" className="rn-onboard__button" onClick={() => onChoose(signup)}>
              Onboard
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OnboardDesk({
  provinces,
  cities,
  dealers,
  signups = [],
  initialDealerId,
  siteUrl,
  adminRoute,
}: {
  provinces: Place[];
  cities: Place[];
  dealers: DeskDealer[];
  signups?: DeskSignup[];
  initialDealerId: number | null;
  siteUrl: string;
  adminRoute: string;
}) {
  const [dealer, setDealer] = useState<DeskDealer | null>(
    dealers.find((candidate) => candidate.id === initialDealerId) ?? null,
  );
  const [status, setStatus] = useState<Status | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [open, setOpen] = useState<DeskSignup[]>(signups);

  const choose = useCallback(
    (signup: DeskSignup) => {
      // The town they typed, matched to Rynet's own list where it can be, province and all.
      const town = cities.find(
        (city) => city.name.toLowerCase() === signup.town.trim().toLowerCase(),
      );
      setPrefill({
        signupLeadId: signup.id,
        tradingName: signup.dealership,
        websiteUrl: signup.website,
        contactName: signup.contactName,
        phone: signup.phone,
        email: signup.email,
        provinceId: town?.parent ? String(town.parent) : "",
        cityId: town ? String(town.id) : "",
      });
      document.getElementById("onboard-step-1")?.scrollIntoView({ behavior: "smooth" });
    },
    [cities],
  );
  // Watched for ten minutes after anything starts, and for as long as a run is busy.
  const [watchUntil, setWatchUntil] = useState(0);

  const refresh = useCallback(async (id: number) => {
    const response = await fetch(`/api/onboard/status?dealerId=${id}`, { credentials: "include" });
    if (response.ok) setStatus((await response.json()) as Status);
  }, []);

  useEffect(() => {
    if (!dealer) return;
    void refresh(dealer.id);
  }, [dealer, refresh]);

  useEffect(() => {
    if (!dealer) return;
    const timer = setInterval(() => {
      if (Date.now() < watchUntil || status?.busy) void refresh(dealer.id);
    }, 5000);
    return () => clearInterval(timer);
  }, [dealer, watchUntil, status?.busy, refresh]);

  const started = useCallback(
    (fromWebsite: boolean) => {
      setWatchUntil(Date.now() + 10 * 60_000);
      if (!dealer) return;
      if (fromWebsite && !dealer.readsWebsite) setDealer({ ...dealer, readsWebsite: true });
      void refresh(dealer.id);
    },
    [dealer, refresh],
  );

  return (
    <div className="rn-onboard__steps">
      {!dealer && open.length > 0 ? <Signups signups={open} onChoose={choose} /> : null}
      {!dealer ? <ProspectCheck /> : null}
      <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-step-1">
        <div className="rn-admin-panel__head">
          <h2 id="onboard-step-1" className="rn-admin-home__h2">
            <span className="rn-onboard__number">1</span> Who they are
          </h2>
          {dealer ? (
            <button
              type="button"
              className="rn-onboard__textbutton"
              onClick={() => {
                setDealer(null);
                setStatus(null);
              }}
            >
              Start another dealership
            </button>
          ) : null}
        </div>

        {dealer ? (
          <p className="rn-onboard__done">
            <Check aria-hidden="true" /> <strong>{dealer.tradingName}</strong> is on Rynet,
            verified.
          </p>
        ) : (
          <>
            {dealers.length > 0 ? (
              <div className="rn-onboard__field rn-onboard__existing">
                <label htmlFor="onboard-existing" className="rn-onboard__label">
                  Already on Rynet? Load or refresh the cars of
                </label>
                <select
                  id="onboard-existing"
                  className="rn-onboard__input"
                  value=""
                  onChange={(event) => {
                    const chosen = dealers.find(
                      (candidate) => candidate.id === Number(event.target.value),
                    );
                    if (chosen) setDealer(chosen);
                  }}
                >
                  <option value="">Choose a dealership</option>
                  {dealers.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.tradingName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {prefill ? (
              <p className="rn-onboard__result rn-onboard__result--good" role="status">
                Filled in from {prefill.tradingName || "their"} sign-up. Add the street address and
                how you confirmed them, then create their showroom.
              </p>
            ) : null}
            <WhoForm
              key={prefill?.signupLeadId ?? "blank"}
              provinces={provinces}
              cities={cities}
              prefill={prefill ?? undefined}
              onCreated={(created) => {
                if (prefill?.signupLeadId) {
                  setOpen((current) => current.filter((item) => item.id !== prefill.signupLeadId));
                }
                setPrefill(null);
                setDealer(created);
              }}
            />
          </>
        )}
      </section>

      {dealer ? (
        <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-step-2">
          <h2 id="onboard-step-2" className="rn-admin-home__h2">
            <span className="rn-onboard__number">2</span> Their cars
          </h2>
          <Progress status={status} dealerId={dealer.id} adminRoute={adminRoute} />
          <div className="rn-onboard__sources">
            <WebsiteLoader key={`web-${dealer.id}`} dealer={dealer} onStarted={started} />
            <SpreadsheetLoader key={`sheet-${dealer.id}`} dealer={dealer} onStarted={started} />
          </div>
        </section>
      ) : null}

      {dealer ? (
        <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-step-3">
          <h2 id="onboard-step-3" className="rn-admin-home__h2">
            <span className="rn-onboard__number">3</span> Tell them they are live
          </h2>
          <TellThem
            key={`tell-${dealer.id}`}
            dealer={dealer}
            status={status}
            siteUrl={siteUrl}
            adminRoute={adminRoute}
          />
        </section>
      ) : null}

      {dealer ? (
        <section className="rn-admin-panel rn-onboard__step" aria-labelledby="onboard-step-4">
          <h2 id="onboard-step-4" className="rn-admin-home__h2">
            <span className="rn-onboard__number">4</span> Give them their own login
          </h2>
          <GiveLogin key={`login-${dealer.id}`} dealer={dealer} />
        </section>
      ) : null}
    </div>
  );
}
