import React, { useState } from 'react';
import { License, UserAccount } from './LicensesTab';
import { ClientListView } from './clients/ClientListView';
import { ClientDetailsView } from './clients/ClientDetailsView';

interface ClientsTabProps {
  users: UserAccount[];
  licenses: License[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({ users, licenses, onRefresh, showAlert }) => {
  const [activeSubView, setActiveSubView] = useState<'list' | 'details'>('list');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const handleSelectClient = (user: UserAccount) => {
    setSelectedUser(user);
    setActiveSubView('details');
  };

  const handleBackToList = () => {
    setActiveSubView('list');
    setSelectedUser(null);
  };

  // If viewing details and selectedUser exists, render ClientDetailsView
  if (activeSubView === 'details' && selectedUser) {
    // Sync active user state from latest users array prop if refreshed
    const currentActiveUser = users.find(u => u.id === selectedUser.id) || selectedUser;

    return (
      <ClientDetailsView
        user={currentActiveUser}
        licenses={licenses}
        onBack={handleBackToList}
        onRefresh={onRefresh}
        showAlert={showAlert}
      />
    );
  }

  // Otherwise render primary ClientListView
  return (
    <ClientListView
      users={users}
      licenses={licenses}
      onRefresh={onRefresh}
      showAlert={showAlert}
      onSelectClient={handleSelectClient}
    />
  );
};
