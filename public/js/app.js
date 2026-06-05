// Application State
let products = [];
let reviews = [];
let inquiryCart = JSON.parse(localStorage.getItem('inquiryCart')) || [];
let selectedCategory = '';

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
const mobileToggle = document.querySelector('.mobile-toggle');
const navContainer = document.querySelector('nav');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  fetchProducts();
  fetchReviews();
  fetchAboutDetails();
  fetchVideos();
  fetchPhotos();
  fetchContactDetails();
  setupCartUI();
  setupForms();
  setupGallery();
  setupInteractiveStars();
});

// 1. Navigation / Tabs Routing
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetTab = e.target.getAttribute('data-tab');
      switchTab(targetTab);
      // Close mobile menu if open
      navContainer.style.display = '';
    });
  });

  // Mobile menu toggle
  mobileToggle.addEventListener('click', () => {
    if (navContainer.style.display === 'block') {
      navContainer.style.display = 'none';
    } else {
      navContainer.style.display = 'block';
    }
  });
}

function switchTab(tabId) {
  // Update nav link active state
  navLinks.forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Toggle tab contents
  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Scroll to top of page
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Fetch Products Data
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
    
    renderCategoriesList();
    renderProductsGrid();
    renderFeaturedProducts();
    populateProductSelectDropdowns();
  } catch (error) {
    console.error('Error fetching products:', error);
    showToast('Failed to load products. Running in offline mode.', true);
  }
}

// Render Unique Categories in Filter Sidebar
function renderCategoriesList() {
  const categoryFilterList = document.getElementById('category-filter-list');
  if (!categoryFilterList) return;

  const categories = [...new Set(products.map(p => p.category))];
  
  let html = `
    <button class="category-btn ${!selectedCategory ? 'active' : ''}" onclick="filterByCategory('')">
      All Products <span class="category-count">${products.length}</span>
    </button>
  `;

  categories.forEach(cat => {
    const count = products.filter(p => p.category === cat).length;
    html += `
      <button class="category-btn ${selectedCategory === cat ? 'active' : ''}" onclick="filterByCategory('${cat}')">
        ${cat} <span class="category-count">${count}</span>
      </button>
    `;
  });

  categoryFilterList.innerHTML = html;
}

// Handle Category Filter Click
function filterByCategory(category) {
  selectedCategory = category;
  renderCategoriesList();
  renderProductsGrid();
}

// Render Products Grid on Products Tab
function renderProductsGrid() {
  const grid = document.getElementById('full-products-grid');
  const countLabel = document.getElementById('products-count-label');
  if (!grid) return;

  const searchQuery = document.getElementById('search-bar').value.toLowerCase();
  const sortBy = document.getElementById('sort-select').value;

  // Filter
  let filtered = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                          p.category.toLowerCase().includes(searchQuery) ||
                          p.description.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Sort
  if (sortBy === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name-desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  // Update label
  countLabel.textContent = `Showing ${filtered.length} of ${products.length} products`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-face-frown" style="font-size: 3rem; margin-bottom: 16px; color: var(--accent);"></i>
        <h3>No products match your search/filter parameters.</h3>
        <p>Try searching for generic terms like 'Crane' or 'CNC'.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => createProductCardMarkup(p)).join('');
}

// Create HTML markup for single product card
function createProductCardMarkup(p) {
  // Extract first 2 specs for preview
  const specsKeys = Object.keys(p.specifications).slice(0, 2);
  const specRowsHtml = specsKeys.map(k => `
    <div class="spec-preview-row">
      <span class="spec-preview-label">${k}:</span>
      <span class="spec-preview-val">${p.specifications[k]}</span>
    </div>
  `).join('');

  return `
    <div class="product-card" id="card-${p.id}">
      <div class="product-image-container">
        <span class="product-category-tag">${p.category}</span>
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-details">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        
        <div class="product-spec-preview">
          ${specRowsHtml}
        </div>
        
        <div class="product-actions">
          <button class="btn btn-secondary" onclick="openDetailModal('${p.id}')">View Specs</button>
          <button class="btn btn-primary" onclick="addToCart('${p.id}', '${p.name}')"><i class="fa-solid fa-plus"></i> Add Inquiry</button>
        </div>
      </div>
    </div>
  `;
}

