const PREVIEW_UNITS = ['s', 'm', 'h', 'd', 'mo', 'y'] as const;
const PREVIEW_UNIT_SIZES = [60, 60, 24, 31, 12];

export function formatPreviewInterval(due: Date, now: Date): string {
  let amount = (due.getTime() - now.getTime()) / 1000;
  let unit = 0;
  while (unit < PREVIEW_UNIT_SIZES.length && amount >= (PREVIEW_UNIT_SIZES[unit] ?? Infinity)) {
    amount /= PREVIEW_UNIT_SIZES[unit] ?? 1;
    unit += 1;
  }
  return `${Math.floor(amount)}${PREVIEW_UNITS[unit] ?? ''}`;
}

export function spokenPreviewInterval(short: string) {
  const units = { s: 'second', m: 'minute', h: 'hour', d: 'day', mo: 'month', y: 'year' } as const;
  const parts = /^(\d+)(s|m|h|d|mo|y)$/.exec(short);
  if (!parts) return short;
  const count = Number(parts[1]);
  return new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit: units[parts[2] as keyof typeof units],
    unitDisplay: 'long',
  }).format(count);
}
