// static/dashboard-script.js
document.addEventListener('DOMContentLoaded', () => {
    const totalQuestionsStat = document.getElementById('totalQuestionsStat');
    const correctAnswersStat = document.getElementById('correctAnswersStat');
    const weakestTopicName = document.getElementById('weakestTopicName');
    const performanceChartCanvas = document.getElementById('performanceChart');
    const noChartDataMessage = document.getElementById('noChartDataMessage');
    const topicList = document.getElementById('topicList'); // New element selection

    // --- DEBUGGING: Check if elements are found ---
    console.log('Dashboard loaded.');
    console.log('performanceChartCanvas element:', performanceChartCanvas);
    console.log('noChartDataMessage element:', noChartDataMessage);
    console.log('topicList element:', topicList); // Debug for new element

    // Load state from localStorage
    const questionCount = loadFromLocalStorage(STORAGE_KEYS.QUESTION_COUNT, 0);
    const correctCount = loadFromLocalStorage(STORAGE_KEYS.CORRECT_COUNT, 0);
    const practiceHistory = loadFromLocalStorage(STORAGE_KEYS.PRACTICE_HISTORY, []);

    // --- DEBUGGING: Log current counts ---
    console.log('Total Questions (from localStorage):', questionCount);
    console.log('Correct Answers (from localStorage):', correctCount);
    console.log('Practice History (from localStorage):', practiceHistory.length, 'items');


    let performanceChart; // Declare chart variable

    // --- Chart.js Initialization for Pie Chart (Overall Correct vs. Incorrect) ---
    function initializePieChart() {
        // --- DEBUGGING: Check counts right before chart initialization ---
        console.log('Initializing Pie Chart. Current questionCount:', questionCount);
        console.log('Current correctCount:', correctCount);

        // --- Crucial: Check if canvas element was found ---
        if (!performanceChartCanvas) {
            console.error("Chart canvas element not found! Cannot initialize chart.");
            return; // Exit if canvas is null
        }
        // --- Crucial: Check if noChartDataMessage element was found ---
        if (!noChartDataMessage) {
            console.error("No chart data message element not found!");
            // Continue without message, but log error
        }

        // Determine if there's enough data to show a chart
        const hasDataForChart = questionCount > 0;

        if (!hasDataForChart) {
            performanceChartCanvas.classList.add('hidden'); // Hide canvas
            if (noChartDataMessage) noChartDataMessage.classList.remove('hidden'); // Show message
            if (performanceChart) {
                performanceChart.destroy(); // Destroy any existing chart
                performanceChart = null;
            }
            return; // Stop here if no data
        } else {
            performanceChartCanvas.classList.remove('hidden'); // Show canvas
            if (noChartDataMessage) noChartDataMessage.classList.add('hidden'); // Hide message
        }

        if (performanceChart) {
            performanceChart.destroy(); // Destroy existing chart if any
        }

        const incorrectCount = questionCount - correctCount;
        const labels = ['Correct', 'Incorrect'];
        const dataValues = [correctCount, incorrectCount];

        // --- DEBUGGING: Log data values for chart ---
        console.log('Pie Chart Data Values:', dataValues);

        const backgroundColors = [
            'rgba(126, 211, 33, 0.7)', // Accent Green for Correct
            'rgba(208, 2, 27, 0.7)'    // Accent Red for Incorrect
        ];
        const borderColors = [
            'var(--accent-green)',
            'var(--accent-red)'
        ];

        performanceChart = new Chart(performanceChartCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Overall Performance',
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-dark)'
                        }
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    // --- NEW FUNCTION: Render Topic Breakdown ---
    function renderTopicBreakdown() {
        if (!topicList) { // Check if element exists
            console.error("Topic list element not found!");
            return;
        }

        topicList.innerHTML = ''; // Clear previous content

        if (practiceHistory.length === 0) {
            topicList.innerHTML = '<p class="placeholder-text">Practice some questions to see your topics here!</p>';
            return;
        }

        const topicCounts = {}; // { 'Topic Name': count }
        practiceHistory.forEach(item => {
            const topic = item.topic || 'Unknown Topic';
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        // Sort topics alphabetically for consistent display
        const sortedTopics = Object.keys(topicCounts).sort();

        sortedTopics.forEach(topic => {
            const topicItemDiv = document.createElement('div');
            topicItemDiv.classList.add('topic-item');
            topicItemDiv.innerHTML = `
                <span>${topic}</span>
                <span>${topicCounts[topic]} questions</span>
            `;
            topicList.appendChild(topicItemDiv);
        });
    }

    // Function to update dashboard stats and weakest topic
    function updateDashboard() {
        if (totalQuestionsStat) totalQuestionsStat.textContent = questionCount;
        const correctRate = questionCount === 0 ? 0 : ((correctCount / questionCount) * 100).toFixed(0);
        if (correctAnswersStat) correctAnswersStat.textContent = `${correctRate}%`;

        // Recalculate performanceData from history to determine weakest topic
        const topicStats = {}; // { 'topic': { total: 0, correct: 0 } }
        practiceHistory.forEach(item => {
            const topic = item.topic || 'Unknown Topic';
            if (!topicStats[topic]) {
                topicStats[topic] = { total: 0, correct: 0 };
            }
            topicStats[topic].total++;
            if (item.isCorrect) {
                topicStats[topic].correct++;
            }
        });

        let weakest = null;
        let lowestScore = 101; // Higher than any possible percentage (0-100)
        let hasTopics = false;

        for (const topic in topicStats) {
            hasTopics = true;
            const score = (topicStats[topic].correct / topicStats[topic].total) * 100;
            if (score < lowestScore) {
                lowestScore = score;
                weakest = topic;
            }
        }
        
        if (weakestTopicName) {
            weakestTopicName.textContent = weakest || 'N/A';
            weakestTopicName.classList.toggle('placeholder-text', weakest === null);
        }

        const tipTextElement = weakestTopicName ? weakestTopicName.nextElementSibling : null;
        if (tipTextElement) {
            if (weakest && weakest !== 'N/A') {
                tipTextElement.textContent = `Time to master ${weakest}! Try generating more questions on this topic.`;
            } else if (hasTopics) {
                tipTextElement.textContent = 'Keep practicing! You\'re doing great across all topics.';
            } else {
                tipTextElement.textContent = 'Start practicing to see your personalized insights here!';
            }
        }
    }

    // Initial dashboard update and chart render on load
    updateDashboard();
    initializePieChart();
    renderTopicBreakdown(); // Call new function on load
});
