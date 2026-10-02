/**
 * Helper to parse a date string "YYYY-MM-DD" or Date object into a pure YYYY-MM-DD Date object in UTC.
 */
export function parseDateUTC(input: Date | string): Date {
  if (typeof input === 'string') {
    const [y, m, d] = input.split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const y = input.getUTCFullYear();
  const m = input.getUTCMonth();
  const d = input.getUTCDate();
  return new Date(Date.UTC(y, m, d));
}

/**
 * Calculates the exact cutoff DateTime for a given delivery date based on
 * kitchen working days, kitchen holidays, and cutoff time configuration.
 *
 * Section 4.6: "Cut-off. Orders for a delivery date lock at a configured time,
 * a configured number of kitchen working days before delivery."
 */
export function calculateCutoffDateTime(
  deliveryDate: Date | string,
  cutoffWorkingDays: number,
  cutoffTime: string, // e.g. "16:00"
  kitchenWorkingDays: number[] = [1, 2, 3, 4, 5], // 1=Mon, ..., 7=Sun
  kitchenHolidayDates: string[] = [], // "YYYY-MM-DD"
): Date {
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const curr = parseDateUTC(deliveryDate);

  let daysCounted = 0;

  // Count backwards day by day until cutoffWorkingDays valid kitchen working days are found
  while (daysCounted < cutoffWorkingDays) {
    curr.setUTCDate(curr.getUTCDate() - 1);

    // 1=Mon, 2=Tue, ..., 7=Sun
    const isoDay = curr.getUTCDay() === 0 ? 7 : curr.getUTCDay();
    const dateStr = curr.toISOString().split('T')[0];

    const isWorkingDay = kitchenWorkingDays.includes(isoDay);
    const isHoliday = kitchenHolidayDates.includes(dateStr);

    if (isWorkingDay && !isHoliday) {
      daysCounted++;
    }
  }

  curr.setUTCHours(hours, minutes, 0, 0);
  return curr;
}

/**
 * Returns true if the cutoff for a given delivery date has passed as of referenceDate.
 */
export function isCutoffPassed(
  deliveryDate: Date | string,
  cutoffWorkingDays: number,
  cutoffTime: string,
  kitchenWorkingDays: number[] = [1, 2, 3, 4, 5],
  kitchenHolidayDates: string[] = [],
  referenceDate: Date = new Date(),
): boolean {
  const cutoffDateTime = calculateCutoffDateTime(
    deliveryDate,
    cutoffWorkingDays,
    cutoffTime,
    kitchenWorkingDays,
    kitchenHolidayDates,
  );
  return referenceDate.getTime() >= cutoffDateTime.getTime();
}
