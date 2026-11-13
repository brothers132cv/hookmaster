/* =========================================================
   HookMaster — Cloud data layer (cloud.js)
   Firestore: public hooks (read), staff-only writes.
   Media: Cloudflare Worker + R2 (see /worker).
   Set WORKER_BASE after deploying the worker.
   ========================================================= */

const CLOUD_CONFIG = {
  WORKER_BASE: '',                       // e.g. https://hookmaster-media.YOURNAME.workers.dev
  ADMIN_EMAIL: 'trunghieuhvtc@gmail.com' // UI hint only; real enforcement = rules + worker
};

const Cloud = {
  async db() { await loadFirebase(); return firebase.firestore(); },

  /** Hooks published by staff (newest first). Never throws. */
  async fetchHooks() {
    if (typeof AUTH_CONFIGURED === 'undefined' || !AUTH_CONFIGURED) return [];
    try {
      const db = await this.db();
      const snap = await db.collection('hooks').where('published', '==', true).get();
      return snap.docs
        .map(d => d.data())
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
      console.warn('Cloud hooks unavailable', e);
      return [];
    }
  },

  /** Staff role for a signed-in user: 'admin' | 'va' | null */
  async getRole(user) {
    if (!user || !user.email) return null;
    const email = user.email.toLowerCase();
    if (email === CLOUD_CONFIG.ADMIN_EMAIL) return 'admin';
    try {
      const db = await this.db();
      const doc = await db.collection('staff').doc(email).get();
      return doc.exists ? 'va' : null;
    } catch (e) { return null; }
  },

  mediaUrl(key) {
    return key ? `${CLOUD_CONFIG.WORKER_BASE}/m/${key}` : '';
  },

  /** Upload a file to R2 via the worker (staff only). Returns the object key. */
  upload(file, folder, onProgress) {
    return new Promise(async (resolve, reject) => {
      if (!CLOUD_CONFIG.WORKER_BASE) return reject(new Error('WORKER_BASE is not set in js/cloud.js'));
      const token = await firebase.auth().currentUser.getIdToken();
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-');
      const key = `${folder}/${Date.now()}-${safe}`;
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${CLOUD_CONFIG.WORKER_BASE}/upload/${key}`);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
      xhr.onload = () => xhr.status === 200 ? resolve(key) : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }
};
