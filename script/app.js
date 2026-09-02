import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWVZERDb9xbfqCzG3bZvRIciCslbhGTD4",
  authDomain: "entry-4a14b.firebaseapp.com",
  databaseURL: "https://onlineschoolentry-default-rtdb.firebaseio.com/",
  projectId: "entry-4a14b",
  storageBucket: "entry-4a14b.firebasestorage.app",
  messagingSenderId: "262491101728",
  appId: "1:262491101728:web:c67d03020d7e753e07ba45",
  measurementId: "G-V45QGJ3D8E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==================== 공통 및 인증 기능 ====================
let isLoggedIn = false;
let currentTeacherName = '';

// 선생님 이메일 - 성함 매핑 테이블
const TEACHER_EMAIL_MAP = {
  "kisprincipal@kshcm.net": "김명환",
  "amstrong95@kshcm.net": "김세호",
  "yeob24@kshcm.net": "이승엽",
  "goodfren@kshcm.net": "박은길",
  "sarah@kshcm.net": "황사라",
  "congaidep@kshcm.net": "문기쁨",
  "jmh0007@kshcm.net": "정명화",
  "gaz1979@kshcm.net": "정용석",
  "golmokkil@kshcm.net": "박정현",
  "lucky526@kshcm.net": "최은경",
  "hhj711@kshcm.net": "하희진",
  "heawon82@kshcm.net": "신혜원",
  "hanjhedu@kshcm.net": "한지혜",
  "lhg24216@kshcm.net": "임효기",
  "2mini3@kshcm.net": "이경민",
  "eunkom@kshcm.net": "백은영",
  "etandrew@kshcm.net": "이후석",
  "ataraxia333@kshcm.net": "이병기",
  "sapsabby@kshcm.net": "박선영",
  "wms999@kshcm.net": "우민석",
  "lemon912@kshcm.net": "권은숙",
  "2eqq2eqq76@kshcm.net": "허정희",
  "yang7002@kshcm.net": "양진철",
  "mhwee417@kshcm.net": "위미희",
  "jaren1108@kshcm.net": "김재란",
  "ujlim@kshcm.net": "임어진",
  "bravoansi@kshcm.net": "안세린",
  "choigoara@kshcm.net": "최고아라",
  "tinpond@kshcm.net": "정석연",
  "dlrkdgus@kshcm.net": "이강현",
  "dongs422@kshcm.net": "이희동",
  "scent52@kshcm.net": "신혜림",
  "lim916@kshcm.net": "임현정",
  "amorchem2025@kshcm.net": "한가연",
  "whtjsejtk2@kshcm.net": "김민우",
  "redgenne35@kshcm.net": "김보연",
  "ynsong0116@kshcm.net": "송유나",
  "jayuin30@kshcm.net": "김연호",
  "mathsun33@kshcm.net": "이선미",
  "wjdrbeo@kshcm.net": "정규대",
  "cts1000@kshcm.net": "천태선",
  "sarajun@kshcm.net": "조경희",
  "oceandip99@kshcm.net": "이지연",
  "yy11031@kshcm.net": "김태이",
  "northstarr@kshcm.net": "김병관",
  "hana2385@kshcm.net": "이하나",
  "woojuin337@kshcm.net": "남현정",
  "ohhappywon@kshcm.net": "이해원",
  "neuweg73@kshcm.net": "문종배",
  "osg510@kshcm.net": "오슬기",
  "hyuna0216@kshcm.net": "이현아",
  "chohs723@kshcm.net": "조현수",
  "lkb0103@kshcm.net": "이근범",
  "chronicle21@kshcm.net": "홍진일",
  "kimoc1112@kshcm.net": "김옥출",
  "yuni524@kshcm.net": "최윤희",
  "younsoo07@kshcm.net": "윤수영",
  "koreaeagle@kshcm.net": "김성준",
  "mykim1231@kshcm.net": "김미연",
  "usaem@kshcm.net": "유종현",
  "yunjinah@kshcm.net": "윤진아",
  "joybag@kshcm.net": "박현종",
  "saecomi@kshcm.net": "이유준",
  "victorira@kshcm.net": "유리라"
};

// 비밀번호 '2026'의 SHA-256 해시값 (비밀번호 직접 노출 방지)
const TEACHER_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

// 입력받은 비밀번호를 암호화하는 함수
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

