// Preserve punctuation to avoid collisions between tags such as C# and C++.
export const tagSlug = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');
export const tagHref = (tag: string) => `/blog/tags/${encodeURIComponent(tagSlug(tag))}/`;
