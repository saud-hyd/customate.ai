# verify_api_key.py
from sqlalchemy.orm import Session
from app.core.database.session import SessionLocal
from app.repositories.client_repository import ClientRepository

# Create a session
db = SessionLocal()
try:
    # Query client by API key
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50")
    
    if client:
        print(f"Client found: {client.name} (ID: {client.client_id})")
        print(f"Active status: {client.active}")
    else:
        print("No client found with this API key.")
finally:
    db.close()