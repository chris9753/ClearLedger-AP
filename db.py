import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
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
            with self.get_connection() as conn:
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
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        confidence REAL DEFAULT 0.0,
                        total_time REAL DEFAULT 0.0
                    )
                """)

                # Add new columns if they don't exist
                try:
                    cursor.execute("ALTER TABLE invoice_metadata ADD COLUMN confidence REAL DEFAULT 0.0")
                except sqlite3.OperationalError:
                    logger.debug("confidence column already exists")

                try:
                    cursor.execute("ALTER TABLE invoice_metadata ADD COLUMN total_time REAL DEFAULT 0.0")
                except sqlite3.OperationalError:
                    logger.debug("total_time column already exists")

                conn.commit()
                logger.info("Database initialized successfully")
        except sqlite3.Error as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    @retry_on_error()
    def get_invoice_by_number(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single invoice by its invoice_number."""
        logger.debug(f"Fetching invoice with number: {invoice_number}")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        id, invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url, created_at,
                        confidence, total_time
                    FROM invoice_metadata
                    WHERE invoice_number = ?
                """, (invoice_number,))
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except sqlite3.Error as e:
            logger.error(f"Failed to fetch invoice {invoice_number}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching invoice {invoice_number}: {e}")
            return None

    @retry_on_error()
    def insert_invoice(self, invoice_data: Dict[str, Any]) -> Tuple[bool, int, Optional[str]]:
        """
        Insert or update an invoice in the database.
        
        Returns:
            Tuple containing (is_new: bool, invoice_id: int, error_message: Optional[str])
            is_new: True if inserted as new, False if existing record was found
            invoice_id: ID of the inserted/updated invoice
            error_message: Error message if there was a problem, None otherwise
        """
        logger.debug(f"Inserting/updating invoice: {invoice_data}")
        required_fields = {
            'invoice_number', 'vendor_name', 'invoice_date',
            'total_amount', 'status', 'pdf_url'
        }
        if missing := required_fields - set(invoice_data.keys()):
            error_msg = f"Missing required fields: {missing}"
            logger.error(error_msg)
            return False, -1, error_msg
            
        # Check if invoice already exists
        existing_invoice = self.get_invoice_by_number(invoice_data['invoice_number'])
        if existing_invoice:
            logger.info(f"Invoice {invoice_data['invoice_number']} already exists, returning existing ID")
            return False, existing_invoice['id'], "Invoice already exists"
            
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO invoice_metadata (
                        invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url, confidence, total_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    invoice_data['invoice_number'],
                    invoice_data['vendor_name'],
                    invoice_data['invoice_date'],
                    invoice_data['total_amount'],
                    invoice_data['status'],
                    invoice_data['pdf_url'],
                    invoice_data.get('confidence', 0.0),
                    invoice_data.get('total_time', 0.0)
                ))
                conn.commit()
                logger.info(f"Invoice {invoice_data['invoice_number']} inserted successfully")
                return True, cursor.lastrowid, None
        except sqlite3.IntegrityError as e:
            error_msg = f"Duplicate invoice number: {invoice_data['invoice_number']}"
            logger.error(error_msg)
            return False, -1, error_msg
        except sqlite3.Error as e:
            error_msg = f"Failed to insert invoice: {e}"
            logger.error(error_msg)
            return False, -1, error_msg

    @retry_on_error()
    def get_all_invoices(self) -> List[Dict[str, Any]]:
        """Retrieve all invoices from the database."""
        logger.debug("Fetching all invoices from database")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        id, invoice_number, vendor_name, invoice_date,
                        total_amount, status, pdf_url, created_at,
                        confidence, total_time
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
                        total_amount, status, pdf_url, created_at,
                        confidence, total_time
                    FROM invoice_metadata
                    WHERE id = ?
                """, (invoice_id,))
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except sqlite3.Error as e:
            logger.error(f"Failed to fetch invoice {invoice_id}: {e}")
            return None  # Return None on database error
        except Exception as e:
            logger.error(f"Unexpected error fetching invoice {invoice_id}: {e}")
            return None  # Return None on any other error

    @retry_on_error()
    def update_invoice_status(self, invoice_id: int, new_status: str, update_data: Optional[Dict[str, Any]] = None) -> bool:
        """Update the status and optionally other fields of an invoice."""
        logger.debug(f"Updating invoice {invoice_id} with status {new_status}")
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if update_data:
                    # Build dynamic update query
                    fields = ['status = ?']
                    params = [new_status]
                    for key, value in update_data.items():
                        if key not in ['id', 'created_at']:  # Protect these fields
                            fields.append(f"{key} = ?")
                            params.append(value)
                    params.append(invoice_id)
                    
                    query = f"""
                        UPDATE invoice_metadata
                        SET {', '.join(fields)}
                        WHERE id = ?
                    """
                    cursor.execute(query, params)
                else:
                    cursor.execute("""
                        UPDATE invoice_metadata
                        SET status = ?
                        WHERE id = ?
                    """, (new_status, invoice_id))
                
                conn.commit()
                rows_affected = cursor.rowcount
                if rows_affected > 0:
                    logger.info(f"Successfully updated invoice {invoice_id}")
                    return True
                logger.warning(f"No invoice found with ID {invoice_id}")
                return False
                
        except sqlite3.Error as e:
            logger.error(f"Failed to update invoice {invoice_id}: {e}")
            return False  # Return False on database error
        except Exception as e:
            logger.error(f"Unexpected error updating invoice {invoice_id}: {e}")
            return False  # Return False on any other error

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

    @retry_on_error()
    def batch_check_duplicates(self, invoice_numbers: List[str]) -> Dict[str, bool]:
        """Check multiple invoice numbers for duplicates efficiently."""
        logger.debug(f"Checking duplicates for {len(invoice_numbers)} invoices")
        result = {}
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                placeholders = ','.join('?' * len(invoice_numbers))
                cursor.execute(f"""
                    SELECT invoice_number
                    FROM invoice_metadata
                    WHERE invoice_number IN ({placeholders})
                """, invoice_numbers)
                existing = {row[0] for row in cursor.fetchall()}
                result = {num: num in existing for num in invoice_numbers}
                return result
        except sqlite3.Error as e:
            logger.error(f"Failed to check duplicates: {e}")
            return {num: False for num in invoice_numbers}

    @retry_on_error()
    def batch_insert_invoices(self, invoices: List[Dict[str, Any]]) -> List[Tuple[bool, int, Optional[str]]]:
        """
        Insert multiple invoices efficiently.
        Returns a list of (is_new, invoice_id, error_message) tuples.
        """
        logger.debug(f"Attempting batch insert of {len(invoices)} invoices")
        results = []
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                for invoice in invoices:
                    try:
                        cursor.execute("""
                            INSERT INTO invoice_metadata (
                                invoice_number, vendor_name, invoice_date,
                                total_amount, status, pdf_url, confidence, total_time
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            invoice['invoice_number'],
                            invoice['vendor_name'],
                            invoice['invoice_date'],
                            invoice['total_amount'],
                            invoice['status'],
                            invoice['pdf_url'],
                            invoice.get('confidence', 0.0),
                            invoice.get('total_time', 0.0)
                        ))
                        results.append((True, cursor.lastrowid, None))
                    except sqlite3.IntegrityError as e:
                        if "UNIQUE constraint failed" in str(e):
                            results.append((False, -1, f"Invoice {invoice['invoice_number']} already exists"))
                        else:
                            results.append((False, -1, str(e)))
                    except Exception as e:
                        results.append((False, -1, str(e)))
                
                conn.commit()
                return results
                
        except sqlite3.Error as e:
            logger.error(f"Batch insert failed: {e}")
            # Return failure for all remaining invoices
            remaining = len(invoices) - len(results)
            results.extend([(False, -1, str(e))] * remaining)
            return results

    @retry_on_error()
    def update_batch_status(self, invoice_ids: List[int], new_status: str) -> bool:
        """Update status for multiple invoices at once."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                placeholders = ','.join('?' * len(invoice_ids))
                cursor.execute(f"""
                    UPDATE invoice_metadata
                    SET status = ?
                    WHERE id IN ({placeholders})
                """, [new_status] + invoice_ids)
                conn.commit()
                return cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Failed to update batch status: {e}")
            return False

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