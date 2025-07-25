# backend/app/services/analytics/social_channel_analytics.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.domain.analytics.entities import DailyStats
from app.core import logger

class SocialChannelAnalytics:
    """
    Analytics service for social media channels.
    
    This service:
    1. Tracks message counts by platform
    2. Analyzes conversation engagement
    3. Provides channel performance metrics
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def track_channel_message(
        self,
        client_id: str,
        channel_id: str,
        conversation_id: str,
        direction: str,
        platform: str
    ) -> None:
        """
        Track a message sent to or received from a social channel.
        
        Args:
            client_id: Client ID
            channel_id: Channel ID
            conversation_id: Conversation ID
            direction: inbound or outbound
            platform: Platform type
        """
        try:
            # Get today's date
            today = datetime.utcnow().date()
            
            # Get or create daily stats record for this client
            stats = self.db.query(DailyStats).filter(
                DailyStats.client_id == client_id,
                DailyStats.date == today
            ).first()
            
            if not stats:
                # Create new stats record
                stats = DailyStats(
                    client_id=client_id,
                    date=today,
                    total_messages=0,
                    chat_sessions=0,
                    knowledge_queries=0,
                    avg_response_time_ms=0,
                    total_channel_messages=0,
                    channel_stats={}
                )
                
            # Initialize channel stats if needed
            if not stats.channel_stats:
                stats.channel_stats = {}
            
            # Initialize platform stats if needed
            if platform not in stats.channel_stats:
                stats.channel_stats[platform] = {
                    "inbound": 0,
                    "outbound": 0,
                    "conversations": set()  # This will be converted to list for storage
                }
            
            # Update message counts
            if direction == "inbound":
                stats.channel_stats[platform]["inbound"] += 1
            else:
                stats.channel_stats[platform]["outbound"] += 1
            
            # Add conversation to set
            stats.channel_stats[platform]["conversations"].add(conversation_id)
            
            # Convert sets to lists for JSON serialization
            for p, p_stats in stats.channel_stats.items():
                if "conversations" in p_stats and isinstance(p_stats["conversations"], set):
                    p_stats["conversations"] = list(p_stats["conversations"])
            
            # Update total channel messages
            stats.total_channel_messages = sum(
                p_stats["inbound"] + p_stats["outbound"]
                for p_stats in stats.channel_stats.values()
            )
            
            # Save stats
            self.db.add(stats)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error tracking channel message: {str(e)}", exc_info=True)
            self.db.rollback()
    
    def get_channel_analytics(
        self,
        client_id: str,
        days: int = 30,
        platform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get analytics for social channels.
        
        Args:
            client_id: Client ID
            days: Number of days to include
            platform: Optional platform filter
            
        Returns:
            Dictionary with analytics
        """
        # Get date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Query daily stats
        stats_query = self.db.query(DailyStats).filter(
            DailyStats.client_id == client_id,
            DailyStats.date >= start_date,
            DailyStats.date <= end_date
        ).order_by(DailyStats.date)
        
        daily_stats = stats_query.all()
        
        # Default result
        result = {
            "total_messages": {
                "inbound": 0,
                "outbound": 0,
                "total": 0
            },
            "platforms": {},
            "daily_data": [],
            "conversations": {
                "total": 0,
                "by_platform": {}
            }
        }
        
        # Process daily stats
        for stats in daily_stats:
            # Skip if no channel stats
            if not stats.channel_stats:
                continue
            
            # Create daily entry
            daily_entry = {
                "date": stats.date.isoformat(),
                "total_inbound": 0,
                "total_outbound": 0,
                "by_platform": {}
            }
            
            # Process channel stats
            for p, p_stats in stats.channel_stats.items():
                # Skip if platform filter applied and doesn't match
                if platform and p != platform:
                    continue
                
                inbound = p_stats.get("inbound", 0)
                outbound = p_stats.get("outbound", 0)
                
                # Update total messages
                result["total_messages"]["inbound"] += inbound
                result["total_messages"]["outbound"] += outbound
                result["total_messages"]["total"] += inbound + outbound
                
                # Initialize platform stats if needed
                if p not in result["platforms"]:
                    result["platforms"][p] = {
                        "inbound": 0,
                        "outbound": 0,
                        "total": 0
                    }
                
                # Update platform totals
                result["platforms"][p]["inbound"] += inbound
                result["platforms"][p]["outbound"] += outbound
                result["platforms"][p]["total"] += inbound + outbound
                
                # Add to daily entry
                daily_entry["total_inbound"] += inbound
                daily_entry["total_outbound"] += outbound
                
                # Add platform breakdown to daily entry
                daily_entry["by_platform"][p] = {
                    "inbound": inbound,
                    "outbound": outbound,
                    "total": inbound + outbound
                }
                
                # Count conversations
                if "conversations" in p_stats:
                    conv_count = len(p_stats["conversations"])
                    
                    # Initialize platform conversation stats if needed
                    if p not in result["conversations"]["by_platform"]:
                        result["conversations"]["by_platform"][p] = 0
                    
                    # We can't simply add up daily conversation counts as they may overlap
                    # This is a rough approximation
                    result["conversations"]["by_platform"][p] = max(
                        result["conversations"]["by_platform"][p],
                        conv_count
                    )
            
            # Add daily entry if it has data
            if daily_entry["total_inbound"] > 0 or daily_entry["total_outbound"] > 0:
                result["daily_data"].append(daily_entry)
        
        # Get more accurate conversation count from database
        # This query counts unique conversations per platform
        if platform:
            # Filter by platform
            conversation_count = self.db.query(func.count(ChannelConversation.id)).join(
                Channel, ChannelConversation.channel_id == Channel.channel_id
            ).filter(
                Channel.client_id == client_id,
                Channel.platform == platform
            ).scalar()
            
            result["conversations"]["by_platform"][platform] = conversation_count
            result["conversations"]["total"] = conversation_count
        else:
            # Count all platforms
            platform_counts = {}
            
            # Get channels for this client
            channels = self.db.query(Channel).filter(
                Channel.client_id == client_id
            ).all()
            
            for channel in channels:
                if channel.platform not in platform_counts:
                    platform_counts[channel.platform] = 0
                
                # Count conversations for this channel
                count = self.db.query(func.count(ChannelConversation.id)).filter(
                    ChannelConversation.channel_id == channel.channel_id
                ).scalar()
                
                platform_counts[channel.platform] += count
            
            # Update results
            result["conversations"]["by_platform"] = platform_counts
            result["conversations"]["total"] = sum(platform_counts.values())
        
        return result