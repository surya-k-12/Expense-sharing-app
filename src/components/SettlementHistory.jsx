import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { balanceService } from '../services/balanceService';
import '../styles/Dashboard.css';

const SettlementHistory = ({ groupId, currentUserId }) => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleData, setSettleData] = useState({ fromUser: '', toUser: '', amount: '' });
  const [settleError, setSettleError] = useState('');
  const [settleSuccess, setSettleSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState([]);

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      // Load settlements with full user details
      const { data, error } = await supabase
        .from('settlements')
        .select(
          `
          id,
          group_id,
          from_user,
          to_user,
          amount,
          settled_at,
          from_user_details:users!settlements_from_user_fkey(id, username, full_name, email),
          to_user_details:users!settlements_to_user_fkey(id, username, full_name, email)
        `
        )
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false });

      if (error) throw error;

      const mappedSettlements = (data || []).map(settlement => ({
        id: settlement.id,
        group_id: settlement.group_id,
        from_user: settlement.from_user,
        to_user: settlement.to_user,
        amount: settlement.amount,
        settled_at: settlement.settled_at,
        from_user_name: settlement.from_user_details?.[0]?.full_name || settlement.from_user_details?.[0]?.username || 'Unknown',
        to_user_name: settlement.to_user_details?.[0]?.full_name || settlement.to_user_details?.[0]?.username || 'Unknown',
      }));

      setSettlements(mappedSettlements);

      // Load balances
      const balancesResult = await balanceService.getGroupBalances(groupId);
      if (balancesResult.success) {
        setBalances(balancesResult.balances);
        
        // Extract unique members from balances
        const uniqueMembers = new Map();
        balancesResult.balances.forEach((balance) => {
          if (balance.users_creditor_id_fkey) {
            uniqueMembers.set(balance.creditor_id, {
              id: balance.creditor_id,
              name: balance.users_creditor_id_fkey.full_name || balance.users_creditor_id_fkey.username,
              email: balance.users_creditor_id_fkey.email,
            });
          }
          if (balance.users_debtor_id_fkey) {
            uniqueMembers.set(balance.debtor_id, {
              id: balance.debtor_id,
              name: balance.users_debtor_id_fkey.full_name || balance.users_debtor_id_fkey.username,
              email: balance.users_debtor_id_fkey.email,
            });
          }
        });
        setMembers(Array.from(uniqueMembers.values()));
      }
    } catch (err) {
      console.error('Error loading settlements:', err);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    setSettleError('');
    setSettleSuccess('');

    if (!settleData.fromUser || !settleData.toUser || !settleData.amount) {
      setSettleError('Please fill in all fields');
      return;
    }

    if (settleData.fromUser === settleData.toUser) {
      setSettleError('From and To must be different people');
      return;
    }

    if (parseFloat(settleData.amount) <= 0) {
      setSettleError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);

    try {
      const fromUser = members.find(m => m.id === settleData.fromUser);
      const toUser = members.find(m => m.id === settleData.toUser);

      if (!fromUser || !toUser) {
        setSettleError('Invalid user selected');
        setSubmitting(false);
        return;
      }

      // Step 1: Record the settlement
      const { error: settlementError } = await supabase.from('settlements').insert([
        {
          group_id: groupId,
          from_user: settleData.fromUser,
          to_user: settleData.toUser,
          amount: parseFloat(settleData.amount),
          settled_at: new Date(),
        },
      ]);

      if (settlementError) throw settlementError;

      // Step 2: Update balances
      const balanceResult = await balanceService.processSettlement(
        groupId,
        settleData.fromUser,
        settleData.toUser,
        settleData.amount
      );

      if (!balanceResult.success) {
        throw new Error(balanceResult.error);
      }

      setSettleSuccess(
        `✓ Payment recorded! ${fromUser.name} paid ${toUser.name} ₹${parseFloat(settleData.amount).toFixed(2)}`
      );
      setSettleData({ fromUser: '', toUser: '', amount: '' });
      
      setTimeout(() => {
        setSettleSuccess('');
        setShowSettleForm(false);
        loadSettlements();
      }, 2000);
    } catch (err) {
      setSettleError('Error recording settlement: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="settlement-history"><p>Loading settlements...</p></div>;

  return (
    <div className="settlement-history">
      <div className="settlement-header">
        <h2>🏦 Settlement History & Payments</h2>
        <button
          className="btn-primary"
          onClick={() => setShowSettleForm(!showSettleForm)}
        >
          {showSettleForm ? '✕ Cancel' : '➕ Record Payment'}
        </button>
      </div>

      {/* Record Settlement Form */}
      {showSettleForm && (
        <form onSubmit={handleRecordSettlement} className="settle-form">
          <h4>Record a Payment</h4>

          {settleError && (
            <div className="error-message" style={{ marginBottom: '15px' }}>
              {settleError}
            </div>
          )}

          {settleSuccess && (
            <div className="success-message" style={{ marginBottom: '15px' }}>
              {settleSuccess}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label>💸 From (Who paid)</label>
              <select
                value={settleData.fromUser}
                onChange={(e) => setSettleData({ ...settleData, fromUser: e.target.value })}
                required
                disabled={submitting}
              >
                <option value="">Select person...</option>
                {members.length > 0 ? (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))
                ) : (
                  <option disabled>No members available</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>💰 To (Who received)</label>
              <select
                value={settleData.toUser}
                onChange={(e) => setSettleData({ ...settleData, toUser: e.target.value })}
                required
                disabled={submitting}
              >
                <option value="">Select person...</option>
                {members.length > 0 ? (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))
                ) : (
                  <option disabled>No members available</option>
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={settleData.amount}
              onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              disabled={submitting}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={submitting || !settleData.fromUser || !settleData.toUser || !settleData.amount}
          >
            {submitting ? '⏳ Recording...' : '✓ Record Payment'}
          </button>
        </form>
      )}

      {/* Settlements List */}
      <div className="settlements-container">
        <h3>Recent Settlements</h3>
        {settlements.length === 0 ? (
          <div className="empty-state">
            <p>📋 No payments recorded yet</p>
            <small>Record payments as members settle their dues</small>
          </div>
        ) : (
          <div className="settlements-list">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="settlement-item">
                <div className="settlement-flow">
                  <div className="settlement-from">
                    <span className="user-name">{settlement.from_user_name}</span>
                    <span className="flow-arrow">→ paid →</span>
                  </div>
                  <div className="settlement-to">
                    <span className="user-name">{settlement.to_user_name}</span>
                  </div>
                </div>
                <div className="settlement-details">
                  <div className="settlement-amount">
                    ₹{Number(settlement.amount).toFixed(2)}
                  </div>
                  <small className="settlement-date">
                    {new Date(settlement.settled_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outstanding Balances Summary */}
      {balances.length > 0 && (
        <div className="outstanding-balances">
          <h3>Outstanding Balances</h3>
          <div className="balances-summary">
            {balances.map((balance, idx) => (
              <div key={idx} className="balance-summary-card">
                <p>
                  <strong>{balance.users_debtor_id_fkey?.full_name || balance.users_debtor_id_fkey?.username}</strong>
                  <span className="owes-text"> owes </span>
                  <strong>{balance.users_creditor_id_fkey?.full_name || balance.users_creditor_id_fkey?.username}</strong>
                </p>
                <p className="balance-amount">
                  ₹{Number(balance.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementHistory;
