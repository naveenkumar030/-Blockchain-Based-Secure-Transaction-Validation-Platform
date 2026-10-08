"""
Neo4j Graph Database connection and helper functions.
Reads NEO4J_* credentials from environment (.env).
"""
import os
import logging
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver, TrustCustomCAs
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://a227a007.databases.neo4j.io")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "a227a007")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "VlzhzJk5cxTdssPKLGJlZkOpMMQ-cuzMxtQVep_mlC0")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

_driver: Optional[Driver] = None


def get_driver() -> Optional[Driver]:
    """Get or create singleton Neo4j driver with multi-stage SSL fallback."""
    global _driver
    if _driver is not None:
        return _driver

    if not NEO4J_URI or not NEO4J_USERNAME or not NEO4J_PASSWORD:
        logger.warning("Neo4j environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD) are not fully set.")
        return None

    auth = (NEO4J_USERNAME, NEO4J_PASSWORD)

    # 1. Try standard connection
    try:
        d = GraphDatabase.driver(NEO4J_URI, auth=auth)
        d.verify_connectivity()
        _driver = d
        return _driver
    except Exception as e1:
        logger.debug("Default driver connection failed: %s, attempting certifi bundle...", e1)

    # 2. Try certifi CA bundle (resolves Windows certificate store omissions)
    try:
        import certifi
        base_uri = NEO4J_URI.replace("neo4j+s://", "neo4j://").replace("bolt+s://", "bolt://")
        d = GraphDatabase.driver(
            base_uri,
            auth=auth,
            encrypted=True,
            trusted_certificates=TrustCustomCAs(certifi.where()),
        )
        d.verify_connectivity()
        _driver = d
        return _driver
    except Exception as e2:
        logger.debug("Certifi driver connection failed: %s, attempting ssc fallback...", e2)

    # 3. Fallback to neo4j+ssc://
    try:
        ssc_uri = NEO4J_URI.replace("neo4j+s://", "neo4j+ssc://").replace("bolt+s://", "bolt+ssc://")
        d = GraphDatabase.driver(ssc_uri, auth=auth)
        d.verify_connectivity()
        _driver = d
        return _driver
    except Exception as e3:
        logger.error("All Neo4j connection attempts failed. Last error: %s", e3)
        return None


def close_driver():
    """Close the active driver instance."""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def check_neo4j_connection() -> Dict[str, Any]:
    """
    Verifies connectivity to the Neo4j instance.
    Returns status dict indicating connection success or specific diagnostic error.
    """
    driver = get_driver()
    if not driver:
        return {
            "connected": False,
            "error": "Failed to connect to Neo4j instance. Verify network and instance status.",
        }

    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            result = session.run("RETURN 1 AS num")
            record = result.single()
            return {
                "connected": True,
                "database": NEO4J_DATABASE,
                "verified": record["num"] == 1 if record else False,
            }
    except Exception as exc:
        try:
            with driver.session() as session:
                result = session.run("RETURN 1 AS num")
                record = result.single()
                return {
                    "connected": True,
                    "database": "default",
                    "verified": record["num"] == 1 if record else False,
                }
        except Exception as exc2:
            logger.warning("Neo4j query failed: %s", exc2)
            return {
                "connected": False,
                "error": str(exc2),
            }


def run_cypher(query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Execute a Cypher read/write query and return results as a list of dicts."""
    driver = get_driver()
    if not driver:
        raise RuntimeError("Neo4j driver is not connected.")

    with driver.session() as session:
        result = session.run(query, parameters or {})
        return [record.data() for record in result]
