document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('config.json');
        const config = await response.json();

        const mainGrid = document.getElementById('main-grid');
        mainGrid.innerHTML = '';

        config.displayOrder.forEach(key => {
            const cardData = config.cards[key];
            if (!cardData) return;

            const iconHTML = cardData.icon.endsWith('.png') || cardData.icon.endsWith('.jpg') || cardData.icon.endsWith('.svg')
                ? `<img src="${cardData.href.replace('index.html', '')}${cardData.icon}" alt="${cardData.title}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`
                : `<span class="material-symbols-rounded">${cardData.icon}</span>`;

            const cardHTML = `
                <a href="${cardData.href}" class="card" target="_blank" rel="noopener noreferrer">
                    <button class="copy-btn" title="複製連結" onclick="copyLink(event, '${cardData.href}')">
                        <i class="ph-bold ph-copy"></i>
                    </button>
                    <div class="card-content">
                        <div class="card-icon">${iconHTML}</div>
                        <h2 class="card-title">${cardData.title}</h2>
                        <p class="card-description">${cardData.description}</p>
                    </div>
                    <div class="card-stats">
                        <span>${cardData.stats}</span>
                    </div>
                </a>
            `;
            mainGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    } catch (error) {
        console.error('Error loading config.json:', error);
    }
});

function copyLink(event, path) {
    event.preventDefault();
    event.stopPropagation();

    const url = window.location.origin + window.location.pathname.replace('index.html', '') + path;

    navigator.clipboard.writeText(url).then(() => {
        const btn = event.currentTarget;
        const icon = btn.querySelector('i');

        btn.classList.add('success');
        icon.className = 'ph-bold ph-check';

        setTimeout(() => {
            btn.classList.remove('success');
            icon.className = 'ph-bold ph-copy';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}
