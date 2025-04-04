"""
Script to update message counts in analytics
"""
import sys
import os
import uuid  # Added import for generating UUID in Python
from sqlalchemy import create_engine, text
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config.settings import settings

def fix_message_counts():
    """Update message counts in analytics data."""
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Connect to database
    with engine.connect() as conn:
        # Begin transaction
        with conn.begin():
            # Get count of messages per client
            message_counts = conn.execute(text("""
                SELECT c.client_id, COUNT(m.id) as message_count
                FROM clients c
                LEFT JOIN chat_sessions s ON c.client_id = s.client_id
                LEFT JOIN chat_messages m ON s.session_id = m.session_id
                GROUP BY c.client_id
            """))
            
            # Update subscription_usage table with actual message counts
            for client_id, message_count in message_counts:
                print(f"Client {client_id}: {message_count} messages")
                
                # Get current month-year
                month_year = datetime.utcnow().strftime("%Y-%m")
                
                # Check if entry exists
                exists = conn.execute(text("""
                    SELECT 1 FROM subscription_usage 
                    WHERE client_id = :client_id AND month_year = :month_year
                """), {"client_id": client_id, "month_year": month_year}).fetchone()
                
                if exists:
                    # Update existing record
                    conn.execute(text("""
                        UPDATE subscription_usage
                        SET messages_used = :message_count
                        WHERE client_id = :client_id AND month_year = :month_year
                    """), {"client_id": client_id, "message_count": message_count, "month_year": month_year})
                    print(f"  Updated existing record for {month_year}")
                else:
                    # Get subscription ID
                    sub_id = conn.execute(text("""
                        SELECT id FROM subscriptions
                        WHERE client_id = :client_id AND status = 'active'
                        ORDER BY created_at DESC LIMIT 1
                    """), {"client_id": client_id}).fetchone()
                    
                    if sub_id:
                        # Generate UUID in Python instead of using PostgreSQL function
                        usage_id = str(uuid.uuid4())
                        
                        # Create new record
                        conn.execute(text("""
                            INSERT INTO subscription_usage 
                            (usage_id, client_id, subscription_id, month_year, messages_used, last_updated)
                            VALUES 
                            (:usage_id, :client_id, :sub_id, :month_year, :message_count, now())
                        """), {
                            "usage_id": usage_id,  # Use the Python-generated UUID
                            "client_id": client_id, 
                            "sub_id": sub_id[0],
                            "month_year": month_year, 
                            "message_count": message_count
                        })
                        print(f"  Created new record for {month_year}")
                    else:
                        print(f"  No active subscription found for {client_id}")
            
            # Also update daily_stats table with message counts if it exists
            try:
                conn.execute(text("""
                    UPDATE daily_stats ds
                    SET total_messages = subquery.message_count
                    FROM (
                        SELECT c.client_id, COUNT(m.id) as message_count
                        FROM clients c
                        LEFT JOIN chat_sessions s ON c.client_id = s.client_id
                        LEFT JOIN chat_messages m ON s.session_id = m.session_id
                        GROUP BY c.client_id
                    ) as subquery
                    WHERE ds.client_id = subquery.client_id
                """))
                print("Message counts updated in daily_stats")
            except Exception as e:
                print(f"Warning: Could not update daily_stats: {str(e)}")
            
            print("Message counts updated in analytics")

if __name__ == "__main__":
    fix_message_counts()