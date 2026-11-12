/* ============================================
   HookMaster — Core JavaScript
   Video Hooks Vault + Ad-Monetized Download Flow
   Native US English Version
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let allHooks = [];
let activeNiche = 'all';
let activeCategory = 'all';
let searchQuery = '';
let currentDownloadHook = null;
let countdownTimer = null;

async function initApp() {
  try {
    const response = await fetch('data/hooks.json');
    allHooks = await response.json();
  } catch (e) {
    console.log('Loading embedded hooks dataset...');
    allHooks = getEmbeddedHooks();
  }

  // Hook up hooks page if present
  if (document.getElementById('video-hooks-grid')) {
    renderVideoHooks(allHooks);
    setupSearch();
    setupFilters();
  }

  // Hook up home page featured hooks
  if (document.getElementById('featured-video-hooks')) {
    renderFeaturedVideoHooks();
  }

  setupMobileMenu();
  setupScrollEffects();
  setupEmailPopup();
  setupDownloadModal();
}

/* =========================================================
   RENDER VIDEO HOOKS (VERTICAL 9:16 CARDS)
   ========================================================= */
function renderVideoHooks(hooks) {
  const grid = document.getElementById('video-hooks-grid');
  if (!grid) return;

  const countEl = document.getElementById('hooks-count');
  if (countEl) {
    countEl.innerHTML = `Showing <span>${hooks.length}</span> viral video hooks`;
  }

  if (hooks.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 12px;">🎬</div>
        <h3>No video hooks found</h3>
        <p>Try searching another keyword or clear your niche filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = hooks.map(hook => createVideoHookCard(hook)).join('');
  attachVideoPreviewListeners();
}

function renderFeaturedVideoHooks() {
  const container = document.getElementById('featured-video-hooks');
  if (!container) return;

  const featured = allHooks.slice(0, 6);
  container.innerHTML = featured.map(hook => createVideoHookCard(hook)).join('');
  attachVideoPreviewListeners();
}

function createVideoHookCard(hook) {
  return `
    <div class="video-hook-card" data-id="${hook.id}">
      <div class="video-preview-wrapper" onclick="toggleVideoPlayback(this)">
        <video 
          src="${hook.videoSample}" 
          poster="" 
          preload="metadata" 
          muted 
          loop 
          playsinline
          style="background: ${hook.bgGradient || '#0f172a'};"
        ></video>
        <div class="video-overlay-gradient"></div>
        
        <div class="video-top-badges">
          <span class="badge badge-resolution">HD 1080p</span>
          <span class="badge badge-niche">${hook.duration || '4s'}</span>
        </div>

        <div class="video-play-btn">▶</div>

        <div class="video-hook-caption">
          <div class="caption-text">"${hook.hook}"</div>
        </div>
      </div>

      <div class="video-card-body">
        <div class="video-meta-tags">
          <span class="badge badge-niche">${hook.niche}</span>
          <span class="badge badge-category">${hook.category}</span>
          <span class="badge badge-views">🔥 ${hook.views} views</span>
        </div>

        <div class="video-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="copyHookCaption('${hook.hook.replace(/'/g, "\\'")}')">
            📋 Copy Text
          </button>
          <button class="btn btn-download btn-sm" onclick="openDownloadModal(${hook.id})">
            ⬇ Download Video
          </button>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   VIDEO HOVER / PREVIEW CONTROLS
   ========================================================= */
function attachVideoPreviewListeners() {
  document.querySelectorAll('.video-preview-wrapper').forEach(wrapper => {
    const video = wrapper.querySelector('video');
    const playBtn = wrapper.querySelector('.video-play-btn');

    wrapper.addEventListener('mouseenter', () => {
      video.play().then(() => {
        playBtn.style.opacity = '0';
      }).catch(() => {});
    });

    wrapper.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
      playBtn.style.opacity = '1';
    });
  });
}

function toggleVideoPlayback(wrapper) {
  const video = wrapper.querySelector('video');
  const playBtn = wrapper.querySelector('.video-play-btn');
  if (video.paused) {
    video.play();
    playBtn.style.opacity = '0';
  } else {
    video.pause();
    playBtn.style.opacity = '1';
  }
}

/* =========================================================
   AD-SUPPORTED DOWNLOAD MODAL (MONETIZATION SYSTEM)
   ========================================================= */
function setupDownloadModal() {
  if (!document.getElementById('download-ad-modal')) {
    const modalHtml = `
      <div class="modal-overlay" id="download-ad-modal">
        <div class="download-modal">
          <button class="modal-close" onclick="closeDownloadModal()">✕</button>
          
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🎬</div>
          <h3 id="modal-hook-title" style="font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">Preparing Your Viral Video Hook</h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem;">Full HD 1080x1920 (9:16 Vertical Reel Format)</p>

          <!-- 5-Second Countdown Box -->
          <div class="countdown-box" id="countdown-wrapper">
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Your free download will be ready in:</div>
            <div class="countdown-number" id="countdown-timer">5</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Generating uncompressed 1080p MP4 file...</div>
            <div class="countdown-progress-bar">
              <div class="countdown-progress-fill" id="countdown-fill" style="width: 100%;"></div>
            </div>
          </div>

          <!-- ============================================== -->
          <!-- AD SPACE (MONETIZATION CONTAINER) -->
          <!-- Replace content below with AdSense/Affiliate -->
          <!-- ============================================== -->
          <div class="ad-slot-container">
            <span class="ad-badge">Sponsored</span>
            <div class="ad-content-box">
              <h4>🔥 CapCut Pro & AI Video Generator</h4>
              <p>Turn any script or hook into a 1M+ view Reel in under 60 seconds with AI b-roll.</p>
              <a href="https://gumroad.com" target="_blank" class="btn-ad">Claim 50% Off ↗</a>
            </div>
          </div>

          <!-- Download Action Button -->
          <div id="modal-download-action" style="margin-top: 14px;">
            <button class="btn btn-secondary btn-lg" id="btn-final-download" disabled style="width: 100%; opacity: 0.5; cursor: not-allowed;">
              ⏳ Please wait 5 seconds...
            </button>
          </div>

          <!-- Upsell to Gumroad Bundle -->
          <div class="modal-upsell-note">
            ⚡ Tired of waiting 5s per video? <br>
            <a href="shop.html" target="_blank">Get Instant 1-Click Access to All 500+ 4K Hooks (No Ads) on Gumroad →</a>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
}

function openDownloadModal(hookId) {
  const hook = allHooks.find(h => h.id === hookId) || allHooks[0];
  currentDownloadHook = hook;

  setupDownloadModal();
  const modal = document.getElementById('download-ad-modal');
  const titleEl = document.getElementById('modal-hook-title');
  const timerEl = document.getElementById('countdown-timer');
  const fillEl = document.getElementById('countdown-fill');
  const actionBtn = document.getElementById('btn-final-download');

  if (titleEl) titleEl.innerText = `"${hook.hook}"`;
  
  let timeLeft = 5;
  if (timerEl) timerEl.innerText = timeLeft;
  if (fillEl) fillEl.style.width = '100%';
  
  actionBtn.disabled = true;
  actionBtn.className = 'btn btn-secondary btn-lg';
  actionBtn.style.opacity = '0.5';
  actionBtn.style.cursor = 'not-allowed';
  actionBtn.innerHTML = `⏳ Download link ready in ${timeLeft}s...`;

  modal.classList.add('active');

  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.innerText = timeLeft;
    if (fillEl) fillEl.style.width = `${(timeLeft / 5) * 100}%`;
    if (actionBtn) actionBtn.innerHTML = `⏳ Download link ready in ${timeLeft}s...`;

    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      if (timerEl) timerEl.innerText = '✅ Ready!';
      if (fillEl) fillEl.style.width = '0%';

      actionBtn.disabled = false;
      actionBtn.className = 'btn btn-download btn-lg';
      actionBtn.style.opacity = '1';
      actionBtn.style.cursor = 'pointer';
      actionBtn.innerHTML = `📥 Download 1080p MP4 Free`;
      actionBtn.onclick = () => {
        triggerVideoDownload(currentDownloadHook);
      };
    }
  }, 1000);
}

