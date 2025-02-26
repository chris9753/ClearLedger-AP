#!/usr/bin/env python3
import os
import json
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from pathlib import Path
from config.logging_config import logger
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Configure S3 client with retries
config = Config(
    retries = dict(
        max_attempts = 3,
        mode = 'adaptive'
    )
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'chris-clear-ledger-nextjs-2025')
AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')

def get_s3_client():
    """Get an S3 client with proper configuration."""
    return boto3.client(
        's3',
        region_name=AWS_REGION,
        config=config
    )

def ensure_bucket_exists():
    """Ensure S3 bucket exists and has proper configuration."""
    s3_client = get_s3_client()
    
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        logger.info(f"Bucket {BUCKET_NAME} already exists")
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:
            try:
                # Create bucket in the specified region
                if AWS_REGION == 'us-east-1':
                    s3_client.create_bucket(Bucket=BUCKET_NAME)
                else:
                    s3_client.create_bucket(
                        Bucket=BUCKET_NAME,
                        CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
                    )
                logger.info(f"Created bucket {BUCKET_NAME}")
                
                # Wait for bucket to exist
                waiter = s3_client.get_waiter('bucket_exists')
                waiter.wait(Bucket=BUCKET_NAME)
                
                # Make bucket public
                s3_client.put_public_access_block(
                    Bucket=BUCKET_NAME,
                    PublicAccessBlockConfiguration={
                        'BlockPublicAcls': False,
                        'IgnorePublicAcls': False,
                        'BlockPublicPolicy': False,
                        'RestrictPublicBuckets': False
                    }
                )

                # Configure bucket policy for public read access
                bucket_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{BUCKET_NAME}/*"]
                        }
                    ]
                }
                
                # Set the policy
                s3_client.put_bucket_policy(
                    Bucket=BUCKET_NAME,
                    Policy=json.dumps(bucket_policy)
                )
                logger.info("Set bucket policy for public read access")
                
                # Enable CORS for web access
                cors_configuration = {
                    'CORSRules': [{
                        'AllowedHeaders': ['*'],
                        'AllowedMethods': ['GET', 'HEAD'],
                        'AllowedOrigins': ['*'],
                        'ExposeHeaders': ['ETag'],
                        'MaxAgeSeconds': 3000
                    }]
                }
                s3_client.put_bucket_cors(
                    Bucket=BUCKET_NAME,
                    CORSConfiguration=cors_configuration
                )
                logger.info("Set bucket CORS policy")
                
            except ClientError as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
                raise
        elif error_code == 403:
            logger.error("Access denied. Please check your AWS credentials and permissions.")
            raise
        else:
            logger.error(f"Error checking bucket: {e}")
            raise

def upload_to_s3(file_path: str, max_retries: int = 3) -> str:
    """Upload a file to S3 and return its public URL."""
    s3_client = get_s3_client()
    file_name = Path(file_path).name
    s3_key = f"invoices/{file_name}"
    
    for attempt in range(max_retries):
        try:
            if not Path(file_path).exists():
                raise FileNotFoundError(f"File not found: {file_path}")
                
            # Ensure the bucket exists before upload
            ensure_bucket_exists()
            
            # Upload file with content-type set for PDFs
            extra_args = {
                'ContentType': 'application/pdf'
                # ACL removed as bucket policy handles public access
            }
            
            s3_client.upload_file(
                file_path, 
                BUCKET_NAME,
                s3_key,
                ExtraArgs=extra_args
            )
            
            pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded {file_name} to S3: {pdf_url}")
            return pdf_url
            
        except ClientError as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                logger.warning(f"Upload attempt {attempt + 1} failed, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed to upload to S3 after {max_retries} attempts: {e}")
                raise
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            raise

def main():
    """Test S3 setup with a sample file."""
    try:
        # Ensure bucket exists with proper configuration
        ensure_bucket_exists()
        
        # Test upload with a sample file
        sample_dir = Path(__file__).parent / "data" / "test_samples"
        test_files = list(sample_dir.glob("*.pdf"))
        
        if test_files:
            sample_pdf = str(test_files[0])
            pdf_url = upload_to_s3(sample_pdf)
            logger.info(f"Test upload successful. Generated PDF URL: {pdf_url}")
        else:
            logger.warning("No test PDF files found in test_samples directory")
            
    except Exception as e:
        logger.error(f"S3 setup failed: {e}")
        raise

if __name__ == "__main__":
    main()