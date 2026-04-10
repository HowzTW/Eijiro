let currentStep = 1;
let quotations = [];
let selectedDateData = null;
let uploadedImageData = null;
let aiImagePool = []; 

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
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
        updateUI();
    } catch (error) {
        console.error("Failed to load data:", error);
        alert("無法讀取 data-cht.json。");
    }
}

function updateUI() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const section = document.getElementById(`step_${i}`);
        if (!section) continue;
        if (i === currentStep) section.classList.add('active');
        else section.classList.remove('active');
    }

    let displayStep = currentStep;
    if (currentStep === 5) displayStep = 3;
    const progressPercent = ((displayStep - 1) / (3 - 1)) * 100;
    progressFill.style.width = `${progressPercent}%`;
    stepIndicator.innerText = `步驟 ${displayStep} / 3`;

    if (currentStep === 2) loadDateData();
    else if (currentStep === 5) prepareFinalCard();
}

async function autoGenerateAIImage(isRefresh = false) {
    console.log(isRefresh ? "Refreshing AI image..." : "Generating AI image...");
    const loader = document.getElementById('ai_loading');
    loader.style.display = 'flex';

    try {
        const bgEn = selectedDateData?.['background-eng'] || "Beautiful nature landscape";
        // 1. 純淨化指令
        const cleanPrompt = bgEn.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
        const promptString = `Masterpiece photography of ${cleanPrompt} vertical 3 4 cinematic lighting 8k no text`;
        const seed = Math.floor(Math.random() * 1000000);

        // 2. 建立直接請求的 AI 網址 (對 Prompt 部分進行單次正確編碼)
        const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptString)}?width=1500&height=2000&nologo=true&seed=${seed}`;

        console.log("Requesting AI Image Directly:", aiUrl);

        const img = new Image();
        // 重要：在正式環境部署時，必須開啟 crossOrigin 以利 html2canvas 截圖
        img.crossOrigin = "anonymous"; 
        img.src = aiUrl;

        img.onload = function() {
            uploadedImageData = aiUrl;
            currentStep = 5;
            loader.style.display = 'none';
            updateUI();
        };

        img.onerror = function() {
            console.warn("Direct AI failed, using fallback.");
            useUnsplashFallback();
        };

        // 60秒超時處理
        setTimeout(() => {
            if (currentStep !== 5 && loader.style.display !== 'none') {
                loader.style.display = 'none';
                useUnsplashFallback();
            }
        }, 60000);

    } catch (error) {
        console.error("AI Generation error:", error);
        useUnsplashFallback();
    }
}

function useUnsplashFallback() {
    const loader = document.getElementById('ai_loading');
    const fullKeyword = selectedDateData?.['background-eng'] || "nature,landscape";
    const keyword = fullKeyword.split(',')[0].split(' ').slice(0, 2).join(',');
    const fallbackUrl = `https://loremflickr.com/1500/2000/${encodeURIComponent(keyword)}`;
    
    console.log("Using dynamic fallback:", fallbackUrl);
    
    const img = new Image();
    img.src = fallbackUrl;

    img.onload = function() {
        uploadedImageData = fallbackUrl;
        currentStep = 5;
        loader.style.display = 'none';
        updateUI();
    };

    img.onerror = function() {
        uploadedImageData = "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1500&auto=format&fit=crop";
        currentStep = 5;
        loader.style.display = 'none';
        updateUI();
    };
}

function nextStep() {
    if (currentStep < TOTAL_STEPS) {
        if (currentStep === 2) {
            autoGenerateAIImage();
            return;
        }
        currentStep++;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevStep() {
    if (currentStep > 1) {
        if (currentStep === 5) currentStep = 2;
        else currentStep--;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function resetWizard() {
    if (confirm("確定要取消並重來嗎？")) location.reload();
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
    }
}

function updatePreviewScale() {
    const scaler = document.getElementById('card_scaler');
    const viewer = document.querySelector('.card-viewer');
    if (!scaler || !viewer) return;
    const viewerWidth = Math.min(viewer.clientWidth, 600);
    const scale = viewerWidth / 1500;
    scaler.style.transform = `scale(${scale})`;
}

function prepareFinalCard() {
    const cardQuoteInner = document.getElementById('card_quote_inner');
    const cardDate = document.getElementById('card_date');
    const cardSource = document.getElementById('card_source');
    const cardLocation = document.getElementById('card_location');
    const landmarkBadge = document.getElementById('card_landmark');
    const posterCard = document.getElementById('poster_card');

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

    if (uploadedImageData) {
        posterCard.style.backgroundImage = `url(${uploadedImageData})`;
    }

    setTimeout(() => {
        updatePreviewScale();
        autoFitCardFont();
    }, 50);
}

function autoFitCardFont() {
    const container = document.getElementById('card_quote_container');
    const inner = document.getElementById('card_quote_inner');
    if (!container || !inner) return;
    let fontSize = 12; 
    container.style.fontSize = fontSize + 'rem';
    requestAnimationFrame(() => {
        const style = window.getComputedStyle(container);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);
        const availableHeight = container.clientHeight - paddingTop - paddingBottom - 60;
        let iterations = 0;
        while (inner.scrollHeight > availableHeight && fontSize > 1.0 && iterations < 150) {
            fontSize -= 0.1;
            container.style.fontSize = fontSize + 'rem';
            iterations++;
        }
    });
}

async function downloadPoster() {
    const masterCard = document.getElementById('poster_card');
    const dateStr = document.getElementById('card_date').innerText;
    const btn = document.querySelector('.btn-success');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-rounded animate-spin">sync</span> 處理中...';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(masterCard, {
            useCORS: true,
            allowTaint: true,
            scale: 1,
            width: 1500,
            height: 2000,
            backgroundColor: '#000000',
            logging: false,
            onclone: (clonedDoc) => {
                const clonedScaler = clonedDoc.getElementById('card_scaler');
                if (clonedScaler) {
                    clonedScaler.style.transform = 'none';
                    clonedScaler.style.width = '1500px';
                    clonedScaler.style.height = '2000px';
                }
            }
        });
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
        console.error("Export failed:", error);
        alert("匯出失敗。");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

window.addEventListener('resize', updatePreviewScale);

function changeDate(offset) {
    if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
    const current = new Date(dateInput.value);
    current.setDate(current.getDate() + offset);
    dateInput.value = current.toISOString().split('T')[0];
    updateUI();
}

function updateLastMod() {
    const lastModElem = document.getElementById('last_mod');
    if (!lastModElem) return;
    const m = new Date(document.lastModified);
    const taipeiTime = new Date(m.getTime() + (m.getTimezoneOffset() * 60000) + (3600000 * 8));
    const yyyy = taipeiTime.getFullYear();
    const mm = String(taipeiTime.getMonth() + 1).padStart(2, '0');
    const dd = String(taipeiTime.getDate()).padStart(2, '0');
    const hh = String(taipeiTime.getHours()).padStart(2, '0');
    const mi = String(taipeiTime.getMinutes()).padStart(2, '0');
    const ss = String(taipeiTime.getSeconds()).padStart(2, '0');
    lastModElem.innerText = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

init();
updateLastMod();
