import { supabase } from '../config/supabaseClient';
import { hashPassword, verifyPassword } from '../utils/cryptoUtils';

export const authService = {
  async login(username, password) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      throw new Error('Invalid username or password.');
    }

    const isMatch = await verifyPassword(password, data.password);
    if (!isMatch) {
      throw new Error('Invalid username or password.');
    }

    if (data.is_active === false) {
      throw new Error('This account has been disabled. Please contact your Super Administrator.');
    }

    // Auto-migrate legacy plain text passwords in database to SHA-256 hash
    const hashedInput = await hashPassword(password);
    if (data.password !== hashedInput) {
      try {
        await supabase
          .from('app_users')
          .update({ password: hashedInput })
          .eq('id', data.id);
        data.password = hashedInput;
      } catch (migrateErr) {
        console.warn('Could not auto-migrate password hash:', migrateErr);
      }
    }

    // Update last login timestamp only if supported
    try {
      if (data.username && 'last_login_at' in data) {
        await supabase
          .from('app_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('username', data.username);
      }
    } catch (updateErr) {
      // Safe non-blocking catch
    }

    return data;
  }
};
