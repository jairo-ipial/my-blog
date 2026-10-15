import spanish from './es.json';

export type Locale = 'en' | 'es';
export function localeFromPath(path: string): Locale {
  return /^\/es(?:\/|$)/.test(path) ? 'es' : 'en';
}
export function localizedPath(path: string, locale: Locale): string {
  return locale === 'es' ? `/es${path}` : path;
}
export function translator(locale: Locale) {
  return (text: string): string => locale === 'es'
    ? (spanish as Record<string, string>)[text] ?? text
    : text;
}
// Only these pages have translations. Blog routes deliberately have none.
export function translatedPaths(path: string) {
  const base = path.replace(/^\/es(?=\/|$)/, '') || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return ['/', '/about/', '/cv/'].includes(normalized)
    ? { en: normalized, es: `/es${normalized}` }
    : undefined;
}
