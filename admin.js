// 페이지 요소들
const pages = {
    login: document.getElementById('loginPage'),
    admin: document.getElementById('adminPage'),
    data: document.getElementById('dataPage'),
    edit: document.getElementById('editPage')
};

// 로그인 상태 확인
let isLoggedIn = false;
let sessionToken = null;

// DOM 요소들
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const startGameBtn = document.getElementById('startGameBtn');
const publicScoreboardBtn = document.getElementById('publicScoreboardBtn');
const manageDataBtn = document.getElementById('manageDataBtn');
const backToAdminBtn = document.getElementById('backToAdmin');
const editDataBtn = document.getElementById('editDataBtn');

// 편집 페이지 요소들
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const addNewBtn = document.getElementById('addNewBtn');
const editGamesList = document.getElementById('editGamesList');
const saveAllBtn = document.getElementById('saveAllBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// 모달 요소들
const editModal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const editForm = document.getElementById('editForm');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
const closeModal = document.querySelector('.close');

// 통계 요소들
const totalPlayersEl = document.getElementById('totalPlayers');
const highestScoreEl = document.getElementById('highestScore');
const averageScoreEl = document.getElementById('averageScore');
const recentGamesEl = document.getElementById('recentGames');

// 편집 관련 전역 변수
let currentEditData = [];
let currentEditItem = null;

// 로그인 관련 함수들
function showPage(pageName) {
    // 모든 페이지 숨기기
    Object.values(pages).forEach(page => {
        if (page) page.classList.remove('active');
    });
    
    // 선택된 페이지 보이기
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    }
}

function checkLoginStatus() {
    // 세션 스토리지에서 로그인 상태 확인
    const loginStatus = sessionStorage.getItem('adminLoggedIn');
    const storedToken = sessionStorage.getItem('sessionToken');
    
    console.log('checkLoginStatus:', { loginStatus, storedToken });
    
    if (loginStatus === 'true' && storedToken) {
        isLoggedIn = true;
        sessionToken = storedToken;
        console.log('로그인 상태 확인됨, sessionToken:', sessionToken);
        showPage('admin');
        loadAdminData();
    } else {
        isLoggedIn = false;
        sessionToken = null;
        console.log('로그인 상태 없음, 로그인 페이지로 이동');
        showPage('login');
    }
}

async function login(password) {
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLoggedIn = true;
            sessionToken = result.sessionToken;
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('sessionToken', sessionToken);
            showPage('admin');
            await loadAdminData();
            loginError.style.display = 'none';
            adminPasswordInput.value = '';
        } else {
            loginError.style.display = 'block';
            adminPasswordInput.value = '';
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        loginError.style.display = 'block';
        adminPasswordInput.value = '';
    }
}

async function logout() {
    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ sessionToken: sessionToken })
        });
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
    
    isLoggedIn = false;
    sessionToken = null;
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('sessionToken');
    showPage('login');
    adminPasswordInput.value = '';
    loginError.style.display = 'none';
}

// 데이터 편집 관련 함수들
function openEditModal(gameId = null) {
    console.log('openEditModal 호출됨:', gameId);
    
    if (gameId) {
        // 기존 데이터 편집
        const game = currentEditData.find(g => g.id === gameId);
        if (game) {
            currentEditItem = game;
            modalTitle.textContent = '게임 기록 편집';
            
            // 폼에 기존 데이터 채우기
            document.getElementById('editStudentId').value = game.studentId || '';
            document.getElementById('editStudentName').value = game.studentName || '';
            document.getElementById('editScore').value = game.score || '';
            document.getElementById('editTimestamp').value = game.timestamp || '';
        }
    } else {
        // 새 데이터 추가
        currentEditItem = null;
        modalTitle.textContent = '새 게임 기록 추가';
        
        // 폼 초기화
        document.getElementById('editStudentId').value = '';
        document.getElementById('editStudentName').value = '';
        document.getElementById('editScore').value = '';
        document.getElementById('editTimestamp').value = new Date().toISOString();
    }
    
    editModal.style.display = 'block';
}

