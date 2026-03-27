import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
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
import { socket } from './utils/api';

// ─── Print Alert Context ──────────────────────────────────────────────────────
export const PrintAlertContext = createContext({ alerts: [], dismissAlert: () => { } });
export const usePrintAlerts = () => useContext(PrintAlertContext);

// Polling interval in ms — 5s is fast enough for queue updates
const POLL_INTERVAL = 5000;

function PrivateRoute({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [printAlerts, setPrintAlerts] = useState([]);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const logout = useStore((s) => s.logout);
  const pollRef = useRef(null);

  const dismissAlert = (id) =>
    setPrintAlerts((prev) => prev.filter((a) => a.id !== id));

  // ── On mount: validate session token is still alive ───────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    import('./utils/api').then(({ api }) => {
      api.get('/auth/me').catch((err) => {
        if (err.response?.status === 401) logout();
      });
    });
  }, []);

  // ── Load master data + polling + socket whenever logged in ────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      // Clear polling when logged out
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const s = useStore.getState();
    s.refreshMasterData();
    s.refreshTransactions();

    // ── Polling fallback (primary real-time mechanism on Vercel) ─────────────
    // Socket.io polling on Vercel serverless is unreliable because each request
    // may hit a different stateless function instance. HTTP polling is reliable.
    pollRef.current = setInterval(() => {
      useStore.getState().refreshTransactions();
    }, POLL_INTERVAL);

    // ── Socket (bonus — works if same instance handles the connection) ────────
    const onQueueUpdated = () => useStore.getState().refreshTransactions();
    const onPrintRequested = ({ queue, data }) => {
      const queueData = queue || data;
      useStore.getState().refreshTransactions();
      if (!queueData) return;
      const themeName = queueData?.theme?.name || 'Unknown Booth';
      const customerName = queueData?.transaction?.customer_name || 'Customer';
      const qPrefix = queueData?.theme?.prefix || 'T';
      const qNum = `${qPrefix}${String(queueData?.queue_number || '').padStart(2, '0')}`;
      const alertId = `${queueData?.id}-${Date.now()}`;
      setPrintAlerts((prev) => [
        { id: alertId, queueId: queueData?.id, queueNumber: qNum, customerName, themeName, transactionId: queueData?.id, timestamp: new Date() },
        ...prev.slice(0, 4),
      ]);
    };

    socket.on('queueUpdated', onQueueUpdated);
    socket.on('printRequested', onPrintRequested);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
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
