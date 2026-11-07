# That's my Egg! public website

Official promotional website and development diary. Static HTML and CSS, built
with Node.js, hosted on GitHub Pages, with thatsmyegg.com managed in Cloudflare.
Only this folder belongs in the public website repository. Never copy game
source, private reviews, credentials, reports, or internal development evidence.

## Local preview

Run `npm run build`, `npm run check`, then `npm run dev`.
Open http://127.0.0.1:8898. Stop the owned preview with Ctrl+C.
No package installation or database is needed.

## Add a daily update

Add a record to `content/posts.json`, using the existing post as the schema.
Use a unique date-prefixed slug, a Brisbane calendar date, category, title,
summary, image filename, imageAlt, and sections with headings and paragraphs.
Copy public-safe images into `public/assets/`. Do not backdate or invent work.
Distinguish work in progress from released features and verified gameplay.

Run the build and check commands, review the generated post, then commit and
push to main. GitHub Actions rebuilds and publishes the homepage, archive,
individual articles, RSS feed, and sitemap. Daily posts are an editorial
workflow; no unattended posting automation was created.

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
promotional illustrations, not gameplay screenshots. Asset source paths,
hashes, and export details are in `artwork-manifest.json`. Originals remain in
the private game project. Builder font files are unchanged; see the bundled
font NOTICE for usage terms. No tracking, cookies, player login, or form data
collection is added to this site. Bug reporting links to the existing service.
