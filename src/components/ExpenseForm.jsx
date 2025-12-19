import React, { useState, useEffect } from 'react';
import { expenseService } from '../services/expenseService';
import { splitCalculator } from '../utils/splitCalculator';
import '../styles/Forms.css';

const ExpenseForm = ({ groupId, currentUserId, onExpenseAdded, members }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paidBy: currentUserId,
    splitType: 'EQUAL',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (members && members.length > 0 && !showForm) {
      setFormData(prev => ({
        ...prev,
        paidBy: prev.paidBy || members[0].id
      }));
    }
  }, [members, showForm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) => {
      const newSelected = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      
      // Auto-calculate splits when members change
      if (newSelected.length > 0 && formData.amount) {
        calculateSplits(formData.splitType, newSelected, formData.amount);
      } else {
        setSplits([]);
      }
      
      return newSelected;
    });
  };

  const handleSplitTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({ ...prev, splitType: newType }));
    if (selectedMembers.length > 0 && formData.amount) {
      calculateSplits(newType, selectedMembers, formData.amount);
    }
  };

  const calculateSplits = (splitType, memberIds, amount) => {
    if (!memberIds.length || !amount) return;

    let calculatedSplits;

    if (splitType === 'EQUAL') {
      calculatedSplits = splitCalculator.calculateEqualSplit(amount, memberIds.length);
    } else if (splitType === 'EXACT') {
      const perPerson = parseFloat(amount) / memberIds.length;
      calculatedSplits = Array(memberIds.length).fill(perPerson);
    } else if (splitType === 'PERCENTAGE') {
      const percentPerPerson = 100 / memberIds.length;
      calculatedSplits = Array(memberIds.length).fill(percentPerPerson);
    }

    setSplits(
      memberIds.map((memberId, idx) => ({
        userId: memberId,
        amount: splitType === 'PERCENTAGE' ? calculatedSplits[idx] : parseFloat(calculatedSplits[idx]).toFixed(2),
        percentage: splitType === 'PERCENTAGE' ? parseFloat(calculatedSplits[idx]).toFixed(2) : null,
      }))
    );
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    handleChange(e);
    if (selectedMembers.length > 0 && amount) {
      calculateSplits(formData.splitType, selectedMembers, amount);
    }
  };

  const handleSplitChange = (idx, value) => {
    const newSplits = [...splits];
    const numValue = parseFloat(value) || 0;
    
    if (formData.splitType === 'PERCENTAGE') {
      newSplits[idx] = {
        ...newSplits[idx],
        amount: numValue.toFixed(2),
        percentage: numValue.toFixed(2),
      };
    } else {
      newSplits[idx] = {
        ...newSplits[idx],
        amount: numValue.toFixed(2),
      };
    }
    
    setSplits(newSplits);
  };

  const getTotalSplitAmount = () => {
    if (formData.splitType === 'PERCENTAGE') {
      return splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0).toFixed(2);
    } else {
      return splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0).toFixed(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.description.trim()) {
        setError('Please enter expense description');
        setLoading(false);
        return;
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (selectedMembers.length === 0) {
        setError('Please select at least one person to split with');
        setLoading(false);
        return;
      }

      // Validate splits based on type
      if (formData.splitType === 'PERCENTAGE') {
        const totalPercent = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
          setError(`Percentages must sum to 100% (current: ${totalPercent.toFixed(2)}%)`);
          setLoading(false);
          return;
        }
        // Convert percentages to amounts
        const validatedSplits = splits.map(s => ({
          ...s,
          amount: ((parseFloat(formData.amount) * parseFloat(s.amount)) / 100).toFixed(2),
          percentage: s.percentage
        }));
        setSplits(validatedSplits);
        await submitExpense(validatedSplits);
      } else {
        // For EQUAL and EXACT, validate amounts
        const totalAmount = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
        if (Math.abs(totalAmount - parseFloat(formData.amount)) > 0.01) {
          setError(`Amounts must equal ₹${parseFloat(formData.amount).toFixed(2)} (current: ₹${totalAmount.toFixed(2)})`);
          setLoading(false);
          return;
        }
        await submitExpense(splits);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const submitExpense = async (splitsToSubmit) => {
    try {
      const result = await expenseService.createExpense({
        groupId,
        paidBy: formData.paidBy,
        description: formData.description,
        amount: formData.amount,
        splitType: formData.splitType,
        splits: splitsToSubmit,
      });

      if (result.success) {
        setFormData({
          description: '',
          amount: '',
          paidBy: currentUserId,
          splitType: 'EQUAL',
        });
        setSelectedMembers([]);
        setSplits([]);
        setShowForm(false);
        setError('');
        onExpenseAdded();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!members || members.length === 0) {
    return (
      <div className="expense-manager">
        <p style={{ color: '#999', padding: '10px' }}>Add members to group first</p>
      </div>
    );
  }

  return (
    <div className="expense-manager">
      <div className="expense-manager-header">
        <h4>Add Expense</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '➕ New Expense'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="expense-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>📝 Expense Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Dinner, Movie tickets, Gas"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>💵 Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>👤 Paid By</label>
              <select
                name="paidBy"
                value={formData.paidBy}
                onChange={handleChange}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>🔀 Split Type</label>
            <div className="split-type-options">
              <label className="radio-label">
                <input
                  type="radio"
                  value="EQUAL"
                  checked={formData.splitType === 'EQUAL'}
                  onChange={handleSplitTypeChange}
                />
                <span>Equal Split</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="EXACT"
                  checked={formData.splitType === 'EXACT'}
                  onChange={handleSplitTypeChange}
                />
                <span>Exact Amount</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="PERCENTAGE"
                  checked={formData.splitType === 'PERCENTAGE'}
                  onChange={handleSplitTypeChange}
                />
                <span>Percentage</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>👥 Split Among ({selectedMembers.length} selected)</label>
            <div className="members-checkboxes">
              {members.map((member) => (
                <label key={member.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span>{member.full_name || member.username}</span>
                </label>
              ))}
            </div>
          </div>

          {splits.length > 0 && (
            <div className="splits-details">
              <div className="splits-header">
                <h5>💰 Split Breakdown</h5>
                <span className="split-total">
                  {formData.splitType === 'PERCENTAGE' 
                    ? `${getTotalSplitAmount()}%` 
                    : `₹${getTotalSplitAmount()}`
                  }
                </span>
              </div>
              <div className="splits-list">
                {splits.map((split, idx) => {
                  const member = members.find((m) => m.id === split.userId);
                  return (
                    <div key={idx} className="split-item">
                      <span className="split-name">
                        {member?.full_name || member?.username}
                      </span>
                      <div className="split-input-group">
                        <input
                          type="number"
                          className="split-input"
                          value={split.amount}
                          onChange={(e) => handleSplitChange(idx, e.target.value)}
                          step="0.01"
                          min="0"
                        />
                        <span className="split-unit">
                          {formData.splitType === 'PERCENTAGE' ? '%' : '₹'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show validation message */}
              {formData.splitType === 'PERCENTAGE' && (
                <div className={`split-validation ${getTotalSplitAmount() === '100.00' ? 'success' : 'warning'}`}>
                  {getTotalSplitAmount() === '100.00' 
                    ? '✓ Percentages sum to 100%' 
                    : `⚠️ Percentages must sum to 100% (current: ${getTotalSplitAmount()}%)`
                  }
                </div>
              )}

              {formData.splitType !== 'PERCENTAGE' && (
                <div className={`split-validation ${getTotalSplitAmount() === formData.amount ? 'success' : 'warning'}`}>
                  {getTotalSplitAmount() === formData.amount
                    ? '✓ Amounts match the total'
                    : `⚠️ Amounts must equal ₹${parseFloat(formData.amount).toFixed(2)} (current: ₹${getTotalSplitAmount()})`
                  }
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary btn-submit" disabled={loading}>
            {loading ? '⏳ Adding...' : '✓ Add Expense'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ExpenseForm;
