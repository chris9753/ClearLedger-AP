#!/usr/bin/env python3
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, List
import logging
from config.logging_config import logger
from db import InvoiceDB
from setup_s3 import upload_to_s3, BUCKET_NAME
import boto3
from botocore.exceptions import ClientError

PROCESSED_DIR = Path("data/processed")
RAW_DIR = Path("data/raw/invoices")
INVOICES_FILE = PROCESSED_DIR / "structured_invoices.json"

async def migrate_invoices():
    """Migrate invoices from JSON to SQLite and upload PDFs to S3."""
    try:
        if not INVOICES_FILE.exists():
            logger.error(f"Invoice file not found: {INVOICES_FILE}")
            return False
            
        with open(INVOICES_FILE, 'r') as f:
            invoices = json.load(f)
            
        if not isinstance(invoices, list):
            logger.error("Invalid JSON structure: expected a list of invoices")
            return False
            
        logger.info(f"Found {len(invoices)} invoices to migrate")
        
        db = InvoiceDB()
        s3_client = boto3.client("s3")
        migrated = 0
        errors = 0
        skipped = 0
        
        for invoice in invoices:
            try:
                # Check if invoice already exists in database
                try:
                    existing = db.get_invoice_by_id(invoice['invoice_number'])
                    if existing:
                        logger.info(f"Invoice {invoice['invoice_number']} already exists in database, skipping")
                        skipped += 1
                        continue
                except:
                    pass  # If get_invoice_by_id fails, we'll try to insert
                
                # Try multiple locations for the PDF
                pdf_paths = [
                    PROCESSED_DIR / f"{invoice['invoice_number']}.pdf",
                    RAW_DIR / invoice.get('file_name', ''),
                    RAW_DIR / f"{invoice['invoice_number']}.pdf"
                ]
                
                pdf_path = None
                for path in pdf_paths:
                    if path.exists():
                        pdf_path = path
                        break
                
                if pdf_path:
                    try:
                        s3_key = f"invoices/{invoice['invoice_number']}.pdf"
                        try:
                            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
                            pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
                            logger.info(f"PDF already exists in S3: {pdf_url}")
                        except ClientError as e:
                            if e.response['Error']['Code'] == '404':
                                pdf_url = upload_to_s3(str(pdf_path))
                                logger.info(f"Uploaded PDF to S3: {pdf_url}")
                            else:
                                raise
                    except Exception as s3_error:
                        logger.error(f"S3 error for invoice {invoice['invoice_number']}: {str(s3_error)}")
                        pdf_url = ''  # Fallback to empty string if S3 fails
                else:
                    logger.warning(f"PDF file not found for invoice {invoice['invoice_number']}")
                    pdf_url = invoice.get('pdf_url', '')
                
                db_entry = {
                    'invoice_number': invoice['invoice_number'],
                    'vendor_name': invoice['vendor_name'],
                    'invoice_date': invoice['invoice_date'],
                    'total_amount': float(invoice['total_amount']),
                    'status': invoice.get('validation_status', 'valid'),
                    'pdf_url': pdf_url,
                    'confidence': invoice.get('confidence', 0.95),
                    'total_time': invoice.get('total_time', 0.0)
                }
                
                db.insert_invoice(db_entry)
                migrated += 1
                logger.info(f"Successfully migrated invoice {invoice['invoice_number']}")
                
            except Exception as e:
                logger.error(f"Error migrating invoice {invoice.get('invoice_number', 'unknown')}: {str(e)}")
                errors += 1
                
        logger.info(f"Migration completed: {migrated} migrated, {errors} errors, {skipped} skipped")
        return migrated > 0 and errors == 0
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return False

def verify_migration():
    """Verify the migration by comparing JSON and database records."""
    try:
        with open(INVOICES_FILE, 'r') as f:
            json_invoices = json.load(f)
            
        db = InvoiceDB()
        db_invoices = db.get_all_invoices()
        
        json_count = len(json_invoices)
        db_count = len(db_invoices)
        
        logger.info(f"JSON records: {json_count}, Database records: {db_count}")
        
        # Create sets of invoice numbers for comparison
        json_numbers = {inv['invoice_number'] for inv in json_invoices}
        db_numbers = {inv['invoice_number'] for inv in db_invoices}
        
        missing = json_numbers - db_numbers
        if missing:
            logger.error(f"Missing invoices in database: {missing}")
            return False
            
        extra = db_numbers - json_numbers
        if extra:
            logger.warning(f"Extra invoices in database: {extra}")
            
        return len(missing) == 0
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        return False

async def main():
    logger.info("Starting invoice migration")
    success = await migrate_invoices()
    
    if success:
        logger.info("Migration successful, verifying...")
        if verify_migration():
            logger.info("Verification successful")
            return 0
        else:
            logger.error("Verification failed")
            return 1
    else:
        logger.error("Migration failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)