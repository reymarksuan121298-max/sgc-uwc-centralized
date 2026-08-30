import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Save, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Globe, 
  Coins, ShieldCheck, Plus, Trash2, Edit2, Play, Building2, Check, X, Shield, 
  ExternalLink, Server
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import ConfirmPopover from '../common/ConfirmPopover';

export default function SystemConfigTab({ currentUser, onConfigUpdated }) {
  // API Endpoints State
  const [gatewayEndpoints, setGatewayEndpoints] = useState([]);
  
  // Endpoint Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [deletingEndpoint, setDeletingEndpoint] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sub_office: 'All',
    baseUrl: '',
    token: '',
    isClaim: 0,
    is_active: true
  });

  // Commission Rates
  const [adminPercent, setAdminPercent] = useState(50);
  const [agentPercent, setAgentPercent] = useState(30);
  const [staffPercent, setStaffPercent] = useState(10);
  const [collectorPercent, setCollectorPercent] = useState(10);

  // Testing Gateway Status State
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  // UI States
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGatewaysCard, setShowGatewaysCard] = useState(false);
  const [subOfficesList, setSubOfficesList] = useState(['All']);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Hotkey Alt+C Listener to toggle Gateway Settings Card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC')) {
        e.preventDefault();
        setShowGatewaysCard((prev) => {
          const next = !prev;
          showToast(next ? '🔓 Gateway Settings Unlocked (Alt+C)' : '🔒 Gateway Settings Hidden (Alt+C)');
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, subOfficesRes] = await Promise.all([
        supabase.from('system_settings').select('*'),
        supabase.from('sub_offices').select('name').order('name', { ascending: true })
      ]);

      if (subOfficesRes.data && subOfficesRes.data.length) {
        const branchSet = new Set(['All']);
        subOfficesRes.data.forEach(so => {
          if (so.name && so.name.trim()) branchSet.add(so.name.trim());
        });
        setSubOfficesList(Array.from(branchSet));
      }

      const data = settingsRes.data || [];
      let foundEndpoints = [];

      if (data.length) {
        data.forEach((row) => {
          if (!row.value) return;
          let parsed = row.value;
          while (typeof parsed === 'string') {
            try { 
              const next = JSON.parse(parsed);
              if (next === parsed) break;
              parsed = next;
            } catch { break; }
          }

          if (row.key === 'commission_config' || row.key === 'commission_rates') {
            setAdminPercent(parsed.admin ?? parsed.adminPercent ?? 50);
            setAgentPercent(parsed.agent ?? parsed.agentPercent ?? 30);
            setStaffPercent(parsed.staff ?? parsed.staffPercent ?? 10);
            setCollectorPercent(parsed.collector ?? parsed.collectorPercent ?? 10);
          } else if (row.key === 'api_endpoints' || row.key === 'gateway_endpoints') {
            if (Array.isArray(parsed) && parsed.length > 0) {
              foundEndpoints = parsed;
            }
          }
        });
      }

      setGatewayEndpoints(foundEndpoints);
    } catch (err) {
      // Gracefully silent if optional table is not present
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const totalPercent = parseFloat(adminPercent || 0) + parseFloat(agentPercent || 0) + parseFloat(staffPercent || 0) + parseFloat(collectorPercent || 0);

  // Test live connection to API endpoint
  const handleTestConnection = async (endpoint) => {
    setTestingId(endpoint.id);
    setTestResults(prev => ({ ...prev, [endpoint.id]: { status: 'testing' } }));

    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 30);
    const fromStr = pastDate.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];

    const startTime = Date.now();

    try {
      const cleanUrl = endpoint.baseUrl.replace(/\/+$/, '');
      const url = `${cleanUrl}/api/accountant/UnclaimedReceipts?isClaim=${endpoint.isClaim ?? 0}&from=${fromStr}&to=${toStr}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': endpoint.token.trim(),
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      });

      const latency = Date.now() - startTime;

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const recordsCount = Array.isArray(json?.data?.data) ? json.data.data.length : Array.isArray(json?.data) ? json.data.length : Array.isArray(json) ? json.length : 0;

      setTestResults(prev => ({
        ...prev,
        [endpoint.id]: {
          status: 'success',
          latency,
          message: `Connected successfully (${latency}ms) — ${recordsCount} records accessible.`
        }
      }));
    } catch (err) {
      const latency = Date.now() - startTime;
      setTestResults(prev => ({
        ...prev,
        [endpoint.id]: {
          status: 'error',
          latency,
          message: err.message || 'Connection failed or blocked by CORS.'
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      sub_office: 'All',
      baseUrl: '',
      token: '',
      isClaim: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (endpoint) => {
    setEditingConfig(endpoint);
    setFormData({
      name: endpoint.name || '',
      sub_office: endpoint.sub_office || 'All',
      baseUrl: endpoint.baseUrl || '',
      token: endpoint.token || '',
      isClaim: endpoint.isClaim ?? 0,
      is_active: endpoint.is_active ?? true
    });
    setIsModalOpen(true);
  };

  // Save Modal Endpoint (Add / Edit)
  const handleSaveEndpointModal = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.baseUrl.trim() || !formData.token.trim()) {
      alert('Please provide Name, Gateway Base URL, and Bearer Token.');
      return;
    }

    let updatedList = [];
    if (editingConfig) {
      updatedList = gatewayEndpoints.map(item => item.id === editingConfig.id ? { ...item, ...formData } : item);
    } else {
      const newEndpoint = {
        id: `cfg-${Date.now()}`,
        ...formData,
        is_default: gatewayEndpoints.length === 0,
        created_at: new Date().toISOString()
      };
      updatedList = [...gatewayEndpoints, newEndpoint];
    }

    setGatewayEndpoints(updatedList);
    setIsModalOpen(false);

    // Save to Supabase
    await persistEndpoints(updatedList);
    showToast(editingConfig ? 'Gateway updated!' : 'New Gateway added!');
  };

  // Set Default Endpoint
  const handleSetDefaultEndpoint = async (id) => {
    const updatedList = gatewayEndpoints.map(item => ({
      ...item,
      is_default: item.id === id
    }));
    setGatewayEndpoints(updatedList);
    await persistEndpoints(updatedList);
    showToast('Default Gateway updated!');
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (id) => {
    const updatedList = gatewayEndpoints.map(item => item.id === id ? { ...item, is_active: !item.is_active } : item);
    setGatewayEndpoints(updatedList);
    await persistEndpoints(updatedList);
  };

  // Delete Endpoint
  const handleDeleteEndpoint = (endpoint) => {
    setDeletingEndpoint(endpoint);
  };

  const executeDeleteEndpoint = async () => {
    if (!deletingEndpoint) return;
    const updatedList = gatewayEndpoints.filter(item => item.id !== deletingEndpoint.id);
    setGatewayEndpoints(updatedList);
    await persistEndpoints(updatedList);
    showToast(`Removed "${deletingEndpoint.name}" configuration.`);
    setDeletingEndpoint(null);
    if (onConfigUpdated) onConfigUpdated();
  };

  // Persist Gateway Endpoints to Supabase
  const persistEndpoints = async (endpoints) => {
    try {
      await Promise.all([
        supabase
          .from('system_settings')
          .upsert({
            key: 'api_endpoints',
            value: endpoints,
            description: 'Gateway Connections',
            updated_by: currentUser?.username || 'admin',
            updated_at: new Date().toISOString()
          }),
        supabase
          .from('system_settings')
          .upsert({
            key: 'gateway_endpoints',
            value: endpoints,
            description: 'Gateway Connections',
            updated_by: currentUser?.username || 'admin',
            updated_at: new Date().toISOString()
          })
      ]);

      // Log into audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'admin',
        actor_role: currentUser?.role || 'Super Admin',
        action: 'GATEWAY_CONFIGS_UPDATED',
        target_type: 'SYSTEM',
        target_id: 'GATEWAY_ENDPOINTS',
        details: { count: endpoints.length }
      }]);
    } catch (err) {
      console.error('Failed to persist gateway configurations:', err);
      alert(`Database update error: ${err.message}`);
    }
  };

  // Save Commission Percentages
  const handleSaveCommissions = async (e) => {
    e.preventDefault();
    if (totalPercent !== 100) {
      setErrorMessage(`Total commission distribution must equal exactly 100%. (Current total: ${totalPercent}%)`);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commission_config',
          value: {
            adminPercent: parseFloat(adminPercent),
            agentPercent: parseFloat(agentPercent),
            staffPercent: parseFloat(staffPercent),
            collectorPercent: parseFloat(collectorPercent)
          },
          updated_by: currentUser?.username || 'admin',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'admin',
        actor_role: currentUser?.role || 'Super Admin',
        action: 'COMMISSION_CONFIG_UPDATED',
        target_type: 'SYSTEM',
        target_id: 'COMMISSION_SETTINGS',
        details: { adminPercent, agentPercent, staffPercent, collectorPercent }
      }]);

      showToast('Commission distribution rates saved!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save commission rates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border-l-4 border-[#FFD700] text-xs font-bold animate-bounce">
          <CheckCircle2 size={16} className="text-[#FFD700]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Section Header */}
      <div className="bg-gradient-to-r from-[#001D47] via-[#002B66] to-[#04337a] text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-blue-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {showGatewaysCard ? (
              <>
                <span className="bg-[#FFD700] text-[#002B66] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Server size={13} /> Branch Gateway Network
                </span>
                <span className="text-blue-200 text-xs font-mono font-bold">
                  {gatewayEndpoints.length} Active Configurations
                </span>
              </>
            ) : (
              <>
                <span className="bg-[#FFD700] text-[#002B66] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Coins size={13} /> Commission Rules
                </span>
                <span className="text-blue-200 text-xs font-mono font-bold">
                  Distribution Settings
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {showGatewaysCard ? 'Advanced System Gateway & Commission Configurations' : 'System Commission Configurations'}
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
            {showGatewaysCard
              ? 'Configure Sub-Office branch gateways, test connectivity in real-time, and manage global commission split rules.'
              : 'Define global 4-tier commission pool distribution percentages across all sub-office returned winnings.'}
          </p>
        </div>

        {showGatewaysCard && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#FFD700] hover:bg-amber-400 text-[#002B66] px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Add Gateway</span>
          </button>
        )}
      </div>

      {/* SECTION 1: Multi-Endpoint Manager Table (Hidden by default, toggled via Alt+C) */}
      {showGatewaysCard && (
        <div className="bg-white border border-slate-200 shadow-xs overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#002B66]" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#002B66]">
                Configured Gateways by Sub-Office
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 bg-[#FFD700] hover:bg-amber-400 text-[#002B66] px-3.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Endpoint</span>
              </button>
              <span className="text-[10px] bg-slate-200/70 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                Press Alt+C to Hide
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 border-r border-blue-900 w-[22%]">Gateway Name</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-center w-[16%]">Assigned Sub-Office</th>
                  <th className="px-4 py-3 border-r border-blue-900 w-[26%]">Base URL</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-center w-[12%]">Status</th>
                  <th className="px-4 py-3 text-center w-[24%]">Actions & Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {!gatewayEndpoints.length ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <span className="text-slate-400 font-bold uppercase text-xs">
                          No Gateways Configured in Database.
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenAddModal}
                          className="inline-flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95"
                        >
                          <Plus size={15} />
                          <span>Connect Gateway Manually</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  gatewayEndpoints.map((endpoint) => {
                    const test = testResults[endpoint.id];
                    const isTesting = testingId === endpoint.id;

                    return (
                      <tr key={endpoint.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 border-r border-slate-100 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{endpoint.name}</span>
                            {endpoint.is_default && (
                              <span className="bg-[#002B66] text-[#FFD700] text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate max-w-[200px]">
                            Token: {endpoint.token ? `${endpoint.token.substring(0, 18)}...` : 'None'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 border-r border-slate-100 text-center font-bold">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${
                            endpoint.sub_office === 'All'
                              ? 'bg-blue-100 text-[#002B66] border border-blue-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            <Building2 size={11} /> {endpoint.sub_office}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px] text-slate-700">
                          <span className="truncate block max-w-[240px]" title={endpoint.baseUrl}>
                            {endpoint.baseUrl}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 border-r border-slate-100 text-center">
                          <button
                            onClick={() => handleToggleActive(endpoint.id)}
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full cursor-pointer transition-all ${
                              endpoint.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${endpoint.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{endpoint.is_active ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Test Connection Button */}
                            <button
                              onClick={() => handleTestConnection(endpoint)}
                              disabled={isTesting}
                              className="inline-flex items-center gap-1 bg-blue-50 hover:bg-[#002B66] text-[#002B66] hover:text-white px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Test gateway connection"
                            >
                              <Play size={11} className={isTesting ? 'animate-spin' : ''} />
                              <span>{isTesting ? 'Testing...' : 'Test Ping'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(endpoint)}
                              className="p-1 text-slate-600 hover:text-[#002B66] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Endpoint"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Set Default */}
                            {!endpoint.is_default && (
                              <button
                                onClick={() => handleSetDefaultEndpoint(endpoint.id)}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                                title="Set as global fallback"
                              >
                                Make Default
                              </button>
                            )}

                            {/* Delete Button */}
                            {gatewayEndpoints.length > 1 && (
                              <button
                                onClick={() => handleDeleteEndpoint(endpoint)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Delete Endpoint"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Test Result Indicator */}
                          {test && (
                            <div className={`mt-2 p-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between gap-1 border ${
                              test.status === 'SUCCESS' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              <span className="font-bold">{test.status}: {test.message}</span>
                              {test.latency && <span className="font-bold shrink-0">{test.latency}ms</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Automated Commission Distribution Rates */}
      <form onSubmit={handleSaveCommissions} className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl font-black">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#002B66]">
                Automated Commission Distribution Percentages
              </h3>
              <p className="text-[11px] text-slate-500">
                Define the default 4-tier allocation split for tickets transferred into Returned Winnings
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-black font-mono ${
            totalPercent === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            Total: {totalPercent}% / 100%
          </span>
        </div>

        {errorMessage && (
          <div className="m-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs w-full min-w-0">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 min-w-0">
            <label className="text-[10px] font-extrabold text-[#002B66] uppercase block mb-1">Admin Share (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={adminPercent}
              onChange={(e) => setAdminPercent(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg font-mono font-extrabold text-[#002B66] text-sm focus:border-[#002B66] outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Default: 50%</span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
            <label className="text-[10px] font-extrabold text-slate-700 uppercase block mb-1">Agent/Teller Share (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={agentPercent}
              onChange={(e) => setAgentPercent(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg font-mono font-extrabold text-slate-900 text-sm focus:border-[#002B66] outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Default: 30%</span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
            <label className="text-[10px] font-extrabold text-slate-700 uppercase block mb-1">Staff Share (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={staffPercent}
              onChange={(e) => setStaffPercent(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg font-mono font-extrabold text-slate-900 text-sm focus:border-[#002B66] outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Default: 10%</span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
            <label className="text-[10px] font-extrabold text-slate-700 uppercase block mb-1">Collector Share (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={collectorPercent}
              onChange={(e) => setCollectorPercent(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg font-mono font-extrabold text-slate-900 text-sm focus:border-[#002B66] outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Default: 10%</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving || totalPercent !== 100}
            className="flex items-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Commission Percentages'}</span>
          </button>
        </div>
      </form>

      {/* MODAL: Add / Edit Gateway */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-[#002B66] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#FFD700]">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                <Globe size={16} className="text-[#FFD700]" />
                <span>{editingConfig ? 'Edit Branch Gateway' : 'Add New Branch Gateway'}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEndpointModal} className="p-5 space-y-4 text-xs">
              
              {/* Endpoint Name */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Gateway Name / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tipolo Branch STL Gateway"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              {/* Sub-Office Assignment (Bound to sub_offices database table) */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Assigned Sub-Office Branch *
                </label>
                <select
                  required
                  value={formData.sub_office}
                  onChange={(e) => setFormData(prev => ({ ...prev, sub_office: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-xs text-slate-800 focus:bg-white focus:border-[#002B66] outline-none cursor-pointer"
                >
                  <option value="All">All (Global Default Fallback)</option>
                  {subOfficesList.filter(s => s !== 'All').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  When a user from this branch logs in, this gateway will be queried automatically.
                </span>
              </div>

              {/* Gateway Base URL */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Gateway Base URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>

              {/* Bearer Token */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Authorization Bearer Token *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Bearer your_token_here..."
                  value={formData.token}
                  onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono text-xs text-slate-800 focus:bg-white focus:border-[#002B66] outline-none resize-none"
                />
              </div>

              {/* isClaim and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    isClaim Param
                  </label>
                  <input
                    type="number"
                    value={formData.isClaim}
                    onChange={(e) => setFormData(prev => ({ ...prev, isClaim: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono font-bold text-slate-800 focus:border-[#002B66] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={formData.is_active ? '1' : '0'}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === '1' }))}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-slate-800 focus:border-[#002B66] outline-none"
                  >
                    <option value="1">Active</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] font-black rounded-lg uppercase tracking-wider cursor-pointer shadow-md"
                >
                  {editingConfig ? 'Save Changes' : 'Add Endpoint'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE ENDPOINT CONFIRM POPOVER */}
      <ConfirmPopover
        isOpen={Boolean(deletingEndpoint)}
        title="Delete Gateway Configuration"
        type="danger"
        confirmText="Delete Gateway"
        onCancel={() => setDeletingEndpoint(null)}
        onConfirm={executeDeleteEndpoint}
      >
        {deletingEndpoint && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to permanently delete gateway configuration <strong>"{deletingEndpoint.name}"</strong>?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Sub-Office Scope:</span>
                <span className="font-bold text-slate-800">{deletingEndpoint.sub_office}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold">Base URL:</span>
                <span className="font-bold text-rose-900 truncate max-w-[200px]">{deletingEndpoint.baseUrl}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Removing this endpoint will stop automatic polling for tickets connected to this sub-office.
            </p>
          </div>
        )}
      </ConfirmPopover>

    </div>
  );
}
