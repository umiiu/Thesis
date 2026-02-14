// ==================== KEY MANAGEMENT SERVICE ====================
// Quản lý private key trong sessionStorage (tự động mất khi đóng tab)

// ==================== DECRYPT PRIVATE KEY ====================
// Giải mã encrypted private key bằng password

async function decryptPrivateKeyWithPassword(encryptedData, password) {
    try {
        // Parse encrypted data format: salt:iv:authTag:encrypted
        const parts = encryptedData.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid encrypted key format');
        }

        const [saltHex, ivHex, authTagHex, encryptedHex] = parts;

        // Convert hex to Uint8Array
        const salt = hexToUint8Array(saltHex);
        const iv = hexToUint8Array(ivHex);
        const authTag = hexToUint8Array(authTagHex);
        const encryptedBytes = hexToUint8Array(encryptedHex);

        // 1. Derive key from password using PBKDF2
        const encoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // 2. Combine encrypted data with auth tag
        const ciphertext = new Uint8Array(encryptedBytes.length + authTag.length);
        ciphertext.set(encryptedBytes);
        ciphertext.set(authTag, encryptedBytes.length);

        // 3. Decrypt
        const decryptedBytes = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128
            },
            derivedKey,
            ciphertext
        );

        // 4. Convert to string
        const decoder = new TextDecoder();
        const privateKeyPEM = decoder.decode(decryptedBytes);

        return privateKeyPEM;

    } catch (error) {
        console.error('❌ Error decrypting private key:', error);
        throw new Error('Failed to decrypt private key. Wrong password?');
    }
}

// Helper: Convert hex string to Uint8Array
function hexToUint8Array(hexString) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

// ==================== STORE & RETRIEVE KEY ====================

// ✅ Lưu private key vào sessionStorage (tự động mất khi đóng tab)
export function storePrivateKeyInSession(privateKey) {
    try {
        sessionStorage.setItem('privateKey', privateKey);
        console.log('✅ Private key stored in sessionStorage');
    } catch (error) {
        console.error('❌ Failed to store private key:', error);
    }
}

// ✅ Lấy private key từ sessionStorage
export function getPrivateKeyFromSession() {
    try {
        return sessionStorage.getItem('privateKey');
    } catch (error) {
        console.error('❌ Failed to get private key:', error);
        return null;
    }
}

// ✅ Xóa private key khỏi sessionStorage
export function clearPrivateKeyFromSession() {
    try {
        sessionStorage.removeItem('privateKey');
        console.log('✅ Private key cleared from sessionStorage');
    } catch (error) {
        console.error('❌ Failed to clear private key:', error);
    }
}

// ==================== MAIN: Setup Private Key ====================
// Hàm này được gọi khi login/register

export async function setupPrivateKey(encryptedPrivateKey, password) {
    try {
        console.log('🔐 Decrypting private key...');

        // Giải mã private key bằng password
        const privateKey = await decryptPrivateKeyWithPassword(
            encryptedPrivateKey,
            password
        );

        // Lưu vào sessionStorage
        storePrivateKeyInSession(privateKey);

        console.log('✅ Private key decrypted and stored in sessionStorage');
        return true;

    } catch (error) {
        console.error('❌ Failed to setup private key:', error);
        throw error;
    }
}

// ==================== EXPORT KEY (BACKUP) ====================
// Export private key để backup (optional)

export function exportPrivateKeyForBackup() {
    const privateKey = getPrivateKeyFromSession();

    if (!privateKey) {
        throw new Error('No private key in session');
    }

    return privateKey;
}

// ==================== IMPORT KEY (RESTORE FROM BACKUP) ====================
// Import private key từ backup file

export function importPrivateKeyFromBackup(privateKeyPEM) {
    try {
        // Validate private key format
        if (!privateKeyPEM || typeof privateKeyPEM !== 'string') {
            throw new Error('Invalid private key format');
        }

        // Check if it's a valid PEM format
        if (!privateKeyPEM.includes('-----BEGIN PRIVATE KEY-----') ||
            !privateKeyPEM.includes('-----END PRIVATE KEY-----')) {
            throw new Error('Invalid PEM format - missing headers/footers');
        }

        // Clean up the key (remove extra whitespace)
        const cleanedKey = privateKeyPEM.trim();

        // Store in sessionStorage
        storePrivateKeyInSession(cleanedKey);

        console.log('✅ Private key imported successfully');
        return true;

    } catch (error) {
        console.error('❌ Failed to import private key:', error);
        throw error;
    }
}

// ==================== PARSE BACKUP FILE ====================
// Parse backup file và extract private key

export function parseBackupFile(fileContent) {
    try {
        // Tìm vị trí bắt đầu và kết thúc của private key
        const startMarker = '-----BEGIN PRIVATE KEY-----';
        const endMarker = '-----END PRIVATE KEY-----';

        const startIndex = fileContent.indexOf(startMarker);
        const endIndex = fileContent.indexOf(endMarker);

        if (startIndex === -1 || endIndex === -1) {
            throw new Error('Private key not found in backup file');
        }

        // Extract private key (bao gồm cả header/footer)
        const privateKey = fileContent.substring(startIndex, endIndex + endMarker.length).trim();

        return privateKey;

    } catch (error) {
        console.error('❌ Failed to parse backup file:', error);
        throw error;
    }
}

// ==================== COMPATIBILITY WITH OLD CRYPTO.JS ====================
// Để giữ backward compatibility với code cũ

// getPrivateKey() - trả về key từ sessionStorage hoặc localStorage (fallback)
export function getPrivateKey() {
    // Ưu tiên lấy từ sessionStorage
    let key = getPrivateKeyFromSession();
    if (key) {
        return key;
    }

    // Fallback: Lấy từ localStorage (cho user cũ)
    try {
        key = localStorage.getItem('privateKey');
        if (key) {
            // Migrate sang sessionStorage
            storePrivateKeyInSession(key);
            localStorage.removeItem('privateKey');
            console.log('✅ Migrated private key from localStorage to sessionStorage');
        }
        return key;
    } catch (error) {
        return null;
    }
}

// storePrivateKey() - lưu vào sessionStorage
export function storePrivateKey(privateKey) {
    storePrivateKeyInSession(privateKey);
}

// clearPrivateKey() - xóa khỏi sessionStorage và localStorage
export function clearPrivateKey() {
    clearPrivateKeyFromSession();
    try {
        localStorage.removeItem('privateKey');
    } catch (error) {
        // Ignore
    }
}