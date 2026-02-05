import { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiClock } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

export default function ProductionQueue({ refreshTrigger }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [refreshTrigger]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      // Load accepted quotes from backend
      const response = await fileService.getQuotes('accepted', 100);
      const acceptedQuotes = response.quotes || [];

      // Transform quotes into production queue items
      const queueItems = acceptedQuotes.map((quote, index) => ({
        id: quote.id,
        partName: quote.part_name,
        partNumber: quote.part_number || 'N/A',
        material: quote.material,
        quantity: quote.quantity_unit,
        status: 'Pending',
        progress: 0,
        startDate: null,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedTo: 'Unassigned',
        estimatedHours: 0,
        quotedPrice: quote.total_price,
        quoteId: quote.id
      }));

      setQueue(queueItems);
    } catch (err) {
      console.error('Error loading queue:', err);
      // Fallback to empty queue on error
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (id, newProgress) => {
    const updated = queue.map(item =>
      item.id === id ? { ...item, progress: newProgress } : item
    );
    setQueue(updated);
  };

  const completeOrder = async (id) => {
    const updated = queue.map(item =>
      item.id === id ? { ...item, status: 'Completed', progress: 100 } : item
    );
    setQueue(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Production Queue</h2>
          <p className="text-sm text-slate-500">{queue.length} items in queue</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl">
          <p className="text-slate-700 font-medium">Queue is empty</p>
          <p className="text-sm text-slate-500">No production items scheduled</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Part</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Material</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Qty</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Quoted Price</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Machine</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Progress</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Due Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.partName}</p>
                      <p className="text-xs text-slate-500">{item.partNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.material}</td>
                  <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">
                    {item.quotedPrice ? `₹${item.quotedPrice.toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.assignedTo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-manufacturing-accent h-2 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {item.status !== 'Completed' && (
                        <button
                          onClick={() => completeOrder(item.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Mark Complete"
                        >
                          <FiCheck size={16} />
                        </button>
                      )}
                      <button
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
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
  );
}
