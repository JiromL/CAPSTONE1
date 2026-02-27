export function api(path: string) {
  // allows overriding base URL during development
  const base = process.env.NEXT_PUBLIC_API_BASE || '';
  return `${base}${path}`;
}
