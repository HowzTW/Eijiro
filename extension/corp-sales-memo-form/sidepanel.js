let configData = null;
const navPills = document.getElementById('navPills');
const observerOptions = { root: null, threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] };
const visibleCards = new Set();

// 快取各課程查詢到的場次 ID，key 為 "sIdx_cIdx"
const stageIdCache = {};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) visibleCards.add(entry.target.id);
        else visibleCards.delete(entry.target.id);
    });
    determineActiveCard();
}, observerOptions);

function determineActiveCard() {
    if (visibleCards.size === 0) return;
    const navHeight = 80;
    const targetLine = navHeight + 20;
    const cards = Array.from(visibleCards).map(id => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < targetLine) return null;
        return { id, rect, dist: Math.abs(rect.top - targetLine) };
    }).filter(c => c !== null);
    if (cards.length === 0) return;
    cards.sort((a, b) => a.dist - b.dist);
    updateActiveNav(cards[0].id);
}

// ── 設定載入 ──────────────────────────────────────────────

async function loadConfig() {
    try {
        const url = typeof chrome !== 'undefined' && chrome.runtime
            ? chrome.runtime.getURL('config.json')
            : 'config.json';
        const response = await fetch(url);
        configData = await response.json();
        populateDropdowns();
        populateQuickNoteButtons();
        document.querySelector('select[name="leaveMotivation"]').value = '家長想讓小朋友學';
        document.querySelector('select[name="priceReaction"]').value = '體驗看看再說';
        document.querySelector('select[name="decisionMaker"]').value = '爸媽一起討論';
        document.querySelector('select[name="customerLevel"]').value = 'B';
        initNav();
        syncStudentCards();
    } catch (error) {
        console.error('無法載入參數紀錄檔:', error);
    }
}

function populateSelect(name, options) {
    const selects = document.querySelectorAll(`select[name="${name}"]`);
    selects.forEach(select => {
        const currentValue = select.value;
        const placeholders = {
            parentTitle: '請選擇家長稱謂',
            equipmentType: '請選擇設備',
            networkType: '請選擇網路',
            osType: '請選擇系統',
            leaveMotivation: '請選擇動機',
            briefingAttend: '請選擇出席狀況',
            priceReaction: '請選擇報價反應',
            decisionMaker: '請選擇決策者',
            customerLevel: '請選擇客戶等級',
        };
        const placeholderText = name.startsWith('testType')
            ? '請選擇測驗（選填）'
            : (placeholders[name] || '請選擇內容');

        select.innerHTML = `<option value="">${placeholderText}</option>`;
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            select.appendChild(o);
        });
        select.value = currentValue;
    });
}

function populateQuickNoteButtons() {
    const container = document.getElementById('quickNoteButtons');
    if (!container || !configData?.quickNotes) return;
    container.innerHTML = '';
    configData.quickNotes.forEach(({ label, text }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quick-note-btn';
        btn.textContent = label;
        btn.dataset.quickNoteText = text;
        container.appendChild(btn);
    });
}

function populateDropdowns() {
    if (!configData) return;
    populateSelect('parentTitle', configData.titles);
    populateSelect('leaveMotivation', configData.leaveMotivation);
    populateSelect('equipmentType', configData.equipment);
    populateSelect('networkType', configData.network);
    populateSelect('osType', configData.os);
    populateSelect('briefingAttend', configData.briefingAttend);
    populateSelect('priceReaction', configData.priceReaction);
    populateSelect('decisionMaker', configData.decisionMaker);
    populateSelect('customerLevel', configData.customerLevel);
}

// ── 導覽列 ────────────────────────────────────────────────

function initNav() {
    refreshNav();
    document.querySelectorAll('.card').forEach(card => observer.observe(card));
}

function refreshNav() {
    if (!navPills) return;
    navPills.innerHTML = '';
    addNavPill('parentCard', 'person', '家長');
    addNavPill('equipmentCard', 'laptop_mac', '設備');

    document.querySelectorAll('[id^="studentCard_"]').forEach(card => {
        const sIdx = card.id.split('_')[1];
        const sName = document.querySelector(`[name="studentName_${sIdx}"]`)?.value.trim() ?? '';
        const sGrade = document.querySelector(`[name="studentGrade_${sIdx}"]`)?.value ?? '';
        const label = (sName && sGrade && sGrade !== '請選擇年級')
            ? `學員：${sGrade}${sName}` : `學員 (${sIdx})`;
        addNavPill(card.id, 'face', label);

        document.querySelectorAll(`[id^="courseCard_${sIdx}_"]`).forEach(cCard => {
            const cIdx = cCard.id.split('_')[2];
            const cType = document.querySelector(`[name="courseType_${sIdx}_${cIdx}"]`)?.value ?? '';
            const cLabel = (cType && cType !== '請選擇課程') ? `└ ${cType}` : `└ 課程 (${cIdx})`;
            addNavPill(cCard.id, 'auto_stories', cLabel);
        });
    });

    addNavPill('otherInfoCard', 'info', '其他資訊');
    addNavPill('noteCard', 'sticky_note_2', '備註');
    document.querySelectorAll('.card').forEach(card => updateNavPillColor(card.id));
}

