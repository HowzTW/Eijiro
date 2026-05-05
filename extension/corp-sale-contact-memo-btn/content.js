/**
 * OA 聯絡記錄快速填入按鈕
 *
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 * 當 #remote_modal 內的聯絡記錄表單出現時，
 * 在「確認送出」按鈕下方注入快速填入按鈕群。
 */

(function () {
  const MODAL_SELECTOR = '#remote_modal';
  const FORM_SELECTOR  = 'form[action*="/logs"]';
  const SUBMIT_SELECTOR = 'input[type="submit"][name="commit"]';
  const TEXTAREA_SELECTOR = 'textarea[name="potential_student_log[content]"]';
  const INJECTED_ATTR = 'data-oa-memo-injected';

  function injectMemoButtons(form) {
    if (form.hasAttribute(INJECTED_ATTR)) return;
    form.setAttribute(INJECTED_ATTR, 'true');

    const submitBtn = form.querySelector(SUBMIT_SELECTOR);
    const textarea  = form.querySelector(TEXTAREA_SELECTOR);
    if (!submitBtn || !textarea) return;

    const group = document.createElement('div');
    group.className = 'oa-memo-btn-group';

    OA_MEMO_BUTTONS.forEach(({ label, text }) => {
      const btn = document.createElement('button');
      btn.className = 'oa-memo-btn';
      btn.type = 'button';
      btn.textContent = label;
      btn.title = text;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        textarea.value += text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      });

      group.appendChild(btn);
    });

    // 插入在「確認送出」按鈕之後
    submitBtn.insertAdjacentElement('afterend', group);
  }

  function checkModal() {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (!modal) return;
    const form = modal.querySelector(FORM_SELECTOR);
    if (form) injectMemoButtons(form);
  }

  // 監聽 #remote_modal 內容變化（Turbo Frame 載入）
  const observer = new MutationObserver(checkModal);
  observer.observe(document.body, { childList: true, subtree: true });

  // 初次檢查（若 modal 已存在）
  checkModal();

  console.log('[OA Memo Extension] 載入成功');
})();