// Render 3 Featured Products on Home Tab
function renderFeaturedProducts() {
  const grid = document.getElementById('featured-products-grid');
  if (!grid) return;

  // Let's feature: 1 Block cutter, 1 CNC router, 1 double girder crane
  const featuredIds = ['block-cutter-6ft', 'cnc-router-3axis', 'crane-double-girder'];
  const featured = products.filter(p => featuredIds.includes(p.id));

  // If products are empty/failing, render fallback mock
  if (featured.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Loading featured products...</p>`;
    return;
  }

  grid.innerHTML = featured.map(p => createProductCardMarkup(p)).join('');
}

// Populate dropdowns in contact forms
function populateProductSelectDropdowns() {
  const selectElement = document.getElementById('inq-item-select');
  if (!selectElement) return;

  let optionsHtml = '<option value="">-- Select Product --</option>';
  products.forEach(p => {
    optionsHtml += `<option value="${p.name}">${p.name}</option>`;
  });
  selectElement.innerHTML = optionsHtml;
}

// Setup live search and reset filters
const searchBar = document.getElementById('search-bar');
if (searchBar) {
  searchBar.addEventListener('input', renderProductsGrid);
}
const sortSelect = document.getElementById('sort-select');
if (sortSelect) {
  sortSelect.addEventListener('change', renderProductsGrid);
}
const clearCats = document.getElementById('clear-categories');
if (clearCats) {
  clearCats.addEventListener('click', () => filterByCategory(''));
}

// 3. Product Details Modal
const detailModal = document.getElementById('detail-modal');
const modalBackdrop = document.getElementById('modal-backdrop');

function openDetailModal(productId) {
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  document.getElementById('modal-category-tag').textContent = p.category;
  document.getElementById('modal-product-title').textContent = p.name;
  document.getElementById('modal-product-desc').textContent = p.description;
  document.getElementById('modal-product-img').src = p.image;

  // Handle image thumbnails
  const thumbnailsContainer = document.getElementById('modal-thumbnails-container');
  const imageList = p.images && p.images.length > 0 ? p.images : [p.image];
  
  if (imageList.length > 1) {
    thumbnailsContainer.style.display = 'flex';
    thumbnailsContainer.innerHTML = imageList.map((imgUrl, idx) => `
      <div class="modal-thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="swapModalImage(this, '${imgUrl}')">
        <img src="${imgUrl}" alt="${p.name} image ${idx + 1}">
      </div>
    `).join('');
  } else {
    thumbnailsContainer.style.display = 'none';
    thumbnailsContainer.innerHTML = '';
  }

  // Technical Specs Table
  const table = document.getElementById('modal-specs-table');
  let tableHtml = '';
  for (const [key, value] of Object.entries(p.specifications)) {
    tableHtml += `
      <tr>
        <td class="spec-label">${key}</td>
        <td class="spec-val">${value}</td>
      </tr>
    `;
  }
  table.innerHTML = tableHtml;

  // Features List
  const featuresList = document.getElementById('modal-features-list');
  featuresList.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');

  // Applications List
  const appsList = document.getElementById('modal-applications-list');
  appsList.innerHTML = p.applications.map(a => `<li>${a}</li>`).join('');

  // Bind Add to Inquiry Button
  const modalAddBtn = document.getElementById('modal-inquiry-add-btn');
  modalAddBtn.onclick = () => {
    addToCart(p.id, p.name);
    closeDetailModal();
  };

  // Open Modal
  detailModal.classList.add('open');
  modalBackdrop.classList.add('open');
}

function swapModalImage(element, imgUrl) {
  document.getElementById('modal-product-img').src = imgUrl;
  const items = element.parentElement.querySelectorAll('.modal-thumbnail-item');
  items.forEach(item => item.classList.remove('active'));
  element.classList.add('active');
}

function closeDetailModal() {
  detailModal.classList.remove('open');
  modalBackdrop.classList.remove('open');
}

// Close modal on backdrop click
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', () => {
    closeDetailModal();
    closePhotoModal();
    closeInquiryPanel();
  });
}

// 4. Floating Inquiry Cart State
function setupCartUI() {
  const countLabel = document.getElementById('inquiry-cart-count');
  countLabel.textContent = inquiryCart.length;
  renderCartPanelItems();
}

function addToCart(productId, productName) {
  if (inquiryCart.some(item => item.id === productId)) {
    showToast(`${productName} is already in your inquiry cart!`, true);
    return;
  }

  inquiryCart.push({ id: productId, name: productName });
  localStorage.setItem('inquiryCart', JSON.stringify(inquiryCart));
  setupCartUI();
  showToast(`Added ${productName} to inquiry cart.`);
}

function removeFromCart(productId) {
  inquiryCart = inquiryCart.filter(item => item.id !== productId);
  localStorage.setItem('inquiryCart', JSON.stringify(inquiryCart));
  setupCartUI();
  showToast('Product removed from inquiry cart.');
}

function renderCartPanelItems() {
  const list = document.getElementById('inquiry-items-list');
  if (!list) return;

  if (inquiryCart.length === 0) {
    list.innerHTML = `<div class="empty-inquiry-message">No machines in inquiry basket yet. Browse products and add items to inquire.</div>`;
    return;
  }

  list.innerHTML = inquiryCart.map(item => `
    <div class="inquiry-item-row">
      <span>${item.name}</span>
      <button class="remove-inquiry-item" onclick="removeFromCart('${item.id}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

function toggleInquiryPanel() {
  const panel = document.getElementById('inquiry-panel');
  panel.classList.toggle('open');
  modalBackdrop.classList.toggle('open');
}

function closeInquiryPanel() {
  document.getElementById('inquiry-panel').classList.remove('open');
}

// 5. Submit Forms Logic
function setupForms() {
  // Direct Inquiry Form (Contact Tab)
  const contactForm = document.getElementById('contact-inquiry-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const selectedItem = document.getElementById('inq-item-select').value;
      const items = selectedItem ? [selectedItem] : [];

      const payload = {
        name: document.getElementById('inq-name').value,
        company: document.getElementById('inq-company').value,
        phone: document.getElementById('inq-phone').value,
        email: document.getElementById('inq-email').value,
        message: document.getElementById('inq-message').value,
        items: items
      };

      await submitInquiryAPI(payload, contactForm);
    });
  }

  // Inquiry Basket Form (Slideout Panel)
  const basketForm = document.getElementById('basket-inquiry-form');
  if (basketForm) {
    basketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (inquiryCart.length === 0) {
        showToast('Your inquiry basket is empty.', true);
        return;
      }

      const payload = {
        name: document.getElementById('basket-name').value,
        phone: document.getElementById('basket-phone').value,
        email: document.getElementById('basket-email').value,
        message: document.getElementById('basket-message').value,
        items: inquiryCart.map(item => item.name)
      };

      const success = await submitInquiryAPI(payload, basketForm);
      if (success) {
        // Clear inquiry basket
        inquiryCart = [];
        localStorage.removeItem('inquiryCart');
        setupCartUI();
        closeInquiryPanel();
      }
    });
  }

  // Review Submission Form
  const reviewForm = document.getElementById('submit-review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const ratingVal = parseInt(document.getElementById('form-rating-val').value);
      const name = document.getElementById('review-name').value;
      const location = document.getElementById('review-location').value;
      const product = document.getElementById('review-product').value;
      const comment = document.getElementById('review-comment').value;

      try {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, location, product, rating: ratingVal, comment })
        });

        if (response.ok) {
          showToast('Review submitted successfully! Thank you.');
          reviewForm.reset();
          // Reset rating values to 5 stars default
          setInteractiveStars(5);
          // Re-fetch reviews to update average stats & DOM list
          fetchReviews();
        } else {
          showToast('Failed to submit review.', true);
        }
      } catch (err) {
        console.error(err);
        showToast('Server connection error.', true);
      }
    });
  }
}

