// Plinko score breakdown utilities

// Available slot values (symmetric distribution)
// Center = lowest (1), Edges = highest (500)
// const SLOT_VALUES = [500, 250, 200, 150, 100, 75, 50, 20, 10, 5, 1];

/**
 * Get slot values for a specific number of slots (symmetric distribution)
 * @param slotCount - Number of slots (6, 8, or 10)
 * @returns Array of slot values arranged symmetrically
 */
export function getSlotValues(slotCount: number): number[] {
  // Symmetric distribution with CENTER = lowest (нечетное количество!)

  if (slotCount === 5) {
    return [50, 10, 5, 10, 50];
  } else if (slotCount === 7) {
    return [100, 50, 10, 5, 10, 50, 100];
  } else if (slotCount === 9) {
    return [200, 100, 50, 20, 5, 20, 50, 100, 200];
  } else if (slotCount === 11) {
    return [500, 250, 150, 75, 20, 5, 20, 75, 150, 250, 500];
  }

  // Default fallback
  return [50, 10, 5, 10, 50];
}

/**
 * Break down target score into slot combinations
 * Algorithm: prefer larger slots first, then fill remainder
 * @param targetScore - The total score to achieve
 * @param ballCount - Number of balls available (3, 5, or 7)
 * @param slotCount - Number of slots (6, 8, or 10)
 * @returns Array of slot indices to land in
 */
export function breakdownScoreToSlots(
  targetScore: number,
  ballCount: number,
  slotCount: number
): number[] {
  const slotValues = getSlotValues(slotCount);
  const slotIndices: number[] = [];
  let remainingScore = targetScore;

  // Track which slots have been used for each value to ensure variety
  const usedSlotsByValue = new Map<number, number[]>();

  // Helper: Find all slots with a specific value
  const getSlotsWithValue = (value: number): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < slotValues.length; i++) {
      if (slotValues[i] === value) {
        indices.push(i);
      }
    }
    return indices;
  };

  // Helper: Choose a slot with given value, preferring unused slots
  const chooseSlotWithValue = (value: number): number => {
    const availableSlots = getSlotsWithValue(value);
    const usedSlots = usedSlotsByValue.get(value) || [];

    // Find slots that haven't been used yet
    const unusedSlots = availableSlots.filter(
      (slot) => !usedSlots.includes(slot)
    );

    // If all slots with this value have been used, reset and use any slot
    const slotsToChooseFrom =
      unusedSlots.length > 0 ? unusedSlots : availableSlots;

    // Choose randomly from available slots
    const chosenSlot =
      slotsToChooseFrom[Math.floor(Math.random() * slotsToChooseFrom.length)];

    // Track usage
    if (!usedSlotsByValue.has(value)) {
      usedSlotsByValue.set(value, []);
    }
    usedSlotsByValue.get(value)!.push(chosenSlot);

    return chosenSlot;
  };

  // Sort slots by value descending with their indices
  const sortedSlots = slotValues
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);

  for (let i = 0; i < ballCount; i++) {
    if (i === ballCount - 1) {
      // Last ball: find slot closest to remaining score
      let closestIndex = 0;
      let closestDiff = Math.abs(slotValues[0] - remainingScore);

      for (let j = 0; j < slotValues.length; j++) {
        const diff = Math.abs(slotValues[j] - remainingScore);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = j;
        }
      }

      // If multiple slots have the same value, choose variety
      const targetValue = slotValues[closestIndex];
      const finalSlot = chooseSlotWithValue(targetValue);
      slotIndices.push(finalSlot);
      remainingScore -= slotValues[finalSlot];
    } else {
      // Not last ball: prefer larger values but keep some score for later
      const avgNeeded = remainingScore / (ballCount - i);

      // Find slot closest to average needed
      let bestIndex = sortedSlots[0].index;
      let bestDiff = Math.abs(sortedSlots[0].value - avgNeeded);

      for (const slot of sortedSlots) {
        const diff = Math.abs(slot.value - avgNeeded);
        if (diff < bestDiff && slot.value <= remainingScore) {
          bestDiff = diff;
          bestIndex = slot.index;
        }
      }

      // If multiple slots have the same value, choose variety
      const targetValue = slotValues[bestIndex];
      const chosenSlot = chooseSlotWithValue(targetValue);
      slotIndices.push(chosenSlot);
      remainingScore -= slotValues[chosenSlot];
    }
  }

  return slotIndices;
}

/**
 * Calculate path for ball to reach target slot
 * REAL PLINKO PHYSICS: Each row, ball goes LEFT or RIGHT (like a graph)
 * Starting position = center, each bounce moves ±1 in the slot space
 * @param targetSlotIndex - The slot index to land in (0 to slotCount-1)
 * @param rows - Number of rows of pins
 * @param slotCount - Total number of slots
 * @returns Array of directions: -1 (left) or 1 (right) for each row
 */
export function calculateBallPath(
  targetSlotIndex: number,
  rows: number,
  slotCount: number
): number[] {
  //const path: number[] = [];

  // In real Plinko: starting from center, each bounce is -1 (left) or +1 (right)
  // After N rows, position = center + sum(bounces)
  // We need: center + sum(bounces) = targetSlotIndex

  const centerSlot = (slotCount - 1) / 2;
  const neededOffset = targetSlotIndex - centerSlot;

  // We need to move `neededOffset` steps from center
  // Each bounce moves us 1 step left (-1) or right (+1)
  // So we need: (rights - lefts) = neededOffset
  // And: rights + lefts = rows
  // Solving: rights = (rows + neededOffset) / 2

  let rightsNeeded = Math.round((rows + neededOffset) / 2);
  let leftsNeeded = rows - rightsNeeded;

  // Clamp to valid range
  rightsNeeded = Math.max(0, Math.min(rows, rightsNeeded));
  leftsNeeded = rows - rightsNeeded;

  // Build path by randomly mixing lefts and rights
  const directions: number[] = [];
  for (let i = 0; i < rightsNeeded; i++) directions.push(1);
  for (let i = 0; i < leftsNeeded; i++) directions.push(-1);

  // Shuffle for natural look
  for (let i = directions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [directions[i], directions[j]] = [directions[j], directions[i]];
  }

  return directions;
}