function addNavPill(cardId, icon, text) {
    const pill = document.createElement('div');
    pill.className = 'nav-pill';
    pill.id = `nav_${cardId}`;
    pill.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span class="pill-text">${text}</span>`;
    pill.addEventListener('click', () => document.getElementById(cardId)?.scrollIntoView({ behavior: 'smooth' }));
    navPills.appendChild(pill);
}

function updateActiveNav(cardId) {
    document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    const activePill = document.getElementById(`nav_${cardId}`);
    if (activePill) {
        activePill.classList.add('active');
        centerNavPill(activePill);
    }
}

function centerNavPill(pill) {
    const nav = document.querySelector('.sticky-nav');
    nav.scrollTo({ left: pill.offsetLeft - (nav.offsetWidth / 2) + (pill.offsetWidth / 2), behavior: 'smooth' });
}

// ── 學員 / 課程卡片 ───────────────────────────────────────

function stepNumber(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = Math.max(0, (parseInt(input.value) || 0) + delta);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncStudentCards() {
    const count = parseInt(document.getElementById('studentCount').value) || 0;
    const container = document.getElementById('studentCardsContainer');
    const current = container.querySelectorAll('.card:not(.nested)').length;

    if (count > current) {
        for (let i = current + 1; i <= count; i++) addStudentCard(i);
    } else {
        for (let i = current; i > count; i--) {
            const card = document.getElementById(`studentCard_${i}`);
            if (card) {
                document.querySelectorAll(`[id^="courseCard_${i}_"]`).forEach(c => { observer.unobserve(c); c.remove(); });
                observer.unobserve(card);
                card.remove();
            }
        }
    }
    refreshNav();
}

function addStudentCard(i) {
    const container = document.getElementById('studentCardsContainer');
    const card = document.createElement('div');
    card.className = 'card required-empty';
    card.id = `studentCard_${i}`;

    const gradeOpts = configData.grades.map(g => `<option value="${g}">${g}</option>`).join('');

    card.innerHTML = `
        <div class="card-header">
            <span class="material-symbols-outlined">face</span>
            <h2 id="studentTitle_${i}">學員 (${i})</h2>
        </div>
        <div class="form-group">
            <label class="required">學員姓名</label>
            <input type="text" name="studentName_${i}" required placeholder="姓名">
        </div>
        <div class="form-group">
            <label class="required">年級</label>
            <select name="studentGrade_${i}" required data-other-id="studentGradeOther_${i}">
                <option value="">請選擇年級</option>${gradeOpts}
            </select>
            <input type="text" id="studentGradeOther_${i}" class="other-input" placeholder="請輸入年級">
        </div>
        <div class="form-group">
            <label class="required">預約體驗課程數</label>
            <div class="number-input-container">
                <button type="button" class="number-btn" data-step-target="courseCount_${i}" data-step-delta="-1">
                    <span class="material-symbols-outlined">remove_circle_outline</span>
                </button>
                <input type="number" id="courseCount_${i}" name="courseCount_${i}" value="0" min="0" required>
                <button type="button" class="number-btn" data-step-target="courseCount_${i}" data-step-delta="1">
                    <span class="material-symbols-outlined">add_circle_outline</span>
                </button>
            </div>
        </div>
        <div class="form-group">
            <label>備註</label>
            <textarea name="studentNote_${i}" rows="2"></textarea>
        </div>
        <div id="courseCardsContainer_${i}"></div>
    `;
    container.appendChild(card);
    observer.observe(card);
}

function syncCourseCards(sIdx) {
    const count = parseInt(document.getElementById(`courseCount_${sIdx}`)?.value) || 0;
    const container = document.getElementById(`courseCardsContainer_${sIdx}`);
    if (!container) return;
    const current = container.querySelectorAll('.card.nested').length;

    if (count > current) {
        for (let j = current + 1; j <= count; j++) addCourseCard(sIdx, j);
    } else {
        for (let j = current; j > count; j--) {
            const card = document.getElementById(`courseCard_${sIdx}_${j}`);
            if (card) { observer.unobserve(card); card.remove(); }
            delete stageIdCache[`${sIdx}_${j}`];
        }
    }
    refreshNav();
}

function addCourseCard(sIdx, cIdx) {
    const container = document.getElementById(`courseCardsContainer_${sIdx}`);
    const card = document.createElement('div');
    card.className = 'card nested required-empty';
    card.id = `courseCard_${sIdx}_${cIdx}`;

    const courseOpts = configData.trialCourses.map(c =>
        `<option value="${c.name}" data-abbr="${c.abbr}">${c.name}</option>`).join('');
    const timeOpts = configData.timeSlots.map(t => `<option value="${t}">${t}</option>`).join('');
    const testOpts = configData.testSending.map(t => `<option value="${t}">${t}</option>`).join('');
    const pExp = configData.programmingExp.map(e => `<option value="${e}">${e}</option>`).join('');
    const mExp = configData.mathExp.map(e => `<option value="${e}">${e}</option>`).join('');
    const gExp = configData.gameExp.map(e => `<option value="${e}">${e}</option>`).join('');

    card.innerHTML = `
        <div class="card-header">
            <span class="material-symbols-outlined">auto_stories</span>
            <h2 id="courseTitle_${sIdx}_${cIdx}">課程 (${cIdx})</h2>
        </div>
        <div class="form-group">
            <label class="required">體驗課程</label>
            <select name="courseType_${sIdx}_${cIdx}" required>
                <option value="">請選擇課程</option>${courseOpts}
            </select>
        </div>
        <div class="form-group">
            <label class="required">預約日期</label>
            <div class="date-input-container">
                <input type="text" name="dateText_${sIdx}_${cIdx}" placeholder="YYYY-MM-DD" required data-format-date>
                <button type="button" class="date-picker-btn" data-date-picker>
                    <span class="material-symbols-outlined">calendar_today</span>
                </button>
                <input type="date" data-sync-date="dateText_${sIdx}_${cIdx}">
            </div>
        </div>
        <div class="form-group">
            <label class="required">預約時段</label>
            <select name="timeSlot_${sIdx}_${cIdx}" required data-other-id="timeOther_${sIdx}_${cIdx}">
                <option value="">請選擇時段</option>${timeOpts}
            </select>
            <input type="text" id="timeOther_${sIdx}_${cIdx}" class="other-input" placeholder="請輸入時段">
        </div>
        <div class="form-group">
            <label class="required">經驗 (填寫任一項即可)</label>
            <div class="experience-group">
                <select data-exp-target="progText_${sIdx}_${cIdx}"><option value="">程式經驗</option>${pExp}</select>
                <input type="text" id="progText_${sIdx}_${cIdx}" placeholder="程式經歷描述">
            </div>
            <div class="experience-group">
                <select data-exp-target="mathText_${sIdx}_${cIdx}"><option value="">數學經驗</option>${mExp}</select>
                <input type="text" id="mathText_${sIdx}_${cIdx}" placeholder="數學經歷描述">
            </div>
            <div class="experience-group">
                <select data-exp-target="gameText_${sIdx}_${cIdx}"><option value="">遊戲經驗</option>${gExp}</select>
                <input type="text" id="gameText_${sIdx}_${cIdx}" placeholder="遊戲經歷描述">
            </div>
        </div>
        <div class="form-group">
            <label>測驗寄送</label>
            <select name="testType_${sIdx}_${cIdx}">
                <option value="">請選擇測驗（選填）</option>${testOpts}
            </select>
        </div>
        <div class="form-group">
            <label><span class="material-symbols-outlined" style="font-size: 18px">tag</span> 場次ID</label>
            <div class="stage-id-row">
                <span id="stageId_${sIdx}_${cIdx}" class="stage-id-display">—</span>
                <button type="button" class="stage-id-btn" data-lookup-stage data-sidx="${sIdx}" data-cidx="${cIdx}">
                    <span class="material-symbols-outlined" style="font-size: 18px">search</span> 查詢
                </button>
            </div>
        </div>
        <div class="form-group">
            <label>備註</label>
            <textarea name="courseNote_${sIdx}_${cIdx}" rows="2"></textarea>
        </div>
    `;
    container.appendChild(card);
    observer.observe(card);
}

// ── 標題更新 ──────────────────────────────────────────────

function updateStudentHeader(sIdx) {
    const name = document.querySelector(`[name="studentName_${sIdx}"]`)?.value.trim() ?? '';
    let grade = document.querySelector(`[name="studentGrade_${sIdx}"]`)?.value ?? '';
    if (grade === '其他') grade = document.getElementById(`studentGradeOther_${sIdx}`)?.value.trim() ?? '';

    const title = (name && grade) ? `學員：${grade}${name}` : `學員 (${sIdx})`;
    const titleEl = document.getElementById(`studentTitle_${sIdx}`);
    if (titleEl) titleEl.textContent = title;

    document.querySelectorAll(`[id^="courseTitle_${sIdx}_"]`).forEach(h => {
        updateCourseHeader(sIdx, h.id.split('_')[2]);
    });
    refreshNav();
}

function updateCourseHeader(sIdx, cIdx) {
    const name = document.querySelector(`[name="studentName_${sIdx}"]`)?.value.trim() ?? '';
    let grade = document.querySelector(`[name="studentGrade_${sIdx}"]`)?.value ?? '';
    if (grade === '其他') grade = document.getElementById(`studentGradeOther_${sIdx}`)?.value.trim() ?? '';
    const course = document.querySelector(`[name="courseType_${sIdx}_${cIdx}"]`)?.value ?? '';

    const base = (name && grade) ? `${grade}${name}` : `學員 (${sIdx})`;
    const suffix = course ? ` - ${course}` : `課程 (${cIdx})`;
    const titleEl = document.getElementById(`courseTitle_${sIdx}_${cIdx}`);
    if (titleEl) titleEl.textContent = `${base}${suffix}`;
    refreshNav();
}

// ── 表單輔助函式 ──────────────────────────────────────────

function handleDropdownOther(select, otherId) {
    const otherInput = document.getElementById(otherId);
    if (!otherInput) return;
    if (select.value === '其他') {
        otherInput.classList.add('visible');
        otherInput.required = true;
    } else {
        otherInput.classList.remove('visible');
        otherInput.required = false;
        otherInput.value = '';
    }
}

function syncDate(picker, targetName) {
    const textInput = document.querySelector(`[name="${targetName}"]`);
    if (textInput) textInput.value = picker.value;
    const card = picker.closest('.card');
    if (card?.id) validateCard(card.id);
    picker.blur();
    if (textInput) textInput.focus();
}

function formatDateInput(input) {
    let val = input.value.trim();
    if (!val) return;
    val = val.replace(/\//g, '-');
    const match = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        input.value = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        input.value = '';
    }
}

function syncExp(select, textId) {
    if (select.value) {
        const el = document.getElementById(textId);
        if (el) el.value = select.value;
    }
    const card = select.closest('.card');
    if (card?.id) validateCard(card.id);
}

function clearExpSelect(input) {
    const prev = input.previousElementSibling;
    if (prev?.tagName === 'SELECT') prev.value = '';
}

// ── 驗證 ──────────────────────────────────────────────────

function validateCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const inputs = card.querySelectorAll('[required]');
    let allFilled = true;

    inputs.forEach(input => {
        if (input.classList.contains('other-input') && !input.classList.contains('visible')) return;
        if (!input.value.trim()) allFilled = false;
        if (input.type === 'email' && !input.validity.valid) allFilled = false;
    });

    if (card.id.startsWith('courseCard_')) {
        const parts = card.id.split('_');
        const sIdx = parts[1], cIdx = parts[2];
        const hasExp =
            document.getElementById(`progText_${sIdx}_${cIdx}`)?.value.trim() ||
            document.getElementById(`mathText_${sIdx}_${cIdx}`)?.value.trim() ||
            document.getElementById(`gameText_${sIdx}_${cIdx}`)?.value.trim();
        if (!hasExp) allFilled = false;
    }

    if (card.id.startsWith('studentCard_')) {
        const sIdx = card.id.split('_')[1];
        const sName = document.querySelector(`[name="studentName_${sIdx}"]`)?.value.trim() ?? '';
        const sGrade = document.querySelector(`[name="studentGrade_${sIdx}"]`)?.value ?? '';
        if (sGrade === '其他') {
            if (!document.getElementById(`studentGradeOther_${sIdx}`)?.value.trim()) allFilled = false;
        }
        if (sName && sGrade && (sGrade !== '其他' || document.getElementById(`studentGradeOther_${sIdx}`)?.value.trim())) {
            card.classList.remove('required-empty');
            card.classList.add('required-filled');
        } else {
            card.classList.remove('required-filled');
            card.classList.add('required-empty');
        }
    } else {
        card.classList.toggle('required-empty', !allFilled);
        card.classList.toggle('required-filled', allFilled);
    }
    updateNavPillColor(cardId);
}

function updateNavPillColor(cardId) {
    const card = document.getElementById(cardId);
    const pill = document.getElementById(`nav_${cardId}`);
    if (!card || !pill) return;
    let status = '';
    if (card.classList.contains('required-empty')) status = 'required-empty';
    else if (card.classList.contains('required-filled')) status = 'required-filled';
    else if (card.classList.contains('optional')) status = 'optional';
    pill.classList.remove('required-empty', 'required-filled', 'optional');
    if (status) pill.classList.add(status);
}

// ── 場次 ID 查詢 ──────────────────────────────────────────

async function lookupStageId(sIdx, cIdx) {
    const display = document.getElementById(`stageId_${sIdx}_${cIdx}`);
    if (!display) return;

    const cDate = document.querySelector(`[name="dateText_${sIdx}_${cIdx}"]`)?.value.trim() ?? '';
    const cTimeSelect = document.querySelector(`[name="timeSlot_${sIdx}_${cIdx}"]`);
    let cTime = cTimeSelect?.value ?? '';
    if (cTime === '其他') cTime = document.getElementById(`timeOther_${sIdx}_${cIdx}`)?.value.trim() ?? '';

    const cType = document.querySelector(`[name="courseType_${sIdx}_${cIdx}"]`)?.value ?? '';

    if (!cDate || !cTime || cTime === '請選擇時段' || !cType || cType === '請選擇課程') {
        display.textContent = '請先填寫日期、時段、課程';
        display.className = 'stage-id-display error';
        return;
    }

    const courseObj = configData?.trialCourses.find(tc => tc.name === cType);
    if (!courseObj?.prefix) {
        display.textContent = '此課程無法自動查詢';
        display.className = 'stage-id-display error';
        return;
    }

    display.textContent = '查詢中…';
    display.className = 'stage-id-display loading';

    try {
        const id = await fetchStageId(cDate, cTime, courseObj.prefix);
        if (id) {
            stageIdCache[`${sIdx}_${cIdx}`] = id;
            display.textContent = `✓  ${id}`;
            display.className = 'stage-id-display success';
        } else {
            stageIdCache[`${sIdx}_${cIdx}`] = '';
            display.textContent = '查無結果';
            display.className = 'stage-id-display error';
        }
    } catch (err) {
        stageIdCache[`${sIdx}_${cIdx}`] = '';
        display.textContent = `查詢失敗：${err.message}`;
        display.className = 'stage-id-display error';
    }
}

async function fetchStageId(date, time, prefix) {
    const url = `https://corp.orangeapple.co/sales/audition_status?date=${date}`;
    const result = await chrome.runtime.sendMessage({ type: 'fetchUrl', url });
    if (!result.success) throw new Error(result.error);

    const parser = new DOMParser();
    const doc = parser.parseFromString(result.html, 'text/html');
    const dayOfWeek = getChineseDayOfWeek(date);
    const rows = Array.from(doc.querySelectorAll('table tr'));
    let inSection = false;

    for (const row of rows) {
        const firstTh = row.querySelector('th[colspan="2"]');
        if (firstTh) {
            const text = firstTh.textContent.trim();
            if (text === dayOfWeek) { inSection = true; continue; }
            if (inSection && (text.startsWith('週') || text.includes('合計'))) break;
        }
        if (!inSection || !row.classList.contains('course')) continue;
        const timeTh = row.querySelector('th:first-child');
        const classLink = row.querySelector('th:nth-child(2) a');
        if (timeTh && classLink &&
            timeTh.textContent.trim() === time &&
            classLink.textContent.trim().startsWith(prefix)) {
            return classLink.getAttribute('href').split('/').pop();
        }
    }
    return null;
}

