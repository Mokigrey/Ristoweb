import { isBillingDate, todayInRome } from "./supabase/billing-cycle";

const displayDay = new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeZone: "UTC" });
const romeClock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", timeZoneName: "longOffset" });

export const firstBookingDay = "1900-01-01";
export const lastBookingDay = "9998-12-31";

export function readBookingDay(value: unknown) {
  return isBillingDate(value) && value >= firstBookingDay && value <= lastBookingDay ? value : todayInRome();
}

export function shiftBookingDay(day: string, days: number) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatBookingDay(day: string) {
  return displayDay.format(new Date(day + "T00:00:00Z"));
}

function midnightInRome(day: string) {
  const utc = Date.parse(day + "T00:00:00Z");
  // Rome changes the clock after local midnight, so the offset at UTC midnight is also valid at local midnight.
  const offset = romeClock.formatToParts(utc).find(({ type }) => type === "timeZoneName")?.value;
  const parts = offset?.match(/^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!parts) throw new Error("Impossibile calcolare il fuso orario di Roma.");
  const [, sign, hours, minutes, seconds] = parts;
  const offsetSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds ?? 0);
  return new Date(utc - (sign === "+" ? 1 : -1) * offsetSeconds * 1000).toISOString();
}

export function bookingDayRange(day: string) {
  return { start: midnightInRome(day), end: midnightInRome(shiftBookingDay(day, 1)) };
}
