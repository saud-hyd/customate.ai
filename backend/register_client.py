import httpx
import asyncio
import json

async def register_client():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/auth/register",
            json={
                "name": "Test Client",
                "email": "test@4example.com",
                "industry": "technology",
                "website": "https://example.com"
            }
        )
        
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 201:
            client_data = response.json()
            print(f"\nAPI Key: {client_data['api_key']}")
            print("Use this key in your tests")
            return client_data['api_key']
        return None

if __name__ == "__main__":
    asyncio.run(register_client())