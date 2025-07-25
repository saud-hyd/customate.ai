from app.api.knowledge.routes import router as knowledge_router
from app.api.knowledge.document_routes import router as document_router
from app.api.knowledge.collection_routes import router as collection_router
from app.api.knowledge.crawl_routes import router as crawl_router
from app.api.knowledge.enhanced_routes import router as enhanced_router

__all__ = ["knowledge_router", "document_router", "collection_router", "crawl_router", "enhanced_router"]