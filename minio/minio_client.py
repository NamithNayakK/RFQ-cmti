import os
from minio import Minio

minio_client = Minio(
    os.getenv("MINIO_ENDPOINT"),
    access_key=os.getenv("MINIO_ACCESS_KEY"),
    secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=os.getenv("MINIO_SECURE") == "true"
)

BUCKET = os.getenv("MINIO_BUCKET")

if not minio_client.bucket_exists(BUCKET):
    minio_client.make_bucket(BUCKET)
