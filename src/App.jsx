import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import GroupManager from './components/GroupManager';
import BalanceView from './components/BalanceView';
import SettlementHistory from './components/SettlementHistory';
import Analytics from './components/Analytics';
import './styles/App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkAuth();
    setupRealtimeListeners();
  }, []);

  const checkAuth = async () => {
    const result = await authService.getCurrentUser();
    if (result.success) {
      setCurrentUser(result.user);
    }
    setLoading(false);
  };

  // Setup real-time listeners for updates
  const setupRealtimeListeners = () => {
    // Listen for new expenses
    const expensesSubscription = supabase
      .channel('expenses-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    // Listen for new settlements
    const settlementsSubscription = supabase
      .channel('settlements-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => {
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    // Listen for balance updates
    const balancesSubscription = supabase
      .channel('balances-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balances' },
        () => {
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    // Listen for group member changes
    const groupMembersSubscription = supabase
      .channel('group-members-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => {
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      expensesSubscription.unsubscribe();
      settlementsSubscription.unsubscribe();
      balancesSubscription.unsubscribe();
      groupMembersSubscription.unsubscribe();
    };
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSelectedGroup(null);
  };

  const handleGroupCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroup(groupId);
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '50px',
        fontSize: '18px',
        color: '#667eea'
      }}>
        Loading app...
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="app-content">
        {activeTab === 'dashboard' && (
          <>
            <Dashboard 
              currentUserId={currentUser.id} 
              key={refreshTrigger}
              onGroupSelect={handleGroupSelect}
              selectedGroup={selectedGroup}
            />
            <GroupManager
              currentUserId={currentUser.id}
              onGroupCreated={handleGroupCreated}
            />
          </>
        )}

        {activeTab === 'groups' && (
          <div className="tab-content">
            <GroupManager
              currentUserId={currentUser.id}
              onGroupCreated={handleGroupCreated}
            />
            {selectedGroup && (
              <Dashboard 
                currentUserId={currentUser.id}
                key={refreshTrigger}
                onGroupSelect={handleGroupSelect}
                selectedGroup={selectedGroup}
              />
            )}
          </div>
        )}

        {activeTab === 'balances' && selectedGroup ? (
          <BalanceView 
            key={refreshTrigger}
            groupId={selectedGroup} 
            currentUserId={currentUser.id} 
          />
        ) : activeTab === 'balances' ? (
          <div className="tab-content">
            <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>
              Please select a group first from the Dashboard tab
            </p>
          </div>
        ) : null}

        {activeTab === 'settlements' && selectedGroup ? (
          <SettlementHistory 
            key={refreshTrigger}
            groupId={selectedGroup} 
            currentUserId={currentUser.id} 
          />
        ) : activeTab === 'settlements' ? (
          <div className="tab-content">
            <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>
              Please select a group first from the Dashboard tab
            </p>
          </div>
        ) : null}

        {activeTab === 'analytics' && selectedGroup ? (
          <Analytics 
            key={refreshTrigger}
            groupId={selectedGroup} 
            currentUserId={currentUser.id} 
          />
        ) : activeTab === 'analytics' ? (
          <div className="tab-content">
            <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>
              Please select a group first from the Dashboard tab
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
