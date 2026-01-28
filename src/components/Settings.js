import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, CheckCircle, XCircle, Info, Key } from 'lucide-react';
import './Settings.css';
import { getPrivateKey, exportPrivateKeyForBackup } from '../services/crypto';

function Settings({ user }) {
    const [hasPrivateKey, setHasPrivateKey] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        checkPrivateKey();
    }, []);

    const checkPrivateKey = () => {
        const privateKey = getPrivateKey();
        setHasPrivateKey(!!privateKey);
    };

    // ✅ Export Private Key để backup
    const handleExport = () => {
        try {
            setExporting(true);
            const privateKey = exportPrivateKeyForBackup();

            if (!privateKey) {
                alert('❌ No private key available to export!\n\nPlease login again to restore your key.');
                return;
            }

            // Validate private key
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
                alert('❌ Invalid private key format!\n\nYour private key may be corrupted.');
                return;
            }

            console.log('📤 Exporting private key...');

            // Create file content
            const exportDate = new Date().toLocaleString();
            const fileContent = `SecureChat Private Key Backup
============================================
⚠️  KEEP THIS FILE SAFE AND SECURE! ⚠️
============================================

This file contains your private encryption key.
Anyone with this key can decrypt and read ALL your encrypted messages.

User: ${user?.name || 'Unknown'}
Email: ${user?.email || 'Unknown'}
Export Date: ${exportDate}

⚠️  SECURITY WARNING:
- DO NOT share this file with anyone
- Store it in a secure location (password manager, encrypted USB, etc.)
- Delete this file after importing it to a safe location
- Anyone who gets this file can read your messages

============================================

${privateKey}
`;

            // Create blob and download
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Create filename with timestamp
            const timestamp = Date.now();
            const safeEmail = (user?.email || 'backup').replace(/[^a-z0-9]/gi, '-');
            link.download = `securechat-privatekey-${safeEmail}-${timestamp}.txt`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log('✅ Private key exported successfully');

            alert('✅ Private key exported successfully!\n\n⚠️ IMPORTANT SECURITY REMINDERS:\n\n• Keep this file in a SECURE location\n• Never email or message this file to anyone\n• Anyone with this file can decrypt ALL your messages\n• Consider storing it in a password manager\n• Delete the downloaded file after moving it to a safe location');

        } catch (error) {
            console.error('❌ Export error:', error);
            alert('❌ Failed to export private key:\n\n' + error.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your encryption keys and account settings</p>
            </div>

            <div className="settings-content">
                {/* Encryption Key Management */}
                <div className="settings-section">
                    <h2>
                        <Key size={20} />
                        Encryption Key Management
                    </h2>
                    <p>
                        Your private encryption key is automatically secured with your password.
                        You can export it for backup purposes.
                    </p>

                    <div className="info-box" style={{ marginBottom: '20px' }}>
                        <Info size={16} />
                        <div>
                            <h4>✅ New Security Model</h4>
                            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                                Your private key is now encrypted with your password and securely stored.
                                You no longer need to manually export/import keys between devices.
                                Simply login with your password on any device!
                            </p>
                        </div>
                    </div>

                    {/* Key Status */}
                    <div className={`key-status ${hasPrivateKey ? 'available' : 'missing'}`}>
                        <div className="key-status-icon">
                            {hasPrivateKey ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        </div>
                        <div className="key-status-info">
                            <h3>
                                {hasPrivateKey ? 'Private Key Available' : 'Private Key Missing'}
                            </h3>
                            <p>
                                {hasPrivateKey
                                    ? 'You can decrypt and read encrypted messages'
                                    : 'Please login again to restore your key'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="button-group">
                        <button
                            className="settings-button primary"
                            onClick={handleExport}
                            disabled={!hasPrivateKey || exporting}
                        >
                            <Download size={18} />
                            {exporting ? 'Exporting...' : 'Export Private Key (Backup)'}
                        </button>
                    </div>

                    {/* Warning Box */}
                    <div className="warning-box">
                        <AlertTriangle size={20} color="#f59e0b" />
                        <p>
                            <strong>Important:</strong> Exporting your private key is optional.
                            It's recommended only as an extra backup. Your key is already
                            securely stored and accessible whenever you login with your password.
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="info-box">
                        <h4>
                            <Info size={16} />
                            How it works:
                        </h4>
                        <ul>
                            <li><strong>Automatic:</strong> Your private key is encrypted with your password when you register</li>
                            <li><strong>Login anywhere:</strong> Simply login with your password on any device - your key is automatically restored</li>
                            <li><strong>Export (Optional):</strong> Download your private key as an extra backup for safekeeping</li>
                            <li><strong>⚠️ Never share:</strong> Your private key can decrypt all your messages - keep it secret!</li>
                        </ul>
                    </div>
                </div>

                {/* Account Info */}
                <div className="settings-section">
                    <h2>Account Information</h2>
                    <p><strong>Name:</strong> {user?.name || 'Unknown'}</p>
                    <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                    <p style={{ marginBottom: 0 }}><strong>Status:</strong> <span style={{ color: '#10b981' }}>● Online</span></p>
                </div>
            </div>
        </div>
    );
}

export default Settings;