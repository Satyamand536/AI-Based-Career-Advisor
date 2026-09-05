"""
Resume Classification Service - Enhanced Version
=================================================
Stage 1 of the Recommendation Pipeline.
Classifies resumes into job categories with probabilities using SBERT embeddings.

Features:
- Comprehensive job category definitions
- Semantic similarity-based classification
- Temperature-scaled softmax for sharper distinctions
- Integration with EmbeddingService for consistency

Author: AI Career Advisor System
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class ClassifierService:
    """
    Resume Classification using semantic similarity.
    
    Uses SBERT embeddings to compare resumes against category prototypes,
    producing a probability distribution over job categories.
    
    This enables:
    - Filtering irrelevant jobs (Non-Technical profiles)
    - Boosting category-aligned jobs
    - Providing career direction insights
    """
    
    TECHNICAL_KEYWORDS = {
        "engineer", "developer", "architect", "designer", "ux", "ui", "web",
        "seo", "cloud", "ai", "data", "python", "frontend", "backend",
        "iot", "blockchain", "qa", "test", "devops", "systems", "embedded",
        "firmware", "robotics", "edge", "sensor", "protocol", "smart", "contract",
        "solidity", "web3", "crypto", "machine", "analytics", "nl", "computer",
        "vision", "llm", "platform", "reliability", "infrastructure", "sre",
        "platform", "cyber", "security", "penetration", "hacking", "vulnerability",
        "interface", "interaction", "information", "technologist", "accessibility",
        "systems", "product", "mobile", "ios", "android", "deployment", "pipeline",
        "automation", "performance", "sdet", "network", "platform", "growth",
        "technologist", "prompt", "evaluator", "devrel", "advocate", "api", "sdk",
        "simulation", "digital", "twin"
    }

    TECHNICAL_SKILLS = {
        "python", "java", "javascript", "react", "node", "php", "angular", "vue",
        "html", "css", "sql", "aws", "docker", "kubernetes", "git", "bash",
        "figma", "sketch", "xd", "solidity", "rust", "go", "golang", "c", "c++",
        "flutter", "kotlin", "swift", "terraform", "ansible", "jenkins"
    }

    CATEGORY_PROTOTYPES = {
        # 1. DESIGN + UI/UX TECH ROLES
        "UI/UX Designer": (
            "UI Designer UX Designer Product Designer Interaction Designer Interface Designer "
            "UX Researcher UX Architect Information Architect Design Technologist UX Engineer "
            "UI Developer Frontend Designer Web Designer Visual Designer Experience Designer XD "
            "Design Systems Engineer Accessibility Designer Design Engineering Figma Sketch Adobe XD "
            "InVision Prototyping Wireframing User Research Layout Design Micro-Interactions"
        ),

        # 2. WEB & SOFTWARE DEVELOPMENT ROLES
        "Software Developer": (
            "Python Developer Java Developer JavaScript Developer React Developer Node.js Developer "
            "PHP Developer .NET Developer Angular Developer Vue Developer Frontend Engineer "
            "Backend Engineer Full Stack Developer Web Engineer Web Administrator Webmaster "
            "Application Developer Software Engineer Programming Server Knowledge Coding"
        ),

        # 3. DATA / AI / ANALYTICS ROLES
        "Data & AI Engineer": (
            "Data Scientist Data Analyst Data Engineer BI Engineer Analytics Engineer "
            "Machine Learning Engineer AI Engineer NLP Engineer Computer Vision Engineer "
            "LLM Engineer AI Research Engineer Data Platform Engineer Statistical Analysis "
            "Python Pandas NumPy Scikit-learn TensorFlow PyTorch Deep Learning Neural Networks"
        ),

        # 4. TESTING / QA / PERFORMANCE ROLES
        "QA Engineer": (
            "QA Engineer Automation Tester Performance Engineer Test Engineer SDET "
            "Reliability Engineer Quality Assurance Software Testing Selenium Cypress Playwright "
            "Appium Mobile Testing JUnit PyTest API Testing Regression Testing E2E Testing"
        ),

        # 5. CLOUD / NETWORK / SYSTEM ROLES
        "Cloud & Systems": (
            "Network Engineer Systems Engineer Cloud Engineer Cloud Developer Cloud Architect "
            "Network Architect DevOps Engineer Platform Engineer Infrastructure Engineer "
            "Site Reliability Engineer AWS Azure GCP Kubernetes Docker CI/CD Terraform"
        ),

        # 6. SEO / MARKETING TECH ROLES
        "Marketing Technologist": (
            "SEO Engineer Technical SEO Specialist Search Engineer Web Analytics Engineer "
            "Growth Engineer Marketing Technologist Website Systems Analytics Web Performance"
        ),

        # 7. IOT / EMBEDDED / HARDWARE
        "IoT & Embedded": (
            "IoT Engineer Embedded Software Engineer Firmware Developer Robotics Engineer "
            "Edge AI Engineer Sensor Software Engineer Microcontrollers RTOS C C++ "
            "Arduino Raspberry Pi Embedded Systems Hardware Automation"
        ),

        # 8. BLOCKCHAIN / WEB3 ROLES
        "Blockchain Developer": (
            "Blockchain Developer Smart Contract Engineer Solidity Developer Web3 Engineer "
            "Crypto Protocol Engineer DeFi NFT Ethereum Web3.js Ethers.js DApps Cryptography"
        ),

        # 9. ADVANCED DESIGN + FRONTEND HYBRID
        "Design Engineer": (
            "Motion UI Designer Design Engineer Frontend Architect UX Engineer Interaction Engineer "
            "Human-Computer Interaction Engineer UX Engineering Design Coding Hybrid Role"
        ),

        # 10. EMERGING & NICHE TECH
        "Emerging Tech": (
            "Prompt Engineer AI Evaluator DevRel Engineer Developer Advocate API Designer "
            "SDK Engineer Simulation Engineer Digital Twin Engineer Specialized Engineering"
        ),

        "Non-Technical": (
            "Non-Technical Sales Marketing Human Resources HR Recruitment Finance Accounting "
            "Administration Office Management Customer Service Support Executive Assistant "
            "Content Writing Copywriting Social Media Manager Digital Marketing SEO "
            "Business Development Account Manager Project Coordinator Operations Manager "
            "Teaching Education Training Legal Compliance Healthcare Medical Arts Creative "
            "Music Photography Video Editing Journalism Broadcasting Public Relations"
        )
    }
    
    CONFIDENCE_THRESHOLDS = {
        "high": 0.35,
        "medium": 0.20,
        "low": 0.10
    }
    
    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        """
        Initialize the classifier service.
        
        Args:
            embedding_service: Optional EmbeddingService instance. If not provided,
                              creates a new one with default settings.
        """
        logger.info("🧠 [ClassifierService] Initializing classifier...")
        
        self.embedding_service = embedding_service or EmbeddingService()
        
        self.category_names = list(self.CATEGORY_PROTOTYPES.keys())
        self.category_texts = list(self.CATEGORY_PROTOTYPES.values())
        
        logger.info("⚙️ [ClassifierService] Pre-computing category embeddings...")
        self.category_embeddings = np.array(
            self.embedding_service.embed_batch(self.category_texts)
        )
        
        logger.info(f"✅ [ClassifierService] Ready with {len(self.category_names)} categories")
    
    def predict(
        self, 
        text: str, 
        temperature: float = 3.0,
        top_k: Optional[int] = None
    ) -> Dict[str, float]:
        """
        Predict probability distribution over job categories.
        
        Uses cosine similarity between the input text and category prototypes,
        then applies temperature-scaled softmax to produce probabilities.
        
        Args:
            text: Input resume/profile text
            temperature: Softmax temperature for sharpening distribution (higher = sharper)
            top_k: If set, return only top K categories
            
        Returns:
            Dictionary mapping category names to probabilities, sorted descending
        """
        if not text or not text.strip():
            logger.warning("⚠️ [ClassifierService] Empty input text")
            return {cat: 0.0 for cat in self.category_names}
        
        resume_embedding = self.embedding_service.embed(text)
        if resume_embedding is None:
            logger.error("❌ [ClassifierService] Failed to generate embedding")
            return {cat: 0.0 for cat in self.category_names}
        
        resume_tensor = resume_embedding.reshape(1, -1)
        
        from sklearn.metrics.pairwise import cosine_similarity
        cosine_scores = cosine_similarity(resume_tensor, self.category_embeddings)[0]
        
        scaled_scores = cosine_scores * temperature
        exp_scores = np.exp(scaled_scores - np.max(scaled_scores))
        probabilities = exp_scores / np.sum(exp_scores)
        
        result = {}
        for i, name in enumerate(self.category_names):
            result[name] = float(probabilities[i])
        
        result = dict(sorted(result.items(), key=lambda x: x[1], reverse=True))
        
        if top_k:
            result = dict(list(result.items())[:top_k])
        
        return result
    
    def is_technical(self, text: str) -> bool:
        """
        Hard-keyword and skill-based technicality detection (CTO-grade).
        """
        if not text:
            return False
        
        text_lower = text.lower()
        
        # 1. Check Keywords
        for kw in self.TECHNICAL_KEYWORDS:
            if kw in text_lower:
                return True
                
        # 2. Check Skills (exact word match for better precision)
        import re
        for skill in self.TECHNICAL_SKILLS:
            pattern = rf"\b{re.escape(skill)}\b"
            if re.search(pattern, text_lower):
                return True
                
        return False

    def predict_with_confidence(
        self, 
        text: str
    ) -> Tuple[Dict[str, float], str, bool]:
        """
        Predict categories with confidence assessment and hybrid technicality check.
        
        Args:
            text: Input resume/profile text
            
        Returns:
            Tuple of (probabilities, confidence_level, is_technical)
        """
        probs = self.predict(text)
        
        if not probs:
            return probs, "none", False
        
        top_category = list(probs.keys())[0]
        top_prob = probs[top_category]
        
        # HYBRID LOGIC: Semantic + Hard Check
        semantic_is_technical = top_category != "Non-Technical"
        keyword_is_technical = self.is_technical(text)
        
        # If either logic says it's technical, we treat it as technical
        is_technical_final = semantic_is_technical or keyword_is_technical
        
        if top_prob >= self.CONFIDENCE_THRESHOLDS["high"]:
            confidence = "high"
        elif top_prob >= self.CONFIDENCE_THRESHOLDS["medium"]:
            confidence = "medium"
        else:
            confidence = "low"
        
        # Boost confidence if it's a hard keyword match
        if keyword_is_technical and confidence != "high":
            confidence = "medium"
            
        return probs, confidence, is_technical_final
    
    def get_top_categories(
        self, 
        text: str, 
        n: int = 3,
        exclude_non_technical: bool = False
    ) -> List[Tuple[str, float]]:
        """
        Get the top N predicted categories.
        
        Args:
            text: Input text
            n: Number of categories to return
            exclude_non_technical: Whether to exclude Non-Technical category
            
        Returns:
            List of (category, probability) tuples
        """
        probs = self.predict(text)
        
        if exclude_non_technical:
            probs = {k: v for k, v in probs.items() if k != "Non-Technical"}
        
        sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        return sorted_probs[:n]
    
    def get_embedding(self, text: str) -> Optional[np.ndarray]:
        """
        Get embedding for text using the shared embedding service.
        
        Args:
            text: Input text
            
        Returns:
            Embedding array or None
        """
        return self.embedding_service.embed(text)
    
    def get_category_names(self) -> List[str]:
        """Return list of all category names."""
        return self.category_names.copy()
    
    def get_technical_categories(self) -> List[str]:
        """Return list of technical category names only."""
        return [cat for cat in self.category_names if cat != "Non-Technical"]
    
    def predict_stage(self, profile: Dict) -> str:
        """
        Classify user into SaaS stages: NO, MORE, GOOD, WORK.
        
        Logic based on experience and skill density.
        
        Stages:
        - NO (Not Ready): < 1 year exp, low skill count
        - MORE (Needs Improvement): 1-3 years exp, moderate skills
        - GOOD (Job Ready): 3-5 years exp, good skill set
        - WORK (Expert/Working): > 5 years exp, high skill density
        """
        # Type safety: handle possible string inputs for calculations
        try:
            experience_years = int(profile.get("experience_years", 0))
        except (ValueError, TypeError):
            experience_years = 0
            
        skills = profile.get("skills", [])
        if isinstance(skills, str):
            skills = skills.split(",")
            
        skill_count = len(skills)
        
        # Heuristic Logic
        if experience_years < 1 and skill_count < 5:
            return "NO"
        
        if experience_years < 3:
            # Junior level
            if skill_count > 8:
                return "MORE" # Has skills but needs experience/polish
            return "MORE"
            
        if experience_years < 5:
            # Mid level
            if skill_count > 5:
                return "GOOD"
            return "MORE"
            
        # Senior level
        if skill_count > 5:
            return "WORK"
            
        return "GOOD"
