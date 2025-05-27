from fastapi import APIRouter, Response, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
import os
import json
from pathlib import Path

router = APIRouter()

# Path to the built widget app
WIDGET_APP_PATH = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "widget-app" / "dist"

@router.get("/app/")
@router.get("/app/index.html")
async def serve_widget_app():
    """Serve the main widget app HTML file."""
    try:
        index_path = WIDGET_APP_PATH / "index.html"
        if not index_path.exists():
            raise HTTPException(status_code=404, detail="Widget app not built. Run 'npm run build' in widget-app directory.")
        
        return FileResponse(
            path=str(index_path),
            media_type="text/html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    except Exception as e:
        return HTMLResponse(
            content=f"""
            <html>
                <body>
                    <div style="padding: 20px; text-align: center; font-family: system-ui;">
                        <h2>Widget App Not Available</h2>
                        <p>Error: {str(e)}</p>
                        <p>Please build the widget app first:</p>
                        <code>cd frontend/widget-app && npm run build</code>
                    </div>
                </body>
            </html>
            """,
            status_code=503
        )

@router.get("/app/{file_path:path}")
async def serve_widget_app_assets(file_path: str):
    """Serve widget app static assets."""
    try:
        file_full_path = WIDGET_APP_PATH / file_path
        
        if not file_full_path.exists() or not file_full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine content type
        content_type = "text/plain"
        if file_path.endswith('.js'):
            content_type = "application/javascript"
        elif file_path.endswith('.css'):
            content_type = "text/css"
        elif file_path.endswith('.html'):
            content_type = "text/html"
        elif file_path.endswith('.json'):
            content_type = "application/json"
        elif file_path.endswith('.png'):
            content_type = "image/png"
        elif file_path.endswith('.ico'):
            content_type = "image/x-icon"
        
        return FileResponse(
            path=str(file_full_path),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000" if not file_path.endswith('.html') else "no-cache"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/embed")
async def get_widget_embed_code():
    """Generate embed code for the iframe-based widget."""
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    embed_code = f"""<!-- Customate.ai Widget (iframe-based) -->
<iframe 
    src="{backend_url}/api/widget/app/?api_key={{YOUR_API_KEY}}"
    width="350" 
    height="500"
    frameborder="0"
    style="position: fixed; bottom: 20px; right: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 999999;"
    allow="clipboard-write"
    sandbox="allow-scripts allow-same-origin allow-forms">
</iframe>"""
    
    return {
        "embed_code": embed_code,
        "instructions": "Replace {YOUR_API_KEY} with your actual API key",
        "widget_url": f"{backend_url}/api/widget/app/",
        "test_url": f"{backend_url}/api/widget/app/?test=true&api_key={{YOUR_API_KEY}}"
    }