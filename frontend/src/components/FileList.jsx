import { useState, useEffect } from 'react';
import { FiDownload, FiTrash2, FiSearch, FiRefreshCw, FiFilter, FiEye, FiUpload } from 'react-icons/fi';
import { fileService } from '../api/fileService';

export default function FileList({ refreshTrigger }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });
  const [total, setTotal] = useState(0);

  const loadFiles = async (search = '') => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (search.trim()) {
        response = await fileService.searchFiles({
          query: search,
          limit: pagination.limit,
          offset: pagination.offset,
        });
      } else {
        response = await fileService.listFiles(pagination.limit, pagination.offset);
      }
      setFiles(response.files || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(activeSearch);
  }, [refreshTrigger, pagination.offset, pagination.limit, activeSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, offset: 0 });
    setActiveSearch(searchQuery);
  };

  const handleDownload = async (file) => {
    try {
      const response = await fileService.requestDownloadUrl(file.object_key);
      const downloadUrl = response.download_url;
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(`Failed to download: ${err.message}`);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.original_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fileService.deleteFile(file.object_key);
      loadFiles(activeSearch);
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(total / pagination.limit);
  const sortedFiles = [...files].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">All files</h2>
          <p className="text-sm text-slate-500">{total} files in storage</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters(prev => !prev)}
              className="border border-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition flex items-center gap-2"
            >
              <FiFilter /> Filters
            </button>
            {showFilters && (
              <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-10">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Sort by</label>
                <button
                  type="button"
                  onClick={() => setSortOrder('newest')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    sortOrder === 'newest'
                      ? 'bg-manufacturing-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Newest first
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('oldest')}
                  className={`mt-1 w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    sortOrder === 'oldest'
                      ? 'bg-manufacturing-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Oldest first
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-manufacturing-accent hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-lg transition flex items-center gap-2"
          >
            <FiSearch /> Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveSearch('');
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition flex items-center gap-2"
          >
            <FiRefreshCw /> Clear
          </button>
        </div>
      </form>


      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-manufacturing-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading files...</p>
        </div>
      )}

      {/* Files Grid - Card Layout */}
      {!loading && files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {sortedFiles.map((file) => (
            <div key={file.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col">
              {/* Card Content */}
              <div className="p-4 flex flex-col flex-grow">
                {/* Part Name */}
                <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-3">
                  {file.original_name}
                </h3>

                {/* File Info */}
                <div className="text-xs text-slate-600 space-y-1.5 mb-4 flex-grow">
                  {file.part_number && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Part #:</span>
                      <span className="font-medium">{file.part_number}</span>
                    </div>
                  )}
                  {file.material && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Material:</span>
                      <span className="font-medium">{file.material}</span>
                    </div>
                  )}
                  {file.quantity_unit && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quantity:</span>
                      <span className="font-medium">{file.quantity_unit}</span>
                    </div>
                  )}
                  {file.description && (
                    <div className="flex flex-col">
                      <span className="text-slate-500 mb-0.5">Description:</span>
                      <span className="font-medium line-clamp-2">{file.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Uploaded:</span>
                    <span className="font-medium">{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex-1 bg-manufacturing-accent hover:opacity-90 text-white text-xs font-semibold py-2 px-3 rounded transition flex items-center justify-center gap-1"
                    title="Download"
                  >
                    <FiDownload size={14} />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 px-3 rounded transition flex items-center justify-center gap-1"
                    title="Delete"
                  >
                    <FiTrash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Files */}
      {!loading && files.length === 0 && (
        <div className="text-center py-16 border border-slate-200 rounded-xl bg-slate-50">
          <div className="h-12 w-12 rounded-full bg-white mx-auto flex items-center justify-center text-slate-400 mb-3">
            <FiEye />
          </div>
          <p className="text-slate-700 font-medium">No files found</p>
          <p className="text-sm text-slate-500">Upload your first CAD file to get started</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && files.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-slate-600">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })}
              disabled={pagination.offset === 0}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 py-2 px-4 rounded transition"
            >
              Previous
            </button>
            <span className="py-2 px-4 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                if (pagination.offset + pagination.limit < total) {
                  setPagination({ ...pagination, offset: pagination.offset + pagination.limit });
                }
              }}
              disabled={pagination.offset + pagination.limit >= total}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 py-2 px-4 rounded transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
