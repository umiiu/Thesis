import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, XCircle, Info, Key } from 'lucide-react';
import './Settings.css';
import { getPrivateKey, storePrivateKey, clearPrivateKey } from '../services/crypto';

/* ===============================
   Helper: fingerprint private key
================================ */
async function fingerprintKey(pem) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pem);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function Settings({ user }) {
    const [hasPrivateKey, setHasPrivateKey] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        checkPrivateKey();
    }, []);

    const checkPrivateKey = () => {
        const privateKey = getPrivateKey();
        setHasPrivateKey(!!privateKey);
    };

    // Export Private Key
    const handleExport = () => {
        try {
            setExporting(true);
            const privateKey = getPrivateKey();

            if (!privateKey) {
                alert('❌ No private key found to export!');
                return;
            }

            // Validate private key before export
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
                alert('❌ Invalid private key format in storage!\n\nYour private key may be corrupted.');
                return;
            }

            console.log('📤 Exporting private key...');
            console.log('   Length:', privateKey.length);
            console.log('   Valid format:', privateKey.startsWith('-----BEGIN') && privateKey.endsWith('-----'));

            // Create file content - SIMPLE FORMAT
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

    // Import Private Key
    const handleImport = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('📥 Importing private key from file:', file.name);
        setImporting(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result;

                console.log('📄 File read successfully, length:', content.length);

                // STEP 1: Find the private key markers
                const beginMarker = '-----BEGIN PRIVATE KEY-----';
                const endMarker = '-----END PRIVATE KEY-----';

                // Find the LAST occurrence of each marker (in case file has duplicates)
                const beginIndex = content.lastIndexOf(beginMarker);
                const endIndex = content.lastIndexOf(endMarker);

                console.log('🔍 Searching for private key markers...');
                console.log('   BEGIN marker at position:', beginIndex);
                console.log('   END marker at position:', endIndex);

                // STEP 2: Validate markers were found
                if (beginIndex === -1) {
                    throw new Error('Private key BEGIN marker not found.\n\nMake sure you selected the correct SecureChat backup file.\n\nThe file should contain:\n-----BEGIN PRIVATE KEY-----');
                }

                if (endIndex === -1) {
                    throw new Error('Private key END marker not found.\n\nThe backup file may be corrupted or incomplete.\n\nThe file should contain:\n-----END PRIVATE KEY-----');
                }

                if (endIndex <= beginIndex) {
                    throw new Error('Invalid private key structure.\n\nThe END marker appears before the BEGIN marker.\n\nThe file may be corrupted.');
                }

                // STEP 3: Extract the private key
                const privateKey = content.substring(beginIndex, endIndex + endMarker.length).trim();

                console.log('✂️ Extracted private key:');
                console.log('   Total length:', privateKey.length);
                console.log('   Number of lines:', privateKey.split('\n').length);
                console.log('   First line:', privateKey.split('\n')[0]);
                console.log('   Last line:', privateKey.split('\n').slice(-1)[0]);

                // STEP 4: Validate extracted key
                if (privateKey.length < 200) {
                    throw new Error(`Private key is too short (${privateKey.length} characters).\n\nExpected at least 200 characters.\n\nThe file may be corrupted.`);
                }

                if (!privateKey.startsWith(beginMarker)) {
                    console.error('❌ Key does not start with BEGIN marker');
                    console.error('   Starts with:', privateKey.substring(0, 50));
                    throw new Error('Extracted private key does not start with BEGIN marker.\n\nThis should not happen. Please try again.');
                }

                if (!privateKey.endsWith(endMarker)) {
                    console.error('❌ Key does not end with END marker');
                    console.error('   Ends with:', privateKey.substring(privateKey.length - 50));
                    throw new Error('Extracted private key does not end with END marker.\n\nThis should not happen. Please try again.');
                }

                // STEP 5: Validate base64 content
                const lines = privateKey.split('\n');
                if (lines.length < 3) {
                    throw new Error(`Private key has only ${lines.length} lines.\n\nExpected at least 3 lines (BEGIN marker, base64 data, END marker).\n\nThe file may be corrupted.`);
                }

                // Get middle lines (excluding first and last which are markers)
                const base64Content = lines.slice(1, -1).join('');

                // Check if it's valid base64
                if (!/^[A-Za-z0-9+/=\s]+$/.test(base64Content)) {
                    throw new Error('Private key contains invalid characters.\n\nExpected base64 encoded data between BEGIN and END markers.\n\nThe file may be corrupted.');
                }

                if (base64Content.length < 100) {
                    throw new Error(`Base64 content is too short (${base64Content.length} characters).\n\nThe file may be corrupted.`);
                }

                console.log('✅ Private key validation passed');
                console.log('   Base64 content length:', base64Content.length);

                // STEP 6: Store the private key
                console.log('💾 Storing private key in localStorage...');
                storePrivateKey(privateKey);

                // STEP 7: Verify storage
                const storedKey = getPrivateKey();
                if (!storedKey) {
                    throw new Error('Failed to store private key in localStorage.\n\nlocalStorage may be full, disabled, or in private browsing mode.');
                }

                if (storedKey.length !== privateKey.length) {
                    console.error('❌ Stored key length mismatch!');
                    console.error('   Original:', privateKey.length);
                    console.error('   Stored:', storedKey.length);
                    throw new Error(`Private key storage verification failed.\n\nOriginal: ${privateKey.length} chars\nStored: ${storedKey.length} chars\n\nPlease try again.`);
                }

                if (storedKey !== privateKey) {
                    console.error('❌ Stored key content mismatch!');
                    throw new Error('Private key was stored but content does not match.\n\nPlease try again.');
                }

                console.log('✅ Private key stored successfully');
                console.log('✅ Storage verification passed');

                checkPrivateKey();

                alert('✅ Private key imported successfully!\n\n🔄 The page will reload in 2 seconds to decrypt your messages...\n\nPlease wait...');

                // Auto reload page after 2 seconds
                setTimeout(() => {
                    console.log('🔄 Reloading page...');
                    window.location.reload();
                }, 2000);

            } catch (error) {
                console.error('❌ Import failed:', error);
                alert('❌ Failed to import private key:\n\n' + error.message + '\n\nPlease make sure you selected the correct SecureChat backup file.');
            } finally {
                setImporting(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        reader.onerror = (error) => {
            console.error('❌ File read error:', error);
            alert('❌ Failed to read the file.\n\nPlease try again.');
            setImporting(false);
        };

        reader.readAsText(file);
    };

    // Delete Private Key
    const handleDelete = () => {
        if (!window.confirm('⚠️ ARE YOU SURE?\n\nDeleting your private key means you will NEVER be able to decrypt your old messages again!\n\nThis action CANNOT be undone.\n\nMake sure you have exported and backed up your key first!\n\nDo you want to continue?')) {
            return;
        }

        if (!window.confirm('⚠️ FINAL WARNING!\n\nThis is your last chance to back up your private key.\n\nClick OK to permanently delete your private key.\nClick Cancel to go back.')) {
            return;
        }

        try {
            clearPrivateKey();
            checkPrivateKey();
            alert('✅ Private key deleted.\n\nYou can still send new messages, but cannot decrypt old messages anymore.');
        } catch (error) {
            console.error('Delete error:', error);
            alert('❌ Failed to delete private key: ' + error.message);
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
                        Your private encryption key is used to decrypt messages sent to you.
                        Keep it safe and secure. If you lose it, you cannot decrypt your old messages.
                    </p>

                    <div className="warning-box">
                        <AlertTriangle size={20} color="#f59e0b" />
                        <p>
                            <strong>Important:</strong> Your private key is stored only in this browser.
                            If you clear browser data, switch browsers, or use a different device,
                            you must import your key backup to read old messages.
                        </p>
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
                                    : 'You cannot decrypt old messages without your key'
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
                            {exporting ? 'Exporting...' : 'Export Private Key'}
                        </button>

                        <button
                            className="settings-button secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                        >
                            <Upload size={18} />
                            {importing ? 'Importing...' : 'Import Private Key'}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt"
                            onChange={handleImport}
                            className="file-input"
                        />

                        {hasPrivateKey && (
                            <button
                                className="settings-button danger"
                                onClick={handleDelete}
                            >
                                <XCircle size={18} />
                                Delete Private Key
                            </button>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="info-box">
                        <h4>
                            <Info size={16} />
                            How to use:
                        </h4>
                        <ul>
                            <li><strong>Export:</strong> Download your private key to a secure location (password manager, encrypted USB, etc.)</li>
                            <li><strong>Import:</strong> Upload your private key backup file to restore access to encrypted messages</li>
                            <li><strong>Delete:</strong> Remove your private key from this browser (make sure you have a backup first!)</li>
                            <li><strong>⚠️ Never share your private key with anyone!</strong> It can decrypt all your messages.</li>
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
