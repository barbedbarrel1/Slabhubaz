// ── home.js ──────────────────────────────────────────────────
//  Loads the 8 most recently added published slabs
//  into the homepage "Recently Added" grid.
// ─────────────────────────────────────────────────────────────

async function loadFeaturedSlabs() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  try {
    const { data: slabs, error } = await db
      .from('slabs')
      .select(`
        id, name, slug, material_type, color, thickness, size,
        price, show_price, availability,
        slab_images ( image_url, is_primary, sort_order )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!slabs || slabs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state__icon">🪨</div>
          <p class="empty-state__title">Inventory Coming Soon</p>
          <p>Check back shortly — slabs are being added.</p>
        </div>`;
      return;
    }

    grid.innerHTML = slabs.map(buildCard).join('');

  } catch (err) {
    console.error('home.js error:', err);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <p style="color:var(--grey); font-size:14px;">Could not load inventory. Please try again.</p>
      </div>`;
  }
}

function buildCard(slab) {
  const imgs   = slab.slab_images || [];
  const sorted = imgs.sort((a, b) => a.sort_order - b.sort_order);
  const primary = sorted.find(i => i.is_primary) || sorted[0];
  const imgUrl  = primary?.image_url || './assets/placeholder.jpg';

  const inStock    = (slab.availability || 'In Stock') === 'In Stock';
  const badgeCls   = inStock ? 'badge-in' : 'badge-out';
  const badgeTxt   = inStock ? 'In Stock' : 'Sold';

  const priceHtml  = slab.show_price && slab.price
    ? `<div class="slab-card__price">$${Number(slab.price).toLocaleString()}</div>` : '';

  const specsHtml  = [
    slab.thickness ? `<div class="slab-card__spec"><strong>Thickness</strong>${slab.thickness}</div>` : '',
    slab.size      ? `<div class="slab-card__spec"><strong>Size</strong>${slab.size}</div>` : '',
    slab.color     ? `<div class="slab-card__spec"><strong>Color</strong>${slab.color}</div>` : '',
  ].join('');

  return `
    <a href="./slab.html?slug=${encodeURIComponent(slab.slug)}" class="slab-card">
      <div class="slab-card__img-wrap">
        <img src="${imgUrl}" alt="${escHtml(slab.name)}" loading="lazy">
        <div class="slab-card__overlay">
          <div class="slab-card__specs">${specsHtml}</div>
        </div>
        <span class="slab-card__badge ${badgeCls}">${badgeTxt}</span>
      </div>
      <div class="slab-card__body">
        <div class="slab-card__name">${escHtml(slab.name)}</div>
        <div class="slab-card__type">${escHtml(slab.material_type || '')}</div>
        ${priceHtml}
      </div>
    </a>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', loadFeaturedSlabs);
