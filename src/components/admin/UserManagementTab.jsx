import { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, KeyRound, Shield, Building2, CheckCircle2, 
  XCircle, Edit2, Trash2, Search, RefreshCw, X, Check, Lock, Unlock 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { ROLES, formatRoleName } from '../../utils/permissions';

export default function UserManagementTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [officeFilter, setOfficeFilter] = useState('ALL');
  const [gatewayEndpoints, setGatewayEndpoints] = useState([]);
  const [dynamicSubOfficesList, setDynamicSubOfficesList] = useState(['All']);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Unclaimed Specialist');
  const [subOffice, setSubOffice] = useState('All');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, subOfficesRes, allSettingsRes] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('sub_offices').select('*').order('name', { ascending: true }),
        supabase.from('system_settings').select('*')
      ]);

      if (usersRes.data) setUsers(usersRes.data);

      // Load ONLY from dedicated sub_offices database table
      const branchSet = new Set(['All']);
      if (subOfficesRes.data && subOfficesRes.data.length) {
        subOfficesRes.data.forEach(so => {
          if (so.name && so.name.trim()) {
            branchSet.add(so.name.trim());
          }
        });
      }

      // Load gateway endpoints for connection reference only
      if (allSettingsRes.data && allSettingsRes.data.length) {
        allSettingsRes.data.forEach(row => {
          if (!row.value) return;
          let parsed = row.value;
          while (typeof parsed === 'string') {
            try {
              const next = JSON.parse(parsed);
              if (next === parsed) break;
              parsed = next;
            } catch { break; }
          }

          if (Array.isArray(parsed) && (row.key === 'api_endpoints' || row.key === 'gateway_endpoints')) {
            setGatewayEndpoints(parsed);
          }
        });
      }

      setDynamicSubOfficesList(Array.from(branchSet));
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const subOffices = dynamicSubOfficesList;

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('user_mgmt_tab_sub_offices_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_offices' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('Unclaimed Specialist');
    setSubOffice('All');
    setIsActive(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(user.password);
    setFullName(user.full_name || '');
    setRole(formatRoleName(user.role));
    setSubOffice(user.sub_office || 'All');
    setIsActive(user.is_active ?? true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username and password are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Sanitize sub_office for PostgreSQL foreign key constraint:
      // If 'All', empty, or not in database, store as NULL
      const matchingOffice = (subOffices || []).find(so => typeof so === 'string' ? so.toLowerCase().trim() === String(subOffice).toLowerCase().trim() : (so?.name || '').toLowerCase().trim() === String(subOffice).toLowerCase().trim());
      const finalSubOffice = (subOffice === 'All' || !matchingOffice) 
        ? null 
        : (typeof matchingOffice === 'string' ? matchingOffice : matchingOffice.name);

      if (editingUser) {
        // Update user
        const { error } = await supabase
          .from('app_users')
          .update({
            password: password.trim(),
            full_name: fullName.trim() || null,
            role,
            sub_office: finalSubOffice,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'admin',
          actor_role: currentUser?.role || 'Super Admin',
          action: 'USER_UPDATED',
          target_type: 'USER',
          target_id: username.trim(),
          sub_office: finalSubOffice || 'All Branches',
          details: { role, is_active: isActive }
        }]);

        showToast(`User ${username} updated successfully!`);
      } else {
        // Insert new user
        const { error } = await supabase
          .from('app_users')
          .insert([{
            username: username.trim().toLowerCase(),
            password: password.trim(),
            full_name: fullName.trim() || null,
            role,
            sub_office: finalSubOffice,
            is_active: isActive
          }]);

        if (error) throw error;

        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'admin',
          actor_role: currentUser?.role || 'Super Admin',
          action: 'USER_CREATED',
          target_type: 'USER',
          target_id: username.trim().toLowerCase(),
          sub_office: finalSubOffice || 'All Branches',
          details: { role }
        }]);

        showToast(`User ${username} created successfully!`);
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const toggleUserStatus = async (user) => {
    const newStatus = !user.is_active;
    try {
      await supabase
        .from('app_users')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      showToast(`User ${user.username} ${newStatus ? 'activated' : 'deactivated'}.`);
      await fetchUsers();
    } catch (err) {
      alert(`Error updating user status: ${err.message}`);
    }
  };

  const executeDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.username === currentUser?.username) {
      alert('You cannot delete your own active session account!');
      setDeletingUser(null);
      return;
    }

    setIsDeleting(true);
    try {
      let query = supabase.from('app_users').delete();
      if (deletingUser.id) {
        query = query.eq('id', deletingUser.id);
      } else {
        query = query.eq('username', deletingUser.username);
      }
      const { error } = await query;
      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'admin',
          actor_role: currentUser?.role || 'Super Admin',
          action: 'USER_DELETED',
          target_type: 'USER',
          target_id: deletingUser.username,
          sub_office: deletingUser.sub_office || 'All Branches',
          details: { role: deletingUser.role, full_name: deletingUser.full_name }
        }]);
      } catch {}

      showToast(`User account @${deletingUser.username} permanently deleted.`);
      setDeletingUser(null);
      await fetchUsers();
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const formattedRole = formatRoleName(u.role);
      const matchRole = roleFilter === 'ALL' || formattedRole === roleFilter || u.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (u.username || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.sub_office || '').toLowerCase().includes(q)
      );
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  return (
    <div className="space-y-4">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border-l-4 border-[#FFD700] text-xs font-bold animate-bounce">
          <CheckCircle2 size={16} className="text-[#FFD700]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username, name, sub-office..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
          >
            <option value="ALL">All Roles ({users.length})</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-[#002B66] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2 rounded-lg text-xs font-black tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 border-r border-blue-900">Username</th>
                <th className="px-4 py-3 border-r border-blue-900">Full Name</th>
                <th className="px-4 py-3 border-r border-blue-900">Role</th>
                <th className="px-4 py-3 border-r border-blue-900">Assigned Sub-Office</th>
                <th className="px-4 py-3 border-r border-blue-900 text-center">Status</th>
                <th className="px-4 py-3 border-r border-blue-900">Last Login</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    Loading users directory...
                  </td>
                </tr>
              ) : !filteredUsers.length ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-black text-[#002B66]">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                      {u.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        formatRoleName(u.role) === 'Admin'
                          ? 'bg-[#002B66] text-[#FFD700] border border-[#FFD700]/40'
                          : formatRoleName(u.role) === 'Sales Service Representative'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <Shield size={11} />
                        {formatRoleName(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400" />
                        {u.sub_office || 'All'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-center">
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer transition-colors ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {u.is_active ? <Unlock size={11} /> : <Lock size={11} />}
                        <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-[#002B66] text-slate-700 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Edit user details or reset password"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          disabled={u.username === currentUser?.username}
                          className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={u.username === currentUser?.username ? "You cannot delete your own active account" : "Delete user account"}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#002B66] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#FFD700]">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-white">
                <Users size={18} className="text-[#FFD700]" />
                <span>{editingUser ? `Edit User: ${editingUser.username}` : 'Create New User Account'}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg font-bold">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingUser)}
                  placeholder="e.g. sub_tipolo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Full Name / Officer In Charge
                </label>
                <input
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 focus:border-[#002B66] outline-none"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Sub-Office Scope *
                  </label>
                  <select
                    value={subOffice}
                    onChange={(e) => setSubOffice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 focus:border-[#002B66] outline-none cursor-pointer"
                  >
                    {subOffices.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#002B66] focus:ring-0"
                  />
                  <span className="font-bold text-xs text-slate-700">Account Active</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] text-xs font-black rounded-lg shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-600 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-white">
                <Trash2 size={18} className="text-[#FFD700]" />
                <span>Confirm User Deletion</span>
              </div>
              <button onClick={() => setDeletingUser(null)} className="text-rose-200 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <p className="font-semibold text-slate-800">
                Are you sure you want to permanently delete user account <strong className="font-mono text-rose-700">@{deletingUser.username}</strong> ({deletingUser.full_name || 'No Name'})?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                <p className="font-bold">⚠️ Warning: Irreversible Action</p>
                <p>This will revoke all access for this user and remove their database credentials immediately.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteUser}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
