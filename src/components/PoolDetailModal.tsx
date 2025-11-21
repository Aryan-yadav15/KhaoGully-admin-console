import { useEffect, useState } from 'react';
import api from '../lib/api';
import { X, MapPin, Clock, DollarSign, Truck, Package, Navigation, CheckCircle, AlertCircle, User, ChevronRight, Layers } from 'lucide-react';

interface DriverGroup {
  group_id: number;
  driver_id: number | null;
  order_ids: number[];
  restaurant_ids: number[];
  center_lat: number;
  center_lng: number;
  radius_km: number;
  pickup_sequence: Array<{
    restaurant_id: number;
    name: string;
    lat: number;
    lng: number;
    order_ids: number[];
  }>;
  delivery_sequence: Array<{
    order_id: number;
    customer_name: string;
    address: string;
    lat: number;
    lng: number;
    distance_from_prev: number;
  }>;
  total_distance_km: number;
  estimated_time_minutes: number;
  total_order_value: number;
  driver_earnings: number;
}

interface PoolDetail {
  pool_id: number;
  external_pool_id: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  synced_at: string | null;
  total_orders: number;
  total_value: number;
  unique_restaurants: number;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  driver_groups: DriverGroup[];
  total_drivers_needed: number;
  assigned_drivers: number;
}

interface Driver {
  id: number;
  name: string;
  status: string;
  is_online: boolean;
  is_available: boolean;
  vehicle_registration: string;
}

