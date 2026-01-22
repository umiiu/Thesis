import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import { authAPI } from '../services/api';

function Login({ onLogin, onSwitchToSignUp }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Client-side validation
        if (!email || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email');
            setLoading(false);
            return;
        }

        try {
            console.log('🔐 Attempting login...');

            // Call backend API
            const response = await authAPI.login({ email, password });

            if (response.success) {
                console.log('✅ Login successful:', response.user);

                // Store token and user data in localStorage
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                // Call parent callback with user data AND token
                onLogin({ ...response.user, token: response.token });
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            setError(error.message || error.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo">
                        <Lock size={32} />
                    </div>
                    <h1>SecureChat</h1>
                    <p>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail size={20} className="input-icon" />
                            <input
                                id="email"
                                type="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock size={20} className="input-icon" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                disabled={loading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                disabled={loading}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" disabled={loading} />
                            <span>Remember me</span>
                        </label>
                        <button
                            type="button"
                            className="forgot-password"
                            onClick={() => alert('Password reset functionality coming soon!')}
                            disabled={loading}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <div className="signup-link">
                        Don't have an account?
                        <button
                            type="button"
                            onClick={() => {
                                if (!loading) onSwitchToSignUp();
                            }}
                            disabled={loading}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#5B7CFF',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '14px',
                                marginLeft: '4px',
                                padding: 0,
                                fontFamily: 'inherit',
                                textDecoration: 'none'
                            }}
                        >
                            Sign up
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;