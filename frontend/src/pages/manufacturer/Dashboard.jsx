import { useEffect, useState, useMemo } from 'react';
import { FiTrendingUp, FiClock, FiShoppingCart, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function ManufacturerDashboard({ onRefresh }) {
  const [production, setProduction] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

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
      } catch (err) {
        console.error('Error loading production data:', err);
        setProduction([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const pendingRequests = notifications.filter(n => !n.is_read).length;
    const quotesSent = notifications.filter(n => n.is_read).length;
    const activeProjects = production.filter(p => p.status === 'In Progress').length;
    const pendingOrders = production.filter(p => p.status === 'Pending').length;
    const totalItems = production.reduce((sum, p) => sum + p.quantity, 0);
    
    return {
      pendingRequests,
      quotesSent,
      activeProjects,
      pendingOrders,
      totalItems
    };
  }, [production, notifications]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
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

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
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

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Projects</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.activeProjects}</p>
              <p className="text-xs text-slate-500 mt-1">In manufacturing</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FiTrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
          <button className="text-sm text-manufacturing-accent hover:text-manufacturing-accent/80 font-medium">
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
    </div>
  );
}
