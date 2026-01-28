// E2EE Encryption Utilities using Web Crypto API

// ✅ IMPORT KEY MANAGEMENT FUNCTIONS
import {
    getPrivateKey,
    storePrivateKey,
    clearPrivateKey,
    exportPrivateKeyForBackup
} from './keyManagement';

// ✅ RE-EXPORT for backward compatibility
export { getPrivateKey, storePrivateKey, clearPrivateKey, exportPrivateKeyForBackup };

// ==================== HELPER FUNCTIONS ====================

// Convert string to ArrayBuffer
function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Convert ArrayBuffer to string
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

// Convert ArrayBuffer to Base64
function ab2base64(buffer) {
    const binary = ab2str(buffer);
    return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base642ab(base64) {
    const binary = atob(base64);
    return str2ab(binary);
}

// ==================== RSA KEY MANAGEMENT ====================

// Import RSA public key from PEM string
export async function importPublicKey(pemKey) {
    try {
        // Remove PEM header/footer and decode base64
        const pemContents = pemKey
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .replace(/\s/g, '');

        const binaryDer = base642ab(pemContents);

        const key = await window.crypto.subtle.importKey(
            'spki',
            binaryDer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['encrypt']
        );

        return key;
    } catch (error) {
        console.error('Error importing public key:', error);
        throw error;
    }
}

// Import RSA private key from PEM string
export async function importPrivateKey(pemKey) {
    try {
        // Remove PEM header/footer and decode base64
        const pemContents = pemKey
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, '');

        const binaryDer = base642ab(pemContents);

        const key = await window.crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['decrypt']
        );

        return key;
    } catch (error) {
        console.error('Error importing private key:', error);
        throw error;
    }
}

// ==================== AES ENCRYPTION ====================

// Generate random AES key
export async function generateAESKey() {
    const key = await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
    return key;
}

// Generate random IV (Initialization Vector)
export function generateIV() {
    return window.crypto.getRandomValues(new Uint8Array(12));
}

// Encrypt message with AES
export async function encryptWithAES(message, aesKey, iv) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            aesKey,
            data
        );

        return ab2base64(encrypted);
    } catch (error) {
        console.error('Error encrypting with AES:', error);
        throw error;
    }
}

// Decrypt message with AES
export async function decryptWithAES(encryptedMessage, aesKey, iv) {
    try {
        const encrypted = base642ab(encryptedMessage);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            aesKey,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Error decrypting with AES:', error);
        throw error;
    }
}

// ==================== RSA ENCRYPTION (for AES key) ====================

// Encrypt AES key with RSA public key
export async function encryptAESKeyWithRSA(aesKey, publicKey) {
    try {
        // Export AES key as raw
        const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);

        // Encrypt with RSA
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP',
            },
            publicKey,
            rawKey
        );

        return ab2base64(encrypted);
    } catch (error) {
        console.error('Error encrypting AES key with RSA:', error);
        throw error;
    }
}

// Decrypt AES key with RSA private key
export async function decryptAESKeyWithRSA(encryptedKey, privateKey) {
    try {
        const encrypted = base642ab(encryptedKey);

        // Decrypt with RSA
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP',
            },
            privateKey,
            encrypted
        );

        // Import as AES key
        const aesKey = await window.crypto.subtle.importKey(
            'raw',
            decrypted,
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );

        return aesKey;
    } catch (error) {
        console.error('Error decrypting AES key with RSA:', error);
        throw error;
    }
}

// ==================== COMPLETE E2EE WORKFLOW ====================

// Encrypt message for sending (complete workflow)
export async function encryptMessage(message, recipientPublicKeyPEM) {
    try {
        // 1. Import recipient's RSA public key
        const recipientPublicKey = await importPublicKey(recipientPublicKeyPEM);

        // 2. Generate random AES key for this message
        const aesKey = await generateAESKey();

        // 3. Generate random IV
        const iv = generateIV();

        // 4. Encrypt message with AES
        const encryptedContent = await encryptWithAES(message, aesKey, iv);

        // 5. Encrypt AES key with recipient's RSA public key
        const encryptedKey = await encryptAESKeyWithRSA(aesKey, recipientPublicKey);

        return {
            encryptedContent,
            iv: ab2base64(iv),
            encryptedKey,
        };
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw error;
    }
}

// Decrypt received message (complete workflow)
export async function decryptMessage(encryptedContent, encryptedKey, ivBase64, privateKeyPEM) {
    try {
        // 1. Import own RSA private key
        const privateKey = await importPrivateKey(privateKeyPEM);

        // 2. Decrypt AES key with RSA private key
        const aesKey = await decryptAESKeyWithRSA(encryptedKey, privateKey);

        // 3. Convert IV from base64
        const iv = base642ab(ivBase64);

        // 4. Decrypt message with AES
        const decryptedMessage = await decryptWithAES(encryptedContent, aesKey, iv);

        return decryptedMessage;
    } catch (error) {
        console.error('Error decrypting message:', error);
        throw error;
    }
}