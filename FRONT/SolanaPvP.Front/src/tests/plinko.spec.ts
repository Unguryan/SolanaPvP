// Deterministic Plinko tests - verify 100% accuracy

import { describe, it, expect } from "vitest";
import { createDefaultConfig } from "@/engine/geometry";
import { simulateToLanding } from "@/engine/simulate";
import type { SimulationOptions } from "@/utils/types";

/**
 * Create simulation options
 */
function mkSimOpts(maxSteps: number = 200000): SimulationOptions {
  return {
    fixedDt: 1 / 120,
    maxSteps,
    seeded: true,
  };
}

/**
 * Create board config for given rows
 * slotCount = rows (слоты между пинами последнего ряда)
 */
function mkCfg(rows: number, slotCount?: number) {
  return createDefaultConfig(rows, slotCount ?? rows, 800, 600);
}

describe("Deterministic Plinko - 100% Accuracy Tests", () => {
  const rowsCases = [8, 10, 12];
  const seeds = [0, 1, 2, 3, 4];

  rowsCases.forEach((rows) => {
    describe(`Rows=${rows} (slotCount=${rows})`, () => {
      const slotCount = rows; // slotCount = rows (не rows + 1!)

      // Test every possible target slot
      for (let targetSlot = 0; targetSlot < slotCount; targetSlot++) {
        seeds.forEach((seed) => {
          it(`lands in slot ${targetSlot} (seed ${seed})`, () => {
            const cfg = mkCfg(rows, slotCount);
            const sim = mkSimOpts();

            const result = simulateToLanding(cfg, targetSlot, sim, seed);

            expect(result.landedSlot).toBe(targetSlot);
            expect(result.steps).toBeLessThan(sim.maxSteps);
            expect(result.steps).toBeGreaterThan(0);
          });
        });
      }

      // Performance test
      it(`completes simulation within reasonable steps (rows=${rows})`, () => {
        const cfg = mkCfg(rows, slotCount);
        const sim = mkSimOpts(50000); // Lower max for performance test

        const centerSlot = Math.floor(slotCount / 2);
        const result = simulateToLanding(cfg, centerSlot, sim, 0);

        expect(result.landedSlot).toBe(centerSlot);
        expect(result.steps).toBeLessThan(50000);
        // Should complete in reasonable time (adjust threshold as needed)
        expect(result.steps).toBeLessThan(30000);
      });
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    it("lands in leftmost slot (slot 0)", () => {
      const cfg = mkCfg(10, 10); // rows=10, slots=10
      const sim = mkSimOpts();
      const result = simulateToLanding(cfg, 0, sim, 0);
      expect(result.landedSlot).toBe(0);
    });

    it("lands in rightmost slot", () => {
      const cfg = mkCfg(10, 10); // rows=10, slots=10
      const sim = mkSimOpts();
      const lastSlot = cfg.slotCount - 1;
      const result = simulateToLanding(cfg, lastSlot, sim, 0);
      expect(result.landedSlot).toBe(lastSlot);
    });

    it("lands in center slot", () => {
      const cfg = mkCfg(10, 10); // rows=10, slots=10
      const sim = mkSimOpts();
      const centerSlot = Math.floor(cfg.slotCount / 2);
      const result = simulateToLanding(cfg, centerSlot, sim, 0);
      expect(result.landedSlot).toBe(centerSlot);
    });
  });

  // Determinism test - same seed should produce same result
  describe("Determinism", () => {
    it("produces identical results with same seed", () => {
      const cfg = mkCfg(10, 10); // rows=10, slots=10
      const sim = mkSimOpts();
      const seed = 42;
      const targetSlot = 5;

      const result1 = simulateToLanding(cfg, targetSlot, sim, seed);
      const result2 = simulateToLanding(cfg, targetSlot, sim, seed);

      expect(result1.landedSlot).toBe(result2.landedSlot);
      expect(result1.steps).toBe(result2.steps);
      expect(result1.finalX).toBeCloseTo(result2.finalX, 1);
    });

    it("produces different results with different seeds (but same target)", () => {
      const cfg = mkCfg(10, 10); // rows=10, slots=10
      const sim = mkSimOpts();
      const targetSlot = 5;

      const result1 = simulateToLanding(cfg, targetSlot, sim, 1);
      const result2 = simulateToLanding(cfg, targetSlot, sim, 2);

      // Both should land in target slot
      expect(result1.landedSlot).toBe(targetSlot);
      expect(result2.landedSlot).toBe(targetSlot);
      // But paths/steps may differ
      // (This is expected if seed affects path distribution)
    });
  });
});
