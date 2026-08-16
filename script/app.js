import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWVZERDb9xbfqCzG3bZvRIciCslbhGTD4",
  authDomain: "entry-4a14b.firebaseapp.com",
  databaseURL: "https://tfteamdata-default-rtdb.firebaseio.com/",
  projectId: "entry-4a14b",
  storageBucket: "entry-4a14b.firebasestorage.app",
  messagingSenderId: "262491101728",
  appId: "1:262491101728:web:c67d03020d7e753e07ba45",
  measurementId: "G-V45QGJ3D8E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==================== Chrome 푸시 알림 설정 ====================
let messaging;

async function setupPushNotification() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log("이 브라우저는 푸시 알림을 지원하지 않습니다.");
      return;
    }

    messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("알림 권한이 허용되지 않았습니다.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: "BJmlzsJ4LAJnis66gze-sYmtlT4J74ft-VnykoLCVxP3xwSMpC4cNyEmVY1Lxegni9LlQGfEqnlpLhNhWZL5xoA",
      serviceWorkerRegistration: registration
    });

    if (token) {
      const safeToken = token.replace(/[.#$\[\]]/g, ""); 
      await set(ref(db, `fcmTokens/${safeToken}`), {
        token: token,
        createdAt: new Date().toISOString()
      });
    }

    onMessage(messaging, (payload) => {
      if (payload.notification) {
        alert(`${payload.notification.title || "온라인 출입 시스템"}\n\n${payload.notification.body || ""}`);
      }
    });

  } catch (error) {
    console.error("푸시 알림 설정 오류:", error);
  }
}

setupPushNotification();

// ==================== 공통 및 인증 기능 ====================
let isLoggedIn = false;
let currentTeacherName = '';

function parseGradeClass(id) {
  if (!id) return null;
  const idStr = String(id);
  let grade, classNum;
  if (idStr.length === 5) {
    grade = idStr.slice(0, 2);
    classNum = idStr.slice(2, 3);
  } else {
    grade = idStr.slice(0, 1);
    classNum = idStr.slice(1, 2);
  }
  return { grade, classNum };
}

