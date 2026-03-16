import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { LiveBooth } from './pages/LiveBooth';
import { QueueMonitor } from './pages/QueueMonitor';
import { TransactionHistory } from './pages/TransactionHistory';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { DailyCash } from './pages/DailyCash';
import { PhotoSessions } from './pages/PhotoSessions';
import { PrintRequests } from './pages/PrintRequests';
import { ThemeManagement } from './pages/ThemeManagement';
import { BoothManagement } from './pages/BoothManagement';
import { UserManagement } from './pages/UserManagement';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Branches } from './pages/Branches';
import { Login } from './pages/Login';
import { BranchProvider } from './contexts/BranchContext';
import api from './utils/api';
import { useState, useEffect } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('jjikgo-admin-store');
  });

  useEffect(() => {
    // Synchronize authentication state with the utility interceptor if needed
    // The utility api.js handles redirects, but we can also update local state here
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem('jjikgo-admin-store');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <BranchProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="branches" element={<Branches />} />
            <Route path="booths" element={<LiveBooth />} />
            <Route path="queue" element={<QueueMonitor />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="daily-cash" element={<DailyCash />} />
            <Route path="sessions" element={<PhotoSessions />} />
            <Route path="prints" element={<PrintRequests />} />
            <Route path="themes" element={<ThemeManagement />} />
            <Route path="booths-manage" element={<BoothManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </BranchProvider>
  );
}

export default App;
