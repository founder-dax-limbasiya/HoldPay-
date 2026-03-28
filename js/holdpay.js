// ============================================================
// HoldPay — Core JS (v1.1.0 — Edge Functions edition)
// ============================================================

const HP = {
  VERSION: '1.1.0',
  NAME: 'HoldPay',
  TAGLINE: 'Hold. Pay. Anywhere.',

  // Supabase config (anon key = public safe)
  SUPABASE_URL: 'https://curruifdoznoafqniurv.supabase.co',
  SUPABASE_ANON_KEY: '', //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cnJ1aWZkb3pub2FmcW5pdXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzI1NDcsImV4cCI6MjA4OTc0ODU0N30.bEn3ErXI2Dt9IPLfy0XW7Gm9JP1Y2L60zqgNEbXsaTc


  get FUNCTIONS_URL() {
    return `${this.SUPABASE_URL}/functions/v1`;
  },

  getUserId()    { return localStorage.getItem('hp_user_id')    || ''; },
  getUserEmail() { return localStorage.getItem('hp_user_email') || ''; },
  getWalletId()  { return localStorage.getItem('hp_wallet_id')  || ''; },
  getBalance()   { return parseFloat(localStorage.getItem('hp_balance') || '0'); },

  saveUser(id, email) {
    localStorage.setItem('hp_user_id',    id);
    localStorage.setItem('hp_user_email', email);
  },
  saveWallet(id)  { localStorage.setItem('hp_wallet_id', id); },
  saveBalance(b)  { localStorage.setItem('hp_balance',   b);  },

  isLoggedIn() {
    return !!(this.getUserEmail() && this.getUserId());
  },

  formatUSD(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },
  formatINR(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  },

  async copy(text) { await navigator.clipboard.writeText(text); },
  genId() { return 'hp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); },

  async _call(fn, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.SUPABASE_ANON_KEY) headers['apikey'] = this.SUPABASE_ANON_KEY;
    const res = await fetch(`${this.FUNCTIONS_URL}/${fn}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Function ${fn} failed`);
    return data;
  },

  async createPaymentLink({ amount, currency = 'USDT', description, orderId }) {
    return this._call('create-payment', { amount, currency, description: description || 'HoldPay Payment', orderId: orderId || this.genId() });
  },
  async checkPayment(trackId) { return this._call('check-payment', { trackId }); },
  async getOxaBalance() { return this._call('get-balance'); },
  async payout({ address, amount, currency = 'USDT', network = 'TRC20' }) {
    return this._call('payout', { address, amount, currency, network });
  },

  saveTransaction(tx) {
    const txs = JSON.parse(localStorage.getItem('hp_transactions') || '[]');
    txs.unshift({ ...tx, timestamp: new Date().toISOString() });
    localStorage.setItem('hp_transactions', JSON.stringify(txs.slice(0, 100)));
  },
  getTransactions() { return JSON.parse(localStorage.getItem('hp_transactions') || '[]'); },
  savePaymentLink(link) {
    const links = JSON.parse(localStorage.getItem('hp_payment_links') || '[]');
    links.unshift({ ...link, createdAt: new Date().toISOString() });
    localStorage.setItem('hp_payment_links', JSON.stringify(links.slice(0, 50)));
  },
  getPaymentLinks() { return JSON.parse(localStorage.getItem('hp_payment_links') || '[]'); },

  renderNav(activePage) {
    const isLoggedIn = this.isLoggedIn();
    return `
    <nav>
      <a href="index.html" class="nav-logo">HoldPay <span>HOLD. PAY. ANYWHERE.</span></a>
      <ul class="nav-links">
        <li><a href="index.html"      ${activePage==='home'      ?'class="active"':''}>Home</a></li>
        <li><a href="how.html"        ${activePage==='how'       ?'class="active"':''}>How it works</a></li>
        <li><a href="pricing.html"    ${activePage==='pricing'   ?'class="active"':''}>Pricing</a></li>
        <li><a href="developers.html" ${activePage==='developers'?'class="active"':''}>Developers</a></li>
        ${isLoggedIn
          ? `<li><a href="dashboard.html" class="btn btn-primary btn-sm">Dashboard →</a></li>`
          : `<li><a href="login.html"  class="btn btn-outline btn-sm">Login</a></li>
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

  renderFooter() {
    return `
    <footer>
      <p style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;background:linear-gradient(135deg,#6c47ff,#ff4778);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;">HoldPay</p>
      <p>Hold your payments. No bank needed. No KYC. Worldwide.</p>
      <p style="margin-top:8px;">
        <a href="index.html">Home</a> · 
        <a href="how.html">How it works</a> · 
        <a href="pricing.html">Pricing</a> · 
        <a href="developers.html">Developers</a> · 
        <a href="dashboard.html">Dashboard</a>
      </p>
      <p style="margin-top:12px;font-size:11px;color:var(--muted);">© 2025 HoldPay · Powered by OxaPay</p>
    </footer>`;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const navEl    = document.getElementById('nav');
  const footerEl = document.getElementById('footer');
  if (navEl)    navEl.innerHTML    = HP.renderNav(navEl.dataset.page || 'home');
  if (footerEl) footerEl.innerHTML = HP.renderFooter();
});
