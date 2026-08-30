import { supabase } from '../config/supabaseClient';

export const authService = {
  async login(username, password) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Invalid username or password.');
    }

    if (data.is_active === false) {
      throw new Error('This account has been disabled. Please contact your Super Administrator.');
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
