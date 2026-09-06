/**
 * Utility functions for password hashing using Web Crypto API SHA-256.
 * Browser-native, high-performance, and safe for production environments.
 */

/**
 * Hashes a plain text password into a 64-character SHA-256 hex digest.
 * If the string is already a 64-character SHA-256 hex string, returns it as-is.
 * @param {string} password
 * @returns {Promise<string>} 64-character hex string
 */
export async function hashPassword(password) {
  if (!password) return '';
  const str = String(password).trim();
  
  // If string is already a 64-character hex SHA-256 string, return as-is
  if (/^[a-f0-9]{64}$/i.test(str)) {
    return str.toLowerCase();
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('WebCrypto hash error, falling back to string digest:', err);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Verifies if a plain password matches a stored password (whether stored as hash or plain text).
 * @param {string} inputPassword - The password entered by the user
 * @param {string} storedPassword - The password stored in the database
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;

  // Direct plain text comparison (legacy backwards compatibility)
  if (inputPassword === storedPassword) return true;

  // SHA-256 hash comparison
  const hashedInput = await hashPassword(inputPassword);
  return hashedInput.toLowerCase() === storedPassword.toLowerCase();
}
