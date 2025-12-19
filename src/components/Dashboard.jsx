import React, { useState, useEffect, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { balanceService } from '../services/balanceService';
import ExpenseForm from './ExpenseForm';
import '../styles/Dashboard.css';

const Dashboard = ({ currentUserId, onGroupSelect, selectedGroup }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');
  const [members, setMembers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadGroupDetails = useCallback(async (groupId) => {
    try {
      const detailsResult = await groupService.getGroupDetails(groupId);
      if (detailsResult.success) {
        setGroupDetails(detailsResult.group);
        setMembers(detailsResult.members);
      }

      const expensesResult = await expenseService.getGroupExpenses(groupId);
      if (expensesResult.success) {
        setExpenses(expensesResult.expenses);
      }

      // Get latest balance data
      const balanceResult = await balanceService.getUserGroupBalance(
        groupId,
        currentUserId
      );
      if (balanceResult.success) {
        setBalanceSummary(balanceResult.summary);
      }
    } catch (err) {
      console.error('Error loading group details:', err);
    }
  }, [currentUserId]);


  const loadGroups = useCallback(async () => {
    setLoading(true);
    const result = await groupService.getUserGroups(currentUserId);
    if (result.success) {
      setGroups(result.groups);
      if (selectedGroup) {
        const found = result.groups.find(g => g.id === selectedGroup);
        if (found) {
          loadGroupDetails(selectedGroup);
        }
      }
    }
    setLoading(false);
  }, [currentUserId, selectedGroup, loadGroupDetails]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups, refreshTrigger]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup);
    }
  }, [selectedGroup, loadGroupDetails]);

  const handleGroupSelect = (groupId) => {
    onGroupSelect(groupId);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      setAddMemberError('Please enter an email');
      return;
    }

    setAddingMember(true);
    setAddMemberError('');
    setAddMemberSuccess('');

    try {
      // Search for user by email
      const searchResult = await groupService.searchUserByEmail(newMemberEmail.trim());
      
      if (!searchResult.success) {
        setAddMemberError(searchResult.error);
        setAddingMember(false);
        return;
      }

      const user = searchResult.user;

      // Check if user is the current user
      if (user.id === currentUserId) {
        setAddMemberError('You are already a member of this group');
        setAddingMember(false);
        return;
      }

      // Add member to group
      const addResult = await groupService.addGroupMember(selectedGroup, user.id);

      if (addResult.success) {
        setAddMemberSuccess(`${user.full_name || user.username} added successfully!`);
        setNewMemberEmail('');
        setTimeout(() => {
          setAddMemberSuccess('');
          setRefreshTrigger(prev => prev + 1);
        }, 2000);
      } else {
        setAddMemberError(addResult.error);
      }
    } catch (err) {
      setAddMemberError('Error adding member: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Remove this member from the group?')) {
      try {
        const result = await groupService.removeGroupMember(selectedGroup, memberId);
        if (result.success) {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        alert('Error removing member: ' + err.message);
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Delete this group? This cannot be undone.')) {
      try {
        const result = await groupService.deleteGroup(selectedGroup);
        if (result.success) {
          onGroupSelect(null);
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        alert('Error deleting group: ' + err.message);
      }
    }
  };

  const handleExpenseAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) return <div className="dashboard-loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>💰 Your Groups & Expenses</h2>
      </div>

      <div className="dashboard-container">
        {/* Groups List */}
        <div className="groups-list-container">
          <h3>Your Groups</h3>
          {groups.length === 0 ? (
            <p className="empty-message">No groups yet. Create one!</p>
          ) : (
            <div className="groups-list">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`group-card ${selectedGroup === group.id ? 'selected' : ''}`}
                  onClick={() => handleGroupSelect(group.id)}
                >
                  <h4>📌 {group.group_name}</h4>
                  <p>{group.description || 'No description'}</p>
                  <small className="group-members-count">
                    👥 Members: {group.memberCount || 1}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Details & Expenses */}
        {selectedGroup && groupDetails && (
          <div className="group-details-container">
            {/* Group Info */}
            <div className="group-info-card">
              <div className="group-info-header">
                <div>
                  <h3>{groupDetails.group_name}</h3>
                  <p>{groupDetails.description || 'No description'}</p>
                </div>
                <div className="group-actions">
                  <button 
                    className="btn-small btn-delete" 
                    onClick={handleDeleteGroup}
                    title="Delete group"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Balance Summary */}
              {balanceSummary && (
                <div className="balance-summary">
                  <div className="summary-card owes">
                    <label>You Owe</label>
                    <p className="amount">₹{Number(balanceSummary.owesAmount).toFixed(2)}</p>
                  </div>
                  <div className="summary-card owed">
                    <label>Owed to You</label>
                    <p className="amount">₹{Number(balanceSummary.owesByOthers).toFixed(2)}</p>
                  </div>
                  <div
                    className={`summary-card net ${
                      parseFloat(balanceSummary.netBalance) >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    <label>Net Balance</label>
                    <p className="amount">
                      {parseFloat(balanceSummary.netBalance) >= 0 ? '+' : ''}
                      ₹{Number(balanceSummary.netBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="members-section">
                <div className="members-header">
                  <h4>👥 Members ({members.length})</h4>
                  <button
                    className="btn-small"
                    onClick={() => setShowAddMember(!showAddMember)}
                  >
                    {showAddMember ? '✕ Cancel' : '➕ Add Member'}
                  </button>
                </div>

                {showAddMember && (
                  <div className="add-member-form">
                    {addMemberError && (
                      <div className="error-message" style={{ marginBottom: '10px' }}>
                        {addMemberError}
                      </div>
                    )}
                    {addMemberSuccess && (
                      <div className="success-message" style={{ marginBottom: '10px' }}>
                        ✓ {addMemberSuccess}
                      </div>
                    )}
                    <input
                      type="email"
                      placeholder="Enter email to add member"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !addingMember && handleAddMember()}
                      disabled={addingMember}
                    />
                    <button 
                      onClick={handleAddMember} 
                      className="btn-small"
                      disabled={addingMember}
                    >
                      {addingMember ? '⏳ Adding...' : 'Add'}
                    </button>
                  </div>
                )}

                <div className="members-list">
                  {members.map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <span className="member-name">{member.full_name || member.username}</span>
                        <small className="member-email">{member.email}</small>
                      </div>
                      {member.id !== currentUserId && (
                        <button
                          className="btn-remove"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove member"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Expense & Expenses List */}
            <div className="expenses-container">
              <ExpenseForm
                groupId={selectedGroup}
                currentUserId={currentUserId}
                onExpenseAdded={handleExpenseAdded}
                members={members}
              />

              {/* Expenses History */}
              <div className="expenses-history">
                <h4>💸 Expenses History</h4>
                {expenses.length === 0 ? (
                  <p className="empty-message">No expenses yet</p>
                ) : (
                  <div className="expenses-list">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="expense-item">
                        <div className="expense-main">
                          <div className="expense-info">
                            <h5>{expense.description}</h5>
                            <small>
                              Paid by <strong>{expense.users?.full_name || expense.users?.username}</strong>
                            </small>
                          </div>
                          <div className="expense-amount">
                            ₹{Number(expense.amount).toFixed(2)}
                          </div>
                        </div>
                        <div className="expense-splits">
                          <small>
                            <strong>Split type:</strong> {expense.split_type} |{' '}
                            <strong>Split among {expense.expense_splits?.length} people</strong>
                          </small>
                          <div className="splits-breakdown">
                            {expense.expense_splits?.map((split, idx) => (
                              <span key={idx} className="split-badge">
                                {split.users?.username}: ₹{Number(split.amount).toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <small className="expense-date">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Group Selected */}
        {!selectedGroup && (
          <div className="no-group-selected">
            <p>📋 Select a group to view details and add expenses</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
