from minio import Minio
 #Bucket name
BUCKET_NAME = "uploads"

# Ensure bucket exists
def ensure_bucket_exists():
    try:
        if not client.bucket_exists(BUCKET_NAME):
            client.make_bucket(BUCKET_NAME)
    except S3Error as e:
        print(f"Error creating bucket: {e}")

ensure_bucket_exists()