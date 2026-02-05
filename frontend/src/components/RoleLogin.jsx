import { useState } from 'react';
import { FiPackage, FiArrowRight } from 'react-icons/fi';

export default function RoleLogin({ onRoleSelect }) {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    onRoleSelect(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-manufacturing-primary to-slate-900 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="h-16 w-16 rounded-xl bg-manufacturing-accent flex items-center justify-center text-white font-bold mx-auto mb-4">
            <FiPackage size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">CAD Vault</h1>
          <p className="text-white/70 text-lg">Manufacturing & File Management</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyer Card */}
          <button
            onClick={() => handleRoleSelect('buyer')}
            className={`group p-8 rounded-2xl border-2 transition-all duration-300 ${
              selectedRole === 'buyer'
                ? 'bg-white border-manufacturing-accent shadow-2xl'
                : 'bg-white/10 border-white/30 hover:bg-white/20 hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                selectedRole === 'buyer'
                  ? 'bg-manufacturing-accent text-white'
                  : 'bg-white/20 text-white group-hover:bg-white/30'
              }`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className={`text-xl font-semibold mb-2 transition-colors ${
                selectedRole === 'buyer' ? 'text-slate-900' : 'text-white'
              }`}>
                Buyer
              </h3>
              <p className={`text-sm mb-4 transition-colors ${
                selectedRole === 'buyer' ? 'text-slate-600' : 'text-white/70'
              }`}>
                Upload CAD files, search inventory, manage uploads
              </p>
              <ul className={`text-xs space-y-2 mb-6 transition-colors ${
                selectedRole === 'buyer' ? 'text-slate-600' : 'text-white/70'
              }`}>
                <li>✓ Upload STP/IGES files</li>
                <li>✓ Search and download</li>
                <li>✓ File management</li>
                <li>✓ Dashboard</li>
              </ul>
              {selectedRole === 'buyer' && (
                <div className="flex items-center justify-center gap-2 text-manufacturing-accent font-semibold">
                  Selected
                  <FiArrowRight size={16} />
                </div>
              )}
            </div>
          </button>

          {/* Manufacturer Card */}
          <button
            onClick={() => handleRoleSelect('manufacturer')}
            className={`group p-8 rounded-2xl border-2 transition-all duration-300 ${
              selectedRole === 'manufacturer'
                ? 'bg-white border-manufacturing-accent shadow-2xl'
                : 'bg-white/10 border-white/30 hover:bg-white/20 hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                selectedRole === 'manufacturer'
                  ? 'bg-manufacturing-accent text-white'
                  : 'bg-white/20 text-white group-hover:bg-white/30'
              }`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className={`text-xl font-semibold mb-2 transition-colors ${
                selectedRole === 'manufacturer' ? 'text-slate-900' : 'text-white'
              }`}>
                Manufacturer
              </h3>
              <p className={`text-sm mb-4 transition-colors ${
                selectedRole === 'manufacturer' ? 'text-slate-600' : 'text-white/70'
              }`}>
                Manage production, orders, and costs
              </p>
              <ul className={`text-xs space-y-2 mb-6 transition-colors ${
                selectedRole === 'manufacturer' ? 'text-slate-600' : 'text-white/70'
              }`}>
                <li>✓ Production queue</li>
                <li>✓ Order management</li>
                <li>✓ Cost tracking</li>
                <li>✓ Quotations</li>
              </ul>
              {selectedRole === 'manufacturer' && (
                <div className="flex items-center justify-center gap-2 text-manufacturing-accent font-semibold">
                  Selected
                  <FiArrowRight size={16} />
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => selectedRole && handleRoleSelect(selectedRole)}
          disabled={!selectedRole}
          className={`w-full mt-8 py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            selectedRole
              ? 'bg-manufacturing-accent hover:opacity-90 text-white'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          Continue as {selectedRole === 'buyer' ? 'Buyer' : selectedRole === 'manufacturer' ? 'Manufacturer' : 'User'}
          {selectedRole && <FiArrowRight size={18} />}
        </button>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-8">
          CAD Vault © 2026 • Manufacturing STP File Storage
        </p>
      </div>
    </div>
  );
}
