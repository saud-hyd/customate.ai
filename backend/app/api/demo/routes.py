# backend/app/api/demo/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio
from fastapi.responses import HTMLResponse

from app.core.database.dependencies import get_db
from app.core import logger

# Define BACKEND_URL for widget script injection
try:
    from app.core.settings import settings
    BACKEND_URL = settings.BACKEND_URL
except Exception:
    import os
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

router = APIRouter()

# In-memory store for demo sessions (you could use Redis in production)
demo_sessions = {}

async def ensure_demo_client_exists(db: Session):
    """Ensure demo client exists in database"""
    try:
        from app.repositories.client_repository import ClientRepository
        client_repo = ClientRepository()
        
        # Check if demo client exists
        demo_client = client_repo.get_by_client_id(db, "demo")
        
        if not demo_client:
            # Create demo client
            demo_client_data = {
                "client_id": "demo",
                "name": "Demo Client",
                "email": "demo@customate.ai",
                "api_key": "demo_api_key",
                "active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            demo_client = client_repo.create(db, obj_in=demo_client_data)
            logger.info("✅ Demo client created in database")
        
        return demo_client
        
    except Exception as e:
        logger.error(f"Failed to create demo client: {e}")
        return None
    
# backend/app/api/demo/routes.py - REPLACE the quick_demo_crawl function

async def quick_demo_crawl(demo_id: str, url: str, db: Session):
    """Simple demo crawl without complex dependencies."""
    try:
        logger.info(f"Starting demo crawl for {demo_id}: {url}")
        
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
        import requests
        from bs4 import BeautifulSoup
        import re
        
        # Create demo knowledge collection
        collection_repo = KnowledgeCollectionRepository()
        collection_data = {
            "name": f"Demo: {url}",
            "description": f"Demo crawl of {url}",
            "client_id": "demo",
            "is_demo": True
        }
        collection = collection_repo.create(db, obj_in=collection_data)
        
        # Simple page discovery (no complex analysis)
        pages_to_crawl = [
            {"url": url, "page_type": "homepage"}
        ]
        
        # Try to find a few more pages from homepage
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (compatible; Customate.ai Bot)'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                base_domain = url.split('/')[2]
                
                # Find additional pages from links
                for link in soup.find_all('a', href=True)[:5]:
                    href = link.get('href')
                    if href.startswith('/'):
                        full_url = f"https://{base_domain}{href}"
                    elif href.startswith('http') and base_domain in href:
                        full_url = href
                    else:
                        continue
                        
                    if full_url not in [p['url'] for p in pages_to_crawl]:
                        pages_to_crawl.append({"url": full_url, "page_type": "page"})
                        
                    if len(pages_to_crawl) >= 3:  # Limit to 3 pages for demo
                        break
        except Exception as e:
            logger.warning(f"Could not discover additional pages: {e}")
        
        # Process pages
        item_repo = KnowledgeItemRepository()
        successful_pages = 0
        
        for page in pages_to_crawl:
            try:
                logger.info(f"Crawling page: {page['url']}")
                
                headers = {'User-Agent': 'Mozilla/5.0 (compatible; Customate.ai Bot)'}
                response = requests.get(page["url"], timeout=15, headers=headers)
                
                if response.status_code == 200:
                    # Simple content extraction
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Remove unwanted elements
                    for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                        element.decompose()
                    
                    # Get title
                    title = soup.title.string if soup.title else page['url']
                    
                    # Get main content
                    text_content = soup.get_text(separator=' ', strip=True)
                    text_content = re.sub(r'\s+', ' ', text_content)[:2000]  # Limit for demo
                    
                    if len(text_content) > 100:
                        item_data = {
                            "title": title[:200],
                            "content": text_content,
                            "source_url": page["url"],
                            "collection_id": collection.collection_id,
                            "client_id": "demo",
                            "item_type": "webpage"
                        }
                        
                        item_repo.create(db, obj_in=item_data)
                        successful_pages += 1
                        logger.info(f"✅ Successfully processed: {page['url']}")
                    
            except Exception as e:
                logger.error(f"Failed to crawl {page.get('url')}: {e}")
                continue
        
        # Update demo session status
        if successful_pages > 0:
            demo_sessions[demo_id]["status"] = "ready"
            demo_sessions[demo_id]["knowledge_collection_id"] = collection.collection_id
            demo_sessions[demo_id]["pages_crawled"] = successful_pages
            logger.info(f"✅ Demo crawl completed: {successful_pages} pages processed")
        else:
            demo_sessions[demo_id]["status"] = "failed"
            logger.error(f"❌ Demo crawl failed: no pages processed successfully")
        
    except Exception as e:
        logger.error(f"Demo crawl failed for {demo_id}: {str(e)}")
        demo_sessions[demo_id]["status"] = "failed"
            

@router.post("/create")
async def create_demo_session(
    request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a usage-based demo session (15 messages)."""
    try:
        await ensure_demo_client_exists(db)
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Generate demo session
        demo_id = str(uuid.uuid4())
        temp_api_key = "demo_api_key"
        
        logger.info(f"Creating usage-based demo session {demo_id} for URL: {url}")
        
        # Start crawling in background
        background_tasks.add_task(quick_demo_crawl, demo_id, url, db)
        
        # Store demo session (NO expiration time)
        demo_sessions[demo_id] = {
            "demo_id": demo_id,
            "api_key": temp_api_key,
            "target_url": url,
            "created_at": datetime.utcnow(),
            "status": "crawling",
            "knowledge_collection_id": None,
            "messages_used": 0,      # Track message usage
            "messages_limit": 15,    # 15 message limit
            "is_expired": False
        }
        
        return {
            "demo_id": demo_id,
            "api_key": temp_api_key,
            "target_url": url,
            "status": "crawling",
            "messages_remaining": 15
        }
        
    except Exception as e:
        logger.error(f"Demo creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create demo: {str(e)}")


@router.get("/status/{demo_id}")
async def get_demo_status(demo_id: str):
    """Get demo session status with usage info."""
    if demo_id not in demo_sessions:
        raise HTTPException(status_code=404, detail="Demo session not found")
    
    session = demo_sessions[demo_id]
    
    return {
        "demo_id": demo_id,
        "status": session.get("status"),
        "messages_used": session.get("messages_used", 0),
        "messages_remaining": session.get("messages_limit", 15) - session.get("messages_used", 0),
        "is_expired": session.get("messages_used", 0) >= session.get("messages_limit", 15),
        "target_url": session.get("target_url")
    }    
    
@router.post("/chat")
async def demo_chat(
    request: Request,
    db: Session = Depends(get_db)
):
    """Usage-based demo chat (15 messages max)."""
    
    try:
        # Get demo API key
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key or not api_key.startswith("demo_"):
            raise HTTPException(status_code=401, detail="Demo API key required")
        
        # Find demo session
        demo_session = None
        demo_id = None
        for session_id, session in demo_sessions.items():
            if session.get("api_key") == api_key:
                demo_session = session
                demo_id = session_id
                break
        
        if not demo_session:
            raise HTTPException(status_code=401, detail="Demo session not found")
        
        # CHECK MESSAGE LIMIT
        messages_used = demo_session.get("messages_used", 0)
        messages_limit = demo_session.get("messages_limit", 15)
        
        if messages_used >= messages_limit:
            return {
                "response": "🎉 You've explored all 15 demo messages! Ready to experience the full power of our AI? Sign up now for unlimited conversations and advanced features.",
                "demo_status": "limit_reached",
                "messages_used": messages_used,
                "messages_remaining": 0,
                "registration_required": True,
                "sources": []
            }
        
        # Get message
        body = await request.json()
        message = body.get("message", "").strip()
        
        if not message:
            raise HTTPException(status_code=400, detail="Message required")
        
        # INCREMENT MESSAGE COUNT
        demo_sessions[demo_id]["messages_used"] = messages_used + 1
        new_remaining = messages_limit - (messages_used + 1)
        
        logger.info(f"🎭 Demo chat request: {message[:100]}... ({messages_used + 1}/{messages_limit})")
        
        # Get demo info
        knowledge_collection_id = demo_session.get('knowledge_collection_id')
        target_url = demo_session.get('target_url')
        demo_status = demo_session.get('status')
        
        # Generate response based on demo status (same logic as before)
        if demo_status == "crawling":
            response_text = f"I'm still analyzing {target_url}! Give me a moment to learn about your website content. In the meantime, feel free to ask me anything - I'll have full knowledge of your site shortly!"
            sources = []
            used_content = False
            
        elif demo_status == "failed":
            response_text = f"I had trouble accessing {target_url}, but don't worry! In the full version, our system handles various website configurations and can integrate with your existing content management systems. Try asking me about general features like 'What can this chatbot do?'"
            sources = []
            used_content = False
            
        elif demo_status == "ready" and knowledge_collection_id:
            # Simple keyword search for demo (no complex LLM services)
            try:
                from app.repositories.knowledge_repository import KnowledgeItemRepository
                
                item_repo = KnowledgeItemRepository()
                
                # Simple text search in knowledge items
                items = item_repo.get_by_collection_id(db, knowledge_collection_id)
                
                # Find relevant items by keyword matching
                relevant_items = []
                search_terms = message.lower().split()
                
                for item in items:
                    content_lower = item.content.lower()
                    title_lower = item.title.lower()
                    
                    # Simple relevance scoring
                    relevance_score = 0
                    for term in search_terms:
                        if len(term) > 2:  # Skip very short words
                            if term in title_lower:
                                relevance_score += 2
                            if term in content_lower:
                                relevance_score += 1
                    
                    if relevance_score > 0:
                        relevant_items.append({
                            'item': item,
                            'score': relevance_score
                        })
                
                # Sort by relevance and take top 3
                relevant_items.sort(key=lambda x: x['score'], reverse=True)
                top_items = relevant_items[:3]
                
                if top_items:
                    # Create simple response using template
                    sources = []
                    context_parts = []
                    
                    for item_data in top_items:
                        item = item_data['item']
                        content_snippet = item.content[:300] + "..." if len(item.content) > 300 else item.content
                        
                        context_parts.append(f"From {item.title}: {content_snippet}")
                        sources.append({
                            "title": item.title,
                            "url": item.source_url,
                            "relevance": item_data['score']
                        })
                    
                    # Simple template-based response
                    domain_name = target_url.split('/')[2].replace('www.', '')
                    
                    # Create contextual response based on found content
                    best_item = top_items[0]['item']
                    content_preview = best_item.content[:400]
                    
                    response_text = f"Based on the information from {domain_name}: {content_preview}..."
                    used_content = True
                
                else:
                    response_text = f"That's a great question! While I've analyzed {target_url}, I don't see specific information about that topic in the pages I've reviewed. In the full version, I would have access to your complete website content and could provide more comprehensive answers."
                    sources = []
                    used_content = False
                    
            except Exception as e:
                logger.error(f"Demo simple search failed: {e}")
                response_text = f"Thanks for your question! I'm a demo of how our AI chatbot integrates with {target_url}. In the full version, I would provide detailed responses based on all your website content. This demo shows how seamlessly our chatbot can be embedded into any website!"
                sources = []
                used_content = False
        
        else:
            response_text = f"Hello! I'm your AI assistant demo. While I'm getting familiar with {target_url}, I can tell you that our full system provides instant, accurate responses based on your website content, documents, and other knowledge sources."
            sources = []
            used_content = False
        
        # Add usage reminder for last few messages
        usage_reminder = ""
        if new_remaining <= 3 and new_remaining > 0:
            usage_reminder = f" (💡 {new_remaining} demo messages remaining - sign up for unlimited access!)"
        
        return {
            "response": response_text.strip() + usage_reminder,
            "demo_status": demo_status,
            "sources": sources,
            "used_website_content": used_content,
            "messages_used": messages_used + 1,
            "messages_remaining": new_remaining,
            "registration_required": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Demo service temporarily unavailable")
    
@router.get("/view")
async def demo_viewer(
    url: str,
    session: str,
    db: Session = Depends(get_db)
):
    """Serve target website with injected demo widget - Clean version with no syntax errors."""
    
    try:
        # Validate demo session
        if session not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session_data = demo_sessions[session]
        api_key = demo_session_data.get("api_key")
        
        # Check if demo is expired
        messages_used = demo_session_data.get("messages_used", 0)
        messages_limit = demo_session_data.get("messages_limit", 15)
        
        if messages_used >= messages_limit:
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Demo Complete</title>
                <style>
                    body {{ font-family: system-ui; text-align: center; padding: 40px; background: #f9fafb; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                    .button {{ background: #ea580c; color: white; padding: 12px 24px; border: none; border-radius: 8px; text-decoration: none; display: inline-block; margin: 8px; font-weight: 600; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎉 Demo Complete!</h1>
                    <p>You've used all 15 demo messages. Ready to experience unlimited AI conversations?</p>
                    <a href="https://app.customate.ai/register" class="button">🚀 Start Free Trial</a>
                    <a href="/" class="button" style="background: #6b7280;">Try Another Demo</a>
                </div>
            </body>
            </html>
            """)
        
        # Extract domain for asset fixing
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        base_domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Try to fetch the target website
        import requests
        from bs4 import BeautifulSoup
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            
            if response.status_code == 200:
                html_content = response.text
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Remove all scripts to prevent conflicts
                for script in soup.find_all('script'):
                    script.decompose()
                
                # Fix asset URLs
                for element in soup.find_all(['link', 'img'], {'src': True, 'href': True}):
                    for attr in ['src', 'href']:
                        if element.get(attr):
                            asset_url = element[attr]
                            if asset_url.startswith('/') and not asset_url.startswith('//'):
                                element[attr] = base_domain + asset_url
                            elif asset_url.startswith('./'):
                                element[attr] = base_domain + '/' + asset_url[2:]
                
                # Remove problematic elements
                for element in soup.find_all(['base']):
                    element.decompose()
                
                # Create demo bar
                demo_bar = soup.new_tag('div', id='demo-notification-bar')
                demo_bar.string = f"🤖 AI Demo Mode | Website: {parsed_url.netloc} | {messages_limit - messages_used} messages remaining"
                
                # Set demo bar style
                bar_style = (
                    "position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; "
                    "height: 50px !important; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%) !important; "
                    "color: white !important; display: flex !important; align-items: center !important; "
                    "justify-content: center !important; font-family: system-ui !important; font-size: 14px !important; "
                    "font-weight: 600 !important; z-index: 999999 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;"
                )
                demo_bar['style'] = bar_style
                
                # Create comprehensive styling
                demo_style = soup.new_tag('style')
                style_content = f"""
                    body {{
                        margin-top: 50px !important;
                        overflow-x: hidden !important;
                    }}
                    
                    [class*="widget"]:not(#customate-widget),
                    [class*="chat"]:not(#customate-widget),
                    [class*="feedback"]:not(#customate-widget),
                    [id*="widget"]:not(#customate-widget),
                    [id*="chat"]:not(#customate-widget) {{
                        display: none !important;
                    }}
                    
                    #customate-widget {{
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        z-index: 2147483647 !important;
                        position: fixed !important;
                        bottom: 20px !important;
                        right: 20px !important;
                    }}
                """
                demo_style.string = style_content
                
                # Create widget script
                widget_script = soup.new_tag('script')
                script_content = f"""
                (function() {{
                    console.log('🚀 Demo Widget Initializing...');
                    
                    var script = document.createElement('script');
                    script.src = '{BACKEND_URL}/api/widget/embed.js?api_key={api_key}';
                    script.async = true;
                    script.onload = function() {{
                        console.log('✅ Widget script loaded successfully');
                    }};
                    script.onerror = function() {{
                        console.error('❌ Failed to load widget script');
                    }};
                    
                    document.head.appendChild(script);
                }})();
                """
                widget_script.string = script_content
                
                # Insert elements
                if soup.body:
                    soup.body.insert(0, demo_bar)
                if soup.head:
                    soup.head.append(demo_style)
                    soup.head.append(widget_script)
                
                logger.info("✅ Demo page prepared successfully")
                
                return HTMLResponse(
                    content=str(soup),
                    headers={
                        "Content-Type": "text/html; charset=utf-8",
                        "X-Frame-Options": "SAMEORIGIN",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            
            else:
                raise Exception(f"HTTP {response.status_code}")
                
        except Exception as fetch_error:
            logger.error(f"Failed to fetch {url}: {fetch_error}")
            
            # Fallback clean demo page
            fallback_html = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Demo: {url}</title>
                <style>
                    body {{ 
                        font-family: system-ui; 
                        margin: 0; 
                        padding: 0; 
                        background: #f9fafb;
                        margin-top: 50px;
                    }}
                    .demo-bar {{
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 50px;
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 600;
                        z-index: 999999;
                    }}
                    .container {{ 
                        max-width: 1200px; 
                        margin: 0 auto; 
                        padding: 40px 20px; 
                        background: white; 
                        min-height: calc(100vh - 50px);
                    }}
                    .hero {{ 
                        text-align: center; 
                        padding: 60px 0; 
                        background: #f3f4f6;
                        border-radius: 12px;
                        margin-bottom: 40px;
                    }}
                    .features {{ 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                        gap: 30px; 
                        margin: 40px 0; 
                    }}
                    .feature {{ 
                        padding: 30px; 
                        background: white; 
                        border-radius: 8px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                        border-left: 4px solid #ea580c;
                    }}
                    #customate-widget {{
                        display: block !important;
                        visibility: visible !important;
                        z-index: 2147483647 !important;
                    }}
                </style>
            </head>
            <body>
                <div class="demo-bar">
                    🤖 AI Demo Mode | Website: {parsed_url.netloc} | {messages_limit - messages_used} messages remaining
                </div>
                
                <div class="container">
                    <div class="hero">
                        <h1>Welcome to Our Demo</h1>
                        <p>This is a demonstration of how our AI chatbot integrates with websites.</p>
                        <p><strong>💬 Try asking the chatbot:</strong> "What services do you offer?" or "How can I get started?"</p>
                    </div>
                    
                    <div class="features">
                        <div class="feature">
                            <h3>🚀 Smart Integration</h3>
                            <p>Our AI seamlessly integrates with your existing website, learning from your content to provide intelligent responses.</p>
                        </div>
                        
                        <div class="feature">
                            <h3>💡 Instant Responses</h3>
                            <p>Get immediate, accurate answers based on your website content, reducing response time and improving customer satisfaction.</p>
                        </div>
                        
                        <div class="feature">
                            <h3>📈 Boost Engagement</h3>
                            <p>Increase visitor engagement and conversion rates with 24/7 intelligent customer support that never sleeps.</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 40px; background: #f9fafb; border-radius: 8px; margin-top: 40px;">
                        <h2>🤖 Try the AI Assistant</h2>
                        <p>The chatbot in the bottom-right corner has been trained on website content. Ask it anything!</p>
                    </div>
                </div>
                
                <script>
                    (function() {{
                        console.log('🚀 Initializing Demo Widget...');
                        
                        function loadWidget() {{
                            var script = document.createElement('script');
                            script.src = '{BACKEND_URL}/api/widget/embed.js?api_key={api_key}';
                            script.async = true;
                            script.onload = function() {{
                                console.log('✅ Demo widget loaded successfully');
                            }};
                            script.onerror = function() {{
                                console.error('❌ Failed to load demo widget');
                                setTimeout(loadWidget, 3000);
                            }};
                            document.head.appendChild(script);
                        }}
                        
                        loadWidget();
                        
                        window.addEventListener('load', function() {{
                            setTimeout(function() {{
                                if (!window.CustomateWidget) {{
                                    loadWidget();
                                }}
                            }}, 2000);
                        }});
                    }})();
                </script>
            </body>
            </html>
            """
            
            return HTMLResponse(
                content=fallback_html,
                headers={
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            )
    
    except Exception as e:
        logger.error(f"Demo viewer error: {str(e)}")
        raise HTTPException(status_code=500, detail="Demo viewer error")    

@router.delete("/cleanup")
async def cleanup_old_demos(db: Session = Depends(get_db)):
    """Clean up demo sessions older than 24 hours and their knowledge collections."""
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=240)
        cleaned_count = 0
        
        for demo_id, session in list(demo_sessions.items()):
            created_at = session.get("created_at")
            if created_at and created_at < cutoff_time:
                
                # Clean up knowledge collection if exists
                collection_id = session.get("knowledge_collection_id")
                if collection_id:
                    try:
                        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
                        collection_repo = KnowledgeCollectionRepository()
                        collection_repo.delete(db, collection_id)
                        logger.info(f"Cleaned up demo knowledge collection: {collection_id}")
                    except Exception as e:
                        logger.error(f"Failed to clean collection {collection_id}: {e}")
                
                # Remove from memory
                del demo_sessions[demo_id]
                cleaned_count += 1
                logger.info(f"Cleaned up old demo session: {demo_id}")
        
        return {
            "cleaned_sessions": cleaned_count,
            "active_sessions": len(demo_sessions)
        }
        
    except Exception as e:
        logger.error(f"Demo cleanup error: {str(e)}")
        raise HTTPException(status_code=500, detail="Cleanup failed")    