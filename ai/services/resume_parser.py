import PyPDF2
from docx import Document
import re

class ResumeParser:
    def __init__(self):
        pass
    
    def parse_resume(self, file):
        """Resume file parse karo aur extract karo"""
        filename = file.filename
        
        if filename.endswith('.pdf'):
            text = self._parse_pdf(file)
        elif filename.endswith('.docx'):
            text = self._parse_docx(file)
        else:
            raise ValueError("Only PDF and DOCX supported")
        
        # Extract information
        data = self._extract_info(text)
        
        return data
    
    def _parse_pdf(self, file):
        """PDF se text extract karo"""
        text = ""
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    
    def _parse_docx(self, file):
        """DOCX se text extract karo"""
        doc = Document(file)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    
    def _extract_info(self, text):
        """Resume se key info extract karo"""
        extracted = {
            'skills': self._extract_skills(text),
            'experience': self._extract_experience(text),
            'education': self._extract_education(text),
            'email': self._extract_email(text),
            'phone': self._extract_phone(text),
        }
        return extracted
    
    def _extract_skills(self, text):
        """Skills list banao"""
        common_skills = [
            'python', 'javascript', 'java', 'c++', 'sql', 'html', 'css',
            'react', 'node', 'mongodb', 'postgresql', 'git', 'docker',
            'aws', 'gcp', 'azure', 'machine learning', 'data science',
            'tensorflow', 'pytorch', 'excel', 'tableau', 'power bi',
            'communication', 'leadership', 'project management'
        ]
        
        text_lower = text.lower()
        found_skills = [skill for skill in common_skills if skill in text_lower]
        return found_skills
    
    def _extract_experience(self, text):
        """Experience years nikalo"""
        pattern = r'(\d+)\s*(?:years?|yrs?)'
        matches = re.findall(pattern, text.lower())
        if matches:
            return int(matches[0])
        return 0
    
    def _extract_education(self, text):
        """Education degree nikalo"""
        degrees = ['B.Tech', 'B.E', 'BCA', 'BBA', 'BA', 'BSc', 
                   'M.Tech', 'MBA', 'MA', 'MSc', '12th', '10th']
        found = [d for d in degrees if d.lower() in text.lower()]
        return found
    
    def _extract_email(self, text):
        """Email nikalo"""
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        matches = re.findall(pattern, text)
        return matches[0] if matches else None
    
    def _extract_phone(self, text):
        """Phone number nikalo"""
        pattern = r'\d{10}'
        matches = re.findall(pattern, text)
        return matches[0] if matches else None
