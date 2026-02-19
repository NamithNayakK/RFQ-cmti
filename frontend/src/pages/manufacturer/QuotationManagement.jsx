import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiCheck, FiFileText, FiEye, FiSend, FiDownload, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function QuotationManagement({ filterStatus: initialFilter = 'all', onOpenCadViewer }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [quoteData, setQuoteData] = useState({
    materialCost: '',
    laborCost: '',
    machineTime: '',
    profitMargin: '20',
    notes: '',
  });
  const [calculatedPricing, setCalculatedPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  useEffect(() => {
    setFilterStatus(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    loadQuotationRequests();
  }, [filterStatus]);

  const loadQuotationRequests = async () => {
    setLoading(true);
    try {
      const unreadOnly = filterStatus === 'pending' ? true : false;
      const response = await fileService.getNotifications(100, 0, unreadOnly);
      const notifications = response.notifications || [];
      const requestsWithStatus = await Promise.all(
        notifications.map(async (notification) => {
          try {
            const quotes = await fileService.getQuotesByNotification(notification.id);
            if (Array.isArray(quotes) && quotes.length > 0) {
              const latestQuote = quotes.reduce((latest, current) => {
                const latestDate = new Date(latest.created_at || 0).getTime();
                const currentDate = new Date(current.created_at || 0).getTime();
                return currentDate > latestDate ? current : latest;
              }, quotes[0]);
              return {
                ...notification,
                quote_status: latestQuote.status,
                quote_id: latestQuote.id,
                quote_details: latestQuote,
              };
            }
          } catch (err) {
            console.warn('Could not fetch quote status:', err);
          }
          return {
            ...notification,
            quote_status: null,
            quote_id: null,
            quote_details: null,
          };
        })
      );
      let filtered = requestsWithStatus;
      if (filterStatus === 'sent' || filterStatus === 'accepted' || filterStatus === 'rejected') {
        filtered = requestsWithStatus.filter((r) => r.quote_status === filterStatus);
      }
      setRequests(filtered);
    } catch (err) {
      console.error('Error loading quotation requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const openQuoteModal = async (request, mode = 'create') => {
    setSelectedRequest(request);
    setModalMode(mode);
    setQuoteData({
      materialCost: '',
      laborCost: '',
      machineTime: '',
      profitMargin: '20',
      notes: '',
    });
    setCalculatedPricing(null);
    setShowQuoteModal(true);
    
    // Auto-calculate pricing if material is available
    if (mode === 'create' && request.material && request.quantity_unit) {
      await calculatePricingForRequest(request);
    }
  };

  const calculatePricingForRequest = async (request) => {
    setLoadingPricing(true);
    try {
      // Extract quantity from quantity_unit (e.g., "100 pieces" -> 100)
      const quantityMatch = request.quantity_unit?.match(/(\d+)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      
      const pricingRequest = {
        material: request.material,
        quantity: quantity,
        complexity_factor: 1.0,
        delivery_days: 7
      };
      
      const pricing = await fileService.calculateQuotePrice(pricingRequest);
      setCalculatedPricing(pricing);
      
      // Auto-fill form with calculated values
      setQuoteData({
        materialCost: pricing.base_material_cost.toString(),
        laborCost: pricing.labor_cost.toString(),
        machineTime: '0',
        profitMargin: '20',
        notes: `Auto-calculated pricing for ${quantity} ${request.material} units. Complexity: ${pricing.complexity_factor}x`
      });
    } catch (err) {
      console.warn('Could not auto-calculate pricing:', err);
      setCalculatedPricing(null);
    } finally {
      setLoadingPricing(false);
    }
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

  const handleDownloadFile = async (request) => {
    try {
      const response = await fileService.requestDownloadUrl(request.object_key);
      const downloadUrl = response.download_url;
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = request.part_name || 'file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('Failed to download file: ' + err.message);
    }
  };

  const openCadViewer = (request) => {
    if (onOpenCadViewer) {
      onOpenCadViewer(request);
    }
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
      case 'sent':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'accepted':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getStatusKey = (request) => {
    if (request.quote_status) {
      return request.quote_status;
    }
    return request.is_read ? 'sent' : 'pending';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'sent':
        return 'Quote Sent';
      default:
        return 'Pending';
    }
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
          <button
            onClick={() => loadQuotationRequests()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-60"
            type="button"
          >
            <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'all', label: 'All', icon: '📁' },
            { value: 'pending', label: 'Pending', icon: '📋' },
            { value: 'sent', label: 'Quote Sent', icon: '📤' },
            { value: 'accepted', label: 'Accepted', icon: '✓' },
            { value: 'rejected', label: 'Rejected', icon: '✗' },
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
                      <h3 className="text-xl font-bold text-slate-900">{request.part_name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Material: {request.material || 'N/A'} &nbsp;•&nbsp; Quantity Unit: {request.quantity_unit || 'N/A'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(getStatusKey(request))}`}>
                      {getStatusLabel(getStatusKey(request))}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openCadViewer(request)}
                      className="flex-1 border-2 border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                      title="View 3D CAD"
                    >
                      <FiEye size={18} />
                      View 3D
                    </button>
                    <button
                      onClick={() => handleDownloadFile(request)}
                      className="flex-1 border-2 border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                      title="Download CAD file"
                    >
                      <FiDownload size={18} />
                      Download
                    </button>
                    <button
                      onClick={() => openQuoteModal(request, 'view')}
                      className="flex-1 border-2 border-manufacturing-accent text-manufacturing-accent font-semibold py-2.5 px-4 rounded-lg hover:bg-manufacturing-accent/10 transition flex items-center justify-center gap-2"
                    >
                      <FiEye size={18} />
                      View Details
                    </button>
                    {!request.quote_status && (
                      <button
                        onClick={() => openQuoteModal(request, 'create')}
                        className={`flex-1 font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 bg-manufacturing-accent hover:bg-manufacturing-accent/90 text-white`}
                        title="Create quote"
                      >
                        <FiPlus size={18} />
                        Create Quote
                      </button>
                    )}
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
                <h2 className="text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Create Quote' : 'View Details'}
                </h2>
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
              {modalMode === 'create' && (
                <>
                  {/* Auto-Calculated Pricing Info */}
                  {loadingPricing && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-blue-700 font-medium">Calculating pricing from database...</p>
                      </div>
                    </div>
                  )}

                  {calculatedPricing && !loadingPricing && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FiCheck className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-900 mb-2">Smart Pricing Applied</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                            <div>
                              <span className="text-green-600">Base Material:</span> ₹{calculatedPricing.base_material_cost.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-green-600">Labor:</span> ₹{calculatedPricing.labor_cost.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-green-600">Subtotal:</span> ₹{calculatedPricing.subtotal.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-green-600">Complexity:</span> {calculatedPricing.complexity_factor}x
                            </div>
                          </div>
                          <p className="text-xs text-green-700 mt-2">✓ Values pre-filled below. Adjust if needed.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Part Information */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Part Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Part Name</p>
                    <p className="font-bold">{selectedRequest.part_name || 'N/A'}</p>
                  </div>
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
                    <p className="text-slate-600">Requested On</p>
                    <p className="font-bold">
                      {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Description</p>
                    <p className="font-bold">{selectedRequest.description || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {modalMode === 'view' && selectedRequest.quote_details && (
                <div className="mb-8 space-y-6">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Quote Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Material Cost</span>
                        <span className="font-semibold">₹{selectedRequest.quote_details.material_cost?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Labor Cost</span>
                        <span className="font-semibold">₹{selectedRequest.quote_details.labor_cost?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Machine Time Cost</span>
                        <span className="font-semibold">₹{selectedRequest.quote_details.machine_time_cost?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="text-lg font-bold text-manufacturing-accent">₹{selectedRequest.quote_details.total_price?.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Status: <span className={`font-semibold ${getStatusColor(selectedRequest.quote_details.status)}`}>{getStatusLabel(selectedRequest.quote_details.status)}</span>
                      {selectedRequest.quote_details.accepted_at && (
                        <> • Accepted {new Date(selectedRequest.quote_details.accepted_at).toLocaleDateString()}</>
                      )}
                      {selectedRequest.quote_details.rejected_at && selectedRequest.quote_details.rejection_reason && (
                        <> • {selectedRequest.quote_details.rejection_reason}</>
                      )}
                    </p>
                  </div>
                  {selectedRequest.quote_details.notes && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase mb-2">Notes</h3>
                      <p className="text-sm text-slate-700">{selectedRequest.quote_details.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {modalMode === 'create' && (
                <>
                  {/* Cost Breakdown */}
                  <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FiTrendingUp size={20} className="text-manufacturing-accent" />
                    Cost Breakdown
                  </h3>
                  {selectedRequest.material && (
                    <button
                      onClick={() => calculatePricingForRequest(selectedRequest)}
                      disabled={loadingPricing}
                      className="text-sm px-3 py-1.5 bg-manufacturing-accent/10 text-manufacturing-accent hover:bg-manufacturing-accent/20 rounded-lg font-medium transition flex items-center gap-2"
                    >
                      <FiTrendingUp size={14} />
                      {loadingPricing ? 'Calculating...' : 'Auto-Calculate'}
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Material Cost (₹) <span className="text-red-500">*</span>
                      {calculatedPricing && <span className="text-xs text-green-600 ml-2">✓ Auto-filled</span>}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calculatedPricing ? "Auto-calculated" : "0.00"}
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
                      {calculatedPricing && <span className="text-xs text-green-600 ml-2">✓ Auto-filled</span>}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calculatedPricing ? "Auto-calculated" : "0.00"}
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
                    <p className="text-xs text-slate-500 mt-1">Additional machine/equipment costs</p>
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
                  Additional Notes <span className="text-slate-400 text-xs">Optional</span>
                  {calculatedPricing && <span className="text-xs text-blue-600 ml-2">ℹ Auto-filled with pricing details</span>}
                </label>
                <textarea
                  placeholder="Add any notes about this quotation, delivery time, or special requirements..."
                  value={quoteData.notes}
                  onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
                />
              </div>

                  {/* Quote Summary */}
                  <div className="bg-gradient-to-r from-manufacturing-accent/10 to-manufacturing-accent/5 rounded-lg p-6 border border-manufacturing-accent/20 mb-8">
                {calculatedPricing && (
                  <div className="mb-4 pb-4 border-b border-manufacturing-accent/20">
                    <p className="text-xs font-semibold text-manufacturing-accent flex items-center gap-2">
                      <FiCheck size={14} />
                      Smart Pricing Active - Values calculated from your material database
                    </p>
                  </div>
                )}
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
                    {calculatedPricing && (
                      <p className="text-xs text-slate-600 mt-2 text-right">
                        Profit margin: {quoteData.profitMargin}% included
                      </p>
                    )}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
