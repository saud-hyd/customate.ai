import requests

# Replace with your actual API key
API_KEY = "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50"
HEADERS = {"X-API-Key": API_KEY}

print(f"Using headers: {HEADERS}")

response = requests.get(
    "http://localhost:8000/api/client",
    headers=HEADERS
)

print(f"Status code: {response.status_code}")
print(f"Response: {response.text}")