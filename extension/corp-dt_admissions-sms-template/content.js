(function () {
  const TEMPLATE = '【橘子蘋果程式學苑】家長您好，歡迎加入橘子蘋果線上課程官方帳號，加入後須主動傳訊息才會看到您的好友唷！謝謝：https://oaoa.fun/6qhv3g';

  const modal = document.querySelector('#sms-sending-modal');
  if (!modal) return;

  modal.addEventListener('show.bs.modal', () => {
    const textarea = modal.querySelector('#sms_content');
    const counter  = document.querySelector('#sms-word-count');
    if (!textarea) return;

    textarea.value = TEMPLATE;
    if (counter) counter.textContent = TEMPLATE.length;
  });

  console.log('[OA SMS Template] 載入成功');
})();
