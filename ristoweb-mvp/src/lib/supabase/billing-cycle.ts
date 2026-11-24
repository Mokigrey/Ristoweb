const romeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
});
const displayDate = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
});

export function todayInRome() {
  const parts = Object.fromEntries(romeDate.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatBillingDate(value: string) {
  return displayDate.format(new Date(`${value}T00:00:00Z`));
}

export function isBillingDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
