/* ── Category config ── */
const CATS = {
  '黑體':   { color: '#2C2C2A', char: '黑' },
  '圓體':   { color: '#0A5E48', char: '圓' },
  '宋體':   { color: '#7A4507', char: '宋' },
  '明體':   { color: '#0C447C', char: '明' },
  '楷書':   { color: '#3C3489', char: '楷' },
  '手寫':   { color: '#72243E', char: '手' },
  '毛筆':   { color: '#712B13', char: '毛' },
  '麥克筆': { color: '#1A5C0A', char: '麥' },
  '點陣體': { color: '#1F4F7A', char: '點' },
  '故障體': { color: '#4A3BAA', char: '障' },
  '其他':   { color: '#3D4D45', char: '其' },
};

/* ── State ── */
const state = { category: 'all' };

/* ── Helpers ── */
function getCategoryCounts() {
  const counts = { all: FONTS_DATA.fonts.length };
  FONTS_DATA.fonts.forEach(f => { counts[f.category] = (counts[f.category] || 0) + 1; });
  return counts;
}

function getFilteredFonts() {
  let fonts = FONTS_DATA.fonts;
  if (state.category !== 'all') fonts = fonts.filter(f => f.category === state.category);
  return fonts;
}

/* ── Render: Category Filters ── */
function renderCategoryFilters() {
  const counts = getCategoryCounts();
  const cats   = ['all', ...Object.keys(CATS)];
  const el     = document.getElementById('categoryFilters');

  el.innerHTML = cats.map(cat => {
    const isAll    = cat === 'all';
    const label    = isAll ? '全部' : cat;
    const count    = counts[cat] ?? 0;
    const isActive = state.category === cat;
    const catColor = !isAll && CATS[cat] ? CATS[cat].color : null;

    const activeStyle = (isActive && catColor)
      ? `style="background:${catColor};border-color:${catColor};color:#fff"`
      : '';

    return `<button class="filter-pill${isActive ? ' active' : ''}" data-category="${cat}" ${activeStyle}>
      ${label}<span class="pill-count">${count}</span>
    </button>`;
  }).join('');

  el.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.category;
      renderCategoryFilters();
      renderCards();
    });
  });
}

/* ── Render: Card HTML ── */
function createCardHTML(font) {
  const cat         = CATS[font.category] || { color: '#3D4D45', char: '字' };
  const licLabel    = font.license === 'open-source' ? '開源' : '免費商用';
  const licClass    = font.license === 'open-source' ? 'open-source' : 'commercial';
  const modBadge    = font.allow_modification
    ? '<span class="badge badge--mod">可改作</span>' : '';
  const warnBadge   = font.missing_chars
    ? '<span class="badge badge--missing"><span class="material-symbols-outlined" aria-hidden="true">warning</span>有缺字</span>' : '';

  /* Language tags: show max 2 + "+N" */
  const langs    = font.language_support;
  const shown    = langs.slice(0, 2);
  const extra    = langs.length - 2;
  const langHTML = [
    ...shown.map(l => `<span class="lang-tag">${l}</span>`),
    ...(extra > 0 ? [`<span class="lang-tag lang-tag--more">+${extra}</span>`] : []),
  ].join('');

  const firstImg = font.preview_images[0];

  const nameEn = font.name_en
    ? `<p class="card-name-en" title="${font.name_en}">${font.name_en}</p>` : '';

  const previewImg = firstImg?.url
    ? `<img class="card-preview-img" src="${firstImg.url}" alt="${firstImg.caption}" loading="lazy">`
    : '';

  return `
<article class="card" data-font-id="${font.id}" role="button" tabindex="0"
  aria-label="查看 ${font.name_zh} 詳情">
  <div class="card-top" style="background:${cat.color}">
    <span class="card-top-char" aria-hidden="true">${cat.char}</span>
    <span class="card-cat-badge">${font.category}</span>
  </div>
  <div class="card-body">
    <div>
      <h2 class="card-name">${font.name_zh}</h2>
      ${nameEn}
    </div>
    <p class="card-desc">${font.description}</p>
    <div class="card-badges">
      <span class="badge badge--${licClass}">${licLabel}</span>
      ${modBadge}${warnBadge}
    </div>
    <div class="card-footer">
      <div class="card-langs">${langHTML}</div>
      <a class="btn-download"
         href="${font.download_url}"
         target="_blank" rel="noopener noreferrer"
         onclick="event.stopPropagation()"
         aria-label="${font.name_zh} 下載">
        下載<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
      </a>
    </div>
  </div>
  ${previewImg}
</article>`;
}

/* ── Render: Cards ── */
function renderCards() {
  const fonts   = getFilteredFonts();
  const grid    = document.getElementById('cardGrid');
  const empty   = document.getElementById('emptyState');
  const counter = document.getElementById('resultsCount');

  counter.textContent = `共 ${fonts.length} 款字型`;

  if (fonts.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = fonts.map(createCardHTML).join('');

  /* Click & keyboard on cards */
  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openDrawer(card.dataset.fontId));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(card.dataset.fontId); }
    });
  });

  /* Staggered entrance animation via IntersectionObserver */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

  grid.querySelectorAll('.card').forEach((card, i) => {
    card.style.transitionDelay = `${Math.min(i * 28, 280)}ms`;
    io.observe(card);
  });
}

/* ── Drawer: Open ── */
let lastFocusedCard = null;

