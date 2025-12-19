export const balanceCalculator = {
  // Calculate total owed by user
  calculateTotalOwed(balances, userId) {
    return balances
      .filter((b) => b.debtor_id === userId)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0)
      .toFixed(2);
  },

  // Calculate total owed to user
  calculateTotalCredited(balances, userId) {
    return balances
      .filter((b) => b.creditor_id === userId)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0)
      .toFixed(2);
  },

  // Get user's net balance
  getNetBalance(balances, userId) {
    const owed = this.calculateTotalOwed(balances, userId);
    const credited = this.calculateTotalCredited(balances, userId);
    return (parseFloat(credited) - parseFloat(owed)).toFixed(2);
  },

  // Get balance with specific user
  getBalanceWithUser(balances, userId1, userId2) {
    const balance = balances.find(
      (b) =>
        (b.creditor_id === userId1 && b.debtor_id === userId2) ||
        (b.creditor_id === userId2 && b.debtor_id === userId1)
    );

    if (!balance) return 0;

    if (balance.creditor_id === userId1) {
      return parseFloat(balance.amount);
    } else {
      return -parseFloat(balance.amount);
    }
  },
};
