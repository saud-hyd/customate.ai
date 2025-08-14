#!/usr/bin/env python3
"""
Simple Gmail channel reset to prevent historical email processing.
"""

import sys
import os
import asyncio
import json
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database.session import SessionLocal
from sqlalchemy import text

async def reset_gmail_channels_simple():
    """Reset existing Gmail channels using direct SQL to avoid relationship issues."""
    
    db = SessionLocal()
    try:
        # Find all active Gmail channels using direct SQL
        result = db.execute(text("""
            SELECT channel_id, client_id, platform_identifier, config, created_at 
            FROM channels 
            WHERE platform = 'gmail' AND active = true
        """))
        
        gmail_channels = result.fetchall()
        
        if not gmail_channels:
            print("No Gmail channels found.")
            return
        
        print(f"Found {len(gmail_channels)} Gmail channels to reset:")
        
        reset_timestamp = str(datetime.utcnow().timestamp())
        
        for channel in gmail_channels:
            try:
                channel_id = channel.channel_id
                client_id = channel.client_id
                platform_identifier = channel.platform_identifier
                # Handle config parsing safely
                if channel.config:
                    if isinstance(channel.config, dict):
                        current_config = channel.config
                    else:
                        current_config = json.loads(channel.config) if channel.config else {}
                else:
                    current_config = {}
                
                print(f"\nResetting channel {channel_id} ({platform_identifier})")
                
                # Update config with reset timestamp as baseline
                # This tells the system to ignore all emails before this reset
                updated_config = current_config.copy()
                updated_config['reset_at'] = reset_timestamp
                updated_config['skip_historical'] = True
                updated_config['baseline_set'] = True
                
                # Update the channel config using direct SQL
                db.execute(text("""
                    UPDATE channels 
                    SET config = :config, updated_at = :updated_at
                    WHERE channel_id = :channel_id
                """), {
                    'config': json.dumps(updated_config),
                    'updated_at': datetime.utcnow(),
                    'channel_id': channel_id
                })
                
                print(f"SUCCESS: Channel {channel_id} reset at timestamp {reset_timestamp}")
                print("SUCCESS: Historical emails will be ignored")
                
            except Exception as e:
                print(f"ERROR: Error resetting channel {channel_id}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        
        print(f"\nSUCCESS: Gmail channel reset complete!")
        print("All Gmail channels are now configured to ignore historical emails")
        print("Only emails received AFTER this reset will be processed for auto-reply")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Error during Gmail channel reset: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Gmail channel reset to prevent historical email processing...")
    print("This will mark all Gmail channels to ignore historical emails.")
    
    confirmation = input("\nProceed with Gmail channel reset? (y/N): ")
    if confirmation.lower() != 'y':
        print("Reset cancelled.")
        sys.exit(0)
    
    asyncio.run(reset_gmail_channels_simple())