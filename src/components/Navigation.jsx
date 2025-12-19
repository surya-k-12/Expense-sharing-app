import React from 'react';
import { authService } from '../services/authService';
import '../styles/App.css';

const Navigation = ({ currentUser, onLogout, activeTab, onTabChange }) => {
  const handleLogout = async () => {
    await authService.signout();
    onLogout();
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2>💰 Expense Splitter</h2>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => onTabChange('groups')}
        >
          Groups
        </button>
        <button
          className={`nav-tab ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => onTabChange('balances')}
        >
          Balances
        </button>
        <button
          className={`nav-tab ${activeTab === 'settlements' ? 'active' : ''}`}
          onClick={() => onTabChange('settlements')}
        >
          Settlements
        </button>
        <button
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onTabChange('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      <div className="nav-user">
        <span className="user-name">{currentUser?.email}</span>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
