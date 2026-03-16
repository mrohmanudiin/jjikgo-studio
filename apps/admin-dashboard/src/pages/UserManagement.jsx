import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserPlus, Search, Pencil, Trash2, Shield, Camera, Banknote, ToggleRight, X, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
const ROLES = ['admin', 'cashier', 'staff'];

const EMPTY_FORM = {
  username: '',
  password: '',
  full_name: '',
  email: '',
  role: 'staff',
  branch_id: '',
  active: true,
};

function RoleBadge({ role }) {
  const map = {
    admin: { label: 'Admin', class: 'bg-violet-500/10 text-violet-600 border-violet-500/20', icon: <Shield className="h-3 w-3 mr-1" /> },
    cashier: { label: 'Cashier', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <Banknote className="h-3 w-3 mr-1" /> },
    staff: { label: 'Staff', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <Camera className="h-3 w-3 mr-1" /> },
  };
  const r = map[role] || { label: role, class: '', icon: null };
  return (
    <Badge variant="outline" className={`font-medium flex w-fit items-center ${r.class}`}>
      {r.icon}{r.label}
    </Badge>
  );
}

export function UserManagement() {
  const { branches, selectedBranch } = useBranch();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedBranch ? `?branch_id=${selectedBranch.id}` : '';
      const { data } = await api.get(`/users${params}`);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role,
      branch_id: user.branch_id ? String(user.branch_id) : '',
      active: user.active,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null,
      };
      if (!payload.password) delete payload.password;

      if (editUser) {
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { active: !user.active });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff & Roles</h2>
          <p className="text-muted-foreground mt-1">
            Manage system access, roles, and branch assignments.
            {selectedBranch && <span className="ml-2 text-primary font-medium">— {selectedBranch.name}</span>}
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle>System Users</CardTitle>
            <CardDescription>All staff accounts and their permissions ({filtered.length} total)</CardDescription>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, username, email..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Branch</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                          {(u.full_name || u.username).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.full_name || u.username}</div>
                          <div className="text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{u.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.branch?.name || <span className="italic opacity-50">All Branches</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.active ? 'success' : 'secondary'} className="font-normal">
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="icon" title={u.active ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(u)}>
                          <ToggleRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(u)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editUser ? 'Edit User' : 'Add New User'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Username *</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{editUser ? 'New Password' : 'Password *'}</label>
                  <input className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" type="password" required={!editUser} placeholder={editUser ? 'Leave blank to keep' : ''} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name</label>
                <input className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input type="email" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Role *</label>
                  <select required className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Branch</label>
                  <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              {editUser && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active-toggle" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4" />
                  <label htmlFor="active-toggle" className="text-sm font-medium">Active</label>
                </div>
              )}
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editUser ? 'Save Changes' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
