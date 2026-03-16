import React, { useState } from 'react';
import api from '../utils/api';
import { Camera, Lock } from 'lucide-react';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { username, password });
      const data = res.data;
      
      if (data.role !== 'admin') {
        throw new Error('Unauthorized. Admin access required.');
      }
      
      const storeData = {
        user: {
          id: data.id,
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          token: data.token
        }
      };
      localStorage.setItem('jjikgo-admin-store', JSON.stringify(storeData));
      
      onLoginSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <div className="max-w-md w-full">
        {/* Logo Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-black text-white shadow-xl mb-6">
            <Camera size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-slate-500 mt-2 font-medium">Sign in to manage Jjikgo Photobooth</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 font-medium">
              <div className="p-1 bg-red-100 rounded-lg">
                <Lock size={16} />
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-black outline-none transition-all font-medium text-slate-900"
                placeholder="administrator"
              />
            </div>

            <div className="space-y-2 mb-8">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-black outline-none transition-all font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-black hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mx-auto shadow-xl shadow-black/10 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm font-medium text-slate-400">
          Secure Administrative Area
        </div>
      </div>
    </div>
  );
}
