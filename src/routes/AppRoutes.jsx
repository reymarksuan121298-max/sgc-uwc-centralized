import React from 'react';
import SuperadminDashboard from '../pages/Admin/SuperadminDashboard';
import UserManagement from '../pages/Admin/UserManagement';
import SubOfficeManagement from '../pages/Admin/SubOfficeManagement';
import SystemConfig from '../pages/Admin/SystemConfig';
import RemittanceVerification from '../pages/Admin/RemittanceVerification';
import AuditLogs from '../pages/Admin/AuditLogs';
import TotalCollections from '../pages/Collections/TotalCollections';
import SubOfficeReceipts from '../pages/Receipts/SubOfficeReceipts';
import UnclaimedRegistry from '../pages/Winnings/UnclaimedRegistry';
import ReturnedWinnings from '../pages/Winnings/ReturnedWinnings';
import SettlementAgreement from '../pages/Winnings/SettlementAgreement';
import NotFound from '../pages/NotFound/NotFound';

export default function AppRoutes({
  activeTab,
  setActiveTab,
  currentUser,
  isSuperAdmin,
  // Unclaimed registry props
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  gatewayEndpoints,
  selectedEndpointFilter,
  setSelectedEndpointFilter,
  searchQuery,
  setSearchQuery,
  totals,
  errorMsg,
  showDailyTable,
  setShowDailyTable,
  loading,
  groupedData,
  activeDisplayDate,
  onRowClick,
  onCopySupervisorImage,
  isCapturingImage,
  copiedSupervisorKey,
  copiedSupervisorKeys,
  copiedTransIds,
  formatDrawTime,
  onOpenQrModal,
  // Returned winnings props
  returnedGroupedData,
  returnedFilteredData,
  liveData,
  isLoadingLive,
  onDeleteRecord,
  onDataUpdated,
  onNavigateToSettlement,
  // Settlement agreement props
  selectedSettlementTicketId,
  onSaveAgreement,
  onSyncLedger
}) {
  switch (activeTab) {
    case 'superadmin':
    case 'dashboard':
      return (
        <SuperadminDashboard
          totals={totals}
          data={liveData}
          returnedData={returnedFilteredData}
          formatDrawTime={formatDrawTime}
        />
      );

    case 'unclaimed':
    case 'pending':
      return (
        <UnclaimedRegistry
          currentUser={currentUser}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          isSuperAdmin={isSuperAdmin}
          gatewayEndpoints={gatewayEndpoints}
          selectedEndpointFilter={selectedEndpointFilter}
          setSelectedEndpointFilter={setSelectedEndpointFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totals={totals}
          errorMsg={errorMsg}
          showDailyTable={showDailyTable}
          setShowDailyTable={setShowDailyTable}
          loading={loading}
          groupedData={groupedData}
          activeDisplayDate={activeDisplayDate}
          onRowClick={onRowClick}
          onCopySupervisorImage={onCopySupervisorImage}
          isCapturingImage={isCapturingImage}
          copiedSupervisorKey={copiedSupervisorKey}
          copiedSupervisorKeys={copiedSupervisorKeys}
          copiedTransIds={copiedTransIds}
          formatDrawTime={formatDrawTime}
          onOpenQrModal={onOpenQrModal}
        />
      );

    case 'returned':
      return (
        <ReturnedWinnings
          groupedData={returnedGroupedData}
          filteredData={returnedFilteredData}
          liveData={liveData}
          isLoadingLive={isLoadingLive}
          formatDrawTime={formatDrawTime}
          currentUser={currentUser}
          activeDisplayDate={activeDisplayDate}
          onDeleteRecord={onDeleteRecord}
          onDataUpdated={onDataUpdated}
          onOpenQrModal={onOpenQrModal}
          onNavigateToSettlement={onNavigateToSettlement}
        />
      );

    case 'settlement':
      return (
        <SettlementAgreement
          filteredData={returnedFilteredData}
          onSaveAgreement={onSaveAgreement}
          initialTicketId={selectedSettlementTicketId}
          onSyncLedger={onSyncLedger}
          currentUser={currentUser}
        />
      );

    case 'receipts':
      return (
        <SubOfficeReceipts
          currentUser={currentUser}
        />
      );

    case 'collections':
      return (
        <TotalCollections
          returnedData={returnedFilteredData}
          currentUser={currentUser}
          formatDrawTime={formatDrawTime}
          onDataUpdated={onDataUpdated}
        />
      );

    case 'users':
      return (
        <UserManagement
          currentUser={currentUser}
        />
      );

    case 'suboffices':
      return (
        <SubOfficeManagement
          currentUser={currentUser}
        />
      );

    case 'remittance_verification':
    case 'verification':
      return (
        <RemittanceVerification
          currentUser={currentUser}
        />
      );

    case 'system_config':
    case 'config':
      return (
        <SystemConfig
          currentUser={currentUser}
        />
      );

    case 'audit_logs':
    case 'audit':
      return (
        <AuditLogs
          currentUser={currentUser}
        />
      );

    default:
      return (
        <NotFound
          onGoHome={() => setActiveTab(isSuperAdmin ? 'dashboard' : 'returned')}
        />
      );
  }
}
