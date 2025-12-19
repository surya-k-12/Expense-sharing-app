import React, { useState, useEffect } from 'react';
import { expenseService } from '../services/expenseService';
import { balanceService } from '../services/balanceService';
import { supabase } from '../services/supabaseClient';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/Analytics.css';

const Analytics = ({ groupId, currentUserId }) => {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseStats, setExpenseStats] = useState({});
  const [balanceStats, setBalanceStats] = useState({});

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30b0fe'];

  const calculateExpenseStats = React.useCallback((expensesList) => {
    if (expensesList.length === 0) {
      setExpenseStats({ total: 0, count: 0, average: 0, byType: [] });
      return;
    }

    const total = expensesList.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const average = total / expensesList.length;

    // Group by split type
    const byType = {};
    expensesList.forEach((expense) => {
      const type = expense.split_type;
      if (!byType[type]) {
        byType[type] = { name: type, value: 0, count: 0 };
      }
      byType[type].value += parseFloat(expense.amount);
      byType[type].count += 1;
    });

    // Group by person who paid
    const byPerson = {};
    expensesList.forEach((expense) => {
      const person = expense.users?.full_name || expense.users?.username || 'Unknown';
      if (!byPerson[person]) {
        byPerson[person] = { name: person, value: 0 };
      }
      byPerson[person].value += parseFloat(expense.amount);
    });

    setExpenseStats({
      total: total.toFixed(2),
      count: expensesList.length,
      average: average.toFixed(2),
      byType: Object.values(byType),
      byPerson: Object.values(byPerson),
    });
  }, []);

  const calculateBalanceStats = React.useCallback((balancesList) => {
    if (balancesList.length === 0) {
      setBalanceStats({ totalOwed: 0, totalCredit: 0, settled: 0 });
      return;
    }

    let totalOwed = 0;
    let totalCredit = 0;

    balancesList.forEach((balance) => {
      totalOwed += parseFloat(balance.amount);
      totalCredit += parseFloat(balance.amount);
    });

    setBalanceStats({
      totalOwed: totalOwed.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      settled: settlements.length,
    });
  }, [settlements.length]);

  const loadAnalyticsData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Load expenses
      const expensesResult = await expenseService.getGroupExpenses(groupId);
      if (expensesResult.success) {
        setExpenses(expensesResult.expenses);
        calculateExpenseStats(expensesResult.expenses);
      }

      // Load balances
      const balancesResult = await balanceService.getGroupBalances(groupId);
      if (balancesResult.success) {
        setBalances(balancesResult.balances);
        calculateBalanceStats(balancesResult.balances);
      }

      // Load settlements
      const { data: settlementsData } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId);
      
      setSettlements(settlementsData || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
    setLoading(false);
  }, [groupId, calculateExpenseStats, calculateBalanceStats]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Prepare timeline data for expenses
  const getTimelineData = () => {
    const timeline = {};
    expenses.forEach((expense) => {
      const date = new Date(expense.created_at).toLocaleDateString('en-IN');
      if (!timeline[date]) {
        timeline[date] = { date, amount: 0, count: 0 };
      }
      timeline[date].amount += parseFloat(expense.amount);
      timeline[date].count += 1;
    });
    return Object.values(timeline).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Prepare balance distribution data
  const getBalanceDistribution = () => {
    const distribution = {};
    balances.forEach((balance) => {
      const debtor = balance.users_debtor_id_fkey?.full_name || 
                     balance.users_debtor_id_fkey?.username || 'Unknown';
      if (!distribution[debtor]) {
        distribution[debtor] = { name: debtor, value: 0 };
      }
      distribution[debtor].value += parseFloat(balance.amount);
    });
    return Object.values(distribution);
  };

  if (loading) return <div className="analytics-loading">Loading analytics...</div>;

  const timelineData = getTimelineData();
  const balanceDistribution = getBalanceDistribution();

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>📊 Group Analytics & Insights</h2>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h4>Total Expenses</h4>
            <p className="stat-value">₹{expenseStats.total}</p>
            <small>{expenseStats.count} transactions</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h4>Average Expense</h4>
            <p className="stat-value">₹{expenseStats.average}</p>
            <small>Per transaction</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h4>Outstanding Balance</h4>
            <p className="stat-value">₹{balanceStats.totalOwed}</p>
            <small>Total amount owed</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h4>Settlements</h4>
            <p className="stat-value">{balanceStats.settled}</p>
            <small>Payments recorded</small>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Expense Timeline */}
        {timelineData.length > 0 && (
          <div className="chart-card">
            <h3>📅 Expenses Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => `₹${value}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={{ fill: '#667eea' }}
                  name="Amount (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expenses by Person */}
        {expenseStats.byPerson && expenseStats.byPerson.length > 0 && (
          <div className="chart-card">
            <h3>👥 Expenses by Person</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseStats.byPerson}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => `₹${value.toFixed(2)}`}
                />
                <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Split Type Distribution */}
        {expenseStats.byType && expenseStats.byType.length > 0 && (
          <div className="chart-card">
            <h3>🔀 Split Types Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseStats.byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (₹${value.toFixed(0)})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseStats.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Balance Distribution */}
        {balanceDistribution.length > 0 && (
          <div className="chart-card">
            <h3>💸 Who Owes What</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={balanceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => `₹${value.toFixed(2)}`}
                />
                <Bar dataKey="value" fill="#ff6b6b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="empty-analytics">
          <p>📊 No data available yet. Add expenses to see analytics!</p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
