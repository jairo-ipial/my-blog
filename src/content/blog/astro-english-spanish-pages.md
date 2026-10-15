---
tags: [ "Astro", "Internationalization", "Web Development" ]
title: "Adding English and Spanish Pages Without Translating the Blog"
description: "Adding English and Spanish routes to an Astro website while
  keeping blog articles in English and preserving language preferences."
pubDate: 2026-10-15
heroImage: '../../assets/astro-english-spanish-pages.webp'
---

I wanted my profile pages to support English and Spanish while leaving technical articles in English.

The routing structure preserves the original English URLs:

```text
/
/about/
/cv/
```

Spanish pages live under a separate prefix:

```text
/es/
/es/about/
/es/cv/
```

## Sharing layouts between languages

Instead of maintaining separate copies of every page, I moved page templates into shared components. A translation dictionary supplies Spanish copy based on the current route.

This keeps layout changes consistent across both languages. It also means English copy changes need corresponding updates to translation keys and Spanish values.

## Connecting translated pages

Each translated page has its own canonical URL, translated title and description, and reciprocal `hreflang` links.

Blog pages have no Spanish alternate URLs. On the Spanish homepage, article excerpts remain English and are marked with the appropriate language attribute.

## Preserving the visitor’s choice

The first version lost the language selector when visitors entered the blog. I changed it so the selector stays visible and saves the preferred language in browser storage.

On English-only blog pages, the preference controls navigation back to Home, About, and CV. It does not translate the article.

If storage is unavailable, navigation still works. The preference simply cannot reliably persist between page loads.