async function submitInquiryAPI(payload, formElement) {
  try {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showToast('Your inquiry has been submitted! Our team will contact you.');
      formElement.reset();
      return true;
    } else {
      const err = await response.json();
      showToast(err.error || 'Submission failed.', true);
      return false;
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to submit. Check internet connection.', true);
    return false;
  }
}

// 6. Fetch & Calculate Reviews Stats
async function fetchReviews() {
  try {
    const response = await fetch('/api/reviews');
    reviews = await response.json();
    calculateAndRenderReviewStats();
    renderReviewsList();
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
}

function calculateAndRenderReviewStats() {
  const total = reviews.length;
  const overallCountLabel = document.getElementById('overall-review-count-label');
  const reviewsHeaderCount = document.getElementById('reviews-header-count');
  
  if (total === 0) {
    overallCountLabel.textContent = 'No reviews submitted';
    reviewsHeaderCount.textContent = '0 reviews';
    return;
  }

  // Count sums
  const sums = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingAccumulator = 0;

  reviews.forEach(r => {
    sums[r.rating] = (sums[r.rating] || 0) + 1;
    ratingAccumulator += r.rating;
  });

  const avg = (ratingAccumulator / total).toFixed(1);

  // Update DOM Summary
  document.querySelector('.overall-rating-number').textContent = avg;
  overallCountLabel.textContent = `Based on ${total} reviews`;
  reviewsHeaderCount.textContent = `${total} Verified reviews`;

  // Render Stars in Summary Card
  const starCount = Math.round(parseFloat(avg));
  const starsContainer = document.querySelector('.overall-rating-stars');
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= starCount) {
      starsHtml += '<i class="fa-solid fa-star"></i> ';
    } else {
      starsHtml += '<i class="fa-regular fa-star"></i> ';
    }
  }
  starsContainer.innerHTML = starsHtml;

  // Calculate percentages
  for (let star = 1; star <= 5; star++) {
    const pct = ((sums[star] / total) * 100).toFixed(0);
    const fillBar = document.querySelector(`.breakdown-row:nth-child(${6 - star}) .breakdown-bar-fill`);
    const pctLabel = document.getElementById(`pct-${star}star`);
    
    if (fillBar && pctLabel) {
      fillBar.style.width = `${pct}%`;
      pctLabel.textContent = `${pct}%`;
    }
  }
}

