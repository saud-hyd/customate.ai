#!/usr/bin/env python3
"""
Test script for Gmail OAuth API endpoint
"""
import sys
import os
import requests
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_gmail_oauth_endpoint():
    """Test the Gmail OAuth authorization endpoint directly."""
    
    # Test URL
    url = "http://localhost:8000/api/channel/gmail/oauth/authorize"
    
    # Test payload (empty for simplified flow)
    payload = {}
    
    # Headers
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test_token"  # You might need a real token
    }
    
    print("Testing Gmail OAuth endpoint...")
    print(f"URL: {url}")
    print(f"Payload: {payload}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError:
            print(f"Response Body (text): {response.text}")
            
        if response.status_code == 200:
            print("\n✅ Gmail OAuth endpoint is working!")
            if 'authorization_url' in response_data:
                print(f"Authorization URL: {response_data['authorization_url']}")
            return True
        else:
            print(f"\n❌ Gmail OAuth endpoint failed with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to server. Make sure the backend is running on localhost:8000")
        return False
    except Exception as e:
        print(f"\n❌ Error testing endpoint: {e}")
        return False

def check_server_status():
    """Check if the backend server is running."""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running on localhost:8000")
            return True
        else:
            print(f"⚠️ Backend server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error checking server: {e}")
        return False

def main():
    print("Gmail OAuth API Test\n")
    print("=" * 50)
    
    # Check if server is running
    print("\n1. Checking server status...")
    if not check_server_status():
        print("\nPlease start the backend server first:")
        print("cd backend && python main.py")
        return 1
    
    # Test Gmail OAuth endpoint
    print("\n2. Testing Gmail OAuth endpoint...")
    if test_gmail_oauth_endpoint():
        print("\n🎉 Gmail OAuth integration is working!")
        return 0
    else:
        print("\n❌ Gmail OAuth integration needs attention.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)