import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiCheck, FiDollarSign, FiFileText, FiEye, FiSend, FiTrash2 } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function QuotationManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [quoteData, setQuoteData] = useState({
    materialCost: '',
    laborCost: '',
    machineTime: '',
    profitMargin: '20',
    notes: '',
  });

  useEffect(() => {
    loadQuotationRequests();
  }, [filterStatus]);

  const loadQuotationRequests = async () => {
    setLoading(true);
    try {
      const response = await fileService.getNotifications(100, 0, filterStatus === 'pending');
      setRequests(response.notifications || []);
    } catch (err) {
      console.error('Error loading quotation requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const openQuoteModal = async (request) => {
    setSelectedRequest(request);
    setQuoteData({
      materialCost: '',
      laborCost: '',
      machineTime: '',
      profitMargin: '20',
      notes: '',
    });
    setShowQuoteModal(true);
  };

  const calculateTotal = () => {
    const material = parseFloat(quoteData.materialCost) || 0;
    const labor = parseFloat(quoteData.laborCost) || 0;
    const machine = parseFloat(quoteData.machineTime) || 0;
    const subtotal = material + labor + machine;
    const margin = parseFloat(quoteData.profitMargin) || 0;
    const profit = (subtotal * margin) / 100;
    return (subtotal + profit).toFixed(2);
  };

  const submitQuote = async () => {
    if (!selectedRequest || !quoteData.materialCost || !quoteData.laborCost || !quoteData.machineTime) {
      alert('Please fill in all cost fields');
      return;
    }

    try {
      const material = parseFloat(quoteData.materialCost);
      const labor = parseFloat(quoteData.laborCost);
      const machine = parseFloat(quoteData.machineTime);
      const margin = parseFloat(quoteData.profitMargin) || 20;

      const quotePayload = {
        notification_id: selectedRequest.id,
        file_id: selectedRequest.file_id,
        part_name: selectedRequest.part_name,
        part_number: selectedRequest.part_number || '',
        material: selectedRequest.material || '',
        quantity_unit: selectedRequest.quantity_unit || 'pieces',
        material_cost: material,
        labor_cost: labor,
        machine_time_cost: machine,
        profit_margin_percent: margin,
        notes: quoteData.notes || ''
      };

      // Send quote to backend
      const response = await fileService.createQuote(quotePayload);
      
      // Mark notification as read
      await fileService.markNotificationAsRead(selectedRequest.id);
      
      setShowQuoteModal(false);
      setSelectedRequest(null);
      loadQuotationRequests();
      alert('Quote sent successfully!');
    } catch (err) {
      console.error('Error submitting quote:', err);
      alert('Failed to submit quote: ' + err.response?.data?.detail || err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'quote_sent':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'accepted':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getStatusLabel = (isRead) => {
    return isRead ? 'Quote Sent' : 'Pending';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-manufacturing-accent/10 rounded-lg">
              <FiFileText size={24} className="text-manufacturing-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Quotation Management</h1>
              <p className="text-slate-600 text-sm mt-1">Create and manage customer quotations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex gap-3 items-center justify-between">
          <div className="flex gap-3">
            {[
              { value: 'pending', label: 'Pending Requests', icon: '📋' },
              { value: 'all', label: 'All Requests', icon: '📁' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === tab.value
                    ? 'bg-manufacturing-accent text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (window.confirm('Clear all notifications? This action cannot be undone.')) {
                fileService.clearAllNotifications()
                  .then(() => {
                    loadQuotationRequests();
                    alert('All notifications cleared');
                  })
                  .catch(err => alert('Failed to clear notifications: ' + err.message));
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition"
            title="Clear all notifications"
          >
            <FiTrash2 size={16} />
            Clear All
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-manufacturing-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-3 border-manufacturing-accent border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-500 font-medium">Loading quotation requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFileText size={40} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg">No quotation requests</p>
              <p className="text-slate-500 text-sm mt-1">Waiting for buyer requests</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border-2 border-slate-200 hover:border-manufacturing-accent/50 transition hover:shadow-md"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900">{request.part_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(getStatusLabel(request.is_read))}`}>
                          {getStatusLabel(request.is_read)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Requested by: <span className="font-semibold">{request.uploaded_by}</span>
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Part Number</p>
                      <p className="text-sm font-mono font-bold text-slate-900 mt-1">
                        {request.part_number || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Material</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {request.material || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Quantity</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {request.quantity_unit || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Requested On</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {request.description && (
                    <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Description</p>
                      <p className="text-sm text-slate-700">{request.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {!request.is_read && (
                      <button
                        onClick={() => openQuoteModal(request)}
                        className="flex-1 bg-manufacturing-accent hover:bg-manufacturing-accent/90 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <FiPlus size={18} />
                        Create Quote
                      </button>
                    )}
                    <button
                      onClick={() => openQuoteModal(request)}
                      className="flex-1 border-2 border-manufacturing-accent text-manufacturing-accent font-semibold py-2.5 px-4 rounded-lg hover:bg-manufacturing-accent/10 transition flex items-center justify-center gap-2"
                    >
                      <FiEye size={18} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Modal */}
      {showQuoteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Create Quote</h2>
                <p className="text-sm text-slate-600 mt-1">{selectedRequest.part_name}</p>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {/* Part Information */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Part Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Part Number</p>
                    <p className="font-mono font-bold">{selectedRequest.part_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Material</p>
                    <p className="font-bold">{selectedRequest.material || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Quantity Unit</p>
                    <p className="font-bold">{selectedRequest.quantity_unit || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Requested By</p>
                    <p className="font-bold">{selectedRequest.uploaded_by}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FiDollarSign size={20} className="text-manufacturing-accent" />
                  Cost Breakdown
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Material Cost (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={quoteData.materialCost}
                      onChange={(e) =>
                        setQuoteData({ ...quoteData, materialCost: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Labor Cost (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={quoteData.laborCost}
                      onChange={(e) =>
                        setQuoteData({ ...quoteData, laborCost: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Machine Time Cost (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={quoteData.machineTime}
                      onChange={(e) =>
                        setQuoteData({ ...quoteData, machineTime: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Profit Margin (%) <span className="text-slate-400 text-xs">Optional</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="20"
                      value={quoteData.profitMargin}
                      onChange={(e) =>
                        setQuoteData({ ...quoteData, profitMargin: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Current margin: {quoteData.profitMargin}%</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes <span className="text-slate-400 text-xs">Optional</span>
                </label>
                <textarea
                  placeholder="Add any notes about this quotation..."
                  value={quoteData.notes}
                  onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

              {/* Quote Summary */}
              <div className="bg-gradient-to-r from-manufacturing-accent/10 to-manufacturing-accent/5 rounded-lg p-6 border border-manufacturing-accent/20 mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Material Cost:</span>
                    <span className="font-semibold">₹{parseFloat(quoteData.materialCost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Labor Cost:</span>
                    <span className="font-semibold">₹{parseFloat(quoteData.laborCost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Machine Time:</span>
                    <span className="font-semibold">₹{parseFloat(quoteData.machineTime || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-manufacturing-accent/20 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 font-bold">Total Quote:</span>
                      <span className="text-3xl font-bold text-manufacturing-accent">₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitQuote}
                  className="flex-1 px-4 py-3 bg-manufacturing-accent text-white font-semibold rounded-lg hover:bg-manufacturing-accent/90 transition flex items-center justify-center gap-2"
                >
                  <FiSend size={18} />
                  Send Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
