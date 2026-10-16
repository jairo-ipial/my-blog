# Deploy to Cloudflare Workers

This Astro project builds static HTML into `dist/`. Wrangler uploads that directory as Workers Static Assets; no Astro adapter or server code is needed.

## Confirm the public URL first

Workers URLs normally have the form `https://<worker-name>.<account-subdomain>.workers.dev`. The Worker name in `wrangler.jsonc` is `blog`. Your confirmed account subdomain is `jairo-ipial.workers.dev`, so this configuration publishes at `https://blog.jairo-ipial.workers.dev/`. The previously supplied `https://jairo-ipial.workers.dev/` may be an account subdomain rather than the address of an individual Worker.

Set the confirmed full URL as `site` in `astro.config.mjs`, or export it before building:

```bash
export SITE_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/
```

This environment variable must be available during the build, because canonical URLs, social images, RSS, and the sitemap are generated then.

## Authenticate and validate

Use Node.js 22.12+ and run these from the project root:

```bash
npm ci
npx wrangler login
npx wrangler whoami
npm run check
npm run check:types
npm run deploy:check
```

Login opens Cloudflare authorization in a browser. In WSL, open the displayed login URL in your Windows browser if needed. Never put API tokens in source control or chat.

Review `wrangler.jsonc`, confirm the account and Worker name, then publish:

```bash
npm run deploy
```

This builds the site and publishes it publicly. If a Worker with that name already exists in the chosen account, deploying updates that Worker.

## Verify

Use the actual URL reported by Wrangler:

```bash
export BLOG_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
curl -I "$BLOG_URL/"
curl -I "$BLOG_URL/blog"
curl -I "$BLOG_URL/blog/"
curl -I "$BLOG_URL/cv/"
curl -I "$BLOG_URL/rss.xml"
curl -I "$BLOG_URL/robots.txt"
curl -I "$BLOG_URL/sitemap-index.xml"
curl -I "$BLOG_URL/nonexistent-page-check/"
```

Expect existing pages to return 200, `/blog` to redirect to `/blog/`, and missing pages to return 404 with the custom recovery content. Check page source for production canonical and image URLs. Submit the sitemap in Search Console after ownership verification.

For updates, repeat `npm run deploy` with the same production `SITE_URL`. Cloudflare’s deployment history provides rollback controls.

## Verify Google Search Console ownership

The file `public/google9c4402f6e089b1fd.html` is included automatically in the deployment. Confirm that this public URL loads and contains the verification text:

https://blog.jairo-ipial.workers.dev/google9c4402f6e089b1fd.html

Then click **Verify** in Google Search Console for the matching site property.

Keep the verification file in the project so it remains available after future deployments.

## Submit the sitemap and check the site

In Google Search Console, submit:

```text
https://blog.jairo-ipial.workers.dev/sitemap-index.xml
```

Check Home, About, CV, the Spanish pages under `/es/`, and a blog article. Confirm the language selector works and a missing URL returns the custom 404 page.

## Optional Git builds

Connect the repository using Workers Builds in Cloudflare. Use the repository root, build command `npm run build`, deploy command `npx wrangler deploy`, and set `SITE_URL` to the confirmed public URL in build variables. Choose a Node version compatible with package.json. Keep the Worker name aligned with wrangler.jsonc.

## References

- https://developers.cloudflare.com/workers/static-assets/get-started/
- https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

## Browser security headers

`public/_headers` is copied to `dist/_headers` during the build. Cloudflare Workers Static Assets applies its rules when serving static assets:

- `X-Content-Type-Options: nosniff` prevents MIME-type sniffing.
- `X-Frame-Options: DENY` prevents other sites from embedding the pages in frames.
- `Referrer-Policy: strict-origin-when-cross-origin` limits referrer details sent to other origins.
- `Permissions-Policy` disables camera, microphone, and geolocation access.

These policies do not add authentication or restrict search-engine crawling. CSP requires a separate review of scripts, styles, and embeds before enforcement.

Astro dev and preview do not apply Cloudflare's `_headers` rules. To verify locally, first build and start Wrangler's local runtime in one terminal:

```bash
npm run build
npx wrangler dev --port 8787
```

In another terminal:

```bash
TEST_CLOUDFLARE=1 TEST_BASE_URL=http://localhost:8787 npm run test:mobile -- security.spec.ts
```

Stop Wrangler with Ctrl+C. After deployment, verify the actual hosted responses:

```bash
curl -I https://blog.jairo-ipial.workers.dev/
TEST_CLOUDFLARE=1 TEST_BASE_URL=https://blog.jairo-ipial.workers.dev npm run test:mobile -- security.spec.ts
```

Reference: https://developers.cloudflare.com/workers/static-assets/headers/

## Google verification URL handling

Cloudflare's `force-trailing-slash` HTML handling normally redirects standalone `.html` files. `public/_redirects` adds a single internal 200 rewrite from `/google9c4402f6e089b1fd.html` to the asset's normalized path. Google receives the verification text directly at its required URL; regular page trailing-slash redirects remain enabled.

The Cloudflare security suite checks the verification response with redirect following disabled, plus normal page redirects and a missing-page 404. Keep the verification file and its matching rewrite together if Google issues a replacement file.
