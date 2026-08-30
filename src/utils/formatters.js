export * from './dateFormatting';
export { default as dateFormatting } from './dateFormatting';

export const formatCurrency = (val) => {
  return `₱${parseFloat(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const superClean = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const getTicketTransId = (item, fallback = '') => {
  if (!item) return fallback;
  return String(item.computedTransId || item.transactionId || item.transId || item.receipt_no || item.ticket_no || item.id || fallback).trim();
};
