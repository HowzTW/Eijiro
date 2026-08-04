/**
 * OA Sales Info Sending Button
 *
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 */

(function () {
  const WRAPPER_CLASS = 'oa-info-btn-wrapper';

  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  const BUTTONS = [
    { label: '麥思',   keyword: '橘蘋麥思數學課程' },
    { label: '艾伯特', keyword: '頑皮艾伯特課程' },
    { label: 'MC',     keyword: 'Minecraft 麥塊程式班' },
    { label: 'MC-PY',  keyword: 'Minecraft 麥塊 Python' },
    { label: 'RX',     keyword: 'Roblox' },
    { label: 'SC',     keyword: 'Scratch 實戰班' },
    { label: 'PY',     keyword: 'Python程式開發班' },
    { label: 'Steam',  keyword: 'STEAM' },
  ];

  function injectButtons() {
    document.querySelectorAll('td > .dropdown').forEach(dropdownEl => {
      const firstRow = dropdownEl.closest('tr');
      if (!firstRow) return;

      const secondRow = firstRow.nextElementSibling;
      if (!secondRow) return;

      const secondTds = secondRow.querySelectorAll('td');
      if (secondTds.length !== 5) return;

      const secondTd = secondTds[1];
      if (secondTd.querySelector('.' + WRAPPER_CLASS)) return;

      const dropdownMenu = dropdownEl.querySelector('.dropdown-menu');
      if (!dropdownMenu) return;

      const menuItems = Array.from(dropdownMenu.children);

      const wrapper = document.createElement('span');
      wrapper.className = WRAPPER_CLASS;

      BUTTONS.forEach(({ label, keyword }) => {
        const item = menuItems.find(el => el.textContent.includes(keyword));
        if (!item) return;

        const btn = document.createElement('button');
        btn.className = 'oa-info-btn';
        btn.textContent = label;
        btn.type = 'button';
        btn.title = item.textContent.trim();

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (btn.classList.contains('is-success')) return;

          item.click();

          const originalText = btn.textContent;
          btn.classList.add('is-success');
          btn.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle;margin-right:2px;">check</span>已寄送！';

          setTimeout(() => {
            btn.classList.remove('is-success');
            btn.textContent = originalText;
          }, 2000);
        });

        btn.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        wrapper.appendChild(btn);
      });

      secondTd.appendChild(wrapper);
    });
  }

  injectButtons();

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      injectButtons();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('turbo:load', injectButtons);
  document.addEventListener('turbo:render', injectButtons);
  document.addEventListener('turbo:frame-load', injectButtons);

  [500, 1000, 3000].forEach(delay => setTimeout(injectButtons, delay));
})();
