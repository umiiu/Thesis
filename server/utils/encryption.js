const crypto = require('crypto');

// ==================== ENCRYPT PRIVATE KEY ====================
// Mã hóa private key bằng password của user
// Algorithm: AES-256-GCM (authenticated encryption)

function encryptPrivateKey(privateKeyPEM, password) {
    try {
        // 1. Derive encryption key từ password (PBKDF2)
        const salt = crypto.randomBytes(32);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        // 2. Generate IV (Initialization Vector)
        const iv = crypto.randomBytes(16);

        // 3. Encrypt private key
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(privateKeyPEM, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // 4. Get authentication tag
        const authTag = cipher.getAuthTag();

        // 5. Combine everything into one string (để lưu DB dễ)
        // Format: salt:iv:authTag:encryptedData
        const result = [
            salt.toString('hex'),
            iv.toString('hex'),
            authTag.toString('hex'),
            encrypted
        ].join(':');

        return result;

    } catch (error) {
        console.error('❌ Error encrypting private key:', error);
        throw new Error('Failed to encrypt private key');
    }
}

// ==================== DECRYPT PRIVATE KEY ====================
// Giải mã private key bằng password

function decryptPrivateKey(encryptedData, password) {
    try {
        // 1. Parse encrypted data
        const parts = encryptedData.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid encrypted data format');
        }

        const [saltHex, ivHex, authTagHex, encrypted] = parts;

        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // 2. Derive same key từ password
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        // 3. Decrypt
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;

    } catch (error) {
        console.error('❌ Error decrypting private key:', error);
        throw new Error('Failed to decrypt private key - wrong password?');
    }
}

module.exports = {
    encryptPrivateKey,
    decryptPrivateKey
};