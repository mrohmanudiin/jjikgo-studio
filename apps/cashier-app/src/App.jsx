import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewTransaction from './pages/NewTransaction';
import ProductionQueue from './pages/ProductionQueue';
import Settings from './pages/Settings';
import QueueTracking from './pages/QueueTracking';
import ShiftManagement from './pages/ShiftManagement';
import { fetchThemes, fetchPackages, fetchAddons, fetchCafeSnacks, fetchPromos, socket } from './utils/api';

// ─── Print Alert Context ──────────────────────────────────────────────────────
export const PrintAlertContext = createContext({ alerts: [], dismissAlert: () => { } });
export const usePrintAlerts = () => useContext(PrintAlertContext);

function PrivateRoute({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [printAlerts, setPrintAlerts] = useState([]);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const logout = useStore((s) => s.logout);

  const dismissAlert = (id) =>
    setPrintAlerts((prev) => prev.filter((a) => a.id !== id));

  // ── On mount: validate session token is still alive ───────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    import('./utils/api').then(({ api }) => {
      api.get('/auth/me').catch((err) => {
        if (err.response?.status === 401) {
          // Token is dead; log out cleanly
          logout();
        }
      });
    });
  }, []); // run once on cold mount only

  // ── Load master data + wire up socket whenever we become logged in ────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const s = useStore.getState();
    s.refreshMasterData();
    s.refreshTransactions();

    const onQueueUpdated = () => useStore.getState().refreshTransactions();
    const onPrintRequested = ({ queue }) => {
      useStore.getState().refreshTransactions();
      const themeName = queue?.theme?.name || 'Unknown Booth';
      const customerName = queue?.transaction?.customer_name || 'Customer';
      const qPrefix = queue?.theme?.prefix || 'T';
      const qNum = `${qPrefix}${String(queue?.queue_number || '').padStart(2, '0')}`;
      const alertId = `${queue?.id}-${Date.now()}`;

      setPrintAlerts((prev) => [
        {
          id: alertId,
          queueId: queue?.id,
          queueNumber: qNum,
          customerName,
          themeName,
          transactionId: queue?.id,
          timestamp: new Date(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    socket.on('queueUpdated', onQueueUpdated);
    socket.on('printRequested', onPrintRequested);

    return () => {
      socket.off('queueUpdated', onQueueUpdated);
      socket.off('printRequested', onPrintRequested);
    };
  }, [isLoggedIn]);

  return (
    <PrintAlertContext.Provider value={{ alerts: printAlerts, dismissAlert }}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/queue/:queueNumber" element={<QueueTracking />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transaction" element={<NewTransaction />} />
            <Route path="queue" element={<ProductionQueue />} />
            <Route path="shift" element={<ShiftManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PrintAlertContext.Provider>
  );
}
