import React, { useState } from 'react';
import { Company, CompanyListView } from './companies/CompanyListView';
import { CompanyDetailsView } from './companies/CompanyDetailsView';

export type { Company };

interface CompaniesTabProps {
  companies: Company[];
  users: any[];
  licenses: any[];
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
}

export const CompaniesTab: React.FC<CompaniesTabProps> = ({ companies, users, licenses, onRefresh, showAlert }) => {
  const [activeSubView, setActiveSubView] = useState<'list' | 'details'>('list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setActiveSubView('details');
  };

  const handleBackToList = () => {
    setActiveSubView('list');
    setSelectedCompany(null);
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
          onBack={handleBackToList}
          onRefresh={onRefresh}
          showAlert={showAlert}
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
