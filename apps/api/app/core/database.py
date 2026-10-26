from typing import Optional
import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Initializes and returns the Supabase client if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    are configured, or returns None safely for offline/mock mode.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            logger.info("Supabase client initialized successfully.")
            return _supabase_client
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to offline mode.")
            return None
    else:
        logger.info("Supabase credentials not fully configured; operating in offline mode.")
        return None
