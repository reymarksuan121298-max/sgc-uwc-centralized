/**
 * Date and Time Formatting Utilities
 * Standardized across Mandaue STL
 */

/**
 * Returns YYYY-MM-DD string in local timezone (avoiding UTC off-by-one shifts)
 */
export const getLocalDateString = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses any date value (timestamp, ISO string, Date object) to YYYY-MM-DD
 */
export const parseToDateString = (dateVal) => {
  if (!dateVal) return null;
  try {
    if (typeof dateVal === 'string' && dateVal.includes('-')) {
      return dateVal.split('T')[0].split(' ')[0];
    }
    const date = new Date(dateVal);
    if (!Number.isNaN(date.getTime())) {
      return getLocalDateString(date);
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * Formats raw draw schedule / draw date into standard STL draw format (e.g. 2PM 2026-08-29 or 2PM)
 */
export const formatDrawTime = (timeStr, drawDate) => {
  if (!timeStr && !drawDate) return 'N/A';
  let rawTime = String(timeStr || '').trim();

  if (/^\d{1,2}$/.test(rawTime)) {
    const hourNum = parseInt(rawTime, 10);
    if (hourNum === 0) rawTime = '12AM';
    else if (hourNum === 12) rawTime = '12PM';
    else if (hourNum > 12) rawTime = `${hourNum - 12}PM`;
    else rawTime = `${hourNum}AM`;
  } else if (rawTime.includes('T') || rawTime.includes(' ')) {
    const parts = rawTime.split(/[\sT]/);
    if (parts.length > 1) {
      const timePart = parts[1].split(':');
      if (timePart.length > 0) {
        const hourNum = parseInt(timePart[0], 10);
        if (!Number.isNaN(hourNum)) {
          if (hourNum === 0) rawTime = '12AM';
          else if (hourNum === 12) rawTime = '12PM';
          else if (hourNum > 12) rawTime = `${hourNum - 12}PM`;
          else rawTime = `${hourNum}AM`;
        }
      }
    }
  }

  const formattedDate = parseToDateString(drawDate || timeStr);
  return formattedDate ? `${rawTime} ${formattedDate}`.trim() : rawTime || 'N/A';
};

/**
 * Fast human-readable timestamp formatter (e.g., Aug 29, 2026, 2:05 PM)
 */
export const fastFormatTimestamp = (timestampStr) => {
  if (!timestampStr) return 'N/A';
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return timestampStr;
  }
};

/**
 * Standard date formatter to words (e.g., August 29, 2026)
 */
export const formatDateToWords = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(dateVal);
  }
};

export default {
  getLocalDateString,
  parseToDateString,
  formatDrawTime,
  fastFormatTimestamp,
  formatDateToWords
};