function closeEditModal() {
    console.log('closeEditModal 호출됨');
    editModal.style.display = 'none';
    currentEditItem = null;
}

async function saveEditRecord() {
    console.log('saveEditRecord 호출됨');
    
    try {
        const studentId = document.getElementById('editStudentId').value.trim();
        const studentName = document.getElementById('editStudentName').value.trim();
        const score = parseInt(document.getElementById('editScore').value);
        const timestamp = document.getElementById('editTimestamp').value;
        
        // 입력값 검증
        if (!studentId || !studentName || isNaN(score) || !timestamp) {
            alert('모든 필드를 입력해주세요.');
            return;
        }
        
        if (score < 0 || score > 999) {
            alert('점수는 0-999 사이의 값이어야 합니다.');
            return;
        }
        
        const gameData = {
            studentId,
            studentName,
            score,
            timestamp
        };
        
        if (currentEditItem) {
            // 기존 데이터 업데이트
            console.log('기존 데이터 업데이트:', currentEditItem.id);
            const result = await updateScore(currentEditItem.id, gameData);
            if (result.success) {
                alert('게임 기록이 수정되었습니다.');
                closeEditModal();
                loadEditData(); // 데이터 새로고침
            } else {
                alert('수정에 실패했습니다.');
            }
        } else {
            // 새 데이터 추가
            console.log('새 데이터 추가');
            const result = await saveToDatabase(gameData);
            if (result.success) {
                alert('새 게임 기록이 추가되었습니다.');
                closeEditModal();
                loadEditData(); // 데이터 새로고침
            } else {
                alert('추가에 실패했습니다.');
            }
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

async function deleteGameRecord(gameId) {
    console.log('deleteGameRecord 호출됨:', gameId);
    console.log('sessionToken 상태:', sessionToken);
    
    if (!gameId) {
        console.error('gameId가 없습니다:', gameId);
        alert('삭제할 게임 ID가 없습니다.');
        return;
    }
    
    if (!confirm('정말로 이 게임 기록을 삭제하시겠습니까?')) {
        console.log('삭제 취소됨');
        return;
    }
    
    try {
        console.log('deleteScore 함수 호출 시작');
        const result = await deleteScore(gameId);
        console.log('deleteScore 결과:', result);
        
        if (result && result.success) {
            console.log('삭제 성공');
            alert('게임 기록이 삭제되었습니다.');
            await loadEditData(); // 데이터 새로고침
        } else {
            console.error('삭제 실패 - 서버 응답:', result);
            alert('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

function searchGames(searchTerm) {
    console.log('searchGames 호출됨:', searchTerm);
    
    if (!searchTerm) {
        displayEditData(currentEditData);
        return;
    }
    
    const filtered = currentEditData.filter(game => 
        game.studentId.includes(searchTerm) ||
        game.studentName.includes(searchTerm) ||
        game.score.toString().includes(searchTerm)
    );
    
    displayEditData(filtered);
}

async function loadEditData() {
    console.log('loadEditData 호출됨');
    
    try {
        currentEditData = await getScoreboard();
        displayEditData(currentEditData);
    } catch (error) {
        console.error('편집 데이터 로드 오류:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

function displayEditData(data) {
    console.log('displayEditData 호출됨:', data.length, '개 항목');
    
    if (!editGamesList) {
        console.error('editGamesList 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (data.length === 0) {
        editGamesList.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }
    
    editGamesList.innerHTML = '';
    
    data.forEach(game => {
        const item = document.createElement('div');
        item.className = 'edit-game-item';
        item.innerHTML = `
            <div class="game-info">
                <span class="student-id">${game.studentId}</span>
                <span class="student-name">${game.studentName}</span>
                <span class="score">${game.score}</span>
                <span class="timestamp">${new Date(game.timestamp).toLocaleString()}</span>
            </div>
            <div class="game-actions">
                <button class="btn-edit" onclick="openEditModal('${game.id}')">편집</button>
                <button class="btn-delete" data-game-id="${game.id}">삭제</button>
            </div>
        `;
        editGamesList.appendChild(item);
        
        // 삭제 버튼에 이벤트 리스너 추가
        const deleteBtn = item.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const gameId = deleteBtn.getAttribute('data-game-id');
                console.log('삭제 버튼 클릭됨, gameId:', gameId);
                
                if (!confirm('정말로 이 게임 기록을 삭제하시겠습니까?')) {
                    return;
                }
                
                try {
                    // 직접 API 호출
                    const response = await fetch(`/api/delete-score/${gameId}`, {
                        method: 'DELETE',
                        headers: sessionToken ? {
                            'Authorization': `Bearer ${sessionToken}`
                        } : {}
                    });
                    
                    console.log('삭제 API 응답:', response.status);
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('삭제 성공:', result);
                        alert('게임 기록이 삭제되었습니다.');
                        
                        // 즉시 해당 요소 제거
                        item.remove();
                        
                        // 데이터 새로고침
                        await loadEditData();
                    } else {
                        console.error('삭제 실패:', response.status);
                        alert('삭제에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('삭제 오류:', error);
                    alert('삭제 중 오류가 발생했습니다: ' + error.message);
                }
            });
        }
    });
}

// 관리자 데이터 로드 함수
async function loadAdminData() {
    console.log('loadAdminData 호출됨');
    try {
        await updateStats();
        await updateRecentGames();
    } catch (error) {
        console.error('관리자 데이터 로드 오류:', error);
    }
}

// 통계 업데이트 함수
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error('통계 로드 실패');
        }
        const stats = await response.json();
        
        if (totalPlayersEl) totalPlayersEl.textContent = stats.totalPlayers || 0;
        if (highestScoreEl) highestScoreEl.textContent = stats.highestScore || 0;
        if (averageScoreEl) averageScoreEl.textContent = stats.averageScore || 0;
        
        console.log('통계 업데이트 완료:', stats);
    } catch (error) {
        console.error('통계 업데이트 오류:', error);
    }
}

// 최근 게임 기록 업데이트 함수
async function updateRecentGames() {
    try {
        const scoreboard = await getScoreboard();
        
        if (recentGamesEl) {
            if (scoreboard.length === 0) {
                recentGamesEl.innerHTML = '<div class="no-data">최근 게임 기록이 없습니다.</div>';
            } else {
                const recentGames = scoreboard.slice(0, 5); // 최근 5개만
                recentGamesEl.innerHTML = '';
                
                recentGames.forEach(game => {
                    const item = document.createElement('div');
                    item.className = 'recent-game-item';
                    item.innerHTML = `
                        <span>${game.studentId} ${game.studentName}</span>
                        <span>${game.score}점</span>
                        <span>${new Date(game.timestamp).toLocaleDateString()}</span>
                    `;
                    recentGamesEl.appendChild(item);
                });
            }
        }
        
        console.log('최근 게임 기록 업데이트 완료');
    } catch (error) {
        console.error('최근 게임 기록 업데이트 오류:', error);
    }
}

// 데이터베이스 관련 함수들
async function getScoreboard() {
    try {
        console.log('getScoreboard 호출됨, sessionToken:', sessionToken);
        
        // 세션 토큰이 있으면 관리자 API 사용, 없으면 공개 API 사용
        const url = sessionToken ? '/api/admin/scoreboard' : '/api/scoreboard';
        const headers = sessionToken ? {
            'Authorization': `Bearer ${sessionToken}`
        } : {};
        
        console.log('API 요청:', url, headers);
        
        const response = await fetch(url, { headers });
        console.log('API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`스코어보드 로드 실패: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('스코어보드 로드 오류:', error);
        throw error;
    }
}

// 개별 데이터 업데이트
async function updateScore(scoreId, data) {
    try {
        console.log('updateScore 호출됨:', scoreId, data);
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const response = await fetch(`/api/update-score/${scoreId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        console.log('업데이트 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`업데이트 실패: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('업데이트 오류:', error);
        throw error;
    }
}

// 개별 데이터 삭제
async function deleteScore(scoreId) {
    try {
        console.log('deleteScore 호출됨:', scoreId);
        
        const headers = {};
        
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const response = await fetch(`/api/delete-score/${scoreId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        console.log('삭제 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`삭제 실패: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('삭제 오류:', error);
        throw error;
    }
}

// 개별 데이터 업데이트
async function updateScore(scoreId, data) {
    try {
        const response = await fetch(`/api/update-score/${scoreId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('데이터 업데이트 실패');
        }
        
        return await response.json();
    } catch (error) {
        console.error('데이터 업데이트 오류:', error);
        throw error;
    }
}

// 개별 데이터 삭제
async function deleteScore(scoreId) {
    try {
        const response = await fetch(`/api/delete-score/${scoreId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('데이터 삭제 실패');
        }
        
        return await response.json();
    } catch (error) {
        console.error('데이터 삭제 오류:', error);
        throw error;
    }
}

// 새 데이터 저장
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
            throw new Error('데이터 저장 실패');
        }
        
        return await response.json();
    } catch (error) {
        console.error('데이터베이스 저장 오류:', error);
        throw error;
    }
}

// 페이지 전환 함수
function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageName].classList.add('active');
}

// 통계 업데이트
async function updateStats() {
    try {
        const scoreboard = await getScoreboard();
        
        const totalPlayers = scoreboard.length;
        const highestScore = totalPlayers > 0 ? Math.max(...scoreboard.map(s => s.score)) : 0;
        const averageScore = totalPlayers > 0 ? 
            Math.round(scoreboard.reduce((sum, s) => sum + s.score, 0) / totalPlayers) : 0;
        
        totalPlayersEl.textContent = totalPlayers;
        highestScoreEl.textContent = highestScore;
        averageScoreEl.textContent = averageScore;
        
        // 최근 게임 기록 업데이트
        updateRecentGames(scoreboard);
    } catch (error) {
        console.error('통계 업데이트 오류:', error);
    }
}

// 최근 게임 기록 업데이트
function updateRecentGames(scoreboard) {
    const recentGames = scoreboard
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    if (recentGames.length === 0) {
        recentGamesEl.innerHTML = '<div class="no-data">아직 게임 기록이 없습니다.</div>';
        return;
    }
    
    recentGamesEl.innerHTML = recentGames.map(game => `
        <div class="recent-game-item">
            <div class="game-info">
                <span class="student-info">${game.studentId} ${game.studentName}</span>
                <span class="game-score">${game.score}개</span>
            </div>
            <div class="game-time">${new Date(game.timestamp).toLocaleString('ko-KR')}</div>
        </div>
    `).join('');
}

// 편집 페이지 데이터 로드
async function loadEditData() {
    try {
        console.log('편집 데이터 로드 시작...');
        currentEditData = await getScoreboard();
        console.log('로드된 데이터:', currentEditData);
        displayEditData(currentEditData);
    } catch (error) {
        console.error('편집 데이터 로드 오류:', error);
        editGamesList.innerHTML = '<div class="no-data">데이터를 불러올 수 없습니다.</div>';
    }
}

// 편집 데이터 표시
function displayEditData(data) {
    if (data.length === 0) {
        editGamesList.innerHTML = '<div class="no-data">편집할 데이터가 없습니다.</div>';
        return;
    }
    
    editGamesList.innerHTML = data.map(game => `
        <div class="edit-game-item" data-id="${game.id}">
            <div class="edit-game-info">
                <div class="edit-student-info">
                    <span class="edit-student-id">${game.studentId}</span>
                    <span class="edit-student-name">${game.studentName}</span>
                </div>
                <div class="edit-game-details">
                    <span class="edit-score">${game.score}개</span>
                    <span class="edit-time">${new Date(game.timestamp).toLocaleString('ko-KR')}</span>
                </div>
            </div>
            <div class="edit-actions">
                <button class="btn-edit" data-game-id="${game.id}">편집</button>
                <button class="btn-delete" data-game-id="${game.id}">삭제</button>
            </div>
        </div>
    `).join('');
    
    // 이벤트 리스너 추가
    editGamesList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gameId = e.target.getAttribute('data-game-id');
            openEditModal(gameId);
        });
    });
    
    editGamesList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gameId = e.target.getAttribute('data-game-id');
            deleteGameRecord(gameId);
        });
    });
}

