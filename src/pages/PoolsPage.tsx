import { useEffect, useState } from 'react';
import api from '../lib/api';
import PoolDetailModal from '../components/PoolDetailModal';
import { RefreshCw, Filter, Package, Truck, CheckCircle, Clock, AlertCircle, ChevronDown, Database } from 'lucide-react';

interface Pool {
  pool_id: number;
  external_pool_id: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  synced_at: string | null;
  total_orders: number;
  total_value: number;
  assigned_orders: number;
}

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const loadPools = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await api.get('/pools', { params });
      setPools(response.data);
    } catch (error) {
      console.error('Failed to load pools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
    const interval = setInterval(loadPools, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleSyncPool = async () => {
    setSyncLoading(true);
    setSyncMessage('');
    
    try {
      const response = await api.post('/pools/sync', {
        fetch_latest: true,
        force_resync: false
      });
      
      if (response.data.success) {
        setSyncMessage(`✅ Synced ${response.data.orders_synced} orders from pool ${response.data.external_pool_id}`);
        loadPools();
      } else {
        setSyncMessage(`⚠️ ${response.data.message || response.data.error}`);
      }
    } catch (error: any) {
      setSyncMessage(`❌ ${error.response?.data?.detail || 'Sync failed'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
      CLOSED: 'bg-amber-50 text-amber-700 border-amber-200',
      SYNCED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ASSIGNED: 'bg-purple-50 text-purple-700 border-purple-200',
      IN_PROGRESS: 'bg-orange-50 text-orange-700 border-orange-200',
      COMPLETED: 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      OPEN: Clock,
      CLOSED: AlertCircle,
      SYNCED: CheckCircle,
      ASSIGNED: Truck,
      IN_PROGRESS: RefreshCw,
      COMPLETED: CheckCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading pools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Pool Management
          </h1>
          <p className="text-slate-500 mt-1">Manage order pools and driver assignments</p>
        </div>
        <button
          onClick={() => setShowSyncModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Database className="w-5 h-5" />
          Sync from Supabase
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
          >
            <option value="">All Status</option>
            <option value="CLOSED">Closed</option>
            <option value="SYNCED">Synced</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={loadPools}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pools.map((pool) => (
          <div
            key={pool.pool_id}
            className="glass-card rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            onClick={() => setSelectedPoolId(pool.pool_id)}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-24 h-24 text-slate-900" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Pool #{pool.pool_id}
                    </h3>
                  </div>
                  {pool.external_pool_id && (
                    <p className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                      {pool.external_pool_id.substring(0, 8)}...
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(pool.status)}`}>
                  {getStatusIcon(pool.status)}
                  {pool.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Orders</span>
                  <span className="font-bold text-slate-900">
                    {pool.assigned_orders} <span className="text-slate-400 font-normal">/ {pool.total_orders}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Total Value</span>
                  <span className="font-bold text-emerald-600">
                    ₹{pool.total_value.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                  <span>Created</span>
                  <span className="font-medium">
                    {new Date(pool.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {pool.synced_at && (
                  <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                    <span>Synced</span>
                    <span className="font-medium">
                      {new Date(pool.synced_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Progress</span>
                  <span>{Math.round((pool.total_orders > 0 ? (pool.assigned_orders / pool.total_orders) * 100 : 0))}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-linear-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${pool.total_orders > 0 ? (pool.assigned_orders / pool.total_orders) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pools.length === 0 && (
        <div className="text-center py-20 glass-card rounded-2xl border border-slate-200/60">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-full mb-6">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Pools Found</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Sync orders from Supabase to create pools and start managing deliveries.
          </p>
          <button
            onClick={() => setShowSyncModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Sync from Supabase</h2>
            </div>
            
            {syncMessage && (
              <div className={`mb-6 p-4 rounded-xl border ${
                syncMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                syncMessage.startsWith('⚠️') ? 'bg-amber-50 text-amber-800 border-amber-100' :
                'bg-red-50 text-red-800 border-red-100'
              }`}>
                <pre className="whitespace-pre-wrap text-sm font-medium font-sans">{syncMessage}</pre>
              </div>
            )}

            <p className="text-slate-600 mb-6 leading-relaxed">
              This will fetch the latest closed pool from the customer website's Supabase database
              and import all paid orders.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">Note:</strong> Supabase credentials must be configured in backend .env file.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncMessage('');
                }}
                disabled={syncLoading}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncPool}
                disabled={syncLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Latest Pool'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pool Detail Modal */}
      {selectedPoolId && (
        <PoolDetailModal
          poolId={selectedPoolId}
          onClose={() => setSelectedPoolId(null)}
          onUpdate={loadPools}
        />
      )}
    </div>
  );
}
