// ---- Basic inventory (authoritative price & stock) -----------------------
const INVENTORY = {
  'cln-01': { name: 'Daily Gel Cleanser', price: 12, stock: 25,
    img: 'https://images.unsplash.com/photo-1603656349530-b34457511a1f?auto=format&fit=crop&w=1400&q=80' },
  'mois-01': { name: 'Hydrate+ Moisturizer', price: 16, stock: 30,
    img: 'https://images.unsplash.com/photo-1606813907291-76a6dfb00d9b?auto=format&fit=crop&w=1400&q=80' },
  'spf-01': { name: 'SPF 50 Daily Defense', price: 18, stock: 40,
    img: 'https://images.unsplash.com/photo-1589985270826-4b7bba7083e3?auto=format&fit=crop&w=1400&q=80' },
  'ser-01': { name: 'Vitamin C Serum 15%', price: 22, stock: 20,
    img: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?auto=format&fit=crop&w=1400&q=80' },
  'ser-02': { name: 'Niacinamide 10% Serum', price: 19, stock: 20,
    img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80' },
  'mois-02': { name: 'Night Repair Cream', price: 20, stock: 15,
    img: 'https://images.unsplash.com/photo-1601134467661-3d775b999c8b?auto=format&fit=crop&w=1400&q=80' }
};

// ---- Helpers --------------------------------------------------------------
const money = n => `£${n.toFixed(2)}`;
const readCart = () => { try { return JSON.parse(localStorage.getItem('cart')||'[]'); } catch { return []; } };
const saveCart = (items) => localStorage.setItem('cart', JSON.stringify(items));
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
const percent = (n, p) => n * (p/100);

// Merge cart with inventory, clamp qty to stock, use canonical price/img/name
function normalizeCart(raw) {
  const out = [];
  for (const item of raw) {
    const inv = INVENTORY[item.id];
    if (!inv) continue;
    const qty = clamp(Number(item.qty || 1), 1, inv.stock);
    out.push({
      id: item.id,
      name: inv.name,
      price: inv.price,
      img: inv.img,
      qty
    });
  }
  return out;
}

function totals(items, {promoCode} = {}) {
  const subtotal = items.reduce((s,i) => s + i.price * i.qty, 0);
  const discount = (promoCode === 'DEMO10') ? percent(subtotal, 10) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= 30 ? 0 : 3.95; // free over £30
  const vat = percent(afterDiscount, 20);          // simple demo VAT
  const total = afterDiscount + shipping + vat;
  return { subtotal, discount, shipping, vat, total };
}

// ---- Render summary -------------------------------------------------------
const el = {
  items: document.getElementById('summaryItems'),
  empty: document.getElementById('emptyMsg'),
  sumSubtotal: document.getElementById('sumSubtotal'),
  sumShipping: document.getElementById('sumShipping'),
  sumVat: document.getElementById('sumVat'),
  sumTotal: document.getElementById('sumTotal'),
  sumDiscountRow: document.getElementById('sumDiscountRow'),
  sumDiscount: document.getElementById('sumDiscount'),
  promoInput: document.getElementById('promoInput'),
  applyPromo: document.getElementById('applyPromo'),
  form: document.getElementById('checkoutForm')
};

let promoCode = '';

function render() {
  const normalized = normalizeCart(readCart());
  if (!normalized.length) {
    el.items.innerHTML = '';
    el.empty.style.display = 'block';
    el.form.querySelector('button[type="submit"]').disabled = true;
  } else {
    el.empty.style.display = 'none';
    el.form.querySelector('button[type="submit"]').disabled = false;

    el.items.innerHTML = normalized.map(i => `
      <div class="cart-item">
        <img src="${i.img}" alt="${i.name}">
        <div>
          <div style="font-weight:600">${i.name}</div>
          <div class="muted">${money(i.price)} × ${i.qty}</div>
        </div>
        <div style="font-weight:700">${money(i.price * i.qty)}</div>
      </div>
    `).join('');
  }

  const t = totals(normalized, { promoCode });
  el.sumSubtotal.textContent = money(t.subtotal);
  el.sumShipping.textContent = money(t.shipping);
  el.sumVat.textContent = money(t.vat);
  el.sumTotal.textContent = money(t.total);

  if (t.discount > 0) {
    el.sumDiscountRow.style.display = 'flex';
    el.sumDiscount.textContent = `−${money(t.discount)}`;
  } else {
    el.sumDiscountRow.style.display = 'none';
  }
}

el.applyPromo?.addEventListener('click', () => {
  promoCode = (el.promoInput.value || '').trim().toUpperCase();
  render();
});

// ---- Submit (demo) --------------------------------------------------------
el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const items = normalizeCart(readCart());
  if (!items.length) return;

  const orderId = Math.random().toString(36).slice(2,8).toUpperCase();
  const t = totals(items, { promoCode });

  // Clear cart
  saveCart([]);

  // Show success state
  document.getElementById('checkoutRoot').innerHTML = `
    <h1 class="h2">Thanks — order placed!</h1>
    <p class="lead">Your demo order <strong>#${orderId}</strong> has been recorded.</p>
    <div class="p" style="border:1px solid var(--ring);border-radius:12px;margin-top:12px">
      <h3>Summary</h3>
      ${items.map(i => `
        <div class="cart-item">
          <img src="${i.img}" alt="${i.name}">
          <div>
            <div style="font-weight:600">${i.name}</div>
            <div class="muted">${money(i.price)} × ${i.qty}</div>
          </div>
          <div style="font-weight:700">${money(i.price * i.qty)}</div>
        </div>
      `).join('')}
      <div class="row" style="display:flex;justify-content:space-between;margin-top:12px">
        <span class="muted">Total paid (demo)</span><strong>${money(t.total)}</strong>
      </div>
      <p style="margin-top:12px"><a class="cta" href="index.html">Back to store</a></p>
    </div>
  `;
});

// first render
render();