// 검색 기능
function searchGames(query) {
    if (!query.trim()) {
        displayEditData(currentEditData);
        return;
    }
    
    const filtered = currentEditData.filter(game => 
        game.studentId.toLowerCase().includes(query.toLowerCase()) ||
        game.studentName.toLowerCase().includes(query.toLowerCase())
    );
    
    displayEditData(filtered);
}

// 편집 모달 열기
function openEditModal(gameId, isNew = false) {
    console.log('모달 열기:', { gameId, isNew });
    
    if (isNew) {
        currentEditItem = null;
        modalTitle.textContent = '새 기록 추가';
        editForm.reset();
        document.getElementById('editTimestamp').value = new Date().toISOString().slice(0, 16);
    } else {
        const game = currentEditData.find(g => g.id === gameId);
        console.log('찾은 게임:', game);
        if (!game) {
            console.error('게임을 찾을 수 없습니다:', gameId);
            return;
        }
        
        currentEditItem = game;
        modalTitle.textContent = '기록 편집';
        document.getElementById('editStudentId').value = game.studentId;
        document.getElementById('editStudentName').value = game.studentName;
        document.getElementById('editScore').value = game.score;
        document.getElementById('editTimestamp').value = new Date(game.timestamp).toISOString().slice(0, 16);
    }
    
    editModal.style.display = 'block';
}

