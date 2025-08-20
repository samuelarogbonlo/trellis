// Main JavaScript for Gas Abstraction Truth Site
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    populateProviderGrid();
    populateCompatibilityMatrix();
    populateChainRankings();
    populateOverheadChart();
    updateLastUpdated();
    initializeAnimations();
});

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Smooth scroll to section
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Update active nav on scroll
    window.addEventListener('scroll', updateActiveNav);
}

function updateActiveNav() {
    const sections = ['home', 'providers', 'costs', 'failures', 'tools'];
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                current = sectionId;
            }
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

function populateProviderGrid() {
    const grid = document.getElementById('provider-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(PROVIDER_DATA).forEach(([key, provider]) => {
        const card = createProviderCard(key, provider);
        grid.appendChild(card);
    });
}

function createProviderCard(key, provider) {
    const avgSuccessRate = calculateAverageSuccessRate(provider.chains);
    const avgCost = calculateAverageCost(provider.chains);
    const avgHiddenFees = calculateAverageHiddenFees(provider.chains);
    const avgTime = calculateAverageTime(provider.chains);
    
    const card = document.createElement('div');
    card.className = 'provider-card';
    
    card.innerHTML = `
        <div class="provider-header">
            <h3 class="provider-name">${provider.name}</h3>
            <span class="provider-rating rating-${provider.rating}">
                ${provider.rating.toUpperCase()}
            </span>
        </div>
        
        <p class="provider-description">${provider.description}</p>
        
        <div class="provider-metrics">
            <div class="metric">
                <span class="metric-value">${avgSuccessRate.toFixed(1)}%</span>
                <span class="metric-label">Success Rate</span>
            </div>
            <div class="metric">
                <span class="metric-value">${formatCost(avgCost)}</span>
                <span class="metric-label">Avg Cost</span>
            </div>
            <div class="metric">
                <span class="metric-value">${formatPercentage(avgHiddenFees)}</span>
                <span class="metric-label">Hidden Fees</span>
            </div>
            <div class="metric">
                <span class="metric-value">${formatTime(avgTime)}</span>
                <span class="metric-label">Avg Time</span>
            </div>
        </div>
        
        <div class="provider-details">
            <div class="strengths">
                <h4>✅ Strengths</h4>
                <ul>
                    ${provider.strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            </div>
            
            <div class="weaknesses">
                <h4>⚠️ Weaknesses</h4>
                <ul>
                    ${provider.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                </ul>
            </div>
            
            <div class="common-errors">
                <h4>🚨 Common Errors</h4>
                <div class="error-tags">
                    ${provider.commonErrors.map(error => `<span class="error-tag">${error}</span>`).join('')}
                </div>
            </div>
        </div>
        
        <div class="provider-actions">
            <a href="${provider.website}" target="_blank" class="btn btn-secondary btn-small">Visit Website</a>
            <button onclick="showProviderDetails('${key}')" class="btn btn-primary btn-small">View Details</button>
        </div>
    `;
    
    return card;
}

function populateCompatibilityMatrix() {
    const matrix = document.getElementById('compatibility-matrix');
    if (!matrix) return;
    
    const chains = Object.keys(CHAIN_DATA);
    const providers = Object.keys(PROVIDER_DATA);
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Provider</th>
                    ${chains.map(chain => `<th>${CHAIN_DATA[chain].name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    providers.forEach(providerKey => {
        const provider = PROVIDER_DATA[providerKey];
        tableHTML += `<tr><td><strong>${provider.name}</strong></td>`;
        
        chains.forEach(chainKey => {
            const chainData = provider.chains[chainKey];
            let statusClass = '';
            let statusText = '';
            
            if (chainData.status === 'supported') {
                statusClass = 'support-yes';
                statusText = `✅ ${chainData.successRate}%`;
            } else if (chainData.status === 'partial') {
                statusClass = 'support-partial';
                statusText = `⚠️ ${chainData.successRate}%`;
            } else {
                statusClass = 'support-no';
                statusText = '❌ No';
            }
            
            tableHTML += `<td class="${statusClass}">${statusText}</td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    matrix.innerHTML = tableHTML;
}

function populateChainRankings() {
    const container = document.getElementById('chain-rankings');
    if (!container) return;
    
    let html = '';
    
    Object.entries(COST_OVERHEAD_DATA).forEach(([chainKey, data]) => {
        const chainName = CHAIN_DATA[chainKey].name;
        html += `
            <div class="chain-ranking">
                <h4>${chainName}</h4>
                <div class="ranking-data">
                    <span class="overhead">${data.averageOverhead.toFixed(1)}% overhead</span>
                    <span class="cheapest">Cheapest: ${data.cheapestProvider}</span>
                    <span class="expensive">Most Expensive: ${data.mostExpensiveProvider}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function populateOverheadChart() {
    const container = document.getElementById('overhead-chart');
    if (!container) return;
    
    const chains = Object.keys(COST_OVERHEAD_DATA);
    const maxOverhead = Math.max(...chains.map(chain => Math.abs(COST_OVERHEAD_DATA[chain].averageOverhead)));
    
    let html = '<div class="overhead-bars">';
    
    chains.forEach(chainKey => {
        const data = COST_OVERHEAD_DATA[chainKey];
        const chainName = CHAIN_DATA[chainKey].name;
        const overhead = data.averageOverhead;
        const barWidth = Math.abs(overhead) / maxOverhead * 100;
        const isNegative = overhead < 0;
        
        html += `
            <div class="overhead-bar">
                <span class="chain-name">${chainName}</span>
                <div class="bar-container">
                    <div class="bar ${isNegative ? 'negative' : 'positive'}" style="width: ${barWidth}%"></div>
                </div>
                <span class="overhead-value">${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function updateLastUpdated() {
    const element = document.getElementById('last-updated');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0s';
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    const animatedElements = document.querySelectorAll('.provider-card, .insight-card, .tool-card, .failure-mode');
    animatedElements.forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
}

function showProviderDetails(providerKey) {
    const provider = PROVIDER_DATA[providerKey];
    
    // Create modal or detailed view
    const modal = document.createElement('div');
    modal.className = 'provider-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${provider.name} - Detailed Analysis</h2>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="chain-details">
                    ${Object.entries(provider.chains).map(([chainKey, data]) => `
                        <div class="chain-detail">
                            <h4>${CHAIN_DATA[chainKey].name}</h4>
                            <div class="detail-metrics">
                                <span>Success Rate: ${data.successRate}%</span>
                                <span>Cost: ${formatCost(data.avgCost)}</span>
                                <span>Hidden Fees: ${formatPercentage(data.hiddenFees)}</span>
                                <span>Avg Time: ${formatTime(data.avgTime)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function closeModal() {
    const modal = document.querySelector('.provider-modal');
    if (modal) {
        modal.remove();
    }
}

// Helper functions
function calculateAverageSuccessRate(chains) {
    const rates = Object.values(chains).map(chain => chain.successRate);
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

function calculateAverageCost(chains) {
    const costs = Object.values(chains).map(chain => chain.avgCost);
    return costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
}

function calculateAverageHiddenFees(chains) {
    const fees = Object.values(chains).map(chain => chain.hiddenFees);
    return fees.reduce((sum, fee) => sum + fee, 0) / fees.length;
}

function calculateAverageTime(chains) {
    const times = Object.values(chains).map(chain => chain.avgTime);
    return times.reduce((sum, time) => sum + time, 0) / times.length;
}