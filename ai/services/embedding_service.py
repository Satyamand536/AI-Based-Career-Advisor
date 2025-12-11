from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingService:
    def __init__(self):
        # Pre-trained model - bilkul sahi choice
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dim = 384
    
    def generate_embedding(self, text):
        """Any text ka embedding generate karo"""
        if not text or len(text.strip()) == 0:
            return np.zeros(self.embedding_dim)
        
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding
    
    def batch_embeddings(self, texts):
        """Multiple texts ke embeddings generate karo"""
        embeddings = self.model.encode(texts, show_progress_bar=True)
        return embeddings
