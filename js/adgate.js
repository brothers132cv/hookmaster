/* =========================================================
   HookMaster AdGate (adgate.js)
   Shows an ad screen, runs the work (render / fetch) in the
   background, then downloads INSTANTLY when both are done.
   Requires sign-in (when Firebase is configured).

   To show real ads: set AD_CONFIG.adsenseClient / adsenseSlot
   (and allow pagead2.googlesyndication.com in the page CSP).
   ========================================================= */

const AD_CONFIG = {
  minSeconds: 6,          // minimum time the ad screen is shown
  adsenseClient: '',      // e.g. 'ca-pub-1234567890123456'
  adsenseSlot: ''         // e.g. '1234567890'
};

const AdGate = {
  active: false,

  isLoggedIn() {
    if (typeof AUTH_CONFIGURED === 'undefined' || !AUTH_CONFIGURED) return true; // auth not set up yet
    if (typeof HookAuth !== 'undefined' && HookAuth.isLoggedIn) return true;
    try { return !!(window.firebase && firebase.apps.length && firebase.auth().currentUser); } catch (e) { return false; }
  },

  build() {
    if (document.getElementById('adgate-modal')) return;
    const ad = AD_CONFIG.adsenseClient && AD_CONFIG.adsenseSlot
      ? `<ins class="adsbygoogle" style="display:block;min-height:150px" data-ad-client="${AD_CONFIG.adsenseClient}" data-ad-slot="${AD_CONFIG.adsenseSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
      : `<div style="text-align:left">
           <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Sponsored · HookMaster</span><span style="font-size:.7rem;color:var(--accent-pink);font-weight:700">PRO VAULT</span></div>
           <h4 style="font-size:1.05rem;font-weight:800;color:#fff;margin-bottom:4px">Unlock 4,000+ 4K Hooks &amp; AI Prompts</h4>
           <p style="font-size:.82rem;color:var(--text-secondary);line-height:1.4;margin-bottom:12px">Million-view hook archives, luxury b-roll and caption templates. One payment, lifetime access.</p>
           <a href="shop.html#bundle" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Get All Access — $49 →</a>
         </div>`;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="adgate-modal" style="z-index:3000">
        <div class="download-modal" style="max-width:520px">
          <button class="modal-close" id="adgate-close" aria-label="Close">✕</button>
          <h3 id="adgate-title" style="font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:4px"></h3>
          <p id="adgate-sub" style="color:var(--text-secondary);font-size:.88rem"></p>
          <div class="countdown-box">
            <div class="countdown-number" id="adgate-num">…</div>
            <div id="adgate-msg" style="font-size:.85rem;color:var(--text-muted)"></div>
            <div class="countdown-progress-bar"><div class="countdown-progress-fill" id="adgate-bar" style="width:0;transition:width .3s linear"></div></div>
          </div>
          <div class="ad-slot-container" style="min-height:150px;justify-content:center">${ad}</div>
          <button class="btn btn-primary" id="adgate-dl" style="width:100%;justify-content:center" disabled>Preparing…</button>
        </div>
      </div>`);
    if (AD_CONFIG.adsenseClient) {
      const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CONFIG.adsenseClient;
      s.onload = () => { try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { } };
      document.head.appendChild(s);
    }
  },

  save(res) {
    const a = document.createElement('a');
    if (res.blob) { a.href = URL.createObjectURL(res.blob); a.download = res.filename || 'HookMaster.mp4'; }
    else { a.href = res.url; a.download = res.filename || ''; a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a); a.click(); a.remove();
    if (res.blob) setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  },

  /**
   * opts: { title, sub, work(onProgress, ctrl) -> Promise<{blob,filename}|{url,filename}> }
   */
  run(opts) {
    if (this.active) return;
    if (!this.isLoggedIn()) {
      if (typeof HookAuth !== 'undefined') HookAuth.openModal();
      if (typeof showToast === 'function') showToast('Sign in (free) to download.');
      return;
    }
    this.build(); this.active = true;
    const $ = id => document.getElementById(id), modal = $('adgate-modal');
    const ctrl = { cancelled: false }, min = AD_CONFIG.minSeconds;
    let left = min, wp = 0.05, result = null, failed = false, finished = false;
    $('adgate-title').innerHTML = opts.title || 'Preparing your download';
    $('adgate-sub').textContent = opts.sub || 'Your file will download automatically.';
    const dl = $('adgate-dl'); dl.disabled = true; dl.textContent = 'Preparing…'; dl.onclick = null;
    modal.classList.add('active');

    const ui = () => {
      const cf = 1 - left / min;
      $('adgate-bar').style.width = Math.round(Math.min(wp, cf) * 100) + '%';
      $('adgate-num').textContent = failed ? '⚠️' : (left > 0 ? left : (result ? '✓' : '…'));
      $('adgate-msg').textContent = failed ? failed
        : result && left <= 0 ? 'Done! Your download is starting…'
        : left > 0 ? `Download starts automatically · ${Math.round(wp * 100)}% ready`
        : `Finishing your file… ${Math.round(wp * 100)}%`;
    };
    const close = () => { finished = true; clearInterval(iv); ctrl.cancelled = true; modal.classList.remove('active'); this.active = false; };
    $('adgate-close').onclick = close;
    const maybeFinish = () => {
      if (finished || !result || left > 0) return;
      finished = true; clearInterval(iv); this.save(result); ui();
      dl.disabled = false; dl.textContent = '⬇ Download again'; dl.onclick = () => this.save(result);
      $('adgate-sub').textContent = 'Downloaded! Check your Downloads folder.'; this.active = false;
    };
    const iv = setInterval(() => { if (left > 0) left--; ui(); maybeFinish(); }, 1000);
    ui();

    Promise.resolve().then(() => opts.work(p => { wp = Math.max(wp, Math.min(0.99, p)); }, ctrl)).then(r => {
      if (ctrl.cancelled) return; result = r; wp = 1; ui(); maybeFinish();
    }).catch(err => {
      if (ctrl.cancelled) return; failed = err && err.message ? err.message : 'Something went wrong.'; clearInterval(iv); ui();
      dl.textContent = 'Close'; dl.disabled = false; dl.onclick = close; this.active = true;
    });
  }
};
