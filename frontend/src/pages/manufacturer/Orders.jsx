import { useState, useEffect } from 'react';
import { FiPackage, FiCalendar, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function Orders({ refreshTrigger, onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadAcceptedOrders();
  }, [refreshTrigger]);

  const loadAcceptedOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fileService.getQuotes('accepted', 100, 0);
      setOrders(response.quotes || []);
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error loading accepted orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysAgo = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FiPackage className="text-manufacturing-accent" />
          Production Orders
        </h2>
        <p className="text-slate-600 mt-1">Manage accepted orders and track production status</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-manufacturing-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading orders...</p>
        </div>
      )}

      {/* Orders Table */}
      {!loading && orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-semibold text-slate-900">Order ID</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-900">Part Name</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-900">Material</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-900">Quantity</th>
                  <th className="text-right px-6 py-4 font-semibold text-slate-900">Total Price</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-900">Accepted</th>
                  <th className="text-center px-6 py-4 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-slate-900">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{order.part_name}</p>
                        {order.part_number && (
                          <p className="text-xs text-slate-500">PN: {order.part_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{order.material || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-600">{order.quantity_unit || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-slate-900">₹{order.total_price?.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiCalendar size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {formatDate(order.accepted_at || order.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <FiEye size={14} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <FiPackage size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">No accepted orders yet</p>
          <p className="text-slate-500 text-sm">When buyers accept your quotes, they'll appear here</p>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-manufacturing-primary to-manufacturing-accent px-8 py-6 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Order #{selectedOrder.id} Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:text-white/80 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              {/* Part Information */}
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h4 className="font-bold text-slate-900">Part Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Part Name</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.part_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Part Number</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.part_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Material</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.material || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Quantity</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.quantity_unit || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h4 className="font-bold text-slate-900">Cost Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-700">
                    <span>Material Cost:</span>
                    <span className="font-medium">₹{selectedOrder.material_cost?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Labor Cost:</span>
                    <span className="font-medium">₹{selectedOrder.labor_cost?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Machine Time Cost:</span>
                    <span className="font-medium">₹{selectedOrder.machine_time_cost?.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-3 flex justify-between text-slate-900 font-bold text-lg">
                    <span>Total (incl. profit):</span>
                    <span>₹{selectedOrder.total_price?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h4 className="font-bold text-slate-900">Order Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-manufacturing-accent text-white flex items-center justify-center">
                        <FiCheckCircle />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Quote Accepted</p>
                      <p className="text-sm text-slate-600">
                        {formatDate(selectedOrder.accepted_at || selectedOrder.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-slate-300 text-white flex items-center justify-center">
                        <FiClock />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">In Production</p>
                      <p className="text-sm text-slate-600">Accepted {getDaysAgo(selectedOrder.accepted_at || selectedOrder.created_at)} days ago</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <h4 className="font-bold text-slate-900 mb-2">Notes</h4>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