async function teacherLogin(email, password) {
  try {
    const teacherRef = ref(db, 'teacher');
    const snapshot = await get(teacherRef);
    
    if (snapshot.exists()) {
      const teachers = snapshot.val();
      for (const teacherName in teachers) {
        const teacher = teachers[teacherName];
        if (teacher.email === email && teacher.password === password) {
          currentTeacherName = teacherName;
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error("로그인 오류:", error);
    return false;
  }
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  const content = document.getElementById('content');
  if (!modal || !content) return;

  modal.style.display = 'flex';
  content.style.display = 'none';
  
  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('teacherEmail').value.trim();
    const password = document.getElementById('teacherPassword').value.trim();
    
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    
    const success = await teacherLogin(email, password);
    if (success) {
      isLoggedIn = true;
      modal.style.display = 'none';
      content.style.display = 'block';
      searchStudents();
    } else {
      alert('이메일 또는 비밀번호가 잘못되었습니다.');
    }
  });
}

// ==================== 학생 페이지 기능 ====================
function setupStudentPage() {
  async function uploadStudentData() {
    const reason = document.getElementById("studentReason")?.value?.trim();
    const teacher = document.getElementById("studentTeacher")?.value;

    const idElems = document.querySelectorAll('.multi-studentId');
    const nameElems = document.querySelectorAll('.multi-studentName');
    
    // 1. 개별 입력된 날짜 수집
    const dateElems = Array.from(document.querySelectorAll('.multi-studentDate'));
    let dateSet = new Set(dateElems.map(el => el.value.trim()).filter(Boolean));

    // 2. 만약 개별 날짜가 없고 기간(범위)이 설정되어 있다면 기간 자동 계산
    const rangeStart = document.getElementById('rangeStartDate')?.value?.trim();
    const rangeEnd = document.getElementById('rangeEndDate')?.value?.trim();

    if (dateSet.size === 0 && rangeStart && rangeEnd) {
      const startDate = new Date(rangeStart);
      const endDate = new Date(rangeEnd);
      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        let current = new Date(startDate);
        while (current <= endDate) {
          dateSet.add(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
      }
    }

    const dateValues = Array.from(dateSet);

    if (!reason || !teacher) {
      alert('사유와 담당 교사를 선택해주세요.');
      return;
    }

    if (dateValues.length === 0) {
      alert('사용하고자 하는 날짜를 입력해주세요.');
      return;
    }

    let successes = 0;
    const errors = [];

    try {
      if (idElems.length > 0 && nameElems.length > 0) {
        for (let i = 0; i < idElems.length; i++) {
          const sid = idElems[i].value.trim();
          const sname = (nameElems[i] && nameElems[i].value.trim()) || '';
          if (!sid || !sname) {
            errors.push(`학생 ${i + 1}: 학번 또는 이름 누락`);
            continue;
          }

          const gc = parseGradeClass(sid);
          if (!gc) {
            errors.push(`${sid}: 잘못된 학번 형식`);
            continue;
          }

          for (const sdate of dateValues) {
            const dbPath = `class/${gc.grade}-${gc.classNum}/${sid}/${sdate}`;
            const dbRef = ref(db, dbPath);
            const studentData = {
              name: sname,
              reason: reason,
              accept: false,
              enterTime: "없음",
              leaveTime: "없음",
              realEnter: false,
              teacher: teacher
            };
            await set(dbRef, studentData);
            successes++;
          }
        }
      } else {
        const studentId = document.getElementById("studentId")?.value?.trim();
        const studentName = document.getElementById("studentName")?.value?.trim();

        if (!studentId || !studentName) {
          alert('학번과 이름을 입력해주세요.');
          return;
        }

        const gc = parseGradeClass(studentId);
        if (!gc) {
          alert('잘못된 학번 형식입니다.');
          return;
        }

        for (const sdate of dateValues) {
          const dbPath = `class/${gc.grade}-${gc.classNum}/${studentId}/${sdate}`;
          const dbRef = ref(db, dbPath);
          const studentData = {
            name: studentName,
            reason: reason,
            accept: false,
            enterTime: "없음",
            leaveTime: "없음",
            realEnter: false,
            teacher: teacher
          };
          await set(dbRef, studentData);
          successes++;
        }
      }

      let msg = '';
      if (successes > 0) msg += `출입 요청이 완료되었습니다! (${successes}건)`;
      if (errors.length > 0) msg += `\n다음 항목은 처리되지 않았습니다:\n- ${errors.join('\n- ')}`;
      alert(msg);
      
      const requestForm = document.getElementById("requestForm");
      if (requestForm) requestForm.style.display = "none";
    } catch (error) {
      alert(`오류 발생: ${error.message}`);
    }
  }

  function displayStudentInfo() {
    const studentInfoElem = document.getElementById('studentInfo');
    const circleCheck = document.getElementById('circleCheck');
    if (!studentInfoElem || !circleCheck) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const date = params.get('date');

    if (id && date) {
      const gc = parseGradeClass(id);
      if (!gc) {
        studentInfoElem.innerHTML = "잘못된 학번 형식입니다.";
        return;
      }

      const dbRef = ref(db, `/class/${gc.grade}-${gc.classNum}/${id}/${date}`);
      get(dbRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const name = data.name || "(이름 정보 없음)";
          const reason = data.reason || "(사유 정보 없음)";
          const teacher = data.teacher || "(지도 교사 정보 없음)";

          const accept = typeof data.accept === 'boolean' 
            ? data.accept 
              ? "허가됨(Đã được chấp nhận)" 
              : "거부됨(Đã bị từ chối)"
            : data.accept || "승인 대기 중(Đang chờ phê duyệt)";

          const realEnter = typeof data.realEnter === 'boolean' 
            ? data.realEnter
              ? "사용함(Đã sử dụng)" 
              : "사용 안 함(Không sử dụng)" 
            : data.realEnter || "미확인(Chưa xác nhận)";

          if (data.accept === true && data.realEnter === false) {
            circleCheck.style.backgroundColor = "green";
          } else {
            circleCheck.style.backgroundColor = "#810707";
          }

          studentInfoElem.innerHTML = `
            학번(Mã số lớp): ${id}<br>
            이름(Họ tên): ${name}<br>
            날짜(Ngày hôm nay): ${date}<br>
            사유(Lý do): ${reason}<br>
            지도 교사(GV chủ nhiệm): ${teacher}<br>
            출입 여부(Ra vào): ${accept}<br>
            사용 여부(Đã sử dụng): ${realEnter}
          `;
        } else {
          studentInfoElem.innerHTML = "해당 날짜에 대한 데이터가 없습니다.(KHÔNG CÓ DỮ LIỆU CHO NGÀY NÀY.)";
        }
      }).catch((error) => {
        studentInfoElem.innerHTML = `데이터 조회 중 오류가 발생했습니다(ĐÃ XẢY RA LỖI KHI TRUY XUẤT DỮ LIỆU): ${error}`;
      });
    } else {
      studentInfoElem.innerHTML = "정보가 없습니다.(KHÔNG CÓ THÔNG TIN.)";
    }
  }

  document.getElementById("uploadStudentData")?.addEventListener("click", uploadStudentData);
  document.getElementById("requestPageBtn")?.addEventListener("click", () => {
    const requestForm = document.getElementById("requestForm");
    if (requestForm) requestForm.style.display = "block";
  });

  displayStudentInfo();
}

