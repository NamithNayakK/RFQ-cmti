import { useState, useEffect } from 'react';
import App from './App';
import ManufacturerApp from './ManufacturerApp';
import Login from './components/Login';

export default function MainApp() {
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Handle session persistence: show login on fresh load, but stay logged in on refresh
  useEffect(() => {
    const isSessionInitialized = sessionStorage.getItem('appInitialized');
    
    if (isSessionInitialized) {
      // This is a page refresh, restore the session from localStorage
      const storedRole = localStorage.getItem('userRole');
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedRole && storedToken) {
        setUserRole(storedRole);
        setIsLoggedIn(true);
      }
    } else {
      // This is a fresh page load, clear localStorage and mark session as initialized
      localStorage.removeItem('userRole');
      localStorage.removeItem('auth_token');
      sessionStorage.setItem('appInitialized', 'true');
    }
  }, []);

  const handleLoginSuccess = ({ role, accessToken }) => {
    setUserRole(role);
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('userRole', role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('auth_token');
  };

  // Show role login if not logged in
  if (!isLoggedIn || !userRole) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show appropriate interface based on role
  if (userRole === 'buyer') {
    return <App onLogout={handleLogout} />;
  } else if (userRole === 'manufacturer') {
    return <ManufacturerApp onLogout={handleLogout} />;
  }

  return null;
}
