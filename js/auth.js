/* =========================================================
   HookMaster — Visitor Sign-In (auth.js)
   Visitors sign in ONLY to download hooks / save favorites.
   There is NO admin role in the public site. Owner tools live in
   /local-admin (never deployed). Real auth = Firebase Authentication.
   Setup: paste your Firebase web config into FIREBASE_CONFIG below.
   ========================================================= */

const FIREBASE_CONFIG = {
  apiKey: '',          // Firebase Console > Project settings > Your apps
  authDomain: '',      // e.g. hookmaster-xxxx.firebaseapp.com
  projectId: '',
  appId: ''
};
const AUTH_CONFIGURED = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
const FB_VERSION = '10.12.2';

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const sanitizeText = esc; // backwards-compatible alias

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

let _fbPromise = null;
function loadFirebase() {
  if (!AUTH_CONFIGURED) return Promise.reject(new Error('Firebase not configured'));
  if (!_fbPromise) _fbPromise = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    return firebase;
  })();
  return _fbPromise;
}

const HookAuth = {
  currentUser: null,
  isLoggedIn: false,
  fb: null,

  async init() {
    this.updateNavbar();
    if (!AUTH_CONFIGURED) return;
    try {
      await loadFirebase();
      this.fb = firebase.auth();
      this.fb.onAuthStateChanged(user => {
        this.currentUser = user ? { uid: user.uid, email: user.email, name: user.displayName || (user.email || 'User').split('@')[0] } : null;
        this.isLoggedIn = Boolean(user);
        this.updateNavbar();
      });
    } catch (e) {
      console.error('Auth failed to load', e);
    }
  },

  updateNavbar() {
    const cta = document.querySelector('.navbar-cta');
    if (!cta) return;
    document.getElementById('user-nav-dropdown')?.remove();
    document.getElementById('btn-open-signin')?.remove();

    if (this.isLoggedIn && this.currentUser) {
      const name = esc(this.currentUser.name);
      cta.insertAdjacentHTML('afterbegin', `
        <div id="user-nav-dropdown" style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:.88rem;font-weight:700;color:#fff;">👋 ${name}</span>
          <a href="hooks.html?tab=saved" class="btn btn-secondary btn-sm">Saved</a>
          <button class="btn btn-secondary btn-sm" onclick="HookAuth.logout()">Sign Out</button>
        </div>`);
    } else {
      cta.insertAdjacentHTML('afterbegin',
        `<button class="btn btn-secondary btn-sm" id="btn-open-signin" onclick="HookAuth.openModal()" style="padding:8px 16px;">Sign In</button>`);
    }
  },

  setupAuthModal() {
    if (document.getElementById('auth-modal')) return;
    const notice = AUTH_CONFIGURED ? '' :
      `<p style="color:#fbbf24;font-size:.8rem;text-align:center;margin-bottom:14px;">Sign-in is launching soon. Downloads are open in the meantime.</p>`;
    const dis = AUTH_CONFIGURED ? '' : 'disabled style="opacity:.5;cursor:not-allowed;width:100%;justify-content:center;"';
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="auth-modal" style="z-index:2500;">
        <div class="download-modal" style="max-width:440px;text-align:left;">
          <button class="modal-close" onclick="HookAuth.closeModal()" aria-label="Close">✕</button>
          <div style="text-align:center;margin-bottom:20px;">
            <h3 style="font-size:1.4rem;font-weight:900;color:#fff;">Join <span class="gradient-text">HookMaster</span></h3>
            <p style="color:var(--text-secondary);font-size:.88rem;">Free account to download hooks and save your favorites.</p>
          </div>
          ${notice}
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;">
            <button class="btn btn-secondary" ${dis || 'style="width:100%;justify-content:center;"'} onclick="HookAuth.loginWithProvider('google')">Continue with Google</button>
            <button class="btn btn-secondary" ${dis || 'style="width:100%;justify-content:center;"'} onclick="HookAuth.loginWithProvider('facebook')">Continue with Facebook</button>
          </div>
          <form id="auth-email-form" onsubmit="HookAuth.handleEmailAuth(event)">
            <input type="email" id="auth-email-input" required autocomplete="email" placeholder="you@example.com" class="search-input" style="margin-bottom:10px;" ${AUTH_CONFIGURED ? '' : 'disabled'}>
            <input type="password" id="auth-password-input" required minlength="8" autocomplete="current-password" placeholder="Password (8+ characters)" class="search-input" style="margin-bottom:14px;" ${AUTH_CONFIGURED ? '' : 'disabled'}>
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" ${AUTH_CONFIGURED ? '' : 'disabled'}>Sign In / Create Account</button>
          </form>
          <div id="auth-error" style="color:#f87171;font-size:.8rem;margin-top:10px;text-align:center;"></div>
        </div>
      </div>`);
  },

  openModal() { this.setupAuthModal(); document.getElementById('auth-modal')?.classList.add('active'); },
  closeModal() { document.getElementById('auth-modal')?.classList.remove('active'); },

  showError(msg) { const el = document.getElementById('auth-error'); if (el) el.textContent = msg; },

  async handleEmailAuth(e) {
    e.preventDefault();
    if (!this.fb) return;
    const email = document.getElementById('auth-email-input').value.trim();
    const password = document.getElementById('auth-password-input').value;
    try {
      try {
        await this.fb.signInWithEmailAndPassword(email, password);
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await this.fb.createUserWithEmailAndPassword(email, password);
        } else throw err;
      }
      this.closeModal();
    } catch (err) {
      this.showError(err.code === 'auth/email-already-in-use' ? 'Wrong password for this email.' : 'Sign-in failed. Check your details and try again.');
    }
  },

  async loginWithProvider(name) {
    if (!this.fb) return;
    const provider = name === 'google' ? new firebase.auth.GoogleAuthProvider() : new firebase.auth.FacebookAuthProvider();
    try { await this.fb.signInWithPopup(provider); this.closeModal(); }
    catch (err) { this.showError('Sign-in was cancelled or failed.'); }
  },

  async logout() { if (this.fb) await this.fb.signOut(); }
};

document.addEventListener('DOMContentLoaded', () => HookAuth.init());