// ==================== 검색 및 데이터 표시 ====================
async function searchStudents() {
  const selectedGrade = document.getElementById('studentDefGrade')?.value;
  const selectedEnter = document.getElementById('studentDefEnter')?.value;
  const selectedRequest = document.getElementById('studentDefRequest')?.value;
  
  const startDate = document.getElementById('studentDefStartDate')?.value;
  const endDate = document.getElementById('studentDefEndDate')?.value;
  
  const listContainer = document.getElementById('listofStudents');

  if (!listContainer) return;

  try {
    const snapshot = await get(ref(db, 'class'));
    listContainer.innerHTML = '';

    if (!snapshot.exists()) {
      listContainer.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
      return;
    }

    const classes = snapshot.val();
    let foundCount = 0;

    for (const classKey in classes) {
      const grade = classKey.split('-')[0];
      if (selectedGrade && grade !== selectedGrade) continue;

      const students = classes[classKey];
      for (const studentId in students) {
        const dateEntries = students[studentId];
        
        for (const currentDate in dateEntries) {
          if (startDate && currentDate < startDate) continue;
          if (endDate && currentDate > endDate) continue;

          const studentData = dateEntries[currentDate];

          if (studentData.teacher !== currentTeacherName) continue;
          if (selectedEnter && String(studentData.accept) !== selectedEnter) continue;
          if (selectedRequest === 'used' && !studentData.realEnter) continue;
          if (selectedRequest === 'unused' && studentData.realEnter) continue;

          displayStudentItem(classKey, studentId, currentDate, studentData);
          foundCount++;
        }
      }
    }

    if (foundCount === 0) {
      listContainer.innerHTML = '<div class="no-data">검색 결과가 없습니다.</div>';
    }
  } catch (error) {
    console.error('검색 오류:', error);
    alert('학생 검색 중 오류가 발생했습니다.');
  }
}

function displayStudentItem(classKey, studentId, date, studentData) {
  const listContainer = document.getElementById('listofStudents');
  const studentDiv = document.createElement('div');
  studentDiv.className = 'student-item';
  studentDiv.dataset.class = classKey;
  studentDiv.dataset.id = studentId;
  studentDiv.dataset.date = date;

  studentDiv.innerHTML = `
    <div class="student-info">
      <input type="checkbox" id="chk-${studentId}-${date}" class="student-check">
      <label for="chk-${studentId}-${date}">
        <strong>[${date}] ${classKey} | ${studentId}</strong> - ${studentData.name || '이름 없음'}
      </label>
    </div>
    <div class="student-details">
      <span>사유: ${studentData.reason || '사유 없음'}</span>
      <span>출입 상태: ${getStatusText(studentData.accept, 'accept')}</span>
      <span>출입증 사용 여부: ${getStatusText(studentData.realEnter, 'realEnter')}</span>
      <span>담당 교사: ${studentData.teacher || '미지정'}</span>
      <span>출입: ${studentData.enterTime || '없음'}</span>
      <span>퇴실: ${studentData.leaveTime || '없음'}</span>
    </div>
  `;

  listContainer.appendChild(studentDiv);
}

