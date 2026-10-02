import { calculateCutoffDateTime, isCutoffPassed } from './cutoff.utils';

describe('Cutoff Utilities', () => {
  const defaultWorkingDays = [1, 2, 3, 4, 5]; // Mon-Fri

  it('should lock Wednesday 16:00 delivery at Monday 16:00 (2 working days back)', () => {
    // Wednesday Oct 7, 2026
    const wednesdayDelivery = new Date('2026-10-07T00:00:00Z');
    const cutoff = calculateCutoffDateTime(
      wednesdayDelivery,
      2,
      '16:00',
      defaultWorkingDays,
      [],
    );

    // Should be Monday Oct 5, 2026 16:00 UTC
    expect(cutoff.getUTCDay()).toBe(1); // Monday
    expect(cutoff.getUTCHours()).toBe(16);
    expect(cutoff.getUTCMinutes()).toBe(0);
    expect(cutoff.toISOString().split('T')[0]).toBe('2026-10-05');
  });

  it('should skip weekend days (Sat/Sun) when counting back from Monday', () => {
    // Monday Oct 12, 2026
    const mondayDelivery = new Date('2026-10-12T00:00:00Z');
    const cutoff = calculateCutoffDateTime(
      mondayDelivery,
      2,
      '16:00',
      defaultWorkingDays,
      [],
    );

    // 2 working days back from Monday Oct 12 -> skip Sun 11, Sat 10 -> Day 1 Fri 9, Day 2 Thu 8
    expect(cutoff.getUTCDay()).toBe(4); // Thursday
    expect(cutoff.toISOString().split('T')[0]).toBe('2026-10-08');
  });

  it('should skip kitchen holidays when counting back', () => {
    // Wednesday Oct 7, 2026. Suppose Tuesday Oct 6 is a kitchen holiday
    const wednesdayDelivery = new Date('2026-10-07T00:00:00Z');
    const holidayDate = '2026-10-06'; // Tuesday
    const cutoff = calculateCutoffDateTime(
      wednesdayDelivery,
      2,
      '16:00',
      defaultWorkingDays,
      [holidayDate],
    );

    // Tue skipped -> Day 1 Mon Oct 5, Day 2 Fri Oct 2
    expect(cutoff.getUTCDay()).toBe(5); // Friday
    expect(cutoff.toISOString().split('T')[0]).toBe('2026-10-02');
  });

  it('should correctly evaluate if cutoff has passed', () => {
    const delivery = new Date('2026-10-07T00:00:00Z'); // Wednesday Oct 7
    // Cutoff is Monday Oct 5 16:00 UTC

    const beforeCutoff = new Date('2026-10-05T14:00:00Z'); // Mon 14:00
    const afterCutoff = new Date('2026-10-05T16:01:00Z'); // Mon 16:01

    expect(isCutoffPassed(delivery, 2, '16:00', defaultWorkingDays, [], beforeCutoff)).toBe(false);
    expect(isCutoffPassed(delivery, 2, '16:00', defaultWorkingDays, [], afterCutoff)).toBe(true);
  });
});
