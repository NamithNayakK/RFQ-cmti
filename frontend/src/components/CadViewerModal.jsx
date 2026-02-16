import { useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { fileService } from '../api/fileService';
import AutoCADViewCube from './AutoCADViewCube';

export default function CadViewerModal({ isOpen, onClose, request }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [measurements, setMeasurements] = useState(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !request) {
      return undefined;
    }

    let renderer = null;
    let animationId = null;
    let handleResize = null;
    let axesScene = null;
    let axesCamera = null;

    const loadViewer = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fileService.requestDownloadUrl(request.object_key);
        const downloadUrl = response.download_url;

        if (!downloadUrl) {
          throw new Error('Download URL not available');
        }

        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
          throw new Error('Failed to fetch CAD file');
        }

        const fileBuffer = new Uint8Array(await fileResponse.arrayBuffer());

        const [occtModule, threeModule, controlsModule] = await Promise.all([
          import('occt-import-js'),
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js')
        ]);

        const occtImport = occtModule.default || occtModule;
        const occt = await occtImport({
          locateFile: (path) => (path.endsWith('.wasm') ? '/occt-import-js.wasm' : path)
        });

        const THREE = threeModule;
        const { OrbitControls } = controlsModule;

        // Get the file name and check if it's a supported format
        // Use object_key which contains the actual filename
        const fileName = (request.object_key || '').toLowerCase();
        const isStep = fileName.endsWith('.stp') || fileName.endsWith('.step');
        const isIges = fileName.endsWith('.igs') || fileName.endsWith('.iges');
        
        if (!isStep && !isIges) {
          throw new Error('3D preview is only available for STEP (.stp, .step) and IGES (.igs, .iges) files. This file format is not supported.');
        }

        const readStep = occt.ReadStepFile || occt.ReadSTEPFile;
        const readIges = occt.ReadIgesFile || occt.ReadIGESFile;

        if (isIges && !readIges) {
          throw new Error('IGES parser not available');
        }
        if (isStep && !readStep) {
          throw new Error('STEP parser not available');
        }

        const result = isIges ? readIges(fileBuffer) : readStep(fileBuffer);
        const meshes = result?.meshes || [];

        if (!meshes.length) {
          throw new Error('No mesh data found in file. Please ensure the file is a valid STEP or IGES CAD file.');
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#f8f9fa');

        const group = new THREE.Group();

        meshes.forEach((mesh) => {
          const geometry = new THREE.BufferGeometry();
          const positions = mesh.vertices || mesh.attributes?.position?.array;
          const normals = mesh.normals || mesh.attributes?.normal?.array;
          const rawIndices = mesh.indices || mesh.index?.array;

          if (positions?.length) {
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
          }
          if (normals?.length) {
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
          } else {
            geometry.computeVertexNormals();
          }
          if (rawIndices?.length) {
            const indices = Array.isArray(rawIndices[0]) ? rawIndices.flat() : rawIndices;
            geometry.setIndex(indices);
          }

          let materialColor = new THREE.Color('#94a3b8');
          if (Array.isArray(mesh.color) && mesh.color.length >= 3) {
            const [r, g, b] = mesh.color;
            materialColor = new THREE.Color(
              r > 1 ? r / 255 : r,
              g > 1 ? g / 255 : g,
              b > 1 ? b / 255 : b
            );
          }

          const material = new THREE.MeshStandardMaterial({
            color: materialColor,
            metalness: 0.02,
            roughness: 0.4,
            flatShading: false
          });

          const meshObject = new THREE.Mesh(geometry, material);
          group.add(meshObject);
        });

        scene.add(group);

        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        // Calculate surface area from mesh faces
        let totalSurfaceArea = 0;
        group.traverse((child) => {
          if (child.isMesh && child.geometry) {
            const geo = child.geometry;
            const positions = geo.getAttribute('position');
            if (positions && geo.index) {
              const indices = geo.index.array;
              for (let i = 0; i < indices.length; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(positions, indices[i]);
                const v2 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]);
                const v3 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]);
                const edge1 = new THREE.Vector3().subVectors(v2, v1);
                const edge2 = new THREE.Vector3().subVectors(v3, v1);
                const cross = new THREE.Vector3().crossVectors(edge1, edge2);
                totalSurfaceArea += cross.length() * 0.5;
              }
            }
          }
        });

        // Detect holes by analyzing edge connectivity (simplified)
        let estimatedHolesCount = 0;
        group.traverse((child) => {
          if (child.isMesh && child.geometry) {
            const geo = child.geometry;
            // Create edges geometry to analyze topology
            const edges = new THREE.EdgesGeometry(geo, 30);
            const edgeCount = edges.getAttribute('position').count;
            // Heuristic: more edges relative to vertices can indicate holes/complexity
            const vertexCount = geo.getAttribute('position').count;
            if (edgeCount > vertexCount * 1.8) {
              estimatedHolesCount += Math.floor((edgeCount - vertexCount) / 15);
            }
          }
        });

        // Extract measurements from bounding box
        const extractedMeasurements = {
          boundingBox: {
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
            center: { x: center.x, y: center.y, z: center.z }
          },
          dimensions: {
            length: size.x,
            width: size.y,
            height: size.z,
            maxDimension: maxDim
          },
          volume: size.x * size.y * size.z,
          surfaceArea: totalSurfaceArea,
          holeCount: Math.max(0, estimatedHolesCount)
        };
        setMeasurements(extractedMeasurements);

        // Center the model at origin (FitAll behavior)
        group.position.sub(center);

        const normalizedBox = new THREE.Box3().setFromObject(group);
        const normalizedCenter = normalizedBox.getCenter(new THREE.Vector3());

        // Enhanced lighting for better clarity
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        
        // Main key light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
        directionalLight.position.set(maxDim * 1.2, maxDim * 1.5, maxDim * 1.0);
        
        // Fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
        fillLight.position.set(-maxDim * 0.8, -maxDim * 0.5, maxDim * 1.2);
        
        // Back light for edge definition
        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-maxDim * 1.5, maxDim * 1.0, -maxDim * 1.5);
        
        scene.add(ambientLight, directionalLight, fillLight, backLight);

        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(maxDim * 5, maxDim * 5),
          new THREE.ShadowMaterial({ opacity: 0.15 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = normalizedBox.min.y - 0.1;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
        cameraRef.current = camera;
        const distance = maxDim * 2.2;
        camera.position.set(normalizedCenter.x + distance, normalizedCenter.y + distance, normalizedCenter.z + distance);
        camera.lookAt(normalizedCenter);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: 'highp', powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.style.pointerEvents = 'auto';

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        group.traverse((child) => {
          if (child.isMesh) {
            // Improve edge clarity
            if (child.geometry) {
              child.geometry.computeVertexNormals();
              // Add sharp edges
              const edges = new THREE.EdgesGeometry(child.geometry, 25);
              const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 });
              const edgesHelper = new THREE.LineSegments(edges, edgesMaterial);
              child.add(edgesHelper);
            }
          }
        });

        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.enablePan = true;
        controls.panSpeed = 1.0;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 5;
        controls.enableRotate = true;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 5;
        // Enable 360-degree rotation - remove angle restrictions
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.rotateSpeed = 0.8;
        controls.target.copy(normalizedCenter);
        targetRef.current = normalizedCenter;
        controls.update();

        // Remove axes helper - using AutoCAD ViewCube instead
        // axesScene = new THREE.Scene();
        // axesCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
        // const axesHelper = new THREE.AxesHelper(0.8);
        // axesScene.add(axesHelper);

        const animate = () => {
          animationId = window.requestAnimationFrame(animate);
          controls.update();
          renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
          renderer.setScissor(0, 0, container.clientWidth, container.clientHeight);
          renderer.setScissorTest(true);
          renderer.render(scene, camera);

          // Remove old axes rendering - using AutoCAD ViewCube instead
          // const trihedronSize = Math.min(container.clientWidth, container.clientHeight) * 0.18;
          // renderer.clearDepth();
          // renderer.setViewport(12, 12, trihedronSize, trihedronSize);
          // renderer.setScissor(12, 12, trihedronSize, trihedronSize);
          // renderer.render(axesScene, axesCamera);
          renderer.setScissorTest(false);
        };

        animate();

        handleResize = () => {
          if (!renderer || !container) {
            return;
          }
          const width = container.clientWidth;
          const height = container.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
      } catch (err) {
        setError(err?.message || 'Failed to load CAD viewer');
      } finally {
        setLoading(false);
      }
    };

    loadViewer();

    return () => {
      if (animationId) {
        window.cancelAnimationFrame(animationId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, request]);

  if (!isOpen || !request) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">3D CAD Viewer</h2>
            <p className="text-sm text-slate-600">{request.part_name || 'Part'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            type="button"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="relative w-full h-[380px] bg-slate-100 rounded-xl overflow-hidden mb-6">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-500">Loading 3D viewer...</p>
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
            {/* AutoCAD ViewCube */}
            {cameraRef.current && controlsRef.current && targetRef.current && (
              <AutoCADViewCube 
                camera={cameraRef.current} 
                controls={controlsRef.current}
                target={targetRef.current}
                size={110}
              />
            )}
          </div>          {/* Measurements Panel */}
          {measurements && (
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Part Measurements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Length (X)</p>
                  <p className="text-lg font-semibold text-slate-900">{measurements.dimensions.length.toFixed(2)} mm</p>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Width (Y)</p>
                  <p className="text-lg font-semibold text-slate-900">{measurements.dimensions.width.toFixed(2)} mm</p>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Height (Z)</p>
                  <p className="text-lg font-semibold text-slate-900">{measurements.dimensions.height.toFixed(2)} mm</p>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Volume</p>
                  <p className="text-lg font-semibold text-slate-900">{(measurements.volume / 1000).toFixed(2)} cm³</p>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Surface Area</p>
                  <p className="text-lg font-semibold text-slate-900">{(measurements.surfaceArea / 100).toFixed(2)} cm²</p>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Estimated Holes</p>
                  <p className="text-lg font-semibold text-slate-900">{measurements.holeCount}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-4 p-2 bg-white rounded border border-slate-200">
                ℹ️ Measurements extracted from 3D model geometry. Surface area and hole count are estimates based on mesh topology analysis.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