function openDrawer(fontId) {
  const font = FONTS_DATA.fonts.find(f => f.id === fontId);
  if (!font) return;

  lastFocusedCard = document.querySelector(`[data-font-id="${fontId}"]`);

  const cat      = CATS[font.category] || { color: '#3D4D45', char: '字' };
  const licLabel = font.license === 'open-source' ? '開源（OFL / 自由授權）' : '免費商用（不可改作）';
  const licClass = font.license === 'open-source' ? 'open-source' : 'commercial';

  const weightsHTML = font.weights.length > 0
    ? font.weights.map(w => `<span class="weight-tag">${w}</span>`).join('')
    : '<span class="text-muted">未詳列</span>';

  const langsHTML = font.language_support.map(l => `<span class="lang-tag">${l}</span>`).join('');

  const modRow = font.allow_modification
    ? '<span class="badge badge--mod">可改作</span>'
    : '<span class="text-muted">不可改作</span>';

  const missingRow = font.missing_chars
    ? '<span class="badge badge--missing"><span class="material-symbols-outlined" aria-hidden="true">warning</span>有缺字問題</span>'
    : '無';

  /* Preview images section */
  const previewHTML = font.preview_images.length > 0 ? `
    <div class="drawer-section">
      <p class="section-title">
        <span class="material-symbols-outlined" aria-hidden="true">image</span>字型預覽圖
      </p>
      <div class="preview-imgs">
        ${font.preview_images.map(img => img.url ? `
          <figure class="preview-figure">
            <img src="${img.url}" alt="${img.caption}" loading="lazy">
            <figcaption>${img.caption}（${img.source}）</figcaption>
          </figure>` : `
          <div class="preview-no-img">
            <span class="preview-caption">${img.caption}</span>
            <span class="preview-source">圖片來源：${img.source}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  /* Notes section */
  const notesHTML = font.notes ? `
    <div class="drawer-section">
      <p class="section-title">
        <span class="material-symbols-outlined" aria-hidden="true">sticky_note_2</span>補充說明
      </p>
      <p class="drawer-desc">${font.notes}</p>
    </div>` : '';

  document.getElementById('drawerBody').innerHTML = `
    <div class="drawer-font-header">
      <span class="drawer-cat-badge" style="background:${cat.color}">${font.category}</span>
      <h2 class="drawer-name">${font.name_zh}</h2>
      ${font.name_en ? `<p class="drawer-name-en">${font.name_en}</p>` : ''}
    </div>

    <div class="drawer-section">
      <p class="section-title">
        <span class="material-symbols-outlined" aria-hidden="true">info</span>字型資訊
      </p>
      <dl class="info-grid">
        <dt>授權</dt>
        <dd>
          <span class="badge badge--${licClass}">${font.license === 'open-source' ? '開源' : '免費商用'}</span>
        </dd>
        <dt>改作</dt>
        <dd>${modRow}</dd>
        <dt>字重</dt>
        <dd class="weights-row">${weightsHTML}</dd>
        <dt>語系</dt>
        <dd class="langs-row">${langsHTML}</dd>
        <dt>缺字</dt>
        <dd>${missingRow}</dd>
      </dl>
    </div>

    <div class="drawer-section">
      <p class="section-title">
        <span class="material-symbols-outlined" aria-hidden="true">description</span>字型介紹
      </p>
      <p class="drawer-desc">${font.description}</p>
    </div>

    ${previewHTML}
    ${notesHTML}

    <div class="drawer-actions">
      <a class="btn-download-large"
         href="${font.download_url}"
         target="_blank" rel="noopener noreferrer">
        前往下載頁面
        <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
      </a>
    </div>
  `;

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.classList.add('drawer-open');
  document.getElementById('drawerClose').focus();
}

/* ── Drawer: Close ── */
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.classList.remove('drawer-open');
  if (lastFocusedCard) { lastFocusedCard.focus(); lastFocusedCard = null; }
}

/* ── Reset Filters ── */
function resetFilters() {
  state.category = 'all';
  renderCategoryFilters();
  renderCards();
}

/* ── Font Size Control ── */
const FONT_SIZES = [20, 22, 24, 26, 28];
const FONT_LS_KEY = 'fontBook-font-scale';

function initFontSizeControl() {
  const saved = parseInt(localStorage.getItem(FONT_LS_KEY));
  let idx = FONT_SIZES.indexOf(saved);
  if (idx === -1) idx = 1; // 預設 16px

  function apply(newIdx) {
    idx = newIdx;
    const px = FONT_SIZES[idx];
    document.documentElement.style.fontSize = px + 'px';
    document.getElementById('fontSizeLabel').textContent = px + 'px';
    document.getElementById('fontSizeDown').disabled = idx === 0;
    document.getElementById('fontSizeUp').disabled   = idx === FONT_SIZES.length - 1;
    localStorage.setItem(FONT_LS_KEY, px);
  }

  apply(idx);
  document.getElementById('fontSizeDown').addEventListener('click', () => { if (idx > 0) apply(idx - 1); });
  document.getElementById('fontSizeUp').addEventListener('click',   () => { if (idx < FONT_SIZES.length - 1) apply(idx + 1); });
}

/* ── Init ── */
function init() {
  renderCategoryFilters();
  renderCards();
  initFontSizeControl();

  /* Drawer */
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  /* Scroll: header shadow + back-to-top */
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 8);
    document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 380);
  }, { passive: true });

  document.getElementById('backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', init);
