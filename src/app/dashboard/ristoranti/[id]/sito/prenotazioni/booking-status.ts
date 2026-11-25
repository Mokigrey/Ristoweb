export const bookingStatuses = {
  pending: "In attesa di conferma",
  confirmed: "Confermate",
  declined: "Rifiutate",
  cancelled: "Annullate",
} as const;

export type BookingStatus = keyof typeof bookingStatuses;

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && Object.hasOwn(bookingStatuses, value);
}
