export const ROLES = ['Admin', 'Unclaimed Specialist', 'Sales Service Representative'];

export const formatRoleName = (role) => {
  if (!role) return 'Unclaimed Specialist';
  const r = String(role).trim();
  const lower = r.toLowerCase();
  if (lower === 'admin' || lower === 'super admin') return 'Admin';
  if (lower === 'ssr' || lower.includes('sales') || lower.includes('service') || lower.includes('representative')) {
    return 'Sales Service Representative';
  }
  if (lower === 'staff' || lower.includes('unclaimed') || lower.includes('specialist')) {
    return 'Unclaimed Specialist';
  }
  return r;
};

export const isAdminRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r.includes('admin');
};

export const isSuperAdminRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r.includes('admin');
};

export const isSSRRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'ssr' || r.includes('sales') || r.includes('service') || r.includes('representative');
};

export const isUnclaimedSpecialistRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r.includes('specialist') || r.includes('unclaimed') || r.includes('staff');
};

export const isStaffRole = isUnclaimedSpecialistRole;

export const canApproveDeletionRequests = (role) => {
  const r = String(role || '').toLowerCase();
  return r.includes('admin') || isUnclaimedSpecialistRole(role);
};

export const canViewTab = (userRole, tabId) => {
  if (isAdminRole(userRole)) return true;
  if (isSSRRole(userRole)) {
    return tabId === 'pending' || tabId === 'unclaimed' || tabId === 'returned' || tabId === 'settlement';
  }
  // Unclaimed Specialist:
  const allowedTabs = ['collections', 'pending', 'unclaimed', 'returned', 'receipts', 'settlement', 'verification', 'remittance_verification'];
  return allowedTabs.includes(tabId);
};

export const isOperationalNotification = (action = '', targetType = '') => {
  const a = String(action || '').toUpperCase();
  const t = String(targetType || '').toUpperCase();
  
  // Exclude Admin User / Sub-Office / System Config activities
  if (
    a.startsWith('USER_') || 
    t === 'USER' || 
    a.startsWith('SUB_OFFICE_') || 
    t === 'SUB_OFFICE' || 
    a.includes('SETTINGS') || 
    a.includes('CONFIG') ||
    a.includes('MAINTENANCE')
  ) {
    return false;
  }

  // Allow: Returned Winnings, Incident Reports (IR), Settlement Agreement, Claims, Execution, Receipts, Verification
  return (
    a.includes('RETURN') ||
    a.includes('CLAIM') ||
    a.includes('INCIDENT') ||
    a.includes('IR_') ||
    a.includes('SETTLEMENT') ||
    a.includes('AGREEMENT') ||
    a.includes('PAYMENT') ||
    a.includes('VERIF') ||
    a.includes('RECEIPT') ||
    a.includes('REMIT') ||
    a.includes('TICKET') ||
    a.includes('EXECUTE') ||
    a.includes('TICKET_EXECUTE') ||
    t.includes('RETURN') ||
    t.includes('CLAIM') ||
    t.includes('INCIDENT') ||
    t.includes('IR') ||
    t.includes('SETTLEMENT') ||
    t.includes('AGREEMENT') ||
    t.includes('TICKET') ||
    t.includes('RECEIPT')
  );
};
