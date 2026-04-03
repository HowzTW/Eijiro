// Ayu Songbook - Core Logic
/**
 * ------------------------------------------------------------------
 * 1. 設定與常數
 * ------------------------------------------------------------------
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycby2ws9yM1RTe_8FFOnZvrM5QYBfPoWCYTNjb93AMeJOyXBCr1PWHk6ln5b0Glskdfow5w/exec';

const DOM = {
    splash: document.getElementById('splash'),
    splashDate: document.getElementById('splash-last-updated'),
    main: document.getElementById('main-app'),
    footerDate: document.getElementById('footer-last-updated'),
    
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchSubmitBtn: document.getElementById('search-submit-btn'),
    
    resultsSection: document.getElementById('search-results-section'),
    resultsList: document.getElementById('search-results-list'),
    closeResultsBtn: document.getElementById('close-results-btn'),
    
    songlistContainer: document.getElementById('my-songlist'),
    
    modal: document.getElementById('custom-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalIcon: document.getElementById('modal-icon'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    
    snackbar: document.getElementById('snackbar')
};

/**
 * ------------------------------------------------------------------
 * 2. 初始化與生命週期
 * ------------------------------------------------------------------
 */
window.addEventListener('DOMContentLoaded', () => {
    updateLastModifiedDates();
    setupEventListeners();
    
    // 歡迎畫面淡出邏輯 (4秒或點擊)
    const splashTimeout = setTimeout(dismissSplash, 4000);
    DOM.splash.onclick = () => {
        clearTimeout(splashTimeout);
        dismissSplash();
    };
});

function dismissSplash() {
    DOM.splash.style.opacity = '0';
    setTimeout(() => {
        DOM.splash.classList.add('hidden');
        DOM.main.classList.remove('hidden');
        fetchSonglist(); // 進入主畫面後讀取歌單
    }, 800);
}

function updateLastModifiedDates() {
    const modDate = new Date(document.lastModified);
    const dateStr = formatDateTime(modDate);
    DOM.splashDate.innerText = dateStr;
    DOM.footerDate.innerText = dateStr;
}

function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/**
 * ------------------------------------------------------------------
 * 3. 事件監聽設定
 * ------------------------------------------------------------------
 */
function setupEventListeners() {
    // 搜尋框輸入監聽
    DOM.searchInput.addEventListener('input', () => {
        const val = DOM.searchInput.value;
        const hasText = val.trim().length > 0;
        
        // 切換清除按鈕與執行按鈕狀態
        DOM.searchClearBtn.classList.toggle('hidden', val.length === 0);
        DOM.searchSubmitBtn.disabled = !hasText;
    });

    // 清除按鈕邏輯
    DOM.searchClearBtn.onclick = () => {
        DOM.searchInput.value = '';
        DOM.searchClearBtn.classList.add('hidden');
        DOM.searchSubmitBtn.disabled = true;
        DOM.searchInput.focus();
    };

    // 搜尋按鈕點擊
    DOM.searchSubmitBtn.onclick = handleSearch;

    // 收合結果按鈕
    DOM.closeResultsBtn.onclick = () => {
        DOM.resultsSection.classList.add('hidden-collapsed');
    };

    // 彈窗取消按鈕
    DOM.modalCancelBtn.onclick = closeModal;
}

/**
 * ------------------------------------------------------------------
 * 4. 外部搜尋邏輯 (GAS Proxy)
 * ------------------------------------------------------------------
 */
async function handleSearch() {
    const keyword = DOM.searchInput.value.trim();
    if (!keyword) return;

    // UI 反饋：顯示載入中並展開區塊
    DOM.resultsSection.classList.remove('hidden-collapsed');
    DOM.resultsList.innerHTML = '<div class="loading-spinner">搜尋中，請稍候...</div>';
    DOM.searchSubmitBtn.disabled = true;

    try {
        const response = await fetch(`${GAS_URL}?action=search&keyword=${encodeURIComponent(keyword)}`);
        const result = await response.json();

        if (result.success) {
            renderSearchResults(result.data);
        } else {
            showSnackbar('搜尋失敗：' + result.error);
        }
    } catch (err) {
        showSnackbar('連線錯誤，請檢查網路設定');
    } finally {
        DOM.searchSubmitBtn.disabled = false;
    }
}

function renderSearchResults(songs) {
    if (!songs || songs.length === 0) {
        DOM.resultsList.innerHTML = '<p class="empty-tip">查無結果，換個關鍵字試試看～</p>';
        return;
    }

    DOM.resultsList.innerHTML = '';
    songs.forEach(song => {
        const card = createSongCard(song, 'add');
        DOM.resultsList.appendChild(card);
    });
}

/**
 * ------------------------------------------------------------------
 * 5. 歌單管理邏輯 (CRUD)
 * ------------------------------------------------------------------
 */
