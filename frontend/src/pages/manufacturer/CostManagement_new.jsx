import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiSave, FiDollarSign, FiTrendingUp, FiZap } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function CostManagement() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('materials');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    material: '',
    pricePerUnit: '',
    laborRatePerHour: '',
    machineRatePerHour: '',
    minOrder: '',
    notes: '',
  });

  // Settings state
  const [settings, setSettings] = useState({
    defaultProfitMargin: '20',
    defaultLaborHours: '2',
    defaultMachineHours: '1',
  });

  useEffect(() => {
    loadMaterials();
    loadSettings();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const response = await fileService.getLiveMaterialCosts();
      setMaterials(response.items || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('costManagementSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('costManagementSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      material: '',
      pricePerUnit: '',
      laborRatePerHour: '',
      machineRatePerHour: '',
      minOrder: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleAddMaterial = () => {
    if (!formData.material || !formData.pricePerUnit) {
      alert('Please fill required fields');
      return;
    }

    if (editingId) {
      setMaterials(materials.map(m => m.id === editingId ? { ...formData, id: editingId } : m));
      setEditingId(null);
    } else {
      setMaterials([...materials, { ...formData, id: Date.now() }]);
    }

    resetForm();
    setShowAddModal(false);
    alert('Material saved successfully!');
  };

  const handleEditMaterial = (material) => {
    setFormData(material);
    setEditingId(material.id);
    setShowAddModal(true);
  };

  const handleDeleteMaterial = (id) => {
    if (confirm('Are you sure you want to delete this material?')) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const calculateQuote = (material, quantity, laborHours, machineHours) => {
    const materialCost = parseFloat(material.pricePerUnit || 0) * quantity;
    const laborCost = parseFloat(material.laborRatePerHour || 0) * laborHours;
    const machineCost = parseFloat(material.machineRatePerHour || 0) * machineHours;
    const subtotal = materialCost + laborCost + machineCost;
    const profitMargin = parseFloat(settings.defaultProfitMargin) / 100;
    const total = subtotal * (1 + profitMargin);

    return {
      materialCost: materialCost.toFixed(2),
      laborCost: laborCost.toFixed(2),
      machineCost: machineCost.toFixed(2),
      subtotal: subtotal.toFixed(2),
      profitMargin: (subtotal * profitMargin).toFixed(2),
      total: total.toFixed(2),
    };
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-manufacturing-accent/10 rounded-lg">
              <FiDollarSign size={24} className="text-manufacturing-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Cost Management</h1>
              <p className="text-slate-600 text-sm mt-1">Manage pricing and quotation settings</p>
            </div>
          </div>
          {activeTab === 'materials' && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-manufacturing-accent hover:bg-manufacturing-accent/90 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center gap-2"
            >
              <FiPlus size={18} />
              Add Material
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-6">
          {[
            { value: 'materials', label: '💰 Material Pricing', icon: FiDollarSign },
            { value: 'settings', label: '⚙️ Quote Settings', icon: FiZap },
            { value: 'calculator', label: '🧮 Quote Calculator', icon: FiTrendingUp },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-4 border-b-2 font-medium transition ${
                activeTab === tab.value
                  ? 'border-manufacturing-accent text-manufacturing-accent'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div>
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : materials.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-slate-300">
                <FiDollarSign size={40} className="mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 font-semibold">No materials added yet</p>
                <p className="text-slate-500 text-sm mt-1">Add your first material pricing</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {materials.map((material) => (
                  <div key={material.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{material.material}</h3>
                        {material.notes && (
                          <p className="text-sm text-slate-600 mt-1">{material.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMaterial(material)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Price/Unit</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">₹{parseFloat(material.pricePerUnit || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Labor/Hour</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">₹{parseFloat(material.laborRatePerHour || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Machine/Hour</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">₹{parseFloat(material.machineRatePerHour || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Min Order</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{material.minOrder || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Status</p>
                        <p className="text-lg font-bold text-green-600 mt-1">✓ Active</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Quote Settings</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Default Profit Margin (%) <span className="text-slate-400">Optional</span>
                  </label>
                  <input
                    type="number"
                    name="defaultProfitMargin"
                    value={settings.defaultProfitMargin}
                    onChange={handleSettingsChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Applied to all quotes automatically</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Default Labor Hours (per job) <span className="text-slate-400">Optional</span>
                  </label>
                  <input
                    type="number"
                    name="defaultLaborHours"
                    value={settings.defaultLaborHours}
                    onChange={handleSettingsChange}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Default Machine Hours (per job) <span className="text-slate-400">Optional</span>
                  </label>
                  <input
                    type="number"
                    name="defaultMachineHours"
                    value={settings.defaultMachineHours}
                    onChange={handleSettingsChange}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full bg-manufacturing-accent hover:bg-manufacturing-accent/90 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FiSave size={18} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Quote Calculator</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Material
                  </label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent">
                    <option value="">Choose a material...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.material} (₹{parseFloat(m.pricePerUnit || 0).toFixed(2)}/unit)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="100"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Labor Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={settings.defaultLaborHours}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Machine Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={settings.defaultMachineHours}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-manufacturing-accent/10 to-manufacturing-accent/5 rounded-lg border border-manufacturing-accent/20">
                  <p className="text-sm text-slate-600 font-semibold uppercase mb-4">Estimated Quote</p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-slate-600">Material Cost</p>
                      <p className="text-lg font-bold">₹0.00</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Labor Cost</p>
                      <p className="text-lg font-bold">₹0.00</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Machine Cost</p>
                      <p className="text-lg font-bold">₹0.00</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Profit Margin</p>
                      <p className="text-lg font-bold">₹0.00</p>
                    </div>
                  </div>
                  <div className="border-t border-manufacturing-accent/20 pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-900 font-bold">Total Quote:</p>
                      <p className="text-3xl font-bold text-manufacturing-accent">₹0.00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? 'Edit Material' : 'Add Material'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  placeholder="e.g., Aluminum, Steel"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Price Per Unit (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Labor Rate Per Hour (₹)
                </label>
                <input
                  type="number"
                  name="laborRatePerHour"
                  value={formData.laborRatePerHour}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Machine Rate Per Hour (₹)
                </label>
                <input
                  type="number"
                  name="machineRatePerHour"
                  value={formData.machineRatePerHour}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Minimum Order Quantity
                </label>
                <input
                  type="number"
                  name="minOrder"
                  value={formData.minOrder}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 10"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes..."
                  rows="2"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaterial}
                className="flex-1 px-4 py-2 bg-manufacturing-accent text-white font-semibold rounded-lg hover:bg-manufacturing-accent/90 flex items-center justify-center gap-2"
              >
                <FiSave size={16} />
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