function getChineseDayOfWeek(dateStr) {
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
}

// ── 簡訊範本 Modal ────────────────────────────────────────

function toggleSmsTemplate() {
    const modal = document.getElementById('smsTemplateModal');
    if (modal.classList.contains('show')) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    } else {
        updateSmsTemplate();
        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('show');
    }
}

function updateSmsTemplate() {
    const email = document.querySelector('[name="parentEmail"]')?.value.trim() ?? '';
    const studentCount = parseInt(document.getElementById('studentCount')?.value) || 0;
    const courseReminders = [];

    for (let i = 1; i <= studentCount; i++) {
        const sName = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        const courseCount = parseInt(document.getElementById(`courseCount_${i}`)?.value) || 0;
        for (let j = 1; j <= courseCount; j++) {
            const cTypeSelect = document.querySelector(`[name="courseType_${i}_${j}"]`);
            if (!cTypeSelect) continue;
            const cType = cTypeSelect.value;
            const cAbbr = cTypeSelect.selectedOptions[0]?.dataset.abbr || cType;
            const cDate = document.querySelector(`[name="dateText_${i}_${j}"]`)?.value.trim() ?? '';
            const cTimeSelect = document.querySelector(`[name="timeSlot_${i}_${j}"]`);
            let cTime = cTimeSelect?.value ?? '';
            if (cTime === '其他') cTime = document.getElementById(`timeOther_${i}_${j}`)?.value.trim() ?? '';
            const testType = document.querySelector(`[name="testType_${i}_${j}"]`)?.value ?? '';

            if (sName && cType && cType !== '請選擇課程' && cDate && cTime && cTime !== '請選擇時段') {
                let softwareReminder = '';
                if (cAbbr === 'MC') softwareReminder = '提醒有兩個課程相關軟體，必須在體驗課前先安裝完成。';
                else if (cAbbr === 'RX') softwareReminder = '提醒有三個課程相關軟體，必須在體驗課前先安裝完成。';

                let testReminder = '';
                if (testType && testType !== '不須寄送') {
                    testReminder = `已${testType}，請提醒孩子在體驗前一天完成測驗，以便當天老師依學生程度調整體驗課程內容。`;
                }
                courseReminders.push(`◎ 已為${sName}預約 ${cDate} ${cTime} 線上${cType}體驗課程。${softwareReminder}${testReminder}`);
            }
        }
    }

    const template = `【橘子蘋果】家長您好，已為孩子預約線上體驗課程，並將行前通知信寄至 ${email}。提醒有時信件會被視為垃圾廣告信。

${courseReminders.join('\n')}

小朋友體驗課程50分鐘，結束後緊接著還有線上家長說明會(15~20分鐘)詳細介紹課程，請家長務必撥冗參加。謝謝。

若沒收到行前通知信、或有任何問題、或有事要更改體驗課時段，歡迎加入橘子蘋果線上課程官方帳號： https://oaoa.fun/6qhv3g ，加入後須主動傳訊才會看到您的好友唷！謝謝。`;

    const el = document.getElementById('smsTemplateText');
    if (el) el.value = template.trim();
}

