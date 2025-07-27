# backend/app/api/widget/widget_app_routes.py
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

def find_widget_dist_path():
    """
    Smart widget path detection - searches multiple possible locations.
    """
    possible_paths = [
        # Original path calculation
        Path(__file__).parent.parent.parent.parent.parent / "frontend" / "widget-app" / "dist",
        
        # Alternative calculations for different deployment scenarios
        Path.cwd() / "frontend" / "widget-app" / "dist",
        Path("/opt/render/project/src/frontend/widget-app/dist"),
        Path("/app/frontend/widget-app/dist"),
        
        # Search from current file location
        Path(__file__).parent.parent.parent.parent / "frontend" / "widget-app" / "dist",
        Path(__file__).parent.parent.parent / "frontend" / "widget-app" / "dist",
        
        # Relative to backend directory
        Path(__file__).parent.parent.parent / ".." / "frontend" / "widget-app" / "dist",
    ]
    
    # Try each path
    for path in possible_paths:
        try:
            resolved_path = path.resolve()
            if resolved_path.exists() and (resolved_path / "index.html").exists():
                logger.info(f"✅ Found widget files at: {resolved_path}")
                return resolved_path
        except Exception as e:
            logger.debug(f"Failed to resolve path {path}: {e}")
            continue
    
    # If no standard paths work, search the entire project for widget files
    search_roots = [Path.cwd(), Path(__file__).parent.parent.parent.parent.parent]
    
    for root in search_roots:
        try:
            for path in root.rglob("index.html"):
                if "widget-app" in str(path) and "dist" in str(path):
                    widget_dist = path.parent
                    logger.info(f"🔍 Found widget via search at: {widget_dist}")
                    return widget_dist
        except Exception as e:
            logger.debug(f"Search failed in {root}: {e}")
            continue
    
    logger.error("❌ Could not find widget dist directory in any location")
    return None

# Get widget path on module load
WIDGET_APP_PATH = find_widget_dist_path()

# Environment detection with fallback
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "").lower() == "production"
if not IS_PRODUCTION:
    # Check other environment indicators
    IS_PRODUCTION = any([
        os.environ.get("RENDER", "").lower() == "true",
        os.environ.get("NODE_ENV", "").lower() == "production",
        "render.com" in os.environ.get("RENDER_EXTERNAL_URL", ""),
        "/opt/render" in str(Path.cwd())
    ])

BACKEND_URL = "https://customate-ai-1.onrender.com" if IS_PRODUCTION else "http://localhost:8000"

def check_widget_app_built() -> bool:
    """Check if the React widget app has been built."""
    if WIDGET_APP_PATH is None:
        return False
    return (WIDGET_APP_PATH / "index.html").exists()

def get_system_info():
    """Get comprehensive system information for debugging."""
    info = {
        "current_working_directory": str(Path.cwd()),
        "file_location": str(Path(__file__)),
        "environment_vars": {
            "ENVIRONMENT": os.environ.get("ENVIRONMENT", "not set"),
            "RENDER": os.environ.get("RENDER", "not set"),
            "NODE_ENV": os.environ.get("NODE_ENV", "not set"),
            "RENDER_EXTERNAL_URL": os.environ.get("RENDER_EXTERNAL_URL", "not set"),
        },
        "detected_production": IS_PRODUCTION,
        "widget_path_found": str(WIDGET_APP_PATH) if WIDGET_APP_PATH else "None",
        "widget_built": check_widget_app_built(),
        "backend_url": BACKEND_URL
    }
    
    # Search for any widget-related files
    widget_files = []
    try:
        for root in [Path.cwd(), Path(__file__).parent.parent.parent.parent.parent]:
            for path in root.rglob("*widget*"):
                if path.is_file():
                    widget_files.append(str(path))
        info["widget_files_found"] = widget_files[:20]  # Limit to 20 files
    except Exception as e:
        info["widget_files_search_error"] = str(e)
    
    return info

@router.get("/debug")
async def widget_debug():
    """Comprehensive debug endpoint."""
    return get_system_info()

