import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Plus, Search, Edit2, Trash2, CheckCircle2, 
  AlertCircle, Globe, Shield, RefreshCw, Power, Phone, 
  MapPin, UserCheck, Server, ArrowRight 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import ConfirmPopover from '../../components/common/ConfirmPopover';

export default function SubOfficeManagement({ currentUser }) {
  const [subOffices, setSubOffices] = useState([]);
  const [gatewayEndpoints, setGatewayEndpoints] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingOffice, setDeletingOffice] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [headName, setHeadName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load Sub-Offices directly from sub_offices table, plus endpoints & users
  const loadData = async () => {
    setLoading(true);
    try {
      const [soRes, settingsRes, usersRes] = await Promise.all([
        supabase.from('sub_offices').select('*').order('created_at', { ascending: true }),
        supabase.from('system_settings').select('*'),
        supabase.from('app_users').select('id, username, sub_office, role, is_active')
      ]);

      if (soRes.data) {
        setSubOffices(soRes.data);
      }

      if (settingsRes.data && settingsRes.data.length) {
        settingsRes.data.forEach(row => {
          if (row.key === 'api_endpoints' || row.key === 'gateway_endpoints') {
            try {
              const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
              if (Array.isArray(parsed)) setGatewayEndpoints(parsed);
            } catch {}
          }
        });
      }

      if (usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error('Error loading sub-offices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('sub_offices_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_offices' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreateModal = () => {
    setEditingOffice(null);
    setName('');
    setLocation('');
    setHeadName('');
    setContactNumber('');
    setStatus('ACTIVE');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (office) => {
    setEditingOffice(office);
    setName(office.name);
    setLocation(office.location || '');
    setHeadName(office.head_name || '');
    setContactNumber(office.contact_number || '');
    setStatus(office.status || 'ACTIVE');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Sub-office branch name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        head_name: headName.trim(),
        contact_number: contactNumber.trim(),
        status: status,
        updated_at: new Date().toISOString()
      };

      if (editingOffice?.id) {
        // Update existing record by ID
        const { error } = await supabase
          .from('sub_offices')
          .update(payload)
          .eq('id', editingOffice.id);
        if (error) throw error;
      } else {
        // Insert new record without passing primary key ID
        const { error } = await supabase
          .from('sub_offices')
          .insert([payload]);
        if (error) throw error;
      }

      // Audit Log
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'admin',
        actor_role: currentUser?.role || 'Admin',
        action: editingOffice ? 'SUB_OFFICE_UPDATED' : 'SUB_OFFICE_CREATED',
        target_type: 'SUB_OFFICE',
        target_id: name.trim(),
        details: payload
      }]);

      showToast(`Branch "${name.trim()}" saved successfully.`);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save sub-office.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (office) => {
    const newStatus = office.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const { error } = await supabase
        .from('sub_offices')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', office.id);

      if (error) throw error;

      setSubOffices(prev => prev.map(so => so.id === office.id ? { ...so, status: newStatus } : so));
      showToast(`Branch "${office.name}" is now ${newStatus}.`);
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = (office) => {
    setDeletingOffice(office);
  };

  const executeDeleteOffice = async () => {
    if (!deletingOffice) return;
    try {
      const { error } = await supabase
        .from('sub_offices')
        .delete()
        .eq('id', deletingOffice.id);

      if (error) throw error;

      setSubOffices(prev => prev.filter(so => so.id !== deletingOffice.id));
      showToast(`Branch "${deletingOffice.name}" removed.`);
    } catch (err) {
      showToast(`Failed to delete branch: ${err.message}`);
    } finally {
      setDeletingOffice(null);
    }
  };

  // Filtered list
  const filteredOffices = useMemo(() => {
    return subOffices.filter(so => {
      if (statusFilter !== 'ALL' && so.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (so.name || '').toLowerCase().includes(q) ||
        (so.head_name || '').toLowerCase().includes(q) ||
        (so.location || '').toLowerCase().includes(q) ||
        (so.contact_number || '').toLowerCase().includes(q)
      );
    });
  }, [subOffices, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#002B66] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border-l-4 border-[#FFD700] text-xs font-bold animate-bounce">
          <CheckCircle2 size={16} className="text-[#FFD700]" />
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          { label: 'Total Branches', val: subOffices.length, icon: Building2, color: 'text-[#002B66]' },
          { label: 'Active Branches', val: subOffices.filter(s => s.status === 'ACTIVE').length, icon: CheckCircle2, color: 'text-emerald-700' },
          { label: 'Assigned Personnel', val: users.length, icon: UserCheck, color: 'text-amber-700' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{kpi.label}</span>
                <span className={`text-xl font-black font-mono mt-1 block ${kpi.color}`}>{kpi.val}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#002B66] text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider">
            <Building2 size={15} className="text-[#FFD700]" />
            <span>Sub-Office Branches Registry</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 font-bold text-xs text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Branches</option>
            <option value="INACTIVE">Inactive Branches</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search branch name, head, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 text-xs rounded-xl font-medium outline-none focus:bg-white focus:border-[#002B66]"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#FFD700] hover:bg-amber-400 text-[#002B66] px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>New Sub-Office</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-300 shadow-xs rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider border-b border-blue-950">
                <th className="px-3.5 py-3 border-r border-blue-950">Branch Details</th>
                <th className="px-3.5 py-3 border-r border-blue-950">Location / Address</th>
                <th className="px-3.5 py-3 border-r border-blue-950">Branch Head & Contact</th>
                <th className="px-3.5 py-3 border-r border-blue-950 text-center">Status</th>
                <th className="px-3.5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
              {filteredOffices.length > 0 ? (
                filteredOffices.map((office, idx) => {
                  const staffCount = users.filter(u => u.sub_office === office.name).length;
                  const isActive = office.status === 'ACTIVE';

                  return (
                    <tr key={office.id || office.name || idx} className="hover:bg-slate-50 transition-colors odd:bg-white even:bg-slate-50/40">
                      <td className="px-3.5 py-3 border-r border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-50 text-[#002B66] border border-blue-100 shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{office.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{staffCount} Assigned Staff</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-3 border-r border-slate-200 text-slate-600 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{office.location || 'Branch Address Not Set'}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-3 border-r border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">{office.head_name || 'Unassigned Head'}</span>
                          {office.contact_number && (
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone size={10} /> {office.contact_number}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 border-r border-slate-200 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          isActive 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {isActive ? <CheckCircle2 size={10} /> : <Power size={10} />}
                          <span>{office.status}</span>
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(office)}
                            className="p-1.5 text-[#002B66] hover:bg-blue-50 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title="Edit Sub-Office"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(office)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title={isActive ? 'Deactivate Branch' : 'Activate Branch'}
                          >
                            <Power size={13} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                          </button>

                          {office.id !== 'so-default-1' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(office)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-all cursor-pointer"
                              title="Delete Sub-Office"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-400 font-bold uppercase text-xs">
                    No sub-office branches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden p-3 space-y-3 bg-slate-50">
          {filteredOffices.length > 0 ? (
            filteredOffices.map((office, idx) => {
              const isActive = office.status === 'ACTIVE';

              return (
                <div key={office.id || office.name || idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-[#002B66]" />
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{office.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{office.location || 'Branch Office'}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      isActive 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {office.status}
                    </span>
                  </div>

                  <div className="text-xs font-mono">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Head & Contact</span>
                      <span className="font-bold text-slate-800 block text-[11px] truncate">{office.head_name || 'N/A'}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{office.contact_number || 'No Phone'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{office.location || 'No address'}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(office)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#002B66] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(office)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 font-bold uppercase text-xs">
              No sub-office branches found.
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT SUB-OFFICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-[#002B66] text-white px-5 py-3.5 flex justify-between items-center border-b-2 border-[#FFD700] shrink-0">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm">
                <Building2 size={18} className="text-[#FFD700]" />
                <span>{editingOffice ? `Edit Sub-Office • ${editingOffice.name}` : 'Create New Sub-Office Branch'}</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Branch Name */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Sub-Office Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tipolo Branch, Centro, Canduman"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              {/* Location Address */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Location / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Highway Seno, Tipolo, Mandaue City"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              {/* Head Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Branch Head / Manager Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maria Santos"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Contact Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0917-998-1234"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                  />
                </div>
              </div>



              {/* Status Toggle & Submit */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={status === 'ACTIVE'}
                    onChange={(e) => setStatus(e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                    className="rounded text-[#002B66]"
                  />
                  <span className="font-bold text-xs text-slate-700">Branch Status Active</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] font-black rounded-xl cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingOffice ? 'Update Branch' : 'Create Branch'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SUB-OFFICE CONFIRM POPOVER */}
      <ConfirmPopover
        isOpen={Boolean(deletingOffice)}
        title="Delete Sub-Office Branch"
        type="danger"
        confirmText="Delete Branch"
        onCancel={() => setDeletingOffice(null)}
        onConfirm={executeDeleteOffice}
      >
        {deletingOffice && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to delete branch <strong>"{deletingOffice.name}"</strong>?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Location:</span>
                <span className="font-bold text-slate-800">{deletingOffice.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Branch Head:</span>
                <span className="font-bold text-slate-800">{deletingOffice.head_name}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              All settings and references for this sub-office branch will be unlinked.
            </p>
          </div>
        )}
      </ConfirmPopover>

    </div>
  );
}
