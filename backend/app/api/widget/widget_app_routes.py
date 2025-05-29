from fastapi import APIRouter, Response, HTTPException, Request, Query, Header
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
import os
import json
import mimetypes
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Path to the built widget app
WIDGET_APP_PATH = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "widget-app" / "dist"

# Environment detection
IS_DEVELOPMENT = os.environ.get("ENVIRONMENT", "development").lower() == "development"
BACKEND_URL = "http://localhost:8000" if IS_DEVELOPMENT else "https://customate-ai-1.onrender.com"

def check_widget_app_built() -> bool:
    """Check if the React widget app has been built."""
    return (WIDGET_APP_PATH / "index.html").exists()

def get_build_instructions() -> str:
    """Get build instructions for the React widget app."""
    return """
    To build the React widget app:
    
    1. Navigate to the widget app directory:
       cd frontend/widget-app
    
    2. Install dependencies:
       npm install
    
    3. Build the app:
       npm run build
    
    4. Alternatively, use the build script:
       bash scripts/build-widget.sh
    """

# Handle both GET and HEAD requests for the main widget app
@router.get("/app/")
@router.head("/app/")
@router.get("/app/index.html")
@router.head("/app/index.html")
async def serve_widget_app(
    request: Request,
    api_key: Optional[str] = Query(None),
    test: Optional[str] = Query(None),
    inline: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None)
):
    """
    Serve the main React widget app HTML file with enhanced parameter handling.
    Handles both GET and HEAD requests.
    """
    try:
        logger.info(f"📡 Widget app request: {request.method} {request.url}")
        
        # For HEAD requests, just return status without content
        if request.method == "HEAD":
            if not check_widget_app_built():
                logger.warning("❌ Widget app not built (HEAD request)")
                return Response(status_code=503)
            else:
                logger.info("✅ Widget app available (HEAD request)")
                return Response(
                    status_code=200,
                    headers={
                        "Content-Type": "text/html; charset=utf-8",
                        "X-Frame-Options": "ALLOWALL",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
        
        # Check if widget app is built
        if not check_widget_app_built():
            logger.error("❌ React widget app not built")
            return HTMLResponse(
                content=f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Widget App Not Built</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {{ 
                            font-family: system-ui, -apple-system, sans-serif; 
                            padding: 20px; 
                            text-align: center; 
                            background: #f8fafc;
                            color: #374151;
                        }}
                        .container {{ 
                            max-width: 600px; 
                            margin: 0 auto; 
                            background: white; 
                            padding: 40px; 
                            border-radius: 12px; 
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        }}
                        .error-icon {{ font-size: 48px; margin-bottom: 20px; }}
                        .code {{ 
                            background: #1f2937; 
                            color: #10b981; 
                            padding: 20px; 
                            border-radius: 8px; 
                            font-family: monospace; 
                            text-align: left; 
                            margin: 20px 0;
                            white-space: pre-line;
                        }}
                        .button {{
                            display: inline-block;
                            background: #ea580c;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 8px;
                            text-decoration: none;
                            margin: 10px;
                        }}
                        .env-info {{
                            background: #fef3c7;
                            border: 1px solid #f59e0b;
                            border-radius: 6px;
                            padding: 12px;
                            margin: 20px 0;
                            font-size: 14px;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error-icon">🚧</div>
                        <h1>React Widget App Not Built</h1>
                        <p>The React widget application needs to be built before it can be served.</p>
                        
                        <div class="env-info">
                            <strong>Environment:</strong> {os.environ.get("ENVIRONMENT", "development")}<br>
                            <strong>Backend URL:</strong> {BACKEND_URL}<br>
                            <strong>Widget Path:</strong> {WIDGET_APP_PATH}
                        </div>
                        
                        <h3>Build Instructions:</h3>
                        <div class="code">{get_build_instructions()}</div>
                        
                        <div>
                            <a href="{BACKEND_URL}/api/widget/health" class="button">Check Widget Health</a>
                            <a href="{BACKEND_URL}/api/docs" class="button">API Documentation</a>
                        </div>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                            Once built, this will serve the React-based chat widget.
                        </p>
                    </div>
                </body>
                </html>
                """,
                status_code=503
            )
        
        index_path = WIDGET_APP_PATH / "index.html"
        
        # Read and modify HTML to inject environment variables and parameters
        with open(index_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Inject configuration script
        config_script = f"""
        <script>
            // React Widget App Configuration
            window.REACT_WIDGET_CONFIG = {{
                apiKey: '{api_key or ''}',
                testMode: {str(test == 'true').lower()},
                inlineMode: {str(inline == 'true').lower()},
                clientId: '{client_id or ''}',
                backendUrl: '{BACKEND_URL}',
                environment: '{os.environ.get("ENVIRONMENT", "development")}',
                timestamp: {int(__import__('time').time() * 1000)}
            }};
            
            console.log('⚛️ React Widget App Configuration:', window.REACT_WIDGET_CONFIG);
            
            // Debug information for development
            if (window.REACT_WIDGET_CONFIG.environment === 'development') {{
                console.log('🛠️ Development mode active');
                console.log('📡 Backend URL:', window.REACT_WIDGET_CONFIG.backendUrl);
                console.log('🔑 API Key:', window.REACT_WIDGET_CONFIG.apiKey ? 
                    window.REACT_WIDGET_CONFIG.apiKey.substring(0, 8) + '...' : 'Not provided');
            }}
        </script>
        """
        
        # Insert configuration before closing </head> tag
        html_content = html_content.replace('</head>', config_script + '</head>')
        
        # Set appropriate headers
        headers = {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",  # Allow embedding in iframes
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache, no-store, must-revalidate" if IS_DEVELOPMENT else "public, max-age=300",
            "Pragma": "no-cache" if IS_DEVELOPMENT else "public",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
        }
        
        logger.info(f"✅ Serving React widget app - API Key: {api_key[:8] + '...' if api_key else 'None'}, Test: {test}, Inline: {inline}")
        
        return HTMLResponse(content=html_content, headers=headers)
        
    except Exception as e:
        logger.error(f"❌ Error serving React widget app: {str(e)}")
        return HTMLResponse(
            content=f"""
            <html>
                <body style="font-family: system-ui; padding: 20px; text-align: center;">
                    <div style="max-width: 400px; margin: 0 auto;">
                        <h2>⚠️ Widget Loading Error</h2>
                        <p>Failed to load the React widget application.</p>
                        <p style="color: #666; font-size: 14px;">Error: {str(e)}</p>
                        <button onclick="window.location.reload()" 
                                style="background: #ea580c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                </body>
            </html>
            """,
            status_code=500
        )

@router.get("/app/{file_path:path}")
@router.head("/app/{file_path:path}")
async def serve_widget_app_assets(file_path: str, request: Request):
    """
    Serve React widget app static assets with proper MIME types and caching.
    Handles both GET and HEAD requests.
    """
    try:
        logger.debug(f"📁 Widget asset request: {request.method} {file_path}")
        
        if not check_widget_app_built():
            raise HTTPException(status_code=503, detail="Widget app not built")
        
        file_full_path = WIDGET_APP_PATH / file_path
        
        # Security check - prevent directory traversal
        try:
            file_full_path.resolve().relative_to(WIDGET_APP_PATH.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_full_path.exists() or not file_full_path.is_file():
            logger.warning(f"❌ React widget asset not found: {file_path}")
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(str(file_full_path))
        if not content_type:
            content_type = "application/octet-stream"
        
        # Special handling for JavaScript files
        if file_path.endswith('.js'):
            content_type = "application/javascript; charset=utf-8"
        elif file_path.endswith('.css'):
            content_type = "text/css; charset=utf-8"
        
        # Set caching headers
        cache_control = "no-cache" if IS_DEVELOPMENT else "public, max-age=31536000"  # 1 year for production
        
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": cache_control
        }
        
        # For HEAD requests, return just headers
        if request.method == "HEAD":
            return Response(
                headers={
                    **headers,
                    "Content-Type": content_type,
                    "Content-Length": str(file_full_path.stat().st_size)
                }
            )
        
        logger.debug(f"✅ Serving React widget asset: {file_path} ({content_type})")
        
        return FileResponse(
            path=str(file_full_path),
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error serving React widget asset {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Asset serving error: {str(e)}")

@router.get("/embed")
async def get_widget_embed_code(
    request: Request,
    api_key: Optional[str] = Query(None),
    position: Optional[str] = Query("bottom-right"),
    width: Optional[str] = Query("350"),
    height: Optional[str] = Query("500")
):
    """Generate enhanced embed code for the React widget with customization options."""
    try:
        # Use API key from query param or request headers
        if not api_key:
            api_key = request.headers.get("X-API-Key") or "{YOUR_API_KEY}"
        
        # Position mapping
        position_styles = {
            "bottom-right": "bottom: 20px; right: 20px;",
            "bottom-left": "bottom: 20px; left: 20px;",
            "top-right": "top: 20px; right: 20px;",
            "top-left": "top: 20px; left: 20px;"
        }
        
        position_style = position_styles.get(position, position_styles["bottom-right"])
        
        embed_code = f"""<!-- Customate.ai React Widget (iframe-based) -->
<iframe 
    src="{BACKEND_URL}/api/widget/app/?api_key={api_key}"
    width="{width}" 
    height="{height}"
    frameborder="0"
    style="position: fixed; {position_style} border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 999999;"
    allow="clipboard-write"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    title="Customate.ai Chat Widget"
    loading="lazy">
</iframe>"""
        
        return {
            "embed_code": embed_code,
            "configuration": {
                "api_key": api_key,
                "position": position,
                "width": width,
                "height": height,
                "backend_url": BACKEND_URL
            },
            "instructions": [
                "Replace {YOUR_API_KEY} with your actual API key",
                "Paste this code before the closing </body> tag",
                "The widget will automatically sync settings from your dashboard"
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating embed code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embed code generation error: {str(e)}")

@router.get("/status")
async def get_widget_app_status():
    """Get comprehensive status of the React widget app."""
    try:
        widget_built = check_widget_app_built()
        
        status = {
            "widget_app_built": widget_built,
            "widget_path": str(WIDGET_APP_PATH),
            "backend_url": BACKEND_URL,
            "environment": os.environ.get("ENVIRONMENT", "development"),
            "is_development": IS_DEVELOPMENT
        }
        
        if widget_built:
            # Get build info
            index_path = WIDGET_APP_PATH / "index.html"
            status["build_info"] = {
                "index_size": index_path.stat().st_size,
                "build_time": index_path.stat().st_mtime,
                "assets": []
            }
            
            # List built assets
            for file_path in WIDGET_APP_PATH.rglob("*"):
                if file_path.is_file() and file_path.suffix in ['.js', '.css', '.html']:
                    status["build_info"]["assets"].append({
                        "name": file_path.name,
                        "size": file_path.stat().st_size,
                        "path": str(file_path.relative_to(WIDGET_APP_PATH))
                    })
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Error getting widget app status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")

# CORS preflight handlers
@router.options("/app/")
@router.options("/app/{path:path}")
async def widget_app_options(path: str = ""):
    """Handle CORS preflight requests for widget app endpoints."""
    return Response(
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Access-Control-Max-Age": "3600"
        }
    )