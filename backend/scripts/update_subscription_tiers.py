# backend/scripts/update_subscription_tiers.py
import sys
import os
from sqlalchemy import create_engine, text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config.settings import settings

def update_subscription_tiers():
    """Update subscription tiers with new limits."""
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Connect to database
    with engine.connect() as conn:
        # Begin transaction
        with conn.begin():
            # Update all trial plans to free
            trial_result = conn.execute(
                text("""
                UPDATE subscriptions 
                SET plan_type = 'free',
                    message_limit = 100,
                    user_limit = 5,
                    storage_limit_bytes = 524288, -- 500 KB (0.5 * 1024 * 1024)
                    collections_limit = 3
                WHERE plan_type = 'trial'
                """)
            )
            print(f"Updated {trial_result.rowcount} trial subscriptions to free tier")
            
            # Update enterprise plans to professional
            enterprise_result = conn.execute(
                text("""
                UPDATE subscriptions 
                SET plan_type = 'professional',
                    message_limit = 12000,
                    user_limit = 100,
                    storage_limit_bytes = 104857600, -- 100 MB (100 * 1024 * 1024)
                    collections_limit = 50
                WHERE plan_type = 'enterprise'
                """)
            )
            print(f"Updated {enterprise_result.rowcount} enterprise subscriptions to professional tier")
            
            # Update basic plans with new limits
            basic_result = conn.execute(
                text("""
                UPDATE subscriptions 
                SET message_limit = 2000,
                    user_limit = 25,
                    storage_limit_bytes = 5242880 -- 5 MB (5 * 1024 * 1024)
                WHERE plan_type = 'basic'
                """)
            )
            print(f"Updated {basic_result.rowcount} basic subscriptions with new limits")
            
            # Create sample chat data for testing if no messages exist
            total_messages = conn.execute(text("SELECT COUNT(*) FROM chat_messages")).scalar()
            if total_messages == 0:
                print("No messages found, creating test data...")
                
                # Get client ID
                client = conn.execute(text("SELECT client_id FROM clients LIMIT 1")).fetchone()
                if client:
                    client_id = client[0]
                    
                    # Create a test session
                    session_id = str(uuid.uuid4())
                    conn.execute(text("""
                        INSERT INTO chat_sessions 
                        (session_id, client_id, created_at, updated_at)
                        VALUES 
                        (:session_id, :client_id, now(), now())
                    """), {"session_id": session_id, "client_id": client_id})
                    
                    # Create test messages
                    for i in range(5):
                        message_id = str(uuid.uuid4())
                        conn.execute(text("""
                            INSERT INTO chat_messages 
                            (message_id, session_id, role, content, created_at)
                            VALUES 
                            (:message_id, :session_id, :role, :content, now())
                        """), {
                            "message_id": message_id, 
                            "session_id": session_id,
                            "role": "user" if i % 2 == 0 else "assistant",
                            "content": f"Test message {i+1}"
                        })
                    
                    print(f"Created 5 test messages for client {client_id}")
            
            # Show current plan counts
            result = conn.execute(text("SELECT plan_type, COUNT(*) FROM subscriptions GROUP BY plan_type"))
            print("\nCurrent subscription counts:")
            for row in result:
                print(f"  {row[0]}: {row[1]}")

if __name__ == "__main__":
    update_subscription_tiers()