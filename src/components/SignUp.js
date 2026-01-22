import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, Check, X, Eye, EyeOff, ArrowRight } from 'lucide-react';
import './SignUp.css';
import { authAPI } from '../services/api';
import { storePrivateKey } from '../services/crypto';

function SignUp({ onSignUp, onSwitchToLogin }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Password requirements validation
    const passwordRequirements = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
    };

    const allRequirementsMet = Object.values(passwordRequirements).every(req => req);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Client-side validation
        if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (!formData.email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        if (!allRequirementsMet) {
            setError('Please meet all password requirements');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            // Call backend API
            const response = await authAPI.register({
                name: formData.fullName,
                email: formData.email,
                password: formData.password
            });

            if (response.success) {
                console.log('✅ Registration successful');

                // Store token and user data
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                // IMPORTANT: Store private key securely
                if (response.privateKey) {
                    storePrivateKey(response.privateKey);
                    console.log('🔐 Private key stored securely');
                }

                // Show success message
                alert('Registration successful! Your encryption keys have been generated. Please keep your account secure.');

                // Call parent callback with user data AND token
                onSignUp({ ...response.user, token: response.token });
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            setError(error.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <div className="auth-header">
                    <button className="back-btn" onClick={onSwitchToLogin} disabled={loading}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="already-member">
                        Already a member?
                        <button
                            onClick={onSwitchToLogin}
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
                                fontFamily: 'inherit'
                            }}
                        >
                            Sign In
                        </button>
                    </div>
                </div>

                <div className="auth-content">
                    <h1>Get Started</h1>
                    <p className="subtitle">Create your account now</p>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <div className="input-with-icon">
                                <User size={20} className="input-icon" />
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Full name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                {formData.fullName && (
                                    <Check size={20} className="check-icon" />
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-with-icon">
                                <Mail size={20} className="input-icon" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                {formData.email.includes('@') && (
                                    <Check size={20} className="check-icon" />
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-with-icon">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    disabled={loading}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="password-requirements">
                                    <div className={`requirement ${passwordRequirements.length ? 'valid' : 'invalid'}`}>
                                        {passwordRequirements.length ? <Check size={16} /> : <X size={16} />}
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div className={`requirement ${passwordRequirements.uppercase ? 'valid' : 'invalid'}`}>
                                        {passwordRequirements.uppercase ? <Check size={16} /> : <X size={16} />}
                                        <span>One uppercase letter</span>
                                    </div>
                                    <div className={`requirement ${passwordRequirements.lowercase ? 'valid' : 'invalid'}`}>
                                        {passwordRequirements.lowercase ? <Check size={16} /> : <X size={16} />}
                                        <span>One lowercase letter</span>
                                    </div>
                                    <div className={`requirement ${passwordRequirements.number ? 'valid' : 'invalid'}`}>
                                        {passwordRequirements.number ? <Check size={16} /> : <X size={16} />}
                                        <span>One number</span>
                                    </div>
                                    <div className={`requirement ${passwordRequirements.special ? 'valid' : 'invalid'}`}>
                                        {passwordRequirements.special ? <Check size={16} /> : <X size={16} />}
                                        <span>One special character</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <div className="input-with-icon">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                            <ArrowRight size={20} />
                        </button>

                        <div className="divider">
                            <span>Or continue with</span>
                        </div>

                        <div className="social-buttons">
                            <button type="button" className="social-btn" onClick={() => alert('Google sign-in coming soon!')} disabled={loading}>
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                            <button type="button" className="social-btn" onClick={() => alert('Facebook sign-in coming soon!')} disabled={loading}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </button>
                            <button type="button" className="social-btn" onClick={() => alert('Apple sign-in coming soon!')} disabled={loading}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <div className="language-selector">
                        <span className="flag">🇺🇸</span>
                        <span>English</span>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="feature-card inbox-card">
                    <div className="inbox-label">SECURE MESSAGES</div>
                    <div className="inbox-number">E2EE</div>
                    <svg className="wave-chart" viewBox="0 0 280 80">
                        <path
                            d="M0,40 Q70,10 140,40 T280,40"
                            fill="none"
                            stroke="#5B7CFF"
                            strokeWidth="3"
                        />
                        <path
                            d="M0,50 Q70,30 140,50 T280,50"
                            fill="none"
                            stroke="#A0B5FF"
                            strokeWidth="2"
                            opacity="0.5"
                        />
                    </svg>
                </div>

                <div className="social-icons">
                    <div className="social-icon instagram">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                    </div>
                    <div className="social-icon tiktok">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                        </svg>
                    </div>
                </div>

                <div className="feature-card security-card">
                    <div className="security-icon">🔒</div>
                    <h3>End-to-End Encryption</h3>
                    <p>Your messages are secured with military-grade encryption. Only you and your recipient can read them.</p>
                </div>
            </div>
        </div>
    );
}

export default SignUp;