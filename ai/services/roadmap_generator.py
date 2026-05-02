"""
Roadmap Generator Service
==========================
Generates personalized learning roadmaps using LLM.
Uses the LLMService to create detailed, step-by-step learning paths.

Features:
- Personalized to user's current level and goals
- Weekly breakdowns
- Resource recommendations
- Project ideas

Author: AI Career Advisor System
"""

import logging
import json
import random
from typing import Dict, List, Optional
from services.llm_service import LLMService
from services.career_path_analyzer import CareerPathAnalyzer

logger = logging.getLogger(__name__)

class RoadmapGenerator:
    """
    Generates detailed learning roadmaps using LLM.
    """
    
    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm = llm_service or LLMService()
        self.path_analyzer = CareerPathAnalyzer()

    def generate_roadmap(
        self, 
        profile: Dict, 
        goal: str, 
        duration_weeks: int = 12,
        hours_per_week: int = 10
    ) -> Dict:
        """
        Generate a structured, professional-grade career roadmap.
        """
        if not goal:
            goal = "Career Advancement"
        
        skills = ", ".join(profile.get("skills", [])[:30])
        experience_years = profile.get("experience_years", 0)
        current_role = profile.get("role", "Student/Learner")
        
        skills_list = profile.get("skills", [])
        experience_details = []
        if "experience" in profile and isinstance(profile["experience"], list):
            for exp in profile["experience"]:
                desc = exp.get("description", "")[:200]
                experience_details.append(f"Role: {exp.get('title')}, Context: {desc}")
        
        experience_context = "\n".join(experience_details)
        
        prompt = f"""
        Act as an Elite Principal Software Architect and CTO (Top 0.1% Industry Expert). 
        Your task is to craft a hyper-personalized, "Placement-Ready" career roadmap for: '{goal}'.
        
        This roadmap MUST be tailored to the user's SPECIFIC RESUME context provided below.
        
        RESUME CONTEXT (EXTRACTED):
        - Current Role: {current_role}
        - Years of Experience: {experience_years}
        - Key Skills: {", ".join(skills_list)}
        - Past Experience & Projects:
        {experience_context}
        
        STRUCTURE REQUIREMENTS (STRICT 3-LEVEL PROGRESSION):
        1. LEVEL 1 — Foundations: Core syntax, basic architecture, and essential tooling.
        2. LEVEL 2 — Intermediate Skills: Project-based learning, debugging patterns, and common interview traps.
        3. LEVEL 3 — Advanced / Placement Ready: Production architecture, scalability, HR + Technical prep.

        EACH STEP (WEEK) MUST INCLUDE:
        - Topic: Precise technical focus.
        - Why it Matters: Real-world industry reasoning.
        - Practical Task: A specific project or challenge to build.
        - Interview Question: An example question with a focus on candidate evaluation.
        
        OUTPUT FORMAT (STRICT JSON):
        {{
            "goal": "Professional Industry Title",
            "timeline": "Level-by-Level Growth Strategy",
            "summary": "CTO's strategy for this specific career climb.",
            "phases": [
                {{
                    "level": 1,
                    "name": "Foundations",
                    "duration": "Duration",
                    "weeks": [
                        {{
                            "week_number": 1,
                            "topic": "Specific Topic",
                            "why_it_matters": "Context",
                            "daily_tasks": ["Day 1...", "Day 2..."],
                            "practical_task": "What to build",
                            "interview_question": "Example question",
                            "resources": [{{ "title": "Resource", "url": "Link", "type": "Doc" }}]
                        }}
                    ]
                }},
                {{ "level": 2, "name": "Intermediate Skills", "weeks": [...] }},
                {{ "level": 3, "name": "Placement Ready", "weeks": [...] }}
            ],
            "milestone_project": {{
                "title": "Resume-Defining Architectural Project",
                "description": "Complex production-ready project.",
                "tech_stack": ["Industry Standards"]
            }}
        }}
        
        CRITICAL: Each phase object MUST contain a "level" field (int: 1, 2, or 3).
        """
        
        messages = [{"role": "user", "content": prompt}]
        
        try:
            response_text = self.llm.get_chat_response(messages)
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            # Handle cases where LLM prefixes text before JSON
            if not response_text.startswith("{") and "{" in response_text:
                response_text = "{" + response_text.split("{", 1)[1]
            if not response_text.endswith("}") and "}" in response_text:
                response_text = response_text.rsplit("}", 1)[0] + "}"
            
            roadmap_json = json.loads(response_text)
            
            # CRITICAL: Post-process to guarantee structure
            roadmap_json = self._post_process_roadmap(roadmap_json, goal)
            return roadmap_json
            
        except Exception as e:
            logger.error(f"[RoadmapGenerator] Failed to generate AI roadmap: {e}")
            return self._generate_fallback_roadmap(profile, goal, duration_weeks)

    def _post_process_roadmap(self, roadmap: Dict, goal: str) -> Dict:
        """
        Deterministic post-processing to guarantee Level 1/2/3 structure.
        This runs AFTER LLM response to fill any missing fields.
        """
        LEVEL_NAMES = {1: "Foundations", 2: "Intermediate Skills", 3: "Placement Ready"}
        
        phases = roadmap.get("phases", [])
        
        # Ensure exactly 3 phases with level field
        for i, phase in enumerate(phases):
            level = i + 1
            if "level" not in phase:
                phase["level"] = level
            if "name" not in phase:
                phase["name"] = LEVEL_NAMES.get(level, f"Level {level}")
            if "duration" not in phase:
                phase["duration"] = "Self-paced"
            
            # Ensure each week has the required fields
            for week in phase.get("weeks", []):
                if "why_it_matters" not in week:
                    week["why_it_matters"] = f"Essential for mastering {week.get('topic', goal)} at industry level."
                if "practical_task" not in week:
                    week["practical_task"] = f"Build a mini-project demonstrating {week.get('topic', 'this concept')}."
                if "interview_question" not in week:
                    week["interview_question"] = f"Explain how {week.get('topic', 'this concept')} works in a production environment."
        
        # If fewer than 3 phases, pad
        while len(phases) < 3:
            level = len(phases) + 1
            phases.append({
                "level": level,
                "name": LEVEL_NAMES.get(level, f"Level {level}"),
                "duration": "Self-paced",
                "weeks": []
            })
        
        roadmap["phases"] = phases[:3]  # Cap at 3
        
        if "goal" not in roadmap:
            roadmap["goal"] = goal
        if "timeline" not in roadmap:
            roadmap["timeline"] = "3-Level Progressive Growth Strategy"
            
        return roadmap

    def _generate_fallback_roadmap(self, profile: Dict, goal: str, weeks: int) -> Dict:
        """
        Generate a high-quality statistical roadmap when AI is unavailable.
        Uses pure logic and career graph data. Now includes Level 1/2/3 structure.
        """
        logger.info(f"[RoadmapGenerator] Generating high-quality fallback roadmap for '{goal}'")
        
        # Get category and skills
        skills = profile.get("skills", [])
        
        # Determine path steps using analyzer
        paths = self.path_analyzer.get_career_paths(goal, profile.get("experience_years", 0), skills, target_category=goal)

        # Select best matching path or use default
        selected_path = paths[0] if paths else None
        
        LEVEL_NAMES = {1: "Foundations", 2: "Intermediate Skills", 3: "Placement Ready"}
        
        phases = []
        if selected_path:
            for i, step in enumerate(selected_path["steps"][:3]):
                level = i + 1
                phase_weeks = []
                for w in range(1, 4):
                    week_num = i*3 + w
                    skills_focus = ', '.join(step.get('skills_to_develop', ['Core Patterns'])[:2])
                    phase_weeks.append({
                        "week_number": week_num,
                        "topic": f"Mastering {step['role']} Core Concepts",
                        "why_it_matters": f"Industry demands strong {step['role']} foundations for production-grade systems.",
                        "daily_tasks": [
                            f"Day 1: Theoretical foundation in {step['role']}",
                            f"Day 2: Implementing practical project for {step['role']}",
                            f"Day 3-5: Deep dive into {skills_focus}",
                            "Day 6: Knowledge check and Review"
                        ],
                        "practical_task": f"Build a {step['role']} component using {skills_focus}.",
                        "interview_question": f"How would you architect a {step['role']} solution for a high-traffic system?",
                        "resources": [
                            {"title": f"Intro to {step['role']}", "type": "Documentation", "url": "Official Docs"},
                            {"title": f"{step['role']} Interview Guide", "type": "Article", "url": "GitHub / Medium"}
                        ]
                    })
                
                phases.append({
                    "level": level,
                    "name": LEVEL_NAMES.get(level, f"Level {level}"),
                    "duration": f"Week {i*3 + 1}-{(i+1)*3}",
                    "weeks": phase_weeks
                })
        
        # Pad to 3 phases if needed
        while len(phases) < 3:
            level = len(phases) + 1
            phases.append({
                "level": level,
                "name": LEVEL_NAMES.get(level, f"Level {level}"),
                "duration": "Self-paced",
                "weeks": [{
                    "week_number": 1,
                    "topic": f"Advanced {goal} Mastery",
                    "why_it_matters": f"Prepares you for {goal} roles at top companies.",
                    "daily_tasks": ["Deep study of advanced patterns", "Portfolio project work"],
                    "practical_task": f"Build a production-ready {goal} portfolio project.",
                    "interview_question": f"Design a scalable architecture for a {goal} system.",
                    "resources": []
                }]
            })

        return {
            "goal": goal,
            "timeline": f"{weeks} Weeks Career Transition Path",
            "summary": f"Structured path from current skills to {goal} through 3 progressive levels.",
            "phases": phases[:3],
            "milestone_project": {
                "title": f"The Ultimate {goal} Portfolio",
                "description": "Build a multi-component project demonstrating your readiness for this role.",
                "tech_stack": skills[:5] if skills else ["Industry Standards"]
            },
            "is_ai_fallback": True
        }
