/**
 * Staff record lists show names as "NAVARRO, Daye". Students read them as "Daye Navarro".
 * Anything that isn't in that "LAST, First" shape is returned unchanged.
 */
export function friendlyName(name?: string | null): string {
  if (!name) return '';
  const m = name.match(/^([^,]+),\s*(.+)$/);
  if (!m || m[1] !== m[1].toUpperCase()) return name;
  const last = m[1].toLowerCase().replace(/(^|[\s'-])\p{L}/gu, c => c.toUpperCase());
  return `${m[2]} ${last}`;
}
