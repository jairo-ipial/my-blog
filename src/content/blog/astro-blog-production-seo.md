---
tags: [ "Astro", "SEO", "Web Development" ]
title: "Preparing an Astro Blog for Production SEO"
description: "How I extended an Astro blog’s metadata with canonical URLs,
  social previews, structured data, robots.txt, and a sitemap."
pubDate: 2026-10-15
heroImage: '../../assets/astro-blog-production-seo.webp'
---

Building a personal blog involves more than publishing HTML. Each page also needs information that helps search engines and social platforms understand its content.

My Astro starter already included a shared `BaseHead.astro` component. I extended that component so metadata remained centralized and pages avoided duplicate tags.

## Establishing the production URL

Astro’s `site` configuration became the source for absolute URLs. Once I settled on Cloudflare Workers, the production address was:

```text
https://blog.jairo-ipial.workers.dev/
```

Canonical links, social images, RSS, and sitemap entries all derive from that address. This prevents local preview URLs from appearing in production metadata.

## Describing pages and articles

Home, About, CV, and the blog listing received distinct titles and descriptions. Blog articles supply their own metadata through Markdown frontmatter.

I also completed Open Graph and Twitter preview fields. Their images use absolute production URLs so external services can retrieve them.

For structured data, the About page describes a `Person`, while articles describe a `BlogPosting` with an author, publication date, update date, and image.

## Making the site discoverable

The sitemap integration generates the public page list during a production build. A generated `robots.txt` allows crawling and references the sitemap index.

These additions provide a technical foundation. They do not guarantee indexing or rankings; useful content, internal links, and monitoring still matter.
