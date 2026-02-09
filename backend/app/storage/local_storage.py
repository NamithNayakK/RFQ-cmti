import os
from pathlib import Path
from uuid import uuid4


UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_file_locally(file_data: bytes, filename: str) -> str:
    """Save file to local filesystem and return path"""
    ensure_upload_dir()
    
    unique_name = f"{uuid4()}_{filename}"
    file_path = UPLOAD_DIR / unique_name
    
    with open(file_path, 'wb') as f:
        f.write(file_data)
    
    return str(file_path)


def get_local_file_url(file_path: str) -> str:
    """Get a URL to access the locally stored file"""
    if os.path.exists(file_path):
        return f"http://localhost:8000/files/local/{Path(file_path).name}"
    return None


def get_file_from_local(filename: str) -> bytes:
    """Read file from local storage"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {filename}")
    
    with open(file_path, 'rb') as f:
        return f.read()


def delete_local_file(file_path: str) -> bool:
    """Delete a file from local storage"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False
