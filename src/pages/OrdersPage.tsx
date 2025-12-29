import { useState, useEffect } from 'react';
import api  from '../lib/api';
import CreateOrderModal from '../components/CreateOrderModal';
import { Plus, RefreshCw, Search, Filter, ChevronDown, User, Store } from 'lucide-react';

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  restaurant_name?: string;
  driver_name?: string;
  status: string;
  order_total: number;
  created_at: string;
  otp?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [driverEarnings, setDriverEarnings] = useState<string>('50');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    loadOrders();
    loadDrivers();
    
    // Initial load interval (fallback)
    const interval = setInterval(loadOrders, 30000);

    // WebSocket Connection
    const token = localStorage.getItem('admin_token');
    let ws: WebSocket | null = null;

    if (token) {
      // Determine WebSocket URL based on current environment
      // If running via Vite proxy, we might need to point to localhost:8000 directly
      // or use the same host if deployed
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/admin?token=${token}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ [OrdersPage] WebSocket Connected to Live Updates');
        console.log(`   URL: ${wsUrl}`);
        setIsLive(true);
      };

      ws.onmessage = (event) => {
        try {
          console.log('📨 [OrdersPage] WebSocket message received:', event.data);
          const message = JSON.parse(event.data);
          console.log('   Parsed message:', message);
          
          if (message.type === 'order_update') {
            console.log('🔄 [OrdersPage] Order update detected:', message.data);
            console.log('   Reloading orders immediately...');
            // Reload orders immediately on update
            loadOrders();
            // Optional: Show a toast notification
          }
        } catch (e) {
          console.error('❌ [OrdersPage] Error parsing WS message', e);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ [OrdersPage] WebSocket Disconnected from Live Updates');
        console.log(`   Code: ${event.code}, Reason: ${event.reason || 'None'}`);
        setIsLive(false);
      };

      ws.onerror = (error) => {
        console.error('⚠️ [OrdersPage] WebSocket error:', error);
        setIsLive(false);
      };
    }

    return () => {
      clearInterval(interval);
      if (ws) {
        ws.close();
      }
    };
  }, [statusFilter]);

  const loadOrders = async () => {
    console.log('🔄 [OrdersPage] Loading orders...');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/orders', { params });
      console.log(`✅ [OrdersPage] Loaded ${response.data.length} orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('❌ [OrdersPage] Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      // Only show drivers who are ONLINE and APPROVED/ACTIVE
      setDrivers(response.data.filter((d: any) => 
        ['APPROVED', 'ACTIVE'].includes(d.status) && d.is_online === true
      ));
    } catch (error) {
      console.error('Failed to load drivers:', error);
    }
  };

  const assignDriver = async (orderId: number, driverId: number, earnings: number) => {
    try {
      await api.post(`/orders/${orderId}/assign`, { 
        driver_id: driverId,
        driver_earnings: earnings
      });
      loadOrders();
      setShowAssignModal(false);
      setAssignOrderId(null);
      setSelectedDriverId(null);
      setDriverEarnings('50');
      alert('Driver assigned successfully');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to assign driver');
    }
  };

  const unassignOrder = async (orderId: number, orderDriver: string) => {
    if (!confirm(`⚠️ DEV TOOL: Unassign Order?\n\nThis will unassign order #${orderId} from ${orderDriver}.\n\nDriver will be notified via WebSocket.\n\nContinue?`)) {
      return;
    }

    try {
      await api.post(`/orders/${orderId}/unassign`);
      loadOrders();
      alert(`✅ Order #${orderId} unassigned from ${orderDriver}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to unassign order');
    }
  };

  const markAsDelivered = async (orderId: number) => {
    if (!confirm('Mark this order as DELIVERED?\n\nThis will:\n• Update order status to DELIVERED\n• Create driver earnings\n• Create restaurant earnings\n• Create financial records\n\nThis action cannot be undone.')) {
      return;
    }

    try {
      await api.post(`/orders/${orderId}/admin-deliver`);
      loadOrders();
      alert('✅ Order marked as delivered successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to mark order as delivered');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
      ASSIGNED: 'bg-blue-50 text-blue-600 border-blue-200',
      ACCEPTED: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      PICKED_UP: 'bg-amber-50 text-amber-600 border-amber-200',
      IN_TRANSIT: 'bg-orange-50 text-orange-600 border-orange-200',
      DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Orders
            </h1>
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100 animate-pulse">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-full border border-slate-200">
                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                OFFLINE
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Manage and track delivery orders</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/20 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Order
          </button>
          
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
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={loadOrders}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Restaurant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900">#{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {order.customer_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{order.customer_name}</div>
                        <div className="text-xs text-slate-500">{order.customer_phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{order.restaurant_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{order.driver_name || <span className="text-slate-400 italic">Unassigned</span>}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">₹{order.order_total.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setAssignOrderId(order.id);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold transition-all"
                        >
                          Assign Driver
                        </button>
                      )}
                      {['ASSIGNED', 'ACCEPTED'].includes(order.status) && order.driver_name && (
                        <button
                          onClick={() => unassignOrder(order.id, order.driver_name || 'driver')}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg text-xs font-semibold transition-all"
                          title="⚠️ Dev Tool: Unassign order from driver"
                        >
                          🔄 Unassign
                        </button>
                      )}
                      {['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status) && (
                        <button
                          onClick={() => markAsDelivered(order.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-semibold transition-all"
                        >
                          ✓ Mark Delivered
                        </button>
                      )}
                      {order.status === 'IN_TRANSIT' && order.otp && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="text-xs font-semibold text-amber-700">OTP:</span>
                          <span className="text-sm font-bold text-amber-800 font-mono tracking-wider">{order.otp}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-lg">No orders found</p>
            <p className="text-slate-400 text-sm mt-2">Try adjusting your filters or create a new order</p>
          </div>
        )}
      </div>

      {showAssignModal && assignOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">Assign Driver</h2>
              <p className="text-slate-500 text-sm mt-1">Order #{assignOrderId}</p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Driver Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Driver
                </label>
                <select
                  value={selectedDriverId || ''}
                  onChange={(e) => setSelectedDriverId(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                >
                  <option value="" disabled>Choose a driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.vehicle_registration || 'No Vehicle'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Earnings Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Driver Earnings (₹)
                </label>
                <input
                  type="number"
                  value={driverEarnings}
                  onChange={(e) => setDriverEarnings(e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="50.00"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="text-xs text-slate-500 mt-1.5">Amount the driver will earn for this delivery</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignOrderId(null);
                  setSelectedDriverId(null);
                  setDriverEarnings('50');
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDriverId && parseFloat(driverEarnings) > 0) {
                    assignDriver(assignOrderId, selectedDriverId, parseFloat(driverEarnings));
                  } else {
                    alert('Please select a driver and enter valid earnings');
                  }
                }}
                disabled={!selectedDriverId || parseFloat(driverEarnings) <= 0}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Assign Order
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadOrders}
        />
      )}
    </div>
  );
}
