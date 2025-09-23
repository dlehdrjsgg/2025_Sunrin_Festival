let currentTime = 60; // 1분 = 60초
let timerInterval = null;
let currentStudent = {};

const pages = {
    start: document.getElementById('startPage'),
    game: document.getElementById('gamePage'),
    result: document.getElementById('resultPage'),
    complete: document.getElementById('completePage')
};

const startForm = document.getElementById('startForm');
const resultForm = document.getElementById('resultForm');
const timerDisplay = document.getElementById('timer');
const newGameBtn = document.getElementById('newGameBtn');
const viewScoreboardBtn = document.getElementById('viewScoreboardBtn');
const endGameBtn = document.getElementById('endGameBtn');

    startForm,
    resultForm,
    timerDisplay,
    newGameBtn,
    viewScoreboardBtn,
    endGameBtn
});

async function saveToDatabase(data) {
    try {
        
        const response = await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`데이터 저장 실패: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

function showPage(pageName) {
    
    Object.values(pages).forEach(page => {
        if (page) {
            page.classList.remove('active');
        }
    });
    
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    } else {
    }
}

function startTimer() {
    currentTime = 60;
    
    timerInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay();
        
        if (currentTime <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (currentTime <= 10) {
        timerDisplay.style.color = '#e74c3c';
        timerDisplay.style.animation = 'pulse 1s infinite';
    } else {
        timerDisplay.style.color = '#e74c3c';
        timerDisplay.style.animation = 'none';
    }
}

function endGame() {
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const finalScoreInput = document.getElementById('finalScore');
    if (finalScoreInput) {
        finalScoreInput.value = '';
    }
    
    showPage('result');
    
    setTimeout(() => {
        const resultPage = document.getElementById('resultPage');
        const gamePage = document.getElementById('gamePage');
    }, 100);
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

async function saveResult(event) {
    event.preventDefault();
    
    
    const finalScore = parseInt(document.getElementById('finalScore').value);
    
    if (!validateScore(finalScore)) {
        alert('올바른 점수를 입력해주세요. (0-999 사이의 정수)');
        return;
    }
    
    if (!currentStudent.studentId || !currentStudent.studentName) {
        alert('학생 정보가 없습니다. 다시 게임을 시작해주세요.');
        return;
    }
    
    if (!validateStudentId(currentStudent.studentId) || !validateStudentName(currentStudent.studentName)) {
        alert('학생 정보가 올바르지 않습니다. 다시 게임을 시작해주세요.');
        return;
    }
    
    const gameData = {
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        score: finalScore,
        timestamp: new Date().toISOString()
    };
    
    
    try {
        const result = await saveToDatabase(gameData);
        
        if (result && result.success) {
            document.getElementById('completedStudentId').textContent = currentStudent.studentId;
            document.getElementById('completedStudentName').textContent = currentStudent.studentName;
            document.getElementById('completedScore').textContent = finalScore;
            
            showPage('complete');
            
            startForm.reset();
            resultForm.reset();
        } else {
            alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        alert('결과 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

window.saveResult = saveResult;

startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    
    if (!validateStudentId(studentId)) {
        alert('올바른 학번을 입력해주세요. (3-10자리 숫자)');
        return;
    }
    
    if (!validateStudentName(studentName)) {
        alert('올바른 이름을 입력해주세요. (2-20자리 한글, 영문, 숫자)');
        return;
    }
    
    currentStudent = { 
        studentId: sanitizeInput(studentId), 
        studentName: sanitizeInput(studentName) 
    };
    showPage('game');
    startTimer();
});

resultForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    
    const finalScore = parseInt(document.getElementById('finalScore').value);
    
    if (isNaN(finalScore) || finalScore < 0) {
        alert('올바른 점수를 입력해주세요.');
        return;
    }
    
    if (!currentStudent.studentId || !currentStudent.studentName) {
        alert('학생 정보가 없습니다. 다시 게임을 시작해주세요.');
        return;
    }
    
    const gameData = {
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        score: finalScore,
        timestamp: new Date().toISOString()
    };
    
    
    try {
        const result = await saveToDatabase(gameData);
        
        if (result && result.success) {
            document.getElementById('completedStudentId').textContent = currentStudent.studentId;
            document.getElementById('completedStudentName').textContent = currentStudent.studentName;
            document.getElementById('completedScore').textContent = finalScore;
            
            showPage('complete');
            
            startForm.reset();
            resultForm.reset();
        } else {
            alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        alert('결과 저장 중 오류가 발생했습니다: ' + error.message);
    }
});

newGameBtn.addEventListener('click', () => {
    showPage('start');
});

viewScoreboardBtn.addEventListener('click', () => {
    window.open('scoreboard.html', '_blank');
});

if (endGameBtn) {
    endGameBtn.addEventListener('click', () => {
        if (confirm('정말로 게임을 종료하시겠습니까?')) {
            endGame();
        }
    });
} else {
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        if (pages.game.classList.contains('active')) {
            if (confirm('게임을 중단하시겠습니까?')) {
                clearInterval(timerInterval);
                showPage('start');
            }
        } else if (pages.result.classList.contains('active')) {
            showPage('start');
        } else if (pages.complete.classList.contains('active')) {
            showPage('start');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
});

const completionInfoStyle = document.createElement('style');
completionInfoStyle.textContent = `
    .completion-info {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
    }
    
    .completion-info p {
        margin-bottom: 10px;
        color: #ccc;
    }
    
    .completion-info span {
        color: #ffffff;
        font-weight: 600;
    }
    
    .btn-end-game {
        background: rgba(255, 71, 87, 0.2);
        color: #ff4757;
        border: 1px solid rgba(255, 71, 87, 0.3);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 20px;
        width: auto;
    }
    
    .btn-end-game:hover {
        background: rgba(255, 71, 87, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(255, 71, 87, 0.2);
    }
    
    .btn-end-game:active {
        transform: translateY(0);
    }
`;
document.head.appendChild(completionInfoStyle);

window.endGame = endGame;
window.saveResult = saveResult;