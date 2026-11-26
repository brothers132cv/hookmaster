/* ============================================
   HookMaster — Core JavaScript
   ============================================ */

/* ---------- EDIT THESE: paste your real links ---------- */
const STORE_LINKS = {
  bundle: '',   // e.g. 'https://hookmaster.gumroad.com/l/all-access'
  prompts: '',  // e.g. 'https://hookmaster.gumroad.com/l/ai-prompts'
  vault: ''     // e.g. 'https://hookmaster.gumroad.com/l/4k-vault'
};
const SOCIAL_LINKS = {
  tiktok: '',    // 'https://www.tiktok.com/@yourhandle'
  instagram: '', // 'https://www.instagram.com/yourhandle'
  youtube: ''    // 'https://www.youtube.com/@yourhandle'
};
// Email list: paste a form endpoint (Formspree / Kit / Beehiiv embed URL).
// Also add its domain to the CSP "form-action" + "connect-src" in each page <head>.
const EMAIL_ENDPOINT = '';
/* ------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', initApp);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let allHooks = [];
let allPrompts = [];
let activeNiche = 'all';
let searchQuery = '';
let selectedTool = 'all';
let selectedAesthetic = 'all';

async function initApp() {
  setupNav();
  setupBuyLinks();
  setupSocialLinks();
  setupEmailForms();
  setupScrollTop();

  if (document.getElementById('video-hooks-grid') || document.getElementById('featured-video-hooks')) {
    const [staticHooks, cloudHooks] = await Promise.all([
      loadJSON('data/hooks.json'),
      (typeof Cloud !== 'undefined' ? Cloud.fetchHooks() : Promise.resolve([]))
    ]);
    allHooks = [...cloudHooks, ...staticHooks]; // newest staff uploads first
    if (document.getElementById('video-hooks-grid')) {
      const tag = new URLSearchParams(location.search).get('tag') || new URLSearchParams(location.search).get('niche');
      if (tag) activeNiche = tag.toLowerCase();
      buildTagFilters();
      filterAndRenderHooks();
      setupHookFilters();
    }
    if (document.getElementById('featured-video-hooks')) {
      renderHookGrid('featured-video-hooks', allHooks.slice(0, 6));
    }
  }

  if (document.getElementById('prompts-grid')) {
    allPrompts = await loadJSON('data/prompts.json');
    const tool = new URLSearchParams(location.search).get('tool');
    if (tool) {
      selectedTool = tool;
      document.querySelectorAll('.filter-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    }
    filterPrompts();
    setupPromptFilters();
  }
}

async function loadJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn('Could not load', url, e);
    return [];
  }
}

/* ---------- NAV / LINKS ---------- */
function setupNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
  const btn = document.getElementById('mobile-menu-btn');
  const links = document.getElementById('navbar-links');
  if (btn && links) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      links.classList.toggle('open');
      btn.textContent = links.classList.contains('open') ? '✕' : '☰';
    });

    document.addEventListener('click', (e) => {
      if (links.classList.contains('open') && !links.contains(e.target) && !btn.contains(e.target)) {
        links.classList.remove('open');
        btn.textContent = '☰';
      }
    });

    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        btn.textContent = '☰';
      });
    });
  }
}

function setupBuyLinks() {
  document.querySelectorAll('[data-buy]').forEach(el => {
    const url = STORE_LINKS[el.dataset.buy];
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
    } else if (location.pathname.endsWith('shop.html')) {
      el.addEventListener('click', e => {
        e.preventDefault();
        showToast('Checkout opens soon — join the email list to get launch pricing.');
      });
    }
  });
}

function setupSocialLinks() {
  document.querySelectorAll('[data-social]').forEach(el => {
    const url = SOCIAL_LINKS[el.dataset.social];
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.closest('li')?.remove();
  });
}

function setupEmailForms() {
  document.querySelectorAll('.email-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!EMAIL_ENDPOINT) {
        showToast('Email list launching soon — thanks!');
        return;
      }
      try {
        const res = await fetch(EMAIL_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });
        if (!res.ok) throw new Error(res.status);
        showToast("You're in! Check your inbox.");
        input.value = '';
      } catch (err) {
        showToast('Something went wrong. Please try again.');
      }
    });
  });
}

function setupScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- HOOKS ---------- */
function renderHookGrid(id, hooks) {
  const grid = document.getElementById(id);
  if (!grid) return;
  if (!hooks.length) {
    grid.innerHTML = `<div class="empty-state"><h3>No hooks found</h3><p>Try another keyword or tag.</p></div>`;
    return;
  }
  grid.innerHTML = hooks.map(createHookCard).join('');
  attachPreviewListeners(grid);
}