// ── 聯絡紀錄 Modal ────────────────────────────────────────

async function toggleRedDotRecord() {
    const modal = document.getElementById('redDotModal');
    if (modal.classList.contains('show')) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    } else {
        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('show');
        const container = document.getElementById('redDotBlocksContainer');
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">載入中，查詢場次ID…</div>';
        await generateRedDotRecord();
    }
}

async function generateRedDotRecord() {
    const container = document.getElementById('redDotBlocksContainer');
    if (!container) return;
    container.innerHTML = '';

    const studentCount = parseInt(document.getElementById('studentCount')?.value) || 0;
    let allCourses = [];

    for (let i = 1; i <= studentCount; i++) {
        const sName = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        let sGrade = document.querySelector(`[name="studentGrade_${i}"]`)?.value ?? '';
        if (sGrade === '其他') sGrade = document.getElementById(`studentGradeOther_${i}`)?.value.trim() ?? '其他';
        const courseCount = parseInt(document.getElementById(`courseCount_${i}`)?.value) || 0;

        for (let j = 1; j <= courseCount; j++) {
            const cTypeSelect = document.querySelector(`[name="courseType_${i}_${j}"]`);
            if (!cTypeSelect) continue;
            const cType = cTypeSelect.value;
            const cAbbr = cTypeSelect.selectedOptions[0]?.dataset.abbr || cType;
            const cDate = document.querySelector(`[name="dateText_${i}_${j}"]`)?.value.trim() ?? '';
            const cTimeSelect = document.querySelector(`[name="timeSlot_${i}_${j}"]`);
            let cTime = cTimeSelect?.value ?? '';
            if (cTime === '其他') cTime = document.getElementById(`timeOther_${i}_${j}`)?.value.trim() ?? '';
            const testType = document.querySelector(`[name="testType_${i}_${j}"]`)?.value ?? '';

            if (sName && sGrade && sGrade !== '請選擇年級' && cType && cDate && cTime && cTime !== '請選擇時段') {
                allCourses.push({ sName, sGrade, cType, cAbbr, cDate, cTime, testType, sIdx: i, cIdx: j });
            }
        }
    }

    allCourses.sort((a, b) => {
        if (a.sIdx !== b.sIdx) return a.sIdx - b.sIdx;
        if (a.cDate !== b.cDate) return a.cDate.localeCompare(b.cDate);
        return a.cTime.localeCompare(b.cTime);
    });

    // 並行查詢所有場次 ID
    const stageIdResults = await Promise.all(allCourses.map(async c => {
        const key = `${c.sIdx}_${c.cIdx}`;
        if (stageIdCache[key]) return stageIdCache[key];
        const courseObj = configData?.trialCourses.find(tc => tc.name === c.cType);
        if (!courseObj?.prefix || !c.cDate || !c.cTime) return '';
        try {
            const id = await fetchStageId(c.cDate, c.cTime, courseObj.prefix);
            if (id) stageIdCache[key] = id;
            return id || '';
        } catch { return ''; }
    }));

    const createBlock = (title, content, id) => {
        const block = document.createElement('div');
        block.className = 'form-group';
        block.style.marginBottom = '20px';
        block.innerHTML = `
            <label style="color: var(--primary-color); font-weight: bold;">${title}</label>
            <textarea id="${id}" rows="8" style="background-color: var(--required-filled); border: 1.5px solid var(--border-color);"></textarea>
            <button class="copy-btn" data-copy-target="${id}">
                <span class="material-symbols-outlined" style="font-size: 18px">content_copy</span>
                複製內容
            </button>
        `;
        container.appendChild(block);
        const textArea = document.getElementById(id);
        if (textArea) textArea.value = content;
    };

    const isSingle = studentCount === 1;

    // 學員摘要
    let sSummaries = [];
    for (let i = 1; i <= studentCount; i++) {
        const sName = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        let sGrade = document.querySelector(`[name="studentGrade_${i}"]`)?.value ?? '';
        if (sGrade === '其他') sGrade = document.getElementById(`studentGradeOther_${i}`)?.value.trim() ?? '其他';
        if (sName || (sGrade && sGrade !== '請選擇年級')) {
            sSummaries.push(`${sGrade === '請選擇年級' ? '' : sGrade}${sName}`);
        }
    }
    const studentSummaryLine = sSummaries.length > 0
        ? (isSingle ? sSummaries[0] + '。' : sSummaries.join('；') + '。')
        : '';

    // 綜合預約課程
    const validCourses = allCourses.filter(c => c.sName && c.sGrade && c.cType && c.cDate && c.cTime);
    let combinedCoursesText = '';
    if (isSingle && validCourses.length > 0) {
        combinedCoursesText = `${validCourses[0].sGrade}${validCourses[0].sName} ` +
            validCourses.map(c => `${c.cDate} ${c.cTime} ${c.cAbbr}`).join('；');
    } else if (!isSingle) {
        const parts = [];
        for (let i = 1; i <= studentCount; i++) {
            const sc = validCourses.filter(c => c.sIdx === i);
            if (sc.length > 0) parts.push(`${sc[0].sGrade}${sc[0].sName} ` + sc.map(c => `${c.cDate} ${c.cTime} ${c.cAbbr}`).join('；'));
        }
        if (parts.length > 0) combinedCoursesText = parts.join('。');
    }

    // 綜合經驗
    let expParts = [];
    for (let i = 1; i <= studentCount; i++) {
        const sName = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        let sGrade = document.querySelector(`[name="studentGrade_${i}"]`)?.value ?? '';
        if (sGrade === '其他') sGrade = document.getElementById(`studentGradeOther_${i}`)?.value.trim() ?? '其他';
        const gradeLabel = sGrade === '請選擇年級' ? '' : sGrade;
        const courseCount = parseInt(document.getElementById(`courseCount_${i}`)?.value) || 0;
        if (sName || (sGrade && sGrade !== '請選擇年級') || courseCount > 0) {
            let sExps = [];
            for (let j = 1; j <= courseCount; j++) {
                const cExps = [
                    document.getElementById(`progText_${i}_${j}`)?.value.trim(),
                    document.getElementById(`mathText_${i}_${j}`)?.value.trim(),
                    document.getElementById(`gameText_${i}_${j}`)?.value.trim(),
                ].filter(Boolean);
                if (cExps.length > 0) sExps.push(cExps.join('、'));
            }
            if (sExps.length > 0) expParts.push({ prefix: `${gradeLabel}${sName}`, content: sExps.join('；') });
        }
    }
    const combinedExperiencesText = isSingle
        ? (expParts[0]?.content ?? '')
        : expParts.map(e => `${e.prefix} ${e.content}`).join('。');

    // 綜合測驗寄送
    let testSentParts = [];
    for (let i = 1; i <= studentCount; i++) {
        const sName = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        let sGrade = document.querySelector(`[name="studentGrade_${i}"]`)?.value ?? '';
        if (sGrade === '其他') sGrade = document.getElementById(`studentGradeOther_${i}`)?.value.trim() ?? '其他';
        const gradeLabel = sGrade === '請選擇年級' ? '' : sGrade;
        const courseCount = parseInt(document.getElementById(`courseCount_${i}`)?.value) || 0;
        const sTests = [];
        for (let j = 1; j <= courseCount; j++) {
            const t = document.querySelector(`[name="testType_${i}_${j}"]`)?.value ?? '';
            if (t && t !== '不須寄送') sTests.push(t);
        }
        if (sTests.length > 0) testSentParts.push({ prefix: `${gradeLabel}${sName}`, test: sTests.join('；') });
    }
    const combinedTestSentText = isSingle
        ? (testSentParts[0] ? testSentParts[0].test + '。' : '')
        : (testSentParts.length > 0 ? testSentParts.map(t => `${t.prefix} ${t.test}`).join('。') + '。' : '');

    // 聯絡人稱謂
    let actualParentTitle = document.querySelector('[name="parentTitle"]')?.value ?? '';
    if (actualParentTitle === '其他') actualParentTitle = document.getElementById('parentTitleOther')?.value.trim() ?? '';

    const validStudentNames = [];
    for (let i = 1; i <= studentCount; i++) {
        const n = document.querySelector(`[name="studentName_${i}"]`)?.value.trim() ?? '';
        if (n) validStudentNames.push(n);
    }
    let combinedContactName = '';
    if (actualParentTitle && validStudentNames.length > 0) {
        combinedContactName = validStudentNames.length === 1
            ? `${validStudentNames[0]}${actualParentTitle}`
            : `${validStudentNames.join('、')} ${actualParentTitle}`;
    }

    // ── 綜合聯絡紀錄 ──
    const motivation = getValue('[name="leaveMotivation"]', 'leaveMotivationOther');
    const equipment = getValue('[name="equipmentType"]', 'equipmentOther');
    const network = getValue('[name="networkType"]', 'networkOther');
    const os = getValue('[name="osType"]', 'osOther');
    const decision = getValue('[name="decisionMaker"]', 'decisionMakerOther');
    const briefing = getValue('[name="briefingAttend"]', 'briefingAttendOther');
    const price = getValue('[name="priceReaction"]', 'priceReactionOther');
    const level = getValue('[name="customerLevel"]');
    const parentPhone = document.querySelector('[name="parentPhone"]')?.value.trim() ?? '';
    const parentEmail = document.querySelector('[name="parentEmail"]')?.value.trim() ?? '';
    const allNotes = collectAllNotes();

    {
        const lines = [];
        const addLine = (prefix, content, suffix = '。') => {
            if (content?.trim()) lines.push(`${prefix}${content}${suffix}`);
        };
        addLine('① 年級+體驗時間/課程：', combinedCoursesText);
        addLine('② 動機：', motivation);
        addLine('③ 經驗：', combinedExperiencesText, combinedExperiencesText.endsWith('。') ? '' : (combinedExperiencesText ? '。' : ''));
        addLine('④ 桌/筆+有無Wifi：', (equipment || network) ? `${equipment}${network ? '＋' + network : ''}` : '');
        addLine('⑤ Mac/Windows：', os);
        addLine('⑥ 決策者：', decision);
        addLine('⑦ 出席家長：', briefing);
        addLine('⑧ 報價反應：', price);
        addLine('⑨ A/B/C：', level);
        if (combinedTestSentText || allNotes.length > 0) {
            lines.push('⑩ 其他備註：');
            if (combinedTestSentText) lines.push(combinedTestSentText);
            if (allNotes.length > 0) lines.push(allNotes.join('\n'));
        }
        let body = studentSummaryLine ? studentSummaryLine + '\n' : '';
        body += lines.join('\n');
        const contactInfo = [];
        if (parentEmail) contactInfo.push(`家長Email：${parentEmail}。`);
        if (parentPhone) contactInfo.push(`家長電話：${parentPhone}。`);
        if (contactInfo.length > 0) body += '\n\n---\n' + contactInfo.join('\n');
        createBlock('聯絡紀錄', body.trim(), 'redDotText_combined');
    }

    // ── 個別課程聯絡紀錄 ──
    allCourses.forEach((c, idx) => {
        const lines = [];
        const addLine = (prefix, content, suffix = '。') => {
            if (content?.trim()) lines.push(`${prefix}${content}${suffix}`);
        };

        addLine('① 年級+體驗時間/課程：', `${c.sGrade}${c.sName} ${c.cDate} ${c.cTime} ${c.cAbbr}`);
        addLine('② 動機：', motivation);

        const expStrs = [
            document.getElementById(`progText_${c.sIdx}_${c.cIdx}`)?.value.trim(),
            document.getElementById(`mathText_${c.sIdx}_${c.cIdx}`)?.value.trim(),
            document.getElementById(`gameText_${c.sIdx}_${c.cIdx}`)?.value.trim(),
        ].filter(Boolean);
        addLine('③ 經驗：', expStrs.join('、'));
        addLine('④ 桌/筆+有無Wifi：', (equipment || network) ? `${equipment}${network ? '＋' + network : ''}` : '');
        addLine('⑤ Mac/Windows：', os);
        addLine('⑥ 決策者：', decision);
        addLine('⑦ 出席家長：', briefing);
        addLine('⑧ 報價反應：', price);
        addLine('⑨ A/B/C：', level);

        const noteLines = [];
        if (c.testType && c.testType !== '不須寄送') noteLines.push(c.testType + '。');
        if (allNotes.length > 0) noteLines.push(allNotes.join('\n'));
        if (allCourses.length > 1 && combinedCoursesText) noteLines.push(combinedCoursesText);
        if (noteLines.length > 0) {
            lines.push('⑩ 其他備註：');
            lines.push(noteLines.join('\n'));
        }

        let body = lines.join('\n');

        const courseObj = configData?.trialCourses.find(tc => tc.name === c.cType);
        const stageId = stageIdResults[idx] || '';
        const contactInfo = [];
        if (parentEmail) contactInfo.push(`家長Email：${parentEmail}。`);
        if (parentPhone) contactInfo.push(`家長電話：${parentPhone}。`);
        if (c.sName) contactInfo.push(`dt_admission_student_attributes_name: ${c.sName}`);
        if (c.sGrade && c.sGrade !== '請選擇年級') contactInfo.push(`dt_admission_student_attributes_grade: ${c.sGrade}`);
        contactInfo.push(`dt_admission_stage_id-selectized: ${stageId}`);
        if (courseObj?.full) contactInfo.push(`dt_admission_course_id: ${courseObj.full}`);
        contactInfo.push(`dt_admission_total_times: 1`);
        if (combinedContactName) contactInfo.push(`dt_admission_contact_name: ${combinedContactName}`);
        if (parentEmail) contactInfo.push(`dt_admission_contact_email: ${parentEmail}`);
        if (courseObj?.price) contactInfo.push(`dt_admission_price: ${courseObj.price}`);
        contactInfo.push(`dt_admission_plan: 自訂價`);
        if (contactInfo.length > 0) body += '\n\n---\n' + contactInfo.join('\n');

        createBlock(`${c.sGrade}${c.sName} ${c.cType}`, body.trim(), `redDotText_${idx}`);
    });
}

