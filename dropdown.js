class GridDropdown {
    constructor(config = {}) {
        this.config = {
            containerId: 'searchInput',
            containerSelector: null,
            jsonFile: 'data.json',
            keys: { id: 'id', title: 'title', subtitle: null },
            dataPath: null,
            placeholder: 'Start typing...',
            noResultsText: 'No matching results found',
            fallbackData: [],
            selectedItemId: 'selectedItem',
            ...config
        };
        
        this.items = [];
        this.currentIndex = -1;
        this.initialized = false;
        this.searchInput = null;
        this.dropdownMenu = null;
        this.gridContainer = null;
        this.noResults = null;
        this.selectedItem = null;
    }

    async loadData() {
        try {
            if (this.config.inlineData) {
                let targetData = this.config.inlineData;
                if (this.config.dataPath) {
                    const pathParts = this.config.dataPath.split('.');
                    for (const part of pathParts) {
                        targetData = targetData[part];
                    }
                }
                this.items = Array.isArray(targetData) ? targetData : targetData.items || [];
                this.items = this.items.map(item => this.normalizeItem(item));
                console.log('Data loaded successfully:', this.items.length, 'items');
                return;
            }
            
            const response = await fetch(this.config.jsonFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            let targetData = data;
            if (this.config.dataPath) {
                const pathParts = this.config.dataPath.split('.');
                for (const part of pathParts) {
                    targetData = targetData[part];
                    if (!targetData) {
                        throw new Error(`Data path '${this.config.dataPath}' not found`);
                    }
                }
            }
            
            this.items = Array.isArray(targetData) ? targetData : targetData.items || [];
            this.items = this.items.map(item => this.normalizeItem(item));
            console.log('Data loaded successfully:', this.items.length, 'items');
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = this.config.fallbackData.map(item => this.normalizeItem(item));
            console.log('Using fallback data:', this.items.length, 'items');
        }
    }

    normalizeItem(item) {
        const normalized = {
            id: item[this.config.keys.id],
            title: item[this.config.keys.title],
            originalItem: item
        };
        
        if (this.config.keys.subtitle && item[this.config.keys.subtitle]) {
            normalized.subtitle = item[this.config.keys.subtitle];
        }
        
        return normalized;
    }

    initializeDOMElements() {
        this.searchInput = document.getElementById(this.config.containerId);
        if (!this.searchInput) {
            console.error(`Search input '${this.config.containerId}' not found`);
            return false;
        }
        
        const container = this.searchInput.closest('.grid-dropdown');
        if (!container) {
            console.error('Container with class "grid-dropdown" not found');
            return false;
        }
        
        this.dropdownMenu = container.querySelector('.grid-dropdown-menu');
        this.gridContainer = container.querySelector('.grid-container');
        this.noResults = container.querySelector('.no-results');
        this.selectedItem = document.getElementById(this.config.selectedItemId);
        
        if (!this.dropdownMenu || !this.gridContainer || !this.noResults) {
            console.error('Required DOM elements not found');
            return false;
        }
        
        if (this.config.placeholder) {
            this.searchInput.placeholder = this.config.placeholder;
        }
        
        return true;
    }

    filterItems(query) {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return this.items.filter(item => 
            item.title.toLowerCase().includes(lowerQuery) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery))
        );
    }

    renderGrid(filteredItems) {
        this.gridContainer.innerHTML = '';
        
        if (filteredItems.length === 0) {
            this.gridContainer.style.display = 'none';
            this.noResults.style.display = 'block';
            return;
        }

        this.gridContainer.style.display = 'grid';
        this.noResults.style.display = 'none';

        filteredItems.forEach(item => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';
            gridItem.setAttribute('data-id', item.id);
            
            let itemHTML = `<div class="grid-item-title">${item.title}</div>`;
            if (item.subtitle) {
                itemHTML += `<div class="grid-item-subtitle">${item.subtitle}</div>`;
            }
            gridItem.innerHTML = itemHTML;
            
            gridItem.addEventListener('click', () => {
                this.selectItem(item);
            });
            
            this.gridContainer.appendChild(gridItem);
        });
    }

    selectItem(item) {
        if (this.selectedItem) {
            this.selectedItem.innerHTML = `
                <div class="fw-medium">${item.title}</div>
                ${item.subtitle ? `<small class="text-muted">${item.subtitle}</small>` : ''}
            `;
            this.selectedItem.setAttribute('data-selected-id', item.id);
        }
        if (item.subtitle != "" && item.subtitle != undefined && item.subtitle != null && 'specialtySearch' == this.config.containerId) {
            this.searchInput.value = item.subtitle + ", " + item.title;
        }
        else {
            this.searchInput.value = item.title;
        }
        
        this.hideDropdown();
        
        const event = new CustomEvent('itemSelected', {
            detail: { 
                id: item.id, 
                title: item.title,
                subtitle: item.subtitle,
                originalItem: item.originalItem,
                dropdownInstance: this
            }
        });
        document.dispatchEvent(event);
    }

    getSelectedItem() {
        if (!this.selectedItem) return null;
        const selectedId = this.selectedItem.getAttribute('data-selected-id');
        if (selectedId) {
            return this.items.find(item => item.id == selectedId);
        }
        return null;
    }

    clearSelection() {
        if (this.selectedItem) {
            this.selectedItem.innerHTML = '<span class="text-muted fst-italic">No item selected</span>';
            this.selectedItem.removeAttribute('data-selected-id');
        }
        this.searchInput.value = '';
        this.hideDropdown();
        
        // Update search results if visible
        updateSearchResults();
    }

    showDropdown() {
        this.dropdownMenu.classList.add('show');
    }

    hideDropdown() {
        this.dropdownMenu.classList.remove('show');
        this.currentIndex = -1;
    }

    updateActiveItem(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentIndex);
        });
    }

    async initializeEventListeners() {
        if (!this.initializeDOMElements()) {
            return false;
        }
        
        await this.loadData();
        
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.trim()) {
                const filtered = this.filterItems(query);
                this.renderGrid(filtered);
                this.showDropdown();
                this.currentIndex = -1;
            } else {
                this.hideDropdown();
            }
        });

        this.searchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim()) {
                const filtered = this.filterItems(e.target.value);
                this.renderGrid(filtered);
                this.showDropdown();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.grid-dropdown')) {
                this.hideDropdown();
            }
        });

        this.searchInput.addEventListener('keydown', (e) => {
            const gridItems = this.gridContainer.querySelectorAll('.grid-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (gridItems.length > 0) {
                    this.currentIndex = Math.min(this.currentIndex + 1, gridItems.length - 1);
                    this.updateActiveItem(gridItems);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (gridItems.length > 0) {
                    this.currentIndex = Math.max(this.currentIndex - 1, -1);
                    this.updateActiveItem(gridItems);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.currentIndex >= 0 && gridItems[this.currentIndex]) {
                    gridItems[this.currentIndex].click();
                }
            } else if (e.key === 'Escape') {
                this.hideDropdown();
                this.currentIndex = -1;
            }
        });
        
        this.initialized = true;
        return true;
    }

    async init() {
        return await this.initializeEventListeners();
    }
}

