// Greedy algorithm to minimize settlements
export const settlementAlgorithm = {
  // Simplify balances to minimum number of transactions
  simplifySettlements(balances) {
    // Create a map of net balances
    const netBalances = {};

    // Calculate net for each person
    balances.forEach((balance) => {
      const creditor = balance.creditor_id;
      const debtor = balance.debtor_id;
      const amount = parseFloat(balance.amount);

      if (!netBalances[creditor]) {
        netBalances[creditor] = 0;
      }
      if (!netBalances[debtor]) {
        netBalances[debtor] = 0;
      }

      netBalances[creditor] += amount;
      netBalances[debtor] -= amount;
    });

    // Separate debtors and creditors
    const debtors = [];
    const creditors = [];

    Object.entries(netBalances).forEach(([userId, balance]) => {
      if (balance < 0) {
        debtors.push({ userId, balance: Math.abs(balance) });
      } else if (balance > 0) {
        creditors.push({ userId, balance });
      }
    });

    // Greedy matching
    const settlements = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amount = Math.min(debtor.balance, creditor.balance);

      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: amount.toFixed(2),
      });

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance === 0) i++;
      if (creditor.balance === 0) j++;
    }

    return settlements;
  },

  // Get settlement suggestions for a user
  getSettlementSuggestions(userId, balances) {
    const suggestions = [];

    balances.forEach((balance) => {
      if (balance.debtor_id === userId) {
        suggestions.push({
          type: 'owe',
          toUser: balance.users_creditor_id_fkey,
          amount: balance.amount,
        });
      } else if (balance.creditor_id === userId) {
        suggestions.push({
          type: 'receive',
          fromUser: balance.users_debtor_id_fkey,
          amount: balance.amount,
        });
      }
    });

    return suggestions;
  },
};
