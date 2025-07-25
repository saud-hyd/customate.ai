# backend/app/api/widget/embed_routes.py
from fastapi import APIRouter, Query
from fastapi.responses import Response
import os

router = APIRouter()

# Environment detection
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development").lower() == "production"
BACKEND_URL = "https://customate-ai-1.onrender.com" if IS_PRODUCTION else "http://localhost:8000"

@router.get("/embed.js")
async def serve_embed_script(api_key: str = Query(...)):
    """Universal embed script for one-line widget implementation"""
    
    embed_script = f"""
(function() {{
    'use strict';
    
    console.log('🚀 Customate Widget Loading...');
    console.log('📊 API Key: {api_key[:8]}...');
    
    // Prevent multiple instances
    if (window.CustomateWidget) {{
        console.warn('⚠️ Widget already loaded');
        return;
    }}
    
    window.CustomateWidget = {{
        version: '2.0.0',
        apiKey: '{api_key}',
        loaded: false
    }};
    
    // Create iframe
    function createWidget() {{
        const iframe = document.createElement('iframe');
        iframe.id = 'customate-widget';
        iframe.src = '{BACKEND_URL}/api/widget/app/?api_key={api_key}&floating=true';
        iframe.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 80px !important;
            height: 80px !important;
            border: none !important;
            border-radius: 50% !important;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3) !important;
            z-index: 2147483647 !important;
            transition: all 0.3s ease !important;
        `;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'clipboard-write');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
        
        document.body.appendChild(iframe);
        
        // Handle resize messages
        window.addEventListener('message', function(event) {{
            if (event.origin !== '{BACKEND_URL}') return;
            
            const {{ type, data }} = event.data || {{}};
            if (type === 'WIDGET_RESIZE') {{
                const size = data.expanded ? {{width: 400, height: 620}} : {{width: 80, height: 80}};
                iframe.style.width = size.width + 'px';
                iframe.style.height = size.height + 'px';
                iframe.style.borderRadius = data.expanded ? '12px' : '50%';
            }}
        }});
        
        window.CustomateWidget.loaded = true;
        console.log('✅ Widget initialized');
    }}
    
    // Initialize
    if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', createWidget);
    }} else {{
        createWidget();
    }}
    
}})();
"""
    
    return Response(
        content=embed_script,
        media_type="application/javascript",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "no-cache"
        }
    )

@router.get("/widget.js") 
async def serve_embed_script_alias(key: str = Query(...)):
    """Alternative endpoint: /widget.js?key=abc123"""
    return await serve_embed_script(api_key=key)