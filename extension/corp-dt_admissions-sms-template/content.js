(function () {
  const TEMPLATE = '家長您好，歡迎加入橘子蘋果線上課程官方帳號，加入後須主動傳訊息才會看到您的好友唷！謝謝：https://oaoa.fun/6qhv3g';
  const BTN_ATTR = 'data-line-sms-injected';
  const DIALOG_ID = 'line-sms-confirm-dialog';

  function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content;
  }

  function getPhone() {
    return document.querySelector('#admission-contact-phone')?.textContent.trim() || '（找不到電話）';
  }

  function ensureDialog() {
    if (document.getElementById(DIALOG_ID)) return;

    const dialog = document.createElement('dialog');
    dialog.id = DIALOG_ID;
    dialog.style.cssText = `
      border: none; border-radius: 8px; padding: 24px; max-width: 420px; width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18); font-family: sans-serif; font-size: 14px;
    `;
    dialog.innerHTML = `
      <style>
        #${DIALOG_ID}::backdrop { background: rgba(0,0,0,0.45); }
        #${DIALOG_ID} h4 { margin: 0 0 16px; font-size: 16px; }
        #${DIALOG_ID} .sms-field { margin-bottom: 12px; }
        #${DIALOG_ID} .sms-label { color: #888; font-size: 12px; margin-bottom: 4px; }
        #${DIALOG_ID} .sms-value { background: #f5f5f5; border-radius: 4px; padding: 8px 10px; word-break: break-all; }
        #${DIALOG_ID} #sms-dialog-content { width: 100%; box-sizing: border-box; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; font-size: 14px; font-family: sans-serif; resize: vertical; }
        #${DIALOG_ID} .sms-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
        #${DIALOG_ID} button { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        #${DIALOG_ID} #sms-cancel-btn { background: #e0e0e0; color: #333; }
        #${DIALOG_ID} #sms-confirm-btn { background: #28a745; color: #fff; }
        #${DIALOG_ID} #sms-cancel-btn:hover { background: #ccc; }
        #${DIALOG_ID} #sms-confirm-btn:hover:not(:disabled) { background: #218838; }
        #${DIALOG_ID} #sms-confirm-btn:disabled { background: #a5d6a7; cursor: not-allowed; }
      </style>
      <h4>確認發送 LINE@ 簡訊</h4>
      <div class="sms-field">
        <div class="sms-label">電話號碼</div>
        <div class="sms-value" id="sms-dialog-phone"></div>
      </div>
      <div class="sms-field">
        <div class="sms-label">簡訊內容</div>
        <textarea id="sms-dialog-content" rows="4"></textarea>
      </div>
      <div class="sms-actions">
        <button id="sms-cancel-btn">取消</button>
        <button id="sms-confirm-btn">確認送出</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  function showConfirmDialog(phone, onConfirm) {
    ensureDialog();
    const dialog = document.getElementById(DIALOG_ID);
    document.getElementById('sms-dialog-phone').textContent = phone;

    const textarea = document.getElementById('sms-dialog-content');
    textarea.value = TEMPLATE;

    const cancelBtn = document.getElementById('sms-cancel-btn');
    const confirmBtn = document.getElementById('sms-confirm-btn');
    confirmBtn.disabled = false;

    textarea.addEventListener('input', () => {
      confirmBtn.disabled = textarea.value.trim() === '';
    });

    function cleanup() {
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm2);
    }
    function onCancel() { cleanup(); dialog.close(); }
    function onConfirm2() { cleanup(); dialog.close(); onConfirm(textarea.value); }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm2);
    dialog.showModal();
  }

  function injectButton(anchor) {
    if (anchor.hasAttribute(BTN_ATTR)) return;
    anchor.setAttribute(BTN_ATTR, '1');

    const admissionId = anchor.dataset.admissionId;
    if (!admissionId) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-success btn-xs ms-1';
    btn.textContent = '發送LINE@簡訊';

    btn.addEventListener('click', () => {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        alert('[LINE@簡訊] 找不到 CSRF token，無法送出');
        return;
      }

      const phone = getPhone();

      showConfirmDialog(phone, async (content) => {
        btn.disabled = true;
        btn.textContent = '傳送中...';

        try {
          const body = new URLSearchParams({
            authenticity_token: csrfToken,
            admission_ids: admissionId,
            content,
          });

          const res = await fetch('/sms_messages/send_leave.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (res.ok) {
            btn.textContent = '✓ 已發送';
            btn.classList.replace('btn-success', 'btn-secondary');
            setTimeout(() => window.open('https://corp.orangeapple.co/sms_messages?q=&commit=%E6%90%9C%E5%B0%8B', '_blank'), 5000);
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        } catch (err) {
          alert(`[LINE@簡訊] 發送失敗：${err.message}`);
          btn.disabled = false;
          btn.textContent = '發送LINE@簡訊';
        }
      });
    });

    anchor.insertAdjacentElement('afterend', btn);
  }

  function isDtAdmissionsPage() {
    return location.pathname.startsWith('/dt_admissions/');
  }

  function scanAndInject() {
    if (!isDtAdmissionsPage()) return;
    document.querySelectorAll('[data-bs-target="#set-remote-audition-modal"]').forEach(injectButton);
  }

  scanAndInject();

  // 處理 Turbo Drive 換頁後重新注入
  document.addEventListener('turbo:load', scanAndInject);
  document.addEventListener('turbo:render', scanAndInject);

  console.log('[OA LINE@ SMS] 載入成功');
})();
