import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// ==================== 날짜 범위 제한 유틸리티 ====================
function getDateLimits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30); // 오늘 기준 +30일

  const minStr = today.toISOString().split('T')[0];
  const maxStr = maxDate.toISOString().split('T')[0];

  return { minStr, maxStr };
}

function applyDateLimits() {
  const { minStr, maxStr } = getDateLimits();
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.setAttribute('min', minStr);
    input.setAttribute('max', maxStr);
  });
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

// ==================== UI 폼 토글 기능 ====================
function setupFormToggles() {
  const requestBtn = document.getElementById("requestPageBtn");
  const qrBtn = document.getElementById("qrGenerateFormBtn");
  const statusBtn = document.getElementById("statusCheckBtn");

  const requestForm = document.getElementById("requestForm");
  const qrForm = document.getElementById("qrGenerateForm");
  const statusForm = document.getElementById("statusCheckForm");

  function hideAllForms() {
    if (requestForm) requestForm.style.display = "none";
    if (qrForm) qrForm.style.display = "none";
    if (statusForm) statusForm.style.display = "none";
  }

  requestBtn?.addEventListener("click", () => {
    hideAllForms();
    if (requestForm) requestForm.style.display = "block";
  });

  qrBtn?.addEventListener("click", () => {
    hideAllForms();
    if (qrForm) qrForm.style.display = "block";
  });

  statusBtn?.addEventListener("click", () => {
    hideAllForms();
    if (statusForm) statusForm.style.display = "block";
  });
}

// ==================== 동적 폼 항목 추가 기능 ====================
function setupDynamicInputs() {
  // 1. 학생 인원 추가
  document.getElementById("addStudentBtn")?.addEventListener("click", () => {
    const studentList = document.getElementById("studentList");
    if (!studentList) return;

    const div = document.createElement("div");
    div.className = "student-entry";
    div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px;";
    div.innerHTML = `
      <input type="text" class="multi-studentId" placeholder="학번 입력" style="flex: 1;" />
      <input type="text" class="multi-studentName" placeholder="이름 입력" style="flex: 1;" />
    `;
    studentList.appendChild(div);
  });

  // 2. 날짜 칸 추가
  document.getElementById("addDateBtn")?.addEventListener("click", () => {
    const dateList = document.getElementById("dateList");
    if (!dateList) return;

    const { minStr, maxStr } = getDateLimits();
    const div = document.createElement("div");
    div.className = "date-entry";
    div.style.marginBottom = "5px";
    div.innerHTML = `<input type="date" class="multi-studentDate" min="${minStr}" max="${maxStr}" />`;
    dateList.appendChild(div);
  });

  // 3. 날짜 범위 일괄 추가
  document.getElementById("addDateRangeBtn")?.addEventListener("click", () => {
    const startDateVal = document.getElementById("rangeStartDate")?.value;
    const endDateVal = document.getElementById("rangeEndDate")?.value;

    if (!startDateVal || !endDateVal) {
      alert("시작 날짜와 종료 날짜를 모두 선택해주세요.");
      return;
    }

    const { minStr, maxStr } = getDateLimits();
    if (startDateVal < minStr || endDateVal > maxStr) {
      alert("신청 당일 기준 30일 이내의 날짜만 선택할 수 있습니다.");
      return;
    }

    const start = new Date(startDateVal);
    const end = new Date(endDateVal);

    if (start > end) {
      alert("시작 날짜가 종료 날짜보다 뒤일 수 없습니다.");
      return;
    }

    const dateList = document.getElementById("dateList");
    if (!dateList) return;
    dateList.innerHTML = ""; // 기존 단일 입력 칸 초기화

    let curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split("T")[0];
      const div = document.createElement("div");
      div.className = "date-entry";
      div.style.marginBottom = "5px";
      div.innerHTML = `<input type="date" class="multi-studentDate" value="${dateStr}" min="${minStr}" max="${maxStr}" />`;
      dateList.appendChild(div);
      curr.setDate(curr.getDate() + 1);
    }
  });
}

