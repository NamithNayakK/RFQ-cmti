import './index.css';
import { useState, useEffect } from 'react';
import { FiHome, FiFolder, FiUpload, FiBell, FiUser, FiPackage, FiLogOut, FiDollarSign } from 'react-icons/fi';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import Dashboard from './components/Dashboard';
import BuyerQuotes from './pages/buyer/BuyerQuotes';

function App({ onLogout }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeNav, setActiveNav] = useState(() => {
    return localStorage.getItem('buyerActivePage') || 'Dashboard';
  });

  useEffect(() => {
    localStorage.setItem('buyerActivePage', activeNav);
  }, [activeNav]);

  const handleUploadSuccess = () => {
    // Trigger file list refresh
    setRefreshTrigger((prev) => prev + 1);
    setActiveNav('All Files');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-manufacturing-primary text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-manufacturing-accent flex items-center justify-center text-white font-bold">
              <FiPackage size={20} />
            </div>
            <div>
              <p className="text-lg font-semibold">Cost Management System</p>
              <p className="text-xs text-white/70">Cost Management</p>
            </div>
          </div>
        </div>

        <nav className="px-4 py-6 space-y-2">
          {[
            { name: 'Dashboard', icon: FiHome },
            { name: 'All Files', icon: FiFolder },
            { name: 'Request Quote', icon: FiUpload },
            { name: 'Quotations', icon: FiDollarSign },
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
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-6 pb-6"></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200">
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {activeNav}
              </h1>
              <p className="text-sm text-slate-500">
                {activeNav === 'Dashboard' && 'Overview of your CAD file storage'}
                {activeNav === 'All Files' && 'Manage your CAD files'}
                {activeNav === 'Request Quote' && 'Submit CAD files for quotation'}
                {activeNav === 'Quotations' && 'Review and manage quotations from manufacturers'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700">
                <FiBell />
              </button>
              <button className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700">
                <FiUser />
              </button>
              <button
                onClick={() => {
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

        <main className="px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {activeNav === 'Dashboard' && (
              <Dashboard onBrowseAll={() => setActiveNav('All Files')} />
            )}
            {activeNav === 'All Files' && (
              <FileList refreshTrigger={refreshTrigger} />
            )}
            {activeNav === 'Request Quote' && (
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            )}
            {activeNav === 'Quotations' && (
              <BuyerQuotes />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;