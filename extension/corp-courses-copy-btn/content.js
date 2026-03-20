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
  function injectCopyButton() {
    // 避免重複插入
    if (document.getElementById('oa-copy-btn')) return;

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

    // 從 text node 擷取教室名稱（去掉前面的 " > "）
    const rawText = classroomTextNode.textContent;
    const gtIndex = rawText.lastIndexOf('>');
    const classroomName = gtIndex >= 0
      ? rawText.substring(gtIndex + 1).trim()
      : rawText.trim();
    if (!classroomName) return;

    // 建立複製按鈕
    const btn = document.createElement('button');
    btn.id = 'oa-copy-btn';
    btn.textContent = '複製';
    btn.title = `複製：${classroomName}`;
    btn.style.cssText = `
      margin-left: 10px;
      padding: 2px 10px;
      font-size: 12px;
      cursor: pointer;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      vertical-align: middle;
      line-height: 1.5;
    `;

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(classroomName);
      } catch (_) {
        // fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = classroomName;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btn.textContent = '✓ 已複製！';
      btn.style.backgroundColor = '#2196F3';
      setTimeout(() => {
        btn.textContent = '複製';
        btn.style.backgroundColor = '#4CAF50';
      }, 2000);
    });

    // 插入到教室名稱 text node 之後
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
