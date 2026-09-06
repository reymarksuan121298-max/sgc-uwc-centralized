import { supabase } from '../config/supabaseClient';
import { EMAILJS_CONFIG } from '../config/emailjsConfig';
import { hashPassword, verifyPassword } from '../utils/cryptoUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateToken(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ─── Profile Service ─────────────────────────────────────────────────────────
export const profileService = {

  // 1. Fetch latest user data by id
  async fetchUser(userId) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // 2. Update profile info (full_name, email, phone, bio)
  async updateProfile(userId, profileData, actorUser) {
    const updatePayload = {
      full_name: profileData.full_name?.trim() || null,
      email: profileData.email?.trim() || null,
      phone: profileData.phone?.trim() || null,
      bio: profileData.bio?.trim() || null,
      avatar_url: profileData.avatar_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('app_users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'SYSTEM',
      actor_role: actorUser?.role || 'User',
      action: 'PROFILE_UPDATED',
      target_type: 'USER',
      target_id: actorUser?.username || String(userId),
      sub_office: actorUser?.sub_office || 'All',
      details: { fields_updated: Object.keys(updatePayload).filter(k => k !== 'updated_at') }
    }]);

    return data;
  },

  // 3. Upload avatar image to Supabase Storage (bucket: avatars)
  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const filePath = `avatars/${userId}.${ext}`;

    // Remove old if exists (upsert)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Bust cache with timestamp
    return `${urlData.publicUrl}?t=${Date.now()}`;
  },

  // 4. Initiate password reset from Login screen (Forgot Password)
  async initiateForgotPassword(usernameOrEmail) {
    const input = String(usernameOrEmail || '').trim().toLowerCase();
    if (!input) throw new Error('Please enter your username or registered email address.');

    // Query app_users by username or email
    const { data: user, error: fetchErr } = await supabase
      .from('app_users')
      .select('id, username, email, is_active')
      .or(`username.eq.${input},email.eq.${input}`)
      .maybeSingle();

    if (fetchErr || !user) {
      throw new Error('No account found matching that username or email address.');
    }

    if (user.is_active === false) {
      throw new Error('This account has been disabled. Please contact your Super Administrator.');
    }

    if (!user.email) {
      throw new Error(`Account "${user.username}" has no email address registered on file. Please contact an Administrator.`);
    }

    const token = generateToken(64);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    // Clear existing reset tokens for user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id);

    // Insert new token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        username: user.username,
        token,
        email: user.email,
        expires_at: expiresAt,
        used: false,
        created_at: new Date().toISOString(),
      }]);

    if (tokenError) throw tokenError;

    // Send reset email via EmailJS
    const appUrl = window.location.origin;
    const confirmLink = `${appUrl}/?pw_token=${token}`;

    await profileService.sendPasswordChangeEmail({
      to_email: user.email,
      to_name: user.username,
      confirm_link: confirmLink,
      message: `You requested a password reset for account "${user.username}". Click here to set a new password: ${confirmLink}`,
      expires_in: '30 minutes',
    });

    return { sentTo: user.email, username: user.username };
  },

  // 5. Initiate password change when logged in – requires current password confirmation
  async initiatePasswordChange(userId, username, email, currentPassword) {
    // Verify current password first
    const { data: user, error: authError } = await supabase
      .from('app_users')
      .select('id, password, email')
      .eq('id', userId)
      .maybeSingle();

    if (authError || !user) throw new Error('User not found.');

    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) throw new Error('Current password is incorrect.');

    const resolvedEmail = email || user.email;
    if (!resolvedEmail) throw new Error('No email address on file. Please update your profile with an email address first.');

    const token = generateToken(64);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Store token – delete existing token for user first to prevent 409 Conflict
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);

    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert([{
        user_id: userId,
        username,
        token,
        email: resolvedEmail,
        expires_at: expiresAt,
        used: false,
        created_at: new Date().toISOString(),
      }]);

    if (tokenError) throw tokenError;

    // Send email via EmailJS
    const appUrl = window.location.origin;
    const confirmLink = `${appUrl}/?pw_token=${token}`;

    await profileService.sendPasswordChangeEmail({
      to_email: resolvedEmail,
      to_name: username,
      confirm_link: confirmLink,
      message: `Here is your password reset link: ${confirmLink}`,
      expires_in: '30 minutes',
    });

    // Audit log
    await supabase.from('audit_logs').insert([{
      actor_username: username,
      actor_role: 'User',
      action: 'PASSWORD_CHANGE_INITIATED',
      target_type: 'USER',
      target_id: username,
      sub_office: 'All',
      details: { email: resolvedEmail }
    }]);

    return { emailSent: true, sentTo: resolvedEmail };
  },

  // 6. Verify token and finalize password change with SHA-256 password hash
  async verifyAndChangePassword(token, newPassword) {
    if (!token || !newPassword) throw new Error('Invalid request.');
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');

    const { data: tokenRow, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();

    if (tokenError || !tokenRow) throw new Error('Invalid or expired confirmation link.');

    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);
    if (now > expiresAt) throw new Error('This confirmation link has expired. Please request a new one.');

    // Hash the new password before updating database
    const hashedPassword = await hashPassword(newPassword);

    // Update password in app_users table
    const { error: pwError } = await supabase
      .from('app_users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', tokenRow.user_id);

    if (pwError) throw pwError;

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token);

    // Audit log
    await supabase.from('audit_logs').insert([{
      actor_username: tokenRow.username,
      actor_role: 'User',
      action: 'PASSWORD_CHANGED',
      target_type: 'USER',
      target_id: tokenRow.username,
      sub_office: 'All',
      details: { method: 'email_token_confirmation' }
    }]);

    return { username: tokenRow.username, userId: tokenRow.user_id };
  },

  // 6. Send email via EmailJS REST API (no backend needed)
  async sendPasswordChangeEmail({ to_email, to_name, confirm_link, message, expires_in }) {
    const { serviceId, templateId, publicKey } = EMAILJS_CONFIG;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in environment variables.');
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email,
          to_name,
          confirm_link,
          message,
          expires_in,
          app_name: 'SGC UWC Centralized',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EmailJS error: ${text}`);
    }

    return true;
  },
};