// 편집 모달 닫기
function closeEditModal() {
    editModal.style.display = 'none';
    currentEditItem = null;
    editForm.reset();
}

// 게임 기록 삭제
async function deleteGameRecord(gameId) {
    console.log('삭제 요청:', gameId);
    
    if (!confirm('정말로 이 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        console.log('삭제 API 호출 중...');
        const result = await deleteScore(gameId);
        console.log('삭제 결과:', result);
        
        if (result.success) {
            alert('기록이 삭제되었습니다.');
            loadEditData();
            updateStats();
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}


// 이벤트 리스너들
startGameBtn.addEventListener('click', () => {
    window.open('game.html', '_blank');
});

publicScoreboardBtn.addEventListener('click', () => {
    window.open('scoreboard.html', '_blank');
});

manageDataBtn.addEventListener('click', () => {
    showPage('data');
});

backToAdminBtn.addEventListener('click', () => {
    showPage('admin');
});

editDataBtn.addEventListener('click', () => {
    showPage('edit');
    loadEditData();
});

// 편집 페이지 이벤트 리스너들
searchBtn.addEventListener('click', () => {
    searchGames(searchInput.value);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchGames(searchInput.value);
    }
});

addNewBtn.addEventListener('click', () => {
    openEditModal(null, true);
});

cancelEditBtn.addEventListener('click', () => {
    showPage('data');
});

// 모달 이벤트 리스너들
saveEditBtn.addEventListener('click', async () => {
    console.log('저장 버튼 클릭');
    
    const formData = {
        studentId: document.getElementById('editStudentId').value.trim(),
        studentName: document.getElementById('editStudentName').value.trim(),
        score: parseInt(document.getElementById('editScore').value),
        timestamp: new Date(document.getElementById('editTimestamp').value).toISOString()
    };
    
    console.log('폼 데이터:', formData);
    console.log('현재 편집 아이템:', currentEditItem);
    
    if (!formData.studentId || !formData.studentName || isNaN(formData.score)) {
        alert('모든 필드를 올바르게 입력해주세요.');
        return;
    }
    
    try {
        let result;
        if (currentEditItem) {
            // 기존 기록 수정
            console.log('기존 기록 수정 중...');
            result = await updateScore(currentEditItem.id, formData);
        } else {
            // 새 기록 추가 - ID 생성
            console.log('새 기록 추가 중...');
            const newData = {
                ...formData,
                id: Date.now().toString()
            };
            result = await saveToDatabase(newData);
        }
        
        console.log('저장 결과:', result);
        
        if (result.success) {
            alert(currentEditItem ? '기록이 수정되었습니다.' : '새 기록이 추가되었습니다.');
            closeEditModal();
            loadEditData();
            updateStats();
        } else {
            alert('저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
});

cancelEditModalBtn.addEventListener('click', closeEditModal);
closeModal.addEventListener('click', closeEditModal);

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    
    // 5초마다 통계 업데이트
    setInterval(updateStats, 5000);
});

// 관리자 페이지 스타일 추가
const adminStyle = document.createElement('style');
adminStyle.textContent = `
    .admin-container, .data-container {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .admin-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }
    
    .data-actions {
        display: flex;
        gap: 20px;
        justify-content: center;
        margin-top: 30px;
    }
    
    .admin-stats {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 30px;
        backdrop-filter: blur(10px);
    }
    
    .admin-stats h4 {
        color: #ffffff;
        margin-bottom: 20px;
        text-align: center;
        font-size: 1.3rem;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
    }
    
    .stat-item {
        text-align: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stat-label {
        display: block;
        color: #888;
        font-size: 0.9rem;
        margin-bottom: 8px;
    }
    
    .stat-value {
        display: block;
        color: #ffffff;
        font-size: 2rem;
        font-weight: 700;
    }
    
    .data-list {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 30px;
        margin: 30px 0;
        backdrop-filter: blur(10px);
    }
    
    .data-list h4 {
        color: #ffffff;
        margin-bottom: 20px;
        font-size: 1.3rem;
    }
    
    .recent-games {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .recent-game-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: background-color 0.3s ease;
    }
    
    .recent-game-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .recent-game-item:last-child {
        border-bottom: none;
    }
    
    .game-info {
        display: flex;
        gap: 20px;
        align-items: center;
    }
    
    .student-info {
        color: #ffffff;
        font-weight: 500;
    }
    
    .game-score {
        color: #00ff88;
        font-weight: 700;
    }
    
    .game-time {
        color: #888;
        font-size: 0.9rem;
    }
    
    .no-data {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 40px;
    }
    
    .btn-danger {
        background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
        color: #ffffff;
    }
    
    .btn-danger:hover {
        background: linear-gradient(135deg, #ff4757 0%, #ff2f3a 100%);
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(255, 71, 87, 0.3);
    }
    
    .edit-container {
        max-width: 1000px;
        margin: 0 auto;
    }
    
    .edit-controls {
        display: flex;
        gap: 20px;
        margin-bottom: 30px;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .search-box {
        display: flex;
        gap: 10px;
        flex: 1;
        min-width: 300px;
    }
    
    .search-box input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        font-size: 14px;
    }
    
    .search-box input::placeholder {
        color: #666;
    }
    
    .search-box button {
        padding: 12px 20px;
        white-space: nowrap;
    }
    
    .edit-list {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        margin: 20px 0;
        backdrop-filter: blur(10px);
    }
    
    .edit-games-list {
        max-height: 500px;
        overflow-y: auto;
    }
    
    .edit-game-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: background-color 0.3s ease;
    }
    
    .edit-game-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .edit-game-item:last-child {
        border-bottom: none;
    }
    
    .edit-game-info {
        display: flex;
        gap: 30px;
        align-items: center;
        flex: 1;
    }
    
    .edit-student-info {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .edit-student-id {
        color: #00ff88;
        font-weight: 600;
        min-width: 80px;
    }
    
    .edit-student-name {
        color: #ffffff;
        font-weight: 500;
        min-width: 100px;
    }
    
    .edit-game-details {
        display: flex;
        gap: 20px;
        align-items: center;
    }
    
    .edit-score {
        color: #ffd700;
        font-weight: 700;
        min-width: 60px;
    }
    
    .edit-time {
        color: #888;
        font-size: 0.9rem;
        min-width: 150px;
    }
    
    .edit-actions {
        display: flex;
        gap: 10px;
    }
    
    .btn-edit, .btn-delete {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-edit {
        background: rgba(0, 255, 136, 0.2);
        color: #00ff88;
        border: 1px solid rgba(0, 255, 136, 0.3);
    }
    
    .btn-edit:hover {
        background: rgba(0, 255, 136, 0.3);
        transform: translateY(-2px);
    }
    
    .btn-delete {
        background: rgba(255, 71, 87, 0.2);
        color: #ff4757;
        border: 1px solid rgba(255, 71, 87, 0.3);
    }
    
    .btn-delete:hover {
        background: rgba(255, 71, 87, 0.3);
        transform: translateY(-2px);
    }
    
    .edit-actions {
        display: flex;
        gap: 20px;
        margin-top: 30px;
        justify-content: center;
    }
    
    /* 모달 스타일 */
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
    }
    
    .modal-content {
        background: rgba(10, 10, 10, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        margin: 5% auto;
        padding: 0;
        width: 90%;
        max-width: 500px;
        backdrop-filter: blur(20px);
        animation: modalSlideIn 0.3s ease-out;
    }
    
    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-header h3 {
        color: #ffffff;
        margin: 0;
        font-size: 1.3rem;
    }
    
    .close {
        color: #888;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.3s ease;
    }
    
    .close:hover {
        color: #ffffff;
    }
    
    .modal-body {
        padding: 30px;
    }
    
    .modal-footer {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
        padding: 20px 30px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-footer .btn {
        margin: 0;
        padding: 12px 24px;
        min-width: 100px;
    }
    
    @media (max-width: 768px) {
        .admin-actions {
            grid-template-columns: 1fr;
        }
        
        .data-actions {
            flex-direction: column;
            align-items: center;
        }
        
        .stats-grid {
            grid-template-columns: 1fr;
        }
        
        .recent-game-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
        }
        
        .game-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }
        
        .edit-controls {
            flex-direction: column;
            align-items: stretch;
        }
        
        .search-box {
            min-width: auto;
        }
        
        .edit-game-item {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
        }
        
        .edit-game-info {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }
        
        .edit-student-info, .edit-game-details {
            justify-content: space-between;
        }
        
        .edit-actions {
            justify-content: stretch;
        }
        
        .btn-edit, .btn-delete {
            flex: 1;
        }
        
        .modal-content {
            width: 95%;
            margin: 10% auto;
        }
        
        .modal-header, .modal-body, .modal-footer {
            padding: 20px;
        }
    }
`;
document.head.appendChild(adminStyle);

// 이벤트 리스너들
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 폼 이벤트 리스너
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = adminPasswordInput.value;
            await login(password);
        });
    }
    
    // 로그아웃 버튼 이벤트 리스너
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 관리자 페이지 버튼들
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            window.open('game.html', '_blank');
        });
    }
    
    if (publicScoreboardBtn) {
        publicScoreboardBtn.addEventListener('click', () => {
            window.open('scoreboard.html', '_blank');
        });
    }
    
    if (manageDataBtn) {
        manageDataBtn.addEventListener('click', () => {
            showPage('data');
        });
    }
    
    if (backToAdminBtn) {
        backToAdminBtn.addEventListener('click', () => {
            showPage('admin');
        });
    }
    
    if (editDataBtn) {
        editDataBtn.addEventListener('click', () => {
            showPage('edit');
            loadEditData();
        });
    }
    
    // 편집 페이지 이벤트 리스너들
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            searchGames(searchTerm);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                searchGames(searchTerm);
            }
        });
    }
    
    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => {
            openEditModal();
        });
    }
    
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            saveEditRecord();
        });
    }
    
    if (cancelEditModalBtn) {
        cancelEditModalBtn.addEventListener('click', () => {
            closeEditModal();
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            closeEditModal();
        });
    }
    
    // 모달 외부 클릭 시 닫기
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }
    
    // 초기 로그인 상태 확인
    checkLoginStatus();
});

// 전역 함수들 등록 (HTML에서 onclick으로 호출할 수 있도록)
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditRecord = saveEditRecord;
window.deleteGameRecord = deleteGameRecord;
window.searchGames = searchGames;