function getStatusText(value, type) {
  if (value === undefined || value === null) return '정보 없음';
  
  if (type === 'accept') {
    return value ? '허가됨' : '거부됨';
  } else if (type === 'realEnter') {
    return value ? '사용 완료' : '사용 안함';
  }
  return String(value);
}

function toggleAllCheckboxes() {
  const isChecked = document.getElementById('selectAll')?.checked;
  document.querySelectorAll('.student-check').forEach(checkbox => {
    checkbox.checked = isChecked;
  });
}

async function updateStudentApprovals() {
  const selectedStudents = document.querySelectorAll('.student-check:checked');
  if (selectedStudents.length === 0) {
    alert('학생을 선택해주세요.');
    return;
  }

  try {
    const updates = {};
    selectedStudents.forEach(checkbox => {
      const studentItem = checkbox.closest('.student-item');
      const classKey = studentItem.dataset.class;
      const studentId = studentItem.dataset.id;
      const date = studentItem.dataset.date;
      
      updates[`class/${classKey}/${studentId}/${date}/accept`] = true;
    });

    await update(ref(db), updates);
    alert(`${selectedStudents.length}명의 학생 출입이 허가되었습니다.`);
    searchStudents();
  } catch (error) {
    console.error('업데이트 오류:', error);
    alert('학생 정보 업데이트 중 오류가 발생했습니다.');
  }
}

// ==================== 선생님 요청 실시간 알림 ====================
const notifiedRequests = new Set();

function setupTeacherRequestNotification() {
  if (!document.getElementById("listofStudents")) return;

  onValue(ref(db, "class"), (snapshot) => {
    if (!snapshot.exists()) return;
    const classes = snapshot.val();

    for (const classKey in classes) {
      const students = classes[classKey];
      for (const studentId in students) {
        const dates = students[studentId];
        for (const date in dates) {
          const data = dates[date];
          const requestKey = `${classKey}_${studentId}_${date}`;

          if (data && data.accept === false && data.teacher === currentTeacherName) {
            if (!notifiedRequests.has(requestKey)) {
              showRequestNotification(studentId, data.name || "학생", data.reason || "사유 없음");
              notifiedRequests.add(requestKey);
            }
          }
        }
      }
    }
  });
}

function showRequestNotification(studentId, studentName, reason) {
  if (!("Notification" in window)) {
    alert(`[새 출입 요청]\n학생: ${studentName}\n학번: ${studentId}\n사유: ${reason}`);
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("🔔 새로운 출입 요청", {
      body: `${studentName} (${studentId}) 학생의 요청이 있습니다.\n사유: ${reason}`,
      icon: "/image/favicon.png"
    });
  }
}

// ==================== 시간 및 출퇴실 처리 ====================
function getVietnamTime() {
  const now = new Date();
  now.setHours(now.getHours() + 7);
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

function setupEntryExitButtons() {
  const enterBtn = document.getElementById('enter-btn');
  const leaveBtn = document.getElementById('leave-btn');
  if (!enterBtn || !leaveBtn) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const date = params.get('date');
  if (!id || !date) return;

  const gc = parseGradeClass(id);
  if (!gc) return;

  const dbRef = ref(db, `/class/${gc.grade}-${gc.classNum}/${id}/${date}`);
  get(dbRef).then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.accept === true && data.realEnter !== true) {
        enterBtn.style.display = 'inline-block';
        enterBtn.addEventListener('click', () => {
          update(dbRef, { realEnter: true, enterTime: getVietnamTime() })
            .then(() => {
              alert('입장 시간이 기록되었습니다!\nThời gian vào đã được ghi lại!');
              location.reload();
            })
            .catch((error) => {
              alert(`오류 발생: ${error.message}`);
            });
        });
      } else {
        enterBtn.style.display = 'none';
      }

      leaveBtn.addEventListener('click', () => {
        update(dbRef, { leaveTime: getVietnamTime() })
          .then(() => {
            alert('퇴실 시간이 기록되었습니다!\nThời gian ra đã được ghi lại!');
            location.reload();
          })
          .catch((error) => {
            alert(`오류 발생: ${error.message}`);
          });
      });
    }
  });
}