async function fetchSonglist() {
    DOM.songlistContainer.innerHTML = '<div class="loading-spinner">歌單讀取中...</div>';
    
    try {
        const response = await fetch(`${GAS_URL}?action=getlist`);
        const result = await response.json();

        if (result.success) {
            renderSonglist(result.data);
        } else {
            DOM.songlistContainer.innerHTML = '<p class="error-text">歌單資料讀取失敗</p>';
        }
    } catch (err) {
        DOM.songlistContainer.innerHTML = '<p class="error-text">網路連線異常</p>';
    }
}

function renderSonglist(songs) {
    if (!songs || songs.length === 0) {
        DOM.songlistContainer.innerHTML = '<p class="empty-tip">目前歌單沒有資料，快搜尋歌曲加入吧！</p>';
        return;
    }

    // 分群排序邏輯：1. 字數短在前 2.同字數依歌名排
    const grouped = {};
    songs.forEach(song => {
        const len = song.name.length;
        if (!grouped[len]) grouped[len] = [];
        grouped[len].push(song);
    });

    // 取得字數排序後的 Key
    const sortedKeys = Object.keys(grouped).sort((a, b) => a - b);
    
    DOM.songlistContainer.innerHTML = '';
    sortedKeys.forEach(len => {
        const groupEl = document.createElement('div');
        groupEl.className = 'song-group';
        groupEl.innerHTML = `<div class="group-header">${len} 字部</div>`;
        
        const itemsEl = document.createElement('div');
        itemsEl.className = 'songlist-items';
        
        // 群組內按歌名排序
        const sortedSongs = grouped[len].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        
        sortedSongs.forEach(song => {
            const card = createSongCard(song, 'delete');
            itemsEl.appendChild(card);
        });
        
        groupEl.appendChild(itemsEl);
        DOM.songlistContainer.appendChild(groupEl);
    });
}

/**
 * ------------------------------------------------------------------
 * 6. UI 元件生成與互動
 * ------------------------------------------------------------------
 */
function createSongCard(song, type) {
    const div = document.createElement('div');
    div.className = 'song-card';
    
    div.innerHTML = `
        <div class="song-info">
            <div class="song-name">${song.name}</div>
            <div class="song-meta">${song.singer} ( ${song.lang} )</div>
            <div class="song-code">編號：${song.code}</div>
        </div>
        <button class="btn-action ${type === 'add' ? 'btn-add' : 'btn-delete'}" title="${type === 'add' ? '加入歌單' : '刪除歌曲'}">
            <span class="material-icons">${type === 'add' ? 'add' : 'delete'}</span>
        </button>
    `;

    const actionBtn = div.querySelector('.btn-action');
    actionBtn.onclick = () => {
        if (type === 'add') {
            confirmAdd(song);
        } else {
            confirmDelete(song);
        }
    };

    return div;
}

function confirmAdd(song) {
    showModal(
        '加入歌單',
        `確定要將《${song.name}》加入您的金嗓歌單嗎？`,
        'add_circle',
        async () => {
            closeModal();
            showSnackbar(`正在加入《${song.name}》...`);
            
            const params = new URLSearchParams({
                action: 'add',
                name: song.name,
                singer: song.singer,
                code: song.code,
                lang: song.lang
            });

            const res = await fetch(`${GAS_URL}?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                showSnackbar('新增成功！');
                fetchSonglist(); // 刷新歌單
            }
        }
    );
}

function confirmDelete(song) {
    showModal(
        '刪除確認',
        `確定要從歌單中刪除《${song.name}》嗎？`,
        'delete_forever',
        async () => {
            closeModal();
            showSnackbar(`正在刪除《${song.name}》...`);
            
            const res = await fetch(`${GAS_URL}?action=delete&code=${song.code}`);
            const data = await res.json();
            if (data.success) {
                showSnackbar('已從歌單移除');
                fetchSonglist(); // 刷新歌單
            }
        }
    );
}

/**
 * ------------------------------------------------------------------
 * 7. 通用 UI 控制
 * ------------------------------------------------------------------
 */
function showModal(title, message, iconName, onConfirm) {
    DOM.modalTitle.innerText = title;
    DOM.modalMessage.innerText = message;
    DOM.modalIcon.innerText = iconName;
    DOM.modalConfirmBtn.onclick = onConfirm;
    DOM.modal.classList.remove('hidden');
}

function closeModal() {
    DOM.modal.classList.add('hidden');
}

function showSnackbar(msg) {
    DOM.snackbar.innerText = msg;
    DOM.snackbar.classList.remove('hidden');
    // 動畫會在 CSS 中淡出
    setTimeout(() => DOM.snackbar.classList.add('hidden'), 3000);
}
