import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewTransaction from './pages/NewTransaction';
import ProductionQueue from './pages/ProductionQueue';
import Settings from './pages/Settings';
import { fetchThemes, fetchPackages, fetchAddons, fetchCafeSnacks, fetchPromos } from './utils/api';

function PrivateRoute({ children }) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  const refreshMasterData = useStore((s) => s.refreshMasterData);

  useEffect(() => {
    refreshMasterData();
  }, [refreshMasterData]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

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
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
