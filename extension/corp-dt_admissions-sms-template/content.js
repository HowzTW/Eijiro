(function () {
  const TEMPLATE = '家長您好，歡迎加入橘子蘋果線上課程官方帳號，加入後須主動傳訊息才會看到您的好友唷！謝謝：https://oaoa.fun/6qhv3g';
  const BTN_ATTR = 'data-line-sms-injected';

  function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content;
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

    btn.addEventListener('click', async () => {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        alert('[LINE@簡訊] 找不到 CSRF token，無法送出');
        return;
      }

      btn.disabled = true;
      btn.textContent = '傳送中...';

      try {
        const body = new URLSearchParams({
          authenticity_token: csrfToken,
          admission_ids: admissionId,
          content: TEMPLATE,
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
