document.addEventListener("DOMContentLoaded", () => {
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");
  const notesInput = document.getElementById("notesInput"); // New input field
  const currentStatusEl = document.getElementById("currentStatus");
  const locationStatusEl = document.getElementById("locationStatus");
  const logListEl = document.getElementById("logList");
  const downloadLogsBtn = document.getElementById("downloadLogsBtn");
  const clearLogsBtn = document.getElementById("clearLogsBtn");

  const LOG_STORAGE_KEY = "absenceLog";
  const originalClockInText = clockInBtn.textContent;
  const originalClockOutText = clockOutBtn.textContent;

  // Function to get current logs from localStorage
  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY)) || [];
  }

  // Function to save logs to localStorage
  function saveLogs(logs) {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  }

  // Function to display logs
  function displayLogs() {
    logListEl.innerHTML = ""; // Clear existing logs
    const logs = getLogs();

    // Display newest logs first
    logs
      .slice()
      .reverse()
      .forEach((logEntry) => {
        // Use slice() to avoid mutating original array before reversing
        const listItem = document.createElement("li");
        listItem.classList.add(
          logEntry.type.toLowerCase().replace(/\s+/g, "-")
        ); // e.g., clock-in

        const timeString = new Date(logEntry.timestamp).toLocaleString();
        let geoString = "Geolocation: Not available";
        if (logEntry.geolocation) {
          const lat = logEntry.geolocation.latitude.toFixed(5);
          const lon = logEntry.geolocation.longitude.toFixed(5);
          geoString = `Lat: ${lat}, Lon: ${lon} (Accuracy: ${logEntry.geolocation.accuracy}m) `;
          geoString += `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener noreferrer">(View on Map)</a>`;
        }

        let notesHTML = "";
        if (logEntry.notes && logEntry.notes.trim() !== "") {
          notesHTML = `<p class="notes">Notes: ${logEntry.notes}</p>`;
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

    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1]; // Still use last actual log for current status
      currentStatusEl.textContent = `Currently: ${lastLog.type}`;
      downloadLogsBtn.disabled = false;
      clearLogsBtn.disabled = false;
    } else {
      currentStatusEl.textContent = "Not clocked in";
      downloadLogsBtn.disabled = true;
      clearLogsBtn.disabled = true;
    }
  }

  // Function to update button states and text during processing
  function setProcessingState(isProcessing, buttonType = null) {
    if (isProcessing) {
      clockInBtn.disabled = true;
      clockOutBtn.disabled = true;
      if (buttonType === "Clock In") {
        clockInBtn.textContent = "Processing...";
      } else if (buttonType === "Clock Out") {
        clockOutBtn.textContent = "Processing...";
      }
      locationStatusEl.textContent = "Attempting to get location...";
    } else {
      clockInBtn.disabled = false;
      clockOutBtn.disabled = false;
      clockInBtn.textContent = originalClockInText;
      clockOutBtn.textContent = originalClockOutText;
      // locationStatusEl.textContent will be set by success/error handlers
    }
  }

  // Function to log an event (Clock In / Clock Out)
  function logEvent(type) {
    setProcessingState(true, type);
    currentStatusEl.textContent = `Processing ${type}...`;
    const notes = notesInput.value.trim(); // Get notes

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLogEntry = {
            type: type,
            timestamp: new Date().toISOString(),
            notes: notes, // Add notes to the log entry
            geolocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          };
          const logs = getLogs();
          logs.push(newLogEntry);
          saveLogs(logs);
          displayLogs();
          notesInput.value = ""; // Clear notes field
          locationStatusEl.textContent = "Location captured successfully.";
          currentStatusEl.textContent = `Successfully ${type
            .toLowerCase()
            .replace("clock ", "clocked ")} at ${new Date(
            newLogEntry.timestamp
          ).toLocaleTimeString()}`;
          setProcessingState(false);
        },
        (error) => {
          console.error("Geolocation error: ", error);
          const newLogEntry = {
            type: type,
            timestamp: new Date().toISOString(),
            notes: notes, // Add notes even if geolocation fails
            geolocation: null,
          };
          const logs = getLogs();
          logs.push(newLogEntry);
          saveLogs(logs);
          displayLogs();
          notesInput.value = ""; // Clear notes field
          locationStatusEl.textContent = `Could not get location: ${error.message}`;
          currentStatusEl.textContent = `Successfully ${type
            .toLowerCase()
            .replace("clock ", "clocked ")} at ${new Date(
            newLogEntry.timestamp
          ).toLocaleTimeString()} (location failed).`;
          setProcessingState(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      const newLogEntry = {
        type: type,
        timestamp: new Date().toISOString(),
        notes: notes, // Add notes
        geolocation: null,
      };
      const logs = getLogs();
      logs.push(newLogEntry);
      saveLogs(logs);
      displayLogs();
      notesInput.value = ""; // Clear notes field
      locationStatusEl.textContent =
        "Geolocation is not supported by this browser.";
      currentStatusEl.textContent = `Successfully ${type
        .toLowerCase()
        .replace("clock ", "clocked ")} at ${new Date(
        newLogEntry.timestamp
      ).toLocaleTimeString()} (geolocation not supported).`;
      setProcessingState(false);
    }
  }

  // Function to download logs as a JSON file
  function downloadLogs() {
    const logs = getLogs();
    if (logs.length === 0) {
      alert("No logs to download.");
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0]; // Sanitize filename
    downloadAnchorNode.setAttribute(
      "download",
      `absence_log_${timestamp}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    locationStatusEl.textContent = "Logs downloaded.";
  }

  // Function to clear all logs
  function clearAllLogs() {
    if (getLogs().length === 0) {
      alert("No logs to clear.");
      return;
    }
    if (
      confirm(
        "Are you sure you want to delete all log entries? This cannot be undone."
      )
    ) {
      localStorage.removeItem(LOG_STORAGE_KEY);
      displayLogs();
      locationStatusEl.textContent = "All logs have been cleared.";
      currentStatusEl.textContent = "Not clocked in";
    }
  }

  // Event Listeners
  clockInBtn.addEventListener("click", () => logEvent("Clock In"));
  clockOutBtn.addEventListener("click", () => logEvent("Clock Out"));
  downloadLogsBtn.addEventListener("click", downloadLogs);
  clearLogsBtn.addEventListener("click", clearAllLogs);

  // Initial display of logs when the page loads
  displayLogs();
});