// ── 共用輔助 ──────────────────────────────────────────────

function getValue(selector, otherId = null) {
    const el = document.querySelector(selector);
    if (!el) return '';
    let val = el.value;
    if (val === '其他' && otherId) val = document.getElementById(otherId)?.value.trim() ?? '';
    const placeholders = ['請選擇內容', '請選擇動機', '請選擇設備', '請選擇網路', '請選擇系統',
        '請選擇出席狀況', '請選擇報價反應', '請選擇決策者', '請選擇預約與否', '請選擇客戶等級'];
    return placeholders.includes(val) ? '' : val;
}

function collectAllNotes() {
    const allNotes = [];
    const gather = name => {
        const val = document.querySelector(`[name="${name}"]`)?.value.trim() ?? '';
        if (val) allNotes.push(val);
    };
    gather('parentNote');
    gather('equipmentNote');
    const studentCount = parseInt(document.getElementById('studentCount')?.value) || 0;
    for (let i = 1; i <= studentCount; i++) {
        gather(`studentNote_${i}`);
        const courseCount = parseInt(document.getElementById(`courseCount_${i}`)?.value) || 0;
        for (let j = 1; j <= courseCount; j++) gather(`courseNote_${i}_${j}`);
    }
    gather('mainNote');
    return allNotes;
}

