import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import BoothSelection from './pages/BoothSelection';
import StaffDashboard from './pages/StaffDashboard';
import Login from './pages/Login';
import { fetchThemes, fetchQueue, socket } from './utils/api';

export default function App() {
  const [themes, setThemes] = useState([]);
  const [queueData, setQueueData] = useState({});
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const store = localStorage.getItem('jjikgo-staff-store');
    return !!store;
  });

  const handleLogout = useCallback(() => {
    localStorage.removeItem('jjikgo-staff-store');
    setIsAuthenticated(false);
  }, []);

  const refreshQueue = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchQueue();
      setQueueData(data);
    } catch (e) {
      console.error('Fetch queue error:', e);
      if (e.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoadingQueue(false);
    }
  }, [isAuthenticated, handleLogout]);

  // Read branchId from localStorage to scope API calls
  const getStoredBranchId = useCallback(() => {
    try {
      const storeStr = localStorage.getItem('jjikgo-staff-store');
      if (storeStr) {
        const data = JSON.parse(storeStr);
        return data.state?.branch?.id || null;
      }
    } catch (e) { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const branchId = getStoredBranchId();

    setLoadingThemes(true);
    fetchThemes(branchId)
      .then(setThemes)
      .catch((e) => {
        console.error(e);
        if (e.response?.status === 401) handleLogout();
      })
      .finally(() => setLoadingThemes(false));

    refreshQueue();

    // Polling every 5s as fallback
    const intervalId = setInterval(refreshQueue, 5000);

    // Listen for queue updates
    socket.on('queueUpdated', refreshQueue);
    return () => {
      clearInterval(intervalId);
      socket.off('queueUpdated', refreshQueue);
    };
  }, [refreshQueue, isAuthenticated, handleLogout, getStoredBranchId]);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loadingThemes) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', flexDirection: 'column', gap: 20
      }}>
        <div className="ambient-bg">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent-cyan)' }} />
        <div style={{ color: 'var(--text-s)', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <>
      {!selectedTheme ? (
        <BoothSelection 
          themes={themes} 
          queueData={queueData}
          loading={loadingQueue}
          onSelect={setSelectedTheme}
          onLogout={handleLogout}
        />
      ) : (
        <StaffDashboard
          theme={selectedTheme}
          queueData={queueData}
          loading={loadingQueue}
          refresh={refreshQueue}
          onChangeBooth={() => setSelectedTheme(null)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
