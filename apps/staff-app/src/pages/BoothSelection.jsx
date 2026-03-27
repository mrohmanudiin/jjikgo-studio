import React from 'react';

const COLORS = [
    { bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.25)', text: '#00d4ff', icon: '🎞' },
    { bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)', text: '#ec4899', icon: '🌸' },
    { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', icon: '🌿' },
    { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', icon: '✨' },
    { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', text: '#818cf8', icon: '🎨' },
    { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', text: '#f43f5e', icon: '🔥' },
];

export default function BoothSelection({ themes, queueData, onSelect, onLogout }) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="booth-root fade-in">
            {onLogout && (
                <button
                    className="topbar-btn danger"
                    onClick={onLogout}
                    style={{ position: 'absolute', top: 20, right: 20 }}
                >
                    Sign Out
                </button>
            )}

            <div className="booth-header fade-up">
                <div className="booth-eyebrow">
                    <div className="booth-eyebrow-dot" />
                    Staff Terminal
                </div>
                <h1 className="booth-title">Select Your Booth</h1>
                <p className="booth-sub">Choose your station to start managing the queue</p>
            </div>

            {themes.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                    No booths configured. Add themes in Admin settings.
                </div>
            ) : (
                <div className="booth-grid">
                    {themes.map((theme, idx) => {
                        const c = COLORS[idx % COLORS.length];
                        const myQueues = (queueData && theme.name) ? (queueData[theme.name] || []) : [];
                        const waiting = Array.isArray(myQueues) ? myQueues.filter(q => q?.status?.toLowerCase() === 'waiting').length : 0;

                        return (
                            <button
                                key={theme.id}
                                className="booth-card fade-up"
                                style={{ animationDelay: `${idx * 0.07}s` }}
                                onClick={() => onSelect(theme)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="booth-card-icon" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                                        {c.icon}
                                    </div>
                                    {waiting > 0 && <div className="booth-card-badge">{waiting}</div>}
                                </div>
                                <div className="booth-card-name">{theme.name}</div>
                                <div className="booth-card-meta">
                                    <span className="booth-card-prefix" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                                        {theme.prefix || 'T'}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                        {waiting > 0 ? `${waiting} waiting` : 'No queue'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="booth-footer">{today.toUpperCase()} · JJIKGO PHOTOBOOTH</div>
        </div>
    );
}
