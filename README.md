# That's my Egg! public website

Official Orchard Studios website and development diary for That's my Egg!.
Static pages are built with Node.js and hosted on GitHub Pages, with
thatsmyegg.com managed in Cloudflare.
Only this folder belongs in the public website repository. Never copy game
source, private reviews, credentials, reports, or internal development evidence.

## Local preview

Run `npm test`, `npm run build`, `npm run check`, then `npm run dev`.
Open http://127.0.0.1:8898. Stop the owned preview with Ctrl+C.
No package installation is needed for the static build. Production signups use
the separate private Cloudflare D1 database through the Worker in worker/.

## Add a development update

Add a record to `content/posts.json`, using the existing post as the schema.
Use a unique date-prefixed slug, a Brisbane calendar date, category, title,
summary, image filename, imageAlt, and sections with headings and paragraphs.
Aim for three relevant current images using the cover plus optional section
image, imageAlt and imageCaption fields. Lead with why the player cares and
use concise, dry humour grounded in the actual changes.
Copy public-safe images into `public/assets/`. Do not backdate or invent work.
Distinguish work in progress from released features and verified gameplay.

Run the build and check commands, review the generated post, then commit and
push to main. GitHub Actions rebuilds and publishes the homepage, archive,
individual articles, RSS feed, and sitemap. Daniel authorized the Codex
publisher on 7 November 2026, then changed posts to every four days. The
publication gate uses Brisbane calendar dates and a 9 pm run time. It follows the
private project's DAILY_WEBSITE_UPDATES.md, using verified changes and retaining
evidence outside this public repository.

## Player pages

- /playtest/ checks the submitted Roblox username's format and saves it
  privately before showing confirmation. It does not authenticate Roblox
  ownership or depend on Roblox availability. Case-insensitive duplicate names
  have one record. It does not send friend requests. Credentials stay in Windows
  Credential Manager and Cloudflare secrets, never this repository.
  New entries have a deduplicated email outbox. Email delivery requires the
  configured sender domain and recipient to be enabled in Cloudflare.
- /report-bug/ reuses the existing report form, screenshot annotations and
  private report service. No developer inbox or private report list is served.
- /wiki/ covers 57 creatures and all 14 biomes plus Home. content/public-wiki.json allows only public
  fields; source reviews, scores, asset IDs and internal notes are excluded.
- public/playtest-config.json and report-bug/config.json contain public
  service URLs and Turnstile site keys. They contain no secrets.

## Domain

In GitHub repository Settings, Pages, use GitHub Actions and set the custom
domain to thatsmyegg.com. Verify the domain in the GitHub account first.
In Cloudflare use DNS-only A records for @ with these GitHub Pages addresses:
185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153.
Use a DNS-only CNAME for www pointing to djorchard.github.io. Preserve email
and unrelated records. Enable Enforce HTTPS after GitHub issues its certificate.
The build retains CNAME in the output.

Official references checked 7 November 2026:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages

## Artwork and fonts

Existing project-owned generated artwork is reused. Hero and post cover are
illustrations. The development gallery uses actual captures taken on
7 November 2026. Asset source paths,
hashes, and export details are in `artwork-manifest.json`. Originals remain in
the private game project. Builder font files are unchanged; see the bundled
font NOTICE for usage terms. Signup collects only the Roblox username and
resolved public account ID for arranging playtests. The private database also
retains the signup time and waiting status. No password, email or player login
is requested. Cloudflare Turnstile and rate limiting protect the forms.
