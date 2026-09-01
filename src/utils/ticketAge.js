import { parseToDateString } from './formatters';

export const getTicketDate = (ticket) => {
  if (!ticket) return null;
  return parseToDateString(
    ticket.drawDate || ticket.drawTime || ticket.created_at || ticket.date
  );
};

export const getTicketAgeInDays = (ticket, currentDate = new Date()) => {
  const ticketDate = getTicketDate(ticket);
  if (!ticketDate) return null;

  const [year, month, day] = ticketDate.split('-').map(Number);
  const issuedDate = new Date(year, month - 1, day);
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const diffTime = today.getTime() - issuedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const isIncidentReportEligible = (ticket) => {
  const ageInDays = getTicketAgeInDays(ticket);
  return ageInDays !== null && ageInDays > 3;
};
