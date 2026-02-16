import os
import tempfile
from datetime import timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from app.config.settings import MINIO_BUCKET
from app.models.file_models import File
from app.storage.minio_client import minio_client, ensure_bucket


def _mesh_object_key(object_key: str) -> str:
    safe_key = object_key.replace('/', '__')
    return f"mesh/{safe_key}.glb"


def generate_mesh_url(object_key: str, db: Session) -> Tuple[str, str]:
    file_record = db.query(File).filter(File.object_key == object_key).first()
    if not file_record:
        raise ValueError(f"STP file not found in database: {object_key}")

    ensure_bucket()
    mesh_key = _mesh_object_key(object_key)

    try:
        minio_client.stat_object(MINIO_BUCKET, mesh_key)
        mesh_url = minio_client.presigned_get_object(
            MINIO_BUCKET,
            mesh_key,
            expires=timedelta(hours=1)
        )
        return mesh_url, mesh_key
    except Exception:
        pass

    # For now, we'll generate a simple placeholder mesh
    # In a production environment, you would use a proper OpenCascade installation
    with tempfile.TemporaryDirectory() as tmpdir:
        glb_path = os.path.join(tmpdir, "mesh.glb")

        try:
            import trimesh
            import numpy as np
            
            # Create a simple cube as placeholder mesh
            vertices = np.array([
                [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
            ])
            
            faces = np.array([
                [0, 1, 2], [0, 2, 3],  # bottom
                [4, 6, 5], [4, 7, 6],  # top
                [0, 4, 5], [0, 5, 1],  # front
                [2, 6, 7], [2, 7, 3],  # back
                [0, 3, 7], [0, 7, 4],  # left
                [1, 5, 6], [1, 6, 2]   # right
            ])
            
            mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
            glb_bytes = mesh.export(file_type="glb")
            with open(glb_path, "wb") as handle:
                handle.write(glb_bytes)

            # Upload GLB to MinIO
            minio_client.fput_object(
                MINIO_BUCKET,
                mesh_key,
                glb_path,
                content_type="model/gltf-binary"
            )

            mesh_url = minio_client.presigned_get_object(
                MINIO_BUCKET,
                mesh_key,
                expires=timedelta(hours=1)
            )

        except Exception as exc:
            raise RuntimeError(f"Mesh generation failed: {exc}") from exc

    return mesh_url, mesh_key
