// ── inventory.js ─────────────────────────────────────────────
//  Full inventory page: loads all published slabs,
//  handles search, material + availability filters, and sorting.
// ─────────────────────────────────────────────────────────────

let allSlabs = [];
let filteredSlabs = [];

const grid        = document.getElementById('slab-grid');
const countEl     = document.getElementById('slab-count');
const searchInput = document.getElementById('search-input');
const sortSelect  = document.getElementById('sort-select');
const resetBtn    = document.getElementById('filter-reset');

// ── Init ─────────────────────────────────────────────────────

async function loadInventory() {
  try {
    const { data: slabs, error } = await db
      .from('slabs')
      .select(`
        id, name, slug, material_type, color, thickness, size,
        price, show_price, availability, created_at,
        slab_images ( image_url, is_primary, sort_order )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allSlabs      = slabs || [];
    filteredSlabs = [...allSlabs];

    // Check for pre-selected material from URL param (e.g. from footer links)
    const params = new URLSearchParams(window.location.search);
    const urlMat = params.get('material');
    if (urlMat) {
      const box = document.querySelector(`input[data-filter="material"][value="${urlMat}"]`);
      if (box) box.checked = true;
    }

    applyFilters();

  } catch (err) {
    console.error('inventory.js error:', err);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Could Not Load Inventory</p>
        <p>Please refresh the page and try again.</p>
      </div>`;
  }
}

// ── Render ───────────────────────────────────────────────────

function renderSlabs(slabs) {
  if (!slabs || slabs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state__icon">🔍</div>
        <p class="empty-state__title">No Slabs Found</p>
        <p>Try a different search term or clear your filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = slabs.map(slab => {
    const imgs    = (slab.slab_images || []).sort((a,b) => a.sort_order - b.sort_order);
    const primary = imgs.find(i => i.is_primary) || imgs[0];
    const imgUrl  = primary?.image_url || './assets/placeholder.jpg';
    const inStock = (slab.availability || 'In Stock') === 'In Stock';

    const specsHtml = [
      slab.thickness ? `<div class="slab-card__spec"><strong>Thickness</strong>${slab.thickness}</div>` : '',
      slab.size      ? `<div class="slab-card__spec"><strong>Size</strong>${slab.size}</div>` : '',
      slab.color     ? `<div class="slab-card__spec"><strong>Color</strong>${slab.color}</div>` : '',
    ].join('');

    const priceHtml = slab.show_price && slab.price
      ? `<div class="slab-card__price">$${Number(slab.price).toLocaleString()}</div>` : '';

    return `
      <a href="./slab.html?slug=${encodeURIComponent(slab.slug)}" class="slab-card">
        <div class="slab-card__img-wrap">
          <img src="${imgUrl}" alt="${escHtml(slab.name)}" loading="lazy">
          <div class="slab-card__overlay">
            <div class="slab-card__specs">${specsHtml}</div>
          </div>
          <span class="slab-card__badge ${inStock ? 'badge-in' : 'badge-out'}">${slab.availability || 'In Stock'}</span>
        </div>
        <div class="slab-card__body">
          <div class="slab-card__name">${escHtml(slab.name)}</div>
          <div class="slab-card__type">${escHtml(slab.material_type || '')}</div>
          ${priceHtml}
        </div>
      </a>`;
  }).join('');
}

// ── Filter + Sort ─────────────────────────────────────────────

function applyFilters() {
  const search      = (searchInput?.value || '').toLowerCase().trim();
  const matChecked  = [...document.querySelectorAll('input[data-filter="material"]:checked')].map(c => c.value);
  const availChecked = [...document.querySelectorAll('input[data-filter="availability"]:checked')].map(c => c.value);

  filteredSlabs = allSlabs.filter(slab => {
    const matchSearch = !search ||
      (slab.name         || '').toLowerCase().includes(search) ||
      (slab.material_type|| '').toLowerCase().includes(search) ||
      (slab.color        || '').toLowerCase().includes(search) ||
      (slab.thickness    || '').toLowerCase().includes(search) ||
      (slab.size         || '').toLowerCase().includes(search) ||
      (slab.description  || '').toLowerCase().includes(search);

    const matchMat   = matChecked.length   === 0 || matChecked.includes(slab.material_type);
    const matchAvail = availChecked.length === 0 || availChecked.includes(slab.availability);

    return matchSearch && matchMat && matchAvail;
  });

  // Sort
  const sort = sortSelect?.value || 'newest';
  if (sort === 'newest') filteredSlabs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 'oldest') filteredSlabs.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  if (sort === 'az')     filteredSlabs.sort((a,b) => a.name.localeCompare(b.name));

  renderSlabs(filteredSlabs);
  updateCount(filteredSlabs.length, allSlabs.length);
}

function updateCount(shown, total) {
  if (!countEl) return;
  countEl.innerHTML = shown === total
    ? `<strong>${total}</strong> slab${total !== 1 ? 's' : ''}`
    : `Showing <strong>${shown}</strong> of ${total}`;
}

function resetFilters() {
  document.querySelectorAll('input[data-filter]').forEach(cb => cb.checked = false);
  if (searchInput) searchInput.value = '';
  applyFilters();
}

// ── Event listeners ───────────────────────────────────────────

searchInput?.addEventListener('input', applyFilters);
sortSelect?.addEventListener('change', applyFilters);
resetBtn?.addEventListener('click', resetFilters);
document.querySelectorAll('input[data-filter]').forEach(cb => cb.addEventListener('change', applyFilters));

// ── Helpers ───────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', loadInventory);