async function copyToClipboard(elementId, btn) {
    const textArea = document.getElementById(elementId);
    if (!textArea) return;
    try {
        await navigator.clipboard.writeText(textArea.value);
        const originalHTML = btn.innerHTML;
        const originalBG = btn.style.backgroundColor;
        btn.innerHTML = '<span class="material-symbols-outlined">check</span> 已複製';
        btn.style.backgroundColor = '#4caf50';
        setTimeout(() => { btn.innerHTML = originalHTML; btn.style.backgroundColor = originalBG; }, 2000);
    } catch {
        alert('複製失敗，請手動選取複製');
    }
}

// ── 版本資訊 ──────────────────────────────────────────────

function initVersionFooter() {
    const headerInfo = document.getElementById('headerVersionInfo');
    if (headerInfo) {
        const lastMod = new Date(document.lastModified);
        const pad = n => n.toString().padStart(2, '0');
        const { getFullYear: y, getMonth: mo, getDate: d, getHours: h, getMinutes: mi, getSeconds: s } = Object.getPrototypeOf(lastMod);
        headerInfo.textContent = `最後修改時間：${lastMod.getFullYear()}-${pad(lastMod.getMonth() + 1)}-${pad(lastMod.getDate())} ${pad(lastMod.getHours())}:${pad(lastMod.getMinutes())}:${pad(lastMod.getSeconds())}`;
    }

    const footer = document.getElementById('versionFooter');
    if (!footer) return;
    const nav = document.querySelector('.sticky-nav');
    const navHeight = nav ? nav.offsetHeight : 60;
    const noteCard = document.getElementById('noteCard');
    if (!noteCard) return;
    const viewportH = window.innerHeight;
    let requiredHeight = viewportH - navHeight - 10 - noteCard.offsetHeight - 20;
    if (requiredHeight < 10) requiredHeight = 10;
    footer.style.height = `${requiredHeight}px`;
    footer.style.marginTop = '20px';
}

