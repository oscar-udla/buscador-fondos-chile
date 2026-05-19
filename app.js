/**
 * Buscador de Fondos de Innovación Chile 2026
 * App Logic - SPA Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // STATE
    // --------------------------------------------------------------------------
    let fundsData = [];
    let filteredData = [];
    let favoriteIds = new Set(JSON.parse(localStorage.getItem('fav_funds') || '[]'));
    let activeTab = 'tab-all';
    
    // Quiz state
    let quizCurrentStep = 1;
    let quizAnswers = {
        profile: '',
        stage: '',
        sector: '',
        amount: ''
    };

    // Filter defaults
    const activeFilters = {
        search: '',
        institutions: [], // array of selected values
        target: 'all',
        stage: 'all',
        sector: 'all',
        amountRange: 'all',
        statuses: ['open', 'coming_soon'] // default only open and coming soon
    };

    // Current active detail fund (for simulator)
    let currentDetailFund = null;

    // --------------------------------------------------------------------------
    // UI ELEMENTS DOM
    // --------------------------------------------------------------------------
    // Navigation & Tabs
    const tabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const favoriteCountLbl = document.getElementById('favorite-count');
    
    // Grids & Display
    const fundsGrid = document.getElementById('funds-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const resultsCount = document.getElementById('results-count');
    
    // Filtering Controls
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const filtersForm = document.getElementById('filters-form');
    const sortSelect = document.getElementById('sort-select');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const activeFiltersIndicators = document.getElementById('active-filters-indicators');
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const sidebarFilters = document.getElementById('sidebar-filters');
    
    // Modal Details & Calculator
    const detailModal = document.getElementById('fund-detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalInstitution = document.getElementById('modal-institution');
    const modalStatus = document.getElementById('modal-status');
    const modalSector = document.getElementById('modal-sector');
    const modalTitle = document.getElementById('modal-title');
    const modalDescDetailed = document.getElementById('modal-desc-detailed');
    const modalProfileLbl = document.getElementById('modal-profile-lbl');
    const modalStageLbl = document.getElementById('modal-stage-lbl');
    const modalTargetDetails = document.getElementById('modal-target-details');
    const modalRequirementsList = document.getElementById('modal-requirements-list');
    const modalBenefitsList = document.getElementById('modal-benefits-list');
    const modalDeadlineDate = document.getElementById('modal-deadline-date');
    const modalApplyLink = document.getElementById('modal-apply-link');
    
    // Calculator widgets
    const calcBudgetInput = document.getElementById('calc-budget-input');
    const calcBudgetSlider = document.getElementById('calc-budget-slider');
    const calcPctSubsidy = document.getElementById('calc-pct-subsidy');
    const calcPctUser = document.getElementById('calc-pct-user');
    const calcValSubsidy = document.getElementById('calc-val-subsidy');
    const calcValUser = document.getElementById('calc-val-user');
    const ratioSubsidyBar = document.getElementById('ratio-subsidy-bar');
    const ratioUserBar = document.getElementById('ratio-user-bar');
    const calcWarningMsg = document.getElementById('calc-warning-msg');
    
    // Quiz DOM
    const quizModal = document.getElementById('quiz-modal');
    const openQuizBtn = document.getElementById('open-quiz-btn');
    const quizCloseBtn = document.getElementById('quiz-close-btn');
    const quizSteps = document.querySelectorAll('.quiz-step');
    const quizOptCards = document.querySelectorAll('.quiz-opt-card');
    const quizPrevBtn = document.getElementById('quiz-prev-btn');
    const quizDots = document.querySelectorAll('.quiz-dot');
    const quizProgress = document.getElementById('quiz-progress');
    const quizCurrentStepLbl = document.getElementById('quiz-current-step');
    const quizNavFooter = document.getElementById('quiz-nav-footer');
    const quizResultsCards = document.getElementById('quiz-results-cards');
    const quizRestartBtn = document.getElementById('quiz-restart-btn');
    const quizFinishBtn = document.getElementById('quiz-finish-btn');
    
    // Theme
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const toastContainer = document.getElementById('toast-container');

    // --------------------------------------------------------------------------
    // TOAST NOTIFICATIONS (Aesthetics)
    // --------------------------------------------------------------------------
    function showToast(message, icon = 'ℹ️') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --------------------------------------------------------------------------
    // THEME CONTROLLER
    // --------------------------------------------------------------------------
    // Read saved preference
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('app-theme', 'dark');
            showToast('Modo Oscuro activado', '🌙');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('app-theme', 'light');
            showToast('Modo Claro activado', '☀️');
        }
        // Re-render charts in case they need to adapt colors
        if (activeTab === 'tab-stats') {
            renderAllCharts();
        }
    });

    // --------------------------------------------------------------------------
    // DYNAMIC FILTER POPULATION
    // --------------------------------------------------------------------------
    function populateInstitutionFilters() {
        const container = document.getElementById('institution-checkbox-list');
        if (!container) return;
        
        // Get all unique institutions from fundsData
        const insts = [...new Set(fundsData.map(f => f.institution))].sort();
        
        container.innerHTML = '';
        insts.forEach(inst => {
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            
            const isChecked = activeFilters.institutions.includes(inst);
            
            label.innerHTML = `
                <input type="checkbox" name="institution" value="${inst}" ${isChecked ? 'checked' : ''}>
                <span class="checkmark"></span>
                ${inst}
            `;
            container.appendChild(label);
        });
    }

    // --------------------------------------------------------------------------
    // DATA FETCHING
    // --------------------------------------------------------------------------
    async function loadData() {
        try {
            const response = await fetch('fondos_scraped.json');
            if (!response.ok) {
                throw new Error('Error al leer el catálogo de fondos');
            }
            fundsData = await response.json();
            filteredData = [...fundsData];
            
            // Render UI
            populateInstitutionFilters();
            updateKPIMetrics();
            updateFavoritesCount();
            applyFilters();
            
        } catch (error) {
            console.error('Error loading funds:', error);
            fundsGrid.innerHTML = `
                <div class="error-state">
                    <div class="empty-icon">⚠️</div>
                    <p class="empty-title">Hubo un problema al cargar los datos</p>
                    <p class="empty-desc">No pudimos conectar con la base de datos de fondos. Intenta refrescar la página.</p>
                </div>
            `;
        }
    }

    // --------------------------------------------------------------------------
    // KPI DASHBOARD UPDATER
    // --------------------------------------------------------------------------
    function updateKPIMetrics() {
        const totalFunds = fundsData.length;
        const activeFunds = fundsData.filter(f => f.status === 'open' || f.status === 'always_open').length;
        
        // Calculate average funding (ignoring dynamic science funds which are very high, or filter standard ones)
        const validAmounts = fundsData.map(f => f.amount).filter(a => a > 0);
        const avgFunding = validAmounts.reduce((a, b) => a + b, 0) / validAmounts.length;
        
        // Format CLP
        const formattedAvg = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(avgFunding);

        document.getElementById('kpi-total').querySelector('.kpi-val').textContent = totalFunds;
        document.getElementById('kpi-active').querySelector('.kpi-val').textContent = activeFunds;
        document.getElementById('kpi-average').querySelector('.kpi-val').textContent = formattedAvg;
    }

    function updateFavoritesCount() {
        favoriteCountLbl.textContent = favoriteIds.size;
    }

    // --------------------------------------------------------------------------
    // TAB NAVIGATION CONTROLLER
    // --------------------------------------------------------------------------
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            
            const targetPaneId = tab.getAttribute('data-target');
            document.getElementById(targetPaneId).classList.add('active');
            
            activeTab = targetPaneId;

            // Handle lazy actions per tab
            if (activeTab === 'tab-favorites') {
                renderFavorites();
            } else if (activeTab === 'tab-stats') {
                renderAllCharts();
            }
        });
    });

    // --------------------------------------------------------------------------
    // RENDERING SYSTEM (Grid Cards)
    // --------------------------------------------------------------------------
    function createFundCard(fund) {
        const isFav = favoriteIds.has(fund.id);
        const card = document.createElement('div');
        card.className = 'fund-card';
        card.setAttribute('data-id', fund.id);
        card.setAttribute('data-inst', fund.institution);
        
        // Clean target string for visual display
        const targetClean = fund.target.length > 25 ? fund.target.substring(0, 22) + '...' : fund.target;
        
        // Format stage
        const stageClean = fund.stage.length > 22 ? fund.stage.substring(0, 20) + '...' : fund.stage;

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <span class="badge institution-badge">${fund.institution}</span>
                    <div style="display:flex; align-items:center; gap: 0.5rem;">
                        <span class="badge status-badge ${fund.status}">${formatStatus(fund.status)}</span>
                        <button class="fav-btn ${isFav ? 'active' : ''}" aria-label="Guardar fondo como favorito" onclick="event.stopPropagation();">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="${isFav ? 'currentColor' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </button>
                    </div>
                </div>
                <h3 class="card-title">${fund.name}</h3>
                <p class="card-desc">${fund.description}</p>
            </div>
            <div>
                <div class="card-metrics">
                    <div class="metric-item">
                        <span class="metric-lbl">Subsidio Máximo</span>
                        <span class="metric-val" title="${fund.amountFormatted}">${fund.amountFormatted}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-lbl">Financia</span>
                        <span class="metric-val">${fund.maxPercent}% del proyecto</span>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-tags">
                        <span class="tag" title="${fund.target}">${targetClean}</span>
                        <span class="tag" title="${fund.stage}">${stageClean}</span>
                    </div>
                    <span class="arrow-link">
                        Simular
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                </div>
            </div>
        `;

        // Handle card click to open details
        card.addEventListener('click', () => openDetail(fund));
        
        // Handle favorite toggle inside card
        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(fund.id);
            // Toggle active visual state
            if (favoriteIds.has(fund.id)) {
                favBtn.classList.add('active');
                favBtn.querySelector('svg').setAttribute('fill', 'currentColor');
            } else {
                favBtn.classList.remove('active');
                favBtn.querySelector('svg').setAttribute('fill', 'none');
            }
        });

        return card;
    }

    function renderGrid(data, gridElement) {
        gridElement.innerHTML = '';
        if (data.length === 0) {
            gridElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p class="empty-title">No encontramos fondos coincidentes</p>
                    <p class="empty-desc">Intenta cambiando los términos de búsqueda o flexibilizando tus filtros avanzados.</p>
                </div>
            `;
            return;
        }
        data.forEach(fund => {
            gridElement.appendChild(createFundCard(fund));
        });
    }

    function renderFavorites() {
        const favData = fundsData.filter(fund => favoriteIds.has(fund.id));
        favoritesGrid.innerHTML = '';
        
        if (favData.length === 0) {
            favoritesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <p class="empty-title">Aún no tienes fondos guardados</p>
                    <p class="empty-desc">Haz clic en el ícono de corazón de cualquier fondo para guardarlo y organizarlo en esta sección.</p>
                    <button class="primary-btn" id="fav-explore-btn">Explorar Catálogo</button>
                </div>
            `;
            const exploreBtn = favoritesGrid.querySelector('#fav-explore-btn');
            if (exploreBtn) {
                exploreBtn.addEventListener('click', () => {
                    document.getElementById('tab-all-btn').click();
                });
            }
            return;
        }

        favData.forEach(fund => {
            // Re-use same card builder
            const card = createFundCard(fund);
            favoritesGrid.appendChild(card);
        });
    }

    // Status formatter
    function formatStatus(status) {
        switch(status) {
            case 'open': return 'Abierto';
            case 'always_open': return 'Siempre Abierto';
            case 'coming_soon': return 'Próxima Apertura';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    }

    // Favorite Storage Sync
    function toggleFavorite(id) {
        const fund = fundsData.find(f => f.id === id);
        if (favoriteIds.has(id)) {
            favoriteIds.delete(id);
            showToast(`Fondo "${fund.name.substring(0, 20)}..." eliminado de guardados`, '📁');
        } else {
            favoriteIds.add(id);
            showToast(`Fondo "${fund.name.substring(0, 20)}..." guardado en tus favoritos`, '❤️');
        }
        localStorage.setItem('fav_funds', JSON.stringify(Array.from(favoriteIds)));
        updateFavoritesCount();
        
        // If we are currently in favorites tab, re-render immediately
        if (activeTab === 'tab-favorites') {
            renderFavorites();
        }
    }

    // --------------------------------------------------------------------------
    // FILTERING ENGINE
    // --------------------------------------------------------------------------
    // Read elements from sidebar filters form
    filtersForm.addEventListener('change', () => {
        updateActiveFiltersState();
        applyFilters();
    });

    searchInput.addEventListener('input', () => {
        activeFilters.search = searchInput.value.trim();
        if (activeFilters.search) {
            searchClearBtn.style.display = 'block';
        } else {
            searchClearBtn.style.display = 'none';
        }
        applyFilters();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        activeFilters.search = '';
        searchClearBtn.style.display = 'none';
        applyFilters();
    });

    sortSelect.addEventListener('change', () => {
        applyFilters();
    });

    clearFiltersBtn.addEventListener('click', () => {
        resetAllFilters();
    });

    function resetAllFilters() {
        filtersForm.reset();
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        sortSelect.value = 'relevance';
        
        activeFilters.search = '';
        activeFilters.institutions = [];
        activeFilters.target = 'all';
        activeFilters.stage = 'all';
        activeFilters.sector = 'all';
        activeFilters.amountRange = 'all';
        activeFilters.statuses = ['open', 'coming_soon']; // reset to default active

        // Re-check defaults on form manually
        const statusCheckboxes = filtersForm.querySelectorAll('input[name="status"]');
        statusCheckboxes.forEach(cb => {
            cb.checked = (cb.value === 'open' || cb.value === 'coming_soon');
        });
        
        const radioTargets = filtersForm.querySelectorAll('input[name="target"]');
        radioTargets.forEach(r => r.checked = (r.value === 'all'));
        
        const radioStages = filtersForm.querySelectorAll('input[name="stage"]');
        radioStages.forEach(r => r.checked = (r.value === 'all'));

        applyFilters();
        showToast('Filtros restablecidos', '🧹');
    }

    function updateActiveFiltersState() {
        // Institutions (multi-select)
        const instCheckboxes = filtersForm.querySelectorAll('input[name="institution"]:checked');
        activeFilters.institutions = Array.from(instCheckboxes).map(cb => cb.value);

        // Target (radio)
        const targetRadio = filtersForm.querySelector('input[name="target"]:checked');
        activeFilters.target = targetRadio ? targetRadio.value : 'all';

        // Stage (radio)
        const stageRadio = filtersForm.querySelector('input[name="stage"]:checked');
        activeFilters.stage = stageRadio ? stageRadio.value : 'all';

        // Sector (select)
        activeFilters.sector = document.getElementById('filter-sector').value;

        // Amount (select)
        activeFilters.amountRange = document.getElementById('filter-amount').value;

        // Status (multi-select)
        const statusCheckboxes = filtersForm.querySelectorAll('input[name="status"]:checked');
        activeFilters.statuses = Array.from(statusCheckboxes).map(cb => cb.value);
    }

    function applyFilters() {
        filteredData = fundsData.filter(fund => {
            // 1. Text Search (Matches title, institution, description, details, requirements)
            if (activeFilters.search) {
                const searchLower = activeFilters.search.toLowerCase();
                const titleMatch = fund.name.toLowerCase().includes(searchLower);
                const instMatch = fund.institution.toLowerCase().includes(searchLower);
                const descMatch = fund.description.toLowerCase().includes(searchLower);
                const detailedMatch = fund.detailedDescription.toLowerCase().includes(searchLower);
                const requirementsMatch = fund.requirements.some(r => r.toLowerCase().includes(searchLower));
                
                if (!titleMatch && !instMatch && !descMatch && !detailedMatch && !requirementsMatch) {
                    return false;
                }
            }

            // 2. Institutions
            if (activeFilters.institutions.length > 0) {
                if (!activeFilters.institutions.includes(fund.institution)) {
                    return false;
                }
            }

            // 3. Target Profile
            if (activeFilters.target !== 'all') {
                // If fund target contains profile keywords or is general
                const fundTargetLower = fund.target.toLowerCase();
                const filterTargetLower = activeFilters.target.toLowerCase();
                
                // Allow some cross matching, e.g., if user fits "Empresa", matching CORFO "Empresa" target.
                // Or if fund says "Empresa o Persona Natural", matches both.
                if (!fundTargetLower.includes(filterTargetLower) && !fundTargetLower.includes('general') && !fundTargetLower.includes('todos')) {
                    // Check special overlap profiles
                    if (filterTargetLower === 'persona natural' && fundTargetLower.includes('persona')) {
                        // match
                    } else {
                        return false;
                    }
                }
            }

            // 4. Stage of Development
            if (activeFilters.stage !== 'all') {
                if (fund.stage !== activeFilters.stage && !fund.stage.includes('General') && !fund.stage.includes('Todo')) {
                    return false;
                }
            }

            // 5. Sector
            if (activeFilters.sector !== 'all') {
                if (fund.sector !== activeFilters.sector && fund.sector !== 'General') {
                    return false;
                }
            }

            // 6. Funding Amount Range
            if (activeFilters.amountRange !== 'all') {
                const amountCLP = fund.amount;
                if (activeFilters.amountRange === 'under5') {
                    if (amountCLP > 5000000) return false;
                } else if (activeFilters.amountRange === '5to35') {
                    if (amountCLP < 5000000 || amountCLP > 35000000) return false;
                } else if (activeFilters.amountRange === 'over35') {
                    if (amountCLP < 35000000) return false;
                }
            }

            // 7. Status
            if (activeFilters.statuses.length > 0) {
                if (!activeFilters.statuses.includes(fund.status)) {
                    return false;
                }
            } else {
                // if nothing is checked, return empty
                return false;
            }

            return true;
        });

        // Apply Sorting
        sortFilteredData();

        // Render counts and grids
        resultsCount.textContent = `${filteredData.length} ${filteredData.length === 1 ? 'fondo encontrado' : 'fondos encontrados'}`;
        renderGrid(filteredData, fundsGrid);
        renderActiveFilterBadges();
    }

    function sortFilteredData() {
        const criteria = sortSelect.value;
        if (criteria === 'amount-desc') {
            filteredData.sort((a, b) => b.amount - a.amount);
        } else if (criteria === 'amount-asc') {
            filteredData.sort((a, b) => a.amount - b.amount);
        } else if (criteria === 'deadline') {
            filteredData.sort((a, b) => {
                // Handle "Always Open" or coming soon values
                const dateA = a.deadline.startsWith('202') ? new Date(a.deadline) : new Date('2029-12-31');
                const dateB = b.deadline.startsWith('202') ? new Date(b.deadline) : new Date('2029-12-31');
                return dateA - dateB;
            });
        } else {
            // relevance sorting (default) - Open first, higher amount next
            filteredData.sort((a, b) => {
                if (a.status === 'open' && b.status !== 'open') return -1;
                if (a.status !== 'open' && b.status === 'open') return 1;
                return b.amount - a.amount;
            });
        }
    }

    function renderActiveFilterBadges() {
        activeFiltersIndicators.innerHTML = '';
        
        // Add text search indicator
        if (activeFilters.search) {
            createBadge(`Búsqueda: "${activeFilters.search}"`, () => {
                searchInput.value = '';
                activeFilters.search = '';
                searchClearBtn.style.display = 'none';
                applyFilters();
            });
        }

        // Institutions
        activeFilters.institutions.forEach(inst => {
            createBadge(inst, () => {
                const cb = filtersForm.querySelector(`input[name="institution"][value="${inst}"]`);
                if (cb) cb.checked = false;
                updateActiveFiltersState();
                applyFilters();
            });
        });

        // Target Profile
        if (activeFilters.target !== 'all') {
            createBadge(`Perfil: ${activeFilters.target}`, () => {
                const r = filtersForm.querySelector('input[name="target"][value="all"]');
                if (r) r.checked = true;
                updateActiveFiltersState();
                applyFilters();
            });
        }

        // Stage
        if (activeFilters.stage !== 'all') {
            createBadge(`Etapa: ${activeFilters.stage}`, () => {
                const r = filtersForm.querySelector('input[name="stage"][value="all"]');
                if (r) r.checked = true;
                updateActiveFiltersState();
                applyFilters();
            });
        }

        // Sector
        if (activeFilters.sector !== 'all') {
            createBadge(`Sector: ${activeFilters.sector}`, () => {
                document.getElementById('filter-sector').value = 'all';
                updateActiveFiltersState();
                applyFilters();
            });
        }

        // Amount
        if (activeFilters.amountRange !== 'all') {
            const labelMap = {
                under5: 'Menos de $5M CLP',
                '5to35': '$5M a $35M CLP',
                over35: 'Más de $35M CLP'
            };
            createBadge(`Monto: ${labelMap[activeFilters.amountRange]}`, () => {
                document.getElementById('filter-amount').value = 'all';
                updateActiveFiltersState();
                applyFilters();
            });
        }

        // Statuses (only show if not default)
        const allStatusesSelected = activeFilters.statuses.length === 3;
        const defaultsSelected = activeFilters.statuses.length === 2 && activeFilters.statuses.includes('open') && activeFilters.statuses.includes('coming_soon');
        
        if (!defaultsSelected && !allStatusesSelected) {
            activeFilters.statuses.forEach(status => {
                createBadge(`Estado: ${formatStatus(status)}`, () => {
                    const cb = filtersForm.querySelector(`input[name="status"][value="${status}"]`);
                    if (cb) cb.checked = false;
                    updateActiveFiltersState();
                    applyFilters();
                });
            });
        }
    }

    function createBadge(text, onRemove) {
        const badge = document.createElement('div');
        badge.className = 'filter-badge';
        badge.innerHTML = `<span>${text}</span> <button aria-label="Remover filtro">&times;</button>`;
        badge.querySelector('button').addEventListener('click', onRemove);
        activeFiltersIndicators.appendChild(badge);
    }

    // Mobile filters toggle drawer
    mobileFilterToggle.addEventListener('click', () => {
        sidebarFilters.classList.toggle('active');
        if (sidebarFilters.classList.contains('active')) {
            mobileFilterToggle.innerHTML = '&times; Cerrar Filtros';
            // Click outside to close drawer
            document.addEventListener('click', handleMobileSidebarOutsideClick);
        } else {
            mobileFilterToggle.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                Filtros
            `;
            document.removeEventListener('click', handleMobileSidebarOutsideClick);
        }
    });

    function handleMobileSidebarOutsideClick(e) {
        if (!sidebarFilters.contains(e.target) && e.target !== mobileFilterToggle && !mobileFilterToggle.contains(e.target)) {
            sidebarFilters.classList.remove('active');
            mobileFilterToggle.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                Filtros
            `;
            document.removeEventListener('click', handleMobileSidebarOutsideClick);
        }
    }

    // --------------------------------------------------------------------------
    // DETAIL MODAL & FINANCING CALCULATOR
    // --------------------------------------------------------------------------
    function openDetail(fund) {
        currentDetailFund = fund;
        
        // Fill details
        modalInstitution.textContent = fund.institution;
        // set institutional style classes on badge
        modalInstitution.className = 'badge institution-badge';
        modalInstitution.setAttribute('data-inst', fund.institution);
        
        modalStatus.textContent = formatStatus(fund.status);
        modalStatus.className = `badge status-badge ${fund.status}`;
        
        modalSector.textContent = fund.sector;
        modalTitle.textContent = fund.name;
        modalDescDetailed.textContent = fund.detailedDescription;
        modalProfileLbl.textContent = fund.target;
        modalStageLbl.textContent = fund.stage;
        modalTargetDetails.textContent = fund.targetDetail;
        
        // Load checklists
        modalRequirementsList.innerHTML = '';
        fund.requirements.forEach(req => {
            const li = document.createElement('li');
            li.textContent = req;
            modalRequirementsList.appendChild(li);
        });

        modalBenefitsList.innerHTML = '';
        fund.benefits.forEach(ben => {
            const li = document.createElement('li');
            li.textContent = ben;
            modalBenefitsList.appendChild(li);
        });

        modalDeadlineDate.textContent = fund.deadlineFormatted;
        modalApplyLink.setAttribute('href', fund.link);

        // --------------------------------------------------------
        // Setup Calculator
        // --------------------------------------------------------
        // Setup slider constraints dynamically
        const maxFundSubsidio = fund.amount;
        const cofinancePct = fund.maxPercent;
        
        calcPctSubsidy.textContent = cofinancePct;
        calcPctUser.textContent = 100 - cofinancePct;

        // Sensible slider boundaries based on max subsidy
        // Example: if max subsidy is 15M and covers 75%, project cost max is 20M.
        const perfectProjectCost = Math.round(maxFundSubsidio / (cofinancePct / 100));
        
        calcBudgetSlider.min = Math.round(perfectProjectCost * 0.2);
        calcBudgetSlider.max = Math.round(perfectProjectCost * 3.5);
        calcBudgetSlider.step = 500000;
        
        // Start slider value at the perfect budget size
        calcBudgetSlider.value = perfectProjectCost;
        calcBudgetInput.value = perfectProjectCost;

        updateCalculatorValues();

        // Show Modal
        detailModal.classList.add('active');
        detailModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // block scroll
    }

    function closeDetail() {
        detailModal.classList.remove('active');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // restore scroll
        currentDetailFund = null;
    }

    modalCloseBtn.addEventListener('click', closeDetail);
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetail();
    });

    // Calculator Listeners
    calcBudgetInput.addEventListener('input', () => {
        let val = parseInt(calcBudgetInput.value) || 0;
        if (val < 0) val = 0;
        calcBudgetSlider.value = val;
        updateCalculatorValues();
    });

    calcBudgetSlider.addEventListener('input', () => {
        calcBudgetInput.value = calcBudgetSlider.value;
        updateCalculatorValues();
    });

    function updateCalculatorValues() {
        if (!currentDetailFund) return;
        
        const totalBudget = parseInt(calcBudgetInput.value) || 0;
        const maxSubsidioAllowed = currentDetailFund.amount;
        const maxPercentAllowed = currentDetailFund.maxPercent;
        
        // 1. Calculate subsidy based on percentage
        let stateSubsidy = Math.round(totalBudget * (maxPercentAllowed / 100));
        
        // 2. Cap subsidy if it exceeds maximum fund amount
        let isCapped = false;
        if (stateSubsidy > maxSubsidioAllowed) {
            stateSubsidy = maxSubsidioAllowed;
            isCapped = true;
        }

        // 3. User co-financing is the difference
        let userCoFinancing = totalBudget - stateSubsidy;
        if (userCoFinancing < 0) userCoFinancing = 0;

        // 4. Calculate actual percentages for bar display
        const actualSubsidyPct = totalBudget > 0 ? (stateSubsidy / totalBudget) * 100 : maxPercentAllowed;
        const actualUserPct = 100 - actualSubsidyPct;

        // 5. Update DOM values formatted as CLP
        calcValSubsidy.textContent = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        }).format(stateSubsidy);

        calcValUser.textContent = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP', maximumFractionDigits: 0
        }).format(userCoFinancing);

        calcPctSubsidy.textContent = Math.round(actualSubsidyPct);
        calcPctUser.textContent = Math.round(actualUserPct);

        // 6. Update Visual Ratio Bar
        ratioSubsidyBar.style.width = `${actualSubsidyPct}%`;
        ratioUserBar.style.width = `${actualUserPct}%`;

        // 7. Show warning if capped
        if (isCapped && totalBudget > 0) {
            calcWarningMsg.style.display = 'block';
            calcWarningMsg.textContent = `⚠️ El presupuesto total excede el financiamiento proporcional de este fondo. El aporte estatal se ha topado al límite máximo de ${currentDetailFund.amountFormatted}.`;
        } else {
            calcWarningMsg.style.display = 'none';
        }
    }

    // --------------------------------------------------------------------------
    // MATCH QUIZ SYSTEM (Step-by-step recommendation)
    // --------------------------------------------------------------------------
    openQuizBtn.addEventListener('click', () => {
        resetQuiz();
        quizModal.classList.add('active');
        quizModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    });

    quizCloseBtn.addEventListener('click', closeQuiz);
    quizModal.addEventListener('click', (e) => {
        if (e.target === quizModal) closeQuiz();
    });

    function closeQuiz() {
        quizModal.classList.remove('active');
        quizModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function resetQuiz() {
        quizCurrentStep = 1;
        quizAnswers = { profile: '', stage: '', sector: '', amount: '' };
        
        quizSteps.forEach(s => s.classList.remove('active'));
        quizSteps[0].classList.add('active');
        
        quizOptCards.forEach(c => c.classList.remove('selected'));
        
        quizPrevBtn.style.visibility = 'hidden';
        quizNavFooter.style.display = 'flex';
        updateQuizStepProgress();
    }

    function updateQuizStepProgress() {
        quizCurrentStepLbl.textContent = quizCurrentStep;
        
        // Progress bar percentage
        const progressPct = ((quizCurrentStep - 1) / 4) * 100;
        quizProgress.style.width = `${progressPct}%`;
        
        // Update footer dots
        quizDots.forEach((dot, idx) => {
            if (idx === (quizCurrentStep - 1)) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Option Clicking inside Quiz
    quizOptCards.forEach(card => {
        card.addEventListener('click', () => {
            const stepIndex = parseInt(card.closest('.quiz-step').getAttribute('data-step'));
            const key = card.getAttribute('data-key');
            const val = card.getAttribute('data-val');

            // Select card visual
            const stepCards = quizSteps[stepIndex - 1].querySelectorAll('.quiz-opt-card');
            stepCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // Record Answer
            quizAnswers[key] = val;

            // Micro delay for premium visual feedback before auto advancing
            setTimeout(() => {
                advanceQuizStep(1);
            }, 300);
        });
    });

    quizPrevBtn.addEventListener('click', () => {
        advanceQuizStep(-1);
    });

    function advanceQuizStep(dir) {
        if (dir === 1) {
            if (quizCurrentStep < 4) {
                // Next step
                quizSteps[quizCurrentStep - 1].classList.remove('active');
                quizCurrentStep++;
                quizSteps[quizCurrentStep - 1].classList.add('active');
                quizPrevBtn.style.visibility = 'visible';
                updateQuizStepProgress();
            } else if (quizCurrentStep === 4) {
                // Final Results Step
                quizSteps[3].classList.remove('active');
                quizCurrentStep = 5;
                quizSteps[4].classList.add('active');
                quizNavFooter.style.display = 'none';
                quizProgress.style.width = '100%';
                calculateQuizRecommendations();
            }
        } else if (dir === -1) {
            if (quizCurrentStep > 1 && quizCurrentStep <= 4) {
                quizSteps[quizCurrentStep - 1].classList.remove('active');
                quizCurrentStep--;
                quizSteps[quizCurrentStep - 1].classList.add('active');
                if (quizCurrentStep === 1) {
                    quizPrevBtn.style.visibility = 'hidden';
                }
                updateQuizStepProgress();
            }
        }
    }

    // Recommendation Algorithm (Points Matcher)
    function calculateQuizRecommendations() {
        // Evaluate all funds and score them
        const scoredFunds = fundsData.map(fund => {
            let score = 0;
            
            // 1. Profile Match (40 pts)
            const targetLower = fund.target.toLowerCase();
            const selectedProfile = quizAnswers.profile.toLowerCase();
            
            if (selectedProfile === 'vulnerabilidad') {
                if (targetLower.includes('vulnera') || targetLower.includes('social')) {
                    score += 40;
                } else if (targetLower.includes('persona')) {
                    score += 20; // fallback partial
                }
            } else if (selectedProfile === 'estudiante/investigador') {
                if (targetLower.includes('estudiante') || targetLower.includes('investigador')) {
                    score += 40;
                }
            } else if (selectedProfile === 'persona natural') {
                if (targetLower.includes('persona')) {
                    score += 40;
                }
            } else if (selectedProfile === 'empresa') {
                if (targetLower.includes('empresa') || targetLower.includes('jurídica')) {
                    score += 40;
                }
            }
            
            // 2. Stage Match (30 pts)
            if (fund.stage === quizAnswers.stage) {
                score += 30;
            } else if (fund.stage.includes('General') || fund.stage.includes('Todo')) {
                score += 20; // broad availability matches
            }
            
            // 3. Sector Match (20 pts)
            if (fund.sector === quizAnswers.sector) {
                score += 20;
            } else if (fund.sector === 'General') {
                score += 15; // general matches most sectors
            }

            // 4. Amount Fit (10 pts)
            const fundAmount = fund.amount;
            const reqAmount = quizAnswers.amount;
            if (reqAmount === 'under5') {
                if (fundAmount <= 5000000) score += 10;
                else if (fundAmount <= 15000000) score += 5;
            } else if (reqAmount === '5to35') {
                if (fundAmount > 5000000 && fundAmount <= 35000000) score += 10;
                else if (fundAmount <= 50000000) score += 5;
            } else if (reqAmount === 'over35') {
                if (fundAmount > 35000000) score += 10;
            } else {
                score += 10; // "any" gets full points
            }

            // Convert points to percentage match
            const pctMatch = Math.round((score / 100) * 100);
            return {
                ...fund,
                pctMatch
            };
        });

        // Filter and get top matches (must have > 50% match score)
        const recommendations = scoredFunds
            .filter(f => f.pctMatch >= 40)
            .sort((a, b) => b.pctMatch - a.pctMatch)
            .slice(0, 3); // top 3

        quizResultsCards.innerHTML = '';
        
        if (recommendations.length === 0) {
            quizResultsCards.innerHTML = `
                <div class="empty-state" style="padding: 1.5rem;">
                    <p class="empty-title">Sin recomendaciones exactas</p>
                    <p class="empty-desc">No pudimos encontrar fondos que se ajusten estrechamente a este perfil específico.</p>
                </div>
            `;
            return;
        }

        recommendations.forEach(fund => {
            const rCard = document.createElement('div');
            rCard.className = 'quiz-match-card';
            rCard.innerHTML = `
                <div class="match-left">
                    <span class="match-title">${fund.name}</span>
                    <span class="match-meta">${fund.institution} • Subsidio: ${fund.amountFormatted}</span>
                </div>
                <div class="match-right">
                    <span class="match-score-badge">${fund.pctMatch}% Match</span>
                    <button class="primary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Ver</button>
                </div>
            `;
            // Clicking recomendation card opens detailed view
            rCard.addEventListener('click', () => {
                closeQuiz();
                openDetail(fund);
            });
            quizResultsCards.appendChild(rCard);
        });
    }

    quizRestartBtn.addEventListener('click', resetQuiz);
    
    quizFinishBtn.addEventListener('click', () => {
        // Set main filters based on quiz choices and apply
        resetAllFilters();
        
        // Apply Profile
        if (quizAnswers.profile !== 'all') {
            const r = filtersForm.querySelector(`input[name="target"][value="${quizAnswers.profile}"]`);
            if (r) r.checked = true;
        }
        
        // Apply Stage
        if (quizAnswers.stage !== 'all') {
            const r = filtersForm.querySelector(`input[name="stage"][value="${quizAnswers.stage}"]`);
            if (r) r.checked = true;
        }

        // Apply Sector
        if (quizAnswers.sector !== 'all') {
            document.getElementById('filter-sector').value = quizAnswers.sector;
        }

        // Apply Amount
        if (quizAnswers.amount !== 'any') {
            document.getElementById('filter-amount').value = quizAnswers.amount;
        }

        updateActiveFiltersState();
        applyFilters();
        
        closeQuiz();
        showToast('Catálogo filtrado con las preferencias del Asistente', '💡');
    });

    // --------------------------------------------------------------------------
    // STATS & ANALYTICS CHARTS (Vanilla SVG Generator)
    // --------------------------------------------------------------------------
    function renderAllCharts() {
        console.log("Rendering SVG charts...");
        renderInstitutionChart();
        renderStageChart();
        renderAmountComparisonChart();
    }

    // Helper to create SVG elements
    function createSVGElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    function renderInstitutionChart() {
        const container = document.getElementById('chart-institution-container');
        container.innerHTML = '';

        // Calculate data
        const counts = {};
        fundsData.forEach(f => {
            counts[f.institution] = (counts[f.institution] || 0) + 1;
        });

        const data = Object.entries(counts).map(([name, val]) => ({ name, val }));
        const total = data.reduce((sum, item) => sum + item.val, 0);

        // Chart colors map
        const colorMap = {
            'CORFO': '#2563eb',
            'SERCOTEC': '#db2777',
            'ANID': '#14b8a6',
            'Start-Up Chile': '#f97316',
            'FIA': '#84cc16',
            'FOSIS': '#eab308',
            'Fundación Chile': '#06b6d4',
            'Fundación Copec-UC': '#f43f5e',
            'Pontificia Universidad Católica': '#0284c7',
            'INDAP': '#10b981',
            'Universidad de Concepción': '#f59e0b'
        };

        const width = 320;
        const height = 240;
        const radius = 80;
        const cx = 110;
        const cy = 120;

        const svg = createSVGElement('svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        let currentAngle = -Math.PI / 2; // start at top

        data.forEach((item, index) => {
            const percentage = item.val / total;
            const sliceAngle = percentage * 2 * Math.PI;
            
            // Coordinates of slice points
            const x1 = cx + radius * Math.cos(currentAngle);
            const y1 = cy + radius * Math.sin(currentAngle);
            const x2 = cx + radius * Math.cos(currentAngle + sliceAngle);
            const y2 = cy + radius * Math.sin(currentAngle + sliceAngle);
            
            // Large arc flag
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
            
            // Path data (Pie slice)
            const pathData = `
                M ${cx} ${cy}
                L ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
            `;

            const path = createSVGElement('path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', colorMap[item.name] || '#64748b');
            path.setAttribute('stroke', '#0b0f19');
            path.setAttribute('stroke-width', '2');
            
            // Soft opacity hover effect
            path.style.cursor = 'pointer';
            path.style.transition = 'opacity 0.2s';
            path.addEventListener('mouseover', () => path.setAttribute('opacity', '0.85'));
            path.addEventListener('mouseout', () => path.setAttribute('opacity', '1'));
            
            // Title tooltip
            const title = createSVGElement('title');
            title.textContent = `${item.name}: ${item.val} fondos (${Math.round(percentage * 100)}%)`;
            path.appendChild(title);
            
            svg.appendChild(path);
            
            currentAngle += sliceAngle;
        });

        // Inner circle for Donut effect
        const innerCircle = createSVGElement('circle');
        innerCircle.setAttribute('cx', cx.toString());
        innerCircle.setAttribute('cy', cy.toString());
        innerCircle.setAttribute('r', '45');
        // adapt donut background to theme
        const isLightTheme = document.body.classList.contains('light-theme');
        innerCircle.setAttribute('fill', isLightTheme ? '#ffffff' : '#1e293b');
        svg.appendChild(innerCircle);

        // Center labels
        const textTotal = createSVGElement('text');
        textTotal.setAttribute('x', cx.toString());
        textTotal.setAttribute('y', (cy - 2).toString());
        textTotal.setAttribute('text-anchor', 'middle');
        textTotal.setAttribute('font-family', 'Outfit');
        textTotal.setAttribute('font-size', '18');
        textTotal.setAttribute('font-weight', '800');
        textTotal.setAttribute('fill', isLightTheme ? '#0f172a' : '#ffffff');
        textTotal.textContent = total.toString();
        svg.appendChild(textTotal);

        const textSub = createSVGElement('text');
        textSub.setAttribute('x', cx.toString());
        textSub.setAttribute('y', (cy + 12).toString());
        textSub.setAttribute('text-anchor', 'middle');
        textSub.setAttribute('font-size', '8');
        textSub.setAttribute('font-weight', '700');
        textSub.setAttribute('fill', '#94a3b8');
        textSub.textContent = 'FONDOS';
        svg.appendChild(textSub);

        // Render Legend (Right Side)
        const legendX = cx + radius + 15;
        const spacing = data.length > 7 ? 16 : 24;
        data.forEach((item, index) => {
            const legendY = 30 + index * spacing;
            
            // Color marker
            const marker = createSVGElement('rect');
            marker.setAttribute('x', legendX.toString());
            marker.setAttribute('y', (legendY - 8).toString());
            marker.setAttribute('width', '10');
            marker.setAttribute('height', '10');
            marker.setAttribute('rx', '3');
            marker.setAttribute('fill', colorMap[item.name] || '#64748b');
            svg.appendChild(marker);
            
            // Name label
            const label = createSVGElement('text');
            label.setAttribute('x', (legendX + 15).toString());
            label.setAttribute('y', (legendY + 1).toString());
            label.setAttribute('font-size', data.length > 7 ? '8' : '10');
            label.setAttribute('font-weight', '600');
            label.setAttribute('fill', isLightTheme ? '#475569' : '#e2e8f0');
            const displayName = item.name.length > 18 ? item.name.substring(0, 16) + '...' : item.name;
            label.textContent = `${displayName} (${item.val})`;
            svg.appendChild(label);
        });

        container.appendChild(svg);
    }

    function renderStageChart() {
        const container = document.getElementById('chart-stage-container');
        container.innerHTML = '';

        // Calculate data
        const counts = {};
        fundsData.forEach(f => {
            counts[f.stage] = (counts[f.stage] || 0) + 1;
        });

        const data = [
            { stage: 'Idea/Concepto', label: 'Idea/Concepto', val: counts['Idea/Concepto'] || 0 },
            { stage: 'Prototipo/MVP', label: 'Prototipo/MVP', val: counts['Prototipo/MVP'] || 0 },
            { stage: 'Validación Comercial', label: 'Validación', val: counts['Validación Comercial'] || 0 },
            { stage: 'Escalamiento/Ventas', label: 'Escalamiento', val: counts['Escalamiento/Ventas'] || 0 }
        ];

        const maxVal = Math.max(...data.map(d => d.val));
        const height = 240;
        const width = 340;
        const paddingLeft = 30;
        const paddingRight = 10;
        const paddingTop = 30;
        const paddingBottom = 40;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        const isLightTheme = document.body.classList.contains('light-theme');

        const svg = createSVGElement('svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        // Y-axis guidelines
        const gridLines = 3;
        for (let i = 0; i <= gridLines; i++) {
            const y = paddingTop + (chartHeight / gridLines) * i;
            const gridVal = Math.round(maxVal - (maxVal / gridLines) * i);
            
            // Line
            const line = createSVGElement('line');
            line.setAttribute('x1', paddingLeft.toString());
            line.setAttribute('y1', y.toString());
            line.setAttribute('x2', (width - paddingRight).toString());
            line.setAttribute('y2', y.toString());
            line.setAttribute('stroke', isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
            
            // Label
            const label = createSVGElement('text');
            label.setAttribute('x', (paddingLeft - 8).toString());
            label.setAttribute('y', (y + 4).toString());
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('font-size', '9');
            label.setAttribute('font-weight', '600');
            label.setAttribute('fill', '#64748b');
            label.textContent = gridVal.toString();
            svg.appendChild(label);
        }

        // Render Bars
        const barWidth = 40;
        const barGap = (chartWidth - barWidth * data.length) / (data.length - 1 + 2);
        
        data.forEach((item, index) => {
            const barHeight = maxVal > 0 ? (item.val / maxVal) * chartHeight : 0;
            const x = paddingLeft + barGap + index * (barWidth + barGap);
            const y = paddingTop + chartHeight - barHeight;
            
            // Bar
            const bar = createSVGElement('rect');
            bar.setAttribute('x', x.toString());
            bar.setAttribute('y', y.toString());
            bar.setAttribute('width', barWidth.toString());
            bar.setAttribute('height', barHeight.toString());
            bar.setAttribute('rx', '5');
            bar.setAttribute('fill', 'url(#bar-indigo-gradient)');
            
            // Hover animation
            bar.style.cursor = 'pointer';
            bar.style.transition = 'opacity 0.2s';
            bar.addEventListener('mouseover', () => bar.setAttribute('opacity', '0.85'));
            bar.addEventListener('mouseout', () => bar.setAttribute('opacity', '1'));
            
            svg.appendChild(bar);

            // Value label above bar
            if (item.val > 0) {
                const valLabel = createSVGElement('text');
                valLabel.setAttribute('x', (x + barWidth / 2).toString());
                valLabel.setAttribute('y', (y - 6).toString());
                valLabel.setAttribute('text-anchor', 'middle');
                valLabel.setAttribute('font-size', '10');
                valLabel.setAttribute('font-weight', '700');
                valLabel.setAttribute('fill', isLightTheme ? '#0f172a' : '#ffffff');
                valLabel.textContent = item.val.toString();
                svg.appendChild(valLabel);
            }

            // X-axis label
            const label = createSVGElement('text');
            label.setAttribute('x', (x + barWidth / 2).toString());
            label.setAttribute('y', (paddingTop + chartHeight + 18).toString());
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '8');
            label.setAttribute('font-weight', '700');
            label.setAttribute('fill', isLightTheme ? '#475569' : '#94a3b8');
            label.textContent = item.label;
            svg.appendChild(label);
        });

        // Define linear gradient in SVG
        const defs = createSVGElement('defs');
        const gradient = createSVGElement('linearGradient');
        gradient.setAttribute('id', 'bar-indigo-gradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '0%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = createSVGElement('stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#6366f1');
        
        const stop2 = createSVGElement('stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#4f46e5');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        container.appendChild(svg);
    }

    function renderAmountComparisonChart() {
        const container = document.getElementById('chart-amount-container');
        container.innerHTML = '';

        // Extract top 6 funds by funding limit amount (filtering out any anomalous science ones)
        // Sort by amount desc
        const sortedFunds = [...fundsData]
            .filter(f => f.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        const height = 260;
        const width = 760;
        const paddingLeft = 210; // lots of space for long names
        const paddingRight = 80;  // space for values
        const paddingTop = 20;
        const paddingBottom = 20;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        const isLightTheme = document.body.classList.contains('light-theme');

        const maxAmount = Math.max(...sortedFunds.map(f => f.amount));

        const svg = createSVGElement('svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        const barHeight = 22;
        const barGap = (chartHeight - barHeight * sortedFunds.length) / (sortedFunds.length + 1);

        sortedFunds.forEach((fund, index) => {
            const barWidth = maxAmount > 0 ? (fund.amount / maxAmount) * chartWidth : 0;
            const y = paddingTop + barGap + index * (barHeight + barGap);
            
            // Fund Title
            const textName = createSVGElement('text');
            textName.setAttribute('x', (paddingLeft - 10).toString());
            textName.setAttribute('y', (y + barHeight / 2 + 4).toString());
            textName.setAttribute('text-anchor', 'end');
            textName.setAttribute('font-size', '9.5');
            textName.setAttribute('font-weight', '700');
            textName.setAttribute('fill', isLightTheme ? '#0f172a' : '#e2e8f0');
            // Truncate name if it's too long
            const displayName = fund.name.length > 36 ? fund.name.substring(0, 33) + '...' : fund.name;
            textName.textContent = displayName;
            
            // Add hover description as title tooltip
            const tooltip = createSVGElement('title');
            tooltip.textContent = fund.name;
            textName.appendChild(tooltip);
            
            svg.appendChild(textName);

            // Horizontal Bar
            const bar = createSVGElement('rect');
            bar.setAttribute('x', paddingLeft.toString());
            bar.setAttribute('y', y.toString());
            bar.setAttribute('width', barWidth.toString());
            bar.setAttribute('height', barHeight.toString());
            bar.setAttribute('rx', '4');
            
            // Select color based on institution
            let barColor = '#6366f1';
            if (fund.institution === 'CORFO') barColor = '#2563eb';
            else if (fund.institution === 'SERCOTEC') barColor = '#db2777';
            else if (fund.institution === 'ANID') barColor = '#14b8a6';
            else if (fund.institution === 'Start-Up Chile') barColor = '#f97316';
            else if (fund.institution === 'FIA') barColor = '#84cc16';
            else if (fund.institution === 'FOSIS') barColor = '#eab308';
            else if (fund.institution === 'Fundación Chile') barColor = '#06b6d4';
            else if (fund.institution === 'Fundación Copec-UC') barColor = '#f43f5e';
            else if (fund.institution === 'Pontificia Universidad Católica') barColor = '#0284c7';
            else if (fund.institution === 'INDAP') barColor = '#10b981';
            else if (fund.institution === 'Universidad de Concepción') barColor = '#f59e0b';
            
            bar.setAttribute('fill', barColor);
            
            bar.style.cursor = 'pointer';
            bar.style.transition = 'opacity 0.2s';
            bar.addEventListener('mouseover', () => bar.setAttribute('opacity', '0.8'));
            bar.addEventListener('mouseout', () => bar.setAttribute('opacity', '1'));
            
            // Clicking bar opens detail modal for that fund! (Awesome UX link)
            bar.addEventListener('click', () => openDetail(fund));
            
            svg.appendChild(bar);

            // Value text
            const textVal = createSVGElement('text');
            textVal.setAttribute('x', (paddingLeft + barWidth + 8).toString());
            textVal.setAttribute('y', (y + barHeight / 2 + 4).toString());
            textVal.setAttribute('font-size', '9.5');
            textVal.setAttribute('font-weight', '800');
            textVal.setAttribute('fill', isLightTheme ? '#0f172a' : '#ffffff');
            textVal.textContent = fund.amountFormatted.replace(' CLP', '');
            svg.appendChild(textVal);
        });

        // Vertical axis line
        const axisLine = createSVGElement('line');
        axisLine.setAttribute('x1', paddingLeft.toString());
        axisLine.setAttribute('y1', paddingTop.toString());
        axisLine.setAttribute('x2', paddingLeft.toString());
        axisLine.setAttribute('y2', (height - paddingBottom).toString());
        axisLine.setAttribute('stroke', isLightTheme ? '#cbd5e1' : '#334155');
        axisLine.setAttribute('stroke-width', '2');
        svg.appendChild(axisLine);

        container.appendChild(svg);
    }

    // ==========================================================================
    // AI PROJECT APPLICATION WRITER (Redactor IA) LOGIC
    // ==========================================================================
    let activeBasesText = "";
    let activeBasesFileName = "";

    // DOM Elements
    const geminiKeyInput = document.getElementById('gemini-key');
    const geminiModelSelect = document.getElementById('gemini-model');
    const toggleKeyBtn = document.getElementById('toggle-key-btn');
    const selectorTabs = document.querySelectorAll('.selector-tab');
    const basesPanes = document.querySelectorAll('.bases-input-pane');
    const basesUrlInput = document.getElementById('bases-url');
    const extractUrlBtn = document.getElementById('extract-url-btn');
    const pdfDropZone = document.getElementById('pdf-drop-zone');
    const pdfBrowseTrigger = document.getElementById('pdf-browse-trigger');
    const pdfFileInput = document.getElementById('pdf-file-input');
    const pdfFileName = document.getElementById('pdf-file-name');
    const parsePdfBtn = document.getElementById('parse-pdf-btn');
    const basesTextRaw = document.getElementById('bases-text-raw');
    const basesStatusBox = document.getElementById('bases-status-box');
    const viewBasesTextBtn = document.getElementById('view-bases-text-btn');
    
    const projTitleInput = document.getElementById('proj-title');
    const projBudgetInput = document.getElementById('proj-budget');
    const projDescInput = document.getElementById('proj-desc');
    const projApplicantSelect = document.getElementById('proj-applicant');
    const projStageSelect = document.getElementById('proj-stage');
    const generateDraftBtn = document.getElementById('generate-draft-btn');
    const draftLoadingCard = document.getElementById('draft-loading-card');
    const loadingTip = document.getElementById('loading-tip');
    const draftResults = document.getElementById('draft-results');
    const alignmentScoreBadge = document.getElementById('alignment-score-badge');
    const compatibilityList = document.getElementById('compatibility-list');
    const optimizationList = document.getElementById('optimization-list');
    const draftSectionsAcordeon = document.getElementById('draft-sections-acordeon');

    // Load saved API Key
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        geminiKeyInput.value = savedKey;
    }

    geminiKeyInput.addEventListener('input', () => {
        localStorage.setItem('gemini_api_key', geminiKeyInput.value.trim());
    });

    // Load saved Model
    const savedModel = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
    geminiModelSelect.value = savedModel;
    geminiModelSelect.addEventListener('change', () => {
        localStorage.setItem('gemini_model', geminiModelSelect.value);
    });

    toggleKeyBtn.addEventListener('click', () => {
        if (geminiKeyInput.type === 'password') {
            geminiKeyInput.type = 'text';
            toggleKeyBtn.textContent = '🙈';
        } else {
            geminiKeyInput.type = 'password';
            toggleKeyBtn.textContent = '👁️';
        }
    });

    // Bases selector tabs switcher
    selectorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            selectorTabs.forEach(t => t.classList.remove('active'));
            basesPanes.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const type = tab.getAttribute('data-type');
            document.getElementById(`pane-${type}`).classList.add('active');
        });
    });

    // Extract guidelines from URL
    extractUrlBtn.addEventListener('click', async () => {
        const url = basesUrlInput.value.trim();
        if (!url) {
            showToast('Por favor ingresa una URL válida.', '❌');
            return;
        }
        
        extractUrlBtn.disabled = true;
        extractUrlBtn.textContent = 'Extrayendo...';
        updateBasesStatus('loading', 'Descargando bases desde la web...');
        
        try {
            const res = await fetch('/api/extract-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            
            activeBasesText = result.text;
            activeBasesFileName = `URL: ${url}`;
            updateBasesStatus('success', `Bases extraídas: ${activeBasesText.length} caracteres`);
            showToast('Texto de bases extraído correctamente', '✓');
        } catch (e) {
            console.error(e);
            updateBasesStatus('error', 'Error al extraer bases de la URL');
            showToast(`Error: ${e.message}`, '❌');
        } finally {
            extractUrlBtn.disabled = false;
            extractUrlBtn.textContent = 'Extraer';
        }
    });

    // PDF upload and extraction handlers
    pdfBrowseTrigger.addEventListener('click', () => pdfFileInput.click());
    pdfDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfDropZone.classList.add('dragover');
    });
    pdfDropZone.addEventListener('dragleave', () => {
        pdfDropZone.classList.remove('dragover');
    });
    pdfDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handlePdfFile(e.dataTransfer.files[0]);
        }
    });
    pdfFileInput.addEventListener('change', () => {
        if (pdfFileInput.files.length > 0) {
            handlePdfFile(pdfFileInput.files[0]);
        }
    });

    function handlePdfFile(file) {
        if (file.type !== 'application/pdf') {
            showToast('El archivo debe ser un PDF.', '❌');
            return;
        }
        pdfFileName.textContent = `${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
        parsePdfBtn.style.display = 'block';
    }

    parsePdfBtn.addEventListener('click', async () => {
        const file = pdfFileInput.files[0];
        if (!file) return;
        
        parsePdfBtn.disabled = true;
        parsePdfBtn.textContent = 'Procesando archivo...';
        updateBasesStatus('loading', 'Leyendo y decodificando PDF...');
        
        const reader = new FileReader();
        reader.onload = async function() {
            const base64 = reader.result;
            try {
                const res = await fetch('/api/parse-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pdf_base64: base64 })
                });
                const result = await res.json();
                if (result.error) throw new Error(result.error);
                
                activeBasesText = result.text;
                activeBasesFileName = file.name;
                updateBasesStatus('success', `PDF procesado: ${activeBasesText.length} caracteres`);
                showToast('PDF procesado con éxito', '✓');
                parsePdfBtn.style.display = 'none';
            } catch(e) {
                console.error(e);
                updateBasesStatus('error', 'Error al procesar PDF');
                showToast(`Error: ${e.message}`, '❌');
            } finally {
                parsePdfBtn.disabled = false;
                parsePdfBtn.textContent = 'Procesar Documento PDF';
            }
        };
        reader.readAsDataURL(file);
    });

    // Paste raw text handler
    basesTextRaw.addEventListener('input', () => {
        const text = basesTextRaw.value.trim();
        if (text.length > 10) {
            activeBasesText = text;
            activeBasesFileName = 'Texto pegado';
            updateBasesStatus('success', `Bases cargadas manualmente: ${activeBasesText.length} caracteres`);
        } else {
            activeBasesText = "";
            updateBasesStatus('none', 'Sin bases cargadas (requerido)');
        }
    });

    // Status visual toggler
    function updateBasesStatus(type, message) {
        const indicator = basesStatusBox.querySelector('.status-indicator');
        const msg = basesStatusBox.querySelector('.status-msg');
        
        indicator.className = 'status-indicator';
        viewBasesTextBtn.style.display = 'none';
        
        if (type === 'success') {
            indicator.classList.add('success');
            msg.textContent = message;
            viewBasesTextBtn.style.display = 'inline-block';
        } else if (type === 'error') {
            indicator.classList.add('error');
            msg.textContent = message;
        } else if (type === 'loading') {
            indicator.style.backgroundColor = 'var(--accent-cyan)';
            msg.textContent = message;
        } else {
            msg.textContent = 'Sin bases cargadas (requerido)';
        }
    }

    // View full bases text modal overlay
    viewBasesTextBtn.addEventListener('click', () => {
        if (!activeBasesText) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '500';
        
        const box = document.createElement('div');
        box.className = 'modal-box glassmorphism scale-anim';
        box.style.maxWidth = '700px';
        box.style.padding = '2rem';
        
        const title = document.createElement('h3');
        title.className = 'modal-title';
        title.textContent = `Bases Extraídas: ${activeBasesFileName}`;
        
        const content = document.createElement('pre');
        content.style.whiteSpace = 'pre-wrap';
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';
        content.style.fontSize = '0.8rem';
        content.style.marginTop = '1rem';
        content.style.padding = '1rem';
        content.style.backgroundColor = 'rgba(0,0,0,0.2)';
        content.style.borderRadius = '6px';
        content.style.border = '1px solid var(--border-color)';
        content.style.color = 'var(--text-secondary)';
        content.textContent = activeBasesText;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'primary-btn';
        closeBtn.style.marginTop = '1.5rem';
        closeBtn.style.alignSelf = 'flex-end';
        closeBtn.textContent = 'Cerrar Vista';
        closeBtn.onclick = () => overlay.remove();
        
        box.appendChild(title);
        box.appendChild(content);
        box.appendChild(closeBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });

    // Generate project draft proposal via Gemini API
    generateDraftBtn.addEventListener('click', async () => {
        const apiKey = geminiKeyInput.value.trim();
        if (!apiKey) {
            showToast('Se requiere la Gemini API Key para generar.', '❌');
            geminiKeyInput.focus();
            return;
        }
        if (!activeBasesText) {
            showToast('Por favor carga primero las bases de la convocatoria.', '❌');
            return;
        }
        const title = projTitleInput.value.trim();
        const budget = projBudgetInput.value.trim();
        const desc = projDescInput.value.trim();
        
        if (!title || !desc) {
            showToast('Por favor ingresa el título y descripción de tu idea de proyecto.', '❌');
            return;
        }
        
        // Hide results and show loading
        draftResults.style.display = 'none';
        draftLoadingCard.style.display = 'flex';
        
        // Tips rotator
        const tips = [
            "Tip: Leyendo objetivos y foco del fondo...",
            "Tip: Analizando criterios de evaluación e innovación...",
            "Tip: Calculando coherencia presupuestaria con el subsidio...",
            "Tip: Estructurando el Resumen Ejecutivo del proyecto...",
            "Tip: Redactando justificación técnica del problema...",
            "Tip: Refinando el componente de diferenciación y novedad comercial...",
            "Tip: Diseñando hitos y metas clave del plan de trabajo..."
        ];
        let tipIdx = 0;
        loadingTip.textContent = tips[0];
        const tipInterval = setInterval(() => {
            tipIdx = (tipIdx + 1) % tips.length;
            loadingTip.textContent = tips[tipIdx];
        }, 3500);
        
        // Construct Gemini prompt
        const applicantTypeMap = {
            "persona_natural": "Persona Natural (Emprendedor/a)",
            "persona_juridica_micro": "Persona Jurídica (Empresa < 1 año ventas)",
            "persona_juridica_pyme": "Persona Jurídica (Pyme consolidada)",
            "universidad": "Universidad o Centro de Investigación"
        };
        
        const stageMap = {
            "idea": "Idea inicial, sin prototipo físico aún",
            "prototipo": "Prototipo funcional (MVP) desarrollado",
            "ventas": "Validación comercial y primeras ventas registradas"
        };
        
        const systemPrompt = `Actúa como un experto consultor de innovación y redactor de proyectos para fondos públicos de fomento chilenos (como CORFO, SERCOTEC y ANID).
Tu labor es leer las bases del concurso y la propuesta de proyecto entregada por el usuario para:
1. Evaluar la compatibilidad del proyecto con las reglas del fondo (montos, cofinanciamiento, elegibilidad legal del postulante).
2. Dar sugerencias concretas de optimización técnica para maximizar la nota de evaluación.
3. Escribir un borrador del formulario de postulación adaptado a estas bases.

Bases de Convocatoria:
\"\"\"
${activeBasesText}
\"\"\"

Datos del Postulante y Proyecto:
- Título del proyecto: "${title}"
- Presupuesto estimado: $${budget ? parseInt(budget).toLocaleString('es-CL') : 'No especificado'} CLP
- Perfil del Postulante: ${applicantTypeMap[projApplicantSelect.value]}
- Madurez del proyecto: ${stageMap[projStageSelect.value]}
- Descripción de la propuesta: "${desc}"

Debes responder ÚNICAMENTE en formato JSON con la siguiente estructura y en el idioma español chileno formal. No agregues introducciones, explicaciones, ni bloques de código adicionales fuera del JSON.

Estructura JSON requerida:
{
  "compatibilityScore": 85,
  "compatibilityChecks": [
    {
      "status": "pass", // "pass", "warn", or "fail"
      "text": "Ejemplo explicativo"
    }
  ],
  "optimizationTips": [
    "Sugerencia 1"
  ],
  "draftSections": [
    {
      "title": "1. Resumen Ejecutivo del Proyecto",
      "content": "Borrador de texto..."
    }
  ]
}`;

        try {
            const modelName = geminiModelSelect.value;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Error API de Gemini (${res.status}): ${errText}`);
            }
            
            const resultJson = await res.json();
            const candidateText = resultJson.candidates[0].content.parts[0].text;
            const parsed = JSON.parse(candidateText);
            
            // Render results
            renderDraftResults(parsed);
            
        } catch (e) {
            console.error(e);
            showToast(`Error de Generación: ${e.message}`, '❌');
            draftLoadingCard.style.display = 'none';
        } finally {
            clearInterval(tipInterval);
        }
    });

    function renderDraftResults(data) {
        draftLoadingCard.style.display = 'none';
        draftResults.style.display = 'block';
        
        // Match badge
        alignmentScoreBadge.textContent = `${data.compatibilityScore}% Match`;
        // Colors
        if (data.compatibilityScore >= 75) {
            alignmentScoreBadge.style.color = 'var(--color-open)';
            alignmentScoreBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
            alignmentScoreBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        } else if (data.compatibilityScore >= 50) {
            alignmentScoreBadge.style.color = 'var(--color-coming)';
            alignmentScoreBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
            alignmentScoreBadge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        } else {
            alignmentScoreBadge.style.color = 'var(--color-closed)';
            alignmentScoreBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            alignmentScoreBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        }
        
        // Compatibility list
        compatibilityList.innerHTML = '';
        data.compatibilityChecks.forEach(check => {
            const li = document.createElement('li');
            li.className = check.status; // 'pass', 'warn', 'fail'
            li.textContent = check.text;
            compatibilityList.appendChild(li);
        });
        
        // Optimization tips
        optimizationList.innerHTML = '';
        data.optimizationTips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            optimizationList.appendChild(li);
        });
        
        // Accordion sections
        draftSectionsAcordeon.innerHTML = '';
        data.draftSections.forEach((section, idx) => {
            const item = document.createElement('div');
            item.className = `accordion-item ${idx === 0 ? 'active' : ''}`;
            
            const header = document.createElement('div');
            header.className = 'accordion-header';
            
            const titleRow = document.createElement('div');
            titleRow.className = 'accordion-title-row';
            titleRow.innerHTML = `🖋️ <span>${section.title}</span>`;
            
            const actions = document.createElement('div');
            actions.className = 'accordion-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copiar
            `;
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid toggling accordion
                navigator.clipboard.writeText(section.content);
                copyBtn.textContent = '¡Copiado!';
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copiar
                    `;
                }, 2000);
                showToast('Sección copiada al portapapeles', '📋');
            });
            
            const arrow = document.createElement('span');
            arrow.className = 'accordion-arrow';
            arrow.textContent = '▼';
            
            actions.appendChild(copyBtn);
            actions.appendChild(arrow);
            
            header.appendChild(titleRow);
            header.appendChild(actions);
            
            const content = document.createElement('div');
            content.className = 'accordion-content';
            content.textContent = section.content;
            
            header.addEventListener('click', () => {
                item.classList.toggle('active');
            });
            
            item.appendChild(header);
            item.appendChild(content);
            
            draftSectionsAcordeon.appendChild(item);
        });
    }

    // --------------------------------------------------------------------------
    // MAIN APP INITIATOR
    // --------------------------------------------------------------------------
    loadData();
});