// 이메일 및 비밀번호 검증 처리
async function teacherLogin(emailInput, password) {
  try {
    // 1. 비밀번호 해시 검증
    const inputHash = await hashPassword(password);
    if (inputHash !== TEACHER_PASSWORD_HASH) {
      alert('비밀번호가 올바르지 않습니다.');
      return false;
    }

    // 2. 이메일 매핑 테이블 검증
    const cleanEmail = emailInput.trim().toLowerCase();
    const mappedTeacherName = TEACHER_EMAIL_MAP[cleanEmail];

    if (!mappedTeacherName) {
      alert('등록되지 않은 선생님 이메일입니다.');
      return false;
    }

    currentTeacherName = mappedTeacherName;
    return true;
  } catch (error) {
    console.error("로그인 오류:", error);
    alert("로그인 처리 중 오류가 발생했습니다.");
    return false;
  }
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  const content = document.getElementById('content');
  const loginBtn = document.getElementById('loginBtn');
  if (!modal || !content) return;

  modal.style.display = 'flex';
  content.style.display = 'none';
  
  if (loginBtn && !loginBtn.dataset.bound) {
    loginBtn.dataset.bound = "true";
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('teacherEmail')?.value.trim();
      const password = document.getElementById('teacherPassword')?.value.trim();
      
      if (!email || !password) {
        alert('이메일과 비밀번호를 모두 입력해주세요.');
        return;
      }
      
      const success = await teacherLogin(email, password);
      if (success) {
        isLoggedIn = true;
        modal.style.display = 'none';
        content.style.display = 'block';
        searchStudents();
      }
    });
  }
}

