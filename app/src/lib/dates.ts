// Local-date helpers. Dates are stored as 'YYYY-MM-DD'.
const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today(): string {
  return toISO(new Date());
}
export function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** b - a in whole days */
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}
export function fmtDate(iso: string): string {
  return parse(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
export function fmtLong(iso: string): string {
  return parse(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
export function dateOf(datetime: string): string {
  return datetime.slice(0, 10);
}
export function nowLocalISO(): string {
  const d = new Date();
  return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
