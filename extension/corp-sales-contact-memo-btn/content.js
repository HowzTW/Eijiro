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

  function getEmailFromForm(form) {
    const match = form.action.match(/\/potential_students\/(\d+)\//);
    if (!match) return null;
    const id = match[1];
    const el = document.querySelector(`[data-email][data-id="${id}"]`);
    if (!el) return null;
    // change_email() 只更新 innerHTML 不更新 data-email，優先取可見文字
    const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const visible = textNode?.textContent?.trim();
    const email = (visible && /.+@.+\..+/.test(visible)) ? visible : el.getAttribute('data-email');
    return (email && /.+@.+\..+/.test(email)) ? email : null;
  }

  function injectMemoButtons(form) {
    if (form.hasAttribute(INJECTED_ATTR)) return;
    form.setAttribute(INJECTED_ATTR, 'true');

    const submitBtn = form.querySelector(SUBMIT_SELECTOR);
    const textarea  = form.querySelector(TEXTAREA_SELECTOR);
    if (!submitBtn || !textarea) return;

    const group = document.createElement('div');
    group.className = 'oa-memo-btn-group';

    const email = getEmailFromForm(form);
    if (email) {
      const btn = document.createElement('button');
      btn.className = 'oa-memo-btn';
      btn.type = 'button';
      btn.textContent = 'Email';
      btn.title = email;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        textarea.value += email;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      });
      group.appendChild(btn);
    }

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
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 初次檢查（若 modal 已存在）
  checkModal();

  console.log('[OA Memo Extension] 載入成功');
})();