@router.get("/health")
async def widget_health():
    """Enhanced widget health check."""
    system_info = get_system_info()
    
    return {
        "service": "widget",
        "status": "healthy" if check_widget_app_built() else "widget_not_built",
        "widget_app_built": check_widget_app_built(),
        "widget_path": str(WIDGET_APP_PATH) if WIDGET_APP_PATH else None,
        "backend_url": BACKEND_URL,
        "environment": "production" if IS_PRODUCTION else "development",
        "system_info": system_info
    }

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
    """Serve the main React widget app HTML file."""
    try:
        # Check if widget is built
        if not check_widget_app_built():
            system_info = get_system_info()
            return HTMLResponse(
                content=f"""
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Widget Debug - Customate.ai</title>
                        <style>
                            body {{ font-family: system-ui; margin: 0; padding: 20px; background: #f8fafc; }}
                            .container {{ max-width: 1000px; margin: 0 auto; }}
                            .card {{ background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                            .error {{ background: #fef2f2; border-left: 4px solid #ef4444; }}
                            .info {{ background: #f0f9ff; border-left: 4px solid #3b82f6; }}
                            .code {{ background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; }}
                            .button {{ display: inline-block; background: #ea580c; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin: 5px; }}
                            h1 {{ color: #1f2937; }}
                            h2 {{ color: #374151; margin-top: 30px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🔍 Widget Debug Information</h1>
                            
                            <div class="card error">
                                <h2>❌ Issue: Widget Files Not Found</h2>
                                <p>The React widget application files could not be located on the server.</p>
                            </div>
                            
                            <div class="card info">
                                <h2>📊 System Information</h2>
                                <div class="code">{json.dumps(system_info, indent=2)}</div>
                            </div>
                            
                            <div class="card">
                                <h2>🛠️ Quick Actions</h2>
                                <a href="{BACKEND_URL}/api/widget/health" class="button">Health Check</a>
                                <a href="{BACKEND_URL}/api/widget/debug" class="button">Full Debug JSON</a>
                                <a href="{BACKEND_URL}/docs" class="button">API Docs</a>
                            </div>
                            
                            <div class="card">
                                <h2>💡 Next Steps</h2>
                                <ol>
                                    <li>Check if widget files were committed to git: <code>git ls-files | grep "widget.*dist"</code></li>
                                    <li>Verify build process: <code>cd frontend/widget-app && npm run build</code></li>
                                    <li>Force commit built files: <code>git add -f frontend/widget-app/dist/ && git commit -m "Add widget files"</code></li>
                                    <li>Check deployment logs in Render dashboard</li>
                                </ol>
                            </div>
                        </div>
                    </body>
                </html>
                """,
                status_code=503
            )
        
        # Serve the widget
        index_path = WIDGET_APP_PATH / "index.html"
        with open(index_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Inject configuration
        config_script = f"""
        <script>
            window.REACT_WIDGET_CONFIG = {{
                apiKey: '{api_key or ''}',
                testMode: {str(test == 'true').lower()},
                inlineMode: {str(inline == 'true').lower()},
                clientId: '{client_id or ''}',
                backendUrl: '{BACKEND_URL}',
                environment: '{"production" if IS_PRODUCTION else "development"}',
                timestamp: {int(__import__('time').time() * 1000)}
            }};
            console.log('⚛️ Widget Config:', window.REACT_WIDGET_CONFIG);
        </script>
        """
        
        html_content = html_content.replace('</head>', config_script + '</head>')
        
        return HTMLResponse(content=html_content, headers={
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache" if not IS_PRODUCTION else "public, max-age=300"
        })
        
    except Exception as e:
        logger.error(f"❌ Error serving widget: {str(e)}")
        return HTMLResponse(
            content=f"""
            <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                    <h2>⚠️ Widget Service Error</h2>
                    <p>Unexpected error: {str(e)}</p>
                    <a href="{BACKEND_URL}/api/widget/debug" style="background: #ea580c; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Debug Info</a>
                </body>
            </html>
            """,
            status_code=500
        )

@router.get("/app/{file_path:path}")
async def serve_widget_assets(file_path: str):
    """Serve widget static assets."""
    if not WIDGET_APP_PATH:
        raise HTTPException(status_code=404, detail="Widget assets not found")
    
    file_location = WIDGET_APP_PATH / file_path
    
    if not file_location.exists() or not file_location.is_file():
        raise HTTPException(status_code=404, detail=f"Asset not found: {file_path}")
    
    return FileResponse(file_location)