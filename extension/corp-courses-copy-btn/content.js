/**
 * OrangeApple 教室名稱複製按鈕
 * 在 corp.orangeapple.co/courses/dt/* 頁面的麵包屑導覽後，
 * 新增一個「複製」按鈕，將最後一段教室名稱複製到剪貼簿。
 *
 * 實際 DOM 結構（breadcrumb 無專屬 class）：
 *   <div class="content">
 *     <div>                              ← breadcrumb 容器（無 class）
 *       ...
 *       <a href="/">總覽</a>
 *       " > "                            ← text node
 *       <a href="/courses/dt/remote">遠端課程</a>
 *       " > 遠距教學_體驗A教室 - ..."    ← text node（教室名稱在此）
 *       <h2>節次資訊</h2>
 *       ...
 *     </div>
 *   </div>
 */

(function () {
  const STYLE_ID = 'oa-copy-style';

  // ── 注入 Material Icons ──────────────────────────────────────────────────
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  // ── 注入樣式 ─────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .oa-copy-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        margin: 0 8px !important;
        padding: 3px 10px !important;
        background-color: #e67e22 !important; /* 強制橘色 */
        color: #ffffff !important;           /* 強制白色文字 */
        border-radius: 4px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        border: none !important;
        vertical-align: middle !important;
        line-height: 1.5 !important;
        transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
      }
      .oa-copy-btn:hover {
        background-color: #d35400 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4) !important;
      }
      .oa-copy-btn:active {
        transform: scale(0.97) !important;
      }
      .oa-copy-icon {
        font-size: 16px !important;
        line-height: 1 !important;
      }
      .oa-copy-btn.is-success {
        background-color: #27ae60 !important; /* 成功時暫時變綠色 */
      }
    `;
    document.head.appendChild(style);
  }

  function injectCopyButton() {
    // 避免重複插入
    if (document.getElementById('oa-copy-btn')) return;

    injectStyles();

    // 在 .content 區塊中找文字為「遠端課程」的 <a> 標籤
    const contentDiv = document.querySelector('.content');
    if (!contentDiv) return;

    const remoteLink = Array.from(contentDiv.querySelectorAll('a')).find(
      a => a.textContent.trim() === '遠端課程'
    );
    if (!remoteLink) return;

    const breadcrumbParent = remoteLink.parentElement;
    if (!breadcrumbParent) return;

    // 走訪 childNodes（含 text node），找「遠端課程」link 之後的第一個非空 text node
    const childNodes = Array.from(breadcrumbParent.childNodes);
    const remoteLinkIndex = childNodes.indexOf(remoteLink);
    if (remoteLinkIndex === -1) return;

    let classroomTextNode = null;
    for (let i = remoteLinkIndex + 1; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
        classroomTextNode = node;
        break;
      }
    }
    if (!classroomTextNode) return;

    // 從 text node 擷取教室名稱，並切割 Text Node 以便讓按鈕插入中間
    const rawText = classroomTextNode.textContent;
    const gtIndex = rawText.lastIndexOf('>');
    if (gtIndex >= 0) {
      // 在 > 之後切開，classroomTextNode 會保留 " > "，其後的新節點才是教室名稱
      classroomTextNode.splitText(gtIndex + 1);
    }

    const classroomName = gtIndex >= 0
      ? rawText.substring(gtIndex + 1).trim()
      : rawText.trim();
    if (!classroomName) return;

    // 建立複製按鈕
    const btn = document.createElement('a');
    btn.id = 'oa-copy-btn';
    btn.className = 'oa-copy-btn';
    btn.innerHTML = `<span class="material-icons oa-copy-icon">content_copy</span><span class="oa-copy-label">複製</span>`;
    btn.title = `複製：${classroomName}`;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(classroomName);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = classroomName;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      // 成功回饋
      const labelSpan = btn.querySelector('.oa-copy-label');
      const iconSpan = btn.querySelector('.oa-copy-icon');
      const originalText = labelSpan.textContent;
      const originalIcon = iconSpan.textContent;

      btn.classList.add('is-success');
      labelSpan.textContent = '已複製！';
      iconSpan.textContent = 'check';

      setTimeout(() => {
        btn.classList.remove('is-success');
        labelSpan.textContent = originalText;
        iconSpan.textContent = originalIcon;
      }, 2000);
    });

    // 插入到 " > " 之後，教室名稱之前
    classroomTextNode.after(btn);
    console.log('[OA Copy Btn] 已插入複製按鈕，教室名稱：', classroomName);
  }

  // 用 MutationObserver 監聽 SPA 動態渲染（Turbo / Hotwire）
  const observer = new MutationObserver(() => {
    injectCopyButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 頁面載入時立即嘗試
  injectCopyButton();
})();
