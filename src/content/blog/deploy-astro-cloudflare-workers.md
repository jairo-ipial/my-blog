---
tags: [ "Astro", "Cloudflare", "Deployment" ]
title: "Deploying a Static Astro Blog to Cloudflare Workers"
description: "Deploying a static Astro website with Wrangler, including
  production URLs, trailing-slash redirects, and custom 404 responses."
pubDate: 2026-10-15
heroImage: '../../assets/deploy-astro-cloudflare-workers.webp'
---

My blog generates static HTML, so deployment did not require a continuously running Node.js application. I used Cloudflare Workers Static Assets to publish Astro’s `dist/` directory.

## Understanding the public address

An early point of confusion was the difference between an account subdomain and a Worker URL.

My account subdomain was:

```text
jairo-ipial.workers.dev
```

Naming the Worker `blog` produced:

```text
blog.jairo-ipial.workers.dev
```

Confirming that distinction mattered because the same address also appears in the site’s SEO metadata.

## Configuring static hosting

The Wrangler configuration points to `dist/`, applies trailing slashes to directory pages, and serves the generated custom 404 page for missing routes.

Locally, Astro accepts both `/blog` and `/blog/`. Canonical metadata consistently prefers `/blog/`, while the Cloudflare configuration redirects visitors to that format.

## Creating a repeatable deployment workflow

The publishing process is:

```bash
npx wrangler login
npm run check
npm run check:types
npm run deploy:check
npm run deploy
```

The dry run builds and validates the deployment without publishing. The final command builds the site again and uploads it.

I initially explored an Oracle VM deployment, then removed that configuration after choosing Cloudflare. Keeping the repository focused on the actual hosting setup made the documentation easier to follow.
