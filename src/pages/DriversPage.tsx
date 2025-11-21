import { useState, useEffect } from 'react';
import api  from '../lib/api';
import { RefreshCw, Filter, CheckCircle, XCircle, AlertCircle, Car, Star, ChevronDown } from 'lucide-react';

interface Driver {
  id: number;
  name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  vehicle_number: string;
  status: string;
  is_available: boolean;
  is_online: boolean;
  completed_orders: number;
  cancelled_orders: number;
  rating: number;
  created_at: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadDrivers();
    const interval = setInterval(loadDrivers, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadDrivers = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/drivers', { params });
      setDrivers(response.data);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDriverStatus = async (driverId: number, status: string) => {
    try {
      await api.patch(`/drivers/${driverId}/status`, { status });
      loadDrivers();
      alert(`Driver ${status} successfully`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update driver status');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertCircle, label: 'Pending' },
      approved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Approved' },
      blocked: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Blocked' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badge.color} border`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading drivers...</p>
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
            Drivers
          </h1>
          <p className="text-slate-500 mt-1">Manage your delivery fleet</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="blocked">Blocked</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={loadDrivers}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Availability</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-100">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900">#{driver.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{driver.name}</div>
                        <div className="text-xs text-slate-500">{driver.phone}</div>
                        {driver.email && <div className="text-xs text-slate-400">{driver.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{driver.vehicle_type}</div>
                        <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{driver.vehicle_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(driver.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${driver.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`text-xs font-semibold ${driver.is_online ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {driver.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      {driver.is_available && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <CheckCircle className="w-3 h-3" />
                          Available
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {driver.completed_orders}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">Done</div>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-red-500 font-bold text-sm">
                          <XCircle className="w-4 h-4" />
                          {driver.cancelled_orders}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">Cancel</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-100 w-fit">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-slate-900">{driver.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {driver.status === 'pending' && (
                        <button
                          onClick={() => updateDriverStatus(driver.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all"
                        >
                          Approve
                        </button>
                      )}
                      {driver.status === 'approved' && (
                        <button
                          onClick={() => updateDriverStatus(driver.id, 'blocked')}
                          className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded-lg text-xs font-semibold transition-all"
                        >
                          Block
                        </button>
                      )}
                      {driver.status === 'blocked' && (
                        <button
                          onClick={() => updateDriverStatus(driver.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all"
                        >
                          Unblock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {drivers.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
              <Car className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-lg">No drivers found</p>
            <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
