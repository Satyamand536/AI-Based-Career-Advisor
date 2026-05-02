"""
Resume Parser Service
Extracts skills, experience, education, and contact info from PDF/DOCX resumes
"""

import re
from typing import Dict, List, Any
import PyPDF2
from docx import Document
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def extract_email(text: str) -> str:
    """Extract email address using regex"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else ""


def extract_phone(text: str) -> str:
    """Extract phone number (Indian/International format)"""
    phone_patterns = [
        r'\+91[-\s]?\d{10}',
        r'\(91\)[-\s]?\d{10}',
        r'\b\d{10}\b',
        r'\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b',
        r'\+\d{1,3}[-\s]?\d{10}'
    ]
    
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def extract_name(text: str) -> str:
    """
    Extract name from resume (heuristic approach)
    Usually the first line or first capitalized words
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    for line in lines[:10]:  # Check first 10 non-empty lines
        # Name is likely 2-4 words, all capitalized or title case, no numbers/special chars
        words = line.split()
        if 2 <= len(words) <= 4 and all(word[0].isupper() and word.isalpha() for word in words):
            return line
    return "Unknown Candidate"


def extract_skills(text: str) -> List[str]:
    """
    Extract skills using keyword matching
    Checks for common tech skills (case-insensitive)
    """
    text_lower = text.lower()
    
    # Comprehensive skill keyword list
    skill_keywords = [
        # Frontend
        "react", "angular", "vue", "svelte", "nextjs", "gatsby", "remix",
        "html", "css", "javascript", "typescript", "jsx", "ajax", "jquery",
        "tailwind", "bootstrap", "sass", "less", "material ui", "chakra ui",
        
        # Backend
        "node", "nodejs", "express", "nest", "fastify",
        "python", "flask", "django", "fastapi", "pyramid",
        "java", "spring", "springboot", "hibernate", "maven", "gradle",
        "php", "laravel", "symfony", "codeigniter",
        "ruby", "rails", "golang", "go", "rust",
        "c#", ".net", "asp.net", "entity framework",
        
        # Database
        "mongodb", "mysql", "postgresql", "postgres", "sqlite",
        "redis", "elasticsearch", "cassandra", "dynamodb", "couchdb",
        "oracle", "mssql", "firebase", "supabase", "prisma", "mongoose",
        
        # DevOps & Cloud
        "aws", "azure", "gcp", "google cloud", "heroku", "digitalocean",
        "docker", "kubernetes", "k8s", "jenkins", "github actions", "gitlab ci",
        "terraform", "ansible", "chef", "puppet", "nginx", "apache",
        "linux", "bash", "shell", "powershell",
        
        # AI/ML/Data
        "machine learning", "deep learning", "ai", "nlp", "computer vision",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
        "matplotlib", "seaborn", "opencv", "yolo", "transformers", "huggingface",
        "spark", "hadoop", "kafka", "airflow", "tableau", "power bi",
        
        # Mobile
        "react native", "flutter", "dart", "kotlin", "swift", "ios", "android",
        
        # Testing
        "jest", "mocha", "chai", "cypress", "selenium", "junit", "pytest",
        
        # Tools & Methodologies
        "git", "github", "gitlab", "bitbucket", "jira", "trello",
        "agile", "scrum", "kanban", "waterfall", "sdlc",
        "rest api", "graphql", "grpc", "websocket", "microservices"
    ]
    
    found_skills = set()
    for skill in skill_keywords:
        # Use word boundaries to avoid partial matches (e.g., 'go' in 'google')
        # Escape special chars in skill name
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.add(skill)
            
    return list(found_skills)


def extract_education(text: str) -> List[Dict[str, str]]:
    """
    Extract education details (Degree, Institution)
    """
    text_lower = text.lower()
    education_entries = []
    
    # Degrees to look for
    degrees = [
        "b.tech", "b.be", "b.sc", "b.com", "bca", "bba",
        "m.tech", "m.e", "m.sc", "m.com", "mca", "mba",
        "phd", "bachelor", "master", "diploma"
    ]
    
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line_lower = line.lower()
        for degree in degrees:
            if degree in line_lower:
                # Heuristic: line containing degree might be the entry
                # Try to also find year (e.g., 2018-2022)
                year_match = re.search(r'\b(20\d{2})\b', line)
                year = year_match.group(0) if year_match else "Unknown"
                
                # Check next line for potential college name if line is short
                institution = line.strip()
                if len(line.split()) < 4 and i + 1 < len(lines):
                    institution += " - " + lines[i+1].strip()
                    
                education_entries.append({
                    "degree": degree.upper(),
                    "institution": institution,
                    "year": year
                })
                break # Avoid double counting same line
                
    return education_entries


def extract_experience_details(text: str) -> List[Dict[str, str]]:
    """
    Attempt to extract experience sections
    """
    # Simply looking for 'Experience' header and grabbing subsequent text for now
    # A true parser needs NER (Spacy/Bert), but this is "Simplest Scalable"
    
    lines = text.split('\n')
    experience_entries = []
    in_exp_section = False
    buffer = []
    
    exp_headers = ["experience", "work history", "employment", "professional experience"]
    
    for line in lines:
        stripped = line.strip().lower()
        if any(h in stripped for h in exp_headers) and len(stripped) < 30:
            in_exp_section = True
            continue
            
        if in_exp_section:
            # Stop if we hit another likely header
            if any(h in stripped for h in ["education", "skills", "projects", "certifications", "declaration"]) and len(stripped) < 30:
                in_exp_section = False
                if buffer:
                    experience_entries.append({
                        "title": "Work Experience",
                        "company": "See Description",
                        "duration": "Unknown",
                        "description": "\n".join(buffer[:10]) # Limit to 10 lines
                    })
                    buffer = []
                break
            
            if line.strip():
                buffer.append(line.strip())
                
    if in_exp_section and buffer:
         experience_entries.append({
            "title": "Work Experience",
            "company": "See Description",
            "duration": "Unknown",
            "description": "\n".join(buffer[:10]) 
        })
        
    return experience_entries


def extract_experience_years(text: str) -> int:
    """
    Extract total years of experience from resume text.
    Heuristic: Look for keywords like 'years of experience', 'exp:', '+ years'.
    """
    text_lower = text.lower()
    
    # Pattern 1: Matching '5+ years', '3 years', etc.
    patterns = [
        r'(\d+)[\+]?\s*years?\s+(?:of\s+)?experience',
        r'experience[:\s]+(\d+)[\+]?\s*years?',
        r'(\d+)[\+]?\s*yrs',
        r'total\s+experience[:\s]+(\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                years = int(match.group(1))
                if 0 <= years <= 50:
                    return years
            except:
                continue
                
    # Fallback: Count unique years in work experience if possible
    # (Simplified: just returning 0 if no clear match)
    return 0


def parse_resume_file(file_path: str) -> Dict:
    """
    Main function to parse resume and extract all information
    """
    if file_path.lower().endswith('.pdf'):
        raw_text = extract_text_from_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        raw_text = extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file format")
    
    # Base Profile Object
    profile = {
        "name": extract_name(raw_text),
        "email": extract_email(raw_text),
        "phone": extract_phone(raw_text),
        "skills": extract_skills(raw_text),
        "education": extract_education(raw_text),
        "experience": extract_experience_details(raw_text),
        "experience_years": extract_experience_years(raw_text),
        "raw_text": raw_text[:2000] # Truncate for DB storage if needed
    }
    
    return profile

