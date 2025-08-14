#!/usr/bin/env python3
"""
Reset Gmail channels to prevent historical email processing.

This script helps fix existing Gmail channels that may have processed historical emails
by resetting their history ID baseline to the current time.
"""

import sys
import os
import asyncio
from sqlalchemy.orm import Session

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database.session import SessionLocal
from app.domain.channel.entities import Channel
from app.services.channel.gmail_pubsub_service import GmailPubSubService
from app.services.channel.channel_connector import ChannelConnectorFactory
from app.core import logger

async def reset_gmail_channels():
    """Reset existing Gmail channels to prevent historical email processing."""
    
    db = SessionLocal()
    try:
        # Find all active Gmail channels
        gmail_channels = db.query(Channel).filter(
            Channel.platform == "gmail",
            Channel.active == True
        ).all()
        
        if not gmail_channels:
            print("No Gmail channels found.")
            return
        
        print(f"Found {len(gmail_channels)} Gmail channels to reset:")
        
        for channel in gmail_channels:
            try:
                print(f"\n🔄 Resetting channel {channel.channel_id} ({channel.platform_identifier})")
                
                # Create Gmail connector to get current profile
                connector = ChannelConnectorFactory.create_connector(db, channel)
                if not connector:
                    print(f"❌ Failed to create connector for channel {channel.channel_id}")
                    continue
                
                # Initialize connector
                initialized = await connector.initialize()
                if not initialized:
                    print(f"❌ Failed to initialize Gmail connector for channel {channel.channel_id}")
                    continue
                
                # Get current Gmail profile to get latest history ID
                try:
                    import asyncio
                    profile = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: connector.service.users().getProfile(userId='me').execute()
                    )
                    
                    current_history_id = profile.get('historyId')
                    if current_history_id:
                        print(f"📧 Current history ID: {current_history_id}")
                        
                        # Update channel config with current history ID as baseline
                        from app.services.channel.channel_service import ChannelService
                        channel_service = ChannelService(db)
                        current_config = channel.config or {}
                        updated_config = current_config.copy()
                        updated_config['last_history_id'] = current_history_id
                        updated_config['reset_at'] = str(asyncio.get_event_loop().time())
                        
                        channel_service.update_channel(
                            channel.client_id,
                            channel.channel_id,
                            {"config": updated_config}
                        )
                        
                        print(f"✅ Channel {channel.channel_id} reset with baseline history ID {current_history_id}")
                        print("✅ Only emails received AFTER this reset will be processed")
                    else:
                        print(f"⚠️ Could not get current history ID for channel {channel.channel_id}")
                        
                except Exception as e:
                    print(f"❌ Error getting profile for channel {channel.channel_id}: {e}")
                    continue
                    
            except Exception as e:
                print(f"❌ Error resetting channel {channel.channel_id}: {e}")
                continue
        
        print(f"\n✅ Gmail channel reset complete!")
        print("📧 All Gmail channels are now configured to only process NEW emails")
        print("🚫 Historical emails will be ignored to prevent auto-reply spam")
        
    except Exception as e:
        print(f"❌ Error during Gmail channel reset: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Starting Gmail channel reset to prevent historical email processing...")
    print("This will update all Gmail channels to only process emails received after this reset.")
    
    confirmation = input("\nProceed with Gmail channel reset? (y/N): ")
    if confirmation.lower() != 'y':
        print("Reset cancelled.")
        sys.exit(0)
    
    asyncio.run(reset_gmail_channels())