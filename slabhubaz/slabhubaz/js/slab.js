// ── slab.js ───────────────────────────────────────────────────
//  Reads ?slug= from the URL, fetches the slab from Supabase,
//  and populates the detail page template.
//  Usage: slab.html?slug=calacatta-gold
// ─────────────────────────────────────────────────────────────

async function loadSlabDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');

  if (!slug) {
    window.location.href = './inventory.html';
    return;
  }

  try {
    const { data: slab, error } = await db
      .from('slabs')
      .select(`*, slab_images ( id, image_url, is_primary, sort_order )`)
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error || !slab) {
      showNotFound();
      return;
    }

    renderDetail(slab);

  } catch (err) {
    console.error('slab.js error:', err);
    showNotFound();
  }
}

// ── Render ────────────────────────────────────────────────────

function renderDetail(slab) {
  // Page meta
  document.title = `${slab.name} — SlabHub AZ`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = slab.description
    ? slab.description.substring(0, 160)
    : `${slab.name} — ${slab.material_type} slab available at SlabHub AZ, Phoenix AZ.`;

  // Sorted images
  const imgs    = (slab.slab_images || []).sort((a,b) => a.sort_order - b.sort_order);
  const primary = imgs.find(i => i.is_primary) || imgs[0];

  // Gallery main image
  const mainImg = document.getElementById('gallery-main');
  if (mainImg && primary) {
    mainImg.src = primary.image_url;
    mainImg.alt = slab.name;
  }

  // Thumbnails (only show if more than 1 image)
  const thumbsWrap = document.getElementById('gallery-thumbs');
  if (thumbsWrap && imgs.length > 1) {
    thumbsWrap.innerHTML = imgs.map((img, i) => `
      <div class="gallery__thumb ${i === 0 ? 'active' : ''}"
           onclick="switchImg('${img.image_url}', this)">
        <img src="${img.image_url}" alt="${escHtml(slab.name)}" loading="lazy">
      </div>`).join('');
  }

  // Text fields
  setText('slab-type',    slab.material_type);
  setText('slab-name',    slab.name);
  setText('spec-material',slab.material_type);
  setText('spec-color',   slab.color     || '—');
  setText('spec-thickness',slab.thickness || '—');
  setText('spec-size',    slab.size      || '—');
  setText('spec-finish',  slab.finish    || '—');

  // Availability
  const availEl = document.getElementById('spec-availability');
  if (availEl) {
    const inStock = (slab.availability || 'In Stock') === 'In Stock';
    availEl.innerHTML = `<span style="color:${inStock ? 'var(--cyan)' : 'var(--grey)'}">${slab.availability || 'In Stock'}</span>`;
  }

  // Price
  const priceEl = document.getElementById('slab-price');
  if (priceEl) {
    if (slab.show_price && slab.price) {
      priceEl.textContent = `$${Number(slab.price).toLocaleString()}`;
      priceEl.style.display = 'block';
    } else {
      priceEl.style.display = 'none';
    }
  }

  // Description
  const descEl = document.getElementById('slab-description');
  if (descEl && slab.description) {
    descEl.textContent = slab.description;
    descEl.style.display = 'block';
  }

  // Breadcrumb
  setText('breadcrumb-name', slab.name);

  // Contact button — links to contact page with slab name pre-filled
  const contactBtn = document.getElementById('contact-btn');
  if (contactBtn) {
    contactBtn.href = `./contact.html?slab=${encodeURIComponent(slab.name)}`;
  }

  // Show content, hide loader
  const loadingEl = document.getElementById('slab-loading');
  if (loadingEl) loadingEl.style.display = 'none';
  const contentEl = document.getElementById('slab-content');
  if (contentEl) contentEl.style.display = '';

  // Load related slabs
  loadRelated(slab.material_type, slab.id);
}

// ── Gallery image switch ──────────────────────────────────────

function switchImg(url, thumbEl) {
  const main = document.getElementById('gallery-main');
  if (main) main.src = url;
  document.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

// ── Related slabs ─────────────────────────────────────────────

async function loadRelated(materialType, currentId) {
  if (!materialType) return;

  try {
    const { data: related } = await db
      .from('slabs')
      .select('id, name, slug, material_type, slab_images ( image_url, is_primary, sort_order )')
      .eq('published', true)
      .eq('material_type', materialType)
      .neq('id', currentId)
      .limit(4);

    if (!related || related.length === 0) return;

    const section = document.getElementById('related-section');
    if (section) section.style.display = 'block';

    const relGrid = document.getElementById('related-grid');
    if (!relGrid) return;

    relGrid.innerHTML = related.map(s => {
      const imgs    = (s.slab_images || []).sort((a,b) => a.sort_order - b.sort_order);
      const primary = imgs.find(i => i.is_primary) || imgs[0];
      return `
        <a href="./slab.html?slug=${encodeURIComponent(s.slug)}" class="slab-card">
          <div class="slab-card__img-wrap">
            <img src="${primary?.image_url || './assets/placeholder.jpg'}" alt="${escHtml(s.name)}" loading="lazy">
          </div>
          <div class="slab-card__body">
            <div class="slab-card__name">${escHtml(s.name)}</div>
            <div class="slab-card__type">${escHtml(s.material_type || '')}</div>
          </div>
        </a>`;
    }).join('');

  } catch (err) {
    // Related slabs are non-critical, fail silently
  }
}

// ── Not found state ───────────────────────────────────────────

function showNotFound() {
  const loadingEl = document.getElementById('slab-loading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div class="empty-state" style="padding:120px 0;">
        <div class="empty-state__icon">🔍</div>
        <p class="empty-state__title">Slab Not Found</p>
        <p>This slab may have been removed or the link is incorrect.</p>
        <a href="./inventory.html" class="btn btn-outline" style="margin-top:24px; display:inline-flex;">
          Browse All Slabs
        </a>
      </div>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', loadSlabDetail);