function closeDownloadModal() {
  const modal = document.getElementById('download-ad-modal');
  if (modal) modal.classList.remove('active');
  if (countdownTimer) clearInterval(countdownTimer);
}

function triggerVideoDownload(hook) {
  showToast(`Downloading "${hook.hook.substring(0, 24)}..."`);
  
  const a = document.createElement('a');
  a.href = hook.videoSample;
  a.download = `HookMaster_${hook.niche}_${hook.id}.mp4`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    closeDownloadModal();
  }, 1200);
}

/* =========================================================
   SEARCH & FILTERS
   ========================================================= */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    filterAndRenderVideoHooks();
  });
}

function setupFilters() {
  document.querySelectorAll('.filter-btn[data-niche]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-niche]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNiche = btn.dataset.niche;
      filterAndRenderVideoHooks();
    });
  });

  document.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-category]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      filterAndRenderVideoHooks();
    });
  });
}

function filterAndRenderVideoHooks() {
  let filtered = allHooks;

  if (activeNiche !== 'all') {
    filtered = filtered.filter(h => h.niche === activeNiche);
  }

  if (activeCategory !== 'all') {
    filtered = filtered.filter(h => h.category === activeCategory);
  }

  if (searchQuery) {
    filtered = filtered.filter(h =>
      h.hook.toLowerCase().includes(searchQuery) ||
      h.niche.toLowerCase().includes(searchQuery) ||
      (h.category && h.category.toLowerCase().includes(searchQuery))
    );
  }

  renderVideoHooks(filtered);
}

