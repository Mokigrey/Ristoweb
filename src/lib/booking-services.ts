export const appointmentDurations = [15, 30, 45, 60, 90, 120] as const;

export function isAppointmentDuration(value: number) {
  return appointmentDurations.some((duration) => duration === value);
}

export function isBookingId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}
