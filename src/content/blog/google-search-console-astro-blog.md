---
tags: [ "SEO", "Google Search Console", "Astro" ]
title: "Connecting a New Blog to Google Search Console"
description: "Verifying an Astro blog with Google Search Console and
  investigating sitemap fetch errors without assuming the website is broken."
pubDate: 2026-10-15
heroImage: '../../assets/google-search-console-astro-blog.webp'
---

After deployment, I registered the site in Google Search Console using HTML-file verification.

Astro copies files from `public/` into the build output, so placing Google’s verification file there made it available at the required public URL.

I kept the file in version control so later deployments would preserve it.

## Investigating the sitemap error

Submitting the sitemap produced a “Couldn’t fetch” error.

I checked the deployed sitemap index, its referenced page sitemap, and `robots.txt`. The files returned successful responses, and the sitemap contained the expected production URLs.

Opening XML in a browser displayed a message about missing style information. That message was normal: a sitemap is a data file and does not require a stylesheet.

Submitting the page sitemap directly produced the same Search Console error, so bypassing the index did not resolve it.

## Separating indexing from live availability

Search Console’s stored inspection report initially said the URL was unknown to Google. That did not tell me whether Google could retrieve it at that moment.

The live inspection test subsequently reported that the sitemap URL was available to Google.

That established live accessibility through the inspection tool. It did not establish successful processing by the Sitemaps service, and the underlying cause remained unconfirmed.

## Avoiding unnecessary changes

I also reached the daily indexing-request quota. Repeated requests were no longer useful.

The practical lesson was to distinguish file availability, sitemap processing, and page indexing before changing application code.