/* =========================================================
   UTILITIES
   ========================================================= */
function copyHookCaption(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Hook text copied to clipboard!');
  }).catch(() => {
    showToast('Hook text copied to clipboard!');
  });
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `✅ ${message}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const links = document.getElementById('navbar-links');
  if (!btn || !links) return;

  btn.addEventListener('click', () => {
    links.classList.toggle('open');
    btn.textContent = links.classList.contains('open') ? '✕' : '☰';
  });
}

function setupScrollEffects() {
  const scrollTopBtn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => {
    if (scrollTopBtn) {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function setupEmailPopup() {
  const modal = document.getElementById('email-modal');
  if (!modal) return;

  let popupShown = sessionStorage.getItem('popupShown');
  if (!popupShown) {
    setTimeout(() => {
      if (!sessionStorage.getItem('popupShown')) {
        modal.classList.add('active');
        sessionStorage.setItem('popupShown', 'true');
      }
    }, 28000);
  }

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
}

function handleEmailSubmit(event, formId) {
  event.preventDefault();
  const form = document.getElementById(formId);
  if (!form) return;
  const input = form.querySelector('input[type="email"]');
  showToast("🎉 You're in! Check your inbox for your 20 secret bonus video hooks.");
  input.value = '';
  const modal = document.getElementById('email-modal');
  if (modal) modal.classList.remove('active');
}

/* =========================================================
   EMBEDDED VIDEO HOOKS DATASET (FALLBACK)
   ========================================================= */
function getEmbeddedHooks() {
  return [
    {
      id: 1,
      hook: "Stop scrolling if you want your Reels to blow up",
      niche: "business",
      category: "Luxury Aesthetic",
      duration: "4s",
      resolution: "1080x1920",
      views: "2.4M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #1e1b4b",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4"
    },
    {
      id: 2,
      hook: "I made $10,000 in 30 days using this 1 secret",
      niche: "finance",
      category: "Dark Wealth",
      duration: "3s",
      resolution: "1080x1920",
      views: "5.1M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #064e3b",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-counting-money-bills-42653-large.mp4"
    },
    {
      id: 3,
      hook: "Stop doing regular crunches. Do this instead",
      niche: "fitness",
      category: "Gym Motivation",
      duration: "5s",
      resolution: "1080x1920",
      views: "4.2M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #7f1d1d",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-athletic-man-lifting-weights-in-a-gym-41584-large.mp4"
    },
    {
      id: 4,
      hook: "POV: You finally cracked the Instagram algorithm",
      niche: "general",
      category: "Cinematic B-Roll",
      duration: "4s",
      resolution: "1080x1920",
      views: "8.7M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #312e81",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-night-sky-with-stars-at-a-calm-lake-time-lapse-42531-large.mp4"
    },
    {
      id: 5,
      hook: "This $10 skincare product replaced my entire $200 routine",
      niche: "beauty",
      category: "Aesthetic Glow",
      duration: "3s",
      resolution: "1080x1920",
      views: "3.8M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #831843",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-skincare-routine-with-cream-43542-large.mp4"
    },
    {
      id: 6,
      hook: "Gordon Ramsay would cry if he saw this 5-minute hack",
      niche: "food",
      category: "Satisfying Cooking",
      duration: "4s",
      resolution: "1080x1920",
      views: "6.3M",
      bgGradient: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%), #78350f",
      videoSample: "https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-plate-42284-large.mp4"
    }
  ];
}
