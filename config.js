const crypto = require('crypto');

const config = {
    port: process.env.PORT || 3001,
    
    dbPath: './data/scores.json',
    
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    
    sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    
    saltRounds: 10
};

function hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, hashedPassword) {
    if (!hashedPassword || !hashedPassword.includes(':')) {
        return false;
    }
    
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

const DEFAULT_HASHED_PASSWORD = hashPassword('admin123');

module.exports = {
    config,
    hashPassword,
    verifyPassword,
    DEFAULT_HASHED_PASSWORD
};
