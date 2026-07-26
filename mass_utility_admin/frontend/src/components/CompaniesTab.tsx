import React, { useState } from 'react';
import { Company, CompanyListView } from './companies/CompanyListView';
import { CompanyDetailsView } from './companies/CompanyDetailsView';

export type { Company };

interface CompaniesTabProps {
  companies: Company[];
  users: any[];
  licenses: any[];
  tiers?: any[];
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (user: any) => void;
  onEditLicense?: (license: any) => void;
  initialSelectedCompany?: Company | null;
  highlightedLicenseKey?: string | null;
}

export const CompaniesTab: React.FC<CompaniesTabProps> = ({
  companies,
  users,
  licenses,
  tiers = [],
  onRefresh,
  showAlert,
  onInspectClient,
  onEditLicense,
  initialSelectedCompany,
  highlightedLicenseKey,
}) => {
  const [activeSubView, setActiveSubView] = useState<'list' | 'details'>(initialSelectedCompany ? 'details' : 'list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(initialSelectedCompany || null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'licenses' | 'members' | 'settings'>('overview');

  const handleSelectCompany = (company: Company, tab: 'overview' | 'licenses' | 'members' | 'settings' = 'overview') => {
    setSelectedCompany(company);
    setSelectedTab(tab);
    setActiveSubView('details');
  };

  const handleBackToList = () => {
    setActiveSubView('list');
    setSelectedCompany(null);
    setSelectedTab('overview');
  };

  // Keep selectedCompany synchronized with refreshed companies array
  const currentCompany = selectedCompany
    ? companies.find(c => c.id === selectedCompany.id) || selectedCompany
    : null;

  return (
    <div className="space-y-6">
      {activeSubView === 'details' && currentCompany ? (
        <CompanyDetailsView
          company={currentCompany}
          users={users}
          licenses={licenses}
          tiers={tiers}
          initialTab={selectedTab}
          onBack={handleBackToList}
          onRefresh={onRefresh}
          showAlert={showAlert}
          onInspectClient={onInspectClient}
          onEditLicense={onEditLicense}
          highlightedLicenseKey={highlightedLicenseKey || undefined}
        />



      ) : (
        <CompanyListView
          companies={companies}
          users={users}
          licenses={licenses}
          onRefresh={onRefresh}
          showAlert={showAlert}
          onSelectCompany={handleSelectCompany}
        />
      )}
    </div>
  );
};