// ── Event Delegation ──────────────────────────────────────

document.addEventListener('click', function (e) {
    // Number step buttons
    const stepBtn = e.target.closest('[data-step-target]');
    if (stepBtn) {
        stepNumber(stepBtn.dataset.stepTarget, parseInt(stepBtn.dataset.stepDelta));
        return;
    }

    // Stage ID lookup
    const stageBtn = e.target.closest('[data-lookup-stage]');
    if (stageBtn) {
        lookupStageId(stageBtn.dataset.sidx, stageBtn.dataset.cidx);
        return;
    }

    // Date picker trigger
    const datePickerBtn = e.target.closest('[data-date-picker]');
    if (datePickerBtn) {
        const next = datePickerBtn.nextElementSibling;
        if (next?.type === 'date') next.showPicker?.();
        return;
    }

    // Copy buttons
    const copyBtn = e.target.closest('[data-copy-target]');
    if (copyBtn) {
        copyToClipboard(copyBtn.dataset.copyTarget, copyBtn);
        return;
    }

    // Quick note buttons
    const quickNoteBtn = e.target.closest('.quick-note-btn');
    if (quickNoteBtn) {
        const textarea = document.querySelector('[name="mainNote"]');
        if (textarea) {
            const appendText = quickNoteBtn.dataset.quickNoteText;
            textarea.value = textarea.value
                ? textarea.value + '\n' + appendText
                : appendText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
    }

    // FABs
    if (e.target.closest('#callRecordBtn')) { toggleRedDotRecord(); return; }
    if (e.target.closest('#smsTemplateBtn')) { toggleSmsTemplate(); return; }
});

// Modal backdrop click
document.getElementById('smsTemplateModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) toggleSmsTemplate();
});
document.getElementById('redDotModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) toggleRedDotRecord();
});
document.getElementById('closeSmsModal').addEventListener('click', toggleSmsTemplate);
document.getElementById('closeRedDotModal').addEventListener('click', toggleRedDotRecord);

