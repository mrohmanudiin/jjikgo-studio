import React, { useState } from 'react';
import { login } from '../utils/api';

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await login(username, password);
            localStorage.setItem('jjikgo-staff-store', JSON.stringify({
                state: {
                    user: { id: data.id, username: data.username, full_name: data.full_name, role: data.role, branch_id: data.branch_id, token: data.token },
                    branch: data.branch
                }
            }));
            onLoginSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root fade-in">
            <div className="login-card fade-up">
                <div className="login-logo">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                </div>
                <h1 className="login-title">Staff Portal</h1>
                <p className="login-sub">Sign in to manage your booth queue</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>Username</label>
                        <input className="login-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoComplete="username" />
                    </div>
                    <div className="login-field">
                        <label>Password</label>
                        <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required autoComplete="current-password" />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? <><span className="spinner dark" /> Signing in…</> : 'Sign In →'}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>
                    JJIKGO Photobooth · Staff Access
                </div>
            </div>
        </div>
    );
}
