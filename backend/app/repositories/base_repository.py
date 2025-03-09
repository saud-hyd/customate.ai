from typing import Generic, TypeVar, Type, List, Optional, Union, Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database.session import Base

# Define generic type variables
ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base repository with generic CRUD operations for all entities.
    
    This class will be extended by specific repositories that handle
    different entity types.
    """
    
    def __init__(self, model: Type[ModelType]):
        """
        Initialize the repository with the model class it operates on.
        
        Args:
            model: SQLAlchemy model class
        """
        self.model = model
    
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        Get an entity by ID.
        
        Args:
            db: Database session
            id: Entity ID
            
        Returns:
            Entity instance if found, None otherwise
        """
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_by_field(self, db: Session, field: str, value: Any) -> Optional[ModelType]:
        """
        Get an entity by a specific field value.
        
        Args:
            db: Database session
            field: Field name
            value: Field value
            
        Returns:
            Entity instance if found, None otherwise
        """
        return db.query(self.model).filter(getattr(self.model, field) == value).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        Get multiple entities with pagination.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of entity instances
        """
        return db.query(self.model).offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        """
        Create a new entity.
        
        Args:
            db: Database session
            obj_in: Data to create entity from
            
        Returns:
            Created entity instance
        """
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict(exclude_unset=True)
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update an entity.
        
        Args:
            db: Database session
            db_obj: Existing entity instance
            obj_in: Data to update entity with
            
        Returns:
            Updated entity instance
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: Any) -> ModelType:
        """
        Delete an entity.
        
        Args:
            db: Database session
            id: Entity ID
            
        Returns:
            Deleted entity instance
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj