// App State
let releaseNotes = [];
let activeFilter = 'all';
let searchKeyword = '';

// DOM Elements
const notesFeed = document.getElementById('notes-feed');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterChipsContainer = document.getElementById('filter-chips-container');
const loadingSkeleton = document.getElementById('loading-skeleton');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const errorRetryBtn = document.getElementById('error-retry-btn');
const totalCountEl = document.getElementById('total-count');
const visibleCountEl = document.getElementById('visible-count');

// Tweet Modal Elements
const tweetDialog = document.getElementById('tweet-dialog');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const characterWarning = document.getElementById('character-warning');
const tweetSubmitBtn = document.getElementById('tweet-submit-btn');
const tweetCancelBtn = document.getElementById('tweet-cancel-btn');
const closeModalX = document.getElementById('close-modal-x');

// Initialize application on load
document.addEventListener('DOMContentLoaded', () => {
  fetchReleaseNotes();
  setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
  // Refresh button
  refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
  
  // Export CSV button
  exportCsvBtn.addEventListener('click', exportToCsv);
  
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.toLowerCase().trim();
    clearSearchBtn.style.display = searchKeyword ? 'block' : 'none';
    renderNotes();
  });
  
  // Clear search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchKeyword = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderNotes();
  });

  // Filter chips click handling (ARIA accessible role="radio")
  filterChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    // Toggle active state
    filterChipsContainer.querySelectorAll('.chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-checked', 'true');

    activeFilter = chip.dataset.filter;
    renderNotes();
  });

  // Reset filters button
  resetFiltersBtn.addEventListener('click', resetFilters);
  
  // Error retry button
  errorRetryBtn.addEventListener('click', () => fetchReleaseNotes(true));

  // --- Modal Logic ---
  // Form submission for Tweet modal
  tweetDialog.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const tweetText = tweetTextarea.value;
    if (tweetText.length > 280) {
      alert("Your tweet exceeds the 280-character limit!");
      return;
    }
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    tweetDialog.close();
  });

  // Character counter for textarea
  tweetTextarea.addEventListener('input', updateCharCount);

  // Close modal via Cancel button
  tweetCancelBtn.addEventListener('click', () => tweetDialog.close());

  // Close modal via X button
  closeModalX.addEventListener('click', () => tweetDialog.close());

  // Fallback for light-dismiss (clicking on backdrop to close dialog)
  // Required for Safari / older browsers that don't support closedby="any"
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    tweetDialog.addEventListener('click', (event) => {
      if (event.target !== tweetDialog) return;
      const rect = tweetDialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        tweetDialog.close();
      }
    });
  }
}

// Reset filters and search inputs
function resetFilters() {
  searchInput.value = '';
  searchKeyword = '';
  clearSearchBtn.style.display = 'none';
  
  filterChipsContainer.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-checked', 'false');
  });
  
  const allChip = filterChipsContainer.querySelector('[data-filter="all"]');
  allChip.classList.add('active');
  allChip.setAttribute('aria-checked', 'true');
  
  activeFilter = 'all';
  renderNotes();
}

// Fetch notes API
async function fetchReleaseNotes(forceRefresh = false) {
  setLoadingState(true);
  errorContainer.style.display = 'none';
  
  try {
    const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.status !== 'error') {
      releaseNotes = data.notes;
      lastUpdatedText.textContent = `Feed updated: ${data.last_updated}`;
      renderNotes();
    } else {
      showError(data.message || 'An error occurred while fetching the release notes.');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    showError('Unable to connect to the server. Please check that Flask is running and try again.');
  } finally {
    setLoadingState(false);
  }
}

// Control UI loading visual states
function setLoadingState(isLoading) {
  if (isLoading) {
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;
    loadingSkeleton.style.display = 'flex';
    notesFeed.style.display = 'none';
    emptyState.style.display = 'none';
  } else {
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
    loadingSkeleton.style.display = 'none';
    notesFeed.style.display = 'flex';
  }
}

// Display error alert
function showError(message) {
  errorMessage.textContent = message;
  errorContainer.style.display = 'flex';
  notesFeed.innerHTML = '';
  totalCountEl.textContent = '0';
  visibleCountEl.textContent = '0';
}

// Filter and render release notes in DOM
function renderNotes() {
  notesFeed.innerHTML = '';
  
  // Filter based on chip selection and search keyword
  const filtered = releaseNotes.filter(note => {
    const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
    
    const plainContent = stripHtml(note.content).toLowerCase();
    const plainDate = note.date.toLowerCase();
    const plainType = note.type.toLowerCase();
    
    const matchesSearch = !searchKeyword || 
                          plainContent.includes(searchKeyword) ||
                          plainDate.includes(searchKeyword) ||
                          plainType.includes(searchKeyword);
                          
    return matchesFilter && matchesSearch;
  });

  // Update counter stats
  totalCountEl.textContent = releaseNotes.length;
  visibleCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  // Render cards
  filtered.forEach(note => {
    const card = document.createElement('article');
    card.className = 'note-card';
    card.setAttribute('aria-labelledby', `title-${note.id}`);
    
    // Check if the type is standard or custom
    const cleanType = note.type ? note.type : 'General';
    
    card.innerHTML = `
      <header class="note-header">
        <div class="note-date-group">
          <svg class="icon" style="color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <time id="title-${note.id}" class="note-date" datetime="${note.raw_date}">${note.date}</time>
        </div>
        <span class="note-badge" data-type="${cleanType}">${cleanType}</span>
      </header>
      
      <div class="note-body">
        ${note.content}
      </div>
      
      <footer class="note-actions">
        <button class="btn-card-action btn-card-tweet" data-action="tweet" data-id="${note.id}">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Draft Tweet</span>
        </button>
        <button class="btn-card-action" data-action="copy-text" data-id="${note.id}">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy Note Text</span>
        </button>
        <button class="btn-card-action" data-action="copy-link" data-link="${note.link}">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>Copy Direct Link</span>
        </button>
      </footer>
    `;
    
    // Register actions
    card.querySelector('[data-action="tweet"]').addEventListener('click', () => openTweetModal(note));
    card.querySelector('[data-action="copy-text"]').addEventListener('click', (e) => copyTextToClipboard(e, note));
    card.querySelector('[data-action="copy-link"]').addEventListener('click', (e) => copyLinkToClipboard(e, note.link));
    
    notesFeed.appendChild(card);
  });
}

