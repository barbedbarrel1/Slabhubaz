// ── admin.js ──────────────────────────────────────────────────
//  Handles: login/logout, slab list, add/edit/delete slabs,
//  image uploads to Supabase Storage, and inquiries view.
// ─────────────────────────────────────────────────────────────

let editingSlabId  = null;   // null = adding new, string = editing
let uploadedImages = [];     // { file?, url, isExisting, id? }

// ── Auth ─────────────────────────────────────────────────────

async function initAdmin() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    showLoginPage();
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN')  showDashboard();
    if (event === 'SIGNED_OUT') showLoginPage();
  });
}

async function handleLogout() {
  await db.auth.signOut();
}

function showLoginPage() {
  document.getElementById('login-page').style.display  = 'flex';
  document.getElementById('admin-page').style.display  = 'none';
}

function showDashboard() {
  document.getElementById('login-page').style.display  = 'none';
  document.getElementById('admin-page').style.display  = 'grid';
  loadSlabsTable();
}

// Login form
document.getElementById('login-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  btn.textContent = 'Signing in…';
  btn.disabled    = true;
  errEl.style.display = 'none';

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.textContent   = 'Invalid email or password. Try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
});

// ── Views ─────────────────────────────────────────────────────

function showView(view) {
  document.getElementById('view-slabs').style.display     = view === 'slabs'     ? 'block' : 'none';
  document.getElementById('view-form').style.display      = view === 'form'      ? 'block' : 'none';
  document.getElementById('view-inquiries').style.display = view === 'inquiries' ? 'block' : 'none';

  // Highlight active nav
  ['nav-slabs','nav-add','nav-inquiries'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  if (view === 'slabs')     document.getElementById('nav-slabs')?.classList.add('active');
  if (view === 'form')      document.getElementById('nav-add')?.classList.add('active');
  if (view === 'inquiries') { document.getElementById('nav-inquiries')?.classList.add('active'); loadInquiries(); }
}

// ── Slabs Table ───────────────────────────────────────────────

async function loadSlabsTable() {
  const tbody = document.getElementById('slabs-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--grey);">Loading…</td></tr>`;

  const { data: slabs, error } = await db
    .from('slabs')
    .select('id, name, slug, material_type, availability, published, created_at, slab_images ( image_url, is_primary )')
    .order('created_at', { ascending: false });

  if (error || !slabs) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#f87171;">Error loading slabs.</td></tr>`;
    return;
  }

  if (slabs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--grey);">No slabs yet — add your first one!</td></tr>`;
    return;
  }

  tbody.innerHTML = slabs.map(slab => {
    const imgs    = slab.slab_images || [];
    const primary = imgs.find(i => i.is_primary) || imgs[0];
    const thumb   = primary
      ? `<img class="admin-table__thumb" src="${primary.image_url}" alt="${escHtml(slab.name)}">`
      : `<div class="admin-thumb-placeholder"></div>`;

    const availBadge = (slab.availability === 'In Stock')
      ? `<span class="badge badge-avail">In Stock</span>`
      : `<span class="badge badge-sold">Sold</span>`;

    const pubBadge = slab.published
      ? `<span class="badge badge-pub">Published</span>`
      : `<span class="badge badge-draft">Draft</span>`;

    return `
      <tr>
        <td>${thumb}</td>
        <td>
          <div class="admin-slab-name">${escHtml(slab.name)}</div>
          <div class="admin-slab-slug">${escHtml(slab.slug)}</div>
        </td>
        <td>${escHtml(slab.material_type || '—')}</td>
        <td>${availBadge}</td>
        <td>${pubBadge}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="editSlab('${slab.id}')">Edit</button>
            <button class="action-btn action-btn-del" onclick="deleteSlab('${slab.id}', '${escHtml(slab.name)}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ── Add / Edit Form ───────────────────────────────────────────

function showAddForm() {
  editingSlabId  = null;
  uploadedImages = [];

  document.getElementById('form-title').textContent = 'Add New Slab';
  document.getElementById('slab-form').reset();
  document.getElementById('preview-grid').innerHTML = '';
  document.getElementById('delete-btn').style.display = 'none';

  showView('form');
}

async function editSlab(id) {
  const { data: slab, error } = await db
    .from('slabs')
    .select('*, slab_images(*)')
    .eq('id', id)
    .single();

  if (error || !slab) return showNotif('Error loading slab.', 'error');

  editingSlabId = id;
  document.getElementById('form-title').textContent = 'Edit Slab';
  document.getElementById('delete-btn').style.display = 'inline-flex';

  // Fill form fields
  setVal('f-name',         slab.name         || '');
  setVal('f-material',     slab.material_type || '');
  setVal('f-color',        slab.color         || '');
  setVal('f-thickness',    slab.thickness     || '');
  setVal('f-size',         slab.size          || '');
  setVal('f-finish',       slab.finish        || '');
  setVal('f-description',  slab.description   || '');
  setVal('f-price',        slab.price         || '');
  setVal('f-availability', slab.availability  || 'In Stock');
  document.getElementById('f-show-price').checked = !!slab.show_price;
  document.getElementById('f-published').checked  = !!slab.published;

  // Show existing images
  const sorted = (slab.slab_images || []).sort((a,b) => a.sort_order - b.sort_order);
  uploadedImages = sorted.map(img => ({
    url: img.image_url, id: img.id,
    isExisting: true, is_primary: img.is_primary
  }));
  renderPreviews();

  showView('form');
}

// Slab form submit
document.getElementById('slab-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('save-btn');
  btn.textContent = 'Saving…';
  btn.disabled    = true;

  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    showNotif('Slab name is required.', 'error');
    btn.textContent = 'Save Slab';
    btn.disabled    = false;
    return;
  }

  const slabData = {
    name,
    material_type: document.getElementById('f-material').value,
    color:         document.getElementById('f-color').value.trim(),
    thickness:     document.getElementById('f-thickness').value.trim(),
    size:          document.getElementById('f-size').value.trim(),
    finish:        document.getElementById('f-finish').value.trim(),
    description:   document.getElementById('f-description').value.trim(),
    price:         document.getElementById('f-price').value || null,
    availability:  document.getElementById('f-availability').value,
    show_price:    document.getElementById('f-show-price').checked,
    published:     document.getElementById('f-published').checked,
  };

  if (!editingSlabId) {
    slabData.slug = await uniqueSlug(name);
  }

  try {
    let slabId = editingSlabId;

    if (editingSlabId) {
      const { error } = await db.from('slabs').update(slabData).eq('id', editingSlabId);
      if (error) throw error;
    } else {
      const { data, error } = await db.from('slabs').insert(slabData).select().single();
      if (error) throw error;
      slabId = data.id;
    }

    // Upload new (non-existing) images
    const newImgs = uploadedImages.filter(img => !img.isExisting && img.file);
    for (let i = 0; i < newImgs.length; i++) {
      const imgObj   = newImgs[i];
      const ext      = imgObj.file.name.split('.').pop();
      const filePath = `slabs/${slabId}/${Date.now()}-${i}.${ext}`;

      const { error: upErr } = await db.storage
        .from('slab-images')
        .upload(filePath, imgObj.file, { contentType: imgObj.file.type });

      if (!upErr) {
        const { data: urlData } = db.storage.from('slab-images').getPublicUrl(filePath);
        await db.from('slab_images').insert({
          slab_id:    slabId,
          image_url:  urlData.publicUrl,
          is_primary: i === 0 && !uploadedImages.some(img => img.isExisting),
          sort_order: i
        });
      }
    }

    showNotif(editingSlabId ? 'Slab updated!' : 'Slab added!', 'success');
    showView('slabs');
    loadSlabsTable();

  } catch (err) {
    console.error(err);
    showNotif('Error saving slab. Check console.', 'error');
  } finally {
    btn.textContent = 'Save Slab';
    btn.disabled    = false;
  }
});

async function deleteSlab(id, name) {
  if (!confirm(`Delete "${name}"?\n\nThis will permanently remove the slab and its images.`)) return;

  // Delete storage files
  const { data: imgs } = await db.from('slab_images').select('image_url').eq('slab_id', id);
  if (imgs) {
    for (const img of imgs) {
      const path = img.image_url.split('/slab-images/')[1];
      if (path) await db.storage.from('slab-images').remove([path]);
    }
  }

  const { error } = await db.from('slabs').delete().eq('id', id);
  if (error) return showNotif('Error deleting slab.', 'error');

  showNotif('Slab deleted.', 'success');
  loadSlabsTable();
}

function handleDeleteFromForm() {
  if (editingSlabId) {
    deleteSlab(editingSlabId, document.getElementById('f-name').value);
    showView('slabs');
  }
}

// ── Images ────────────────────────────────────────────────────

function handleImageSelect(e) {
  const files = [...e.target.files].filter(f => f.size <= 10 * 1024 * 1024);
  uploadedImages.push(...files.map(f => ({ file: f, url: URL.createObjectURL(f), isExisting: false })));
  renderPreviews();
  e.target.value = ''; // allow re-selecting same file
}

function removeImage(index) {
  if (uploadedImages[index]?.isExisting) {
    // Delete from DB
    const id = uploadedImages[index].id;
    if (id) db.from('slab_images').delete().eq('id', id).then(() => {});
  }
  uploadedImages.splice(index, 1);
  renderPreviews();
}

function renderPreviews() {
  const grid = document.getElementById('preview-grid');
  if (!grid) return;
  grid.innerHTML = uploadedImages.map((img, i) => `
    <div class="preview-item">
      <img src="${img.url}" alt="Preview ${i+1}">
      ${i === 0 ? '<div style="position:absolute;bottom:4px;left:4px;font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:var(--cyan);color:#000;padding:2px 6px;border-radius:2px;">Primary</div>' : ''}
      <button class="preview-item__rm" onclick="removeImage(${i})" title="Remove">✕</button>
    </div>`).join('');
}

// Drag and drop
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.add('drag-over');
}
function handleDragLeave(e) {
  document.getElementById('upload-area').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.remove('drag-over');
  const files = [...e.dataTransfer.files].filter(f =>
    f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
  );
  uploadedImages.push(...files.map(f => ({ file: f, url: URL.createObjectURL(f), isExisting: false })));
  renderPreviews();
}

// ── Inquiries ─────────────────────────────────────────────────

async function loadInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--grey);">Loading…</td></tr>`;

  const { data, error } = await db
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#f87171;">Error loading inquiries.</td></tr>`;
    return;
  }
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--grey);">No inquiries yet.</td></tr>`;
    return;
  }

  const statusColors = { new: 'badge-pub', contacted: 'badge-avail', closed: 'badge-draft' };

  tbody.innerHTML = data.map(inq => {
    const date = new Date(inq.created_at).toLocaleDateString();
    const cls  = statusColors[inq.status] || 'badge-draft';
    return `
      <tr>
        <td><strong>${escHtml(inq.customer_name || '—')}</strong></td>
        <td style="font-size:12px; line-height:1.8;">
          ${inq.customer_email ? `<a href="mailto:${escHtml(inq.customer_email)}" style="color:var(--cyan);">${escHtml(inq.customer_email)}</a><br>` : ''}
          ${inq.customer_phone ? escHtml(inq.customer_phone) : ''}
        </td>
        <td>${escHtml(inq.slab_name || '—')}</td>
        <td style="max-width:200px; font-size:12px; color:var(--white-dim);">${escHtml((inq.message || '').substring(0, 80))}${inq.message?.length > 80 ? '…' : ''}</td>
        <td>
          <select class="sort-select" style="font-size:11px; padding:5px 10px;"
            onchange="updateInquiryStatus('${inq.id}', this.value)">
            <option value="new"       ${inq.status==='new'       ? 'selected':''}>New</option>
            <option value="contacted" ${inq.status==='contacted' ? 'selected':''}>Contacted</option>
            <option value="closed"    ${inq.status==='closed'    ? 'selected':''}>Closed</option>
          </select>
        </td>
        <td style="font-size:12px; color:var(--grey);">${date}</td>
        <td>
          <button class="action-btn action-btn-del" onclick="deleteInquiry('${inq.id}')">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

async function updateInquiryStatus(id, status) {
  await db.from('inquiries').update({ status }).eq('id', id);
  showNotif('Status updated.', 'success');
}

async function deleteInquiry(id) {
  if (!confirm('Delete this inquiry?')) return;
  await db.from('inquiries').delete().eq('id', id);
  showNotif('Inquiry deleted.', 'success');
  loadInquiries();
}

// ── Helpers ───────────────────────────────────────────────────

async function uniqueSlug(name) {
  let slug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const { data } = await db.from('slabs').select('slug').like('slug', `${slug}%`);
  const existing = data?.map(r => r.slug) || [];

  if (!existing.includes(slug)) return slug;

  let i = 2;
  while (existing.includes(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showNotif(msg, type = 'success') {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.className   = `notification ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3500);
}

document.addEventListener('DOMContentLoaded', initAdmin);
