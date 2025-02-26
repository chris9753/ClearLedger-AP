import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
import time
from functools import wraps
import logging
from config.logging_config import logger

def retry_on_error(max_attempts: int = 3, delay: float = 0.1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except sqlite3.OperationalError as e:
                    last_error = e
                    if "database is locked" in str(e):
                        logger.warning(f"Database locked, attempt {attempt + 1}/{max_attempts}")
                        time.sleep(delay * (attempt + 1))
                    else:
                        raise
            raise last_error
        return wrapper
    return decorator

class InvoiceDB:
    def __init__(self):
        self.db_path = Path(__file__).parent / "invoices.db"
        self._init_db()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        """Initialize the database and create tables if they don't exist."""
        logger.debug(f"Attempting to connect to {self.db_path}")
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                logger.debug("Connected to database")
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS invoice_metadata (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        invoice_number TEXT UNIQUE NOT NULL,
                        vendor_name TEXT NOT NULL,
                        invoice_date TEXT NOT NULL,
                        total_amount REAL NOT NULL,
                        status TEXT NOT NULL,
                        pdf_url TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
                logger.info("Database initialized successfully")
        except sqlite3.Error as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    @retry_on_error()
    def insert_invoice(self, invoice_data: Dict[str, Any]) -> int:
        logger.debug(f"Inserting invoice: {invoice_data}")
        required_fields = {
            'invoice_number', 'vendor_name', 'invoice_date',
            'total_amount', 'status', 'pdf_url'
        }
        if missing := required_fields - set(invoice_data.keys()):
            raise ValueError(f"Missing required fields: {missing}")

        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO invoice_metadata (
                        invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    invoice_data['invoice_number'],
                    invoice_data['vendor_name'],
                    invoice_data['invoice_date'],
                    invoice_data['total_amount'],
                    invoice_data['status'],
                    invoice_data['pdf_url']
                ))
                conn.commit()
                logger.info(f"Invoice {invoice_data['invoice_number']} inserted successfully")
                return cursor.lastrowid
        except sqlite3.IntegrityError as e:
            logger.error(f"Duplicate invoice number: {invoice_data['invoice_number']}")
            raise
        except sqlite3.Error as e:
            logger.error(f"Failed to insert invoice: {e}")
            raise

    @retry_on_error()
    def get_all_invoices(self) -> List[Dict[str, Any]]:
        """Retrieve all invoices from the database."""
        logger.debug("Fetching all invoices from database")
        try:
            with self.get_connection() as conn:  # Using the context manager
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        id, invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url, created_at
                    FROM invoice_metadata
                    ORDER BY created_at DESC
                """)
                rows = cursor.fetchall()
                invoices = [dict(row) for row in rows] if rows else []
                logger.info(f"Retrieved {len(invoices)} invoices from database")
                return invoices
        except sqlite3.Error as e:
            logger.error(f"Failed to fetch invoices: {e}")
            return []  # Return empty list on database error
        except Exception as e:
            logger.error(f"Unexpected error fetching invoices: {e}")
            return []  # Return empty list on any other error

    @retry_on_error()
    def get_invoice_by_id(self, invoice_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve a single invoice by its ID."""
        logger.debug(f"Fetching invoice with ID: {invoice_id}")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        id, invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url, created_at
                    FROM invoice_metadata
                    WHERE id = ?
                """, (invoice_id,))
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except sqlite3.Error as e:
            logger.error(f"Failed to fetch invoice {invoice_id}: {e}")
            raise

    @retry_on_error()
    def update_invoice_status(self, invoice_id: int, new_status: str) -> bool:
        """Update the status of an invoice."""
        logger.debug(f"Updating status of invoice {invoice_id} to {new_status}")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE invoice_metadata
                    SET status = ?
                    WHERE id = ?
                """, (new_status, invoice_id))
                conn.commit()
                return cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Failed to update invoice {invoice_id} status: {e}")
            raise

    @retry_on_error()
    def delete_invoice(self, invoice_id: int) -> bool:
        """Delete an invoice from the database."""
        logger.debug(f"Deleting invoice with ID: {invoice_id}")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM invoice_metadata WHERE id = ?", (invoice_id,))
                conn.commit()
                return cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Failed to delete invoice {invoice_id}: {e}")
            raise

    def __del__(self):
        """Ensure proper cleanup of database connections."""
        logger.info("Cleaning up database connections")

if __name__ == "__main__":
    try:
        db = InvoiceDB()
        test_data = {
            "invoice_number": "INV-TEST-002",
            "vendor_name": "Test Corp",
            "invoice_date": "2025-02-25",
            "total_amount": 999.99,
            "status": "processed",
            "pdf_url": "https://example.com/test2.pdf"
        }
        db.insert_invoice(test_data)
    except Exception as e:
        logger.error(f"Error in main: {e}")
        raise