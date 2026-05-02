"""
Test Generator Service (v2 - Fixed JSON Truncation)
=====================================================
Generates adaptive technical tests using LLM.
Creates multiple-choice questions with varying difficulty levels.

v2 FIX:
- Generate 5 questions per batch, call twice → merge (avoids LLM truncation on 10q)
- Robust JSON recovery: tries partial parse, fragment detection, fallback
- Strict validation: ensure all questions have exactly 4 options + valid correct_answer_index

Author: AI Career Advisor System
"""

import logging
import json
import re
from typing import Dict, List, Optional
from services.llm_service import LLMService

logger = logging.getLogger(__name__)


class TestGenerator:
    """
    Generates technical assessment tests using LLM.
    v2: Generates in 2 batches of 5 to avoid JSON truncation.
    """

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm = llm_service or LLMService()

    def _build_prompt(self, domain: str, difficulty: str, num_questions: int, start_number: int = 1) -> str:
        """Build a concise, well-constrained prompt for the LLM."""
        return f"""You are a Senior Technical Interviewer. Generate exactly {num_questions} unique multiple-choice questions for a {difficulty} level technical assessment on "{domain}".

STRICT RULES:
- Each question must have EXACTLY 4 options (A, B, C, D).
- correct_answer_index must be 0, 1, 2, or 3 (index of the correct option in the options array).
- explanation: brief 2-sentence technical explanation of the correct answer.
- tags: 1-2 relevant topic tags.
- Return ONLY a valid JSON object. No extra text before or after.

JSON FORMAT:
{{
  "questions": [
    {{
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer_index": 1,
      "explanation": "Option B is correct because... This is important because...",
      "tags": ["topic-tag"]
    }}
  ]
}}

Generate questions {start_number} to {start_number + num_questions - 1} now:"""

    def _extract_json_questions(self, text: str) -> List[Dict]:
        """
        Robustly extract questions array from LLM response.
        Handles truncated JSON by finding complete question objects.
        """
        text = text.strip()

        # Strategy 1: Direct JSON parse
        try:
            # Clean markdown code fences
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].strip()

            data = json.loads(text)
            if "questions" in data and isinstance(data["questions"], list):
                return data["questions"]
        except json.JSONDecodeError:
            pass

        # Strategy 2: Find the questions array and recover complete objects
        try:
            # Find the questions array start
            q_match = re.search(r'"questions"\s*:\s*\[', text)
            if q_match:
                array_start = q_match.end() - 1
                # Extract individual complete question objects
                questions = self._extract_complete_objects(text[array_start:])
                if questions:
                    logger.warning(f"⚠️ [TestGenerator] Recovered {len(questions)} questions via fragment extraction")
                    return questions
        except Exception as e:
            logger.error(f"Strategy 2 failed: {e}")

        # Strategy 3: Regex-based question extraction (last resort)
        try:
            questions = []
            # Find all {"text": ...} objects
            pattern = r'\{[^{}]*?"text"\s*:\s*"[^"]+?"[^{}]*?\}'
            matches = re.finditer(pattern, text, re.DOTALL)
            for m in matches:
                try:
                    q = json.loads(m.group())
                    if "text" in q and "options" in q:
                        questions.append(q)
                except:
                    pass
            if questions:
                return questions
        except Exception as e:
            logger.error(f"Strategy 3 failed: {e}")

        return []

    def _extract_complete_objects(self, array_text: str) -> List[Dict]:
        """Extract complete JSON objects from a potentially truncated array."""
        objects = []
        depth = 0
        start = None

        for i, ch in enumerate(array_text):
            if ch == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0 and start is not None:
                    candidate = array_text[start:i + 1]
                    try:
                        obj = json.loads(candidate)
                        objects.append(obj)
                    except:
                        pass
                    start = None

        return objects

    def _validate_question(self, q: Dict) -> bool:
        """Validate question has all required fields and correct types."""
        if not q.get("text") or not isinstance(q.get("text"), str):
            return False
        if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
            return False
        correct_idx = q.get("correct_answer_index")
        if not isinstance(correct_idx, int) or correct_idx not in [0, 1, 2, 3]:
            return False
        return True

    def generate_test(
        self,
        domain: str,
        difficulty: str = "Medium",
        num_questions: int = 10,
        subtopics: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a structured test with robust JSON handling.

        v2 Strategy: Generate in batches of 5 to avoid LLM truncation.
        Each batch has a focused, short prompt that keeps JSON small.

        Args:
            domain: Subject domain (e.g., "React.js", "Python")
            difficulty: "Easy", "Medium", or "Hard"
            num_questions: Number of questions to generate (default 10)

        Returns:
            Dictionary containing the test structure
        """
        logger.info(f"📝 [TestGenerator] Generating {num_questions}x {difficulty} questions for {domain}")

        all_questions = []
        batch_size = 5
        max_attempts = (num_questions // batch_size) + 3 # Extra attempts for failures

        attempt = 0
        start_num = 1

        while len(all_questions) < num_questions and attempt < max_attempts:
            current_batch_size = min(batch_size, num_questions - len(all_questions))
            
            logger.info(f"🔄 [TestGenerator] Attempt {attempt + 1}/{max_attempts}: asking for {current_batch_size} questions")

            prompt = self._build_prompt(domain, difficulty, current_batch_size, start_num)
            messages = [{"role": "user", "content": prompt}]

            try:
                response_text = self.llm.get_chat_response(messages)
                batch_questions = self._extract_json_questions(response_text)

                # Validate each question
                valid_questions = [q for q in batch_questions if self._validate_question(q)]

                if len(valid_questions) < current_batch_size:
                    logger.warning(
                        f"⚠️ [TestGenerator] Attempt {attempt + 1}: Expected {current_batch_size}, "
                        f"got {len(valid_questions)} valid questions"
                    )

                all_questions.extend(valid_questions)
                start_num += len(valid_questions)
                
                logger.info(f"✅ [TestGenerator] Attempt {attempt + 1}: Added {len(valid_questions)} questions (total: {len(all_questions)})")

            except Exception as e:
                logger.error(f"❌ [TestGenerator] Attempt {attempt + 1} failed: {e}")

            attempt += 1

        if not all_questions:
            logger.error("❌ [TestGenerator] All attempts failed. Yielding fallback test.")
            return self._generate_fallback_test(domain, difficulty, num_questions)

        # Cap to requested number
        final_questions = all_questions[:num_questions]

        logger.info(f"✅ [TestGenerator] Final: {len(final_questions)} questions for {domain}")

        return {
            "title": f"{domain} Technical Assessment ({difficulty})",
            "domain": domain,
            "difficulty": difficulty,
            "questions": final_questions,
            "total_questions": len(final_questions)
        }

    def _generate_fallback_test(self, domain: str, difficulty: str, num_questions: int) -> Dict:
        """
        Provides a static, perfectly formatted fallback test when AI is entirely unreachable.
        """
        fallback_questions = [
            {
                "text": f"Which of the following describes the primary purpose of state management in {domain} applications?",
                "options": [
                    "To style the user interface components.",
                    "To maintain and synchronize mutable data across the application lifecycle.",
                    "To handle direct database connectivity and ORM migrations.",
                    "To compress static assets during the build process."
                ],
                "correct_answer_index": 1,
                "explanation": "State management is crucial for maintaining data consistency across different components of an application without prop-drilling or tightly coupling data flows.",
                "tags": ["state-management", "architecture"]
            },
            {
                "text": f"What is the most effective way to optimize performance when rendering large lists in a {domain} application?",
                "options": [
                    "Render all items simultaneously using synchronous DOM updates.",
                    "Store all list data in local storage before rendering.",
                    "Use virtualized lists (windowing) to only render elements currently visible in the viewport.",
                    "Disable JavaScript minification in production."
                ],
                "correct_answer_index": 2,
                "explanation": "List virtualization is a well-known paradigm that dramatically reduces DOM nodes by unloading items outside the scroll window.",
                "tags": ["performance", "optimization"]
            },
            {
                "text": f"When implementing secure authentication in a {domain} backend, which approach is considered best practice?",
                "options": [
                    "Storing plain-text passwords in a high-speed NoSQL database.",
                    "Using MD5 hashing without salt for faster login validation.",
                    "Relying solely on frontend validation for checking user roles.",
                    "Hashing passwords with a slow algorithm like bcrypt/Argon2 and using secure, HttpOnly session cookies."
                ],
                "correct_answer_index": 3,
                "explanation": "Bcrypt provides strong defense against rainbow table attacks through salting and variable workload factors. HttpOnly cookies prevent XSS theft.",
                "tags": ["security", "authentication"]
            },
             {
                "text": f"Which principle is central to the concept of Continuous Integration (CI) in {domain} engineering?",
                "options": [
                    "Deploying code strictly once per quarter.",
                    "Developers merging code into a central repository multiple times a day, triggering automated builds.",
                    "Waiting for the QA team to manually sign off before merging any branches.",
                    "Skipping unit tests to speed up the delivery pipeline."
                ],
                "correct_answer_index": 1,
                "explanation": "CI relies on frequent, automated integration and testing to detect conflicts and breakages as early as possible.",
                "tags": ["devops", "ci-cd"]
            },
             {
                "text": f"What characterizes a 'pure function' in functional {domain} programming?",
                "options": [
                    "It mutates external variables to save memory.",
                    "It always returns the same output for the same input and has no side-effects.",
                    "It cannot take any arguments.",
                    "It must be written as a class method."
                ],
                "correct_answer_index": 1,
                "explanation": "Pure functions provide predictable, highly testable code blocks because their output strictly maps to their input parameters without altering external state.",
                "tags": ["functional-programming", "core-concepts"]
            }
        ]

        # Duplicate or slice fallback questions to match requested number
        questions = []
        for i in range(num_questions):
            q = fallback_questions[i % len(fallback_questions)].copy()
            # Slightly obfuscate duplicates if requested number is > 5
            if i >= len(fallback_questions):
                q["text"] = q["text"].replace(domain, f"{domain} (Advanced)")
            questions.append(q)

        return {
            "title": f"{domain} Technical Assessment ({difficulty})",
            "domain": domain,
            "difficulty": difficulty,
            "questions": questions,
            "total_questions": len(questions)
        }
