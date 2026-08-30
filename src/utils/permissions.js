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
