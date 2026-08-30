export const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidAmount = (amt) => {
  const num = parseFloat(amt);
  return !isNaN(num) && num > 0;
};

export const isValidReferenceNumber = (ref) => {
  return typeof ref === 'string' && ref.trim().length >= 3;
};
