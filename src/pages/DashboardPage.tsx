import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Package, Clock, Users, DollarSign, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  activeOrders: number;
  pendingOrders: number;
  onlineDrivers: number;
  totalRevenue: number;
}

const data = [
  { name: '10 AM', orders: 4, revenue: 240 },
  { name: '11 AM', orders: 7, revenue: 450 },
  { name: '12 PM', orders: 15, revenue: 1200 },
  { name: '1 PM', orders: 23, revenue: 1800 },
  { name: '2 PM', orders: 18, revenue: 1400 },
  { name: '3 PM', orders: 12, revenue: 900 },
  { name: '4 PM', orders: 8, revenue: 600 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    activeOrders: 0,
    pendingOrders: 0,
    onlineDrivers: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    
    // WebSocket Connection
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    // Use correct protocol (ws/wss)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/api/v1/ws/admin?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Connected to Admin WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'order_update') {
          console.log('🔔 Order Update:', message.data);
          
          // Refresh stats immediately
          loadStats();
          
          // Add to activity feed
          const newActivity = {
            id: Date.now(),
            time: 'Just now',
            title: `Order #${message.data.order_id} is ${message.data.status}`,
            subtitle: `Driver: ${message.data.driver_name || 'Unknown'}`
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 5));
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [ordersRes, driversRes] = await Promise.all([
        api.get('/orders'),
        api.get('/drivers'),
      ]);
      
      const orders = ordersRes.data;
      const drivers = driversRes.data;

      setStats({
        activeOrders: orders.filter((o: any) => 
          ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
        ).length,
        pendingOrders: orders.filter((o: any) => o.status === 'PENDING').length,
        onlineDrivers: drivers.filter((d: any) => d.is_online).length,
        totalRevenue: orders
          .filter((o: any) => o.status === 'DELIVERED')
          .reduce((sum: number, o: any) => sum + o.total_amount, 0),
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }: any) => (
    <div className="glass-card p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${colorClass} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl bg-linear-to-br ${colorClass} text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your delivery operations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Operational
          </span>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
        <StatCard
          title="Active Orders"
          value={stats.activeOrders}
          icon={Package}
          colorClass="from-blue-500 to-blue-600"
          trend="up"
          trendValue="+12%"
        />
        
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Clock}
          colorClass="from-orange-500 to-orange-600"
          trend="down"
          trendValue="-5%"
        />
        
        <StatCard
          title="Online Drivers"
          value={stats.onlineDrivers}
          icon={Users}
          colorClass="from-emerald-500 to-emerald-600"
          trend="up"
          trendValue="+8%"
        />

        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          colorClass="from-purple-500 to-purple-600"
          trend="up"
          trendValue="+24%"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Revenue & Orders
            </h2>
            <select className="text-sm border-none bg-slate-100 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-orange-200">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                  itemStyle={{fontSize: '12px', fontWeight: 600}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Live Activity
            </h2>
          </div>
          
          <div className="space-y-6 relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>

            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="relative pl-10 group">
                  <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-blue-500 z-10 group-hover:scale-125 transition-transform"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 mb-0.5">{activity.time}</span>
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="text-xs text-slate-500">{activity.subtitle}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No recent activity
              </div>
            )}
          </div>
          
          <button className="w-full mt-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
