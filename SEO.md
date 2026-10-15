# SEO publishing workflow

The production address is https://blog.jairo-ipial.workers.dev/. Astro’s `site` is the source for canonical URLs, social images, RSS, sitemap, and robots.txt. Override `SITE_URL` at build time only when changing the public domain, then rebuild. The Oracle deployment guide describes an alternate deployment and its DuckDNS hostname is not the canonical address for this Cloudflare build.

## Before publishing

- Write a unique title and a specific description that explains what the reader will learn. Use the language your readers use for the problem.
- Focus each article on a concrete engineering question. Include the setup, results, limitations, and useful next steps; link related articles and relevant profile pages descriptively.
- The article layout supplies the single H1. Start Markdown sections at H2, use descriptive link text, and add accurate alt text to informative images. Decorative images can have empty alt text.
- Set an accurate publication date; set `updatedDate` when making substantive changes. Article structured data uses these dates and the author profile.
- Run `npm run check`, `npm run check:types`, and `npm run build`. Inspect the generated metadata, robots.txt, and sitemap before uploading `dist/`.

## After deploying

- Confirm the canonical URLs and preview images resolve publicly on the production domain. Test Home, About, CV, posts, RSS, and the custom 404 response.
- Add the production property to Google Search Console, complete ownership verification, and submit `/sitemap-index.xml`. Inspect important URLs and monitor indexing and search queries.
- Check article structured data with Google’s Rich Results Test and Schema.org’s validator. Structured data does not guarantee a search enhancement.
- Test social previews in the platforms where you share posts. Review Search Console results periodically and improve articles around actual reader questions.
- Keep paths stable. If a path or domain changes, configure permanent redirects and update internal links and the production URL.

`robots.txt` allows crawling; it is not access control. The 404 page has `noindex`. Avoid publishing preview builds as additional indexable copies of production.

## English and Spanish pages

English stays at `/`, `/about/`, and `/cv/`. Spanish lives at `/es/`, `/es/about/`, and `/es/cv/`. Each translated page has its own canonical URL, translated title and description, and reciprocal English/Spanish `hreflang` links. The language switcher preserves the current page and saves the selected language in browser storage. On English-only blog pages, it remains visible and applies the preference to navigation back to translated pages; it does not translate blog content or change blog canonical URLs.

Shared page templates are in `src/components/pages/`. Spanish translations are in `src/i18n/es.json`, keyed by the English text. When changing English copy, update its translation key and Spanish value together. New translatable pages also need route wrappers and an entry in `translatedPaths` in `src/i18n/utils.ts`.

Blog articles, listing pages, tag pages, and RSS remain in English. They have no Spanish alternate URLs. The Spanish homepage links to the English articles and marks their excerpts as English. The static host serves one shared `404.html`, which includes recovery content in both languages.
