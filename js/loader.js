// loader.js - Phone data management and display

// Currency formatter — pounds sterling throughout
const formatPrice = (price) => `£${price.toLocaleString('en-GB')}`;

// ─── PhoneManager ────────────────────────────────────────────────────────────

class PhoneManager {
    constructor() {
        this.phones = [];
        this.filteredPhones = [];
        this.currentFilters = {
            brand: 'all',
            priceMin: 0,
            priceMax: 2000,
            search: '',
            sort: 'newest'
        };
    }

    async loadPhones() {
        try {
            const response = await fetch('../database.json');
            if (!response.ok) throw new Error('Failed to load database');
            const data = await response.json();
            this.phones = data.phones;
            this.filteredPhones = [...this.phones];
            this.sortPhones(this.currentFilters.sort);
            return this.phones;
        } catch (error) {
            console.error('Error loading database:', error);
            return [];
        }
    }

    filterByBrand(brand) {
        this.currentFilters.brand = brand;
        this.applyFilters();
    }

    filterByPrice(min, max) {
        this.currentFilters.priceMin = min;
        this.currentFilters.priceMax = max;
        this.applyFilters();
    }

    searchPhones(query) {
        this.currentFilters.search = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        this.filteredPhones = this.phones.filter(phone => {
            const brandMatch = this.currentFilters.brand === 'all' ||
                               phone.brand === this.currentFilters.brand;

            const noUpperBound = this.currentFilters.priceMax >= 2000;
            let priceMatch = phone.price >= this.currentFilters.priceMin &&
                             (noUpperBound || phone.price <= this.currentFilters.priceMax);

            const searchMatch = this.currentFilters.search === '' ||
                phone.model.toLowerCase().includes(this.currentFilters.search) ||
                phone.brand.toLowerCase().includes(this.currentFilters.search);

            return brandMatch && priceMatch && searchMatch;
        });

        // Re-apply the active sort after every filter change
        this.sortPhones(this.currentFilters.sort);
    }

    getFilteredPhones() { return this.filteredPhones; }
    getPhoneById(id)     { return this.phones.find(p => p.id === id); }
    getBrands()          { return [...new Set(this.phones.map(p => p.brand))].sort(); }

    sortPhones(sortBy) {
        this.currentFilters.sort = sortBy;
        switch (sortBy) {
            case 'price-low':  this.filteredPhones.sort((a, b) => a.price - b.price); break;
            case 'price-high': this.filteredPhones.sort((a, b) => b.price - a.price); break;
            case 'name-asc':   this.filteredPhones.sort((a, b) => a.model.localeCompare(b.model)); break;
            case 'name-desc':  this.filteredPhones.sort((a, b) => b.model.localeCompare(a.model)); break;
            case 'newest':     this.filteredPhones.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)); break;
        }
    }
}

// ─── PhoneUI (Browse page) ───────────────────────────────────────────────────

const PAGE_SIZE = 9; // cards shown per page

class PhoneUI {
    constructor(phoneManager) {
        this.phoneManager = phoneManager;
        this.visibleCount = PAGE_SIZE;
    }

