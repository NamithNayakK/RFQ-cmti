import { useEffect, useState, useMemo } from 'react';
import { FiEdit2, FiCheck, FiSearch, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { fileService } from '../../api/fileService';

const STORAGE_KEY = 'manufacturer_production_queue_state';

export default function ProductionQueue({ refreshTrigger }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterMachine, setFilterMachine] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');

  const statusOptions = ['Pending', 'In Progress', 'Quality Check', 'Completed', 'On Hold', 'Delayed'];
  const priorityOptions = ['High', 'Medium', 'Low'];
  const availableMachines = ['CNC-01', 'CNC-02', 'Lathe-01', 'Mill-01', 'Mill-02', 'Grinder-01'];
  const availableOperators = ['Operator A', 'Operator B', 'Operator C', 'Operator D'];

  useEffect(() => {
    loadQueue();
  }, [refreshTrigger]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await fileService.getQuotes('accepted', 100);
      const acceptedQuotes = response.quotes || [];
      let savedState = {};
      try {
        savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch (_) {}

      const queueItems = acceptedQuotes.map((quote) => {
        const saved = savedState[quote.id] || {};
        return {
          id: quote.id,
          partName: quote.part_name,
          partNumber: quote.part_number || 'N/A',
          material: quote.material,
          quantity: quote.quantity_unit,
          status: saved.status ?? 'Pending',
          progress: saved.progress ?? 0,
          startDate: saved.startDate ?? null,
          dueDate: saved.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignedMachine: saved.assignedMachine ?? 'Unassigned',
          assignedOperator: saved.assignedOperator ?? 'Unassigned',
          estimatedHours: saved.estimatedHours ?? 0,
          quotedPrice: quote.total_price,
          priority: saved.priority ?? 'Medium',
          quoteId: quote.id,
        };
      });

      setQueue(queueItems);
    } catch (err) {
      console.error('Error loading queue:', err);
      // Fallback to empty queue on error
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const persistQueueState = (updatedQueue) => {
    const state = {};
    updatedQueue.forEach((item) => {
      state[item.id] = {
        status: item.status,
        progress: item.progress,
        dueDate: item.dueDate,
        assignedMachine: item.assignedMachine,
        assignedOperator: item.assignedOperator,
        priority: item.priority,
      };
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  };

  const updateStatus = (id, newStatus) => {
    const updated = queue.map(item => (item.id === id ? { ...item, status: newStatus } : item));
    setQueue(updated);
    persistQueueState(updated);
  };

  const updatePriority = (id, newPriority) => {
    const item = queue.find(item => item.id === id);
    if (!item || item.priority === newPriority) return;
    const confirmMsg = `Are you sure you want to change priority from ${item.priority} to ${newPriority}?`;
    if (window.confirm(confirmMsg)) {
      const updated = queue.map(item => (item.id === id ? { ...item, priority: newPriority } : item));
      setQueue(updated);
      persistQueueState(updated);
    }
  };

  const updateAssignment = (id, field, value) => {
    const updated = queue.map(item => (item.id === id ? { ...item, [field]: value } : item));
    setQueue(updated);
    persistQueueState(updated);
  };

  const completeOrder = (id) => {
    updateStatus(id, 'Completed');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Quality Check':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'On Hold':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Delayed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const filteredQueue = useMemo(() => {
    let filtered = queue.filter(item => {
      const searchMatch = searchTerm === '' ||
        item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.material || '').toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = filterStatus === 'all' || item.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
      const machineMatch = filterMachine === 'all' || item.assignedMachine === filterMachine;

      return searchMatch && statusMatch && priorityMatch && machineMatch;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate) - new Date(b.dueDate);
          break;
        case 'priority':
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'price':
          comparison = (a.quotedPrice || 0) - (b.quotedPrice || 0);
          break;
        case 'partName':
          comparison = a.partName.localeCompare(b.partName);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [queue, searchTerm, filterStatus, filterPriority, filterMachine, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Production Queue</h2>
          <p className="text-sm text-slate-500">{filteredQueue.length} of {queue.length} items • Status changes saved locally</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-manufacturing-accent"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-manufacturing-accent"
          >
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-manufacturing-accent"
          >
            <option value="all">All Priority</option>
            {priorityOptions.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>

          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-manufacturing-accent"
          >
            <option value="all">All Machines</option>
            {availableMachines.map(machine => (
              <option key={machine} value={machine}>{machine}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-manufacturing-accent"
            >
              <option value="dueDate">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="progress">Sort: Progress</option>
              <option value="price">Sort: Price</option>
              <option value="partName">Sort: Part Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              title="Toggle sort order"
            >
              {sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-600">Loading queue...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-700 font-medium">No items found</p>
          <p className="text-sm text-slate-500">
            {queue.length === 0 ? 'No production items scheduled' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Part</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Material</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Progress</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Machine</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Operator</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <select
                        value={item.priority}
                        onChange={(e) => updatePriority(item.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(item.priority)}`}
                      >
                        {priorityOptions.map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.partName}</p>
                        <p className="text-xs text-slate-500">{item.partNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.material}</td>
                    <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
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
                    <td className="px-4 py-3">
                      <select
                        value={item.assignedMachine}
                        onChange={(e) => updateAssignment(item.id, 'assignedMachine', e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Unassigned">Unassigned</option>
                        {availableMachines.map(machine => (
                          <option key={machine} value={machine}>{machine}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.assignedOperator}
                        onChange={(e) => updateAssignment(item.id, 'assignedOperator', e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Unassigned">Unassigned</option>
                        {availableOperators.map(operator => (
                          <option key={operator} value={operator}>{operator}</option>
                        ))}
                      </select>
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
        </div>
      )}
    </div>
  );
}
