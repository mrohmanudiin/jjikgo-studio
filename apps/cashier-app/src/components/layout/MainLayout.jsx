import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F5' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Topbar />
                <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <Outlet />
                </main>
                <footer style={{
                    textAlign: 'center',
                    padding: '10px 24px',
                    fontSize: 11,
                    color: '#C7C7CC',
                    borderTop: '1px solid #E5E5EA',
                    background: 'white',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                    Korean Vibes Photobooth — Serang
                </footer>
            </div>
        </div>
    );
}