    createPhoneCard(phone) {
        const compareList = JSON.parse(localStorage.getItem('comparePhones') || '[]');
        const isInCompare = compareList.includes(phone.id);
        const storageOptions = phone.specs.storage.join(', ');

        return `
            <div class="phone-card" data-phone-id="${phone.id}">
                <div class="phone-image">
                    <img src="${phone.image}" alt="${phone.brand} ${phone.model}"
                         onload="this.parentElement.classList.add('img-loaded')"
                         onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='12' cy='17' r='1'%3E%3C/circle%3E%3C/svg%3E'">
                    <div class="phone-badge">${phone.brand}</div>
                </div>
                <div class="phone-info">
                    <h3 class="phone-title">${phone.brand} ${phone.model}</h3>
                    <p class="phone-price">${formatPrice(phone.price)}</p>
                    <div class="phone-specs-preview">
                        <span class="spec-item">📱 ${phone.specs.display.size}</span>
                        <span class="spec-item">📷 ${phone.specs.camera.main}</span>
                        <span class="spec-item">🔋 ${phone.specs.battery.capacity}</span>
                    </div>
                    <div class="phone-storage">
                        <small>Storage: ${storageOptions}</small>
                    </div>
                    <div class="phone-actions">
                        <button class="btn-primary" onclick="viewPhoneDetails(${phone.id})">View Details</button>
                        <button class="btn-secondary${isInCompare ? ' in-compare' : ''}"
                                id="compare-btn-${phone.id}"
                                onclick="addToCompare(${phone.id})">
                            ${isInCompare ? '✓ Added' : 'Compare'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPhones(container, resetPagination = false) {
        if (resetPagination) this.visibleCount = PAGE_SIZE;

        const phones = this.phoneManager.getFilteredPhones();

        if (phones.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>No phones found</h3>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }

        const visible = phones.slice(0, this.visibleCount);
        const remaining = phones.length - this.visibleCount;
        const nextBatch = Math.min(remaining, PAGE_SIZE);

        container.innerHTML =
            visible.map(p => this.createPhoneCard(p)).join('') +
            (remaining > 0 ? `
                <div class="show-more-row">
                    <button class="btn-show-more" onclick="loadMorePhones()">
                        <span>Show ${nextBatch} more</span>
                        <small>${remaining} of ${phones.length} remaining</small>
                    </button>
                </div>
            ` : (phones.length > PAGE_SIZE ? `
                <div class="show-more-row">
                    <p class="all-loaded">✓ All ${phones.length} phones shown</p>
                </div>
            ` : ''));
    }

    renderFilters(filterContainer) {
        const brands = this.phoneManager.getBrands();
        filterContainer.innerHTML = `
            <div class="filters-wrapper">
                <div class="filter-group">
                    <label for="brand-filter">Brand:</label>
                    <select id="brand-filter" onchange="handleBrandFilter(this.value)">
                        <option value="all">All Brands</option>
                        ${brands.map(b => `<option value="${b}">${b}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group filter-group--price">
                    <div class="price-label-row">
                        <label>Price Range:</label>
                        <span class="price-display" id="price-display">All prices</span>
                    </div>
                    <div class="price-slider-wrapper">
                        <div class="price-slider-track">
                            <div class="price-slider-fill" id="price-slider-fill"></div>
                        </div>
                        <input type="range" id="price-min" class="price-range price-range--min"
                               min="0" max="2000" value="0" step="25"
                               oninput="handlePriceSlider()">
                        <input type="range" id="price-max" class="price-range price-range--max"
                               min="0" max="2000" value="2000" step="25"
                               oninput="handlePriceSlider()">
                    </div>
                </div>
                <div class="filter-group">
                    <label for="sort-filter">Sort By:</label>
                    <select id="sort-filter" onchange="handleSort(this.value)">
                        <option value="newest">Newest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="name-asc">Name: A–Z</option>
                        <option value="name-desc">Name: Z–A</option>
                    </select>
                </div>
                <div class="filter-group search-group">
                    <label for="search-input">Search:</label>
                    <input type="text" id="search-input" placeholder="Search phones…"
                           oninput="handleSearch(this.value)">
                </div>
            </div>
        `;
    }

    createPhoneDetails(phone) {
        return `
            <div class="phone-details-modal" onclick="handleModalClick(event)">
                <div class="modal-content">
                    <button class="close-modal" onclick="closePhoneDetails()">&times;</button>
                    <div class="details-grid">
                        <div class="details-image">
                            <img src="${phone.image}" alt="${phone.brand} ${phone.model}"
                                 onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='12' cy='17' r='1'%3E%3C/circle%3E%3C/svg%3E'">
                        </div>
                        <div class="details-info">
                            <h2>${phone.brand} ${phone.model}</h2>
                            <p class="details-price">${formatPrice(phone.price)}</p>
                            <p class="release-date">Released: ${new Date(phone.releaseDate).toLocaleDateString('en-GB')}</p>

                            <div class="spec-section"><h3>Display</h3><ul>
                                <li>Size: ${phone.specs.display.size}</li>
                                <li>Type: ${phone.specs.display.type}</li>
                                <li>Resolution: ${phone.specs.display.resolution}</li>
                                <li>Refresh Rate: ${phone.specs.display.refreshRate}</li>
                            </ul></div>

                            <div class="spec-section"><h3>Performance</h3><ul>
                                <li>Processor: ${phone.specs.processor}</li>
                                <li>RAM: ${phone.specs.ram}</li>
                                <li>Storage Options: ${phone.specs.storage.join(', ')}</li>
                                <li>OS: ${phone.specs.os}</li>
                            </ul></div>

                            <div class="spec-section"><h3>Camera</h3><ul>
                                <li>Main: ${phone.specs.camera.main}</li>
                                <li>Ultra Wide: ${phone.specs.camera.ultraWide}</li>
                                ${phone.specs.camera.telephoto !== 'N/A'
                                    ? `<li>Telephoto: ${phone.specs.camera.telephoto}</li>` : ''}
                                <li>Front: ${phone.specs.camera.front}</li>
                            </ul></div>

                            <div class="spec-section"><h3>Battery &amp; Charging</h3><ul>
                                <li>Capacity: ${phone.specs.battery.capacity}</li>
                                <li>Charging: ${phone.specs.battery.charging}</li>
                            </ul></div>

                            <div class="spec-section"><h3>Connectivity</h3><ul>
                                ${phone.specs.connectivity.map(c => `<li>${c}</li>`).join('')}
                            </ul></div>

                            <div class="spec-section"><h3>Design</h3><ul>
                                <li>Dimensions: ${phone.dimensions}</li>
                                <li>Weight: ${phone.weight}</li>
                                <li>Water Resistance: ${phone.specs.waterResistance}</li>
                                <li>Colors: ${phone.colors.join(', ')}</li>
                            </ul></div>

                            ${phone.features ? `
                            <div class="spec-section"><h3>Special Features</h3><ul>
                                ${phone.features.map(f => `<li>${f}</li>`).join('')}
                            </ul></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// ─── Compare Tray (floating bar on Browse page) ──────────────────────────────

class CompareTray {
    getList() {
        return JSON.parse(localStorage.getItem('comparePhones') || '[]');
    }

    render() {
        const tray = document.getElementById('compare-tray');
        if (!tray) return;

        const list = this.getList();
        if (list.length === 0) {
            tray.innerHTML = '';
            tray.classList.remove('visible');
            return;
        }

        const phones = list.map(id => phoneManager?.getPhoneById(id)).filter(Boolean);
        const emptySlots = 3 - phones.length;

        tray.classList.add('visible');
        tray.innerHTML = `
            <div class="compare-tray-inner">
                <div class="compare-tray-phones">
                    ${phones.map(p => `
                        <div class="tray-phone">
                            <img src="${p.image}" alt="${p.model}"
                                 onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='12' cy='17' r='1'%3E%3C/circle%3E%3C/svg%3E'">
                            <span>${p.brand} ${p.model}</span>
                            <button class="tray-remove" onclick="removeFromCompare(${p.id})"
                                    title="Remove">×</button>
                        </div>
                    `).join('')}
                    ${Array(emptySlots).fill(0).map(() => `
                        <div class="tray-phone tray-empty">
                            <div class="tray-empty-icon">+</div>
                            <span>Add a phone</span>
                        </div>
                    `).join('')}
                </div>
                <div class="compare-tray-actions">
                    <span class="tray-count">${phones.length} of 3 selected</span>
                    ${phones.length >= 2
                        ? `<a href="compare.html" class="btn-primary">Compare Now →</a>` : ''}
                    <button class="btn-ghost" onclick="clearCompare()">Clear All</button>
                </div>
            </div>
        `;
    }
}

// ─── ComparePageUI (compare.html) ────────────────────────────────────────────

class ComparePageUI {
    constructor(phoneManager) {
        this.phoneManager = phoneManager;
    }

    render(container) {
        const compareList = JSON.parse(localStorage.getItem('comparePhones') || '[]');
        const phones = compareList
            .map(id => this.phoneManager.getPhoneById(id))
            .filter(Boolean);

        if (phones.length < 2) {
            container.innerHTML = `
                <div class="compare-empty">
                    <div class="compare-empty-icon">📱</div>
                    <h3>Not enough phones selected</h3>
                    <p>Head to the <a href="phones.html">Browse page</a> and add at least
                       2 phones using the Compare button.</p>
                </div>
            `;
            return;
        }

        // Spec rows definition
        const rows = [
            { label: 'Price',            fn: p => formatPrice(p.price) },
            { label: 'Released',         fn: p => new Date(p.releaseDate).toLocaleDateString('en-GB') },
            { label: 'Display Size',     fn: p => p.specs.display.size },
            { label: 'Display Type',     fn: p => p.specs.display.type },
            { label: 'Resolution',       fn: p => p.specs.display.resolution },
            { label: 'Refresh Rate',     fn: p => p.specs.display.refreshRate },
            { label: 'Processor',        fn: p => p.specs.processor },
            { label: 'RAM',              fn: p => p.specs.ram },
            { label: 'Storage Options',  fn: p => p.specs.storage.join(', ') },
            { label: 'Operating System', fn: p => p.specs.os },
            { label: 'Main Camera',      fn: p => p.specs.camera.main },
            { label: 'Ultra Wide',       fn: p => p.specs.camera.ultraWide },
            { label: 'Telephoto',        fn: p => p.specs.camera.telephoto },
            { label: 'Front Camera',     fn: p => p.specs.camera.front },
            { label: 'Battery',          fn: p => p.specs.battery.capacity },
            { label: 'Charging',         fn: p => p.specs.battery.charging },
            { label: 'Water Resistance', fn: p => p.specs.waterResistance },
            { label: 'Dimensions',       fn: p => p.dimensions },
            { label: 'Weight',           fn: p => p.weight },
            { label: 'Colors',           fn: p => p.colors.join(', ') },
            { label: 'Connectivity',     fn: p => p.specs.connectivity.join(', ') },
        ];

        container.innerHTML = `
            <div class="comparison-table-wrapper">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th class="spec-label-col">Specification</th>
                            ${phones.map(p => `
                                <th>
                                    <div class="compare-phone-header">
                                        <img src="${p.image}" alt="${p.brand} ${p.model}"
                                             onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='12' cy='17' r='1'%3E%3C/circle%3E%3C/svg%3E'">
                                        <div class="compare-phone-name">
                                            <strong>${p.brand}</strong>
                                            <span>${p.model}</span>
                                        </div>
                                        <button class="remove-compare-btn"
                                                onclick="removeFromCompareAndRefresh(${p.id})"
                                                title="Remove from comparison">×</button>
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => {
                            const values = phones.map(p => row.fn(p) || '—');
                            const allSame = values.every(v => v === values[0]);
                            return `
                                <tr>
                                    <td class="spec-label">${row.label}</td>
                                    ${values.map(v => `
                                        <td class="${allSame ? '' : 'spec-differs'}">${v}</td>
                                    `).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="compare-page-actions">
                    <a href="phones.html" class="btn-secondary">← Browse More Phones</a>
                    <button class="btn-ghost" onclick="clearCompareAndRefresh()">Clear All</button>
                </div>
            </div>
        `;
    }
}

// ─── Global instances ────────────────────────────────────────────────────────

let phoneManager;
let phoneUI;
let compareTray;
let comparePageUI;

async function initPhoneApp() {
    phoneManager = new PhoneManager();
    phoneUI     = new PhoneUI(phoneManager);

    await phoneManager.loadPhones();

    // Browse page
    const filterContainer = document.getElementById('filters-container');
    if (filterContainer) {
        phoneUI.renderFilters(filterContainer);
        initPriceSlider();
    }

    const phoneGrid = document.getElementById('phone-grid');
    if (phoneGrid) phoneUI.renderPhones(phoneGrid, true);

    updateResultsCount();

    if (document.getElementById('compare-tray')) {
        compareTray = new CompareTray();
        compareTray.render();
    }

    // Compare page
    const compareContainer = document.getElementById('compare-container');
    if (compareContainer) {
        comparePageUI = new ComparePageUI(phoneManager);
        comparePageUI.render(compareContainer);
    }
}

// ─── Event handlers ──────────────────────────────────────────────────────────

function handleBrandFilter(brand) {
    phoneManager.filterByBrand(brand);
    phoneUI.renderPhones(document.getElementById('phone-grid'), true);
    updateResultsCount();
}

let _priceSliderTimer = null;

function handlePriceSlider() {
    const minEl = document.getElementById('price-min');
    const maxEl = document.getElementById('price-max');
    const display = document.getElementById('price-display');
    const fill = document.getElementById('price-slider-fill');

    let min = parseInt(minEl.value);
    let max = parseInt(maxEl.value);

    if (min > max - 50) {
        if (document.activeElement === minEl) {
            min = max - 50;
            minEl.value = min;
        } else {
            max = min + 50;
            maxEl.value = max;
        }
    }

    const pMin = (min / 2000) * 100;
    const pMax = (max / 2000) * 100;
    fill.style.left  = `${pMin}%`;
    fill.style.width = `${pMax - pMin}%`;

    const fmtMin = `£${min.toLocaleString('en-GB')}`;
    const fmtMax = max >= 2000 ? '£2,000+' : `£${max.toLocaleString('en-GB')}`;
    display.textContent = (min === 0 && max >= 2000)
        ? 'All prices'
        : `${fmtMin} – ${fmtMax}`;

    clearTimeout(_priceSliderTimer);
    _priceSliderTimer = setTimeout(() => {
        phoneManager.filterByPrice(min, max);
        phoneUI.renderPhones(document.getElementById('phone-grid'), true);
        updateResultsCount();
    }, 200);
}

// Initialise the fill position once filters are rendered
function initPriceSlider() {
    const fill = document.getElementById('price-slider-fill');
    if (fill) { fill.style.left = '0%'; fill.style.width = '100%'; }
}

function handleSearch(query) {
    phoneManager.searchPhones(query);
    phoneUI.renderPhones(document.getElementById('phone-grid'), true);
    updateResultsCount();
}

function handleSort(sortBy) {
    phoneManager.sortPhones(sortBy);
    phoneUI.renderPhones(document.getElementById('phone-grid'), true);
}

function updateResultsCount() {
    const total = phoneManager.getFilteredPhones().length;
    const shown = Math.min(phoneUI.visibleCount, total);
    const el = document.getElementById('results-count');
    if (el) {
        el.textContent = shown < total
            ? `Showing ${shown} of ${total} phone${total !== 1 ? 's' : ''}`
            : `Showing all ${total} phone${total !== 1 ? 's' : ''}`;
    }
}

function loadMorePhones() {
    phoneUI.visibleCount += PAGE_SIZE;
    const grid = document.getElementById('phone-grid');
    phoneUI.renderPhones(grid, false); // false = keep existing visibleCount
    updateResultsCount();
    // Smoothly scroll the first newly-revealed card into view
    const cards = grid.querySelectorAll('.phone-card');
    const firstNew = cards[phoneUI.visibleCount - PAGE_SIZE];
    if (firstNew) firstNew.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function viewPhoneDetails(phoneId) {
    const phone = phoneManager.getPhoneById(phoneId);
    if (!phone) return;
    const div = document.createElement('div');
    div.innerHTML = phoneUI.createPhoneDetails(phone);
    document.body.appendChild(div.firstElementChild);
}

function closePhoneDetails() {
    document.querySelector('.phone-details-modal')?.remove();
}

// Close modal by clicking the dark overlay
function handleModalClick(event) {
    if (event.target.classList.contains('phone-details-modal')) {
        closePhoneDetails();
    }
}

// ─── Toast notifications ─────────────────────────────────────────────────────

// Keep a live list of active toast elements so we can reposition them
const _activeToasts = [];

function _repositionToasts() {
    // Stack upward from the tray (bottom: 5rem base + tray height when visible)
    const baseBottom = 5.5; // rem
    const gap = 0.5;        // rem between toasts
    let offset = baseBottom;
    // Iterate bottom-to-top (oldest first = lowest)
    for (let i = _activeToasts.length - 1; i >= 0; i--) {
        _activeToasts[i].style.bottom = `${offset}rem`;
        offset += _activeToasts[i].offsetHeight / 16 + gap;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    // Start off-screen below — bottom will be set by repositioner
    toast.style.bottom = '0rem';
    document.body.appendChild(toast);

    _activeToasts.push(toast);
    _repositionToasts();

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => {
            toast.remove();
            const idx = _activeToasts.indexOf(toast);
            if (idx !== -1) _activeToasts.splice(idx, 1);
            _repositionToasts();
        }, 300);
    }, 2500);
}

// ─── Compare list management ─────────────────────────────────────────────────

function addToCompare(phoneId) {
    let compareList = JSON.parse(localStorage.getItem('comparePhones') || '[]');

    if (compareList.includes(phoneId)) {
        showToast('This phone is already in your comparison list', 'warning');
        return;
    }
    if (compareList.length >= 3) {
        showToast('You can only compare up to 3 phones at a time', 'warning');
        return;
    }

    compareList.push(phoneId);
    localStorage.setItem('comparePhones', JSON.stringify(compareList));

    const btn = document.getElementById(`compare-btn-${phoneId}`);
    if (btn) {
        btn.textContent = '✓ Added';
        btn.classList.add('in-compare');
    }

    const phone = phoneManager.getPhoneById(phoneId);
    showToast(`${phone?.model || 'Phone'} added to comparison`, 'success');

    compareTray?.render();
}

function removeFromCompare(phoneId) {
    let compareList = JSON.parse(localStorage.getItem('comparePhones') || '[]');
    compareList = compareList.filter(id => id !== phoneId);
    localStorage.setItem('comparePhones', JSON.stringify(compareList));

    const phoneGrid = document.getElementById('phone-grid');
    if (phoneGrid && phoneUI) phoneUI.renderPhones(phoneGrid);

    compareTray?.render();
}

function clearCompare() {
    localStorage.removeItem('comparePhones');
    const phoneGrid = document.getElementById('phone-grid');
    if (phoneGrid && phoneUI) phoneUI.renderPhones(phoneGrid);
    compareTray?.render();
}

function removeFromCompareAndRefresh(phoneId) {
    removeFromCompare(phoneId);
    const compareContainer = document.getElementById('compare-container');
    if (compareContainer && comparePageUI) comparePageUI.render(compareContainer);
}

function clearCompareAndRefresh() {
    clearCompare();
    const compareContainer = document.getElementById('compare-container');
    if (compareContainer && comparePageUI) comparePageUI.render(compareContainer);
}

// ─── Auto-init ───────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhoneApp);
} else {
    initPhoneApp();
}