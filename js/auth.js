/* =========================================================
   HookMaster — Authentication & User Management (auth.js)
   Firebase Auth + Social Logins + Client Fallback Security
   ========================================================= */

// Sanitize inputs to prevent XSS
function sanitizeText(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// User state
const HookAuth = {
  currentUser: null,
  isLoggedIn: false,
  isAdmin: false,

  init() {
    // Check saved session in localStorage
    const savedUser = localStorage.getItem('hookmaster_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.isLoggedIn = true;
        this.isAdmin = this.currentUser.role === 'admin' || this.currentUser.email === 'admin@hookmaster.guru';
      } catch (e) {
        localStorage.removeItem('hookmaster_user');
      }
    }
    this.updateNavbar();
    this.setupAuthModal();
  },

  updateNavbar() {
    const authCtaContainer = document.querySelector('.navbar-cta');
    if (!authCtaContainer) return;

    // Check if user menu already exists
    let userMenu = document.getElementById('user-nav-dropdown');
    let signinBtn = document.getElementById('btn-open-signin');

    if (this.isLoggedIn && this.currentUser) {
      if (signinBtn) signinBtn.remove();
      if (!userMenu) {
        const initials = (this.currentUser.name || this.currentUser.email || 'U').substring(0, 2).toUpperCase();
        const adminBadge = this.isAdmin ? '<span class="badge badge-category" style="font-size: 0.65rem; margin-left: 4px;">ADMIN</span>' : '';
        
        const menuHtml = `
          <div class="user-dropdown-wrapper" id="user-nav-dropdown" style="position: relative; display: inline-block;">
            <button class="user-avatar-btn" id="btn-toggle-user-menu" style="display: flex; align-items: center; gap: 8px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 30px; padding: 6px 14px; color: #fff; cursor: pointer; font-family: inherit; font-size: 0.88rem; font-weight: 700;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--accent-gradient); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem;">${initials}</span>
              <span>${sanitizeText(this.currentUser.name || this.currentUser.email.split('@')[0])}</span>
              ${adminBadge}
              <span style="font-size: 0.7rem; color: var(--text-muted);">▼</span>
            </button>
            <div class="user-dropdown-menu" id="user-menu-list" style="display: none; position: absolute; right: 0; top: 120%; width: 220px; background: #12121e; border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 1100; overflow: hidden; padding: 8px 0;">
              <div style="padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 0.75rem; color: var(--text-muted);">Signed in as</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: #fff; word-break: break-all;">${sanitizeText(this.currentUser.email)}</div>
              </div>
              <a href="studio.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: #cbd5e1; font-size: 0.88rem; text-decoration: none;">
                <span>✂️</span> Caption & Clip Studio
              </a>
              <a href="hooks.html?tab=saved" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: #cbd5e1; font-size: 0.88rem; text-decoration: none;">
                <span>⭐</span> Saved Hooks
              </a>
              ${this.isAdmin ? `
                <a href="admin.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: #a78bfa; font-weight: 700; font-size: 0.88rem; text-decoration: none; background: rgba(139, 92, 246, 0.08);">
                  <span>⚡</span> Admin Dashboard
                </a>
              ` : ''}
              <div style="border-top: 1px solid rgba(255,255,255,0.06); margin: 6px 0;"></div>
              <button onclick="HookAuth.logout()" style="width: 100%; text-align: left; background: none; border: none; padding: 10px 16px; color: #f87171; font-family: inherit; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        `;
        authCtaContainer.insertAdjacentHTML('afterbegin', menuHtml);
        
        // Setup dropdown toggle
        const toggleBtn = document.getElementById('btn-toggle-user-menu');
        const menuList = document.getElementById('user-menu-list');
        if (toggleBtn && menuList) {
          toggleBtn.onclick = (e) => {
            e.stopPropagation();
            menuList.style.display = menuList.style.display === 'block' ? 'none' : 'block';
          };
          document.addEventListener('click', () => {
            menuList.style.display = 'none';
          });
        }
      }
    } else {
      if (userMenu) userMenu.remove();
      if (!signinBtn) {
        const signinBtnHtml = `
          <button class="btn btn-secondary btn-sm" id="btn-open-signin" onclick="HookAuth.openModal()" style="padding: 8px 16px;">
            Sign In
          </button>
        `;
        authCtaContainer.insertAdjacentHTML('afterbegin', signinBtnHtml);
      }
    }
  },

  setupAuthModal() {
    if (document.getElementById('auth-modal')) return;

    const modalHtml = `
      <div class="modal-overlay" id="auth-modal" style="z-index: 2500;">
        <div class="download-modal" style="max-width: 440px; text-align: left;">
          <button class="modal-close" onclick="HookAuth.closeModal()">✕</button>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">🪝</div>
            <h3 style="font-size: 1.4rem; font-weight: 900; color: #fff;">Join <span class="gradient-text">HookMaster</span></h3>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">Save favorite hooks, create captions, and unlock creator tools.</p>
          </div>

          <!-- Social Logins -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            <button class="btn btn-secondary" onclick="HookAuth.loginWithGoogle()" style="width: 100%; justify-content: center; background: #ffffff; color: #000; border: none; font-weight: 700;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.15C3.25 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.27 6.59l4.01 3.15c.95-2.84 3.6-4.99 6.72-4.99z"/></svg>
              Continue with Google
            </button>
            <button class="btn btn-secondary" onclick="HookAuth.loginWithFacebook()" style="width: 100%; justify-content: center; background: #1877F2; color: #fff; border: none; font-weight: 700;">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </button>
          </div>

          <div style="display: flex; align-items: center; margin: 18px 0; color: var(--text-muted); font-size: 0.8rem;">
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
            <span style="padding: 0 12px; text-transform: uppercase; letter-spacing: 1px;">Or with email</span>
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
          </div>

          <!-- Email / Password Form -->
          <form id="auth-email-form" onsubmit="HookAuth.handleEmailAuth(event)">
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Email address</label>
              <input type="email" id="auth-email-input" required placeholder="you@example.com" class="search-input" style="padding: 12px 14px; font-size: 0.95rem;">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Password</label>
              <input type="password" id="auth-password-input" required placeholder="••••••••" class="search-input" style="padding: 12px 14px; font-size: 0.95rem;">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; font-size: 1rem; padding: 13px;">
              Sign In / Register
            </button>
          </form>

          <div style="margin-top: 14px; text-align: center; font-size: 0.78rem; color: var(--text-muted);">
            Admin access: <code style="color: #a78bfa;">admin@hookmaster.guru</code> (Pass: <code style="color: #a78bfa;">admin123</code>)
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  openModal() {
    this.setupAuthModal();
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },

  handleEmailAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email-input').value.trim();
    const password = document.getElementById('auth-password-input').value.trim();

    if (!email || !password) return;

    // Check for admin credential
    let role = 'user';
    let name = email.split('@')[0];

    if (email === 'admin@hookmaster.guru' && password === 'admin123') {
      role = 'admin';
      name = 'Admin (HookMaster)';
    }

    const userData = {
      email: email,
      name: name,
      role: role,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('hookmaster_user', JSON.stringify(userData));
    this.currentUser = userData;
    this.isLoggedIn = true;
    this.isAdmin = role === 'admin';

    this.closeModal();
    this.updateNavbar();
    showToast(`Welcome back, ${name}!`);

    // If on admin page and not logged in, reload
    if (window.location.pathname.includes('admin.html')) {
      window.location.reload();
    }
  },

  loginWithGoogle() {
    // In production with Firebase, call signInWithPopup(auth, googleProvider)
    const mockUser = {
      email: 'creator.us@gmail.com',
      name: 'Alex Rivera',
      role: 'user',
      provider: 'google'
    };
    localStorage.setItem('hookmaster_user', JSON.stringify(mockUser));
    this.currentUser = mockUser;
    this.isLoggedIn = true;
    this.isAdmin = false;
    this.closeModal();
    this.updateNavbar();
    showToast(`Signed in with Google as ${mockUser.name}!`);
  },

  loginWithFacebook() {
    const mockUser = {
      email: 'creator.fb@meta.com',
      name: 'Sam Taylor',
      role: 'user',
      provider: 'facebook'
    };
    localStorage.setItem('hookmaster_user', JSON.stringify(mockUser));
    this.currentUser = mockUser;
    this.isLoggedIn = true;
    this.isAdmin = false;
    this.closeModal();
    this.updateNavbar();
    showToast(`Signed in with Facebook as ${mockUser.name}!`);
  },

  logout() {
    localStorage.removeItem('hookmaster_user');
    this.currentUser = null;
    this.isLoggedIn = false;
    this.isAdmin = false;
    this.updateNavbar();
    showToast('Signed out successfully.');

    // If on admin page, redirect to home
    if (window.location.pathname.includes('admin.html')) {
      window.location.href = 'index.html';
    }
  }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  HookAuth.init();
});
