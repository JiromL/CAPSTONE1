export function api(path: string) {
  // allows overriding base URL during development
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5001';
  return `${base}${path}`;
}
