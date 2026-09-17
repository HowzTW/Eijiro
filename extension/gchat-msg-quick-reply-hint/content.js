(function () {
  const REPLY_TEXT = '收';
  const SUMMARY_MAX_LEN = 40;
  const BUBBLE_SELECTOR = '.iKCcE';
  const THREAD_REPLY_BUTTON_SELECTOR = 'button[aria-label="在討論串中回覆"]';
  const THREAD_PANEL_CONTAINER_SELECTOR = '[jsname="Eh1mOb"]';
  const EDITABLE_BOX_SELECTOR = '[contenteditable="true"][role="textbox"]';
  const MESSAGE_CONTAINER_SELECTOR = '[data-topic-id]';
  const SENDER_NAME_SELECTOR = '[jsname="oU6v8b"]';
  const MESSAGE_TEXT_SELECTOR = '[jsname="bgckF"]';
  const HIGHLIGHT_OUTLINE = '3px solid #1a73e8';
  const HIGHLIGHT_OFFSET = '2px';
  const THREAD_DETAIL_VIEW_SELECTOR = '[data-is-detailed-thread-view="true"]';
  const HOVER_TARGET_SELECTOR = '[jsname="o7uNDd"]';
  const HOVER_WAIT_TIMEOUT_MS = 1500;

  function isInsideInteractiveElement(target, boundary) {
    let node = target;
    while (node && node !== boundary) {
      if (
        node.tagName === 'BUTTON' ||
        node.tagName === 'A' ||
        node.getAttribute('role') === 'button'
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function findMessageContainer(bubble) {
    return bubble.closest(MESSAGE_CONTAINER_SELECTOR);
  }

  // 連續同一人發的訊息，Google Chat 會省略姓名節點；往前找最近一個有姓名的訊息容器。
  function findSenderName(container) {
    let node = container;
    let hops = 0;
    while (node && hops < 20) {
      const nameEl = node.querySelector ? node.querySelector(SENDER_NAME_SELECTOR) : null;
      const name = nameEl && nameEl.innerText.trim();
      if (name) return name;
      node = node.previousElementSibling;
      hops++;
    }
    return null;
  }

  function getMessageSummary(bubble) {
    const textEl = bubble.querySelector(MESSAGE_TEXT_SELECTOR);
    if (!textEl) return '';
    let text = textEl.innerText.trim().replace(/\s+/g, ' ');
    if (text.length > SUMMARY_MAX_LEN) {
      text = text.slice(0, SUMMARY_MAX_LEN) + '…';
    }
    return text;
  }

  function buildConfirmMessage(bubble) {
    const sender = findSenderName(findMessageContainer(bubble));
    const summary = getMessageSummary(bubble);
    const senderText = sender ? `${sender}的訊息` : '這則訊息';
    const summaryText = summary ? `：『${summary}』` : '';
    return `要回覆「${REPLY_TEXT}」給${senderText}${summaryText}嗎？`;
  }

  function highlightBubble(bubble) {
    const previousOutline = bubble.style.outline;
    const previousOffset = bubble.style.outlineOffset;
    bubble.style.outline = HIGHLIGHT_OUTLINE;
    bubble.style.outlineOffset = HIGHLIGHT_OFFSET;
    return function restore() {
      bubble.style.outline = previousOutline;
      bubble.style.outlineOffset = previousOffset;
    };
  }

  function findReplyBox() {
    const containers = document.querySelectorAll(THREAD_PANEL_CONTAINER_SELECTOR);
    for (const container of containers) {
      const box = container.querySelector(EDITABLE_BOX_SELECTOR);
      if (box && isVisible(box)) return box;
    }
    return null;
  }

  function waitForReplyBox(timeoutMs) {
    return new Promise((resolve) => {
      const existing = findReplyBox();
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const box = findReplyBox();
        if (box) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(box);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(findReplyBox());
      }, timeoutMs);
    });
  }

  function sendReply(box) {
    box.focus();
    document.execCommand('insertText', false, REPLY_TEXT);

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    });
    box.dispatchEvent(enterEvent);
  }

  // 訊息泡泡的工具列（在討論串中回覆、新增回應…）只有滑鼠真的 hover 上去時，
  // Google Chat 才會動態把按鈕插入 DOM（不是 CSS 隱藏，是根本還沒渲染）。
  // 滑鼠點擊會自然先觸發 hover 才點到；快捷鍵是直接操作 DOM，沒有經過真的
  // hover，所以要先模擬一次 hover 事件，逼 Chat 把按鈕生出來。
  function triggerHover(bubble) {
    const target = bubble.querySelector(HOVER_TARGET_SELECTOR) || bubble;
    const commonInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      relatedTarget: document.body,
    };
    target.dispatchEvent(new MouseEvent('mouseover', commonInit));
    target.dispatchEvent(new MouseEvent('mouseenter', { ...commonInit, bubbles: false }));
  }

  function waitForThreadButton(bubble, timeoutMs) {
    return new Promise((resolve) => {
      const existing = bubble.querySelector(THREAD_REPLY_BUTTON_SELECTOR);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const btn = bubble.querySelector(THREAD_REPLY_BUTTON_SELECTOR);
        if (btn) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(btn);
        }
      });
      observer.observe(bubble, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(bubble.querySelector(THREAD_REPLY_BUTTON_SELECTOR));
      }, timeoutMs);
    });
  }

  function activateBubble(bubble) {
    triggerHover(bubble);

    waitForThreadButton(bubble, HOVER_WAIT_TIMEOUT_MS).then((threadButton) => {
      if (!threadButton) return;

      const confirmMessage = buildConfirmMessage(bubble);
      const restoreHighlight = highlightBubble(bubble);

      // window.confirm() 是同步阻斷的原生對話框，瀏覽器不保證會先畫出剛套用的
      // outline 樣式才跳出視窗；用兩次 requestAnimationFrame 強迫瀏覽器先完成一次
      // 繪製，確保使用者看得到高亮框線。
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const confirmed = window.confirm(confirmMessage);
          restoreHighlight();

          if (!confirmed) return;

          threadButton.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true })
          );

          waitForReplyBox(5000).then((box) => {
            if (!box) return;
            sendReply(box);
          });
        });
      });
    });
  }

  // 討論串詳細面板裡也會渲染一份根訊息的 .iKCcE，要排除掉，
  // 才能正確抓到主對話串最下方（最新）的那一則。
  function findLastMainStreamBubble() {
    const bubbles = document.querySelectorAll(BUBBLE_SELECTOR);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (!bubbles[i].closest(THREAD_DETAIL_VIEW_SELECTOR)) {
        return bubbles[i];
      }
    }
    return null;
  }

  document.addEventListener(
    'click',
    function (event) {
      const bubble = event.target.closest(BUBBLE_SELECTOR);
      if (!bubble) return;

      if (isInsideInteractiveElement(event.target, bubble)) return;

      activateBubble(bubble);
    },
    true
  );

  // 快捷鍵改由 background.js 透過 chrome.commands 註冊在瀏覽器層級（見該檔案），
  // 不依賴網頁內容是否已取得鍵盤 focus；這裡只負責接收轉發訊息、執行同一套邏輯。
  chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.type !== 'QUICK_REPLY_SHORTCUT') return;

    const bubble = findLastMainStreamBubble();
    if (!bubble) return;

    activateBubble(bubble);
  });
})();
