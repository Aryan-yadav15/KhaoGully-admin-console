import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { RefreshCw, Database, Package, Truck, CheckCircle, Clock, AlertCircle, Users, MapPin } from 'lucide-react';

interface Pool {
  pool_id: number;
  external_pool_id: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  synced_at: string | null;
  total_orders: number;
  total_value: number;
  pending_orders: number;
  assigned_orders: number;
  delivered_orders: number;
  restaurant_count: number;
}

interface Order {
  order_id: number;
  external_order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  restaurant_id: number;
  restaurant_name: string;
  items: any[];
  total_amount: number;
  delivery_address: string;
  special_instructions: string | null;
  status: string;
  driver_id: number | null;
  driver_name: string | null;
  otp: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

interface Driver {
  driver_id: number;
  name: string;
  phone: string;
  vehicle_type: string;
  is_available: boolean;
}

export default function PoolsPageNew() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [poolOrders, setPoolOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [driverEarnings, setDriverEarnings] = useState<string>('50');
  const ws = useRef<WebSocket | null>(null);

  // Load pools
  const loadPools = async () => {
    try {
      const response = await api.get('/pools');
      setPools(response.data);
    } catch (error) {
      console.error('Failed to load pools:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load pool details
  const loadPoolDetails = async (poolId: number) => {
    try {
      const response = await api.get(`/pools/${poolId}/details`);
      setPoolOrders(response.data.orders);
      setSelectedPool(response.data.pool);
    } catch (error) {
      console.error('Failed to load pool details:', error);
    }
  };

  // Load available drivers
  const loadDrivers = async () => {
    try {
      const response = await api.get('/available-drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    }
  };

  // Sync from Supabase
  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const response = await api.post('/sync/trigger-sync');
      alert(`✅ Sync completed!\nSynced: ${response.data.details.synced}\nSkipped: ${response.data.details.skipped}\nErrors: ${response.data.details.errors}`);
      loadPools();
    } catch (error: any) {
      alert(`❌ Sync failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Assign driver to selected orders
  const handleAssignDriver = async () => {
    if (!selectedDriver || selectedOrders.size === 0 || !selectedPool) return;

    try {
      await api.post(`/pools/${selectedPool.pool_id}/assign-driver`, {
        order_ids: Array.from(selectedOrders),
        driver_id: selectedDriver,
        driver_earnings: driverEarnings ? parseFloat(driverEarnings) : null
      });
      
      alert('✅ Driver assigned successfully!');
      setSelectedOrders(new Set());
      setSelectedDriver(null);
      setDriverEarnings('50');
      loadPoolDetails(selectedPool.pool_id);
      loadPools();
    } catch (error: any) {
      alert(`❌ Assignment failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: number) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrders(newSet);
  };

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/admin?token=${token}`;

    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('✅ [PoolsPage] WebSocket Connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 [PoolsPage] WebSocket message:', data);
        
        // Reload data on order status change
        if ((data.type === 'order_status_update' || data.type === 'order_update') && selectedPool) {
          console.log('🔄 Pool update detected, reloading...');
          loadPoolDetails(selectedPool.pool_id);
          loadPools();
        }
      } catch (e) {
        console.error('❌ [PoolsPage] Error parsing WS message', e);
      }
    };

    ws.current.onerror = (error) => {
      console.error('⚠️ [PoolsPage] WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [selectedPool]);

  useEffect(() => {
    loadPools();
    loadDrivers();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SYNCED: 'bg-emerald-500',
      ASSIGNED: 'bg-purple-500',
      PENDING: 'bg-amber-500',
      ACCEPTED: 'bg-blue-500',
      PICKED_UP: 'bg-indigo-500',
      IN_TRANSIT: 'bg-orange-500',
      DELIVERED: 'bg-green-500',
    };
    return colors[status] || 'bg-slate-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pool Management</h1>
          <p className="text-slate-500 mt-1">Sync pools from Supabase and assign drivers</p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncLoading}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium shadow-lg transition-all"
        >
          {syncLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Database className="w-5 h-5" />
          )}
          Sync from Supabase
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Pools</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{pools.length}</p>
            </div>
            <Package className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {pools.reduce((sum, p) => sum + p.total_orders, 0)}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-emerald-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Value</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                ₹{pools.reduce((sum, p) => sum + p.total_value, 0).toFixed(0)}
              </p>
            </div>
            <span className="text-4xl">💰</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Pending Orders</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {pools.reduce((sum, p) => sum + p.pending_orders, 0)}
              </p>
            </div>
            <Clock className="w-12 h-12 text-amber-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pools List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Pools</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
            </div>
          ) : pools.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No pools yet</p>
              <p className="text-slate-400 text-sm mt-1">Click "Sync from Supabase" to load pools</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <button
                  key={pool.pool_id}
                  onClick={() => loadPoolDetails(pool.pool_id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedPool?.pool_id === pool.pool_id
                      ? 'bg-orange-50 border-orange-500 shadow-md'
                      : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800">Pool #{pool.pool_id}</span>
                    {pool.total_orders > 0 && pool.delivered_orders === pool.total_orders ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-emerald-500">
                        ALL DELIVERED
                      </span>
                    ) : pool.total_orders > 0 && pool.pending_orders === 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-purple-500">
                        ASSIGNED
                      </span>
                    ) : pool.assigned_orders > 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-orange-500">
                        PARTIALLY ASSIGNED
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(pool.status)}`}>
                        {pool.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Orders</p>
                      <p className="font-semibold text-slate-800">{pool.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Value</p>
                      <p className="font-semibold text-slate-800">₹{pool.total_value}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pending</p>
                      <p className="font-semibold text-amber-600">{pool.pending_orders}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Delivered</p>
                      <p className="font-semibold text-emerald-600">{pool.delivered_orders || 0}</p>
                    </div>
                  </div>

                  {pool.synced_at && (
                    <p className="text-xs text-slate-400 mt-2">
                      Synced: {new Date(pool.synced_at).toLocaleString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Orders & Assignment */}
        <div className="lg:col-span-2 space-y-4 sticky top-6 h-fit self-start">
          {!selectedPool ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Select a pool to view orders</p>
            </div>
          ) : (
            <>
              {/* Driver Assignment Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-500" />
                  Assign Driver
                </h3>

                <div className="flex items-center gap-4">
                  <select
                    value={selectedDriver || ''}
                    onChange={(e) => setSelectedDriver(Number(e.target.value))}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.driver_id} value={driver.driver_id}>
                        {driver.name} - {driver.phone} ({driver.vehicle_type})
                      </option>
                    ))}
                  </select>

                  <div className="w-32">
                    <input
                      type="number"
                      value={driverEarnings}
                      onChange={(e) => setDriverEarnings(e.target.value)}
                      placeholder="Earnings"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <button
                    onClick={handleAssignDriver}
                    disabled={!selectedDriver || selectedOrders.size === 0}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Assign {selectedOrders.size > 0 && `(${selectedOrders.size})`}
                  </button>
                </div>

                {selectedOrders.size > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedOrders.size} order(s) selected
                  </p>
                )}
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Orders</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrders(new Set(poolOrders.filter(o => !o.driver_id).map(o => o.order_id)));
                              } else {
                                setSelectedOrders(new Set());
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Restaurant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">OTP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {poolOrders.map((order) => (
                        <tr key={order.order_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {!order.driver_id && (
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.order_id)}
                                onChange={() => toggleOrderSelection(order.order_id)}
                                className="rounded border-slate-300"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-800">{order.customer_name}</p>
                              <p className="text-sm text-slate-500">{order.customer_phone}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-800">{order.restaurant_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">₹{order.total_amount}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {order.driver_name ? (
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-orange-500" />
                                <span className="text-sm text-slate-800">{order.driver_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">Not assigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {order.otp ? (
                              <span className="font-mono font-bold text-lg text-orange-600">{order.otp}</span>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
