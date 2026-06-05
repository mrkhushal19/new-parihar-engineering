// Admin Application State
let inquiries = [];
let reviews = [];
let products = [];
let aboutData = {};
let videos = [];
let photos = [];
let contactData = {};
let token = sessionStorage.getItem('adminToken') || '';
let stagedVideoThumbnailFile = null;
let stagedPhotoImageFile = null;

// DOM Elements
const menuItems = document.querySelectorAll('.admin-menu-item');
const adminSections = document.querySelectorAll('.admin-section');
const loginOverlay = document.getElementById('admin-login-overlay');
const loginForm = document.getElementById('admin-login-form');

document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  setupLoginForm();
  setupFileInputHandler();
  setupAboutFormHandler();
  setupVideoFormHandler();
  setupPhotoFormHandler();
  setupContactFormHandler();
});

// 1. Authentication Check
function checkAuthentication() {
  if (!token) {
    loginOverlay.style.display = 'flex';
  } else {
    loginOverlay.style.display = 'none';
    loadAllDashboardData();
  }
}

function setupLoginForm() {
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password-input').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        token = data.token;
        sessionStorage.setItem('adminToken', token);
        
        loginOverlay.style.display = 'none';
        showToast('Dashboard unlocked successfully!');
        loadAllDashboardData();
      } else {
        showToast('Incorrect administrator password.', true);
      }
    } catch (error) {
      console.error(error);
      showToast('Connection to backend failed.', true);
    }
  });
}

function adminLogout() {
  sessionStorage.removeItem('adminToken');
  token = '';
  location.reload();
}

function loadAllDashboardData() {
  loadInquiries();
  loadReviews();
  loadProducts();
  loadAboutDetails();
  loadVideos();
  loadPhotos();
  loadContactDetails();
}