function createHookCard(hook) {
  const hookId = Number(hook.id) || hook.id;
  const tagsList = Array.isArray(hook.tags) ? hook.tags : (hook.tags ? String(hook.tags).split(',').map(t => t.trim()) : (hook.niche ? [hook.niche] : []));
  const tagsHtml = tagsList.slice(0, 3).map(t => `<span class="badge badge-niche" style="font-size:0.7rem;padding:2px 8px;text-transform:lowercase;">#${esc(t)}</span>`).join('');
  const viewsText = hook.views || '3.5M';
  const hasVideo = !!hook.videoSample;

  return `
    <div class="video-hook-card" data-id="${esc(hookId)}">
      <div class="video-preview-wrapper" ${hasVideo ? 'onclick="toggleVideoPlayback(this)"' : ''} style="background: ${hook.bgGradient || 'linear-gradient(135deg, #181828, #0B0B14)'}; display:flex; flex-direction:column; justify-content:space-between; padding:18px; position:relative; overflow:hidden;">
        ${hasVideo ? `<video src="${esc(hook.videoSample)}" preload="metadata" muted loop playsinline style="background:#0f172a; position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"></video><div class="video-overlay-gradient"></div>` : '<div class="video-overlay-gradient" style="opacity:0.35;"></div>'}
        <div class="video-top-badges" style="position:relative; z-index:2; display:flex; justify-content:space-between; width:100%;">
          <span class="badge badge-resolution">Full HD</span>
          <span class="badge badge-views">🔥 ${esc(viewsText)}</span>
        </div>
        ${hasVideo ? '<div class="video-play-btn">▶</div>' : ''}
        <a href="hook.html?id=${encodeURIComponent(hookId)}" class="video-hook-caption" style="text-decoration:none; pointer-events:auto; text-align:center;" onclick="event.stopPropagation();">
          <div class="caption-text" style="font-size:1.05rem; line-height:1.35; font-weight:800; display:inline-block;">"${esc(hook.hook)}"</div>
        </a>
      </div>
      <div class="video-card-body">
        <div class="video-meta-tags" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px; flex-wrap:wrap;">
          <div style="display:flex; gap:4px; flex-wrap:wrap;">${tagsHtml}</div>
          <a href="hook.html?id=${encodeURIComponent(hookId)}" style="font-size:0.75rem; color:var(--accent-cyan); text-decoration:none; font-weight:700;">View Guide →</a>
        </div>
        <div class="video-card-actions">
          <a href="hook.html?id=${encodeURIComponent(hookId)}" class="btn btn-secondary btn-sm" style="justify-content:center; text-decoration:none; flex:1;">ℹ️ How to Use</a>
          ${hasVideo
            ? `<button class="btn btn-download btn-sm" onclick='downloadHook(${JSON.stringify(hookId)})'>⬇ Download</button>`
            : `<a href="hook.html?id=${encodeURIComponent(hookId)}" class="btn btn-download btn-sm" style="text-decoration:none;justify-content:center;">⬇ Download</a>`}
        </div>
      </div>
    </div>`;
}

function attachPreviewListeners(scope) {
  scope.querySelectorAll('.video-preview-wrapper').forEach(wrapper => {
    const video = wrapper.querySelector('video');
    const playBtn = wrapper.querySelector('.video-play-btn');
    if (!video) return;
    wrapper.addEventListener('mouseenter', () => {
      video.play().then(() => { if (playBtn) playBtn.style.opacity = '0'; }).catch(() => {});
    });
    wrapper.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
      if (playBtn) playBtn.style.opacity = '1';
    });
  });
}

function toggleVideoPlayback(wrapper) {
  const video = wrapper.querySelector('video');
  const playBtn = wrapper.querySelector('.video-play-btn');
  if (!video) return;
  if (video.paused) { video.play().catch(() => {}); if (playBtn) playBtn.style.opacity = '0'; }
  else { video.pause(); if (playBtn) playBtn.style.opacity = '1'; }
}

function downloadHook(hookId) {
  const hook = allHooks.find(h => String(h.id) === String(hookId));
  if (!hook || !hook.videoSample) return;
  const firstTag = Array.isArray(hook.tags) ? hook.tags[0] : String(hook.tags || hook.niche || 'hook').split(',')[0];
  const filename = `HookMaster_${String(firstTag || 'hook').replace(/[^a-z0-9_-]/gi, '')}_${String(hook.id)}.mp4`;
  if (typeof AdGate === 'undefined') {
    const a = document.createElement('a');
    a.href = hook.videoSample; a.download = filename; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  AdGate.run({
    title: 'Getting your <span class="gradient-text">hook</span> ready',
    sub: '1080p MP4 · free · no watermark',
    work: async (onProgress) => {
      try {
        onProgress(0.3);
        const res = await fetch(hook.videoSample, { mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        return { blob, filename };
      } catch (e) {
        // Source without CORS: fall back to a direct link
        return { url: hook.videoSample, filename };
      }
    }
  });
}

function showUpsellToast() {
  showToast('Downloading… Want 4K + hundreds more? <a href="shop.html#bundle">See All Access →</a>', true);
}

function getHookTags(h) {
  const raw = Array.isArray(h.tags) ? h.tags : (h.tags ? String(h.tags).split(',') : (h.niche ? [h.niche] : []));
  return raw.map(t => String(t).trim().toLowerCase()).filter(Boolean);
}

function buildTagFilters() {
  const box = document.getElementById('tag-filters');
  if (!box) return;
  const counts = {};
  allHooks.forEach(h => getHookTags(h).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  if (activeNiche !== 'all' && !counts[activeNiche]) activeNiche = 'all';
  box.innerHTML = `<button class="filter-btn${activeNiche === 'all' ? ' active' : ''}" data-tag="all">All Tags</button>` +
    tags.map(t => `<button class="filter-btn${activeNiche === t ? ' active' : ''}" data-tag="${esc(t)}">#${esc(t)} <span style="opacity:.6;">${counts[t]}</span></button>`).join('');
}

function setupHookFilters() {
  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterAndRenderHooks();
    });
  }
  document.querySelectorAll('.filter-btn[data-tag]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-tag]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNiche = btn.dataset.tag;
      filterAndRenderHooks();
    });
  });
}

