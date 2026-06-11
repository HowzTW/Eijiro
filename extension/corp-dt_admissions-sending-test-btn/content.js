(function () {
  const INJECTED_ATTR = 'data-test-btns-injected';
  const COOLDOWN_MS = 3000;

  const TEST_BUTTONS = [
    { label: 'SC測驗',  value: 'testing'        },
    { label: 'PY測驗',  value: 'testing_python'  },
    { label: 'MC測驗',  value: 'testing_mc'      },
    { label: '麥思測驗', value: 'testing_math'    },
  ];

  function sendTest(value, btn, originalLabel) {
    const select = document.getElementById('information_type');
    const submitBtn = document.querySelector('.js-send-information-mail');

    if (!select || !submitBtn) {
      alert('[測驗邀請] 找不到 modal 元素，請重新整理頁面');
      return;
    }

    btn.disabled = true;
    btn.textContent = '寄送中';
    btn.classList.add('oa-test-btn--sending');

    select.value = value;
    submitBtn.click();

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalLabel;
      btn.classList.remove('oa-test-btn--sending');
    }, COOLDOWN_MS);
  }

  function injectButtons(anchor) {
    if (anchor.hasAttribute(INJECTED_ATTR)) return;
    anchor.setAttribute(INJECTED_ATTR, '1');

    const li = anchor.closest('li');
    if (!li) return;

    const newLi = document.createElement('li');
    TEST_BUTTONS.forEach(({ label, value }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-xs ms-1 oa-test-btn';
      btn.textContent = label;

      btn.addEventListener('click', () => sendTest(value, btn, label));

      newLi.appendChild(btn);
    });

    li.insertAdjacentElement('afterend', newLi);
  }

  function scanAndInject() {
    document.querySelectorAll(`button[data-bs-target="#send-information-modal"]:not([${INJECTED_ATTR}])`).forEach(injectButtons);
  }

  const style = document.createElement('style');
  style.textContent = `
    .oa-test-btn {
      background-color: #a1887f;
      border-color: #a1887f;
      color: #fff;
    }
    .oa-test-btn:hover {
      background-color: #795548;
      border-color: #795548;
      color: #fff;
    }
    .oa-test-btn--sending {
      background-color: #aaa !important;
      border-color: #aaa !important;
      color: #fff !important;
      cursor: not-allowed !important;
    }
  `;
  document.head.appendChild(style);

  scanAndInject();

  document.addEventListener('turbo:load', scanAndInject);
  document.addEventListener('turbo:render', scanAndInject);

  console.log('[OA 測驗邀請快速發送] 載入成功');
})();