// Utility to copy direct link with visual feedback
async function copyLinkToClipboard(event, link) {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  
  try {
    await navigator.clipboard.writeText(link);
    btn.innerHTML = `
      <svg class="icon" style="color: var(--color-feature);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span style="color: var(--color-feature);">Copied!</span>
    `;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('Failed to copy link to clipboard.');
  }
}

// Prep text and open Tweet drafting modal
function openTweetModal(note) {
  const strippedText = stripHtml(note.content).trim();
  const dateStr = note.date;
  const noteType = note.type;
  
  // Format the draft content elegantly:
  // e.g. "BigQuery [Feature] (June 15, 2026): Use Gemini Cloud Assist to analyze queries... <Link> #BigQuery #GoogleCloud"
  const prefix = `BigQuery [${noteType}] (${dateStr}): `;
  const suffix = `\n\nLink: ${note.link}\n#BigQuery #GCP`;
  
  // Compute available space for the description
  // Length of prefix + suffix + text content must fit in 280
  const totalReserved = prefix.length + suffix.length;
  const maxDescLength = 280 - totalReserved;
  
  let tweetDesc = strippedText;
  if (strippedText.length > maxDescLength) {
    // Truncate cleanly on word boundary
    const truncated = strippedText.substr(0, maxDescLength - 3);
    tweetDesc = truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + "...";
  }
  
  const finalTweetText = `${prefix}${tweetDesc}${suffix}`;
  
  // Load text into textarea
  tweetTextarea.value = finalTweetText;
  updateCharCount();
  
  // Open dialog natively
  tweetDialog.showModal();
}

// Update character counter in Tweet modal
function updateCharCount() {
  const currentLength = tweetTextarea.value.length;
  charCounter.textContent = currentLength;
  
  if (currentLength > 280) {
    charCounter.classList.add('warning');
    characterWarning.style.display = 'block';
    tweetSubmitBtn.disabled = true;
  } else {
    charCounter.classList.remove('warning');
    characterWarning.style.display = 'none';
    tweetSubmitBtn.disabled = false;
  }
}

// Utility function to strip HTML tags from a string
function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Replace standard anchor tags with their text + parenthetical URL if useful, or just text
  const links = doc.querySelectorAll('a');
  links.forEach(a => {
    // Keep it clean: just use the link text
    a.replaceWith(a.textContent);
  });
  return doc.body.textContent || "";
}

// Utility to copy full note content to clipboard
async function copyTextToClipboard(event, note) {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  
  const plainContent = stripHtml(note.content).trim();
  const fullText = `BigQuery Release Note - ${note.date} [${note.type}]\n\n${plainContent}\n\nLink: ${note.link}`;
  
  try {
    await navigator.clipboard.writeText(fullText);
    btn.innerHTML = `
      <svg class="icon" style="color: var(--color-feature);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span style="color: var(--color-feature);">Copied!</span>
    `;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('Failed to copy note content to clipboard.');
  }
}

// Export visible notes to CSV file
function exportToCsv() {
  if (releaseNotes.length === 0) {
    alert("No data available to export!");
    return;
  }
  
  // Filter based on active filter and search keyword
  const filtered = releaseNotes.filter(note => {
    const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
    const plainContent = stripHtml(note.content).toLowerCase();
    const plainDate = note.date.toLowerCase();
    const plainType = note.type.toLowerCase();
    
    const matchesSearch = !searchKeyword || 
                          plainContent.includes(searchKeyword) ||
                          plainDate.includes(searchKeyword) ||
                          plainType.includes(searchKeyword);
                          
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    alert("No matching notes to export!");
    return;
  }

  // Create CSV header
  const headers = ["Date", "Type", "Content", "Link"];
  
  // Map rows
  const rows = filtered.map(note => {
    const cleanContent = stripHtml(note.content)
      .replace(/"/g, '""') // Escape double quotes
      .replace(/\r?\n|\r/g, ' '); // Strip newlines
    
    return [
      `"${note.date}"`,
      `"${note.type}"`,
      `"${cleanContent}"`,
      `"${note.link}"`
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const filterSuffix = activeFilter !== 'all' ? `_${activeFilter}` : '';
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `bq_release_notes${filterSuffix}_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
