import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { formatTime, formatDate } from '../../utils/format';
import { Bell, Plus, DollarSign } from 'lucide-react';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/transaction': 'New Transaction',
    '/queue': 'Production Queue',
};

import ShiftModal from '../shift/ShiftModal';

export default function Topbar() {
    const [time, setTime] = useState(new Date());
    const [isShiftOpen, setIsShiftOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const user = useStore((s) => s.user);
    const branch = useStore((s) => s.branch);
    const transactions = useStore((s) => s.transactions);
    const activeQ = Array.isArray(transactions) ? transactions.filter(t => {
        const s = (t.order_status || t.status || '').toLowerCase();
        return s === 'waiting' || s === 'called';
    }).length : 0;

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const title = PAGE_TITLES[location.pathname] || 'JJIKGO Studio';

    return (
        <header className="topbar" style={{ justifyContent: 'space-between' }}>
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#8E8E93', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        JJIKGO Studio — {branch?.name || 'Main Branch'}
                    </div>
                </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Live clock */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatTime(time)}
                    </div>
                    <div style={{ fontSize: 11, color: '#8E8E93' }}>{formatDate(time)}</div>
                </div>

                {/* Shift Info */}
                <button
                    onClick={() => setIsShiftOpen(true)}
                    style={{
                        background: 'white',
                        border: '1.5px solid #E5E5EA',
                        borderRadius: 10,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    <DollarSign size={16} color="#FF9500" />
                    <span>Shift</span>
                </button>

                {/* Queue badge */}
                <div
                    style={{
                        position: 'relative',
                        cursor: 'pointer',
                    }}
                    onClick={() => navigate('/queue')}
                    title="View Queue"
                >
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: '#F5F5F5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid #E5E5EA',
                    }}>
                        <Bell size={18} color="#111111" />
                    </div>
                    {activeQ > 0 && (
                        <div style={{
                            position: 'absolute', top: -6, right: -6,
                            background: '#FF3B30', color: 'white',
                            width: 18, height: 18, borderRadius: '50%',
                            fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid white',
                        }}>
                            {activeQ > 9 ? '9+' : activeQ}
                        </div>
                    )}
                </div>

                {/* Quick action */}
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/transaction')}
                    style={{ padding: '10px 16px', fontSize: 13 }}
                >
                    <Plus size={15} />
                    New Transaction
                </button>

                {/* Cashier avatar */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: '#111111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 14,
                    flexShrink: 0,
                    cursor: 'default',
                }} title={user?.full_name}>
                    {user?.full_name?.[0]?.toUpperCase() || 'C'}
                </div>
            </div>

            <ShiftModal isOpen={isShiftOpen} onClose={() => setIsShiftOpen(false)} />
        </header>
    );
}
