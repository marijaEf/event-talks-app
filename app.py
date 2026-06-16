import os
import time
import hashlib
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
cache = {
    "data": None,
    "last_fetched": 0,
    "expiry_seconds": 600  # 10 minutes cache
}

def parse_release_notes():
    """Fetches and parses the BigQuery release notes XML feed."""
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        root = ET.fromstring(response.content)
        # Handle Atom namespace
        ns = "{http://www.w3.org/2005/Atom}"
        
        parsed_items = []
        
        for entry in root.findall(f"{ns}entry"):
            date_str = entry.find(f"{ns}title").text or "Unknown Date"
            updated_str = entry.find(f"{ns}updated").text or ""
            
            # Find the self link
            link_el = entry.find(f"{ns}link")
            link_str = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_el = entry.find(f"{ns}content")
            content_html = content_el.text if content_el is not None else ""
            
            if not content_html.strip():
                continue
                
            # Parse individual updates by splitting on <h3> tags using BeautifulSoup
            soup = BeautifulSoup(content_html, 'html.parser')
            h3s = soup.find_all('h3')
            
            if not h3s:
                # Fallback: if no <h3> tags, make it one big update
                item_content = str(soup)
                item_id = hashlib.md5(f"{date_str}-{item_content}".encode('utf-8')).hexdigest()
                parsed_items.append({
                    "id": item_id,
                    "date": date_str,
                    "raw_date": updated_str,
                    "type": "General",
                    "content": item_content,
                    "link": link_str
                })
            else:
                for h3 in h3s:
                    item_type = h3.get_text(strip=True)
                    item_content_list = []
                    
                    # Gather sibling elements until next h3
                    for sibling in h3.next_siblings:
                        if sibling.name == 'h3':
                            break
                        if sibling.name:
                            item_content_list.append(str(sibling))
                        elif sibling.strip():
                            item_content_list.append(sibling.strip())
                            
                    item_content = "".join(item_content_list)
                    
                    # Construct a unique ID using md5 hash of type + date + content
                    item_hash_payload = f"{item_type}-{date_str}-{item_content}"
                    item_id = hashlib.md5(item_hash_payload.encode('utf-8')).hexdigest()
                    
                    parsed_items.append({
                        "id": item_id,
                        "date": date_str,
                        "raw_date": updated_str,
                        "type": item_type,
                        "content": item_content,
                        "link": link_str
                    })
                    
        return parsed_items
    except Exception as e:
        print(f"Error parsing feed XML: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Return cached data if valid and refresh is not forced
    if (not force_refresh and 
        cache["data"] is not None and 
        (current_time - cache["last_fetched"]) < cache["expiry_seconds"]):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "notes": cache["data"]
        })
        
    # Otherwise fetch and parse
    notes = parse_release_notes()
    
    if notes is not None:
        cache["data"] = notes
        cache["last_fetched"] = current_time
        return jsonify({
            "status": "success",
            "source": "network",
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time)),
            "notes": notes
        })
    else:
        # If fetch/parse failed but we have stale cache, return stale cache with warning
        if cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": "Failed to refresh. Returning cached data.",
                "source": "stale_cache",
                "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
                "notes": cache["data"]
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to fetch and parse release notes."
            }), 500

if __name__ == '__main__':
    # Default to port 5001, disable reloader to avoid watchdog conflicts
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