let statesDropdown, specialtiesDropdown;

document.addEventListener('DOMContentLoaded', async function() {
    // States dropdown
    statesDropdown = new GridDropdown({
        containerId: 'stateSearch',
        jsonFile: 'states.json',
        keys: {
            id: 'id',
            title: 'abbreviation',
            subtitle: 'title'
        },
        selectedItemId: 'selectedState',
        placeholder: 'US State',
        noResultsText: 'No matching states found',
    });

    // Medical specialties dropdown
    specialtiesDropdown = new GridDropdown({
        containerId: 'specialtySearch',
        jsonFile: 'specialties.json',
        keys: {
            id: 'id',
            title: 'specialty',
            subtitle: 'classification'
        },
        selectedItemId: 'selectedSpecialty',
        placeholder: 'Medical specialties',
        noResultsText: 'No matching specialties found',
    });

    // Initialize both dropdowns
    await statesDropdown.init();
    await specialtiesDropdown.init();

    console.log('Both dropdowns initialized successfully!');
});

// Utility functions
function performSearch() {
    const selectedState = statesDropdown.getSelectedItem();
    const selectedSpecialty = specialtiesDropdown.getSelectedItem();
    
    if (!selectedState && !selectedSpecialty) {
        alert('Please select at least a state or specialty to search.');
        return;
    }
    
    // Update search results display
    updateSearchResults();
    
    // Show results section
    document.getElementById('searchResults').style.display = 'block';
    
    // Scroll to results
    document.getElementById('searchResults').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
}

function updateSearchResults() {
    // const selectedState = statesDropdown.getSelectedItem();
    // const selectedSpecialty = specialtiesDropdown.getSelectedItem();
    // document.getElementById('stateSearch').textContent = 
    //     selectedState ? selectedState.title : 'Any State';
    // document.getElementById('specialtySearch').textContent = 
    //     selectedSpecialty ? (selectedSpecialty.subtitle + ", " + selectedSpecialty.title) : 'Any Specialty';
}

function clearAllSelections() {
    statesDropdown.clearSelection();
    specialtiesDropdown.clearSelection();
    document.getElementById('searchResults').style.display = 'none';
}

// Listen for selection events
document.addEventListener('itemSelected', function(e) {
    console.log('Item selected:', e.detail);
    updateSearchResults();
});