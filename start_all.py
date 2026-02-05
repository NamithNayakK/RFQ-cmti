import subprocess
import os
import time
import sys


def load_env_file(env_path):
    env_data = {}
    if not os.path.exists(env_path):
        return env_data
    with open(env_path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env_data[key.strip()] = value.strip()
    return env_data


def start_services():
    """Start MinIO and FastAPI backend services"""
    
    # MinIO startup
    minio_dir = r"d:\ADA\minio-RELEASE.2025-10-15T17-29-55Z"
    minio_exe = os.path.join(minio_dir, "minio.exe")
    minio_data = r"d:\ADA\minio_data"
    backend_env_path = r"d:\ADA\backend\.env"

    env_values = load_env_file(backend_env_path)
    minio_root_user = env_values.get("MINIO_ACCESS_KEY", "minioadmin")
    minio_root_password = env_values.get("MINIO_SECRET_KEY", "minioadmin")
    minio_env = os.environ.copy()
    minio_env["MINIO_ROOT_USER"] = minio_root_user
    minio_env["MINIO_ROOT_PASSWORD"] = minio_root_password
    
    print("=" * 60)
    print("Starting MinIO Server...")
    print("=" * 60)
    
    try:
        # Create minio_data directory if it doesn't exist
        os.makedirs(minio_data, exist_ok=True)
        
        # Start MinIO as a separate process
        minio_process = subprocess.Popen(
            [minio_exe, "server", minio_data],
            cwd=minio_dir,
            env=minio_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"✓ MinIO started (PID: {minio_process.pid})")
        print(f"  Access at http://localhost:9000")
        print(f"  Console at http://localhost:9001")
        
    except Exception as e:
        print(f"✗ Failed to start MinIO: {e}")
        sys.exit(1)
    
    # Wait for MinIO to initialize
    time.sleep(3)
    
    # FastAPI backend startup
    backend_dir = r"d:\ADA\backend"
    
    print("\n" + "=" * 60)
    print("Starting FastAPI Backend...")
    print("=" * 60)
    
    try:
        os.chdir(backend_dir)
        print(f"✓ Backend starting on http://localhost:8000")
        print(f"  Docs at http://localhost:8000/docs")
        print(f"\nPress Ctrl+C to stop both services\n")
        
        # Start uvicorn in the foreground
        subprocess.run(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=backend_dir
        )
        
    except KeyboardInterrupt:
        print("\n\nShutting down services...")
        minio_process.terminate()
        print("✓ Services stopped")
    except Exception as e:
        print(f"✗ Failed to start backend: {e}")
        minio_process.terminate()
        sys.exit(1)


if __name__ == "__main__":
    start_services()
