import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    const saved = localStorage.getItem('jjikgo-selected-branch');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      
      const availableBranches = data.length > 1 
        ? [{ id: 'ALL', name: 'All Branches' }, ...data]
        : data;
        
      setBranches(availableBranches);
      
      // If no branch selected or selected branch doesn't exist anymore, pick first entry
      if (availableBranches.length > 0) {
        let current = selectedBranch;
        if (!current || (current.id !== 'ALL' && !data.find(b => b.id === current.id))) {
          current = availableBranches[0];
          setSelectedBranch(current);
          localStorage.setItem('jjikgo-selected-branch', JSON.stringify(current));
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches', err);
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = (branchId) => {
    if (branchId === 'ALL') {
      const allBranch = { id: 'ALL', name: 'All Branches' };
      setSelectedBranch(allBranch);
      localStorage.setItem('jjikgo-selected-branch', JSON.stringify(allBranch));
      return;
    }
    
    // Only allow selecting valid branches
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setSelectedBranch(branch);
      localStorage.setItem('jjikgo-selected-branch', JSON.stringify(branch));
    }
  };

  const value = React.useMemo(() => ({
    branches,
    selectedBranch,
    selectBranch,
    refreshBranches: fetchBranches,
    loading,
  }), [branches, selectedBranch, loading]);

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
