import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Mail, Phone, FileText, Lock, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Upload, Camera, Save,
  Send, ShieldCheck, Loader2, X, ArrowLeft, Key,
  RefreshCw, Info, BadgeCheck
} from 'lucide-react';
import { profileService } from '../../services/profileService';
import { supabase } from '../../config/supabaseClient';

// ─── Sub-component: Avatar Upload ────────────────────────────────────────────
function AvatarUpload({ user, avatarUrl, onAvatarChange, uploading }) {
  const fileRef = useRef(null);
  const initials = ((user?.full_name || user?.username || 'U')[0]).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#003B6D]/20 shadow-lg bg-slate-100 flex items-center justify-center relative">
          <span className="text-3xl font-black text-[#003B6D] font-mono">{initials}</span>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
              <Loader2 size={24} className="animate-spin text-[#E52C2D]" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 bg-[#E52C2D] text-white rounded-full p-1.5 shadow-md border-2 border-white hover:bg-red-600 transition-all cursor-pointer disabled:opacity-60"
          title="Upload Photo"
        >
          <Camera size={14} className="stroke-[2.5]" />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={onAvatarChange}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-[#E52C2D] font-semibold hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-60"
      >
        <Upload size={12} />
        {uploading ? 'Uploading…' : 'Change Photo'}
      </button>
      <p className="text-[10px] text-slate-500 text-center">PNG, JPEG, GIF up to 5 MB</p>
    </div>
  );
}

// ─── Sub-component: Input Field ───────────────────────────────────────────────
function FormField({ id, label, icon: Icon, type = 'text', value, onChange, placeholder, hint, error, disabled }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-[#003B6D]" />}
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && showPw ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all pr-${isPassword ? '10' : '3.5'}
            ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#003B6D] focus:ring-1 focus:ring-[#003B6D]/50'}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003B6D] transition-colors cursor-pointer"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
      {hint && !error && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ─── Sub-component: Section Card ─────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, accent = false }) {
  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${accent ? 'bg-slate-50/50 border-[#003B6D]/20 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className={`p-1.5 rounded-lg ${accent ? 'bg-[#003B6D]/10' : 'bg-slate-100'}`}>
          <Icon size={16} className={accent ? 'text-[#003B6D]' : 'text-slate-500'} />
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Stage Indicator ─────────────────────────────────────────────────────────
function StageIndicator({ stage }) {
  const stages = ['verify', 'email_sent', 'confirm'];
  const labels = ['Verify Identity', 'Email Sent', 'Set New Password'];
  const icons = [ShieldCheck, Send, Key];

  return (
    <div className="flex items-center gap-0 mb-5">
      {stages.map((s, i) => {
        const idx = stages.indexOf(stage);
        const done = i < idx;
        const active = i === idx;
        const Icon = icons[i];
        return (
          <div key={s} className="flex-1 flex items-center">
            <div className={`flex flex-col items-center gap-1 flex-1 ${i > 0 ? 'ml-2' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-sm
                ${done ? 'bg-emerald-500 border-emerald-500' : active ? 'bg-[#003B6D] border-[#003B6D]' : 'bg-slate-100 border-slate-200'}`}>
                {done
                  ? <CheckCircle2 size={14} className="text-white" />
                  : <Icon size={14} className={active ? 'text-white' : 'text-slate-400'} />
                }
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider text-center leading-tight
                ${done ? 'text-emerald-600' : active ? 'text-[#003B6D]' : 'text-slate-400'}`}>
                {labels[i]}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-none w-8 h-0.5 mx-1 ${i < idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileSettings({ currentUser, onUserUpdated, onBack }) {
  // Profile state
  const [profileForm, setProfileForm] = useState({
    full_name: currentUser?.full_name || currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    bio: currentUser?.bio || '',
  });
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change state
  const [pwStage, setPwStage] = useState('verify'); // 'verify' | 'email_sent' | 'confirm'
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    email: currentUser?.email || '',
    newPassword: '',
    confirmPassword: '',
    token: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Fetch latest user data on mount to pick up email/phone/bio/avatar_url
  useEffect(() => {
    if (currentUser?.id) {
      profileService.fetchUser(currentUser.id).then(u => {
        if (u) {
          setProfileForm({
            full_name: u.full_name || '',
            email: u.email || '',
            phone: u.phone || '',
            bio: u.bio || '',
          });
          setAvatarUrl(u.avatar_url || null);
          setPwForm(f => ({ ...f, email: u.email || '' }));
        }
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  // Check URL for password token on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('pw_token');
    if (urlToken) {
      setPwForm(f => ({ ...f, token: urlToken }));
      setPwStage('confirm');
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // ─── Avatar Upload ───────────────────────────────────────────────────────
  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image must be smaller than 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    setProfileError('');
    try {
      const url = await profileService.uploadAvatar(currentUser.id, file);
      setAvatarUrl(url);
      // Auto-save avatar_url
      await profileService.updateProfile(currentUser.id, { ...profileForm, avatar_url: url }, currentUser);
      if (onUserUpdated) onUserUpdated({ ...currentUser, avatar_url: url });
    } catch (err) {
      setProfileError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [currentUser, profileForm, onUserUpdated]);

  // ─── Profile Save ─────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      const updated = await profileService.updateProfile(
        currentUser.id,
        { ...profileForm, avatar_url: avatarUrl },
        currentUser
      );
      setProfileSuccess(true);
      if (onUserUpdated) onUserUpdated({ ...currentUser, ...updated });
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ─── Password Stage: Verify ───────────────────────────────────────────────
  const handleInitiatePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwForm.currentPassword) { setPwError('Please enter your current password.'); return; }
    if (!pwForm.email) { setPwError('Please enter the email address to send the confirmation link to.'); return; }

    setPwLoading(true);
    try {
      const result = await profileService.initiatePasswordChange(
        currentUser.id,
        currentUser.username,
        pwForm.email,
        pwForm.currentPassword
      );
      setPwStage('email_sent');
      setPwSuccess(`Confirmation email sent to ${result.sentTo}! Check your inbox and click the link to continue.`);
    } catch (err) {
      setPwError(err.message || 'Failed to initiate password change.');
    } finally {
      setPwLoading(false);
    }
  };

  // ─── Password Stage: Confirm ──────────────────────────────────────────────
  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.newPassword) { setPwError('Enter a new password.'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (!pwForm.token) { setPwError('Confirmation token is missing.'); return; }

    setPwLoading(true);
    try {
      await profileService.verifyAndChangePassword(pwForm.token, pwForm.newPassword);
      setPwSuccess('✅ Password changed successfully! You can now log in with your new password.');
      setPwStage('verify');
      setPwForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '', token: '' }));
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const fieldPf = (key) => ({
    value: profileForm[key],
    onChange: (e) => setProfileForm(f => ({ ...f, [key]: e.target.value })),
  });

  const fieldPw = (key) => ({
    value: pwForm[key],
    onChange: (e) => setPwForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="min-h-full">
      {/* ── Page Header (Hidden when inside modal context) ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3 hidden">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <User size={20} className="text-[#003B6D]" />
            Profile &amp; Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your personal information and security preferences</p>
        </div>
      </div>

      <div className={pwStage === 'confirm' ? "max-w-xl mx-auto mt-4" : "grid grid-cols-1 lg:grid-cols-3 gap-5"}>

        {/* ── Left: Avatar + Identity Card ─────────────────────────── */}
        {pwStage !== 'confirm' && (
          <div className="lg:col-span-1 space-y-4">
          <SectionCard title="Your Identity" icon={BadgeCheck} accent>
            <AvatarUpload
              user={currentUser}
              avatarUrl={avatarUrl}
              onAvatarChange={handleAvatarChange}
              uploading={uploadingAvatar}
            />
            <div className="text-center space-y-0.5 mt-1">
              <p className="text-sm font-black text-slate-900">{currentUser?.full_name || currentUser?.username}</p>
              <p className="text-xs text-slate-500">@{currentUser?.username}</p>
              <span className="inline-block mt-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#003B6D] text-white uppercase shadow">
                {currentUser?.role}
              </span>
              {currentUser?.sub_office && currentUser.sub_office !== 'All' && (
                <p className="text-[10px] text-slate-500 mt-1">{currentUser.sub_office}</p>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Last Login</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {currentUser?.last_login_at
                    ? new Date(currentUser.last_login_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Status</p>
                <p className="text-xs font-bold text-emerald-600 mt-0.5">Active</p>
              </div>
            </div>
          </SectionCard>

          {/* Info notice */}
          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex gap-2.5 text-xs text-blue-700">
            <Info size={14} className="text-[#003B6D] shrink-0 mt-0.5" />
            <span>Username and role can only be changed by an Administrator.</span>
          </div>
        </div>
        )}

        {/* ── Right: Forms ─────────────────────────────────────────── */}
        <div className={pwStage === 'confirm' ? "space-y-5" : "lg:col-span-2 space-y-5"}>

          {/* Profile Form */}
          {pwStage !== 'confirm' && (
            <SectionCard title="Personal Information" icon={User}>
            <form onSubmit={handleProfileSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField
                  id="full_name"
                  label="Full Name"
                  icon={User}
                  placeholder="e.g. Juan dela Cruz"
                  {...fieldPf('full_name')}
                />
                <FormField
                  id="email"
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  placeholder="your@email.com"
                  hint="Used for password reset confirmations"
                  {...fieldPf('email')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField
                  id="phone"
                  label="Phone Number"
                  icon={Phone}
                  placeholder="09XXXXXXXXX"
                  {...fieldPf('phone')}
                />
                <div className="space-y-1">
                  <label htmlFor="bio" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} className="text-[#003B6D]" />
                    Bio / Notes
                  </label>
                  <textarea
                    id="bio"
                    rows={2}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Brief description about yourself..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#003B6D] transition-all resize-none"
                  />
                </div>
              </div>

              {profileError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={13} className="shrink-0" />
                  Profile updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={profileLoading || uploadingAvatar}
                id="btn-save-profile"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#003B6D] text-white font-black text-xs rounded-xl hover:bg-blue-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {profileLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </SectionCard>
          )}

          {/* Password Change Section */}
          <SectionCard title="Change Password" icon={Lock} accent>
            <StageIndicator stage={pwStage} />

            {/* Stage 1: Verify identity */}
            {pwStage === 'verify' && (
              <form onSubmit={handleInitiatePasswordChange} className="space-y-3.5">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                  <ShieldCheck size={14} className="text-[#003B6D] shrink-0 mt-0.5" />
                  <span>For security, confirm your current password. A confirmation link will be sent to your email.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    id="current_password"
                    label="Current Password"
                    icon={Lock}
                    type="password"
                    placeholder="Enter current password"
                    {...fieldPw('currentPassword')}
                  />
                  <FormField
                    id="confirm_email"
                    label="Confirmation Email"
                    icon={Mail}
                    type="email"
                    placeholder="your@email.com"
                    hint="Where to send the confirmation link"
                    {...fieldPw('email')}
                  />
                </div>

                {pwError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={13} className="shrink-0" />{pwError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  id="btn-initiate-pw-change"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#003B6D] text-white font-bold text-xs rounded-xl hover:bg-blue-900 transition-all disabled:opacity-60 shadow-md cursor-pointer"
                >
                  {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {pwLoading ? 'Sending Email…' : 'Send Confirmation Email'}
                </button>
              </form>
            )}

            {/* Stage 2: Email Sent */}
            {pwStage === 'email_sent' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <Send size={24} className="text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-emerald-700">Confirmation Email Sent!</p>
                  <p className="text-xs text-slate-600">{pwSuccess}</p>
                </div>


                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setPwStage('verify'); setPwError(''); setPwSuccess(''); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer bg-white"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>

                </div>
              </div>
            )}

            {/* Stage 3: Enter new password */}
            {pwStage === 'confirm' && (
              <form onSubmit={handleConfirmPasswordChange} className="space-y-3.5">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                  <Key size={14} className="text-[#003B6D] shrink-0 mt-0.5" />
                  <span>Enter your new password below. The confirmation token was sent to your email.</span>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    id="new_password"
                    label="New Password"
                    icon={Lock}
                    type="password"
                    placeholder="Min 6 characters"
                    error={pwForm.newPassword && pwForm.newPassword.length < 6 ? 'Minimum 6 characters' : ''}
                    {...fieldPw('newPassword')}
                  />
                  <FormField
                    id="confirm_password"
                    label="Confirm New Password"
                    icon={Lock}
                    type="password"
                    placeholder="Repeat new password"
                    error={pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword ? 'Passwords do not match' : ''}
                    {...fieldPw('confirmPassword')}
                  />
                </div>

                {/* Password strength */}
                {pwForm.newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => {
                        const strength = Math.min(Math.floor(pwForm.newPassword.length / 3), 4);
                        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
                        return (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength - 1] : 'bg-slate-200'}`} />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Strength: {['', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(Math.floor(pwForm.newPassword.length / 3), 4)]}
                    </p>
                  </div>
                )}

                {pwError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={13} className="shrink-0" />{pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <CheckCircle2 size={13} className="shrink-0" />{pwSuccess}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setPwStage('email_sent'); setPwError(''); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer bg-white"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    id="btn-confirm-pw-change"
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-60 shadow-md cursor-pointer"
                  >
                    {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    {pwLoading ? 'Changing Password…' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}

            {/* Reset to start */}
            {(pwStage === 'email_sent' || pwStage === 'confirm') && pwSuccess && pwSuccess.includes('✅') && (
              <button
                type="button"
                onClick={() => { setPwStage('verify'); setPwSuccess(''); setPwError(''); setConfirmLink(''); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#003B6D] cursor-pointer mt-2"
              >
                <RefreshCw size={12} /> Start over
              </button>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
