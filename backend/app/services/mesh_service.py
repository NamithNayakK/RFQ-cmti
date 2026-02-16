import os
import tempfile
import subprocess
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

    with tempfile.TemporaryDirectory() as tmpdir:
        step_path = os.path.join(tmpdir, "input.step")
        stl_path = os.path.join(tmpdir, "mesh.stl")
        glb_path = os.path.join(tmpdir, "mesh.glb")

        # Download the STEP file from MinIO
        response = minio_client.get_object(MINIO_BUCKET, object_key)
        try:
            with open(step_path, "wb") as handle:
                handle.write(response.read())
        finally:
            response.close()
            response.release_conn()

        try:
            # Try using python-opencascade first
            import OCCT
            from OCCT.BRep import BRep_Builder
            from OCCT.TopoDS import TopoDS_Shape
            from OCCT.STEPCAFControl import STEPCAFControl_Reader
            from OCCT.StlAPI import StlAPI_Writer
            from OCCT.BRepMesh import BRepMesh_IncrementalMesh
            
            # Read STEP file
            step_reader = STEPCAFControl_Reader()
            step_reader.ReadFile(step_path)
            step_reader.TransferRoots()
            
            # Get the shape and generate mesh
            shape = TopoDS_Shape()
            mesh_generator = BRepMesh_IncrementalMesh(shape, 0.1)
            mesh_generator.Perform()
            
            # Write to STL
            stl_writer = StlAPI_Writer()
            stl_writer.Write(shape, stl_path)
            
        except ImportError:
            # Fallback to using occt-import-js via Node.js
            try:
                node_script = f"""
const OCCT = require('occt-import-js');
const fs = require('fs');

async function convertStepToStl() {{
    const occt = await OCCT({{
        locateFile: (path) => path.endsWith('.wasm') ? '/node_modules/occt-import-js/dist/occt-import-js.wasm' : path
    }});
    
    const stepBuffer = fs.readFileSync('{step_path}');
    const result = occt.ReadStepFile(stepBuffer.buffer);
    
    if (result && result.length > 0) {{
        const mesh = occt.Tessellate(result[0], 0.1);
        
        // Convert to STL format
        let stlContent = 'solid mesh\\n';
        for (let i = 0; i < mesh.triangles.length; i += 3) {{
            const v1 = mesh.vertices[mesh.triangles[i]];
            const v2 = mesh.vertices[mesh.triangles[i + 1]];
            const v3 = mesh.vertices[mesh.triangles[i + 2]];
            
            // Calculate normal
            const edge1 = {{ x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z }};
            const edge2 = {{ x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z }};
            const normal = {{
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            }};
            
            stlContent += `facet normal ${{normal.x}} ${{normal.y}} ${{normal.z}}\\n`;
            stlContent += `  outer loop\\n`;
            stlContent += `    vertex ${{v1.x}} ${{v1.y}} ${{v1.z}}\\n`;
            stlContent += `    vertex ${{v2.x}} ${{v2.y}} ${{v2.z}}\\n`;
            stlContent += `    vertex ${{v3.x}} ${{v3.y}} ${{v3.z}}\\n`;
            stlContent += `  endloop\\n`;
            stlContent += `endfacet\\n`;
        }}
        stlContent += 'endsolid mesh\\n';
        
        fs.writeFileSync('{stl_path}', stlContent);
        console.log('STL conversion completed');
    }} else {{
        console.error('No shapes found in STEP file');
        process.exit(1);
    }}
}}

convertStepToStl().catch(console.error);
"""
                
                script_path = os.path.join(tmpdir, "convert.js")
                with open(script_path, "w") as f:
                    f.write(node_script)
                
                # Run the Node.js script
                result = subprocess.run(
                    ["node", script_path],
                    capture_output=True,
                    text=True,
                    cwd=tmpdir
                )
                
                if result.returncode != 0:
                    raise RuntimeError(f"OpenCascade conversion failed: {result.stderr}")
                    
            except Exception as e:
                raise RuntimeError(f"OpenCascade not available and Node.js fallback failed: {e}")

        # Convert STL to GLB using trimesh
        try:
            import trimesh
        except Exception as exc:
            raise RuntimeError("trimesh is required to export GLB") from exc

        mesh = trimesh.load_mesh(stl_path, force='mesh')
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

    return mesh_url, mesh_key
