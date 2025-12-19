// static/history-script.js
document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const historyDetailModal = document.getElementById('historyDetailModal');
    const modalContent = document.getElementById('modalContent');
    const modalCloseBtn = historyDetailModal.querySelector('.modal-close-btn');
    const modalCloseSpan = historyDetailModal.querySelector('.close-button');
    const retryQuestionBtn = document.getElementById('retryQuestionBtn');

    // Load history from localStorage
    const practiceHistory = loadFromLocalStorage(STORAGE_KEYS.PRACTICE_HISTORY, []);

    function renderPracticeHistory() {
        historyList.innerHTML = '';
        if (practiceHistory.length === 0) {
            historyList.innerHTML = '<p class="placeholder-text">No questions practiced yet. Go generate some!</p>';
            return;
        }

        [...practiceHistory].reverse().forEach((item, index) => {
            const historyItemDiv = document.createElement('div');
            historyItemDiv.classList.add('history-item');
            if (item.isCorrect) {
                historyItemDiv.classList.add('correct');
            } else {
                historyItemDiv.classList.add('incorrect');
            }

            historyItemDiv.innerHTML = `
                <h4>Question: ${item.question}</h4>
                <p><strong>Topic:</strong> ${item.topic || 'N/A'}</p>
                <p class="timestamp">${item.timestamp}</p>
                <button class="view-details-btn" data-index="${practiceHistory.length - 1 - index}">View Details</button>
            `;
            historyList.appendChild(historyItemDiv);
        });

        // Add event listeners for "View Details" buttons
        historyList.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemIndex = parseInt(e.target.dataset.index, 10);
                showHistoryDetailModal(practiceHistory[itemIndex]);
            });
        });
    }

    function showHistoryDetailModal(item) {
        modalContent.innerHTML = `
            <p class="modal-question-text"><strong>Question:</strong> ${item.question}</p>
            <p><strong>Topic:</strong> ${item.topic || 'N/A'}</p>
            <p class="modal-your-answer"><strong>Your Answer:</strong> ${item.studentAnswer}</p>
            ${item.correctAnswer && item.correctAnswer !== "N/A" ? `<p><strong>Correct Answer:</strong> ${item.correctAnswer}</p>` : ''}
            <div class="modal-ai-feedback">
                <p><strong>AI Feedback:</strong></p>
                <p>${item.aiFeedback}</p>
            </div>
            <p><strong>Status:</strong> ${item.isCorrect ? 'Correct 🎉' : 'Incorrect 🤔'}</p>
            <p><strong>Date:</strong> ${item.timestamp}</p>
        `;
        // Store item data for retry button
        retryQuestionBtn.dataset.question = item.question;
        retryQuestionBtn.dataset.topic = item.topic;

        historyDetailModal.classList.remove('hidden');

        // Event listeners for closing modal
        const closeModal = () => {
            historyDetailModal.classList.add('hidden');
            modalCloseBtn.removeEventListener('click', closeModal);
            modalCloseSpan.removeEventListener('click', closeModal);
            document.removeEventListener('keydown', handleEscape);
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') closeModal();
        };

        modalCloseBtn.addEventListener('click', closeModal);
        modalCloseSpan.addEventListener('click', closeModal);
        document.addEventListener('keydown', handleEscape);
    }

    retryQuestionBtn.addEventListener('click', () => {
        const questionToRetry = retryQuestionBtn.dataset.question;
        const topicToRetry = retryQuestionBtn.dataset.topic;

        if (questionToRetry && topicToRetry) {
            saveToLocalStorage(STORAGE_KEYS.RETRY_QUESTION_DATA, {
                question: questionToRetry,
                topic: topicToRetry
            });
            window.location.href = 'index.html'; // Redirect to the main page
        } else {
            showCustomAlert("Could not retrieve question details to retry.");
        }
    });

    renderPracticeHistory(); // Render history when the page loads
});