function renderReviewsList() {
  const listElement = document.getElementById('dom-reviews-list');
  if (!listElement) return;

  if (reviews.length === 0) {
    listElement.innerHTML = `<p style="text-align: center; color: var(--text-muted);">No reviews posted yet.</p>`;
    return;
  }

  listElement.innerHTML = reviews.map(r => {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= r.rating) {
        starsHtml += '<i class="fa-solid fa-star" style="color:var(--accent); font-size:0.85rem;"></i> ';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color:var(--text-muted); font-size:0.85rem;"></i> ';
      }
    }

    return `
      <div class="review-item-card">
        <div class="review-header">
          <div>
            <span class="reviewer-name">${r.name}</span>
            <span class="reviewer-location">| ${r.location}</span>
          </div>
          <span class="review-date"><i class="fa-solid fa-calendar-days"></i> ${r.date}</span>
        </div>
        <div style="margin-bottom: 8px;">
          ${starsHtml}
        </div>
        <div class="reviewer-product-tag">Product: ${r.product}</div>
        <p class="review-comment">"${r.comment}"</p>
      </div>
    `;
  }).join('');
}

// Setup Interactive Stars in Review Form
function setupInteractiveStars() {
  const stars = document.querySelectorAll('#form-stars-container span');
  const ratingInput = document.getElementById('form-rating-val');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const selectedRating = parseInt(star.getAttribute('data-star'));
      ratingInput.value = selectedRating;
      setInteractiveStars(selectedRating);
    });
  });
}

