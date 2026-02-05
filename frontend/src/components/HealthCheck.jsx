import { useEffect, useState } from 'react';
import { FiDatabase, FiServer, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { fileService } from '../api/fileService';

export default function HealthCheck() {
  const [apiStatus, setApiStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiResponse = await fileService.healthCheck();
        setApiStatus({
          status: 'healthy',
          data: apiResponse,
        });
      } catch (err) {
        setApiStatus({
          status: 'unhealthy',
          error: err.message,
        });
      }

      try {
        const dbResponse = await fileService.dbCheck();
        setDbStatus({
          status: dbResponse.status === 'connected' ? 'healthy' : 'unhealthy',
          data: dbResponse,
        });
      } catch (err) {
        setDbStatus({
          status: 'unhealthy',
          error: err.message,
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const StatusBadge = ({ status }) => {
    if (status === 'healthy') {
      return <span className="flex items-center gap-1 text-green-600"><FiCheckCircle /> Healthy</span>;
    }
    return <span className="flex items-center gap-1 text-red-600"><FiAlertCircle /> Unhealthy</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* API Status */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-manufacturing-primary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiServer /> API Server
          </h3>
          {apiStatus && <StatusBadge status={apiStatus.status} />}
        </div>
        {apiStatus && (
          <div className="text-sm text-gray-600">
            <p>Service: {apiStatus.data?.service || 'Unknown'}</p>
            <p>Version: {apiStatus.data?.version || 'Unknown'}</p>
          </div>
        )}
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-manufacturing-primary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiDatabase /> PostgreSQL
          </h3>
          {dbStatus && <StatusBadge status={dbStatus.status} />}
        </div>
        {dbStatus && (
          <div className="text-sm text-gray-600">
            <p>Database: {dbStatus.data?.database || 'Unknown'}</p>
            <p>Pool: {dbStatus.data?.connection_pool || 'Unknown'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
