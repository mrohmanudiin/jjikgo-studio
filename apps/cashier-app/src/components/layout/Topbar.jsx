import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { formatTime, formatDate } from '../../utils/format';
import { Bell, Plus } from 'lucide-react';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/transaction': 'New Transaction',
    '/queue': 'Production Queue',
};

export default function Topbar() {
    const [time, setTime] = useState(new Date());
    const location = useLocation();
    const navigate = useNavigate();
    const cashierName = useStore((s) => s.cashierName);
    const activeQ = useStore((s) => s.getActiveQueueCount());

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
                        JJIKGO Studio — Serang
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
                }} title={cashierName}>
                    {cashierName?.[0]?.toUpperCase() || 'C'}
                </div>
            </div>
        </header>
    );
}