// ==================== 학생 페이지 & 승인 알림 수신 ====================
function setupStudentPage() {
  async function uploadStudentData() {
    const reason = document.getElementById("studentReason")?.value?.trim();
    const teacher = document.getElementById("studentTeacher")?.value;

    const idElems = document.querySelectorAll('.multi-studentId');
    const nameElems = document.querySelectorAll('.multi-studentName');
    
    const dateElems = Array.from(document.querySelectorAll('.multi-studentDate'));
    let rawDates = dateElems.map(el => el.value.trim()).filter(Boolean);

    const rangeStart = document.getElementById('rangeStartDate')?.value?.trim();
    const rangeEnd = document.getElementById('rangeEndDate')?.value?.trim();

    if (rawDates.length === 0 && rangeStart && rangeEnd) {
      const startDate = new Date(rangeStart);
      const endDate = new Date(rangeEnd);
      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        let current = new Date(startDate);
        while (current <= endDate) {
          rawDates.push(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
      }
    }

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const maxLimitObj = new Date();
    maxLimitObj.setDate(todayObj.getDate() + 31);
    maxLimitObj.setHours(23, 59, 59, 999);

    let hasInvalidDate = false;
    const dateSet = new Set();

    for (const dStr of rawDates) {
      const targetDate = new Date(dStr);
      if (targetDate >= todayObj && targetDate <= maxLimitObj) {
        dateSet.add(dStr);
      } else {
        hasInvalidDate = true;
      }
    }

    if (hasInvalidDate) {
      alert("오늘 기준 1개월(31일)을 벗어난 날짜는 요청할 수 없습니다. 범위 내 날짜만 포함됩니다.");
    }

    const dateValues = Array.from(dateSet);

    if (!reason || !teacher) {
      alert('사유와 담당 교사를 선택해주세요.');
      return;
    }

    if (dateValues.length === 0) {
      alert('올바른 사용 날짜를 선택해주세요. (오늘부터 1개월 이내)');
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
            leaveTime: "null",
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

          let accept = "승인 대기 중(Đang chờ phê duyệt)";
          if (data.accept === true) {
            accept = "허가됨(Đã được chấp nhận)";
          } else if (data.accept === "rejected" || data.accept === "거부됨") {
            accept = "거부됨(Đã bị từ chối)";
          }

          const realEnter = typeof data.realEnter === 'boolean' 
            ? data.realEnter
              ? "사용함(Đã sử dụng)" 
              : "사용 안 함(Không sử dụng)" 
            : data.realEnter || "미확인(Chưa xác nhận)";

          const isAccepted = data.accept === true || data.accept === "true";
          const isNotUsedYet = data.realEnter === false || data.realEnter === "false" || !data.realEnter;

          if (isAccepted && isNotUsedYet) {
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

// ==================== 검색 및 선생님 관리 기능 ====================
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
    return value ? '허가됨' : '대기 중 / 미허가';
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
    alert(`${selectedStudents.length}명의 학생 출입이 허가 및 승인되었습니다.`);
    searchStudents();
  } catch (error) {
    console.error('업데이트 오류:', error);
    alert('학생 정보 업데이트 중 오류가 발생했습니다.');
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

// ==================== 교사 목록 관리 ====================
async function loadTeacherList() {
  const teacherSelect = document.getElementById('studentTeacher');
  const checkTeacherSelect = document.getElementById('checkStudentTeacher');
  
  if (!teacherSelect && !checkTeacherSelect) return;

  // TEACHER_EMAIL_MAP의 이름 리스트 추출 후 정렬
  const teacherNames = Array.from(new Set(Object.values(TEACHER_EMAIL_MAP))).sort();

  try {
    if (teacherSelect) teacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';
    if (checkTeacherSelect) checkTeacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';

    teacherNames.forEach((teacherName) => {
      if (teacherSelect) {
        const opt1 = document.createElement('option');
        opt1.value = teacherName;
        opt1.textContent = teacherName;
        teacherSelect.appendChild(opt1);
      }
      if (checkTeacherSelect) {
        const opt2 = document.createElement('option');
        opt2.value = teacherName;
        opt2.textContent = teacherName;
        checkTeacherSelect.appendChild(opt2);
      }
    });
  } catch (error) {
    console.error('선생님 목록 로드 오류:', error);
  }
}

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
});import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWVZERDb9xbfqCzG3bZvRIciCslbhGTD4",
  authDomain: "entry-4a14b.firebaseapp.com",
  databaseURL: "https://onlineschoolentry-default-rtdb.firebaseio.com/",
  projectId: "entry-4a14b",
  storageBucket: "entry-4a14b.firebasestorage.app",
  messagingSenderId: "262491101728",
  appId: "1:262491101728:web:c67d03020d7e753e07ba45",
  measurementId: "G-V45QGJ3D8E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==================== 공통 및 인증 기능 ====================
let isLoggedIn = false;
let currentTeacherName = '';

// 비밀번호 '2026'을 SHA-256으로 암호화한 해시값 (F12 개발자도구로 봐도 원래 번호 복원 불가)
const TEACHER_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

// 입력받은 비밀번호를 암호화하는 함수
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

// [수정] DB를 읽지 않고 코드 내부 해시값으로 비밀번호 '2026' 검증
async function teacherLogin(teacherInput, password) {
  try {
    const inputHash = await hashPassword(password);
    
    // 비밀번호가 '2026'인 경우에만 성공
    if (inputHash === TEACHER_PASSWORD_HASH) {
      // 입력값이 이메일 형태(example@domain)면 아이디만 추출, 이름이면 그대로 사용
      currentTeacherName = teacherInput.includes('@') ? teacherInput.split('@')[0] : teacherInput;
      return true;
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
  const loginBtn = document.getElementById('loginBtn');
  if (!modal || !content) return;

  modal.style.display = 'flex';
  content.style.display = 'none';
  
  if (loginBtn && !loginBtn.dataset.bound) {
    loginBtn.dataset.bound = "true";
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('teacherEmail')?.value.trim();
      const password = document.getElementById('teacherPassword')?.value.trim();
      
      if (!email || !password) {
        alert('선생님 이름(또는 이메일)과 비밀번호를 입력해주세요.');
        return;
      }
      
      const success = await teacherLogin(email, password);
      if (success) {
        isLoggedIn = true;
        modal.style.display = 'none';
        content.style.display = 'block';
        searchStudents();
      } else {
        alert('비밀번호가 잘못되었습니다.');
      }
    });
  }
}

// ==================== 학생 페이지 & 승인 알림 수신 ====================
function setupStudentPage() {
  async function uploadStudentData() {
    const reason = document.getElementById("studentReason")?.value?.trim();
    const teacher = document.getElementById("studentTeacher")?.value;

    const idElems = document.querySelectorAll('.multi-studentId');
    const nameElems = document.querySelectorAll('.multi-studentName');
    
    const dateElems = Array.from(document.querySelectorAll('.multi-studentDate'));
    let rawDates = dateElems.map(el => el.value.trim()).filter(Boolean);

    const rangeStart = document.getElementById('rangeStartDate')?.value?.trim();
    const rangeEnd = document.getElementById('rangeEndDate')?.value?.trim();

    if (rawDates.length === 0 && rangeStart && rangeEnd) {
      const startDate = new Date(rangeStart);
      const endDate = new Date(rangeEnd);
      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        let current = new Date(startDate);
        while (current <= endDate) {
          rawDates.push(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
      }
    }

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const maxLimitObj = new Date();
    maxLimitObj.setDate(todayObj.getDate() + 31);
    maxLimitObj.setHours(23, 59, 59, 999);

    let hasInvalidDate = false;
    const dateSet = new Set();

    for (const dStr of rawDates) {
      const targetDate = new Date(dStr);
      if (targetDate >= todayObj && targetDate <= maxLimitObj) {
        dateSet.add(dStr);
      } else {
        hasInvalidDate = true;
      }
    }

    if (hasInvalidDate) {
      alert("오늘 기준 1개월(31일)을 벗어난 날짜는 요청할 수 없습니다. 범위 내 날짜만 포함됩니다.");
    }

    const dateValues = Array.from(dateSet);

    if (!reason || !teacher) {
      alert('사유와 담당 교사를 선택해주세요.');
      return;
    }

    if (dateValues.length === 0) {
      alert('올바른 사용 날짜를 선택해주세요. (오늘부터 1개월 이내)');
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
            leaveTime: "null",
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

          let accept = "승인 대기 중(Đang chờ phê duyệt)";
          if (data.accept === true) {
            accept = "허가됨(Đã được chấp nhận)";
          } else if (data.accept === "rejected" || data.accept === "거부됨") {
            accept = "거부됨(Đã bị từ chối)";
          }

          const realEnter = typeof data.realEnter === 'boolean' 
            ? data.realEnter
              ? "사용함(Đã sử dụng)" 
              : "사용 안 함(Không 사용)" 
            : data.realEnter || "미확인(Chưa xác nhận)";

          const isAccepted = data.accept === true || data.accept === "true";
          const isNotUsedYet = data.realEnter === false || data.realEnter === "false" || !data.realEnter;

          if (isAccepted && isNotUsedYet) {
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
            사용 여부(Đã 사용): ${realEnter}
          `;
        } else {
          studentInfoElem.innerHTML = "해당 날짜에 대한 데이터가 없습니다.(KHÔNG CÓ DỮ LIỆU CHO NGÀY NÀY.)";
        }
      }).catch((error) => {
        studentInfoElem.innerHTML = `데이터 조회 중 오류가 발생했습니다(ĐÃ XẢY RA LỖI KHI TRUY XUẤT DỮ LIỆU): ${error}`;
      });
      
      setupStudentApprovalNotification(gc.grade, gc.classNum, id, date);
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

// ==================== 검색 및 선생님 관리 기능 ====================
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
    return value ? '허가됨' : '대기 중 / 미허가';
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
    alert(`${selectedStudents.length}명의 학생 출입이 허가 및 승인되었습니다.`);
    searchStudents();
  } catch (error) {
    console.error('업데이트 오류:', error);
    alert('학생 정보 업데이트 중 오류가 발생했습니다.');
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

// ==================== 교사 목록 관리 ====================
async function loadTeacherList() {
  const teacherSelect = document.getElementById('studentTeacher');
  const checkTeacherSelect = document.getElementById('checkStudentTeacher');
  
  if (!teacherSelect && !checkTeacherSelect) return;

  const TEACHER_LIST = [
    "권은숙", "김명환", "김미연", "김민우", "김병관", "김보연", "김성준", "김연호", "김옥출", 
    "김재란", "김태이", "남현정", "문기쁨", "문종배", "박선영", "박은길", "박정현", "박현종", 
    "백은영", "송유나", "신혜림", "신혜원", "안세린", "양진철", "우민석", "유리라", "유종현", 
    "윤수영", "윤진아", "이강현", "이경민", "이근범", "이선미", "이성준", "이승엽", "이유준", 
    "이이원", "이하나", "이해원", "이현아", "이희동", "임어진", "임현정", "임효기", "조경희", 
    "조현수", "천태선", "최고아라", "최윤희", "최은경", "하희진", "한가연", "한지혜", "허정희", 
    "홍진일", "황사라"
  ];

  try {
    if (teacherSelect) teacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';
    if (checkTeacherSelect) checkTeacherSelect.innerHTML = '<option value="">담당 교사를 선택하세요</option>';

    TEACHER_LIST.forEach((teacherName) => {
      if (teacherSelect) {
        const opt1 = document.createElement('option');
        opt1.value = teacherName;
        opt1.textContent = teacherName;
        teacherSelect.appendChild(opt1);
      }
      if (checkTeacherSelect) {
        const opt2 = document.createElement('option');
        opt2.value = teacherName;
        opt2.textContent = teacherName;
        checkTeacherSelect.appendChild(opt2);
      }
    });
  } catch (error) {
    console.error('선생님 목록 로드 오류:', error);
  }
}

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
