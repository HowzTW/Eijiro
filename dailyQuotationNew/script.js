let currentStep = 1;
let quotations = [];
let selectedDateData = null;
let uploadedImageData = null;

const TOTAL_STEPS = 5;

// Elements
const progressFill = document.getElementById('progress_fill');
const stepIndicator = document.getElementById('step_indicator');
const dateInput = document.getElementById('date_input');
const contentInput = document.getElementById('content_input');
const promptInput = document.getElementById('prompt_input');
const previewImg = document.getElementById('preview_img');
const btnStep4Next = document.getElementById('btn_step4_next');

async function init() {
    try {
        const res = await fetch('data-cht.json');
        quotations = await res.json();
        
        // Set default date to today
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
        
        updateUI();
    } catch (error) {
        console.error("Failed to load data:", error);
        alert("無法讀取 data-cht.json，請檢查檔案是否存在。");
    }
}

function updateUI() {
    // Show/Hide steps
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const section = document.getElementById(`step_${i}`);
        if (i === currentStep) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    }

    // Update progress
    const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    progressFill.style.width = `${progressPercent}%`;
    stepIndicator.innerText = `步驟 ${currentStep} / ${TOTAL_STEPS}`;

    // Step-specific logic
    if (currentStep === 2) {
        loadDateData();
    } else if (currentStep === 3) {
        generatePrompt();
    } else if (currentStep === 5) {
        prepareFinalCard();
    }
}

function nextStep() {
    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function resetWizard() {
    if (confirm("確定要取消並重來嗎？這將清除目前的編輯內容。")) {
        currentStep = 1;
        selectedDateData = null;
        uploadedImageData = null;
        contentInput.value = "";
        previewImg.src = "";
        previewImg.style.display = "none";
        btnStep4Next.disabled = true;
        updateUI();
    }
}

function loadDateData() {
    const d = new Date(dateInput.value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const targetDateStr = `${mm}月${dd}日`;

    selectedDateData = quotations.find(q => q.date === targetDateStr);

    if (selectedDateData) {
        contentInput.value = selectedDateData.content;
        document.getElementById('source_display').innerText = selectedDateData.source.replace(/<\/?[^>]+(>|$)/g, "");
        document.getElementById('bg_display').innerText = selectedDateData.background || "無建議";
    } else {
        contentInput.value = "此日期無箴言資料。";
        document.getElementById('source_display').innerText = "-";
        document.getElementById('bg_display').innerText = "-";
    }
}

function generatePrompt() {
    const bgEn = selectedDateData?.['background-eng'] || "Beautiful scenery";
    const bgCh = selectedDateData?.background || "精美風景";
    
    const template = `A professional 3:4 vertical masterpiece photography featuring ${bgEn} (${bgCh}). Focus only on the scenery and atmosphere. Strictly prohibit any text, writing, alphabets, or signatures. Cinematic lighting, photorealistic, 8k resolution, clean background.`;
    
    promptInput.value = template;
}

function copyAndPrepareChatGPT(event) {
    const promptText = promptInput.value;
    
    // 1. 複製到剪貼簿
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(promptText).catch(err => console.error("Copy failed", err));
    }
    
    // 2. 準備 URL
    // 使用原本運作良好的 chat.openai.com，確保參數正確帶入
    const url = `https://chat.openai.com/?q=${encodeURIComponent(promptText)}`;
    
    // 3. 直接更新按鈕的 href 並讓瀏覽器自然處理 target="_blank"
    // 這樣最符合瀏覽器對「另開分頁」的安全預期，且不會被視為彈窗攔截
    event.currentTarget.href = url;
    
    // 4. 延遲顯示提示，避免干擾跳轉
    console.log("Opening ChatGPT with prompt...");
}

function triggerFileInput() {
    document.getElementById('file_input').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImageData = e.target.result;
        previewImg.src = uploadedImageData;
        previewImg.style.display = 'block';
        btnStep4Next.disabled = false;
    };
    reader.readAsDataURL(file);
}

