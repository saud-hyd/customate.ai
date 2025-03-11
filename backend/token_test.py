import requests

# Get token
token_response = requests.post(
    "http://localhost:8000/api/auth/token",
    data={"username": "test3@example.com", "password": "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50"}
)
token = token_response.json().get("access_token")
print(f"Token: {token}")

# Test enhanced search
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(
    "http://localhost:8000/api/knowledge/enhanced/search",
    headers=headers,
    json={"query": "customer support"}
)
print(response.text)