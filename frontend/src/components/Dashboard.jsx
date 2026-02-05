import { useEffect, useMemo, useState } from 'react';
import { FiUpload, FiFolder, FiUsers } from 'react-icons/fi';
import { fileService } from '../api/fileService';

export default function Dashboard({ onBrowseAll }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fileService.listFiles(50, 0);
        setFiles(response.files || []);
      } catch {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalCADFiles = files.length;
    const requestsSent = files.length;
    const recentUploads = files.slice(0, 5);

    return { totalFiles, totalCADFiles, requestsSent, recentUploads };
  }, [files]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Files</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalFiles}</p>
              <p className="text-xs text-slate-500 mt-1">CAD files</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FiFolder />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total CAD Files</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalCADFiles}</p>
              <p className="text-xs text-slate-500 mt-1">CAD files uploaded</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FiFolder />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Requests Sent</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.requestsSent}</p>
              <p className="text-xs text-slate-500 mt-1">Quotation requests</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FiUpload />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onBrowseAll}
          className="bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition hover:bg-slate-50 hover:border-manufacturing-primary hover:text-manufacturing-primary"
        >
          Browse All Files
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Requests</h3>
          <button
            onClick={onBrowseAll}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : stats.recentUploads.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <p className="text-slate-700 font-medium">No requests sent yet</p>
            <p className="text-sm text-slate-500">Upload your first CAD file to request a quotation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentUploads.map((file) => (
              <div key={file.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.uploaded_by || file.original_name}</p>
                  <p className="text-xs text-slate-500">{new Date(file.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
