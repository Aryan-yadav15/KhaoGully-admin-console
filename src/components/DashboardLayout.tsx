import { useAuthStore } from '@/store/authStore';
import { LogOut, Menu, Home, Package, Users, Layers, ChevronRight, Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/orders', label: 'Orders', icon: Package },
    { path: '/drivers', label: 'Drivers', icon: Users },
    { path: '/pools', label: 'Pools', icon: Layers },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`relative z-50 bg-slate-900 text-white transition-all duration-300 ease-in-out shadow-2xl flex flex-col shrink-0
          ${sidebarOpen ? 'w-72' : 'w-20'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Area */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                <span className="text-white font-bold text-xl">K</span>
              </div>
              <div className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                <h1 className="text-lg font-bold tracking-tight">Khao Gully</h1>
                <p className="text-xs text-slate-400">Admin Console</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative overflow-hidden
                    ${active 
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className={`w-6 h-6 shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className={`font-medium whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute left-14'}`}>
                    {item.label}
                  </span>
                  {active && sidebarOpen && (
                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-800 shrink-0">
            <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-inner shrink-0">
                {admin?.full_name?.charAt(0) || 'A'}
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                <p className="text-sm font-semibold truncate">{admin?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">Administrator</p>
              </div>
              {sidebarOpen && (
                <button 
                  onClick={logout}
                  className="ml-auto p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 shrink-0 glass border-b border-slate-200/50 px-8 flex items-center justify-between z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              {sidebarOpen ? <Menu className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/50 rounded-full border border-slate-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all w-64">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full relative text-slate-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-10 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
