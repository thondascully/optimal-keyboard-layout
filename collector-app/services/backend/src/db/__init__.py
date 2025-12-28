"""
Database layer with connection management and repositories.
"""

from .connection import DatabaseConnection, get_db
from .schema import init_schema

__all__ = ['DatabaseConnection', 'get_db', 'init_schema']
