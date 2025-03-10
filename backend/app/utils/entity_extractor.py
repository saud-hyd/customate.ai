# app/utils/entity_extractor.py
import re
from typing import List, Dict, Any, Optional

def extract_entities(text: str, entity_type: Optional[str] = None) -> List[str]:
    """
    Simple rule-based entity extraction from text.
    
    Args:
        text: Text to extract entities from
        entity_type: Type of entity to extract (PRODUCT, PERSON, etc.)
        
    Returns:
        List of extracted entities
    """
    entities = []
    
    if entity_type == "PRODUCT":
        # Extract product mentions using rules
        # This is a simplified example - in production, use a more robust approach
        product_patterns = [
            r'(?:our|your|the) ([a-zA-Z0-9\s]+) product',
            r'(?:buy|purchase|order) ([a-zA-Z0-9\s]+)',
            r'(?:interested in|looking for) ([a-zA-Z0-9\s]+)',
        ]
        
        for pattern in product_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities.extend([match.strip() for match in matches if len(match.strip()) > 2])
    
    elif entity_type == "PERSON":
        # Extract person names (simplified)
        person_patterns = [
            r'(?:Mr\.|Mrs\.|Ms\.|Dr\.) ([A-Z][a-z]+ [A-Z][a-z]+)',
            r'(?:contact|spoke with|talked to) ([A-Z][a-z]+ [A-Z][a-z]+)',
        ]
        
        for pattern in person_patterns:
            matches = re.findall(pattern, text)
            entities.extend([match.strip() for match in matches])
    
    elif entity_type == "LOCATION":
        # Extract locations (simplified)
        location_patterns = [
            r'(?:in|at|from|to) ([A-Z][a-z]+ ?(?:[A-Z][a-z]+)?)',
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, text)
            entities.extend([match.strip() for match in matches])
    
    else:
        # Default - extract various entity types based on patterns
        # This is quite simplified - in production, use NER models
        
        # Extract dates
        date_pattern = r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}'
        date_matches = re.findall(date_pattern, text)
        if date_matches:
            entities.extend(date_matches)
        
        # Extract email addresses
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_matches = re.findall(email_pattern, text)
        if email_matches:
            entities.extend(email_matches)
        
        # Extract numbers with context
        number_pattern = r'(\d+(?:\.\d+)?) ([a-zA-Z]+)'
        number_matches = re.findall(number_pattern, text)
        if number_matches:
            entities.extend([f"{num} {unit}" for num, unit in number_matches])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_entities = []
    for entity in entities:
        if entity.lower() not in seen:
            seen.add(entity.lower())
            unique_entities.append(entity)
    
    return unique_entities