from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import json
import re # Make sure this is imported!

app = Flask(__name__)
CORS(app)

print("Loading question generation and evaluation model (google/flan-t5-large)...")
print("This is a larger model (approx. 800MB) and will take longer to download and load.")
print("Please be patient! This should significantly improve question and feedback quality.")

# Use one pipeline instance for both, as the prompt directs its behavior.
# device=0 means use GPU if available, -1 means use CPU.
llm_pipeline = pipeline("text2text-generation", model="google/flan-t5-large", device=0 if torch.cuda.is_available() else -1)
print("Model loaded successfully!")

@app.route('/generate_question', methods=['POST'])
def generate_question():
    data = request.get_json(silent=True)
    
    if data is None:
        print("Error: Could not parse JSON. Data might be malformed or missing Content-Type header.")
        return jsonify({"error": "Invalid JSON payload or missing Content-Type header"}), 400

    topic = data.get('topic', 'general knowledge')
    num_questions = data.get('num_questions', 1)

    generated_questions = []
    for _ in range(num_questions):
        # --- SUPER-SIMPLIFIED PROMPT for Question Generation ---
        # Ask for just the question directly. Flan-T5 Large is good at this.
        q_prompt = f"Generate a factual question about the topic: {topic}"

        q_output = llm_pipeline(
            q_prompt,
            max_length=100, # Max length for the generated question
            num_return_sequences=1,
            do_sample=True, # Allow for varied questions
            temperature=0.8, # Control creativity
            top_k=50,
            top_p=0.95
        )
        q_text = q_output[0]['generated_text'].strip()
        
        print(f"Raw QG model output for topic '{topic}': {q_text}") # Debugging: See raw output

        # --- Direct Use of Output: Assume the model's output IS the question ---
        # No complex parsing here, just take what the model gives.
        question_text = q_text if q_text else "Could not generate question."
        generated_questions.append(question_text)

    print(f"Questions being sent to frontend: {generated_questions}") # Debugging: What's going to the browser
    return jsonify({"questions": generated_questions})

@app.route('/evaluate_answer', methods=['POST'])
def evaluate_answer():
    data = request.get_json(silent=True)

    if data is None:
        print("Error: Could not parse JSON. Data might be malformed or missing Content-Type header.")
        return jsonify({"error": "Invalid JSON payload or missing Content-Type header"}), 400

    question = data.get('question')
    student_answer = data.get('student_answer')
    
    if not question or not student_answer:
        return jsonify({"error": "Missing 'question' or 'student_answer' in payload"}), 400

    try: # The 'try' block starts here, so 'except' must align with it.
        # --- Step 1 of Evaluation: Generate a concise correct answer for the question ---
        correct_answer_prompt = (
            f"What is the concise and accurate correct answer to this question: {question}"
        )
        correct_answer_output = llm_pipeline(
            correct_answer_prompt,
            max_length=80, # Keep correct answer concise
            num_return_sequences=1,
            do_sample=False, # Make this very deterministic
            temperature=0.1, # Low temperature for factual output
        )
        ground_truth_answer = correct_answer_output[0]['generated_text'].strip()
        print(f"Ground truth generated for '{question}': {ground_truth_answer}") # Debugging


        # --- Step 2 of Evaluation: Determine correctness (True/False) ---
        correctness_prompt = (
            f"Question: {question}\n"
            f"Correct Answer: {ground_truth_answer}\n"
            f"Student's Answer: {student_answer}\n"
            "Is the student's answer correct? Respond only with 'True' or 'False'."
        )
        correctness_output = llm_pipeline(
            correctness_prompt,
            max_length=10, # Expecting 'True' or 'False'
            num_return_sequences=1,
            do_sample=False,
            temperature=0.1,
        )
        is_correct_str = correctness_output[0]['generated_text'].strip().lower()
        is_correct = ("true" in is_correct_str) # Boolean check
        print(f"Correctness status for '{question}': {is_correct_str} -> {is_correct}") # Debugging


        # --- Step 3 of Evaluation: Generate detailed feedback ---
        feedback_prompt = (
            f"As an expert tutor, provide detailed feedback for the student's answer. "
            f"DO NOT repeat the question, correct answer, or student's answer in your feedback. "
            f"Question: {question}\n"
            f"Correct Answer: {ground_truth_answer}\n"
            f"Student's Answer: {student_answer}\n"
            f"Status: {'Correct' if is_correct else 'Incorrect'}\n"
            "Explain why the student's answer is correct/incorrect, "
            "and if incorrect, suggest specific improvements or clarify misconceptions. "
            "Keep the feedback concise and helpful."
        )
        feedback_output = llm_pipeline(
            feedback_prompt,
            max_length=250, # Allow for detailed feedback
            num_return_sequences=1,
            do_sample=True,
            temperature=0.7, # Slightly less creative for consistent feedback
            top_k=50,
            top_p=0.95
        )
        ai_feedback_message = feedback_output[0]['generated_text'].strip()
        print(f"AI Feedback for '{question}': {ai_feedback_message}") # Debugging

        # --- Final cleanup of feedback message ---
        # Remove any lingering input phrases just in case the LLM still includes them
        ai_feedback_message = re.sub(r"Correct Answer:.*?(?=\n|$)", "", ai_feedback_message, flags=re.DOTALL | re.IGNORECASE).strip()
        ai_feedback_message = re.sub(r"Student's Answer:.*?(?=\n|$)", "", ai_feedback_message, flags=re.DOTALL | re.IGNORECASE).strip()
        ai_feedback_message = re.sub(r"Question:.*?(?=\n|$)", "", ai_feedback_message, flags=re.DOTALL | re.IGNORECASE).strip()
        ai_feedback_message = re.sub(r"Status:.*?(?=\n|$)", "", ai_feedback_message, flags=re.DOTALL | re.IGNORECASE).strip()
        ai_feedback_message = re.sub(r"^[.,:;!?\s|]+", "", ai_feedback_message).strip() # Clean leading punctuation

        # Fallback if feedback is too generic after cleaning
        if len(ai_feedback_message) < 10:
            ai_feedback_message = f"Feedback: Your answer was {'correct' if is_correct else 'incorrect'}. The correct answer is: {ground_truth_answer}."


        return jsonify({
            "is_correct": is_correct,
            "ai_feedback": ai_feedback_message,
            "correct_answer": ground_truth_answer
        })

    except Exception as e: # This 'except' block is now correctly aligned with 'try'
        print(f"Error during answer evaluation: {e}") # Debugging: Print backend errors
        return jsonify({"error": f"Error during AI evaluation: {str(e)}"}), 500

@app.route('/')
def home():
    return "Hello Subashree! Your ScoreUp AI backend is running!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
             