import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, Receipt, Plus, Pencil, Trash2, ToggleRight, X, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';

const EMPTY_FORM = { name: '', location: '' };

export function Branches() {
  const { branches, refreshBranches } = useBranch();
  const [stats, setStats] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (branchList) => {
    const results = {};
    await Promise.all(
      branchList.map(async (b) => {
        try {
          const { data } = await api.get(`/branches/${b.id}/stats`);
          results[b.id] = data;
        } catch { }
      })
    );
    setStats(results);
  };

  useEffect(() => {
    if (branches.length > 0) {
      fetchStats(branches);
    }
  }, [branches]);

  const openCreate = () => {
    setEditBranch(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditBranch(branch);
    setForm({ name: branch.name, location: branch.location || '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editBranch) {
        await api.put(`/branches/${editBranch.id}`, form);
      } else {
        await api.post('/branches', form);
      }
      setIsModalOpen(false);
      refreshBranches();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (branch) => {
    try {
      await api.put(`/branches/${branch.id}`, { active: !branch.active });
      refreshBranches();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update branch');
    }
  };

  const handleDelete = async (branch) => {
    if (!confirm(`Delete branch "${branch.name}"? This cannot be undone. All associated data will be lost.`)) return;
    try {
      await api.delete(`/branches/${branch.id}`);
      refreshBranches();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete branch');
    }
  };

  return (
    <div className="p-0 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Branches</h1>
          <p className="text-muted-foreground mt-1">Manage all studio locations and their operational data.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-black dark:bg-white dark:text-black text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-80 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => {
          const branchStats = stats[branch.id];
          return (
            <div key={branch.id} className="bg-card rounded-3xl border p-6 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-muted p-3 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Building2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${branch.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-muted text-muted-foreground'}`}>
                    {branch.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1">{branch.name}</h3>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6">
                <MapPin size={14} />
                {branch.location || 'No location set'}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/50 rounded-2xl p-4">
                  <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Staff</div>
                  <div className="text-xl font-black flex items-center gap-2">
                    <Users size={18} className="text-muted-foreground" />
                    {branchStats?.userCount ?? branch._count?.users ?? '—'}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-2xl p-4">
                  <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Transactions</div>
                  <div className="text-xl font-black flex items-center gap-2">
                    <Receipt size={18} className="text-muted-foreground" />
                    {branchStats?.transactionCount ?? branch._count?.transactions ?? '—'}
                  </div>
                </div>
              </div>

              {branchStats && (
                <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                  <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</div>
                  <div className="text-lg font-black text-primary">
                    Rp {(branchStats.totalRevenue || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(branch)}
                  title={branch.active ? 'Deactivate' : 'Activate'}
                  className="flex-1 py-2.5 rounded-2xl border-2 border-muted font-bold text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ToggleRight size={16} />
                  {branch.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => openEdit(branch)}
                  className="p-2.5 rounded-2xl border-2 border-muted hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  className="p-2.5 rounded-2xl border-2 border-muted hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {branches.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Building2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No branches yet</p>
            <p className="text-sm">Create your first branch to get started.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-3xl p-8 w-full max-w-md shadow-2xl border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">{editBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Branch Name *</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 rounded-2xl border-2 border-input focus:border-primary outline-none transition-all font-medium bg-background"
                  placeholder="e.g. Serang City"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 rounded-2xl border-2 border-input focus:border-primary outline-none transition-all font-medium bg-background"
                  placeholder="Full Address"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-muted-foreground hover:bg-muted rounded-2xl transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                  {editBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
