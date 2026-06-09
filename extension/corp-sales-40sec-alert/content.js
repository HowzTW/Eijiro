(function () {
  let alertInterval = null;

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // 瀏覽器可能在未有使用者互動前封鎖 AudioContext，靜默忽略
    }
  }

  function pulseFAB() {
    const fab = document.querySelector('.next-list-fab');
    if (!fab) return;
    fab.classList.remove('fab-alerting');
    // 強制 reflow 使動畫可重複觸發
    void fab.offsetWidth;
    fab.classList.add('fab-alerting');
    fab.addEventListener('animationend', () => fab.classList.remove('fab-alerting'), { once: true });
  }

  function onTick() {
    beep();
    pulseFAB();
  }

  function startAlert() {
    if (alertInterval) return;
    onTick(); // 立即執行一次
    alertInterval = setInterval(onTick, 40000);
  }

  function stopAlert() {
    if (alertInterval) {
      clearInterval(alertInterval);
      alertInterval = null;
    }
  }

  function injectToggle() {
    if (document.querySelector('.alert-40sec-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'alert-40sec-wrapper';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'alert-40sec-checkbox';
    checkbox.id = 'alert-40sec-toggle';

    const track = document.createElement('label');
    track.className = 'alert-40sec-track';
    track.htmlFor = 'alert-40sec-toggle';

    const labelText = document.createElement('span');
    labelText.className = 'alert-40sec-label-text';
    labelText.textContent = '📣 40秒提醒';

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        startAlert();
      } else {
        stopAlert();
      }
    });

    wrapper.appendChild(labelText);
    wrapper.appendChild(checkbox);
    wrapper.appendChild(track);

    document.body.appendChild(wrapper);
  }

  injectToggle();

  const observer = new MutationObserver(() => injectToggle());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('turbo:load', () => {
    injectToggle();
    const checkbox = document.querySelector('.alert-40sec-checkbox');
    if (checkbox) checkbox.checked = alertInterval !== null;
  });
})();
