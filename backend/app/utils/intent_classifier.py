# app/utils/intent_classifier.py
import re
from typing import Dict, List, Any, Optional

def classify_intent(text: str, domain: Optional[str] = None) -> str:
    """
    Simple rule-based intent classification.
    
    Args:
        text: Text to classify
        domain: Domain-specific classification (ecommerce, saas, etc.)
        
    Returns:
        Predicted intent
    """
    text_lower = text.lower()
    
    # Domain-specific intent classification
    if domain == "ecommerce":
        return _classify_ecommerce_intent(text_lower)
    elif domain == "saas":
        return _classify_saas_intent(text_lower)
    else:
        return _classify_general_intent(text_lower)

def _classify_ecommerce_intent(text: str) -> str:
    """Classify e-commerce specific intents."""
    # Product inquiry
    product_patterns = [
        r'(tell me about|looking for|interested in|do you (have|sell))',
        r'(product|item|model)',
        r'(features|specs|details|colors|sizes)',
        r'(what|how) (is|does|are)',
    ]
    
    if any(re.search(pattern, text) for pattern in product_patterns):
        return "product_inquiry"
    
    # Order status
    order_patterns = [
        r'(order|package|delivery) (status|tracking)',
        r'(where is|when will) my (order|package)',
        r'(order|confirmation) number',
        r'(received|shipped|delivered)',
    ]
    
    if any(re.search(pattern, text) for pattern in order_patterns):
        return "order_status"
    
    # Return request
    return_patterns = [
        r'(return|exchange|refund)',
        r'(broken|damaged|wrong|defective)',
        r'(policy|process)',
    ]
    
    if any(re.search(pattern, text) for pattern in return_patterns):
        return "return_request"
    
    # Shipping inquiry
    shipping_patterns = [
        r'(shipping|delivery) (time|cost|options)',
        r'(how long|when) (will it take|does it take)',
        r'(expedited|express|standard) shipping',
    ]
    
    if any(re.search(pattern, text) for pattern in shipping_patterns):
        return "shipping_inquiry"
    
    # Default intent
    return "general_question"

def _classify_saas_intent(text: str) -> str:
    """Classify SaaS specific intents."""
    # Feature inquiry
    feature_patterns = [
        r'(feature|functionality|capability)',
        r'(what|how) (can|does|is) (it|your product) (do|work|support)',
        r'(dashboard|reports|analytics|api|integration)',
    ]
    
    if any(re.search(pattern, text) for pattern in feature_patterns):
        return "feature_inquiry"
    
    # Pricing question
    pricing_patterns = [
        r'(pricing|cost|price|subscription|plan|tier)',
        r'(monthly|annual|yearly)',
        r'(how much|free trial|discount)',
    ]
    
    if any(re.search(pattern, text) for pattern in pricing_patterns):
        return "pricing_question"
    
    # Integration help
    integration_patterns = [
        r'(integrate|integration|connect|sync|api)',
        r'(with|to) (another|other|external)',
        r'(webhook|data flow|import|export)',
    ]
    
    if any(re.search(pattern, text) for pattern in integration_patterns):
        return "integration_help"
    
    # Technical issue
    technical_patterns = [
        r'(error|bug|issue|problem|not working)',
        r'(can\'t|cannot|doesn\'t|won\'t)',
        r'(fix|solve|troubleshoot|help)',
    ]
    
    if any(re.search(pattern, text) for pattern in technical_patterns):
        return "technical_issue"
    
    # Account management
    account_patterns = [
        r'(account|profile|settings|preferences)',
        r'(user|permission|role|access)',
        r'(billing|payment|invoice|receipt)',
    ]
    
    if any(re.search(pattern, text) for pattern in account_patterns):
        return "account_management"
    
    # Default intent
    return "general_question"

def _classify_general_intent(text: str) -> str:
    """Classify general intents."""
    # Greeting
    greeting_patterns = [
        r'^(hi|hello|hey|good morning|good afternoon|good evening)',
        r'(how are you|what\'s up|how\'s it going)',
    ]
    
    if any(re.search(pattern, text) for pattern in greeting_patterns):
        return "greeting"
    
    # Question
    question_patterns = [
        r'^(what|how|when|where|why|who|can|do|is|are|will|should)',
        r'\?$',
    ]
    
    if any(re.search(pattern, text) for pattern in question_patterns):
        return "question"
    
    # Request
    request_patterns = [
        r'^(please|could you|can you|would you)',
        r'(help|assist|guide|explain|tell)',
    ]
    
    if any(re.search(pattern, text) for pattern in request_patterns):
        return "request"
    
    # Feedback
    feedback_patterns = [
        r'(thanks|thank you|appreciate|grateful)',
        r'(good|great|excellent|amazing|awesome|terrible|bad|poor)',
        r'(feedback|review|experience)',
    ]
    
    if any(re.search(pattern, text) for pattern in feedback_patterns):
        return "feedback"
    
    # Default intent
    return "other"