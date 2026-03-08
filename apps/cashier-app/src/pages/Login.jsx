import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Camera, Eye, EyeOff, ArrowRight } from 'lucide-react';

const DEMO_CREDENTIALS = { email: 'cashier@jjikgo.com', password: 'jjikgo123' };

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPass] = useState('');
    const [showPass, setShowP] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useStore((s) => s.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        await new Promise((r) => setTimeout(r, 700)); // simulate network

        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            login('Kasir JJIKGO');
            navigate('/dashboard');
        } else {
            setError('Email atau password salah. Coba lagi.');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F5F5F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* BG decorative */}
            <div style={{
                position: 'absolute', top: -80, right: -80,
                width: 320, height: 320, borderRadius: '50%',
                background: 'rgba(17,17,17,0.04)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: -60, left: -60,
                width: 240, height: 240, borderRadius: '50%',
                background: 'rgba(17,17,17,0.03)',
                pointerEvents: 'none',
            }} />

            {/* Card */}
            <div className="animate-fadeIn" style={{
                background: 'white',
                borderRadius: 24,
                padding: '48px 40px',
                width: '100%',
                maxWidth: 420,
                boxShadow: '0 24px 64px rgba(0,0,0,0.10)',
                border: '1px solid #E5E5EA',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 18,
                        background: '#111111',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <Camera size={30} color="white" />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>JJIKGO Studio</h1>
                    <p style={{ fontSize: 13, color: '#8E8E93', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Korean Self Photo Studio
                    </p>
                </div>

                {/* Role chip */}
                <div style={{
                    background: '#F5F5F5',
                    borderRadius: 100,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#8E8E93',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    marginBottom: 28,
                    display: 'inline-block',
                    width: '100%',
                }}>
                    🖤 Cashier Access
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            className="input"
                            placeholder="cashier@jjikgo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            autoComplete="email"
                        />
                    </div>

                    <div style={{ marginBottom: 24, position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Password
                        </label>
                        <input
                            id="login-password"
                            type={showPass ? 'text' : 'password'}
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPass(e.target.value)}
                            required
                            autoComplete="current-password"
                            style={{ paddingRight: 48 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowP((v) => !v)}
                            style={{
                                position: 'absolute', right: 14, top: '50%', transform: 'translateY(20%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', padding: 0,
                            }}
                        >
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            background: '#FFF1F0', border: '1px solid #FFCCC7',
                            borderRadius: 8, padding: '10px 14px',
                            fontSize: 13, color: '#FF3B30', marginBottom: 16,
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="login-submit"
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12 }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SpinnerCircle />
                                Logging in...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                Login
                                <ArrowRight size={16} />
                            </span>
                        )}
                    </button>
                </form>

                {/* Hint */}
                <div style={{
                    marginTop: 24,
                    padding: '12px 14px',
                    background: '#F5F5F5',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#8E8E93',
                    lineHeight: 1.6,
                }}>
                    <strong style={{ color: '#636366' }}>Demo credentials:</strong><br />
                    Email: cashier@jjikgo.com<br />
                    Password: jjikgo123
                </div>
            </div>

            {/* Bottom label */}
            <div style={{
                position: 'absolute', bottom: 16,
                fontSize: 11, color: '#C7C7CC',
                letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
                Korean Vibes Photobooth — Serang
            </div>
        </div>
    );
}

function SpinnerCircle() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    );
}
