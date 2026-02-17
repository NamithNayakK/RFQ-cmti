import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiSave, FiDollarSign, FiTrendingUp, FiZap } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function CostManagement() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [priceSource, setPriceSource] = useState('');
  const [formData, setFormData] = useState({
    material: '',
    cost: '',
    laborHour: '',
    machineHour: '',
    minOrder: ''
  });

  const formatINR = useMemo(() => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
  }, []);

  useEffect(() => {
    loadCosts();
    const interval = setInterval(loadCosts, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadCosts = async () => {
    setLoading(true);
    try {
      const response = await fileService.getMaterialPrices(100, 0);
      const items = Array.isArray(response) ? response : response.materials || [];
      setCosts(items.map((m) => ({
        id: m.id,
        material: m.material_name,
        costPerKg: m.base_price_per_unit,
        laborCostPerHour: m.labor_cost_per_hour,
        machineCostPerHour: m.labor_cost_per_hour,
        minimumOrder: m.minimum_order_quantity,
      })));
      setLastUpdated(null);
      setPriceSource('Your pricing database');
    } catch (err) {
      console.error('Error loading costs:', err);
      setCosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        const cost = costs.find((c) => c.id === editingId);
        if (cost) {
          await fileService.updateMaterialPrice(cost.material, {
            base_price_per_unit: parseFloat(formData.cost),
            labor_cost_per_hour: parseFloat(formData.laborHour),
            minimum_order_quantity: parseInt(formData.minOrder, 10),
          });
        }
        setEditingId(null);
      } else {
        await fileService.createMaterialPrice({
          material_name: formData.material,
          base_price_per_unit: parseFloat(formData.cost),
          labor_cost_per_hour: parseFloat(formData.laborHour),
          minimum_order_quantity: parseInt(formData.minOrder, 10) || 1,
        });
      }
      setFormData({ material: '', cost: '', laborHour: '', machineHour: '', minOrder: '' });
      setShowModal(false);
      await loadCosts();
    } catch (err) {
      console.error('Error saving cost:', err);
      alert('Failed to save: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (cost) => {
    setEditingId(cost.id);
    setFormData({
      material: cost.material,
      cost: cost.costPerKg.toString(),
      laborHour: cost.laborCostPerHour.toString(),
      machineHour: cost.machineCostPerHour.toString(),
      minOrder: cost.minimumOrder.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const cost = costs.find((c) => c.id === id);
    if (!cost || !window.confirm(`Delete pricing for ${cost.material}?`)) return;
    try {
      await fileService.deleteMaterialPrice(cost.material);
      await loadCosts();
    } catch (err) {
      console.error('Error deleting cost:', err);
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Cost Management</h2>
          <p className="text-slate-500 mt-1">Manage material pricing used for quote calculations</p>
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()} {priceSource ? `• Source: ${priceSource}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCosts}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center gap-2"
            title="Refresh"
          >
            <FiZap />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ material: '', cost: '', laborHour: '', machineHour: '', minOrder: '' });
              setShowModal(true);
            }}
            className="bg-manufacturing-accent hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-lg transition flex items-center gap-2"
          >
            <FiPlus />
            Add Material Cost
          </button>
        </div>
      </div>

      {/* Cost Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading costs...</p>
          </div>
        ) : costs.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl">
            <p className="text-slate-700 font-medium">No material prices yet</p>
            <p className="text-sm text-slate-500 mt-1">Add materials to enable auto-pricing when creating quotes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Material</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Cost/Kg (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Labor/Hour (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Machine/Hour (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Min Order</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => (
                  <tr key={cost.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{cost.material}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatINR.format(cost.costPerKg)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatINR.format(cost.laborCostPerHour)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatINR.format(cost.machineCostPerHour)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {cost.minimumOrder} units
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-2">Total Materials Tracked</p>
          <p className="text-3xl font-bold text-slate-900">{costs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-2">Avg. Material Cost</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatINR.format(costs.reduce((sum, c) => sum + c.costPerKg, 0) / costs.length || 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-2">Avg. Labor Cost/Hour</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatINR.format(costs.reduce((sum, c) => sum + c.laborCostPerHour, 0) / costs.length || 0)}
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? 'Edit Cost Entry' : 'Add Material Cost'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material Name
                </label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  required
                  readOnly={!!editingId}
                  className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent ${editingId ? 'bg-slate-100' : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cost per Kg (₹)
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Labor Cost per Hour (₹)
                </label>
                <input
                  type="number"
                  name="laborHour"
                  value={formData.laborHour}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Machine Cost per Hour (₹)
                </label>
                <input
                  type="number"
                  name="machineHour"
                  value={formData.machineHour}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Order (units)
                </label>
                <input
                  type="number"
                  name="minOrder"
                  value={formData.minOrder}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-manufacturing-accent hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
