# backend/app/services/integration/providers/mock_provider.py
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime, timedelta
import random

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.core import logger

class MockProvider(BaseIntegrationProvider):
    """
    Mock integration provider for testing and development.
    
    Provides simulated responses for integration testing without
    requiring actual external service connections.
    """
    
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Simulate testing connection to a service."""
        # 90% success rate
        if random.random() < 0.9:
            return {
                "success": True,
                "message": "Mock connection successful",
                "details": {
                    "provider": "mock",
                    "endpoint": endpoint_url or "https://mock-service.example.com",
                    "config": config
                }
            }
        else:
            return {
                "success": False,
                "message": "Mock connection failed - simulated failure",
                "status_code": 401
            }
    
    def get_data(
        self,
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate mock data based on resource type."""
        # Determine how many items to generate
        count = 10
        if config and "limit" in config:
            count = min(int(config["limit"]), 50)  # Cap at 50 for performance
        
        # Generate data based on resource type
        if resource_type == "tickets":
            return self._generate_tickets(count, query)
        elif resource_type == "users":
            return self._generate_users(count, query)
        elif resource_type == "products":
            return self._generate_products(count, query)
        elif resource_type == "orders":
            return self._generate_orders(count, query)
        elif resource_type == "contacts":
            return self._generate_contacts(count, query)
        elif resource_type == "opportunities":
            return self._generate_opportunities(count, query)
        else:
            # Generic mock data
            return self._generate_generic(resource_type, count, query)
    
    def get_resource_types(self) -> List[str]:
        """Get mock resource types."""
        return [
            "tickets", "users", "products", "orders",
            "contacts", "opportunities", "accounts"
        ]
    
    def _generate_tickets(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock ticket data."""
        statuses = ["new", "open", "pending", "solved", "closed"]
        priorities = ["low", "normal", "high", "urgent"]
        
        tickets = []
        for i in range(count):
            # Filter by subject if query is provided
            subject = f"Mock Ticket #{i+1}"
            if query and query.lower() not in subject.lower():
                subject = f"{query} - {subject}"
            
            ticket = {
                "id": i + 1,
                "subject": subject,
                "description": f"This is a mock ticket description for ticket #{i+1}.",
                "status": random.choice(statuses),
                "priority": random.choice(priorities),
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "requester_id": random.randint(1000, 9999),
                "assignee_id": random.randint(1000, 9999) if random.random() > 0.3 else None
            }
            tickets.append(ticket)
        
        return tickets
    
    def _generate_users(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock user data."""
        first_names = ["Alex", "Jamie", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Quinn"]
        last_names = ["Smith", "Johnson", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson"]
        
        users = []
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            name = f"{first_name} {last_name}"
            
            # Filter by name if query is provided
            if query and query.lower() not in name.lower():
                continue
            
            user = {
                "id": i + 1,
                "name": name,
                "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
                "phone": f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 365))).isoformat(),
                "last_login_at": (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat() if random.random() > 0.2 else None,
                "active": random.random() > 0.1
            }
            users.append(user)
        
        return users
    
    def _generate_products(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock product data."""
        product_types = ["Electronics", "Clothing", "Food", "Books", "Home Goods"]
        
        products = []
        for i in range(count):
            product_type = random.choice(product_types)
            title = f"{product_type} Product #{i+1}"
            
            # Filter by title if query is provided
            if query and query.lower() not in title.lower():
                title = f"{query} {title}"
            
            product = {
                "id": i + 1,
                "title": title,
                "description": f"This is a mock product description for product #{i+1}.",
                "price": round(random.uniform(10.0, 100.0), 2),
                "inventory_quantity": random.randint(0, 100),
                "product_type": product_type,
                "vendor": f"Mock Vendor {random.randint(1, 5)}",
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 365))).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "published": random.random() > 0.1
            }
            products.append(product)
        
        return products
    
    def _generate_orders(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock order data."""
        statuses = ["pending", "processing", "paid", "shipped", "delivered", "cancelled"]
        
        orders = []
        for i in range(count):
            order_number = f"#{random.randint(1000, 9999)}"
            
            # Filter by order number if query is provided
            if query and query not in order_number:
                order_number = f"#{query}-{order_number[1:]}"
            
            # Generate line items
            line_items = []
            for j in range(random.randint(1, 5)):
                line_items.append({
                    "id": j + 1,
                    "title": f"Mock Product {j+1}",
                    "price": round(random.uniform(10.0, 100.0), 2),
                    "quantity": random.randint(1, 5),
                    "sku": f"SKU-{random.randint(10000, 99999)}"
                })
            
            # Calculate totals
            subtotal = sum(item["price"] * item["quantity"] for item in line_items)
            tax = round(subtotal * 0.1, 2)
            shipping = round(random.uniform(5.0, 15.0), 2)
            total = subtotal + tax + shipping
            
            order = {
                "id": i + 1,
                "order_number": order_number,
                "email": f"customer-{random.randint(100, 999)}@example.com",
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "status": random.choice(statuses),
                "line_items": line_items,
                "subtotal_price": subtotal,
                "total_tax": tax,
                "shipping_price": shipping,
                "total_price": total,
                "financial_status": "paid" if random.random() > 0.2 else "pending",
                "fulfillment_status": "fulfilled" if random.random() > 0.5 else "unfulfilled"
            }
            orders.append(order)
        
        return orders
    
    def _generate_contacts(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock contact data."""
        first_names = ["Alex", "Jamie", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Quinn"]
        last_names = ["Smith", "Johnson", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson"]
        
        contacts = []
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            name = f"{first_name} {last_name}"
            
            # Filter by name if query is provided
            if query and query.lower() not in name.lower():
                name = f"{name} ({query})"
            
            contact = {
                "Id": str(uuid.uuid4()),
                "FirstName": first_name,
                "LastName": last_name,
                "Name": name,
                "Email": f"{first_name.lower()}.{last_name.lower()}@example.com",
                "Phone": f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "Title": f"Mock Title {random.randint(1, 5)}",
                "Department": random.choice(["Sales", "Marketing", "Support", "Engineering", "HR"]),
                "AccountId": str(uuid.uuid4()),
                "CreatedDate": (datetime.utcnow() - timedelta(days=random.randint(0, 365))).isoformat(),
                "LastModifiedDate": datetime.utcnow().isoformat()
            }
            contacts.append(contact)
        
        return contacts
    
    def _generate_opportunities(self, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate mock opportunity data."""
        stages = ["Prospecting", "Qualification", "Needs Analysis", "Value Proposition", "Negotiation", "Closed Won", "Closed Lost"]
        
        opportunities = []
        for i in range(count):
            name = f"Mock Opportunity #{i+1}"
            
            # Filter by name if query is provided
            if query and query.lower() not in name.lower():
                name = f"{name} - {query}"
            
            opportunity = {
                "Id": str(uuid.uuid4()),
                "Name": name,
                "StageName": random.choice(stages),
                "Amount": round(random.uniform(1000.0, 100000.0), 2),
                "CloseDate": (datetime.utcnow() + timedelta(days=random.randint(0, 90))).strftime("%Y-%m-%d"),
                "Type": random.choice(["New Business", "Existing Business", "Renewal"]),
                "Probability": random.randint(0, 100),
                "AccountId": str(uuid.uuid4()),
                "OwnerId": str(uuid.uuid4()),
                "CreatedDate": (datetime.utcnow() - timedelta(days=random.randint(0, 90))).isoformat(),
                "LastModifiedDate": datetime.utcnow().isoformat()
            }
            opportunities.append(opportunity)
        
        return opportunities
    
    def _generate_generic(self, resource_type: str, count: int, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate generic mock data for any resource type."""
        items = []
        for i in range(count):
            name = f"Mock {resource_type.capitalize()} #{i+1}"
            
            # Filter by name if query is provided
            if query and query.lower() not in name.lower():
                name = f"{name} - {query}"
            
            item = {
                "id": i + 1,
                "name": name,
                "type": resource_type,
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "status": random.choice(["active", "inactive", "pending", "archived"]),
                "description": f"This is a mock {resource_type} description."
            }
            items.append(item)
        
        return items