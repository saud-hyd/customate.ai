# backend/app/services/channel/email_relevance_filter.py

import re
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from enum import Enum

from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_service import LLMService
from app.core import logger

class EmailRelevanceLevel(Enum):
    """Email relevance levels for filtering."""
    HIGH = "high"           # Definitely business-related, good knowledge coverage
    MEDIUM = "medium"       # Potentially business-related, some knowledge coverage
    LOW = "low"             # Unclear relevance, limited knowledge coverage
    IRRELEVANT = "irrelevant"  # Personal/spam/off-topic, no knowledge coverage

class EmailRelevanceFilter:
    """
    Service to determine if an email should receive an automated response
    based on knowledge base coverage and business relevance.
    """
    
    def __init__(self, search_service: EnhancedSearchService, llm_service: LLMService):
        self.search_service = search_service
        self.llm_service = llm_service
        
        # Configuration thresholds
        self.HIGH_CONFIDENCE_THRESHOLD = 0.6      # High relevance + good knowledge
        self.MEDIUM_CONFIDENCE_THRESHOLD = 0.4    # Medium relevance + some knowledge
        self.MINIMUM_KNOWLEDGE_ITEMS = 2          # Minimum knowledge items needed
        self.MINIMUM_AVERAGE_SIMILARITY = 0.3     # Minimum average similarity score
        
        # Business indicators (expandable based on client)
        self.BUSINESS_KEYWORDS = {
            'support', 'help', 'issue', 'problem', 'question', 'inquiry', 'request',
            'service', 'product', 'order', 'purchase', 'billing', 'account', 'login',
            'technical', 'bug', 'error', 'feature', 'documentation', 'guide', 'how to',
            'pricing', 'quote', 'demo', 'trial', 'subscription', 'cancel', 'refund',
            'integration', 'api', 'setup', 'configuration', 'install', 'upgrade'
        }
        
        # Personal/irrelevant indicators
        self.PERSONAL_INDICATORS = {
            'personal', 'private', 'family', 'friend', 'birthday', 'vacation', 'holiday',
            'dinner', 'lunch', 'meeting', 'appointment', 'social', 'party', 'wedding',
            'spam', 'promotion', 'advertisement', 'unsubscribe', 'newsletter', 'marketing'
        }
    
    async def analyze_email_relevance(
        self,
        client_id: str,
        email_content: str,
        email_subject: str,
        sender_email: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze email relevance and determine if it should receive an automated response.
        
        Returns:
            {
                "should_reply": bool,
                "relevance_level": EmailRelevanceLevel,
                "confidence_score": float,
                "knowledge_coverage": Dict,
                "reasoning": str,
                "knowledge_items_found": int,
                "average_similarity": float
            }
        """
        try:
            logger.info(f"Analyzing email relevance for client {client_id}")
            logger.info(f"Subject: {email_subject[:100]}...")
            logger.info(f"Content: {email_content[:200]}...")
            
            # 1. Combine subject and content for analysis
            full_text = f"{email_subject} {email_content}".strip()
            
            # 2. Perform comprehensive knowledge search
            knowledge_analysis = await self._analyze_knowledge_coverage(
                client_id, full_text, email_subject, email_content
            )
            
            # 3. Analyze business relevance signals
            business_analysis = self._analyze_business_relevance(
                full_text, sender_email, additional_context
            )
            
            # 4. Combine scores to determine overall relevance
            final_analysis = self._calculate_final_relevance(
                knowledge_analysis, business_analysis
            )
            
            # 5. Log detailed analysis
            self._log_analysis_details(client_id, final_analysis, knowledge_analysis, business_analysis)
            
            return final_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing email relevance: {e}")
            # Fail safely - don't reply if we can't analyze
            return {
                "should_reply": False,
                "relevance_level": EmailRelevanceLevel.IRRELEVANT,
                "confidence_score": 0.0,
                "knowledge_coverage": {},
                "reasoning": f"Analysis failed: {str(e)}",
                "knowledge_items_found": 0,
                "average_similarity": 0.0
            }
    
    async def _analyze_knowledge_coverage(
        self, 
        client_id: str, 
        full_text: str,
        subject: str,
        content: str
    ) -> Dict[str, Any]:
        """Analyze knowledge base coverage for the email."""
        
        # Search with different strategies
        searches = [
            # Primary search with full text
            {"query": full_text, "limit": 8, "threshold": 0.3, "name": "full_text"},
            # Subject-focused search
            {"query": subject, "limit": 5, "threshold": 0.4, "name": "subject_only"},
            # Content-focused search with lower threshold
            {"query": content, "limit": 6, "threshold": 0.2, "name": "content_relaxed"}
        ]
        
        all_results = []
        search_results = {}
        
        for search_config in searches:
            try:
                results = await self.search_service.hybrid_search(
                    client_id=client_id,
                    query_text=search_config["query"],
                    limit=search_config["limit"],
                    vector_threshold=search_config["threshold"],
                    hybrid_ratio=0.6
                )
                
                search_results[search_config["name"]] = results
                if results.get("results"):
                    all_results.extend(results["results"])
                    
            except Exception as e:
                logger.error(f"Knowledge search error ({search_config['name']}): {e}")
        
        # Deduplicate and analyze results
        unique_results = {}
        for item in all_results:
            item_id = item.get("item_id")
            if item_id and (item_id not in unique_results or 
                          item.get("similarity", 0) > unique_results[item_id].get("similarity", 0)):
                unique_results[item_id] = item
        
        final_results = list(unique_results.values())
        
        # Calculate coverage metrics
        if final_results:
            similarities = [item.get("similarity", 0) for item in final_results]
            avg_similarity = sum(similarities) / len(similarities)
            max_similarity = max(similarities)
            high_quality_items = [item for item in final_results if item.get("similarity", 0) >= 0.5]
        else:
            avg_similarity = 0.0
            max_similarity = 0.0
            high_quality_items = []
        
        return {
            "total_items": len(final_results),
            "high_quality_items": len(high_quality_items),
            "average_similarity": avg_similarity,
            "max_similarity": max_similarity,
            "results": final_results[:10],  # Keep top 10
            "search_breakdown": {name: len(results.get("results", [])) for name, results in search_results.items()}
        }
    
    def _analyze_business_relevance(
        self, 
        text: str, 
        sender_email: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze business relevance signals in the email."""
        
        text_lower = text.lower()
        
        # Count business keywords
        business_matches = [word for word in self.BUSINESS_KEYWORDS if word in text_lower]
        business_score = min(len(business_matches) * 0.1, 1.0)  # Cap at 1.0
        
        # Count personal indicators (negative score)
        personal_matches = [word for word in self.PERSONAL_INDICATORS if word in text_lower]
        personal_penalty = len(personal_matches) * 0.15
        
        # Email domain analysis
        domain_score = 0.0
        if sender_email:
            domain = sender_email.split('@')[-1].lower()
            # Business domains get bonus points
            business_domains = ['gmail.com', 'outlook.com', 'yahoo.com']  # Paradoxically, these are often business emails
            if domain not in ['noreply', 'no-reply', 'donotreply']:
                domain_score = 0.1
        
        # Question detection
        question_indicators = ['?', 'how', 'what', 'when', 'where', 'why', 'can you', 'could you', 'please']
        question_matches = [ind for ind in question_indicators if ind in text_lower]
        question_score = min(len(question_matches) * 0.05, 0.3)
        
        # Calculate final business relevance score
        raw_score = business_score + domain_score + question_score - personal_penalty
        business_relevance_score = max(0.0, min(1.0, raw_score))
        
        return {
            "business_score": business_relevance_score,
            "business_keywords_found": business_matches,
            "personal_indicators_found": personal_matches,
            "question_indicators": question_matches,
            "domain_analysis": {"domain": sender_email.split('@')[-1] if sender_email else "", "score": domain_score},
            "components": {
                "business_keywords": business_score,
                "domain": domain_score,
                "questions": question_score,
                "personal_penalty": -personal_penalty
            }
        }
    
    def _calculate_final_relevance(
        self, 
        knowledge_analysis: Dict[str, Any], 
        business_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate final relevance decision based on knowledge and business analysis."""
        
        # Extract key metrics
        knowledge_items = knowledge_analysis["total_items"]
        avg_similarity = knowledge_analysis["average_similarity"]
        max_similarity = knowledge_analysis["max_similarity"]
        high_quality_items = knowledge_analysis["high_quality_items"]
        business_score = business_analysis["business_score"]
        
        # Calculate knowledge coverage score
        knowledge_score = 0.0
        if knowledge_items >= self.MINIMUM_KNOWLEDGE_ITEMS:
            knowledge_score += 0.3
        if avg_similarity >= self.MINIMUM_AVERAGE_SIMILARITY:
            knowledge_score += 0.2
        if high_quality_items > 0:
            knowledge_score += min(high_quality_items * 0.15, 0.5)
        
        # Combine scores with weighted importance
        # Knowledge coverage: 60%, Business relevance: 40%
        confidence_score = (knowledge_score * 0.6) + (business_score * 0.4)
        
        # Determine relevance level and reply decision
        if confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD and knowledge_items >= 3:
            relevance_level = EmailRelevanceLevel.HIGH
            should_reply = True
            reasoning = f"High confidence ({confidence_score:.2f}): Strong knowledge coverage ({knowledge_items} items, avg sim: {avg_similarity:.2f}) and business relevance ({business_score:.2f})"
            
        elif confidence_score >= self.MEDIUM_CONFIDENCE_THRESHOLD and knowledge_items >= 2:
            relevance_level = EmailRelevanceLevel.MEDIUM
            should_reply = True
            reasoning = f"Medium confidence ({confidence_score:.2f}): Adequate knowledge coverage ({knowledge_items} items) and some business relevance"
            
        elif knowledge_items >= 1 and avg_similarity >= 0.4:
            relevance_level = EmailRelevanceLevel.LOW
            should_reply = False  # Conservative approach
            reasoning = f"Low confidence ({confidence_score:.2f}): Limited but relevant knowledge found, not replying to avoid errors"
            
        else:
            relevance_level = EmailRelevanceLevel.IRRELEVANT
            should_reply = False
            reasoning = f"Irrelevant ({confidence_score:.2f}): Insufficient knowledge coverage ({knowledge_items} items) or business relevance ({business_score:.2f})"
        
        return {
            "should_reply": should_reply,
            "relevance_level": relevance_level,
            "confidence_score": confidence_score,
            "knowledge_coverage": {
                "total_items": knowledge_items,
                "high_quality_items": high_quality_items,
                "average_similarity": avg_similarity,
                "max_similarity": max_similarity,
                "knowledge_score": knowledge_score
            },
            "business_relevance": business_analysis,
            "reasoning": reasoning,
            "knowledge_items_found": knowledge_items,
            "average_similarity": avg_similarity,
            "thresholds_used": {
                "high_confidence": self.HIGH_CONFIDENCE_THRESHOLD,
                "medium_confidence": self.MEDIUM_CONFIDENCE_THRESHOLD,
                "min_knowledge_items": self.MINIMUM_KNOWLEDGE_ITEMS,
                "min_avg_similarity": self.MINIMUM_AVERAGE_SIMILARITY
            }
        }
    
    def _log_analysis_details(
        self, 
        client_id: str, 
        final_analysis: Dict[str, Any],
        knowledge_analysis: Dict[str, Any], 
        business_analysis: Dict[str, Any]
    ) -> None:
        """Log detailed analysis for monitoring and debugging."""
        
        logger.info(f"📧 Email Relevance Analysis for client {client_id}:")
        logger.info(f"  🎯 Decision: {'REPLY' if final_analysis['should_reply'] else 'NO REPLY'}")
        logger.info(f"  📊 Confidence: {final_analysis['confidence_score']:.3f} ({final_analysis['relevance_level'].value})")
        logger.info(f"  📚 Knowledge: {knowledge_analysis['total_items']} items (avg: {knowledge_analysis['average_similarity']:.3f})")
        logger.info(f"  🏢 Business: {business_analysis['business_score']:.3f}")
        logger.info(f"  💭 Reasoning: {final_analysis['reasoning']}")
        
        if knowledge_analysis['total_items'] > 0:
            logger.debug(f"  📖 Knowledge breakdown: {knowledge_analysis['search_breakdown']}")
            
        if business_analysis['business_keywords_found']:
            logger.debug(f"  🔑 Business keywords: {', '.join(business_analysis['business_keywords_found'][:5])}")