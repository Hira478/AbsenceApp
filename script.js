document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    const notesInput = document.getElementById('notesInput');
    const currentStatusEl = document.getElementById('currentStatus');
    const locationStatusEl = document.getElementById('locationStatus');
    const logListEl = document.getElementById('logList');
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    const monthFilterEl = document.getElementById('monthFilter');
    const yearFilterEl = document.getElementById('yearFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const logSummaryTextEl = document.getElementById('logSummaryText');

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoEl = document.getElementById('pageInfo');

    // --- Constants and State ---
    const LOG_STORAGE_KEY = 'absenceLog';
    const ITEMS_PER_PAGE = 5; // Number of log entries per page
    let currentPage = 1;
    let currentFilter = { month: '', year: '' }; // Store current filter state
    let allLogs = []; // Cache all logs from localStorage

    const originalClockInText = clockInBtn.textContent;
    const originalClockOutText = clockOutBtn.textContent;

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

    // --- Initialization ---
    function initializeApp() {
        loadAllLogs();
        populateFilterDropdowns();
        renderDisplay(); // Initial render (logs, pagination, summary)
        setupEventListeners();
    }

    function setupEventListeners() {
        clockInBtn.addEventListener('click', () => handleLogEvent('Clock In'));
        clockOutBtn.addEventListener('click', () => handleLogEvent('Clock Out'));
        downloadLogsBtn.addEventListener('click', handleDownloadLogs);
        clearLogsBtn.addEventListener('click', handleClearAllLogs);
        applyFilterBtn.addEventListener('click', applyFilter);
        resetFilterBtn.addEventListener('click', resetFilter);
        prevPageBtn.addEventListener('click', () => changePage(-1));
        nextPageBtn.addEventListener('click', () => changePage(1));
    }

    // --- Data Handling ---
    function loadAllLogs() {
        allLogs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY)) || [];
    }

    function saveAllLogs() {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(allLogs));
    }

    function getFilteredLogs() {
        let logsToDisplay = [...allLogs]; // Start with all logs

        // Apply year filter
        if (currentFilter.year) {
            logsToDisplay = logsToDisplay.filter(log => new Date(log.timestamp).getFullYear() === parseInt(currentFilter.year));
        }
        // Apply month filter (0-indexed for Date object, 1-indexed for filter value)
        if (currentFilter.month) {
            logsToDisplay = logsToDisplay.filter(log => (new Date(log.timestamp).getMonth() + 1) === parseInt(currentFilter.month));
        }
        return logsToDisplay.slice().reverse(); // Newest first for display
    }


    // --- Display Logic ---
    function renderDisplay() {
        const filteredLogs = getFilteredLogs();
        renderLogEntries(filteredLogs);
        renderPaginationControls(filteredLogs.length);
        renderLogSummary(filteredLogs);
        updateCurrentStatus();
        updateActionButtonsState();
    }

    function renderLogEntries(logs) {
        logListEl.innerHTML = ''; // Clear existing logs
        if (logs.length === 0) {
            logListEl.innerHTML = '<li>No log entries found for the current filter.</li>';
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedLogs = logs.slice(startIndex, endIndex);

        paginatedLogs.forEach(logEntry => {
            const listItem = document.createElement('li');
            listItem.classList.add(logEntry.type.toLowerCase().replace(/\s+/g, '-'));

            const timeString = new Date(logEntry.timestamp).toLocaleString();
            let geoString = 'Geolocation: Not available';
            if (logEntry.geolocation) {
                const lat = logEntry.geolocation.latitude.toFixed(5);
                const lon = logEntry.geolocation.longitude.toFixed(5);
                geoString = `Lat: ${lat}, Lon: ${lon} (Accuracy: ${logEntry.geolocation.accuracy}m) `;
                geoString += `<a href="https://maps.google.com/?q=${lat},${lon}" target="_blank" rel="noopener noreferrer">(View on Map)</a>`;
            }

            let notesHTML = '';
            if (logEntry.notes && logEntry.notes.trim() !== '') {
                notesHTML = `<p class="notes">Notes: ${logEntry.notes.replace(/\n/g, '<br>')}</p>`; // Preserve line breaks
            }

            listItem.innerHTML = `
                <div class="entry-header">
                    <span class="time">${timeString}</span>
                    <span class="type">${logEntry.type}</span>
                </div>
                ${notesHTML}
                <span class="geo">${geoString}</span>
            `;
            logListEl.appendChild(listItem);
        });
    }

    function renderPaginationControls(totalItems) {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalItems === 0;
    }

    function renderLogSummary(logs) {
        if (logs.length === 0) {
            logSummaryTextEl.textContent = 'No logs to summarize for the current view.';
            return;
        }
        let clockIns = 0;
        let clockOuts = 0;
        // Summarize based on the currently filtered (but not yet paginated) logs
        logs.forEach(log => {
            if (log.type === 'Clock In') clockIns++;
            if (log.type === 'Clock Out') clockOuts++;
        });
        logSummaryTextEl.textContent = `Displaying ${logs.length} entries. Clock Ins: ${clockIns}, Clock Outs: ${clockOuts}.`;
    }

    function updateCurrentStatus() {
        if (allLogs.length > 0) {
            const lastLogOverall = allLogs[allLogs.length - 1];
            currentStatusEl.textContent = `Currently: ${lastLogOverall.type}`;
        } else {
            currentStatusEl.textContent = 'Not clocked in';
        }
    }

    function updateActionButtonsState() {
        const logsExist = allLogs.length > 0;
        const filteredLogsExist = getFilteredLogs().length > 0;

        clearLogsBtn.disabled = !logsExist;
        downloadLogsBtn.disabled = !filteredLogsExist; // Only enable if current view has logs
    }

    // --- Filter Logic ---
    function populateFilterDropdowns() {
        // Populate months
        monthNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index + 1; // 1-12
            option.textContent = name;
            monthFilterEl.appendChild(option);
        });

        // Populate years from existing logs
        const years = new Set();
        allLogs.forEach(log => years.add(new Date(log.timestamp).getFullYear()));
        const sortedYears = Array.from(years).sort((a, b) => b - a); // Newest years first

        // Add current year if not present, for future entries
        const currentYear = new Date().getFullYear();
        if (!sortedYears.includes(currentYear)) {
            sortedYears.unshift(currentYear);
            sortedYears.sort((a, b) => b - a); // Re-sort
        }


        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilterEl.appendChild(option);
        });

        // Set dropdowns to current filter state or default
        monthFilterEl.value = currentFilter.month;
        yearFilterEl.value = currentFilter.year;
    }

    function applyFilter() {
        currentFilter.month = monthFilterEl.value;
        currentFilter.year = yearFilterEl.value;
        currentPage = 1; // Reset to first page on new filter
        renderDisplay();
        locationStatusEl.textContent = 'Filter applied.';
    }

    function resetFilter() {
        currentFilter.month = '';
        currentFilter.year = '';
        monthFilterEl.value = '';
        yearFilterEl.value = '';
        currentPage = 1;
        renderDisplay();
        locationStatusEl.textContent = 'Filter reset.';
    }

    // --- Pagination Logic ---
    function changePage(direction) {
        currentPage += direction;
        renderDisplay();
    }

    // --- Event Handlers & Actions ---
    function setProcessingState(isProcessing, buttonType = null) {
        clockInBtn.disabled = isProcessing;
        clockOutBtn.disabled = isProcessing;

        if (isProcessing) {
            const btnToUpdate = buttonType === 'Clock In' ? clockInBtn : clockOutBtn;
            btnToUpdate.textContent = 'Processing...';
            locationStatusEl.textContent = 'Attempting to get location...';
        } else {
            clockInBtn.textContent = originalClockInText;
            clockOutBtn.textContent = originalClockOutText;
            // locationStatus message will be set by success/error
        }
    }

    function handleLogEvent(type) {
        setProcessingState(true, type);
        currentStatusEl.textContent = `Processing ${type}...`;
        const notes = notesInput.value.trim();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLogEntry = {
                        type: type,
                        timestamp: new Date().toISOString(),
                        notes: notes,
                        geolocation: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        }
                    };
                    allLogs.push(newLogEntry);
                    saveAllLogs();
                    notesInput.value = '';
                    locationStatusEl.textContent = 'Location captured successfully.';
                    currentStatusEl.textContent = `Successfully ${type.toLowerCase().replace('clock ', 'clocked ')} at ${new Date(newLogEntry.timestamp).toLocaleTimeString()}`;
                    
                    // If no filter active or new entry matches current filter, go to first page to show it
                    const newEntryDate = new Date(newLogEntry.timestamp);
                    const matchesYearFilter = !currentFilter.year || newEntryDate.getFullYear() === parseInt(currentFilter.year);
                    const matchesMonthFilter = !currentFilter.month || (newEntryDate.getMonth() + 1) === parseInt(currentFilter.month);

                    if (matchesYearFilter && matchesMonthFilter) {
                        currentPage = 1; // Go to first page of current (possibly filtered) view
                    }
                    // Repopulate year dropdown if new year added & then render
                    const newYear = newEntryDate.getFullYear();
                    if (!Array.from(yearFilterEl.options).some(opt => opt.value == newYear)) {
                        populateFilterDropdowns(); // This will re-add current year if needed
                    }
                    renderDisplay();
                    setProcessingState(false);
                },
                (error) => {
                    console.error("Geolocation error: ", error);
                    const newLogEntry = { type: type, timestamp: new Date().toISOString(), notes: notes, geolocation: null };
                    allLogs.push(newLogEntry);
                    saveAllLogs();
                    notesInput.value = '';
                    locationStatusEl.textContent = `Could not get location: ${error.message}`;
                    currentStatusEl.textContent = `Successfully ${type.toLowerCase().replace('clock ', 'clocked ')} at ${new Date(newLogEntry.timestamp).toLocaleTimeString()} (location failed).`;
                    renderDisplay(); // Refresh display even on error
                    setProcessingState(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            // Geolocation not supported
            console.error("Geolocation is not supported by this browser.");
            const newLogEntry = { type: type, timestamp: new Date().toISOString(), notes: notes, geolocation: null };
            allLogs.push(newLogEntry);
            saveAllLogs();
            notesInput.value = '';
            locationStatusEl.textContent = 'Geolocation is not supported by this browser.';
            currentStatusEl.textContent = `Successfully ${type.toLowerCase().replace('clock ', 'clocked ')} at ${new Date(newLogEntry.timestamp).toLocaleTimeString()} (geolocation not supported).`;
            renderDisplay();
            setProcessingState(false);
        }
    }

    function handleDownloadLogs() {
        const logsToDownload = getFilteredLogs(); // Download currently filtered (and reversed for display) logs
        if (logsToDownload.length === 0) {
            alert("No logs in the current view to download.");
            return;
        }
        // For download, it might be better to have original chronological order
        const chronologicalLogsToDownload = logsToDownload.slice().reverse();

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chronologicalLogsToDownload, null, 2));
        const downloadAnchorNode = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `absence_log_view_${timestamp}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        locationStatusEl.textContent = 'Filtered logs downloaded.';
    }

    function handleClearAllLogs() {
        if (allLogs.length === 0) {
            alert("No logs to clear.");
            return;
        }
        if (confirm("Are you sure you want to delete ALL log entries? This cannot be undone.")) {
            allLogs = [];
            saveAllLogs();
            currentFilter = { month: '', year: '' }; // Reset filter state
            monthFilterEl.value = ''; // Reset dropdowns visually
            yearFilterEl.value = '';
            currentPage = 1;
            // Repopulate filter dropdowns as they might become empty
            yearFilterEl.innerHTML = '<option value="">All</option>'; // Clear old year options
            monthFilterEl.innerHTML = '<option value="">All</option>';// Clear old month options
            populateFilterDropdowns(); // Re-populate with default (current year for year dropdown)
            renderDisplay();
            locationStatusEl.textContent = 'All logs have been cleared.';
        }
    }

    // --- Start the App ---
    initializeApp();
});
