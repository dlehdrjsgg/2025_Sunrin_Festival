// 전역 변수
let currentTime = 60; // 1분 = 60초
let timerInterval = null;
let currentStudent = {};

// 페이지 요소들
const pages = {
    start: document.getElementById('startPage'),
    game: document.getElementById('gamePage'),
    result: document.getElementById('resultPage'),
    complete: document.getElementById('completePage')
};

// DOM 요소들
const startForm = document.getElementById('startForm');
const resultForm = document.getElementById('resultForm');
const timerDisplay = document.getElementById('timer');
const newGameBtn = document.getElementById('newGameBtn');
const viewScoreboardBtn = document.getElementById('viewScoreboardBtn');
const endGameBtn = document.getElementById('endGameBtn');

// DOM 요소 확인
console.log('DOM 요소들:', {
    startForm,
    resultForm,
    timerDisplay,
    newGameBtn,
    viewScoreboardBtn,
    endGameBtn
});

// 데이터베이스 관련 함수들
async function saveToDatabase(data) {
    try {
        console.log('API 요청 시작:', data);
        
        const response = await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('API 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            throw new Error(`데이터 저장 실패: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        return result;
    } catch (error) {
        console.error('데이터베이스 저장 오류:', error);
        throw error;
    }
}

// 페이지 전환 함수
function showPage(pageName) {
    console.log('showPage 호출됨:', pageName);
    console.log('pages 객체:', pages);
    
    // 모든 페이지에서 active 클래스 제거
    Object.values(pages).forEach(page => {
        if (page) {
            page.classList.remove('active');
            console.log('active 클래스 제거됨:', page.id);
        }
    });
    
    // 선택된 페이지에 active 클래스 추가
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
        console.log('active 클래스 추가됨:', pages[pageName].id);
    } else {
        console.error('페이지를 찾을 수 없습니다:', pageName);
    }
}

// 타이머 시작
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

// 타이머 표시 업데이트
function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 시간이 10초 이하일 때 빨간색으로 변경
    if (currentTime <= 10) {
        timerDisplay.style.color = '#e74c3c';
        timerDisplay.style.animation = 'pulse 1s infinite';
    } else {
        timerDisplay.style.color = '#e74c3c';
        timerDisplay.style.animation = 'none';
    }
}

// 게임 종료
function endGame() {
    console.log('endGame 함수 호출됨');
    
    // 타이머 정지
    if (timerInterval) {
        clearInterval(timerInterval);
        console.log('타이머 정지됨');
    }
    
    // 결과 입력 필드 초기화
    const finalScoreInput = document.getElementById('finalScore');
    if (finalScoreInput) {
        finalScoreInput.value = '';
    }
    
    // 결과 페이지로 이동
    console.log('결과 페이지로 이동 시도');
    showPage('result');
    
    // 디버깅용 확인
    setTimeout(() => {
        const resultPage = document.getElementById('resultPage');
        const gamePage = document.getElementById('gamePage');
        console.log('게임 페이지 활성 상태:', gamePage?.classList.contains('active'));
        console.log('결과 페이지 활성 상태:', resultPage?.classList.contains('active'));
    }, 100);
}

// (전역 함수 등록은 파일 끝에서 함)

// 입력값 검증 함수들
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

// 결과 저장 함수
async function saveResult(event) {
    event.preventDefault();
    
    console.log('saveResult 함수 호출됨');
    
    const finalScore = parseInt(document.getElementById('finalScore').value);
    console.log('입력된 점수:', finalScore);
    console.log('현재 학생 정보:', currentStudent);
    
    // 입력값 검증
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
    
    // 데이터베이스에 저장
    const gameData = {
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        score: finalScore,
        timestamp: new Date().toISOString()
    };
    
    console.log('저장할 데이터:', gameData);
    
    try {
        console.log('데이터베이스 저장 시도...');
        const result = await saveToDatabase(gameData);
        console.log('저장 결과:', result);
        
        if (result && result.success) {
            console.log('저장 성공!');
            // 완료 페이지에 정보 표시
            document.getElementById('completedStudentId').textContent = currentStudent.studentId;
            document.getElementById('completedStudentName').textContent = currentStudent.studentName;
            document.getElementById('completedScore').textContent = finalScore;
            
            showPage('complete');
            
            // 폼 초기화
            startForm.reset();
            resultForm.reset();
        } else {
            console.error('저장 실패:', result);
            alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('결과 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

window.saveResult = saveResult;

// 이벤트 리스너들
startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    
    // 입력값 검증
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
    
    console.log('결과 폼 제출 시작');
    
    const finalScore = parseInt(document.getElementById('finalScore').value);
    console.log('입력된 점수:', finalScore);
    console.log('현재 학생 정보:', currentStudent);
    
    if (isNaN(finalScore) || finalScore < 0) {
        alert('올바른 점수를 입력해주세요.');
        return;
    }
    
    if (!currentStudent.studentId || !currentStudent.studentName) {
        alert('학생 정보가 없습니다. 다시 게임을 시작해주세요.');
        return;
    }
    
    // 데이터베이스에 저장
    const gameData = {
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        score: finalScore,
        timestamp: new Date().toISOString()
    };
    
    console.log('저장할 데이터:', gameData);
    
    try {
        console.log('데이터베이스 저장 시도...');
        const result = await saveToDatabase(gameData);
        console.log('저장 결과:', result);
        
        if (result && result.success) {
            console.log('저장 성공!');
            // 완료 페이지에 정보 표시
            document.getElementById('completedStudentId').textContent = currentStudent.studentId;
            document.getElementById('completedStudentName').textContent = currentStudent.studentName;
            document.getElementById('completedScore').textContent = finalScore;
            
            showPage('complete');
            
            // 폼 초기화
            startForm.reset();
            resultForm.reset();
        } else {
            console.error('저장 실패:', result);
            alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('저장 오류:', error);
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
    console.log('게임 종료 버튼 이벤트 리스너 추가');
    endGameBtn.addEventListener('click', () => {
        console.log('게임 종료 버튼 클릭됨');
        if (confirm('정말로 게임을 종료하시겠습니까?')) {
            console.log('게임 종료 확인됨');
            endGame();
        }
    });
} else {
    console.error('게임 종료 버튼을 찾을 수 없습니다!');
}

// 키보드 단축키 지원
document.addEventListener('keydown', (e) => {
    // ESC 키로 메인 페이지로 돌아가기
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

// CSS 애니메이션 추가
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

// 완료 페이지 스타일 추가
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

// 전역 함수들 등록 (HTML onclick에서 사용할 수 있도록)
window.endGame = endGame;
window.saveResult = saveResult;