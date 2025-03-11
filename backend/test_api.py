import requests

API_KEY = "90b7b93d-d636-444b-bf9-c095328be0fb"
BASE_URL = "http://localhost:8000/api"

def test_endpoint(endpoint, data=None):
    print(f"\nTesting {endpoint}")
    try:
        if data:
            response = requests.post(
                f"{BASE_URL}/{endpoint}",
                headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
                json=data
            )
        else:
            response = requests.get(
                f"{BASE_URL}/{endpoint}",
                headers={"X-API-Key": API_KEY}
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

# Test existing endpoints first
test_endpoint("client")

# Test new endpoints
test_endpoint("knowledge/search", {"query": "customer support"})
test_endpoint("chatbot/message", {"message": "How do I contact support?"})