// Helpers for Headers
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// 2. Sidebar Tab Switching
function switchAdminSection(sectionId) {
  if (!token) return;

  // Update Menu Active Class
  menuItems.forEach(item => {
    if (item.getAttribute('data-target') === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle Sections Active Class
  adminSections.forEach(section => {
    if (section.id === sectionId) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Reload data accordingly
  if (sectionId === 'inquiries-sec') {
    loadInquiries();
  } else if (sectionId === 'reviews-sec') {
    loadReviews();
  } else if (sectionId === 'products-sec') {
    loadProducts();
  } else if (sectionId === 'about-sec') {
    loadAboutDetails();
  } else if (sectionId === 'videos-sec') {
    loadVideos();
  } else if (sectionId === 'photos-sec') {
    loadPhotos();
  } else if (sectionId === 'contact-sec') {
    loadContactDetails();
  }
}

// 3. Customer Lead Inquiries
async function loadInquiries() {
  try {
    const response = await fetch('/api/inquiries', {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      adminLogout();
      return;
    }

    inquiries = await response.json();
    calculateInquiriesStats();
    renderInquiriesTable();
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    showToast('Failed to connect to backend inquiries database.', true);
  }
}

function calculateInquiriesStats() {
  const total = inquiries.length;
  const pending = inquiries.filter(i => i.status === 'pending').length;
  const resolved = inquiries.filter(i => i.status === 'resolved').length;

  document.getElementById('stat-total-inq').textContent = total;
  document.getElementById('stat-pending-inq').textContent = pending;
  document.getElementById('stat-resolved-inq').textContent = resolved;
}

function renderInquiriesTable() {
  const tbody = document.getElementById('admin-inquiries-rows');
  if (!tbody) return;

  if (inquiries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color: var(--accent);"></i>
          No inquiries found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inquiries.map(inq => {
    const formattedDate = new Date(inq.date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemTagsHtml = inq.items && inq.items.length > 0
      ? `<div class="inquiry-items-tags">${inq.items.map(it => `<span class="inquiry-item-tag">${it}</span>`).join('')}</div>`
      : `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No specific model</span>`;

    const statusBadge = inq.status === 'pending'
      ? `<span class="status-indicator pending"><i class="fa-solid fa-clock"></i> Pending</span>`
      : `<span class="status-indicator resolved"><i class="fa-solid fa-circle-check"></i> Resolved</span>`;

    const statusActionBtn = inq.status === 'pending'
      ? `<button class="btn btn-outline" style="font-size:0.75rem; padding: 4px 10px; border-width: 1px;" onclick="updateInquiryStatus('${inq.id}', 'resolved')"><i class="fa-solid fa-check"></i> Resolve</button>`
      : `<button class="btn btn-secondary" style="font-size:0.75rem; padding: 4px 10px;" onclick="updateInquiryStatus('${inq.id}', 'pending')"><i class="fa-solid fa-rotate-left"></i> Reopen</button>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 600; margin-bottom: 4px;">${inq.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${formattedDate}</div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px; font-size: 0.85rem;">
            <span><i class="fa-solid fa-phone" style="width: 14px; color: var(--accent);"></i> ${inq.phone}</span>
            ${inq.email ? `<span><i class="fa-solid fa-envelope" style="width: 14px;"></i> ${inq.email}</span>` : ''}
            ${inq.company ? `<span><i class="fa-solid fa-building" style="width: 14px;"></i> ${inq.company}</span>` : ''}
          </div>
        </td>
        <td>${itemTagsHtml}</td>
        <td>
          <div style="font-size: 0.85rem; color: var(--text-secondary); max-height: 100px; overflow-y: auto;">
            "${inq.message}"
          </div>
          <div style="margin-top: 8px;">${statusBadge}</div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div style="display:flex; justify-content: flex-end; gap: 8px; align-items: center;">
            ${statusActionBtn}
            <button class="btn btn-secondary" style="font-size:0.75rem; padding: 4px 10px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deleteInquiry('${inq.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateInquiryStatus(inquiryId, newStatus) {
  try {
    const response = await fetch(`/api/inquiries/${inquiryId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      showToast(`Lead marked as ${newStatus}.`);
      loadInquiries();
    } else {
      showToast('Failed to update lead status.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to update. Server error.', true);
  }
}

async function deleteInquiry(inquiryId) {
  if (!confirm('Are you sure you want to delete this customer inquiry lead permanently?')) return;

  try {
    const response = await fetch(`/api/inquiries/${inquiryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showToast('Lead deleted successfully.');
      loadInquiries();
    } else {
      showToast('Failed to delete lead.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to delete. Server error.', true);
  }
}

// 4. Product Catalog Management (CRUD)
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
    calculateProductsStats();
    renderProductsTable();
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

function calculateProductsStats() {
  const total = products.length;
  const cnc = products.filter(p => p.category.toLowerCase().includes('cnc')).length;
  const crane = products.filter(p => p.category.toLowerCase().includes('crane')).length;

  document.getElementById('stat-total-prod').textContent = total;
  document.getElementById('stat-cnc-prod').textContent = cnc;
  document.getElementById('stat-crane-prod').textContent = crane;
}

function renderProductsTable() {
  const tbody = document.getElementById('admin-products-rows');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No products in the database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    // Specs summary string
    const specsSnippet = Object.entries(p.specifications)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    return `
      <tr>
        <td>
          <img src="${p.image}" class="product-img-mini" alt="${p.name}">
        </td>
        <td>
          <div style="font-weight: 600;">${p.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">ID: ${p.id}</div>
        </td>
        <td>
          <span class="inquiry-item-tag" style="background-color: var(--bg-tertiary);">${p.category}</span>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${specsSnippet}...
          </div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div style="display:flex; justify-content: flex-end; gap: 8px;">
            <button class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px;" onclick="openProductCrudModal('${p.id}')">
              <i class="fa-solid fa-edit"></i> Edit
            </button>
            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deleteProduct('${p.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Global state variables for Product Images
let stagedImagesList = [];
let newFilesToUpload = [];

// Setup file input change listener
function setupFileInputHandler() {
  const input = document.getElementById('crud-images-input');
  if (!input) return;
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    newFilesToUpload = newFilesToUpload.concat(files);
    renderImagesPreview();
  });
}

function renderImagesPreview() {
  const previewContainer = document.getElementById('crud-images-preview-list');
  if (!previewContainer) return;

  let html = '';

  // 1. Render currently saved database images
  stagedImagesList.forEach((imgUrl, idx) => {
    html += `
      <div class="admin-image-preview-card">
        <img src="${imgUrl}" alt="saved-img-${idx}">
        <button type="button" class="admin-image-delete-btn" onclick="removeSavedImage(${idx})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  });

  // 2. Render locally selected files (to be uploaded)
  newFilesToUpload.forEach((file, idx) => {
    const localUrl = URL.createObjectURL(file);
    html += `
      <div class="admin-image-preview-card" style="border-color: var(--accent);">
        <img src="${localUrl}" alt="staged-img-${idx}">
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; font-size: 0.6rem; text-align: center; background-color: rgba(245, 158, 11, 0.85); color: #000; font-weight: 700; padding: 2px 0;">STAGED</div>
        <button type="button" class="admin-image-delete-btn" onclick="removeStagedFile(${idx})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  });

  previewContainer.innerHTML = html;
}

function removeSavedImage(index) {
  stagedImagesList.splice(index, 1);
  renderImagesPreview();
}

function removeStagedFile(index) {
  newFilesToUpload.splice(index, 1);
  renderImagesPreview();
}

// Dynamic Specification Row Builder
const specContainer = document.getElementById('crud-specifications-container');

function addSpecificationRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'spec-builder-row';
  row.innerHTML = `
    <input type="text" class="spec-key" required placeholder="Spec Key (e.g. Motor Power)" value="${key}">
    <input type="text" class="spec-val" required placeholder="Value (e.g. 20 HP)" value="${value}">
    <button type="button" onclick="removeSpecificationRow(this)">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
  specContainer.appendChild(row);
}

function removeSpecificationRow(button) {
  button.parentElement.remove();
}

function clearSpecificationsBuilder() {
  specContainer.innerHTML = '';
}

function getSpecificationsFromBuilder() {
  const specRows = document.querySelectorAll('.spec-builder-row');
  const specs = {};
  specRows.forEach(row => {
    const key = row.querySelector('.spec-key').value.trim();
    const val = row.querySelector('.spec-val').value.trim();
    if (key && val) {
      specs[key] = val;
    }
  });
  return specs;
}

// CRUD Modal Controls
const crudModal = document.getElementById('product-crud-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const crudForm = document.getElementById('product-crud-form');

function openProductCrudModal(productId = null) {
  clearSpecificationsBuilder();
  crudForm.reset();
  
  // Clear file states
  stagedImagesList = [];
  newFilesToUpload = [];
  const fileInput = document.getElementById('crud-images-input');
  if (fileInput) fileInput.value = '';

  if (productId) {
    // EDIT MODE
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById('crud-modal-title').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--accent)"></i> Edit Product Details`;
    document.getElementById('crud-product-id').value = p.id;
    document.getElementById('crud-name').value = p.name;
    document.getElementById('crud-category').value = p.category;
    document.getElementById('crud-desc').value = p.description;
    document.getElementById('crud-features').value = p.features.join('\n');
    document.getElementById('crud-apps').value = p.applications.join('\n');

    // Populate images state
    stagedImagesList = p.images ? [...p.images] : [p.image];

    // Populate dynamic specs
    for (const [k, v] of Object.entries(p.specifications)) {
      addSpecificationRow(k, v);
    }
  } else {
    // ADD MODE
    document.getElementById('crud-modal-title').innerHTML = `<i class="fa-solid fa-plus" style="color:var(--accent)"></i> Add New Product`;
    document.getElementById('crud-product-id').value = '';
    
    // Seed standard base inputs
    addSpecificationRow('Motor Power', '');
    addSpecificationRow('Lifting Capacity', '');
  }

  // Draw thumbnails grid
  renderImagesPreview();

  crudModal.classList.add('open');
  modalBackdrop.classList.add('open');
}

function closeProductCrudModal() {
  crudModal.classList.remove('open');
  modalBackdrop.classList.remove('open');
}

// Bind CRUD Submit Action
if (crudForm) {
  crudForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('crud-save-btn');
    saveBtn.disabled = true;
    const originalBtnHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Saving...';

    const productId = document.getElementById('crud-product-id').value;
    const name = document.getElementById('crud-name').value;
    const category = document.getElementById('crud-category').value;
    const desc = document.getElementById('crud-desc').value;

    const features = document.getElementById('crud-features').value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const applications = document.getElementById('crud-apps').value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const specifications = getSpecificationsFromBuilder();

    // 1. Process local file uploads if any
    if (newFilesToUpload.length > 0) {
      const formData = new FormData();
      newFilesToUpload.forEach(file => {
        formData.append('files', file);
      });

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Server returned error during file upload.');
        }

        const uploadResult = await uploadResponse.json();
        // Merge uploaded file paths
        stagedImagesList = stagedImagesList.concat(uploadResult.urls);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        showToast('Image upload failed. Please try again.', true);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
        return;
      }
    }

    // Ensure we have at least one image URL, or use a default fallback
    const primaryImage = stagedImagesList.length > 0 ? stagedImagesList[0] : '/images/block_cutter_6ft.png';

    const payload = {
      name,
      category,
      description: desc,
      image: primaryImage,
      images: stagedImagesList,
      specifications,
      features,
      applications
    };

    const isEdit = !!productId;
    const url = isEdit ? `/api/products/${productId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(isEdit ? 'Product updated successfully.' : 'Product created successfully.');
        closeProductCrudModal();
        loadProducts();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save product changes.', true);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to connect to backend server.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  });
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to permanently delete this product machine from the catalog? This will modify the products.json database.')) return;

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showToast('Product deleted successfully from catalog.');
      loadProducts();
    } else {
      showToast('Failed to delete product from database.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to delete product. Server error.', true);
  }
}

// 5. Load and Moderate Reviews
async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    reviews = await response.json();
    
    calculateReviewsStats();
    renderReviewsTable();
  } catch (error) {
    console.error('Error fetching reviews:', error);
    showToast('Failed to connect to backend reviews database.', true);
  }
}

function calculateReviewsStats() {
  const total = reviews.length;
  let sum = 0;
  let fiveStarCount = 0;

  reviews.forEach(r => {
    sum += r.rating;
    if (r.rating === 5) fiveStarCount++;
  });

  const avg = total > 0 ? (sum / total).toFixed(1) : '0.0';

  document.getElementById('stat-total-rev').textContent = total;
  document.getElementById('stat-avg-rating').textContent = avg;
  document.getElementById('stat-fivestar-rev').textContent = fiveStarCount;
}

function renderReviewsTable() {
  const tbody = document.getElementById('admin-reviews-rows');
  if (!tbody) return;

  if (reviews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-comments" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color: var(--accent);"></i>
          No reviews found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reviews.map(rev => {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rev.rating) {
        starsHtml += '<i class="fa-solid fa-star" style="color:var(--accent); font-size: 0.75rem;"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color:var(--text-muted); font-size: 0.75rem;"></i>';
      }
    }

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${rev.name}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${rev.location}</div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-weight:700; font-size: 1rem;">${rev.rating}/5</span>
            <div style="display:flex;">${starsHtml}</div>
          </div>
        </td>
        <td>
          <span class="inquiry-item-tag" style="background-color: var(--bg-tertiary);">${rev.product}</span>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Date: ${rev.date}</div>
        </td>
        <td>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">"${rev.comment}"</p>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <button class="btn btn-secondary" style="font-size:0.75rem; padding: 6px 12px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deleteReview('${rev.id}')">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteReview(reviewId) {
  if (!confirm('Are you sure you want to moderate and delete this review testimonial permanently?')) return;

  try {
    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showToast('Review moderated and deleted successfully.');
      loadReviews();
    } else {
      showToast('Failed to delete review.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to delete. Server error.', true);
  }
}

// 6. Toast Notification Handler
function showToast(message, isError = false) {
  const toast = document.getElementById('toast-notification');
  const icon = document.getElementById('toast-icon');
  const msgText = document.getElementById('toast-message');

  msgText.textContent = message;

  if (isError) {
    toast.classList.add('error');
    icon.className = 'fa-solid fa-circle-exclamation';
    icon.style.color = 'var(--danger)';
  } else {
    toast.classList.remove('error');
    icon.className = 'fa-solid fa-circle-check';
    icon.style.color = 'var(--success)';
  }

  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ==========================================
// ABOUT US SECTION MANAGEMENT
// ==========================================

async function loadAboutDetails() {
  try {
    const response = await fetch('/api/about');
    const resData = await response.json();
    aboutData = (Array.isArray(resData) ? resData[0] : resData) || {};
    populateAboutForm();
  } catch (error) {
    console.error('Error fetching about details:', error);
    showToast('Failed to load About Us details.', true);
  }
}

function populateAboutForm() {
  const historyInput = document.getElementById('about-history-input');
  if (!historyInput) return;

  historyInput.value = aboutData.history || '';
  document.getElementById('about-business-input').value = (aboutData.details && aboutData.details.natureOfBusiness) || '';
  document.getElementById('about-status-input').value = (aboutData.details && aboutData.details.legalStatus) || '';
  document.getElementById('about-owner-input').value = (aboutData.details && aboutData.details.owner) || '';
  document.getElementById('about-turnover-input').value = (aboutData.details && aboutData.details.turnover) || '';
  document.getElementById('about-gst-input').value = (aboutData.details && aboutData.details.gst) || '';
  document.getElementById('about-date-input').value = (aboutData.details && aboutData.details.registrationDate) || '';

  // Milestones timeline rows
  const container = document.getElementById('about-milestones-container');
  container.innerHTML = '';
  if (aboutData.milestones && aboutData.milestones.length > 0) {
    aboutData.milestones.forEach(m => addMilestoneRow(m));
  }
}

function addMilestoneRow(val = '') {
  const container = document.getElementById('about-milestones-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'milestone-builder-row';
  row.style.display = 'flex';
  row.style.gap = '10px';
  row.style.alignItems = 'center';
  row.innerHTML = `
    <input type="text" class="milestone-input" required placeholder="e.g. 1990: Inception as custom machinery workshop in Jodhpur." value="${val}" style="flex:1; padding: 10px; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);">
    <button type="button" class="btn btn-secondary" onclick="this.parentElement.remove()" style="color:var(--danger); border-color:rgba(239, 68, 68, 0.2); padding: 10px;"><i class="fa-solid fa-trash-can"></i></button>
  `;
  container.appendChild(row);
}

function setupAboutFormHandler() {
  const form = document.getElementById('admin-about-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('about-save-btn');
    saveBtn.disabled = true;
    const originalBtnHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const milestoneInputs = document.querySelectorAll('.milestone-input');
    const milestones = Array.from(milestoneInputs)
      .map(el => el.value.trim())
      .filter(val => val.length > 0);

    const payload = {
      history: document.getElementById('about-history-input').value,
      details: {
        natureOfBusiness: document.getElementById('about-business-input').value,
        legalStatus: document.getElementById('about-status-input').value,
        owner: document.getElementById('about-owner-input').value,
        turnover: document.getElementById('about-turnover-input').value,
        gst: document.getElementById('about-gst-input').value,
        registrationDate: document.getElementById('about-date-input').value
      },
      milestones
    };

    try {
      const response = await fetch('/api/about', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('About Us details updated successfully.');
        loadAboutDetails();
      } else {
        showToast('Failed to save About Us changes.', true);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to connect to server.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  });
}

// ==========================================
// VIDEOS SECTION MANAGEMENT
// ==========================================

async function loadVideos() {
  try {
    const response = await fetch('/api/videos');
    videos = await response.json();
    renderVideosTable();
  } catch (error) {
    console.error('Error fetching videos:', error);
    showToast('Failed to connect to videos database.', true);
  }
}

function renderVideosTable() {
  const tbody = document.getElementById('admin-videos-rows');
  if (!tbody) return;

  if (videos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No videos found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = videos.map(v => `
    <tr>
      <td>
        <img src="${v.thumbnail || '/images/cnc_router_3axis.png'}" class="product-img-mini" alt="${v.title}">
      </td>
      <td>
        <div style="font-weight: 600;">${v.title}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">Path: ${v.url}</div>
      </td>
      <td>
        <span class="inquiry-item-tag" style="background-color: var(--bg-tertiary);">${v.duration}</span>
      </td>
      <td>
        <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${v.description}
        </p>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <div style="display:flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px;" onclick="openVideoCrudModal('${v.id}')">
            <i class="fa-solid fa-edit"></i> Edit
          </button>
          <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deleteVideo('${v.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Video CRUD Modal operations
const videoCrudModal = document.getElementById('video-crud-modal');
const videoCrudForm = document.getElementById('video-crud-form');

function openVideoCrudModal(videoId = null) {
  videoCrudForm.reset();
  document.getElementById('crud-video-id').value = '';
  document.getElementById('video-crud-thumbnail-url').value = '';
  
  const preview = document.getElementById('video-crud-thumbnail-preview');
  preview.style.display = 'none';
  stagedVideoThumbnailFile = null;

  const thumbnailInput = document.getElementById('video-crud-thumbnail-input');
  if (thumbnailInput) thumbnailInput.value = '';

  if (videoId) {
    // Edit Mode
    const v = videos.find(vid => vid.id === videoId);
    if (!v) return;

    document.getElementById('video-modal-title').innerHTML = `<i class="fa-solid fa-edit" style="color:var(--accent)"></i> Edit Video Details`;
    document.getElementById('crud-video-id').value = v.id;
    document.getElementById('video-crud-title').value = v.title;
    document.getElementById('video-crud-duration').value = v.duration;
    document.getElementById('video-crud-url').value = v.url;
    document.getElementById('video-crud-desc').value = v.description;
    
    if (v.thumbnail) {
      document.getElementById('video-crud-thumbnail-url').value = v.thumbnail;
      preview.style.display = 'block';
      preview.querySelector('img').src = v.thumbnail;
    }
  } else {
    // Add Mode
    document.getElementById('video-modal-title').innerHTML = `<i class="fa-solid fa-plus" style="color:var(--accent)"></i> Add New Video`;
  }

  videoCrudModal.classList.add('open');
  modalBackdrop.classList.add('open');
}

function closeVideoCrudModal() {
  videoCrudModal.classList.remove('open');
  modalBackdrop.classList.remove('open');
}

function setupVideoFormHandler() {
  const thumbnailInput = document.getElementById('video-crud-thumbnail-input');
  const preview = document.getElementById('video-crud-thumbnail-preview');

  if (thumbnailInput) {
    thumbnailInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        stagedVideoThumbnailFile = file;
        const localUrl = URL.createObjectURL(file);
        preview.style.display = 'block';
        preview.querySelector('img').src = localUrl;
      }
    });
  }

  if (videoCrudForm) {
    videoCrudForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const saveBtn = document.getElementById('video-crud-save-btn');
      saveBtn.disabled = true;
      const originalBtnHtml = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      const videoId = document.getElementById('crud-video-id').value;
      let thumbnailUrl = document.getElementById('video-crud-thumbnail-url').value;

      // 1. Process thumbnail upload if staged
      if (stagedVideoThumbnailFile) {
        const formData = new FormData();
        formData.append('files', stagedVideoThumbnailFile);

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error('Thumbnail upload failed.');
          }

          const uploadResult = await uploadResponse.json();
          thumbnailUrl = uploadResult.urls[0];
        } catch (error) {
          console.error(error);
          showToast('Failed to upload video thumbnail image.', true);
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnHtml;
          return;
        }
      }

      const payload = {
        title: document.getElementById('video-crud-title').value,
        duration: document.getElementById('video-crud-duration').value,
        description: document.getElementById('video-crud-desc').value,
        url: document.getElementById('video-crud-url').value,
        thumbnail: thumbnailUrl || '/images/cnc_router_3axis.png'
      };

      const isEdit = !!videoId;
      const url = isEdit ? `/api/videos/${videoId}` : '/api/videos';
      const method = isEdit ? 'PUT' : 'POST';

      try {
        const response = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showToast(isEdit ? 'Video updated successfully.' : 'Video added successfully.');
          closeVideoCrudModal();
          loadVideos();
        } else {
          showToast('Failed to save video details.', true);
        }
      } catch (error) {
        console.error(error);
        showToast('Connection to server failed.', true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
      }
    });
  }
}

async function deleteVideo(videoId) {
  if (!confirm('Are you sure you want to permanently delete this video demo clip?')) return;

  try {
    const response = await fetch(`/api/videos/${videoId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showToast('Video deleted successfully.');
      loadVideos();
    } else {
      showToast('Failed to delete video.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to delete video. Server error.', true);
  }
}

// ==========================================
// PHOTOS/GALLERY SECTION MANAGEMENT
// ==========================================

async function loadPhotos() {
  try {
    const response = await fetch('/api/photos');
    photos = await response.json();
    renderPhotosTable();
  } catch (error) {
    console.error('Error fetching photos:', error);
    showToast('Failed to connect to photos database.', true);
  }
}

function renderPhotosTable() {
  const tbody = document.getElementById('admin-photos-rows');
  if (!tbody) return;

  if (photos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No photos found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = photos.map(p => `
    <tr>
      <td>
        <img src="${p.url}" class="product-img-mini" alt="${p.caption}">
      </td>
      <td>
        <div style="font-weight: 600;">${p.caption}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">Path: ${p.url}</div>
      </td>
      <td>
        <span class="inquiry-item-tag" style="background-color: var(--bg-tertiary);">${p.category}</span>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <div style="display:flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px;" onclick="openPhotoCrudModal('${p.id}')">
            <i class="fa-solid fa-edit"></i> Edit
          </button>
          <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deletePhoto('${p.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Photo CRUD Modal operations
const photoCrudModal = document.getElementById('photo-crud-modal');
const photoCrudForm = document.getElementById('photo-crud-form');

function openPhotoCrudModal(photoId = null) {
  photoCrudForm.reset();
  document.getElementById('crud-photo-id').value = '';
  document.getElementById('photo-crud-image-url').value = '';
  
  const preview = document.getElementById('photo-crud-image-preview');
  preview.style.display = 'none';
  stagedPhotoImageFile = null;

  const imageInput = document.getElementById('photo-crud-image-input');
  if (imageInput) imageInput.value = '';

  if (photoId) {
    // Edit Mode
    const p = photos.find(pic => pic.id === photoId);
    if (!p) return;

    document.getElementById('photo-modal-title-header').innerHTML = `<i class="fa-solid fa-edit" style="color:var(--accent)"></i> Edit Photo Details`;
    document.getElementById('crud-photo-id').value = p.id;
    document.getElementById('photo-crud-caption').value = p.caption;
    document.getElementById('photo-crud-category').value = p.category;
    
    if (p.url) {
      document.getElementById('photo-crud-image-url').value = p.url;
      preview.style.display = 'block';
      preview.querySelector('img').src = p.url;
    }
  } else {
    // Add Mode
    document.getElementById('photo-modal-title-header').innerHTML = `<i class="fa-solid fa-plus" style="color:var(--accent)"></i> Add Photo to Gallery`;
  }

  photoCrudModal.classList.add('open');
  modalBackdrop.classList.add('open');
}

function closePhotoCrudModal() {
  photoCrudModal.classList.remove('open');
  modalBackdrop.classList.remove('open');
}

function setupPhotoFormHandler() {
  const imageInput = document.getElementById('photo-crud-image-input');
  const preview = document.getElementById('photo-crud-image-preview');

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        stagedPhotoImageFile = file;
        const localUrl = URL.createObjectURL(file);
        preview.style.display = 'block';
        preview.querySelector('img').src = localUrl;
      }
    });
  }

  if (photoCrudForm) {
    photoCrudForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const saveBtn = document.getElementById('photo-crud-save-btn');
      saveBtn.disabled = true;
      const originalBtnHtml = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      const photoId = document.getElementById('crud-photo-id').value;
      let imageUrl = document.getElementById('photo-crud-image-url').value;

      // 1. Process file upload if staged
      if (stagedPhotoImageFile) {
        const formData = new FormData();
        formData.append('files', stagedPhotoImageFile);

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error('Image upload failed.');
          }

          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.urls[0];
        } catch (error) {
          console.error(error);
          showToast('Failed to upload gallery image.', true);
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnHtml;
          return;
        }
      }

      if (!imageUrl) {
        showToast('Please upload or stage an image file.', true);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
        return;
      }

      const payload = {
        caption: document.getElementById('photo-crud-caption').value,
        category: document.getElementById('photo-crud-category').value,
        url: imageUrl
      };

      const isEdit = !!photoId;
      const url = isEdit ? `/api/photos/${photoId}` : '/api/photos';
      const method = isEdit ? 'PUT' : 'POST';

      try {
        const response = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showToast(isEdit ? 'Photo details updated successfully.' : 'Photo added successfully.');
          closePhotoCrudModal();
          loadPhotos();
        } else {
          showToast('Failed to save photo details.', true);
        }
      } catch (error) {
        console.error(error);
        showToast('Connection to server failed.', true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
      }
    });
  }
}

async function deletePhoto(photoId) {
  if (!confirm('Are you sure you want to permanently delete this photo from the gallery?')) return;

  try {
    const response = await fetch(`/api/photos/${photoId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showToast('Photo deleted successfully.');
      loadPhotos();
    } else {
      showToast('Failed to delete photo.', true);
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to delete photo. Server error.', true);
  }
}

// ==========================================
// CONTACT US SECTION MANAGEMENT
// ==========================================

async function loadContactDetails() {
  try {
    const response = await fetch('/api/contact');
    const resData = await response.json();
    contactData = (Array.isArray(resData) ? resData[0] : resData) || {};
    populateContactForm();
  } catch (error) {
    console.error('Error fetching contact details:', error);
    showToast('Failed to load Contact Us details.', true);
  }
}

function populateContactForm() {
  const headingInput = document.getElementById('contact-heading-input');
  if (!headingInput) return;

  headingInput.value = contactData.heading || '';
  document.getElementById('contact-subheading-input').value = contactData.subheading || '';
  
  document.getElementById('contact-address-title-input').value = (contactData.address && contactData.address.title) || '';
  document.getElementById('contact-address-line1-input').value = (contactData.address && contactData.address.line1) || '';
  document.getElementById('contact-address-line2-input').value = (contactData.address && contactData.address.line2) || '';

  document.getElementById('contact-title-input').value = (contactData.contact && contactData.contact.title) || '';
  document.getElementById('contact-primary-input').value = (contactData.contact && contactData.contact.primaryContact) || '';
  document.getElementById('contact-phone-input').value = (contactData.contact && contactData.contact.phone) || '';
  document.getElementById('contact-email-input').value = (contactData.contact && contactData.contact.email) || '';
  document.getElementById('contact-gstin-input').value = (contactData.contact && contactData.contact.gstin) || '';

  document.getElementById('contact-map-title-input').value = (contactData.map && contactData.map.title) || '';
  document.getElementById('contact-map-address-input').value = (contactData.map && contactData.map.address) || '';
  document.getElementById('contact-map-link-input').value = (contactData.map && contactData.map.link) || '';
}

function setupContactFormHandler() {
  const form = document.getElementById('admin-contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('contact-save-btn');
    saveBtn.disabled = true;
    const originalBtnHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const payload = {
      heading: document.getElementById('contact-heading-input').value,
      subheading: document.getElementById('contact-subheading-input').value,
      address: {
        title: document.getElementById('contact-address-title-input').value,
        line1: document.getElementById('contact-address-line1-input').value,
        line2: document.getElementById('contact-address-line2-input').value
      },
      contact: {
        title: document.getElementById('contact-title-input').value,
        primaryContact: document.getElementById('contact-primary-input').value,
        phone: document.getElementById('contact-phone-input').value,
        email: document.getElementById('contact-email-input').value,
        gstin: document.getElementById('contact-gstin-input').value
      },
      map: {
        title: document.getElementById('contact-map-title-input').value,
        address: document.getElementById('contact-map-address-input').value,
        link: document.getElementById('contact-map-link-input').value
      }
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('Contact Us details updated successfully.');
        loadContactDetails();
      } else {
        showToast('Failed to save Contact Us changes.', true);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to connect to server.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  });
}
