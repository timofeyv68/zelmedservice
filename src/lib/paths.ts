/** Prefix path with Astro `base` (needed for GitHub Pages project sites). */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL || '/';
  if (!path || path === '/') return base;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}

export function asset(path: string): string {
  return url(path);
}
