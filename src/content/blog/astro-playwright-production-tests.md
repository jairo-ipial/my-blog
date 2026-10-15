---
tags: [ "Astro", "Playwright", "Testing" ]
title: "Testing an Astro Website Across Development and Production"
description: "Using Playwright to test mobile layouts, multilingual navigation,
  SEO metadata, and differences between development and production builds."
pubDate: 2026-10-15
heroImage: '../../assets/astro-playwright-production-tests.webp'
---

Browser tests became particularly useful as the site gained SEO metadata and Spanish pages.

The Playwright suite exercises the website at two mobile widths: 320 and 390 pixels. It checks navigation, overflow, images, article tables, RSS, metadata, and custom 404 behavior.

## Testing language behavior

The internationalization tests cover translated pages, language switching, active links, canonical URLs, and language alternates.

They also exercise the flow that previously failed: opening a Spanish page, entering the English blog, reading an article, and returning to the Spanish CV.

A visual assertion checks that the selected language remains highlighted after JavaScript initializes.

## Learning from development-only failures

Two failures revealed differences between the test environment and production.

First, Astro generates sitemap files during builds. A sitemap request against the development server therefore returned 404. I separated that assertion into a production sitemap test, which explicitly skips on the dev server.

Second, blocking all browser storage also affected Astro’s development tools. The revised test denies reads and writes for the application’s language-preference key while leaving unrelated tool storage available.

## Testing the production build

The production workflow is:

```bash
npm run build
npm run preview -- --port 4322
TEST_BASE_URL=http://localhost:4322 npm run test:mobile
npx astro preview stop
```

Testing a built preview ensures generated files are included. Running the same suite against the public URL additionally checks the deployed hosting behavior.
