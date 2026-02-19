import { useState, useEffect } from 'react';
import BuyerQuotePDF from './BuyerQuotePDF';
import { FiCheck, FiX, FiTrendingUp, FiClock, FiBell, FiRefreshCw } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function BuyerQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Load all quotes for stats on component mount
  useEffect(() => {
    loadAllQuotesForStats();
    loadNotifications();
  }, []);

  // Load filtered quotes when filter changes
  useEffect(() => {
    loadQuotes();
  }, [filterStatus]);

  const loadAllQuotesForStats = async () => {
    try {
      const response = await fileService.getBuyerQuotes('all');
      setAllQuotes(response.quotes || []);
    } catch (err) {
      console.error('Error loading all quotes for stats:', err);
    }
  };

  const loadQuotes = async () => {
    setRefreshing(true);
    try {
      const response = await fileService.getBuyerQuotes(filterStatus);
      setQuotes(response.quotes || []);
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fileService.getBuyerQuoteNotifications(50, 0);
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleViewDetails = async (quote, notificationId = null) => {
    setSelectedQuote(quote);
    setShowDetails(true);
    
    // Mark notification as read if coming from notifications
    if (notificationId) {
      try {
        await fileService.markQuoteNotificationAsRead(notificationId);
        loadNotifications();
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
  };

  const handleAccept = async (quoteId) => {
    if (window.confirm('Accept this quote?')) {
      try {
        await fileService.acceptQuote(quoteId);
        alert('Quote accepted! It has been added to your production queue.');
        setShowDetails(false);
        loadAllQuotesForStats();
        loadQuotes();
        loadNotifications();
      } catch (err) {
        alert('Failed to accept quote: ' + err.response?.data?.detail || err.message);
      }
    }
  };

  const handleReject = async (quoteId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (window.confirm('Reject this quote?')) {
      try {
        await fileService.rejectQuote(quoteId, rejectionReason);
        alert('Quote rejected');
        setRejectionReason('');
        setShowDetails(false);
        loadAllQuotesForStats();
        loadQuotes();
        loadNotifications();
      } catch (err) {
        alert('Failed to reject quote: ' + err.response?.data?.detail || err.message);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Pending Review</span>;
      case 'accepted':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ Accepted</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">✗ Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  const stats = {
    total: allQuotes.length,
    pending: allQuotes.filter(q => q.status === 'pending').length,
    sent: allQuotes.filter(q => q.status === 'sent').length,
    accepted: allQuotes.filter(q => q.status === 'accepted').length,
    rejected: allQuotes.filter(q => q.status === 'rejected').length
  };

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Notifications Bell */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Quotation Requests</h1>
            <p className="text-slate-600">Review quotes from manufacturers and make decisions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadQuotes()}
              disabled={refreshing}
              className="p-3 bg-white rounded-lg shadow hover:shadow-md transition border border-slate-200 disabled:opacity-50"
              title="Refresh quotes"
            >
              <FiRefreshCw size={24} className={`text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-white rounded-lg shadow hover:shadow-md transition border border-slate-200"
              title="Quote Notifications"
            >
              <FiBell size={24} className="text-slate-600" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && notifications.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900">New Quote Notifications</h3>
              <button
                onClick={() => {
                  if (window.confirm('Clear all quote notifications?')) {
                    fileService.clearAllQuoteNotifications()
                      .then(() => {
                        loadNotifications();
                      })
                      .catch(err => alert('Failed to clear notifications: ' + err.message));
                  }
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border-l-4 hover:bg-slate-50 transition flex items-center justify-between ${
                    notification.is_read
                      ? 'bg-slate-50 border-l-slate-300'
                      : 'bg-blue-50 border-l-blue-500'
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleViewDetails(
                      {
                        id: notification.quote_id,
                        part_name: notification.part_name
                      },
                      notification.id
                    )}
                  >
                    <p className="font-medium text-slate-900">{notification.part_name}</p>
                    <p className="text-xs text-slate-500">From {notification.sent_by}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this notification?')) {
                        fileService.deleteQuoteNotification(notification.id)
                          .then(() => loadNotifications())
                          .catch(err => alert('Failed to delete: ' + err.message));
                      }
                    }}
                    className="text-red-600 hover:text-red-800 font-medium text-sm ml-2"
                  >
                    ✕
                  </button>
                  <span className="text-xs text-slate-500 ml-2">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Quotes</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <FiTrendingUp className="text-3xl text-slate-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-blue-600">{stats.sent}</p>
              </div>
              <FiClock className="text-3xl text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Accepted</p>
                <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
              </div>
              <FiCheck className="text-3xl text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <FiX className="text-3xl text-red-400" />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {['all', 'accepted', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Quotes List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading quotes...</div>
          ) : quotes.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No quotes found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Part Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Material</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Total Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{quote.part_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{quote.material}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{quote.quantity_unit}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        ₹{quote.total_price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">{getStatusBadge(quote.status)}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewDetails(quote)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quote Details Modal */}
      {showDetails && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Quotation Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-600 hover:text-slate-900 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* PDF Quotation Template and Download Button */}
              <BuyerQuotePDF quote={mapQuoteToPDF(selectedQuote)} />
              {/* Status Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-600">Current Status: {getStatusBadge(selectedQuote.status)}</p>
              </div>
              {/* Action Buttons */}
              {selectedQuote.status === 'sent' && (
                <div className="space-y-4">
                  <button
                    onClick={() => handleAccept(selectedQuote.id)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <FiCheck /> Accept Quote
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Optional: Enter reason for rejection..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="2"
                    />
                  </div>
                  <button
                    onClick={() => handleReject(selectedQuote.id)}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <FiX /> Reject Quote
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      )}
    </div>
  );
}

// Helper to map selectedQuote to BuyerQuotePDF template fields
function mapQuoteToPDF(quote) {
  // Fallbacks for missing fields
  return {
    companyName: quote.manufacturer_name || 'Manufacturer',
    companyAddress: quote.manufacturer_address || '',
    companyEmail: quote.manufacturer_email || '',
    companyContact: quote.manufacturer_contact || '',
    companyWebsite: quote.manufacturer_website || '',
    customerName: quote.buyer_name || '',
    customerAddress: quote.buyer_address || '',
    customerEmail: quote.buyer_email || '',
    customerContact: quote.buyer_contact || '',
    quoteNumber: quote.id || '',
    validDates: quote.valid_until ? `Valid until ${new Date(quote.valid_until).toLocaleDateString()}` : '',
    items: [
      {
        name: quote.part_name,
        quantity: quote.quantity_unit,
        price: quote.total_price || 0,
      },
    ],
    subTotal: quote.subtotal || 0,
    tax: quote.tax || 0,
    discount: quote.discount || 0,
    grandTotal: quote.total_price || 0,
  };
}
