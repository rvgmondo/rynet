# Signing dealerships onto Rynet

The playbook for getting car dealerships onto Rynet: the offer, who to contact, the exact
messages, and what to do in the admin once someone says yes.

Everything in quotes is ready to copy. Change the bits in [square brackets].

---

## 1. The offer

> **Your cars on Rynet. We do the work.** Send us your website or your stock sheet. We load every
> car, keep them up to date and make your social ads. Free while we launch. No contract, no card.

The same words are on the site at rynet.co.za/list-your-stock and in `src/content/dealer-offer.ts`.
If the terms change, change that file and this one together.

Why each part is there:

- **"We do the work."** A dealership already lists on AutoTrader, Cars.co.za and Facebook. Time
  is the objection, every time. Take it away completely.
- **"Keep them up to date."** If their own website runs on WordPress with the Motors theme
  (many small dealerships' do), Rynet reads it every few hours by itself. Sold cars come off, new
  cars go on. That is something the portals make them do by hand.
- **"Make your social ads."** Something they can use on their own Facebook page the same day, even
  before Rynet sends them a buyer. It turns the pitch into a gift.
- **"Free while we launch."** Honest urgency, and no risk to them.

**Decide one thing before you start:** what launch dealerships get when paid plans begin. "Free for
your first year whenever paid plans start", or "launch dealerships keep half price for life", turns
"free for now" into a reason to join today. Say it the same way to everyone and write it here.

**Never quote numbers we do not have.** No buyer counts, no traffic, no "join 50 dealerships".
If they ask, the honest answer works better: "We are signing dealerships now. That is why we do
all the work and charge nothing, and why you get the launch terms."

**Do not sound small.** Never say "up to five dealerships", "just us", or "we only have one
dealer". Talk about what they get, not about how big Rynet is.

---

## 2. Before you contact anyone

- [ ] **The site shows only real stock.** Done: the example cars were put away automatically when
      Amico's went live.
- [ ] **Switch email on.** Enquiries are emailed to the dealership, and sign-ups and mockup
      requests to sales@rynet.co.za, as soon as the mail settings are in Setup Node.js App. Four
      steps in `docs/PRODUCTION-READINESS.md`, section 1. Until then buyers reach a dealership by
      WhatsApp and phone from the listing, which works today.
- [ ] **Your WhatsApp number on the sign-up page.** Put it in `src/content/dealer-offer.ts`
      (`whatsapp`) so the page can offer a WhatsApp button as well as the form.
- [ ] **Two friendly dealerships first.** Someone you know. Every later pitch is easier when you can
      say "have a look at [Dealership]'s showroom on Rynet". (Amico Motors is already live; ask
      them before you use their name in a pitch.)

---

## 3. Who to contact

One city at a time, Pretoria first, where you can walk in.

| Type | Where to find them | Why they say yes |
|---|---|---|
| Independent used-car dealerships | Google Maps "used cars [suburb]", the dealer pages on AutoTrader and Cars.co.za | Thin margins, no marketing staff, want free exposure |
| Franchise dealers' pre-owned floors | Each brand's dealer locator | Used and trade-in stock their brand site barely shows |
| Small groups with two to five branches | Google Maps, the "other branches" on their own sites | One setup, several showrooms |
| Dealers posting many cars on Facebook Marketplace | Marketplace searches by town | Often informal dealers who would love a proper showroom |

Pretoria strips worth a morning each: Gezina and Pretoria North (Amico's street), Silverton, Rosslyn,
Centurion (John Vorster and Lenchen), Menlyn.

Keep a spreadsheet: dealership, town, contact person, phone, WhatsApp, email, website, **can Rynet
read the website (yes/no, how many cars)**, date contacted, channel, reply, next step, status
(contacted, talking, yes, live, no).

---

## 4. The opener: check their website first

Before the first message, open **Admin > Onboard a dealership** and use **Check a website** at the
top. Paste the dealership's own website. In a few seconds it says whether Rynet can read it, how
many cars it found and how the first one reads. Nothing is created and nothing is copied.

That gives you the strongest first line there is, because it is specific and true:

> "I checked your website: Rynet can load all 43 of your cars from it automatically, and keep them
> up to date. You would not type a thing."

If the site cannot be read, the pitch is the spreadsheet: "Send me your stock export, whatever your
system gives you, and I load it."

**Never publish anything with their cars or photos until they have said yes.** Their stock is theirs.

---

## 5. WhatsApp scripts

Short messages, one question at the end.

**First message, website readable**

> Hi [Name], it's [Your name] from Rynet, the car marketplace where only checked dealerships sell,
> no private sellers. I'd like [Dealership] on it. I checked your website and we can load all
> [43] of your cars from it automatically and keep them up to date, so it costs you no time. We
> also make your Facebook ads. It's free while we launch. Can I set you up this week?

**First message, website not readable or none**

> Hi [Name], it's [Your name] from Rynet, the car marketplace where only checked dealerships sell,
> no private sellers. I'd like [Dealership] on it. Send me your stock list in whatever form you
> have it and we load every car for you, and we make your Facebook ads too. Free while we launch,
> no contract. Can I set you up this week?

**Follow-up, three days later**

> Hi [Name], just checking you saw this. Setup is on us and takes you about five minutes on the
> phone. No contract. Shall I go ahead?

**Last nudge, a week later**

> Hi [Name], I'll stop after this one. It's free while we launch and the dealerships who join now
> get the launch terms. If now's not a good time, no stress, just say and I'll check back later.

**After they say yes**

> Brilliant, thank you. I need three things:
> 1. Your street address and trading hours
> 2. Your CIPC registration number (we check every dealership before its cars go live)
> 3. Your logo, if you have it handy
> Your stock I'll take from [your website / the sheet you send]. I'll send you your showroom link
> and your first ads today.

---

## 6. Email, for dealerships with no WhatsApp listed

**Email 1. Subject: Your cars on Rynet, set up for you**

> Hi [Name],
>
> I'm [Your name] from Rynet, a South African car marketplace where only checked dealerships sell.
> No private sellers, so a buyer on Rynet is never comparing you with a stranger on a classifieds
> site.
>
> I'd like [Dealership] on it, and we do all the work:
>
> - We load every car, from your website or your stock sheet. [I checked: we can read all 43 of
>   yours from your website and keep them up to date automatically.]
> - Buyers WhatsApp or call you straight from your listing. No lead fees.
> - We make ready-to-post ads of your cars for your own Facebook page.
>
> Free while we launch. No contract, no card.
>
> You can also sign up in under a minute: rynet.co.za/list-your-stock
>
> [Your name]
> [Phone / WhatsApp]

**Email 2, three days later:** "A quick follow-up: we do all the work, it costs nothing while we
launch, and you get ads you can post today. Five minutes on the phone? I'm on [number]."

---

## 7. Walk-in

> "Hi, I'm [Name] from Rynet, the car marketplace where only checked dealerships sell. It's free
> while we launch, and we do all the work: we load your stock from your website and make your
> Facebook ads. Can I show you? Thirty seconds."

Show a live showroom on your phone, then the Ad studio's square post of one of their own cars
(only after a yes, or one you made privately and show only to them). Then: "If I can take your
stock from your website, you're live today. Who should I send the link to?"

---

## 8. Objections

| They say | You say |
|---|---|
| "We already use AutoTrader and Cars.co.za." | "Keep them. This is one more place buyers find you, free, and we do the work. We never copy your adverts from those sites, only from your own." |
| "I don't have time." | "That's the point. You don't do anything. I take it from your website." |
| "What's the catch?" | "We're launching and want good dealerships on from the start, so it's free. If that changes you'll hear well before, and you decide." |
| "How many buyers do you have?" | "We're signing dealerships now, so I won't give you a number I can't back up. That's why it's free, and why we make your ads ourselves." |
| "Why do you need our CIPC number?" | "Only registered dealerships list on Rynet. It's the reason buyers trust it, and it keeps private sellers off." |
| "Can I see it first?" | Send rynet.co.za/list-your-stock and a live showroom link. |

---

## 9. When a dealership says yes: the admin steps

All on **Admin > Onboard a dealership**.

1. **If they signed up on the site**, they are at the top under **Asked to list**. Press
   **Onboard** and the form fills itself in. Otherwise fill it in from your call.
2. Add the street address and the sentence about how you confirmed them. **Create their
   showroom.** They are verified straight away.
3. **Their cars.** Website: **Check it**, then **Read all**. Spreadsheet: upload the CSV. Cars
   missing a price, mileage or photograph are held back; the desk links straight to them.
4. **Make their ads.** Ad studio, pick their best car, download the square post and the story.
5. **Tell them.** The desk writes the WhatsApp message with their showroom link. Send it, with the
   ads attached, the same day.

---

## 10. Weekly rhythm

Contact twenty new dealerships a week, follow up everyone in the tracker, walk one strip.

Every Friday:

| Number | Where |
|---|---|
| Dealerships contacted, replied, said yes | Your spreadsheet |
| Dealerships live | Admin > Dealerships, Verified |
| Cars live | Admin home, "Cars live on the site" |
| Enquiries passed to dealerships | Admin home, "Enquiries in the last 7 days" |

The number that matters most is **cars live**. Buyers come for stock, and every dealership you sign
makes the next pitch easier.