function prepareFinalCard() {
    const cardQuoteInner = document.getElementById('card_quote_inner');
    const cardDate = document.getElementById('card_date');
    const cardSource = document.getElementById('card_source');
    const cardLocation = document.getElementById('card_location');
    const landmarkBadge = document.getElementById('card_landmark');
    const posterCard = document.getElementById('poster_card');

    // Update Text
    cardQuoteInner.innerText = contentInput.value;
    
    const d = new Date(dateInput.value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    cardDate.innerText = `${mm}月${dd}日`;
    
    cardSource.innerText = selectedDateData?.source.replace(/<\/?[^>]+(>|$)/g, "") || "";
    
    if (selectedDateData?.background) {
        cardLocation.innerText = selectedDateData.background;
        landmarkBadge.style.display = 'flex';
    } else {
        landmarkBadge.style.display = 'none';
    }

    // Update Background
    if (uploadedImageData) {
        posterCard.style.backgroundImage = `url(${uploadedImageData})`;
    }

    // Auto fit font size (Original logic)
    setTimeout(autoFitCardFont, 50);
}

function autoFitCardFont() {
    const container = document.getElementById('card_quote_container');
    const inner = document.getElementById('card_quote_inner');
    if (!container || !inner) return;

    // Reset to a large font size to start shrinking (Original approach)
    let fontSize = 3.5; 
    container.style.fontSize = fontSize + 'rem';

    // Wait for frame
    requestAnimationFrame(() => {
        const style = window.getComputedStyle(container);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);
        const availableHeight = container.clientHeight - paddingTop - paddingBottom - 20;

        let iterations = 0;
        while (inner.scrollHeight > availableHeight && fontSize > 0.6 && iterations < 60) {
            fontSize -= 0.1;
            container.style.fontSize = fontSize + 'rem';
            iterations++;
        }
    });
}

async function downloadPoster() {
    const target = document.getElementById('poster_card');
    const dateStr = document.getElementById('card_date').innerText;

    // Show loading state
    const btn = document.querySelector('.btn-success');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-rounded animate-spin">sync</span> 處理中...';
    btn.disabled = true;

    try {
        // [CRITICAL] To capture exactly 1500x2000 from a 500px responsive element:
        // Use scale: 3 (500 * 3 = 1500)
        const canvas = await html2canvas(target, {
            useCORS: true,
            allowTaint: true,
            scale: 3, 
            backgroundColor: '#000',
            logging: false,
            imageTimeout: 0,
            onclone: (clonedDoc) => {
                const clonedTarget = clonedDoc.getElementById('poster_card');
                clonedTarget.style.width = '500px'; // Lock width for precise scaling
                clonedTarget.style.maxWidth = 'none';
            }
        });

        // Download logic
        const link = document.createElement('a');
        link.download = `DailyQuote_${dateStr.replace('月', '').replace('日', '')}.png`;
        
        canvas.toBlob((blob) => {
            if (!blob) throw new Error("Canvas toBlob failed");
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }, 'image/png', 1.0);

    } catch (error) {
        console.error("Screenshot failed:", error);
        alert("截圖失敗，請重試。\n錯誤: " + error.message);
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}



function changeDate(offset) {
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const current = new Date(dateInput.value);
    current.setDate(current.getDate() + offset);
    dateInput.value = current.toISOString().split('T')[0];
    updateUI();
}

function updateLastMod() {
    const lastModElem = document.getElementById('last_mod');
    if (!lastModElem) return;

    // document.lastModified reflects the last modified time from the server/file system
    const lastModStr = document.lastModified;
    if (!lastModStr) return;

    const m = new Date(lastModStr);
    
    // Format to Taipei time YYYY-MM-DD HH:mm:ss
    const tzOffset = 8; // Taipei is UTC+8
    const utcTime = m.getTime() + (m.getTimezoneOffset() * 60000);
    const taipeiTime = new Date(utcTime + (3600000 * tzOffset));

    const yyyy = taipeiTime.getFullYear();
    const mm = String(taipeiTime.getMonth() + 1).padStart(2, '0');
    const dd = String(taipeiTime.getDate()).padStart(2, '0');
    const hh = String(taipeiTime.getHours()).padStart(2, '0');
    const mi = String(taipeiTime.getMinutes()).padStart(2, '0');
    const ss = String(taipeiTime.getSeconds()).padStart(2, '0');

    lastModElem.innerText = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// Initial Call
init();
updateLastMod();
