"""
Embeddings generation using sentence-transformers
Creates 384-dimensional vectors for semantic search
"""

import os
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Union
import json

class EmbeddingService:
    """
    Service for generating text embeddings using sentence-transformers
    Uses all-MiniLM-L6-v2 model for 384-dimensional vectors
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding service
        
        Args:
            model_name: Name of the sentence-transformer model to use
        """
        self.model_name = model_name
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the sentence-transformer model"""
        try:
            print(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print("Embedding model loaded successfully")
        except Exception as e:
            print(f"Error loading embedding model: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a single embedding for the given text
        
        Args:
            text: Input text to embed
            
        Returns:
            List of float values representing the embedding vector
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_numpy=True)
            
            # Convert to list and ensure it's a Python list
            embedding_list = embedding.tolist()
            
            # Validate dimensions
            if len(embedding_list) != 384:
                raise ValueError(f"Expected 384 dimensions, got {len(embedding_list)}")
            
            return embedding_list
            
        except Exception as e:
            print(f"Error generating embedding: {e}")
            raise
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts at once
        
        Args:
            texts: List of input texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        if not texts:
            return []
        
        try:
            # Generate embeddings in batch
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            
            # Convert to list of lists
            embedding_lists = embeddings.tolist()
            
            # Validate dimensions
            for i, embedding in enumerate(embedding_lists):
                if len(embedding) != 384:
                    raise ValueError(f"Text {i} expected 384 dimensions, got {len(embedding)}")
            
            return embedding_lists
            
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            raise
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split large text into overlapping chunks for better embedding context
        
        Args:
            text: Input text to chunk
            chunk_size: Maximum size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk = ' '.join(chunk_words)
            chunks.append(chunk)
        
        return chunks
    
    def process_document(self, text: str, chunk_size: int = 500, overlap: int = 50) -> tuple[List[str], List[List[float]]]:
        """
        Process a document by chunking it and generating embeddings for each chunk
        
        Args:
            text: Document text to process
            chunk_size: Maximum size of each chunk
            overlap: Number of characters to overlap
            
        Returns:
            Tuple of (chunks, embeddings)
        """
        # Split text into chunks
        chunks = self.chunk_text(text, chunk_size, overlap)
        
        if not chunks:
            return [], []
        
        # Generate embeddings for all chunks
        embeddings = self.generate_batch_embeddings(chunks)
        
        return chunks, embeddings

# Singleton instance for reuse
_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    """Get or create the singleton embedding service instance"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

# CLI usage for testing
if __name__ == "__main__":
    # Test the embedding service
    service = get_embedding_service()
    
    test_text = "TattvaQuest provides digital forensics and legal consulting services."
    
    try:
        embedding = service.generate_embedding(test_text)
        print(f"Generated embedding with {len(embedding)} dimensions")
        print(f"First 5 values: {embedding[:5]}")
        
        # Test batch processing
        texts = [
            "Digital forensics involves the recovery and investigation of material found in digital devices.",
            "Legal technology helps streamline legal processes and improve efficiency.",
            "eDiscovery is the process of identifying, preserving, and producing electronically stored information."
        ]
        
        embeddings = service.generate_batch_embeddings(texts)
        print(f"Generated {len(embeddings)} embeddings")
        
    except Exception as e:
        print(f"Error: {e}")
