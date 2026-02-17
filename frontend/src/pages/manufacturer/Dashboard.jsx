import { useEffect, useState, useMemo } from 'react';
import { FiTrendingUp, FiClock, FiShoppingCart, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function ManufacturerDashboard({ onRefresh, onNavigate }) {
  const [production, setProduction] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectedQuotesCount, setRejectedQuotesCount] = useState(0);
  const [rejectedQuotes, setRejectedQuotes] = useState([]);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [quotesSentCount, setQuotesSentCount] = useState(0);

  const parseQuantityValue = (quantityUnit) => {
    if (typeof quantityUnit === 'number') {
      return quantityUnit;
    }
    if (typeof quantityUnit === 'string') {
      const match = quantityUnit.match(/\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : 0;
    }
    return 0;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load notifications (quotation requests)
        const notifResponse = await fileService.getNotifications(100, 0, false);
        setNotifications(notifResponse.notifications || []);

        // Load accepted quotes from backend
        const response = await fileService.getQuotes('accepted', 100);
        const acceptedQuotes = response.quotes || [];

        // Load rejected quotes count
        const rejectedResponse = await fileService.getQuotes('rejected', 100, 0);
        setRejectedQuotesCount(rejectedResponse.total_count || 0);
        setRejectedQuotes(rejectedResponse.quotes || []);

        // Transform quotes into production items
        const productionItems = acceptedQuotes.map((quote) => ({
          id: quote.id,
          partName: quote.part_name,
          material: quote.material,
          quantity: quote.quantity_unit,
          status: 'Pending',
          progress: 0,
          timeline: '7 days',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quotedPrice: quote.total_price
        }));
        setProduction(productionItems);

        const statsRes = await fileService.getManufacturerStats().catch(() => ({}));
        if (statsRes.sent_quotes !== undefined) setQuotesSentCount(statsRes.sent_quotes);
      } catch (err) {
        console.error('Error loading production data:', err);
        setProduction([]);
        setRejectedQuotesCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const pendingRequests = notifications.filter(n => !n.is_read).length;
    const pendingOrders = production.filter(p => p.status === 'Pending').length;
    const totalItems = production.reduce((sum, p) => sum + parseQuantityValue(p.quantity), 0);
    
    return {
      pendingRequests,
      quotesSent: quotesSentCount,
      pendingOrders,
      totalItems,
      rejectedQuotes: rejectedQuotesCount
    };
  }, [production, notifications, rejectedQuotesCount, quotesSentCount]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Completed':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'Pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition" onClick={() => onNavigate('Quotations', 'pending')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Requests</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.pendingRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Awaiting quotation</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <FiAlertCircle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition" onClick={() => onNavigate('Quotations', 'all')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Quotes Sent</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.quotesSent}</p>
              <p className="text-xs text-slate-500 mt-1">Awaiting acceptance</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FiFileText size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition" onClick={() => setShowRejectedModal(true)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Rejected Quotes</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.rejectedQuotes}</p>
              <p className="text-xs text-slate-500 mt-1">Buyer rejected</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <FiAlertCircle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition" onClick={() => onNavigate('Orders')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Items</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalItems}</p>
              <p className="text-xs text-slate-500 mt-1">Units in queue</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FiShoppingCart size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Production Queue Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Active Production Queue</h3>
          <button
            onClick={() => onNavigate('Production Queue')}
            className="text-sm text-manufacturing-accent hover:text-manufacturing-accent/80 font-medium"
            type="button"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : production.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <p className="text-slate-700 font-medium">No active production</p>
            <p className="text-sm text-slate-500">Start manufacturing when orders arrive</p>
          </div>
        ) : (
          <div className="space-y-3">
            {production.slice(0, 5).map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.partName}</p>
                    <p className="text-xs text-slate-500">{item.material} • {item.quantity} units</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-manufacturing-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 ml-3">{item.progress}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Estimated: {item.timeline}</span>
                  <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejected Quotes Modal */}
      {showRejectedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Rejected Quotes</h2>
              <button
                onClick={() => setShowRejectedModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {rejectedQuotes.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No rejected quotes</p>
              ) : (
                <div className="space-y-4">
                  {rejectedQuotes.map((quote) => (
                    <div key={quote.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <p className="font-semibold text-slate-900 text-lg">{quote.part_name}</p>
                      <p className="text-sm text-slate-600 mt-2">
                        <span className="font-semibold">Rejection Reason:</span> {quote.rejection_reason || 'No reason provided'}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Rejected at: {new Date(quote.rejected_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
