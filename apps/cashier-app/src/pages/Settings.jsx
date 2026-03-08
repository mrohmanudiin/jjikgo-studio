import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import {
    Settings as SettingsIcon, Package, Layout, Tag, Coffee,
    Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronRight, Loader2
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

const TABS = [
    { id: 'themes', label: 'Themes', icon: Layout, endpoint: '/studio/themes' },
    { id: 'packages', label: 'Packages', icon: Package, endpoint: '/studio/packages' },
    { id: 'addons', label: 'Add-ons', icon: Tag, endpoint: '/studio/addons' },
    { id: 'cafe', label: 'Cafe & Snacks', icon: Coffee, endpoint: '/studio/cafe-snacks' },
    { id: 'promos', label: 'Promos', icon: Tag, endpoint: '/studio/promos' },
];

export default function Settings() {
    const [activeTab, setActiveTab] = useState('themes');
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({});

    const refreshMasterData = useStore((s) => s.refreshMasterData);
    const currentTab = TABS.find((t) => t.id === activeTab);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(currentTab.endpoint);
            setItems(res.data);
        } catch (err) {
            console.error("Failed to load settings data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, [activeTab]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing && isEditing !== 'new') {
                await api.put(`${currentTab.endpoint}/${isEditing}`, formData);
            } else {
                await api.post(currentTab.endpoint, formData);
            }
            setIsEditing(null);
            setFormData({});
            await loadItems();
            await refreshMasterData();
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to save changes";
            alert(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await api.delete(`${currentTab.endpoint}/${id}`);
            await loadItems();
            await refreshMasterData();
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to delete item";
            alert(msg);
        }
    };

    const startEdit = (item) => {
        setIsEditing(item.id);
        const data = { ...item };
        delete data.id;
        delete data.created_at;
        delete data.updated_at;
        setFormData(data);
    };

    const startAdd = () => {
        setIsEditing('new');
        setFormData({ active: true });
    };

    return (
        <div className="animate-fadeIn" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Sidebar Tabs */}
            <div className="card" style={{ width: 240, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <div style={{ padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111', fontWeight: 800, fontSize: 15 }}>
                        <SettingsIcon size={18} /> Configuration
                    </div>
                    <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>Manage studio data</div>
                </div>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setIsEditing(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', borderRadius: 10,
                            border: 'none', background: activeTab === tab.id ? '#111' : 'transparent',
                            color: activeTab === tab.id ? 'white' : '#636366',
                            cursor: 'pointer', width: '100%', textAlign: 'left',
                            fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <tab.icon size={16} />
                        <span style={{ flex: 1 }}>{tab.label}</span>
                        {activeTab === tab.id && <ChevronRight size={14} />}
                    </button>
                ))}
            </div>

            {/* Main Panel */}
            <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minWidth: 0 }}>
                {/* Panel Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid #F2F2F7',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{currentTab.label}</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8E8E93' }}>Manage studio {currentTab.label.toLowerCase()}</p>
                    </div>
                    {!isEditing && (
                        <button className="btn btn-primary" onClick={startAdd} style={{ padding: '10px 18px', fontSize: 13, borderRadius: 10 }}>
                            <Plus size={16} /> Add {currentTab.label.slice(0, -1)}
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div style={{ padding: 24 }}>
                        <div style={{
                            background: '#FAFAFA', borderRadius: 12, padding: 24,
                            border: '1.5px solid #F2F2F7'
                        }}>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#111' }}>
                                {isEditing === 'new' ? `Add New ${currentTab.label.slice(0, -1)}` : `Edit ${currentTab.label.slice(0, -1)}`}
                            </div>
                            <form onSubmit={handleSave} style={{ display: 'grid', gap: 18, maxWidth: 500 }}>
                                <div className="form-group">
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Name / Label</label>
                                    <input
                                        className="form-control"
                                        value={formData.name || formData.label || ''}
                                        onChange={e => setFormData({ ...formData, [activeTab === 'themes' ? 'name' : 'label']: e.target.value })}
                                        required
                                        style={{ padding: '12px 14px', borderRadius: 10 }}
                                    />
                                </div>

                                {(activeTab === 'themes' || activeTab === 'packages' || activeTab === 'addons' || activeTab === 'cafe') && (
                                    <div className="form-group">
                                        <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Price (Rp)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={formData.price || ''}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                            required
                                            style={{ padding: '12px 14px', borderRadius: 10 }}
                                        />
                                    </div>
                                )}

                                {activeTab === 'packages' && (
                                    <>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Slug (Unique ID)</label>
                                            <input
                                                className="form-control"
                                                value={formData.slug || ''}
                                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                                required
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Description</label>
                                            <input
                                                className="form-control"
                                                value={formData.description || ''}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            />
                                        </div>
                                    </>
                                )}

                                {activeTab === 'themes' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Booth Number</label>
                                            <input
                                                className="form-control"
                                                value={formData.booth_number || ''}
                                                onChange={e => setFormData({ ...formData, booth_number: e.target.value })}
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Queue Prefix</label>
                                            <input
                                                className="form-control"
                                                value={formData.prefix || ''}
                                                placeholder="e.g. V, H, E"
                                                onChange={e => setFormData({ ...formData, prefix: e.target.value })}
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>
                                                Theme Color
                                                {formData.color && (
                                                    <span style={{
                                                        display: 'inline-block', width: 12, height: 12,
                                                        borderRadius: 3, background: formData.color,
                                                        marginLeft: 8, verticalAlign: 'middle',
                                                        border: '1px solid #E5E5EA'
                                                    }} />
                                                )}
                                            </label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={formData.color || '#000000'}
                                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                    style={{
                                                        width: 48, height: 48, padding: 2,
                                                        borderRadius: 10, border: '1.5px solid #E5E5EA',
                                                        cursor: 'pointer', background: 'white'
                                                    }}
                                                />
                                                <input
                                                    className="form-control"
                                                    value={formData.color || ''}
                                                    placeholder="#FF5733"
                                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                    style={{ padding: '12px 14px', borderRadius: 10, flex: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'promos' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Type</label>
                                            <select
                                                className="form-control"
                                                value={formData.type || 'percent'}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            >
                                                <option value="percent">Percent</option>
                                                <option value="flat">Flat Amount</option>
                                                <option value="manual">Manual</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, display: 'block' }}>Discount</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={formData.discount || 0}
                                                onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                                                style={{ padding: '12px 14px', borderRadius: 10 }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700 }}>
                                        {isEditing === 'new' ? `Add ${currentTab.label.slice(0, -1)}` : 'Save Changes'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(null)} style={{ flex: 1, padding: '12px', borderRadius: 10 }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 0 }}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#8E8E93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    border: '3px solid #F2F2F7', borderTopColor: '#111',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Loading {currentTab.label.toLowerCase()}...</div>
                            </div>
                        ) : items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#8E8E93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16, background: '#F5F5F5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <currentTab.icon size={24} color="#C7C7CC" />
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>No {currentTab.label.toLowerCase()} found</div>
                                <button className="btn btn-primary" onClick={startAdd} style={{ fontSize: 13, padding: '10px 18px', borderRadius: 10 }}>
                                    <Plus size={14} /> Add First {currentTab.label.slice(0, -1)}
                                </button>
                            </div>
                        ) : (
                            <div>
                                {/* Table Header */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 120px',
                                    padding: '12px 24px', borderBottom: '1px solid #F2F2F7',
                                    background: '#FAFAFA'
                                }}>
                                    <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</div>
                                    <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</div>
                                    <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                                    <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</div>
                                </div>

                                {/* Table Rows */}
                                {items.map(item => (
                                    <div key={item.id} style={{
                                        display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 120px',
                                        padding: '14px 24px', borderBottom: '1px solid #F8F8F8',
                                        alignItems: 'center',
                                        transition: 'background 0.15s ease'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        {/* Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {item.color && (
                                                <div style={{
                                                    width: 10, height: 10, borderRadius: 3,
                                                    background: item.color, flexShrink: 0,
                                                    border: '1px solid rgba(0,0,0,0.1)'
                                                }} />
                                            )}
                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{item.name || item.label}</span>
                                        </div>

                                        {/* Details */}
                                        <div style={{ fontSize: 13, color: '#636366' }}>
                                            {item.price !== undefined && formatCurrency(item.price)}
                                            {item.prefix && (
                                                <span style={{
                                                    marginLeft: 8, background: '#F2F2F7',
                                                    padding: '2px 8px', borderRadius: 4,
                                                    fontSize: 11, fontWeight: 600, color: '#8E8E93'
                                                }}>
                                                    Prefix: {item.prefix}
                                                </span>
                                            )}
                                            {item.type && ` (${item.type} ${item.discount})`}
                                        </div>

                                        {/* Status */}
                                        <div>
                                            {item.active !== false ? (
                                                <span style={{ color: '#34C759', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                    <CheckCircle2 size={14} /> Active
                                                </span>
                                            ) : (
                                                <span style={{ color: '#8E8E93', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                    <XCircle size={14} /> Disabled
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => startEdit(item)}
                                                style={{
                                                    background: '#F2F2F7', border: 'none', cursor: 'pointer',
                                                    color: '#007AFF', padding: 8, borderRadius: 8,
                                                    width: 36, height: 36,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Edit"
                                                onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#F2F2F7'; e.currentTarget.style.color = '#007AFF'; }}
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                style={{
                                                    background: '#FFF0F0', border: 'none', cursor: 'pointer',
                                                    color: '#FF3B30', padding: 8, borderRadius: 8,
                                                    width: 36, height: 36,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Delete"
                                                onMouseEnter={e => { e.currentTarget.style.background = '#FF3B30'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#FFF0F0'; e.currentTarget.style.color = '#FF3B30'; }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
