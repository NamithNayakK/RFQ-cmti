import './index.css';
import { useState, useEffect } from 'react';
import { FiHome, FiTrendingUp, FiShoppingCart, FiDollarSign, FiBell, FiUser, FiPackage, FiLogOut, FiFileText, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ManufacturerDashboard from './pages/manufacturer/Dashboard';
import ProductionQueue from './pages/manufacturer/ProductionQueue';
import QuotationManagement from './pages/manufacturer/QuotationManagement';
import Orders from './pages/manufacturer/Orders';
import CostManagement from './pages/manufacturer/CostManagement';
import CadViewerPage from './pages/manufacturer/CadViewerPage';
import NotificationCenter from './components/NotificationCenter';
import { fileService } from './api/fileService';

function ManufacturerApp({ onLogout }) {
  // Always default to Dashboard on first load (ignore localStorage)
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('manufacturerSidebarCollapsed') === 'true';
  });
  const [quotationFilter, setQuotationFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cadViewerRequest, setCadViewerRequest] = useState(null);

  useEffect(() => {
    localStorage.setItem('manufacturerActivePage', activeNav);
  }, [activeNav]);

  useEffect(() => {
    localStorage.setItem('manufacturerSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleNavigate = (page, filter = null) => {
    if (filter) {
      setQuotationFilter(filter);
    }
    setActiveNav(page);
  };

  const handleOpenCadViewer = (request) => {
    setCadViewerRequest(request);
    setActiveNav('3D Viewer');
  };

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const count = await fileService.getUnreadNotificationsCount();
        setUnreadCount(count);
      } catch (err) {
        console.error('Error checking notifications:', err);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard':
        return <ManufacturerDashboard onRefresh={() => setRefreshTrigger(t => t + 1)} onNavigate={handleNavigate} />;
      case 'Quotations':
        return (
          <QuotationManagement
            refreshTrigger={refreshTrigger}
            filterStatus={quotationFilter}
            onOpenCadViewer={handleOpenCadViewer}
          />
        );
      case '3D Viewer':
        return (
          <CadViewerPage
            request={cadViewerRequest}
            onBack={() => setActiveNav('Quotations')}
          />
        );
      case 'Production Queue':
        return <ProductionQueue refreshTrigger={refreshTrigger} />;
      case 'Orders':
        return <Orders refreshTrigger={refreshTrigger} onRefresh={() => setRefreshTrigger(t => t + 1)} />;
      case 'Cost Management':
        return <CostManagement />;
      default:
        return <ManufacturerDashboard onRefresh={() => setRefreshTrigger(t => t + 1)} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-manufacturing-primary text-white flex flex-col transition-all duration-200 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="px-4 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-manufacturing-accent flex items-center justify-center text-white font-bold">
              <FiPackage size={20} />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <p className="text-lg font-semibold">Cost Management System</p>
                <p className="text-xs text-white/70">Manufacturing</p>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              type="button"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
            </button>
          </div>
        </div>

        <nav className="px-4 py-6 space-y-2 flex-1">
          {[
            { name: 'Dashboard', icon: FiHome },
            { name: 'Quotations', icon: FiFileText },
            { name: 'Production Queue', icon: FiTrendingUp },
            { name: 'Orders', icon: FiShoppingCart },
            { name: 'Cost Management', icon: FiDollarSign },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveNav(item.name);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-manufacturing-accent text-white shadow'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon size={18} />
                {!isSidebarCollapsed && item.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-6 pb-6">
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200">
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{activeNav}</h1>
              <p className="text-sm text-slate-500">Manage your manufacturing operations</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-manufacturing-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                <FiUser size={18} />
                <span>Manufacturer</span>
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('userRole');
                  if (onLogout) onLogout();
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Logout"
              >
                <FiLogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className={`flex-1 ${
            activeNav === '3D Viewer' ? 'overflow-hidden p-0' : 'overflow-auto p-8'
          }`}
        >
          {renderContent()}
        </main>
      </div>

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
          onNotificationClick={() => {
            setActiveNav('Quotations');
            setShowNotifications(false);
          }}
        />
      )}
    </div>
  );
}

export default ManufacturerApp;
