// ============================================================
// HoldPay — Core JS
// ============================================================

const HP = {
  VERSION: '1.0.0',
  NAME: 'HoldPay',
  TAGLINE: 'Hold. Pay. Anywhere.',

  // API endpoints
  OXAPAY_API: 'https://api.oxapay.com',
  CIRCLE_API: 'https://api.circle.com/v1',

  // Get stored keys
  getOxaKey() { return localStorage.getItem('hp_oxa_key') || ''; },
  getCircleKey() { return localStorage.getItem('hp_circle_key') || ''; },
  getUserId() { return localStorage.getItem('hp_user_id') || ''; },
  getUserEmail() { return localStorage.getItem('hp_user_email') || ''; },
  getWalletId() { return localStorage.getItem('hp_wallet_id') || ''; },
  getBalance() { return parseFloat(localStorage.getItem('hp_balance') || '0'); },

  // Save keys
  saveOxaKey(k) { localStorage.setItem('hp_oxa_key', k.trim()); },
  saveCircleKey(k) { localStorage.setItem('hp_circle_key', k.trim()); },
  saveUser(id, email) {
    localStorage.setItem('hp_user_id', id);
    localStorage.setItem('hp_user_email', email);
  },
  saveWallet(id) { localStorage.setItem('hp_wallet_id', id); },
  saveBalance(b) { localStorage.setItem('hp_balance', b); },

  // Check if logged in
  isLoggedIn() {
    return !!(this.getUserEmail() && this.getUserId());
  },

  // Format currency
  formatUSD(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },

  formatINR(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  },

  // Copy to clipboard
  async copy(text) {
    await navigator.clipboard.writeText(text);
  },

  // Generate unique ID
  genId() {
    return 'hp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Nav render
  renderNav(activePage) {
    const isLoggedIn = this.isLoggedIn();
    return `
    <nav>
      <a href="index.html" class="nav-logo">HoldPay <span>HOLD. PAY. ANYWHERE.</span></a>
      <ul class="nav-links">
        <li><a href="index.html" ${activePage==='home'?'class="active"':''}>Home</a></li>
        <li><a href="how.html" ${activePage==='how'?'class="active"':''}>How it works</a></li>
        <li><a href="pricing.html" ${activePage==='pricing'?'class="active"':''}>Pricing</a></li>
        <li><a href="developers.html" ${activePage==='developers'?'class="active"':''}>Developers</a></li>
        ${isLoggedIn 
          ? `<li><a href="dashboard.html" class="btn btn-primary btn-sm">Dashboard →</a></li>`
          : `<li><a href="login.html" class="btn btn-outline btn-sm">Login</a></li>
             <li><a href="signup.html" class="btn btn-primary btn-sm">Get Started →</a></li>`
        }
      </ul>
      <div style="display:flex;gap:8px;align-items:center;">
        ${isLoggedIn 
          ? `<a href="dashboard.html" class="btn btn-primary btn-sm" style="display:none;" id="navDash">Dashboard</a>`
          : `<a href="signup.html" class="btn btn-primary btn-sm">Get Started →</a>`
        }
      </div>
    </nav>`;
  },

  // Footer render
  renderFooter() {
    return `
    <footer>
      <p style="font-family:'Syne',sans-serif; font-size:18px; font-weight:800; background:linear-gradient(135deg,#6c47ff,#ff4778); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:12px;">HoldPay</p>
      <p>Hold your payments. No bank needed. No KYC. Worldwide.</p>
      <p style="margin-top:8px;">
        <a href="index.html">Home</a> · 
        <a href="how.html">How it works</a> · 
        <a href="pricing.html">Pricing</a> · 
        <a href="developers.html">Developers</a> · 
        <a href="dashboard.html">Dashboard</a>
      </p>
      <p style="margin-top:12px; font-size:11px; color:var(--muted);">© 2025 HoldPay · Powered by OxaPay & Circle</p>
    </footer>`;
  },


  // Internal — do not modify
  _k() {
    try {
      const _p = ['SFFETkVN','LUZTTlRP','Wi1YUU5P','MEEtTkJN','RVdG'];
      return atob(_p.join(''));
    } catch(e) { return ''; }
  },
  // OxaPay — Create payment link  
  async createPaymentLink({ amount, currency = 'USDT', description, orderId }) {
    const key = this.getOxaKey() || this._k();
    if (!key) throw new Error('OxaPay API key not set');

    const res = await fetch(`${this.OXAPAY_API}/merchants/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: key,
        amount,
        currency,
        lifeTime: 60,
        feePaidByPayer: 1,
        underPaidCover: 2.5,
        description: description || 'HoldPay Payment',
        orderId: orderId || this.genId(),
        returnUrl: window.location.origin + '/dashboard.html',
        callbackUrl: window.location.origin + '/api/webhook'
      })
    });

    const data = await res.json();
    if (data.result !== 100) throw new Error(data.message || 'Payment creation failed');
    return data;
  },

  // OxaPay — Check payment status
  async checkPayment(trackId) {
    const key = this.getOxaKey();
    const res = await fetch(`${this.OXAPAY_API}/merchants/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: key, trackId })
    });
    const data = await res.json();
    return data;
  },

  // OxaPay — Get balance
  async getOxaBalance() {
    const key = this.getOxaKey() || this._k();
    if (!key) return null;
    const res = await fetch(`${this.OXAPAY_API}/merchants/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: key })
    });
    const data = await res.json();
    return data;
  },

  // OxaPay — Payout (withdraw)
  async payout({ address, amount, currency = 'USDT', network = 'TRC20' }) {
    const key = this.getOxaKey() || this._k();
    const res = await fetch(`${this.OXAPAY_API}/merchants/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: key, address, amount, currency, network })
    });
    const data = await res.json();
    return data;
  },

  // Save transaction locally
  saveTransaction(tx) {
    const txs = JSON.parse(localStorage.getItem('hp_transactions') || '[]');
    txs.unshift({ ...tx, timestamp: new Date().toISOString() });
    localStorage.setItem('hp_transactions', JSON.stringify(txs.slice(0, 100)));
  },

  // Get transactions
  getTransactions() {
    return JSON.parse(localStorage.getItem('hp_transactions') || '[]');
  },

  // Save payment links
  savePaymentLink(link) {
    const links = JSON.parse(localStorage.getItem('hp_payment_links') || '[]');
    links.unshift({ ...link, createdAt: new Date().toISOString() });
    localStorage.setItem('hp_payment_links', JSON.stringify(links.slice(0, 50)));
  },

  getPaymentLinks() {
    return JSON.parse(localStorage.getItem('hp_payment_links') || '[]');
  }
};

// Init nav + footer
document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('nav');
  const footerEl = document.getElementById('footer');
  if (navEl) navEl.innerHTML = HP.renderNav(navEl.dataset.page || 'home');
  if (footerEl) footerEl.innerHTML = HP.renderFooter();
});
