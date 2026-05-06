import os
from sentence_transformers import SentenceTransformer

def download():
    print("⏳ Downloading AI models during build phase...")
    # Pre-download the light model used in app.py
    model1 = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ all-MiniLM-L6-v2 downloaded.")
    
    # Pre-download the base model just in case
    model2 = SentenceTransformer('all-mpnet-base-v2')
    print("✅ all-mpnet-base-v2 downloaded.")
    print("🚀 All models are ready for production!")

if __name__ == "__main__":
    download()
