import { roundUpToNext5Cents, calculateDerivedPriceCents, formatCentsToUSD } from './pricing.utils';

describe('Pricing Utilities', () => {
  describe('roundUpToNext5Cents', () => {
    it('should leave exact 5-cent multiples unchanged', () => {
      expect(roundUpToNext5Cents(200)).toBe(200); // $2.00
      expect(roundUpToNext5Cents(215)).toBe(215); // $2.15
      expect(roundUpToNext5Cents(250)).toBe(250); // $2.50
    });

    it('should round up to the next 5-cent boundary according to assignment rules', () => {
      expect(roundUpToNext5Cents(211)).toBe(215); // $2.11 -> $2.15
      expect(roundUpToNext5Cents(201)).toBe(205); // $2.01 -> $2.05
      expect(roundUpToNext5Cents(214)).toBe(215); // $2.14 -> $2.15
      expect(roundUpToNext5Cents(216)).toBe(220); // $2.16 -> $2.20
    });
  });

  describe('calculateDerivedPriceCents', () => {
    it('should calculate derived price with percentage or multiplier and round up to 5 cents', () => {
      // Cost 450 cents * 2.4 = 1080 cents -> 1080 cents
      expect(calculateDerivedPriceCents(450, 2.4)).toBe(1080);

      // Standard 1200 cents * 1.15 = 1380 cents -> 1380 cents
      expect(calculateDerivedPriceCents(1200, 1.15)).toBe(1380);

      // 1201 * 1.15 = 1381.15 -> ceil 1382 -> round to 1385
      expect(calculateDerivedPriceCents(1201, 1.15)).toBe(1385);
    });
  });

  describe('formatCentsToUSD', () => {
    it('should format cents into formatted USD string', () => {
      expect(formatCentsToUSD(1550)).toBe('$15.50');
      expect(formatCentsToUSD(215)).toBe('$2.15');
      expect(formatCentsToUSD(0)).toBe('$0.00');
    });
  });
});
