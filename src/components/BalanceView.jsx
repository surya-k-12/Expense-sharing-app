import React, { useState, useEffect, useCallback } from 'react';
import { balanceService } from '../services/balanceService';
import '../styles/Dashboard.css';

const BalanceView = ({ groupId, currentUserId }) => {
  const [balances, setBalances] = useState([]);
  const [userBalance, setUserBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      // Get all group balances
      const balancesResult = await balanceService.getGroupBalances(groupId);
      if (balancesResult.success) {
        setBalances(balancesResult.balances);
      }

      // Get current user's balance
      const userResult = await balanceService.getUserGroupBalance(groupId, currentUserId);
      if (userResult.success) {
        setUserBalance(userResult.summary);
      }
    } catch (err) {
      console.error('Error loading balances:', err);
    }
    setLoading(false);
  }, [groupId, currentUserId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances, refreshCount]);

  // Setup real-time listener
  useEffect(() => {
    const subscription = balanceService.supabase
      ?.channel('balances-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balances' },
        () => {
          setRefreshCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) return <div className="balance-view"><p>Loading balances...</p></div>;

  return (
    <div className="balance-view">
      <div className="balance-header">
        <h2>💳 Balance View</h2>
        <button onClick={() => setRefreshCount(prev => prev + 1)} className="btn-small">
          🔄 Refresh
        </button>
      </div>

      {/* Your Balance Summary */}
      {userBalance && (
        <div className="user-balance-summary">
          <div className="balance-card owes">
            <h4>You Owe</h4>
            <p className="balance-amount">₹{Number(userBalance.owesAmount).toFixed(2)}</p>
          </div>
          <div className="balance-card owed">
            <h4>Owed to You</h4>
            <p className="balance-amount">₹{Number(userBalance.owesByOthers).toFixed(2)}</p>
          </div>
          <div className={`balance-card net ${parseFloat(userBalance.netBalance) >= 0 ? 'positive' : 'negative'}`}>
            <h4>Net Balance</h4>
            <p className="balance-amount">
              {parseFloat(userBalance.netBalance) >= 0 ? '+' : ''}
              ₹{Number(userBalance.netBalance).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* All Group Balances */}
      <div className="all-balances">
        <h3>All Balances in Group</h3>
        {balances.length === 0 ? (
          <div className="empty-state">
            <p>✓ Everyone is settled up!</p>
          </div>
        ) : (
          <div className="balances-list">
            {balances.map((balance, idx) => (
              <div key={idx} className="balance-item">
                <div className="balance-flow">
                  <span className="debtor-name">
                    {balance.users_debtor_id_fkey?.full_name || balance.users_debtor_id_fkey?.username}
                  </span>
                  <span className="owes-label">owes</span>
                  <span className="creditor-name">
                    {balance.users_creditor_id_fkey?.full_name || balance.users_creditor_id_fkey?.username}
                  </span>
                </div>
                <div className="balance-amount-box">
                  ₹{Number(balance.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceView;
