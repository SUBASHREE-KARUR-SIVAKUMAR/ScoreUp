// static/storage-util.js
const STORAGE_KEYS = {
    PRACTICE_HISTORY: 'scoreup_practice_history',
    PERFORMANCE_DATA: 'scoreup_performance_data',
    QUESTION_COUNT: 'scoreup_question_count',
    CORRECT_COUNT: 'scoreup_correct_count',
    RETRY_QUESTION_DATA: 'scoreup_retry_question_data'
};

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadFromLocalStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function clearAllLocalStorage() {
    for (const key in STORAGE_KEYS) {
        localStorage.removeItem(STORAGE_KEYS[key]);
    }
    console.log("All ScoreUp data cleared from localStorage.");
}

// Global function to show custom alert
function showCustomAlert(message) {
    const customAlertModal = document.getElementById('customAlertModal');
    const customAlertMessage = document.getElementById('customAlertMessage');
    const closeButton = customAlertModal.querySelector('.close-button');
    const okButton = customAlertModal.querySelector('.modal-ok-btn');

    customAlertMessage.textContent = message;
    customAlertModal.classList.remove('hidden');

    const closeModal = () => {
        customAlertModal.classList.add('hidden');
        closeButton.removeEventListener('click', closeModal);
        okButton.removeEventListener('click', closeModal);
        document.removeEventListener('keydown', handleEscape);
    };

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    closeButton.addEventListener('click', closeModal);
    okButton.addEventListener('click', closeModal);
    document.addEventListener('keydown', handleEscape);
}

// Function to handle global reset button setup
function setupResetButton() {
    const resetDataBtn = document.getElementById('resetDataBtn');
    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset ALL your ScoreUp practice data? This cannot be undone.")) {
                clearAllLocalStorage();
                showCustomAlert("All your ScoreUp data has been reset!");
                // Reload the page to reflect changes
                setTimeout(() => window.location.reload(), 1500); 
            }
        });
    }
}

// Call setupResetButton on DOMContentLoaded for all pages that have the button
document.addEventListener('DOMContentLoaded', setupResetButton);

