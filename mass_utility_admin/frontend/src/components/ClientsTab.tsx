import React, { useState } from 'react';
import { License, UserAccount } from './LicensesTab';
import { ClientListView } from './clients/ClientListView';
import { ClientDetailsView } from './clients/ClientDetailsView';

interface ClientsTabProps {
  users: UserAccount[];
  licenses: License[];
  companies?: any[];
  tiers?: any[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  initialSelectedUser?: UserAccount | null;
  onInspectCompany?: (company: any) => void;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({ users, licenses, companies = [], tiers = [], onRefresh, showAlert, initialSelectedUser, onInspectCompany }) => {
  const [activeSubView, setActiveSubView] = useState<'list' | 'details'>(initialSelectedUser ? 'details' : 'list');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(initialSelectedUser || null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'edit'>('overview');

  const handleSelectClient = (user: UserAccount, tab: 'overview' | 'edit' = 'overview') => {
    setSelectedUser(user);
    setSelectedTab(tab);
    setActiveSubView('details');
  };

  const handleBackToList = () => {
    setActiveSubView('list');
    setSelectedUser(null);
    setSelectedTab('overview');
  };

  // If viewing details and selectedUser exists, render ClientDetailsView
  if (activeSubView === 'details' && selectedUser) {
    // Sync active user state from latest users array prop if refreshed
    const currentActiveUser = users.find(u => u.id === selectedUser.id) || selectedUser;

    return (
      <ClientDetailsView
        user={currentActiveUser}
        licenses={licenses}
        companies={companies}
        initialTab={selectedTab}
        onBack={handleBackToList}
        onRefresh={onRefresh}
        showAlert={showAlert}
        onInspectCompany={onInspectCompany}
      />
    );
  }


  // Otherwise render primary ClientListView
  return (
    <ClientListView
      users={users}
      licenses={licenses}
      tiers={tiers}
      onRefresh={onRefresh}
      showAlert={showAlert}
      onSelectClient={handleSelectClient}
    />
  );
};

