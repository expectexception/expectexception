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
        # Fallback to DATABASE_URL if it is configured as a MongoDB connection string
        db_url = os.getenv('DATABASE_URL')
        if db_url and db_url.startswith('mongodb'):
            uri = db_url

    if not uri:
        logger.info("MongoDB Atlas URI not set. MongoDB Atlas integration is disabled.")
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


def mirror_to_mongo(collection: str, doc_id, doc: dict) -> bool:
    """Upsert `doc` into `collection` keyed by `doc_id`.

    Used as the cross-instance sync layer between Render and the local
    server: each writes to its own relational DB first (fast path, keeps
    Django admin/permissions/serializers untouched), then best-effort
    mirrors here so the other instance can look records up during a
    failover. Never raises — failures are logged and swallowed so a Mongo
    hiccup never breaks the request that triggered the mirror.
    """
    db = get_mongodb_db()
    if db is None:
        return False
    try:
        payload = {**doc, '_id': doc_id}
        db[collection].replace_one({'_id': doc_id}, payload, upsert=True)
        return True
    except Exception as e:
        logger.error(f"Failed to mirror doc {doc_id!r} to Mongo collection '{collection}': {e}")
        return False


def find_in_mongo(collection: str, doc_id):
    """Look up a single mirrored document by id. Returns None if not found/unavailable."""
    db = get_mongodb_db()
    if db is None:
        return None
    try:
        return db[collection].find_one({'_id': doc_id})
    except Exception as e:
        logger.error(f"Failed to read doc {doc_id!r} from Mongo collection '{collection}': {e}")
        return None


def find_one_in_mongo(collection: str, query: dict):
    """Look up a single mirrored document by an arbitrary query. Returns None if not found/unavailable."""
    db = get_mongodb_db()
    if db is None:
        return None
    try:
        return db[collection].find_one(query)
    except Exception as e:
        logger.error(f"Failed to query Mongo collection '{collection}' with {query!r}: {e}")
        return None