// Form input (bubbles from dynamic cards too)
const form = document.getElementById('appointmentForm');

form.addEventListener('input', function (e) {
    const el = e.target;
    const card = el.closest('.card');

    if (el.id === 'studentCount') syncStudentCards();

    const ccMatch = el.id?.match(/^courseCount_(\d+)$/);
    if (ccMatch) syncCourseCards(parseInt(ccMatch[1]));

    const snMatch = el.name?.match(/^studentName_(\d+)$/);
    if (snMatch) updateStudentHeader(parseInt(snMatch[1]));

    const goMatch = el.id?.match(/^studentGradeOther_(\d+)$/);
    if (goMatch) updateStudentHeader(parseInt(goMatch[1]));

    if (el.id?.match(/^(prog|math|game)Text_/)) clearExpSelect(el);

    if (card?.id) validateCard(card.id);
});

form.addEventListener('change', function (e) {
    const el = e.target;
    const card = el.closest('.card');

    if (el.dataset.otherId) handleDropdownOther(el, el.dataset.otherId);
    if (el.dataset.expTarget) syncExp(el, el.dataset.expTarget);
    if (el.dataset.syncDate) syncDate(el, el.dataset.syncDate);

    const sgMatch = el.name?.match(/^studentGrade_(\d+)$/);
    if (sgMatch) {
        handleDropdownOther(el, `studentGradeOther_${sgMatch[1]}`);
        updateStudentHeader(parseInt(sgMatch[1]));
    }

    const ctMatch = el.name?.match(/^courseType_(\d+)_(\d+)$/);
    if (ctMatch) updateCourseHeader(parseInt(ctMatch[1]), parseInt(ctMatch[2]));

    if (card?.id) validateCard(card.id);
});

// blur 需用 capture 模式（blur 不 bubble）
form.addEventListener('blur', function (e) {
    if (e.target.hasAttribute('data-format-date')) {
        formatDateInput(e.target);
        const card = e.target.closest('.card');
        if (card?.id) validateCard(card.id);
    }
}, true);

// ── 初始化 ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    initVersionFooter();
});

window.addEventListener('resize', initVersionFooter);
