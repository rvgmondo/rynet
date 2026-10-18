# Posting to dealerships' Facebook and Instagram

Dealerships connect their own Facebook Page in the portal (`/portal/social`), and the Instagram account linked to that Page comes with it. Then they can:

- **Post when they ask.** Ads > pick a car > Post now. The square ad goes to their Page and Instagram within a minute.
- **Post automatically.** Each new car that goes live is posted with its photograph, name and price. At most 3 a day per account, 3 hours apart, between 08:00 and 18:00. Cars already live when they switch it on are not posted, and no car is posted twice.

Rynet only posts. It never reads their messages or their followers.

## What is built

| Part | Where |
| --- | --- |
| Connect, and Facebook sending them back | `src/app/api/portal/social/connect`, `.../callback` |
| Post now from the Ad studio | `src/app/api/portal/social/post`, the Post it panel in `src/components/admin/ad-studio/ad-studio.tsx` |
| The queue, retries, and the minute timer | `src/lib/social/publisher.ts` |
| Automatic posts of new cars, and their spacing | `src/lib/social/queue.ts`, `src/lib/social/slots.ts`, the `afterChange` hook in `src/collections/Vehicles.ts` |
| Talking to Meta | `src/lib/social/meta.ts`, `src/lib/social/http.ts` (ported from Klippy, where each call was checked against Meta's reference) |
| Page tokens, encrypted | `src/lib/social/secrets.ts` (AES-256-GCM under `SOCIAL_TOKEN_KEY`) |
| Pictures Meta fetches | `social-media/` on the host, served at `/social-media/<random>.jpg`, every one re-made as a 1080 square sRGB JPEG |
| The records | Lists and records > Connected social pages, and Social posts, in the admin |

Until the Meta app exists and its details are on the host, the portal says posting is "being switched on" and everything else works as before. Ads can still be downloaded.

## What Ruben has to do (about an hour, plus Meta's waiting time)

Meta will not let an app post to other businesses' Pages until Rynet's business is verified and the app has passed App Review. Nobody can do those for you, and they take days, so start them first.

### 1. The business and the app

1. Go to [developers.facebook.com](https://developers.facebook.com), log in with the Facebook account that runs Rynet's own Page, and register as a developer.
2. In [Meta Business Suite settings](https://business.facebook.com/settings), make sure Rynet has a business portfolio, then start **Business verification** (Security centre). You need the CIPC registration documents and a utility bill or bank letter in the company's name. This is the slow part.
3. Back on developers.facebook.com: **Create app**. Name it "Rynet". Choose the use case **Manage everything on your Page**. Connect it to Rynet's business portfolio.
4. In **App settings > Basic**:
   - App domains: `rynet.co.za`
   - Privacy policy URL: `https://rynet.co.za/privacy`
   - User data deletion: instructions URL, `https://rynet.co.za/privacy` (it must say how a dealership disconnects; see the legal note below)
   - App icon: the Rynet mark, 1024 by 1024
   - Category: Business and pages
5. In **Facebook Login (for Business) > Settings**, add this exact address to **Valid OAuth Redirect URIs**:
   `https://rynet.co.za/api/portal/social/callback`
6. Permissions to ask for, and nothing more: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
   If Meta set the app up with Facebook Login for Business, make a **configuration** with exactly those, and copy its id for step 2 below.

### 2. Put the details on the host (cPanel, no SSH)

cPanel > Setup Node.js App > the Rynet app > Environment variables. Add:

| Name | Value |
| --- | --- |
| `META_APP_ID` | App settings > Basic > App ID |
| `META_APP_SECRET` | App settings > Basic > App secret (Show) |
| `META_CONFIG_ID` | Only if you made a configuration in step 6 |
| `SOCIAL_TOKEN_KEY` | 40 or more random characters. Generate one in a password manager. Keep a copy in the password manager: losing it means every dealership has to connect again |
| `SOCIAL_DRY_RUN` | `1` for the first test (it logs and posts nothing), then remove it |

Save, then Restart the app.

### 3. Try it yourself before App Review

While the app is in Development mode, only people with a role on the app can connect. That is you, which is exactly what is needed for a test:

1. Give yourself a dealer login on the onboarding desk (step 4) for a test dealership, or ask for one to be made.
2. Sign in at `rynet.co.za/portal`, open Social, Connect your Facebook Page, and choose Rynet's own Page.
3. Ads > pick a car > Post now. With `SOCIAL_DRY_RUN=1` the Social page shows it as posted and the log shows what would have gone out. Remove `SOCIAL_DRY_RUN`, restart, and post again for real.

### 4. App Review, then Live

App Review asks for a short screen recording of each permission in use. Record exactly step 3: signing in to the portal, connecting a Page, choosing it, posting an ad, and the post appearing on the Page. Submit every permission in the list above with that one video and one sentence each ("Dealerships post ads of their own cars to their own Page"). When it is approved, switch the app to **Live**. From then on any dealership can connect.

## Requires legal review

- The privacy notice now has a draft section on dealership logins and connected Facebook Pages (18 October 2026), including how to disconnect, which is what Meta asks for as data deletion instructions. It still carries the "Requires legal review" marker until an attorney signs it off. Listed in `docs/CONTENT-NEEDED.md`.

## When something goes wrong

- **A post says "Did not post".** The reason is on the post in Social, and in the admin under Social posts. A retryable fault (Meta busy, rate limit, timeout) is tried again after 5, 15 and 60 minutes before it gives up.
- **"Facebook no longer accepts this connection".** The person who connected changed their password, lost their role on the Page, or removed Rynet in Facebook. The account is marked "Needs connecting again", and Connect fixes it.
- **"The picture is not at a public https address".** `NEXT_PUBLIC_SERVER_URL` on the host is not the public `https://rynet.co.za`. Set `PUBLIC_MEDIA_BASE` to the public address if the two must differ.
- **Turn it all off at once:** `RYNET_SOCIAL=off` on the host and restart. Nothing is posted until it is removed.
