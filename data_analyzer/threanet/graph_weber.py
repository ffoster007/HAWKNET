import logging
import os

logger = logging.getLogger("ai-attack-patterns")

def get_url(url:str):
    """
    Get the URL from the environment variable or use the default value.
    """
    return os.environ.get(url, url)

def verify_connection(driver) -> bool:
    try:
        with driver.session() as session:
            return session.run("RETURN 1 AS ok").single()["ok"] == 1
    except Exception as e:
        logger.error(f"Neo4j connection failed: {e}")
        return False