function setInteractiveStars(rating) {
  const stars = document.querySelectorAll('#form-stars-container span');
  stars.forEach(s => {
    const val = parseInt(s.getAttribute('data-star'));
    if (val <= rating) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}

// 7. Photos Gallery Interactive Lightbox
const photoModal = document.getElementById('photo-modal');
const photoModalImg = document.getElementById('photo-modal-img');
const photoModalTitle = document.getElementById('photo-modal-title');

function openImageModal(imgSrc, caption) {
  photoModalImg.src = imgSrc;
  photoModalTitle.textContent = caption;
  photoModal.classList.add('open');
  modalBackdrop.classList.add('open');
}

function closePhotoModal() {
  photoModal.classList.remove('open');
  modalBackdrop.classList.remove('open');
}

function setupGallery() {
  // Gallery zoom action
}

// 8. Custom Video Player Controls
const videoPlayerModal = document.getElementById('video-player-modal');
let playInterval = null;
let currentDuration = 165; // mock seconds (2:45)
let currentSeekSec = 12; // starts at 12 seconds

function openVideoPlayer(title, src) {
  document.getElementById('player-video-title').textContent = title;
  videoPlayerModal.classList.add('active');
  
  // Set default initial seek times
  if (title.includes('EOT')) {
    currentDuration = 252; // 4:12
  } else if (title.includes('Router')) {
    currentDuration = 210; // 3:30
  } else if (title.includes('Carving')) {
    currentDuration = 302; // 5:02
  } else {
    currentDuration = 165; // 2:45
  }
  
  currentSeekSec = 12;
  updateVideoControlsUI();
  
  // Auto-play mock intervals
  playInterval = setInterval(() => {
    if (currentSeekSec < currentDuration) {
      currentSeekSec++;
      updateVideoControlsUI();
    } else {
      clearInterval(playInterval);
    }
  }, 1000);
}

function closeVideoPlayer() {
  videoPlayerModal.classList.remove('active');
  clearInterval(playInterval);
}

function togglePlayState() {
  const btn = document.getElementById('player-play-btn');
  if (playInterval) {
    // Pause
    clearInterval(playInterval);
    playInterval = null;
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
  } else {
    // Play
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    playInterval = setInterval(() => {
      if (currentSeekSec < currentDuration) {
        currentSeekSec++;
        updateVideoControlsUI();
      }
    }, 1000);
  }
}

function updateVideoControlsUI() {
  // Format times
  const curMin = Math.floor(currentSeekSec / 60);
  const curSec = currentSeekSec % 60;
  const totMin = Math.floor(currentDuration / 60);
  const totSec = currentDuration % 60;
  
  const formattedCur = `${curMin}:${curSec < 10 ? '0' : ''}${curSec}`;
  const formattedTot = `${totMin}:${totSec < 10 ? '0' : ''}${totSec}`;
  
  document.getElementById('player-time-display').textContent = `${formattedCur} / ${formattedTot}`;
  
  // Seek bar percentage
  const pct = (currentSeekSec / currentDuration) * 100;
  document.getElementById('player-seek-fill').style.width = `${pct}%`;
  document.getElementById('player-seek-knob').style.left = `${pct}%`;
}

function seekVideo(event) {
  const seekBar = event.currentTarget;
  const rect = seekBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const width = rect.width;
  const percentage = clickX / width;
  
  currentSeekSec = Math.floor(percentage * currentDuration);
  updateVideoControlsUI();
}

// 9. Toast Notification Handler
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
// DYNAMIC ABOUT, VIDEOS, AND GALLERY CONTENT
// ==========================================

async function fetchAboutDetails() {
  try {
    const response = await fetch('/api/about');
    const data = await response.json();
    renderAboutDetails(data);
  } catch (error) {
    console.error('Error fetching about details:', error);
  }
}

function renderAboutDetails(data) {
  const container = document.getElementById('about-dynamic-content');
  if (!container) return;

  const milestonesHtml = (data.milestones || []).map(m => {
    const colonIdx = m.indexOf(':');
    let year = '';
    let desc = m;
    if (colonIdx !== -1) {
      year = m.substring(0, colonIdx).trim();
      desc = m.substring(colonIdx + 1).trim();
    }
    return `
      <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px;">
        <span style="background-color: var(--accent); color: #0b0f19; font-weight: 700; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; min-width: 65px; text-align: center; font-family: var(--font-display);">${year}</span>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0; line-height: 1.5;">${desc}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr; gap: 40px; margin-top: 30px;">
      <div class="about-text-column">
        <h3 style="font-size: 1.5rem; color: var(--accent); margin-bottom: 20px; font-family: var(--font-display); display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-history"></i> Corporate History & Infrastructure
        </h3>
        <p style="line-height: 1.8; color: var(--text-secondary); margin-bottom: 24px; white-space: pre-line; font-size: 1.05rem;">${data.history}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px;">
        <!-- Legal Specifications -->
        <div class="hero-card" style="padding: 24px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--card-shadow);">
          <h3 style="margin-bottom: 20px; font-size: 1.25rem; display: flex; align-items: center; gap: 8px; font-family: var(--font-display); color: var(--text-primary);">
            <i class="fa-solid fa-file-invoice" style="color: var(--accent)"></i> Corporate Profile
          </h3>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 12px 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Nature of Business</span>
            <span style="font-weight: 600; color: var(--text-primary); text-align: right;">${data.details.natureOfBusiness || 'OEM Manufacturer'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 12px 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Legal Status</span>
            <span style="font-weight: 600; color: var(--text-primary); text-align: right;">${data.details.legalStatus || 'Proprietorship Firm'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 12px 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Owner / Promoter</span>
            <span style="font-weight: 600; color: var(--text-primary); text-align: right;">${data.details.owner || 'R Parihar'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 12px 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Annual Turnover</span>
            <span style="font-weight: 600; color: var(--accent); text-align: right;">${data.details.turnover || '₹1.5 - ₹5.0 Crores'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 12px 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">GSTIN</span>
            <span style="font-weight: 600; color: var(--text-primary); text-align: right; font-family: monospace;">${data.details.gst || '08**********1Z5'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Registration Date</span>
            <span style="font-weight: 600; color: var(--text-primary); text-align: right;">${data.details.registrationDate || 'April 2018'}</span>
          </div>
        </div>

        <!-- Timeline Milestones -->
        <div class="hero-card" style="padding: 24px; background-color: var(--bg-card); border: 1px solid var(--accent-border); border-radius: 12px; box-shadow: var(--card-shadow);">
          <h3 style="margin-bottom: 20px; font-size: 1.25rem; display: flex; align-items: center; gap: 8px; font-family: var(--font-display); color: var(--text-primary);">
            <i class="fa-solid fa-timeline" style="color: var(--accent)"></i> Corporate Milestones
          </h3>
          <div style="display: flex; flex-direction: column;">
            ${milestonesHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchVideos() {
  try {
    const response = await fetch('/api/videos');
    const videosList = await response.json();
    renderVideos(videosList);
  } catch (error) {
    console.error('Error fetching videos:', error);
  }
}

function renderVideos(videosList) {
  const grid = document.getElementById('videos-dynamic-grid');
  if (!grid) return;

  if (videosList.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-video-slash" style="font-size: 3rem; margin-bottom: 16px; color: var(--accent);"></i>
        <h3>No videos uploaded yet.</h3>
      </div>
    `;
    return;
  }

  grid.innerHTML = videosList.map(v => `
    <div class="video-card">
      <div class="video-thumbnail-container">
        <img src="${v.thumbnail || '/images/cnc_router_3axis.png'}" alt="${v.title}">
        <button class="play-button-overlay" onclick="openVideoPlayer('${v.title.replace(/'/g, "\\'")}', '${v.url.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-play"></i>
        </button>
      </div>
      <div class="video-info">
        <h3 class="video-title" style="font-family: var(--font-display); color: var(--text-primary);">${v.title}</h3>
        <span class="video-duration" style="color: var(--accent); font-weight: 600; font-size: 0.85rem;"><i class="fa-solid fa-clock"></i> ${v.duration}</span>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px; line-height: 1.4;">${v.description}</p>
      </div>
    </div>
  `).join('');
}

async function fetchPhotos() {
  try {
    const response = await fetch('/api/photos');
    const photosList = await response.json();
    renderPhotos(photosList);
  } catch (error) {
    console.error('Error fetching photos:', error);
  }
}

function renderPhotos(photosList) {
  const grid = document.getElementById('photos-dynamic-grid');
  if (!grid) return;

  if (photosList.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-image" style="font-size: 3rem; margin-bottom: 16px; color: var(--accent);"></i>
        <h3>No photos uploaded yet.</h3>
      </div>
    `;
    return;
  }

  grid.innerHTML = photosList.map(p => `
    <div class="gallery-item" onclick="openImageModal('${p.url.replace(/'/g, "\\'")}', '${p.caption.replace(/'/g, "\\'")}')">
      <img src="${p.url}" alt="${p.caption}">
      <div class="gallery-caption">
        <p style="font-size:0.75rem; color:var(--accent); text-transform:uppercase; font-weight:700; letter-spacing:0.05em; margin-bottom:4px;">${p.category}</p>
        <h4 style="font-family: var(--font-display); font-size: 1rem; color:#fff;">${p.caption}</h4>
      </div>
    </div>
  `).join('');
}

async function fetchContactDetails() {
  try {
    const response = await fetch('/api/contact');
    const data = await response.json();
    renderContactDetails(data);
  } catch (error) {
    console.error('Error fetching contact details:', error);
  }
}

function renderContactDetails(data) {
  const topAddress = document.getElementById('top-bar-address');
  const topGst = document.getElementById('top-bar-gst');
  const topPhone = document.getElementById('top-bar-phone');
  const headerCall = document.getElementById('header-call-btn');

  if (topAddress && data.map && data.map.address) {
    topAddress.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${data.map.address}`;
  }
  if (topGst && data.contact && data.contact.gstin) {
    topGst.innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> GSTIN: ${data.contact.gstin}`;
  }
  if (topPhone && data.contact && data.contact.primaryContact && data.contact.phone) {
    topPhone.innerHTML = `<i class="fa-solid fa-phone"></i> Call ${data.contact.primaryContact}: ${data.contact.phone}`;
  }
  if (headerCall && data.contact && data.contact.phone) {
    headerCall.href = `tel:${data.contact.phone.replace(/\s+/g, '')}`;
  }

  const panel = document.getElementById('contact-dynamic-info');
  if (panel) {
    panel.innerHTML = `
      <h3>${data.heading}</h3>
      <p style="color: var(--text-secondary);">${data.subheading}</p>

      <div class="contact-card-item">
        <div class="contact-card-icon"><i class="fa-solid fa-location-dot"></i></div>
        <div class="contact-card-text">
          <h4>${data.address.title}</h4>
          <p>${data.address.line1}</p>
          <p>${data.address.line2}</p>
        </div>
      </div>

      <div class="contact-card-item">
        <div class="contact-card-icon"><i class="fa-solid fa-address-card"></i></div>
        <div class="contact-card-text">
          <h4>${data.contact.title}</h4>
          <p>Primary Contact: <strong>${data.contact.primaryContact}</strong></p>
          <p>Mobile: <a href="tel:${data.contact.phone.replace(/\s+/g, '')}">${data.contact.phone}</a></p>
          <p>Email: <a href="mailto:${data.contact.email}">${data.contact.email}</a></p>
          <span class="gst-badge">GSTIN: ${data.contact.gstin}</span>
        </div>
      </div>

      <!-- Map View Mock -->
      <div class="map-container">
        <div class="map-placeholder">
          <i class="fa-solid fa-map-location-dot"></i>
          <h4>${data.map.title}</h4>
          <p style="font-size: 0.8rem; margin-top: 6px;">${data.map.address}</p>
          <a href="${data.map.link}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.75rem; margin-top: 12px;"><i class="fa-solid fa-location-arrow"></i> Open in Google Maps</a>
        </div>
      </div>
    `;
  }
}
