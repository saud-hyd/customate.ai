# backend/app/services/knowledge/content_extractor.py
import trafilatura
from readability import Document
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
import re
import json

class EnhancedContentExtractor:
    """Enhanced content extractor using multiple strategies for better content capture."""
    
    def extract_content(self, html: str, url: str) -> Dict[str, Any]:
        """
        Extract rich content using multiple strategies.
        
        Args:
            html: Raw HTML content
            url: URL of the page
            
        Returns:
            Dictionary with extracted content and metadata
        """
        # Try multiple extraction methods and use the best result
        result = {
            "title": "",
            "text": "",
            "html": "",
            "metadata": {},
            "images": [],
            "tables": [],
            "links": []
        }
        
        # Method 1: Try trafilatura (good for general content)
        trafilatura_result = self._extract_with_trafilatura(html, url)
        if trafilatura_result and trafilatura_result.get("text", "").strip():
            result = trafilatura_result
        else:
            # Method 2: Try readability
            readability_result = self._extract_with_readability(html, url)
            if readability_result and readability_result.get("text", "").strip():
                result = readability_result
            else:
                # Method 3: Fall back to BeautifulSoup with enhanced selectors
                soup_result = self._extract_with_soup(html, url)
                if soup_result:
                    result = soup_result
        
        # Extract additional metadata regardless of extraction method
        soup = BeautifulSoup(html, 'html.parser')
        result["metadata"].update(self._extract_metadata(soup, url))
        
        # Extract images if not already done
        if not result.get("images"):
            result["images"] = self._extract_images(soup, url)
        
        # Extract tables if not already done
        if not result.get("tables"):
            result["tables"] = self._extract_tables(soup)
            
        return result
    
    def _extract_with_trafilatura(self, html: str, url: str) -> Dict[str, Any]:
        """Extract content using trafilatura library."""
        try:
            extracted = trafilatura.extract(
                html,
                output_format='json',
                with_metadata=True,
                include_links=True,
                include_images=True,
                include_tables=True
            )
            
            if not extracted:
                return {}
                
            data = json.loads(extracted)
            
            # Format the result
            return {
                "title": data.get("title", ""),
                "text": data.get("text", ""),
                "html": data.get("html", ""),
                "metadata": {
                    "author": data.get("author", ""),
                    "date": data.get("date", ""),
                    "description": data.get("description", ""),
                    "categories": data.get("categories", []),
                    "tags": data.get("tags", [])
                },
                "images": data.get("images", []),
                "tables": data.get("tables", []),
                "links": data.get("links", [])
            }
        except Exception as e:
            print(f"Trafilatura extraction error: {str(e)}")
            return {}
    
    def _extract_with_readability(self, html: str, url: str) -> Dict[str, Any]:
        """Extract content using readability-lxml."""
        try:
            doc = Document(html)
            title = doc.title()
            summary_html = doc.summary()
            
            soup = BeautifulSoup(summary_html, 'html.parser')
            text = soup.get_text(separator='\n\n')
            
            # Extract images from the summary
            images = []
            for img in soup.find_all('img', src=True):
                img_url = img['src']
                if not img_url.startswith(('http://', 'https://')):
                    img_url = urljoin(url, img_url)
                images.append({
                    "url": img_url,
                    "alt": img.get('alt', ''),
                    "title": img.get('title', '')
                })
            
            # Extract tables from the summary
            tables = []
            for table in soup.find_all('table'):
                tables.append(str(table))
            
            return {
                "title": title,
                "text": text,
                "html": summary_html,
                "metadata": {},
                "images": images,
                "tables": tables,
                "links": []
            }
        except Exception as e:
            print(f"Readability extraction error: {str(e)}")
            return {}
    
    def _extract_with_soup(self, html: str, url: str) -> Dict[str, Any]:
        """Extract content using enhanced BeautifulSoup selectors."""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Enhanced list of content selectors
            content_selectors = [
                "article", "main", 
                ".content", "#content", 
                ".post", ".post-content", ".entry-content",
                ".article", ".article-content", ".article-body",
                "#main-content", ".main-content",
                ".story", ".story-body",
                "[itemprop='articleBody']", 
                ".blog-post", ".blog-entry"
            ]
            
            # Elements to exclude
            exclude_selectors = [
                "nav", "header", "footer", "aside", 
                ".navigation", ".menu", ".sidebar", ".footer", 
                ".comments", ".related", ".ads", 
                ".nav", ".navbar", ".breadcrumbs",
                ".social", ".sharing", ".share-buttons",
                ".recommendations", ".suggested", ".popular",
                ".author-bio", ".author-box",
                ".subscription", ".newsletter",
                "script", "style", "iframe"
            ]
            
            # Remove excluded elements
            for selector in exclude_selectors:
                for element in soup.select(selector):
                    element.decompose()
            
            # Try to find content using enhanced selectors
            content_element = None
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element and len(element.get_text(strip=True)) > 100:
                    content_element = element
                    break
            
            # Use content div with most paragraph elements as fallback
            if not content_element:
                divs = soup.find_all('div')
                best_div = None
                most_paragraphs = 0
                
                for div in divs:
                    p_count = len(div.find_all('p'))
                    if p_count > most_paragraphs:
                        most_paragraphs = p_count
                        best_div = div
                
                if best_div and most_paragraphs > 2:
                    content_element = best_div
                else:
                    # Last resort: just use body
                    content_element = soup.body
            
            if not content_element:
                return {}
            
            # Extract text, preserving some structure
            paragraphs = []
            for p in content_element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                paragraphs.append(p.get_text(strip=True))
            
            # Extract title
            title = ""
            title_element = soup.find('title')
            if title_element:
                title = title_element.string.strip()
            
            # Extract images
            images = self._extract_images(content_element, url)
            
            # Extract tables
            tables = self._extract_tables(content_element)
            
            return {
                "title": title,
                "text": "\n\n".join(paragraphs),
                "html": str(content_element),
                "metadata": {},
                "images": images,
                "tables": tables,
                "links": []
            }
        except Exception as e:
            print(f"BeautifulSoup extraction error: {str(e)}")
            return {}
    
    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract metadata from page."""
        metadata = {}
        
        # Extract OpenGraph metadata
        for meta in soup.find_all('meta'):
            if meta.get('property') and meta.get('property').startswith('og:'):
                key = meta['property'][3:]
                metadata[key] = meta.get('content', '')
            elif meta.get('name') and meta.get('name').startswith('twitter:'):
                key = meta['name'][8:]
                metadata[key] = meta.get('content', '')
            elif meta.get('name') in ['description', 'keywords', 'author', 'date', 'article:published_time']:
                key = meta['name']
                metadata[key] = meta.get('content', '')
        
        # Try to extract publication date
        if not metadata.get('date'):
            # Common date patterns in articles
            date_patterns = [
                # Look for schema.org markup
                ('script[type="application/ld+json"]', r'"datePublished":\s*"([^"]+)"'),
                # Look for common date classes
                ('.date', None),
                ('.published', None),
                ('.post-date', None),
                ('.entry-date', None),
                ('time', None)
            ]
            
            for selector, pattern in date_patterns:
                elements = soup.select(selector)
                for el in elements:
                    if pattern:
                        match = re.search(pattern, str(el))
                        if match:
                            metadata['date'] = match.group(1)
                            break
                    else:
                        if el.get('datetime'):
                            metadata['date'] = el['datetime']
                            break
                        date_text = el.get_text(strip=True)
                        if date_text and len(date_text) < 50:  # Likely a date if text is short
                            metadata['date'] = date_text
                            break
                
                if metadata.get('date'):
                    break
        
        return metadata
    
    def _extract_images(self, element: BeautifulSoup, url: str) -> list:
        """Extract images from content."""
        from urllib.parse import urljoin
        
        images = []
        for img in element.find_all('img', src=True):
            img_url = img['src']
            if not img_url.startswith(('http://', 'https://')):
                img_url = urljoin(url, img_url)
            
            # Skip tiny images and common icons
            if img.get('width') and int(img['width']) < 100:
                continue
            if img.get('height') and int(img['height']) < 100:
                continue
            if 'icon' in img_url.lower() or 'logo' in img_url.lower():
                continue
                
            images.append({
                "url": img_url,
                "alt": img.get('alt', ''),
                "title": img.get('title', '')
            })
        
        return images
    
    def _extract_tables(self, element: BeautifulSoup) -> list:
        """Extract tables from content."""
        tables = []
        for table in element.find_all('table'):
            # Skip tiny tables which are likely for layout
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue
                
            # Extract table data
            table_data = []
            for tr in rows:
                row_data = []
                cells = tr.find_all(['td', 'th'])
                for cell in cells:
                    row_data.append(cell.get_text(strip=True))
                if row_data:
                    table_data.append(row_data)
            
            if table_data:
                tables.append({
                    "html": str(table),
                    "data": table_data
                })
        
        return tables