// ==================== 학생 요청 데이터 업로드 ====================
async function uploadStudentData() {
  const reason = document.getElementById("studentReason")?.value?.trim();
  const teacher = document.getElementById("studentTeacher")?.value;

  const idElems = document.querySelectorAll('.multi-studentId');
  const nameElems = document.querySelectorAll('.multi-studentName');
  
  const dateElems = Array.from(document.querySelectorAll('.multi-studentDate'));
  let dateSet = new Set(dateElems.map(el => el.value.trim()).filter(Boolean));

  const dateValues = Array.from(dateSet);

  if (!reason || !teacher) {
    alert('사유와 담당 교사를 선택해주세요.');
    return;
  }

  if (dateValues.length === 0) {
    alert('사용하고자 하는 날짜를 입력해주세요.');
    return;
  }

  // 신청 당일 기준 30일 이내 검증
  const { minStr, maxStr } = getDateLimits();
  const invalidDates = dateValues.filter(d => d < minStr || d > maxStr);
  if (invalidDates.length > 0) {
    alert(`신청할 수 없는 날짜가 포함되어 있습니다.\n(신청 당일 기준 30일 이내만 신청 가능)\n- 제외된 날짜: ${invalidDates.join(', ')}`);
    return;
  }

  let successes = 0;
  const errors = [];

  try {
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

// ==================== QR 및 신청/승인 조회 ====================
window.generateQRCode = function() {
  const id = document.getElementById("qrStudentId")?.value.trim();
  const name = document.getElementById("qrStudentName")?.value.trim();
  const date = document.getElementById("qrStudentDate")?.value;
  const qrContainer = document.getElementById("qrcode");

  if (!id || !name || !date) {
    alert("학번, 이름, 날짜를 모두 입력해주세요.");
    return;
  }

  if (qrContainer) {
    qrContainer.innerHTML = "";
    const qrData = `ID:${id}|NAME:${name}|DATE:${date}`;
    new QRCode(qrContainer, {
      text: qrData,
      width: 128,
      height: 128
    });
  }
};

async function checkStatus() {
  const id = document.getElementById("checkStudentId")?.value.trim();
  const name = document.getElementById("checkStudentName")?.value.trim();
  const date = document.getElementById("checkStudentDate")?.value;
  const teacher = document.getElementById("checkStudentTeacher")?.value;
  const resultDiv = document.getElementById("approvalResult");

  if (!id || !date) {
    alert("학번과 날짜를 입력해주세요.");
    return;
  }

  const gc = parseGradeClass(id);
  if (!gc) {
    alert("올바른 학번 형식이 아닙니다.");
    return;
  }

  try {
    const dbRef = ref(db, `class/${gc.grade}-${gc.classNum}/${id}/${date}`);
    const snapshot = await get(dbRef);

    if (resultDiv) {
      resultDiv.style.display = "block";
      if (snapshot.exists()) {
        const data = snapshot.val();
        let statusText = "대기 중";
        if (data.accept === true) statusText = "<span style='color:green; font-weight:bold;'>승인됨</span>";
        else if (data.accept === "rejected") statusText = "<span style='color:red; font-weight:bold;'>거부됨</span>";

        resultDiv.innerHTML = `
          <h3>조회 결과</h3>
          <p><strong>학번:</strong> ${id}</p>
          <p><strong>이름:</strong> ${data.name || name}</p>
          <p><strong>날짜:</strong> ${date}</p>
          <p><strong>승인 상태:</strong> ${statusText}</p>
        `;
      } else {
        resultDiv.innerHTML = "<p>해당 날짜에 신청된 데이터가 없습니다.</p>";
      }
    }
  } catch (err) {
    alert("조회 중 오류 발생: " + err.message);
  }
}

// ==================== 교사 목록 로드 ====================
async function loadTeacherList() {
  const teacherSelect = document.getElementById('studentTeacher');
  const checkTeacherSelect = document.getElementById('checkStudentTeacher');
  
  if (!teacherSelect && !checkTeacherSelect) return;

  try {
    const snapshot = await get(ref(db, 'teacher'));
    if (snapshot.exists()) {
      const teacherData = snapshot.val();
      const appendOption = (nameValue) => {
        if (!nameValue) return;
        [teacherSelect, checkTeacherSelect].forEach(select => {
          if (select) {
            const opt = document.createElement('option');
            opt.value = nameValue;
            opt.textContent = nameValue;
            select.appendChild(opt);
          }
        });
      };

      if (typeof teacherData === 'object' && !Array.isArray(teacherData)) {
        Object.entries(teacherData).forEach(([key, value]) => {
          const teacherName = (value && typeof value === 'object' && value.name) ? value.name : key;
          appendOption(teacherName);
        });
      }
    }
  } catch (error) {
    console.error('선생님 목록 로드 오류:', error);
  }
}

// ==================== DOM 이벤트 초기화 ====================
document.addEventListener("DOMContentLoaded", () => {
  applyDateLimits();
  setupFormToggles();
  setupDynamicInputs();
  loadTeacherList();

  document.getElementById("uploadStudentData")?.addEventListener("click", uploadStudentData);
  document.getElementById("doCheckBtn")?.addEventListener("click", checkStatus);
});
