import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

_mongo_client = None

def get_mongodb_client():
    """Retrieve or initialize the MongoDB Atlas client singleton."""
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    uri = os.getenv('MONGODB_ATLAS_URI')
    if not uri:
        logger.info("MONGODB_ATLAS_URI not set. MongoDB Atlas integration is disabled.")
        return None

    try:
        # Use a 3-second timeout for selection to fail quickly in server start/requests
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        # Force a connection check by pinging the admin database
        _mongo_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas!")
        return _mongo_client
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {e}")
        _mongo_client = None
        return None
    except Exception as e:
        logger.error(f"Unexpected error connecting to MongoDB Atlas: {e}")
        _mongo_client = None
        return None

def get_mongodb_db():
    """Retrieve the pymongo database instance, or None if connection is disabled/failed."""
    client = get_mongodb_client()
    if client:
        db_name = os.getenv('MONGODB_ATLAS_DB', 'expectexception')
        return client[db_name]
    return None
