# Report Worker

The app's **Report a problem** form sends reports here. This Cloudflare Worker files each one as an
issue in a **private** GitHub repo, so reporters need no account and reports aren't public. The
code is `worker.ts`; it shares the report kinds and the issue text with the app
(`src/components/map/map-report.ts`).

Until it is deployed and its URL is in `REPORT_ENDPOINT`, the app falls back to opening a
prefilled GitHub issue on the public repo.

## What it does and doesn't do

- **Only creates issues.** There is no endpoint to read, list or change reports. Only people with
  access to the private repo can see them.
- **No personal data.** The app sends the report kind, building, floor, room, the tapped spot and
  the note, nothing about the person. The Worker stores nothing and logs only HTTP status codes.
  The client IP is used only as an in-memory rate-limit key.
- **The token stays secret.** It is a Worker secret, never in the repo or the app, and can only
  touch issues in the reports repo.
- **Abuse limits:** 3 reports a minute per IP and 20 a minute overall (per Cloudflare location),
  a 4 KB size cap, strict field checks, and the note in a code block (no @mentions or links).
  Only the site and `localhost:8081` may call it from a browser.

## Setup (once)

1. **Make the private repo.** On GitHub: New repository, name `mavigator-reports`, **Private**,
   with a README so it isn't empty. Add teammates under Settings > Collaborators to let them see
   reports. A different name or owner goes in `GITHUB_REPO` in `wrangler.toml`.
2. **Make the token.** GitHub > Settings > Developer settings > Personal access tokens >
   **Fine-grained tokens** > Generate new token:
   - Repository access: **Only select repositories** > `mavigator-reports`
   - Permissions > Repository permissions > **Issues: Read and write** (nothing else)
   - Expiration: after the course ends (e.g. January 2027)
   Copy the token; GitHub shows it once.
3. **Make a free Cloudflare account** at dash.cloudflare.com/sign-up. The free Workers plan needs
   no credit card.
4. **Deploy.** From this folder:
   ```sh
   cd tools/report-worker
   npx wrangler login                    # opens the browser to sign in to Cloudflare
   npx wrangler secret put GITHUB_TOKEN  # paste the token when asked
   npx wrangler deploy
   ```
   The first deploy asks for a workers.dev subdomain. It ends by printing the Worker's URL,
   `https://mavigator-reports.<subdomain>.workers.dev`.
5. **Point the app at it.** Put that URL in `REPORT_ENDPOINT` in
   `src/components/map/map-report.ts`, commit and push. Reports from the live site then go
   straight to the private repo.

## Later

- **Rotate the token:** make a new one, `npx wrangler secret put GITHUB_TOKEN`, delete the old one.
- **Turn it off** (e.g. after the course): `npx wrangler delete`, set `REPORT_ENDPOINT` back to `''`,
  and delete the token.
- **Testing from a phone on the dev server:** add its origin (`http://<PC's LAN IP>:8081`) to
  `ALLOWED_ORIGINS` and deploy again.

## Cost

Free. The Workers Free plan allows 100,000 requests a day; past that, requests fail with an error
until midnight UTC, and nothing is billed. Private repos and fine-grained tokens are free on GitHub.
