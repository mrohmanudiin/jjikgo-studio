import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { usePrintAlerts } from '../../App';
import {
    LayoutDashboard, Plus, ListOrdered, LogOut, Camera, ChevronLeft, ChevronRight, Settings, DollarSign
} from 'lucide-react';

const NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transaction', icon: Plus, label: 'New Transaction' },
    { to: '/queue', icon: ListOrdered, label: 'Queue' },
    { to: '/shift', icon: DollarSign, label: 'Shift' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const logout = useStore((s) => s.logout);
    const cashier = useStore((s) => s.user?.full_name || s.user?.username || 'Cashier');
    const navigate = useNavigate();
    const { alerts } = usePrintAlerts();
    const printCount = alerts.length;

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <aside
            style={{
                width: collapsed ? 72 : 240,
                minWidth: collapsed ? 72 : 240,
                background: '#111111',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease, min-width 0.25s ease',
                position: 'relative',
                zIndex: 10,
            }}
        >
            {/* Logo */}
            <div style={{
                padding: collapsed ? '24px 0' : '24px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                overflow: 'hidden',
                justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ width: 36, height: 36, objectFit: 'contain' }} 
                />
                {!collapsed && (
                    <div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '0.01em', lineHeight: 1.2 }}>JJIKGO</div>
                        <div style={{ color: '#636366', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Studio</div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 8px' }}>
                {NAV.map(({ to, icon: Icon, label }) => {
                    const isQueueLink = to === '/queue';
                    const badgeCount = isQueueLink ? printCount : 0;
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            title={label}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: collapsed ? '12px 0' : '12px 14px',
                                borderRadius: 10,
                                marginBottom: 4,
                                textDecoration: 'none',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: isActive ? 'white' : '#8E8E93',
                                transition: 'all 0.18s ease',
                                fontWeight: 500,
                                fontSize: 14,
                                position: 'relative',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        {badgeCount > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: -6, right: -8,
                                                minWidth: 16, height: 16,
                                                background: '#EC4899',
                                                color: 'white',
                                                borderRadius: 100,
                                                fontSize: 10,
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 4px',
                                                boxShadow: '0 0 0 2px #111',
                                                animation: 'pulse-badge 1.5s ease infinite',
                                            }}>
                                                {badgeCount}
                                            </span>
                                        )}
                                    </div>
                                    {!collapsed && (
                                        <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
                                    )}
                                    {!collapsed && badgeCount > 0 && (
                                        <span style={{
                                            background: '#EC4899',
                                            color: 'white',
                                            borderRadius: 100,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            marginLeft: 'auto',
                                        }}>
                                            {badgeCount} print
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
                <style>{`
                    @keyframes pulse-badge {
                        0%, 100% { transform: scale(1); }
                        50%       { transform: scale(1.2); }
                    }
                `}</style>
            </nav>

            {/* Bottom */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {!collapsed && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.05)',
                        marginBottom: 8,
                    }}>
                        <div style={{ color: '#8E8E93', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Signed in as</div>
                        <div style={{ color: 'white', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cashier}
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: collapsed ? '12px 0' : '12px 14px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#636366',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.15)'; e.currentTarget.style.color = '#FF3B30'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#636366'; }}
                >
                    <LogOut size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && 'Logout'}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed((c) => !c)}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: -16,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'white',
                    border: '1.5px solid #E5E5EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    zIndex: 20,
                    transition: 'transform 0.15s ease'
                }}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
}
