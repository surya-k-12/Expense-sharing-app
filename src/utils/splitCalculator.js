export const splitCalculator = {
  // Calculate equal split
  calculateEqualSplit(amount, participantCount) {
    const perPerson = (parseFloat(amount) / participantCount).toFixed(2);
    return Array(participantCount)
      .fill(null)
      .map(() => parseFloat(perPerson));
  },

  // Calculate exact split
  calculateExactSplit(splits) {
    return splits.map((s) => parseFloat(s));
  },

  // Calculate percentage split
  calculatePercentageSplit(amount, percentages) {
    // Validate percentages sum to 100
    const totalPercent = percentages.reduce((sum, p) => sum + parseFloat(p), 0);

    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error('Percentages must sum to 100');
    }

    return percentages.map(
      (percent) => (parseFloat(amount) * parseFloat(percent)) / 100
    );
  },

  // Validate splits
  validateSplits(amount, splitType, splits) {
    const tolerance = 0.01;

    if (splitType === 'EQUAL' || splitType === 'EXACT') {
      const total = splits.reduce((sum, s) => sum + parseFloat(s), 0);
      return Math.abs(total - parseFloat(amount)) < tolerance;
    }

    if (splitType === 'PERCENTAGE') {
      const total = splits.reduce((sum, s) => sum + parseFloat(s), 0);
      return Math.abs(total - 100) < tolerance;
    }

    return false;
  },
};
