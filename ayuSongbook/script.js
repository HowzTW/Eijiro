// Ayu Songbook - Core Logic
/**
 * ------------------------------------------------------------------
 * 1. 設定與常數
 * ------------------------------------------------------------------
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycby2ws9yM1RTe_8FFOnZvrM5QYBfPoWCYTNjb93AMeJOyXBCr1PWHk6ln5b0Glskdfow5w/exec';

// 全域狀態：已加入資料庫的歌曲編號 (Set)
let addedSongCodes = new Set();

const DOM = {
    splash: document.getElementById('splash'),
    splashDate: document.getElementById('splash-last-updated'),
    header: document.getElementById('header'),
    main: document.getElementById('main-app'),
    footerDate: document.getElementById('footer-last-updated'),
    
    tabsContainer: document.getElementById('songlist-tabs'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchSubmitBtn: document.getElementById('search-submit-btn'),
    
    resultsSection: document.getElementById('search-results-section'),
    resultsList: document.getElementById('search-results-list'),
    closeResultsBtn: document.getElementById('close-results-btn'),
    
    songlistContainer: document.getElementById('my-songlist'),
    reloadBtn: document.getElementById('reload-btn'),
    
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
        DOM.header.classList.remove('hidden');
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
    // 重新整理按鈕
    if (DOM.reloadBtn) {
        DOM.reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

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

    // 清除搜尋結果與輸入框
    DOM.closeResultsBtn.onclick = () => {
        DOM.resultsSection.classList.add('hidden-collapsed');
        DOM.searchInput.value = '';
        DOM.searchClearBtn.classList.add('hidden');
        DOM.searchSubmitBtn.disabled = true;
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
            // 更新已加入編號集合
            addedSongCodes = new Set(result.data.map(song => song.code.toString()));
            renderSonglist(result.data);
            
            // 如果有資料，顯示標籤列
            if (result.data.length > 0) {
                DOM.tabsContainer.classList.remove('hidden-collapsed');
            } else {
                DOM.tabsContainer.classList.add('hidden-collapsed');
            }
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
        DOM.tabsContainer.innerHTML = '';
        return;
    }

    // 分群排序邏輯：1. 字數短在前 2.同字數依歌名排
    const grouped = {};
    songs.forEach(song => {
        const len = song.name.length;
        if (!grouped[len]) grouped[len] = [];
        grouped[len].push(song);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => a - b);
    
    DOM.songlistContainer.innerHTML = '';
    DOM.tabsContainer.innerHTML = '';

    sortedKeys.forEach(len => {
        const groupId = `group-${len}`;
        const groupEl = document.createElement('div');
        groupEl.id = groupId;
        groupEl.className = 'song-group';
        
        // 生成標籤按鈕
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn';
        tabBtn.innerText = `${len} 字部`;
        tabBtn.setAttribute('data-target', groupId);
        tabBtn.onclick = () => scrollToGroup(groupId, tabBtn);
        DOM.tabsContainer.appendChild(tabBtn);

        // 生成群組內容
        groupEl.innerHTML = `<div class="group-header">${len} 字部</div>`;
        const itemsEl = document.createElement('div');
        itemsEl.className = 'songlist-items';
        
        const sortedSongs = grouped[len].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        sortedSongs.forEach(song => {
            itemsEl.appendChild(createSongCard(song, 'delete'));
        });
        
        groupEl.appendChild(itemsEl);
        DOM.songlistContainer.appendChild(groupEl);
    });

    setupScrollSync();
}

/**
 * 跳轉至歌曲分群
 */
function scrollToGroup(groupId, tabBtn) {
    const targetEl = document.getElementById(groupId);
    if (!targetEl) return;

    // 取得 Header 與 Tab Bar 的總高度 (約 72 + 65 = 137px)
    const offset = 140; 
    const elementPosition = targetEl.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });

    // 立即置中圖示標籤
    tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

/**
 * 實作捲動同步監聽 (Scroll Sync)
 */
function setupScrollSync() {
    const groups = document.querySelectorAll('.song-group');
    if (!groups.length) return;

    const observerOptions = {
        root: null,
        rootMargin: '-145px 0px -70% 0px', // 向上偏移 Header + Tab Bar 的空間
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                updateActiveTab(id);
            }
        });
    }, observerOptions);

    groups.forEach(group => observer.observe(group));
}

function updateActiveTab(groupId) {
    const tabs = DOM.tabsContainer.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-target') === groupId) {
            tab.classList.add('active');
            // 將標題標籤自動捲動至中央
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
            tab.classList.remove('active');
        }
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
    
    // 修正：只有在「搜尋結果模式 (add)」下才檢查是否已加入，「我的歌單模式 (delete)」需維持顯示刪除按鈕
    const isAdded = (type === 'add') && addedSongCodes.has(song.code.toString());
    
    div.innerHTML = `
        <div class="song-info">
            <div class="song-name">${song.name} ${isAdded ? '<span class="material-icons" style="font-size:1.25rem; color:#2e7d32; vertical-align:middle;">check_circle</span>' : ''}</div>
            <div class="song-meta">
                <span class="song-singer">${song.singer}</span>
                <span class="song-lang">( ${song.lang} )</span>
            </div>
            <div class="song-code"># ${song.code}</div>
        </div>
        <button class="btn-action ${isAdded ? 'btn-added' : (type === 'add' ? 'btn-add' : 'btn-delete')}" 
                ${isAdded ? 'disabled' : ''} 
                title="${isAdded ? '已在歌單中' : (type === 'add' ? '加入歌單' : '刪除歌曲')}">
            <span class="material-icons">${isAdded ? 'check_circle' : (type === 'add' ? 'add' : 'delete')}</span>
        </button>
    `;

    const actionBtn = div.querySelector('.btn-action');
    actionBtn.onclick = () => {
        if (isAdded) return;
        if (type === 'add') {
            confirmAdd(song, actionBtn);
        } else {
            confirmDelete(song);
        }
    };

    return div;
}

function confirmAdd(song, btn) {
    showModal(
        '加入歌單',
        `確定要將《${song.name}》加入您的金嗓歌單嗎？`,
        'add_circle',
        async () => {
            closeModal();
            
            // 方案 C：進入處理中狀態 (沙漏翻轉)
            btn.disabled = true;
            btn.classList.remove('btn-add');
            btn.classList.add('btn-loading');
            btn.querySelector('span').innerText = 'hourglass_empty';
            
            showSnackbar(`正在加入《${song.name}》...`);
            
            const params = new URLSearchParams({
                action: 'add',
                name: song.name,
                singer: song.singer,
                code: song.code,
                lang: song.lang
            });

            try {
                const res = await fetch(`${GAS_URL}?${params.toString()}`);
                const data = await res.json();
                if (data.success) {
                    // 方案二：轉為已加入狀態 (綠色勾選)
                    btn.classList.remove('btn-loading');
                    btn.classList.add('btn-added');
                    btn.querySelector('span').innerText = 'check_circle';
                    btn.title = '已在歌單中';
                    
                    addedSongCodes.add(song.code.toString());
                    showSnackbar('新增成功！');
                    fetchSonglist(); // 刷新背景歌單
                } else {
                    // 失敗還原
                    btn.disabled = false;
                    btn.classList.add('btn-add');
                    btn.classList.remove('btn-loading');
                    btn.querySelector('span').innerText = 'add';
                    showSnackbar('新增失敗：' + data.error);
                }
            } catch (err) {
                btn.disabled = false;
                btn.classList.add('btn-add');
                btn.classList.remove('btn-loading');
                btn.querySelector('span').innerText = 'add';
                showSnackbar('連線超時，請稍後再試');
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
