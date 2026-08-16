// ==========================================
// 1. Firebase 초기화 및 설정
// ==========================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase 앱 및 DB 초기화
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// FCM 객체 생성 (지원 여부 확인)
let messaging = null;
if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
} else {
    console.warn("이 브라우저는 FCM 푸시 알림을 지원하지 않습니다.");
}

// Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징 > 웹 푸시 인증서(VAPID Key)
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

// 글로벌 상태 변수
let currentUser = null;
let currentRole = null; // 'admin', 'teacher', 'security'
let currentClass = null;

// ==========================================
// 2. 푸시 알림 (FCM) 토큰 및 수신 처리
// ==========================================

// 알림 권한 요청 및 FCM 토큰 획득/저장
async function setupPushNotifications(userId, userRole) {
    if (!messaging) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('알림 권한이 허용되었습니다.');

            // 루트 경로의 서비스 워커 등록
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            // FCM 토큰 가져오기
            const currentToken = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (currentToken) {
                console.log('발급된 FCM Token:', currentToken);
                // DB의 사용자 정보 아래에 fcmToken 저장
                await database.ref(`users/${userRole}s/${userId}/fcmToken`).set(currentToken);
            } else {
                console.warn('토큰을 생성할 수 없습니다.');
            }
        } else {
            console.warn('알림 권한이 거부되었습니다.');
        }
    } catch (error) {
        console.error('푸시 알림 설정 중 오류:', error);
    }
}

// 포그라운드(앱 열림 상태) 메시지 수신 핸들러
if (messaging) {
    messaging.onMessage((payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        const { title, body } = payload.notification || {};
        
        // 실행 중일 때도 브라우저 알림 노출
        if (Notification.permission === 'granted' && title) {
            new Notification(title, {
                body: body,
                icon: '/icon.png'
            });
        }
    });
}

// ==========================================
// 3. 시간 처리 유틸리티 (베트남 UTC+7 기준)
// ==========================================

function getVietnamISOString() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (7 * 3600000));
    return vietnamTime.toISOString();
}

function formatVietnamTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ==========================================
// 4. 인증 및 로그인
// ==========================================

function login(username, password, role) {
    database.ref(`users/${role}s/${username}`).once('value', async (snapshot) => {
        const userData = snapshot.val();
        
        if (userData && userData.password === password) {
            currentUser = username;
            currentRole = role;
            if (role === 'teacher') {
                currentClass = userData.classAssigned || null;
            }

            alert(`${userData.name || username}님 환영합니다!`);
            
            // 로그인 성공 시 FCM 토큰 등록
            await setupPushNotifications(username, role);
            
            // UI 화면 전환
            showDashboard(role);
        } else {
            alert('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    }, (error) => {
        console.error('로그인 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
    });
}

function logout() {
    currentUser = null;
    currentRole = null;
    currentClass = null;
    alert('로그아웃 되었습니다.');
    // 로그인 페이지 UI로 전환 로직
    showLoginPage();
}

// ==========================================
// 5. 학생 조회 및 관리
// ==========================================

// 학급별 학생 목록 조회
function loadStudentsByClass(className) {
    const classRef = database.ref(`classes/${className}`);
    classRef.on('value', (snapshot) => {
        const students = snapshot.val() || {};
        renderStudentTable(students);
    });
}

// 학생 검색
function searchStudents(studentClass, nameQuery) {
    const classRef = database.ref(`classes/${studentClass}`);
    
    classRef.once('value', (snapshot) => {
        const students = snapshot.val();
        if (!students) {
            renderStudentTable({});
            return;
        }

        const filtered = {};
        Object.keys(students).forEach(id => {
            const student = students[id];
            if (!nameQuery || (student.name && student.name.includes(nameQuery))) {
                filtered[id] = student;
            }
        });

        renderStudentTable(filtered);
    });
}

// ==========================================
// 6. 패스(Pass) 발급 및 출입 기록
// ==========================================

// 담임교사: 외출/조퇴 패스 발급
function issuePass(studentId, className, passType, reason) {
    const passId = database.ref('passes').push().key;
    const timestamp = getVietnamISOString();

    const passData = {
        passId: passId,
        studentId: studentId,
        className: className,
        passType: passType, // 'OUT', 'EARLY_LEAVE'
        reason: reason,
        issuedBy: currentUser,
        status: 'ISSUED', // 'ISSUED', 'USED', 'EXPIRED'
        createdAt: timestamp
    };

    const updates = {};
    updates[`/passes/${passId}`] = passData;
    updates[`/classes/${className}/${studentId}/activePass`] = passId;

    database.ref().update(updates).then(() => {
        alert('패스가 정상적으로 발급되었습니다.');
    }).catch((error) => {
        console.error('패스 발급 실패:', error);
    });
}

// 경비원: 출입 기록 처리 (IN / OUT)
function recordAccessLog(studentId, passId, actionType) {
    const logId = database.ref('accessLogs').push().key;
    const timestamp = getVietnamISOString();

    const logData = {
        logId: logId,
        studentId: studentId,
        passId: passId || null,
        actionType: actionType, // 'IN', 'OUT'
        recordedBy: currentUser,
        timestamp: timestamp
    };

    const updates = {};
    updates[`/accessLogs/${logId}`] = logData;
    
    // 사용한 패스가 있을 경우 상태 변경
    if (passId) {
        updates[`/passes/${passId}/status`] = 'USED';
        updates[`/passes/${passId}/usedAt`] = timestamp;
    }

    database.ref().update(updates).then(() => {
        alert('출입 기록이 저장되었습니다.');
    }).catch((error) => {
        console.error('기록 저장 실패:', error);
    });
}

// ==========================================
// 7. UI 바인딩 및 렌더링 (예시 함수)
// ==========================================

function renderStudentTable(students) {
    const container = document.getElementById('student-list');
    if (!container) return;

    let html = '';
    Object.keys(students).forEach(id => {
        const s = students[id];
        html += `
            <tr>
                <td>${s.studentNumber || id}</td>
                <td>${s.name}</td>
                <td>${s.status || '교실'}</td>
                <td>
                    <button onclick="issuePass('${id}', '${currentClass}', 'OUT', '기타')">패스 발급</button>
                </td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

function showDashboard(role) {
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.remove('hidden');

    if (role === 'teacher' && currentClass) {
        loadStudentsByClass(currentClass);
    }
}

function showLoginPage() {
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
}
