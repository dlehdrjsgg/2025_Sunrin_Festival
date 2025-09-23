const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config, hashPassword, verifyPassword, DEFAULT_HASHED_PASSWORD } = require('./config');

const app = express();
const PORT = config.port;
const DATA_FILE = path.join(__dirname, config.dbPath);

const sessions = new Map();

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self';"
    );
    
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

const corsOptions = {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // JSON 크기 제한
app.use(express.static('.'));

if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

function validateStudentId(studentId) {
    if (!studentId || typeof studentId !== 'string') return false;
    const sanitized = sanitizeInput(studentId);
    return /^\d{3,10}$/.test(sanitized);
}

function validateStudentName(studentName) {
    if (!studentName || typeof studentName !== 'string') return false;
    const sanitized = sanitizeInput(studentName);
    return /^[가-힣a-zA-Z0-9\s]{2,20}$/.test(sanitized);
}

function validateScore(score) {
    if (typeof score !== 'number' || isNaN(score)) return false;
    return Number.isInteger(score) && score >= 0 && score <= 999;
}

function validateTimestamp(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
}

function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: '비밀번호를 입력해주세요.' 
            });
        }
        
        if (verifyPassword(password, DEFAULT_HASHED_PASSWORD)) {
            const sessionToken = crypto.randomBytes(32).toString('hex');
            
            sessions.set(sessionToken, {
                loginTime: Date.now(),
                expiresAt: Date.now() + (30 * 60 * 1000) // 30분
            });
            
            res.json({ 
                success: true, 
                message: '로그인 성공',
                sessionToken: sessionToken
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: '비밀번호가 올바르지 않습니다.' 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    try {
        const { sessionToken } = req.body;
        
        if (sessionToken && sessions.has(sessionToken)) {
            sessions.delete(sessionToken);
        }
        
        res.json({ success: true, message: '로그아웃 성공' });
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});

function verifySession(req, res, next) {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!sessionToken) {
        return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }
    
    const session = sessions.get(sessionToken);
    
    if (!session || Date.now() > session.expiresAt) {
        if (session) {
            sessions.delete(sessionToken);
        }
        return res.status(401).json({ success: false, error: '세션이 만료되었습니다.' });
    }
    
    req.sessionToken = sessionToken;
    next();
}

app.post('/api/save-score', (req, res) => {
    try {
        
        const { studentId, studentName, score, timestamp } = req.body;
        
        if (!validateStudentId(studentId)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 학번을 입력해주세요. (3-10자리 숫자)' 
            });
        }
        
        if (!validateStudentName(studentName)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 이름을 입력해주세요. (2-20자리 한글, 영문, 숫자)' 
            });
        }
        
        if (!validateScore(score)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 점수를 입력해주세요. (0-999 사이의 정수)' 
            });
        }
        
        if (!validateTimestamp(timestamp)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 시간 형식이 아닙니다.' 
            });
        }
        
        const newScore = {
            studentId: sanitizeInput(studentId),
            studentName: sanitizeInput(studentName),
            score: parseInt(score),
            timestamp: timestamp,
            id: Date.now().toString()
        };

        const scores = readData();
        scores.push(newScore);
        
        const success = writeData(scores);
        
        if (success) {
            res.json({ success: true, id: newScore.id });
        } else {
            res.status(500).json({ success: false, error: '데이터 저장 실패' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});

app.get('/api/scoreboard', (req, res) => {
    try {
        const scores = readData();
        const sortedScores = scores.sort((a, b) => b.score - a.score);
        res.json(sortedScores);
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

app.get('/api/admin/scoreboard', verifySession, (req, res) => {
    try {
        const scores = readData();
        const sortedScores = scores.sort((a, b) => b.score - a.score);
        res.json(sortedScores);
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        const scores = readData();
        
        const stats = {
            totalPlayers: scores.length,
            highestScore: scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0,
            averageScore: scores.length > 0 ? 
                Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
            recentGames: scores
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

app.put('/api/update-score/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, studentName, score, timestamp } = req.body;
        
        
        if (!validateStudentId(studentId)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 학번을 입력해주세요. (3-10자리 숫자)' 
            });
        }
        
        if (!validateStudentName(studentName)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 이름을 입력해주세요. (2-20자리 한글, 영문, 숫자)' 
            });
        }
        
        if (!validateScore(score)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 점수를 입력해주세요. (0-999 사이의 정수)' 
            });
        }
        
        const scores = readData();
        const index = scores.findIndex(s => s.id === id);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '기록을 찾을 수 없습니다.' 
            });
        }
        
        scores[index] = {
            ...scores[index],
            studentId: sanitizeInput(studentId),
            studentName: sanitizeInput(studentName),
            score: parseInt(score),
            timestamp: timestamp
        };
        
        const success = writeData(scores);
        
        if (success) {
            res.json({ success: true, data: scores[index] });
        } else {
            res.status(500).json({ success: false, error: '데이터 업데이트 실패' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});

app.delete('/api/delete-score/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        
        const scores = readData();
        const index = scores.findIndex(s => s.id === id);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '기록을 찾을 수 없습니다.' 
            });
        }
        
        const deletedScore = scores[index];
        scores.splice(index, 1);
        
        const success = writeData(scores);
        
        if (success) {
            res.json({ success: true, deletedData: deletedScore });
        } else {
            res.status(500).json({ success: false, error: '데이터 삭제 실패' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});

app.listen(PORT, () => {
});