function filterAndRenderHooks() {
  let list = allHooks;
  if (activeNiche !== 'all') {
    list = list.filter(h => getHookTags(h).includes(activeNiche.toLowerCase()));
  }
  if (searchQuery) {
    list = list.filter(h => {
      const tags = Array.isArray(h.tags) ? h.tags.join(' ') : String(h.tags || '');
      return [h.hook, tags, h.niche, h.description, h.howTo].some(v => String(v || '').toLowerCase().includes(searchQuery));
    });
  }
  const countEl = document.getElementById('hooks-count');
  if (countEl) countEl.innerHTML = `Showing <span>${list.length}</span> free hooks`;
  renderHookGrid('video-hooks-grid', list);
}

/* ---------- AI PROMPTS ---------- */
function renderPrompts(prompts) {
  const grid = document.getElementById('prompts-grid');
  const countEl = document.getElementById('prompts-count');
  if (countEl) countEl.innerHTML = `Showing <span>${prompts.length}</span> AI prompts`;
  if (!prompts.length) {
    grid.innerHTML = `<div class="empty-state">No prompts found.</div>`;
    return;
  }
  grid.innerHTML = prompts.map(p => {
    const locked = !!p.isPremium;
    const tools = (p.tools || []).map(t => `<span class="badge badge-niche" style="font-size:0.7rem;padding:3px 8px;">${esc(t)}</span>`).join('');
    return `
      <div class="prompt-card">
        <div class="prompt-thumb-wrapper">
          <img src="${esc(p.previewImg)}" alt="${esc(p.title)}" loading="lazy">
          <div style="position:absolute;top:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap;">
            <span class="badge badge-resolution">${esc(p.aesthetic)}</span>
            ${locked ? '<span class="badge badge-category">👑 PRO</span>' : '<span class="badge badge-views">FREE</span>'}
          </div>
        </div>
        <div class="prompt-card-body">
          <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:6px;color:#fff;">${esc(p.title)}</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">${tools}</div>
          <div style="position:relative;">
            <div class="prompt-box ${locked ? 'locked-blur' : ''}">${esc(p.prompt)}</div>
            ${locked ? `
              <div class="locked-badge-overlay">
                <div style="font-size:1.6rem;">🔒</div>
                <div style="font-size:0.95rem;font-weight:800;color:#fff;">Pro prompt</div>
                <div style="font-size:0.78rem;color:#cbd5e1;margin-bottom:10px;">In the AI Prompts Pack</div>
              </div>` : ''}
          </div>
          <div style="margin-bottom:14px;font-size:0.82rem;color:var(--text-secondary);">
            <span style="font-weight:700;color:var(--accent-cyan);">🎥 Camera:</span> ${esc(p.motionParams)}
          </div>
          <div style="margin-top:auto;">
            ${locked
              ? `<a href="shop.html#prompts" data-buy="prompts" class="btn btn-primary btn-sm" style="width:100%;justify-content:center;">Unlock 1,000+ prompts — $19</a>`
              : `<button class="btn btn-primary btn-sm" data-copy="${esc(p.prompt)}" onclick="copyText(this.dataset.copy, 'Prompt copied!')" style="width:100%;justify-content:center;">📋 Copy Prompt</button>`}
          </div>
        </div>
      </div>`;
  }).join('');
  setupBuyLinks();
}

function setupPromptFilters() {
  const bind = (attr, setter) => {
    document.querySelectorAll(`.filter-btn[data-${attr}]`).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(`.filter-btn[data-${attr}]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.dataset[attr]);
        filterPrompts();
      });
    });
  };
  bind('tool', v => { selectedTool = v; });
  bind('aesthetic', v => { selectedAesthetic = v; });
}

function filterPrompts() {
  let list = allPrompts;
  if (selectedTool !== 'all') list = list.filter(p => (p.tools || []).includes(selectedTool));
  if (selectedAesthetic !== 'all') list = list.filter(p => p.aesthetic === selectedAesthetic);
  renderPrompts(list);
}

/* ---------- UTILITIES ---------- */
function copyText(text, msg) {
  navigator.clipboard.writeText(text)
    .then(() => showToast(msg || 'Copied!'))
    .catch(() => showToast('Copy failed — select and copy manually.'));
}

// allowHTML only for trusted, hardcoded strings
function showToast(message, allowHTML = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  if (allowHTML) toast.innerHTML = message; else toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), allowHTML ? 5000 : 2600);
}