// ==================== 교사 목록 동적 관리 ====================
async function loadTeacherList() {
  const teacherSelect = document.getElementById('studentTeacher');
  const checkTeacherSelect = document.getElementById('checkStudentTeacher');
  
  if (!teacherSelect && !checkTeacherSelect) return;

  try {
    const snapshot = await get(ref(db, 'teacher'));
    
    if (teacherSelect) teacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';
    if (checkTeacherSelect) checkTeacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';

    if (snapshot.exists()) {
      const teacherData = snapshot.val();

      const appendOption = (nameValue) => {
        if (!nameValue) return;
        if (teacherSelect) {
          const opt1 = document.createElement('option');
          opt1.value = nameValue;
          opt1.textContent = nameValue;
          teacherSelect.appendChild(opt1);
        }
        if (checkTeacherSelect) {
          const opt2 = document.createElement('option');
          opt2.value = nameValue;
          opt2.textContent = nameValue;
          checkTeacherSelect.appendChild(opt2);
        }
      };

      if (typeof teacherData === 'object' && !Array.isArray(teacherData)) {
        Object.entries(teacherData).forEach(([key, value]) => {
          let teacherName = key;
          if (value && typeof value === 'object' && value.name) {
            teacherName = value.name;
          } else if (typeof value === 'string') {
            teacherName = value;
          }
          appendOption(teacherName);
        });
      } else if (Array.isArray(teacherData)) {
        teacherData.forEach((teacher) => {
          const teacherName = typeof teacher === 'object' ? teacher.name : teacher;
          appendOption(teacherName);
        });
      }
    }
  } catch (error) {
    console.error('선생님 목록 로드 오류:', error);
  }
}

window.addTeacher = async function(key, name, email = '', password = '') {
  if (!key || !name) {
    alert('키와 이름을 입력해주세요.');
    return;
  }
  try {
    await set(ref(db, `teacher/${key}`), { name, email, password });
    await loadTeacherList();
    alert(`${name} 선생님이 추가되었습니다.`);
  } catch (e) {
    console.error('교사 추가 오류:', e);
    alert('교사 추가 중 오류가 발생했습니다.');
  }
};

function setupPageNavigation() {
  const pages = [
    { id: 'go-student-btn', url: 'student.html' },
    { id: 'go-teacher-btn', url: 'teacher.html' }
  ];

  pages.forEach(page => {
    document.getElementById(page.id)?.addEventListener('click', () => {
      window.location.href = page.url;
    });
  });
}

// ==================== 앱 초기화 ====================
document.addEventListener("DOMContentLoaded", () => {
  setupTeacherRequestNotification();
  if (document.getElementById('studentTeacher') || document.getElementById('checkStudentTeacher')) {
    loadTeacherList();
  }
  setupEntryExitButtons();
  
  if (document.getElementById('studentInfo') || document.getElementById('uploadStudentData') || document.getElementById('requestForm')) {
    setupStudentPage();
  }
  
  if (document.getElementById('go-student-btn') || document.getElementById('go-teacher-btn')) {
    setupPageNavigation();
  }

  const today = new Date();
  today.setHours(today.getHours() + 7); 
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;
  
  const qrDateInput = document.getElementById('qrStudentDate');
  const startDateInput = document.getElementById('studentDefStartDate');
  const endDateInput = document.getElementById('studentDefEndDate');
  
  if (qrDateInput) qrDateInput.value = formattedDate;
  if (startDateInput) startDateInput.value = formattedDate;
  if (endDateInput) endDateInput.value = formattedDate;

  document.getElementById('saveCategory')?.addEventListener('click', searchStudents);
  document.getElementById('selectAll')?.addEventListener('change', toggleAllCheckboxes);
  document.getElementById('save')?.addEventListener('click', updateStudentApprovals);

  if (document.getElementById('loginModal')) {
    showLoginModal();
  }
});
