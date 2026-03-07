"""
spaCy NLP pipeline for entity extraction from legal and forensic documents
Extracts entities like persons, organizations, dates, money, and legal references
"""

import spacy
import json
from typing import List, Dict, Any
from datetime import datetime
import re

class NLPipeline:
    """
    NLP pipeline using spaCy for entity extraction
    Supports legal and forensic document analysis
    """
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize the NLP pipeline
        
        Args:
            model_name: Name of the spaCy model to use
        """
        self.model_name = model_name
        self.nlp = None
        self._load_model()
    
    def _load_model(self):
        """Load the spaCy model"""
        try:
            print(f"Loading spaCy model: {self.model_name}")
            self.nlp = spacy.load(self.model_name)
            print("spaCy model loaded successfully")
        except OSError:
            print(f"Model {self.model_name} not found. Downloading...")
            spacy.cli.download(self.model_name)
            self.nlp = spacy.load(self.model_name)
            print("spaCy model downloaded and loaded successfully")
        except Exception as e:
            print(f"Error loading spaCy model: {e}")
            raise
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from text using spaCy
        
        Args:
            text: Input text to process
            
        Returns:
            List of dictionaries containing entity information
        """
        if not self.nlp:
            raise RuntimeError("spaCy model not loaded")
        
        if not text or not text.strip():
            return []
        
        try:
            # Process the text
            doc = self.nlp(text)
            
            entities = []
            
            # Extract standard spaCy entities
            for ent in doc.ents:
                entity_type = self._map_entity_type(ent.label_)
                
                if entity_type:  # Only include relevant entity types
                    entities.append({
                        'text': ent.text,
                        'label': entity_type,
                        'start': ent.start_char,
                        'end': ent.end_char,
                        'confidence': 1.0,  # spaCy doesn't provide confidence by default
                        'source': 'spacy'
                    })
            
            # Extract custom legal and forensic entities
            legal_entities = self._extract_legal_entities(text)
            entities.extend(legal_entities)
            
            # Remove duplicates and sort by position
            entities = self._deduplicate_entities(entities)
            entities.sort(key=lambda x: x['start'])
            
            return entities
            
        except Exception as e:
            print(f"Error extracting entities: {e}")
            return []
    
    def _map_entity_type(self, spacy_label: str) -> str:
        """
        Map spaCy entity labels to our standardized types
        
        Args:
            spacy_label: Original spaCy entity label
            
        Returns:
            Standardized entity type or None if not relevant
        """
        mapping = {
            'PERSON': 'PERSON',
            'ORG': 'ORGANIZATION',
            'GPE': 'LOCATION',
            'DATE': 'DATE',
            'TIME': 'DATE',
            'MONEY': 'MONEY',
            'QUANTITY': 'QUANTITY',
            'CARDINAL': 'NUMBER',
            'ORDINAL': 'NUMBER',
            'PRODUCT': 'PRODUCT',
            'EVENT': 'EVENT',
            'WORK_OF_ART': 'DOCUMENT',
            'LAW': 'LEGAL_REFERENCE',
            'FAC': 'FACILITY'
        }
        
        return mapping.get(spacy_label, None)
    
    def _extract_legal_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract legal-specific entities using regex patterns
        
        Args:
            text: Input text to process
            
        Returns:
            List of legal entities found
        """
        entities = []
        
        # Case numbers (e.g., Case No. 12345, D-2023-001)
        case_pattern = r'(?:Case\s*(?:No\.|Number|#)\s*)?([A-Z]?\d{2,4}[-/]?\d{2,4}[-/]?\d{3,6})'
        for match in re.finditer(case_pattern, text, re.IGNORECASE):
            entities.append({
                'text': match.group(0),
                'label': 'CASE_NUMBER',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.9,
                'source': 'regex'
            })
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append({
                'text': match.group(0),
                'label': 'EMAIL',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.95,
                'source': 'regex'
            })
        
        # Phone numbers
        phone_pattern = r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
        for match in re.finditer(phone_pattern, text):
            entities.append({
                'text': match.group(0),
                'label': 'PHONE',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.9,
                'source': 'regex'
            })
        
        # IP addresses
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        for match in re.finditer(ip_pattern, text):
            entities.append({
                'text': match.group(0),
                'label': 'IP_ADDRESS',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.95,
                'source': 'regex'
            })
        
        # File hashes (MD5, SHA-1, SHA-256)
        hash_pattern = r'\b([a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})\b'
        for match in re.finditer(hash_pattern, text):
            hash_length = len(match.group(1))
            hash_type = 'MD5' if hash_length == 32 else ('SHA-1' if hash_length == 40 else 'SHA-256')
            entities.append({
                'text': match.group(0),
                'label': 'FILE_HASH',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.9,
                'source': 'regex',
                'metadata': {'hash_type': hash_type}
            })
        
        # URLs
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        for match in re.finditer(url_pattern, text):
            entities.append({
                'text': match.group(0),
                'label': 'URL',
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.95,
                'source': 'regex'
            })
        
        return entities
    
    def _deduplicate_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate entities based on text and position
        
        Args:
            entities: List of entities to deduplicate
            
        Returns:
            Deduplicated list of entities
        """
        seen = set()
        deduplicated = []
        
        for entity in entities:
            # Create a unique key based on text, label, and position
            key = (entity['text'].lower(), entity['label'], entity['start'], entity['end'])
            
            if key not in seen:
                seen.add(key)
                deduplicated.append(entity)
        
        return deduplicated
    
    def analyze_document(self, text: str) -> Dict[str, Any]:
        """
        Perform complete document analysis
        
        Args:
            text: Document text to analyze
            
        Returns:
            Dictionary containing analysis results
        """
        if not text:
            return {
                'entities': [],
                'entity_counts': {},
                'summary': {
                    'total_entities': 0,
                    'text_length': 0,
                    'word_count': 0
                }
            }
        
        # Extract entities
        entities = self.extract_entities(text)
        
        # Count entities by type
        entity_counts = {}
        for entity in entities:
            label = entity['label']
            entity_counts[label] = entity_counts.get(label, 0) + 1
        
        # Calculate summary statistics
        summary = {
            'total_entities': len(entities),
            'text_length': len(text),
            'word_count': len(text.split())
        }
        
        return {
            'entities': entities,
            'entity_counts': entity_counts,
            'summary': summary
        }

# Singleton instance for reuse
_nlp_pipeline = None

def get_nlp_pipeline() -> NLPipeline:
    """Get or create the singleton NLP pipeline instance"""
    global _nlp_pipeline
    if _nlp_pipeline is None:
        _nlp_pipeline = NLPipeline()
    return _nlp_pipeline

# CLI usage for testing
if __name__ == "__main__":
    # Test the NLP pipeline
    pipeline = get_nlp_pipeline()
    
    test_text = """
    Case No. 2023-CV-00123: John Smith contacted our firm at john.smith@email.com 
    or (555) 123-4567 regarding a digital forensics investigation. The IP address 
    192.168.1.100 was compromised. File hash MD5: d41d8cd98f00b204e9800998ecf8427e 
    was found on the system. More information at https://tattvaquest.com.
    """
    
    try:
        analysis = pipeline.analyze_document(test_text)
        
        print("Entity Extraction Results:")
        print(f"Total entities: {analysis['summary']['total_entities']}")
        print("\nEntity counts by type:")
        for entity_type, count in analysis['entity_counts'].items():
            print(f"  {entity_type}: {count}")
        
        print("\nExtracted entities:")
        for entity in analysis['entities']:
            print(f"  {entity['label']}: {entity['text']}")
        
    except Exception as e:
        print(f"Error: {e}")