interface PoolDetailModalProps {
  poolId: number;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PoolDetailModal({ poolId, onClose, onUpdate }: PoolDetailModalProps) {
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [grouping, setGrouping] = useState(false);

  useEffect(() => {
    loadPoolDetail();
    loadDrivers();
  }, [poolId]);

  const loadPoolDetail = async () => {
    try {
      const response = await api.get(`/pools/${poolId}`);
      setPool(response.data);
    } catch (error) {
      console.error('Failed to load pool details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      // Filter for APPROVED drivers
      const approved = response.data.filter((d: Driver) => 
        d.status === 'APPROVED' || d.status === 'approved'
      );
      setDrivers(approved);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    }
  };

  const handleGroupOrders = async () => {
    setGrouping(true);
    try {
      await api.post(`/pools/${poolId}/group`);
      await loadPoolDetail();
      alert('✅ Orders grouped successfully!');
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.detail || 'Grouping failed'}`);
    } finally {
      setGrouping(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedGroupId || !selectedDriverId) return;

    setAssigning(true);
    try {
      const response = await api.post(
        `/pools/${poolId}/groups/${selectedGroupId}/assign`,
        null,
        { params: { driver_id: selectedDriverId } }
      );
      
      alert(`✅ ${response.data.message}`);
      await loadPoolDetail();
      await loadDrivers();
      setSelectedGroupId(null);
      setSelectedDriverId('');
      onUpdate();
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.detail || 'Assignment failed'}`);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-slate-500 font-medium">Loading pool details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return null;
  }

  const availableDrivers = drivers.filter(d => d.is_available);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pool #{pool.pool_id}</h2>
                {pool.external_pool_id && (
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{pool.external_pool_id}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {/* Pool Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">Total Orders</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{pool.total_orders}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">₹{pool.total_value.toFixed(2)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">Restaurants</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{pool.unique_restaurants}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <Navigation className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">Radius</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{pool.radius_km.toFixed(2)}km</div>
            </div>
          </div>

          {/* Geographic Info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              Geographic Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Center Point</span>
                <span className="font-mono text-slate-900 bg-white px-3 py-1 rounded border border-slate-200 text-sm">
                  {pool.center_lat.toFixed(6)}°N, {pool.center_lng.toFixed(6)}°E
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Coverage Radius</span>
                <span className="font-mono text-slate-900 bg-white px-3 py-1 rounded border border-slate-200 text-sm">
                  {pool.radius_km.toFixed(2)} km
                </span>
              </div>
            </div>
          </div>

          {/* Driver Assignment Summary */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Driver Assignments
                </h3>
                <p className="text-amber-700 mt-1 font-medium">
                  {pool.assigned_drivers} of {pool.total_drivers_needed} groups assigned
                </p>
              </div>
              {pool.driver_groups.length === 0 && (
                <button
                  onClick={handleGroupOrders}
                  disabled={grouping}
                  className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  {grouping ? 'Grouping...' : 'Run Grouping Algorithm'}
                </button>
              )}
            </div>
          </div>

          {/* Driver Groups */}
          {pool.driver_groups.length > 0 ? (
            <div className="space-y-6">
              {pool.driver_groups.map((group) => (
                <div key={group.group_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-slate-50/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        Driver Group #{group.group_id}
                        {group.driver_id && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Assigned
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {group.order_ids.length} orders</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {group.pickup_sequence.length} stops</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5" /> {group.total_distance_km}km</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ~{group.estimated_time_minutes}min</span>
                      </div>
                    </div>
                    {!group.driver_id && (
                      <button
                        onClick={() => setSelectedGroupId(group.group_id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Assign Driver
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Restaurants */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Pickup Sequence
                        </h5>
                        <div className="space-y-4 relative">
                          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-100"></div>
                          {group.pickup_sequence.map((restaurant, idx) => (
                            <div key={restaurant.restaurant_id} className="relative flex items-start gap-4">
                              <span className="relative z-10 shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                {idx + 1}
                              </span>
                              <div className="bg-slate-50 rounded-xl p-3 flex-1 border border-slate-100">
                                <div className="font-bold text-slate-900 text-sm">{restaurant.name}</div>
                                <div className="text-slate-500 text-xs mt-1 font-medium">
                                  {restaurant.order_ids.length} order{restaurant.order_ids.length > 1 ? 's' : ''} to pickup
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Deliveries */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          Delivery Sequence
                        </h5>
                        <div className="space-y-4 relative">
                          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-100"></div>
                          {group.delivery_sequence.map((delivery, idx) => (
                            <div key={delivery.order_id} className="relative flex items-start gap-4">
                              <span className="relative z-10 shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                {idx + 1}
                              </span>
                              <div className="bg-slate-50 rounded-xl p-3 flex-1 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Order #{delivery.order_id}
                                  </span>
                                  {delivery.distance_from_prev > 0 && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      +{delivery.distance_from_prev.toFixed(1)}km
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-600 text-xs font-medium mb-1">{delivery.customer_name}</div>
                                <div className="text-slate-400 text-xs truncate">{delivery.address}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="mt-6 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Order Value</div>
                          <div className="text-xl font-bold text-emerald-900">
                            ₹{group.total_order_value.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Driver Earnings</div>
                          <div className="text-xl font-bold text-emerald-900">
                            ₹{group.driver_earnings.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Modal */}
                  {selectedGroupId === group.group_id && (
                    <div className="bg-blue-50/50 border-t border-blue-100 p-6 animate-fade-in">
                      <h5 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Assign Driver to Group #{group.group_id}
                      </h5>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                          >
                            <option value="">Select a driver...</option>
                            {availableDrivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name} ({driver.vehicle_registration}) {driver.is_online ? '• Online' : '• Offline'}
                              </option>
                            ))}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                        <button
                          onClick={handleAssignDriver}
                          disabled={!selectedDriverId || assigning}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all"
                        >
                          {assigning ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGroupId(null);
                            setSelectedDriverId('');
                          }}
                          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      {availableDrivers.length === 0 && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 w-fit">
                          <AlertCircle className="w-4 h-4" />
                          No available drivers found. All drivers are busy or offline.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-full mb-6">
                <Layers className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Driver Groups Yet</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Run the grouping algorithm to optimize delivery routes and assign drivers efficiently.
              </p>
              <button
                onClick={handleGroupOrders}
                disabled={grouping}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                {grouping ? 'Running Algorithm...' : 'Group Orders Now'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 px-8 py-5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
