// static/index-script.js
document.addEventListener('DOMContentLoaded', () => {
    const topicInput = document.getElementById('topicInput');
    const numQuestionsInput = document.getElementById('numQuestionsInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    const currentQuestionContainer = document.getElementById('currentQuestionContainer');
    const questionText = currentQuestionContainer.querySelector('.question-text');
    const answerInput = document.getElementById('answerInput');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const feedbackDisplay = document.getElementById('feedbackDisplay');

    let currentQuestion = null;
    let generatedQuestionsQueue = [];

    // Load initial state from localStorage
    let questionCount = loadFromLocalStorage(STORAGE_KEYS.QUESTION_COUNT, 0);
    let correctCount = loadFromLocalStorage(STORAGE_KEYS.CORRECT_COUNT, 0);
    let performanceData = loadFromLocalStorage(STORAGE_KEYS.PERFORMANCE_DATA, {
        'Artificial Intelligence': 0, // Default topics for performance tracking
        'Quantum Physics': 0,
        'World History': 0,
        'Calculus': 0,
        'Biology': 0
    });
    let practiceHistory = loadFromLocalStorage(STORAGE_KEYS.PRACTICE_HISTORY, []);

    // Check if there's a question to retry from history
    const retryData = loadFromLocalStorage(STORAGE_KEYS.RETRY_QUESTION_DATA, null);
    if (retryData) {
        topicInput.value = retryData.topic;
        numQuestionsInput.value = 1; // Always 1 for retried question
        generatedQuestionsQueue.push(retryData.question);
        displayNextQuestion();
        answerInput.style.display = 'block';
        submitAnswerBtn.style.display = 'block';
        showCustomAlert(`Retrying question on: ${retryData.topic}`);
        localStorage.removeItem(STORAGE_KEYS.RETRY_QUESTION_DATA); // Clear retry data
    } else {
        // Initial state setup for answer/feedback area if not retrying
        answerInput.style.display = 'none';
        submitAnswerBtn.style.display = 'none';
    }


    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        const numQuestions = parseInt(numQuestionsInput.value, 10);

        if (!topic) {
            showCustomAlert('Please enter a topic to generate questions!');
            return;
        }
        if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 5) {
            showCustomAlert('Please enter a valid number of questions between 1 and 5.');
            return;
        }

        questionText.textContent = 'Generating questions... please wait!';
        answerInput.value = '';
        answerInput.style.display = 'none';
        submitAnswerBtn.style.display = 'none';
        feedbackDisplay.innerHTML = '<p class="placeholder-text">AI feedback will be displayed here.</p>';
        loadingSpinner.classList.remove('hidden'); // Show spinner

        try {
            const response = await fetch('http://127.0.0.1:5000/generate_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic: topic, num_questions: numQuestions }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate questions');
            }

            const data = await response.json();
            
            if (data.questions && data.questions.length > 0) {
                generatedQuestionsQueue = data.questions;
                displayNextQuestion();
                answerInput.style.display = 'block';
                submitAnswerBtn.style.display = 'block';
            } else {
                questionText.textContent = 'No questions generated. Try a different topic!';
                answerInput.style.display = 'none';
                submitAnswerBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('Error generating questions:', error);
            showCustomAlert(`Error: ${error.message}. Please check the backend server.`);
            questionText.innerHTML = `<p class="placeholder-text error-message">Error: ${error.message}. Please check the backend server.</p>`;
            answerInput.style.display = 'none';
            submitAnswerBtn.style.display = 'none';
        } finally {
            loadingSpinner.classList.add('hidden'); // Hide spinner
        }
    });

    function displayNextQuestion() {
        if (generatedQuestionsQueue.length > 0) {
            currentQuestion = generatedQuestionsQueue.shift();
            questionText.textContent = currentQuestion;
            answerInput.value = '';
            feedbackDisplay.innerHTML = '<p class="placeholder-text">AI feedback will be displayed here.</p>';
        } else {
            questionText.textContent = 'All questions answered! Generate more!';
            answerInput.style.display = 'none';
            submitAnswerBtn.style.display = 'none';
        }
    }

    submitAnswerBtn.addEventListener('click', async () => {
        const studentAnswer = answerInput.value.trim();
        if (!studentAnswer) {
            showCustomAlert('Please type an answer before submitting!');
            return;
        }

        if (!currentQuestion) {
            showCustomAlert('No question is currently displayed.');
            return;
        }

        const questionBeingAnswered = currentQuestion;
        const currentTopicForHistory = topicInput.value.trim();
        
        feedbackDisplay.innerHTML = '<p class="placeholder-text">Submitting answer and getting AI feedback...</p>';
        loadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('http://127.0.0.1:5000/evaluate_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: questionBeingAnswered,
                    student_answer: studentAnswer
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to evaluate answer');
            }

            const evaluationData = await response.json();
            const isCorrect = evaluationData.is_correct;
            const aiFeedback = evaluationData.ai_feedback;
            const correct_answer = evaluationData.correct_answer;

            questionCount++;
            if (isCorrect) {
                correctCount++;
            }

            if (performanceData[currentTopicForHistory] !== undefined) {
                const currentTopicTotal = practiceHistory.filter(item => item.topic === currentTopicForHistory).length;
                const currentTopicCorrect = practiceHistory.filter(item => item.topic === currentTopicForHistory && item.isCorrect).length;
                performanceData[currentTopicForHistory] = (currentTopicCorrect + (isCorrect ? 1 : 0)) / (currentTopicTotal + 1);
            } else {
                performanceData[currentTopicForHistory] = isCorrect ? 1 : 0;
            }

            let feedbackHtml = `<p><strong>${isCorrect ? 'Correct! 🎉' : 'Needs Review. 🤔'}</strong></p>`;
            feedbackHtml += `<p>${aiFeedback}</p>`;
            if (correct_answer && correct_answer !== "N/A") { // Always show correct answer if available
                if (!isCorrect) { // If incorrect, show prominently
                    feedbackHtml += `<p><strong>Correct Answer:</strong> ${correct_answer}</p>`;
                } else { // If correct, show subtly
                    feedbackHtml += `<p class="subtle-correct-answer">Correct Answer: ${correct_answer}</p>`;
                }
            }
            feedbackDisplay.innerHTML = feedbackHtml;
            
            practiceHistory.push({
                question: questionBeingAnswered,
                studentAnswer: studentAnswer,
                aiFeedback: aiFeedback,
                isCorrect: isCorrect,
                correctAnswer: correct_answer,
                timestamp: new Date().toLocaleString(),
                topic: currentTopicForHistory
            });
            
            saveToLocalStorage(STORAGE_KEYS.QUESTION_COUNT, questionCount);
            saveToLocalStorage(STORAGE_KEYS.CORRECT_COUNT, correctCount);
            saveToLocalStorage(STORAGE_KEYS.PERFORMANCE_DATA, performanceData);
            saveToLocalStorage(STORAGE_KEYS.PRACTICE_HISTORY, practiceHistory);


            if (generatedQuestionsQueue.length > 0) {
                 setTimeout(() => {
                    displayNextQuestion();
                }, 3000);
            } else {
                feedbackDisplay.innerHTML += '<p>All generated questions have been answered!</p>';
            }

        } catch (error) {
            console.error('Error submitting answer or getting feedback:', error);
            showCustomAlert(`Error: ${error.message}. Please check the backend server.`);
            feedbackDisplay.innerHTML = `<p class="placeholder-text error-message">Error: ${error.message}. Please check the backend server.</p>`;
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    });
});
