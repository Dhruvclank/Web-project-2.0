// ----- Mobile menu
const menuBtn = document.getElementById('menuBtn');
const mobileDrawer = document.getElementById('mobileDrawer');
menuBtn?.addEventListener('click', () => {
  const open = mobileDrawer.style.display === 'block';
  mobileDrawer.style.display = open ? 'none' : 'block';
});

// ----- Year
document.getElementById('year').textContent = new Date().getFullYear();

// ----- Data (you can move this to products.json and fetch it)
let products = [];
fetch('products.json').then(r=>r.json()).then(list => { products = list; render(products); drawCart(); });


// ----- Render
const grid = document.getElementById('productGrid');
function render(list){
  grid.innerHTML = list.map(p => `
    <article class="card">
      <img src="${p.img}" alt="${p.name}">
      <div class="pad">
        <h3>${p.name}</h3>
        <p class="muted">${p.blurb}</p>
        <div class="row">
          <span class="price">£${p.price.toFixed(2)}</span>
          <button class="cta" data-add="${p.id}">Add</button>
        </div>
      </div>
    </article>
  `).join('');
}
render(products);

// ----- Filters
const chips = document.querySelectorAll('.chip, .pill');
function applyFilter(key){
  chips.forEach(c => c.classList.toggle('active', c.dataset.filter === key || (key==='all' && c.dataset.filter==='all')));
  if(key === 'all') return render(products);
  render(products.filter(p => p.tags.includes(key)));
}
chips.forEach(chip => chip.addEventListener('click', () => applyFilter(chip.dataset.filter)));

// ----- Search
const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = (input.value || '').toLowerCase().trim();
  if(!q){ render(products); return; }
  render(products.filter(p => (p.name + ' ' + p.tags.join(' ')).toLowerCase().includes(q)));
});

// ----- Cart (localStorage demo)
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const closeCart = document.getElementById('closeCart');
const cartItemsEl = document.getElementById('cartItems');
const subtotalEl = document.getElementById('cartSubtotal');
const countEl = document.getElementById('cartCount');

function readCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch{ return []; } }
function saveCart(items){ localStorage.setItem('cart', JSON.stringify(items)); }
function calcSubtotal(items){ return items.reduce((s,i)=>s+i.price*i.qty,0); }
function setCount(items){ countEl.textContent = items.reduce((s,i)=>s+i.qty,0); }

function drawCart(){
  const items = readCart();
  setCount(items);
  if(!items.length){
    cartItemsEl.innerHTML = `<p class="muted">Your cart is empty.</p>`;
    subtotalEl.textContent = '£0.00';
    return;
  }
  cartItemsEl.innerHTML = items.map(i => `
    <div class="cart-item">
      <img src="${i.img}" alt="${i.name}">
      <div>
        <div style="font-weight:600">${i.name}</div>
        <div class="muted">£${i.price.toFixed(2)} · Qty 
          <input type="number" min="1" value="${i.qty}" data-q="${i.id}" style="width:56px; padding:4px 6px; border:1px solid var(--ring); border-radius:8px; margin-left:6px;">
        </div>
      </div>
      <button data-rm="${i.id}" aria-label="Remove">×</button>
    </div>
  `).join('');
  subtotalEl.textContent = '£' + calcSubtotal(items).toFixed(2);
}
drawCart();

grid.addEventListener('click', (e) => {
  const id = e.target?.dataset?.add;
  if(!id) return;
  const product = products.find(p => p.id === id);
  const items = readCart();
  const idx = items.findIndex(i => i.id === id);
  if(idx > -1) items[idx].qty += 1; else items.push({...product, qty:1});
  saveCart(items); drawCart();
});

cartItemsEl.addEventListener('click', (e) => {
  const rm = e.target?.dataset?.rm;
  if(rm){
    const items = readCart().filter(i => i.id !== rm);
    saveCart(items); drawCart(); return;
  }
});
cartItemsEl.addEventListener('change', (e) => {
  const qid = e.target?.dataset?.q;
  if(!qid) return;
  let qty = parseInt(e.target.value, 10) || 1;
  qty = Math.max(1, qty);
  const items = readCart();
  const it = items.find(i => i.id === qid);
  if(it){ it.qty = qty; saveCart(items); drawCart(); }
});

cartBtn.addEventListener('click', () => cartDrawer.classList.add('open'));
closeCart.addEventListener('click', () => cartDrawer.classList.remove('open'));
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') cartDrawer.classList.remove('open'); });

// Auto-activate "all" chip on load
document.querySelector('.chip[data-filter="all"]').classList.add('active');
