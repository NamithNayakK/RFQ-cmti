import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiHome } from 'react-icons/fi';
import { fileService } from '../../api/fileService';
import AutoCADViewCube from '../../components/AutoCADViewCube';

export default function CadViewerPage({ request, onBack }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState('');
  const [measurements, setMeasurements] = useState(null);
  const [displayMode, setDisplayMode] = useState('shaded-visible-edges');
  const [colorMode, setColorMode] = useState(true); // true = colored by orientation, false = single color
  const sceneRef = useRef(null);
  const [activeView, setActiveView] = useState('iso');
  const animationRef = useRef({ isAnimating: false, startTime: 0, duration: 500 });

  useEffect(() => {
    if (!request) {
      return undefined;
    }

    let renderer = null;
    let animationId = null;
    let handleResize = null;

    const loadViewer = async () => {
      setLoading(true);
      setLoadingStatus('Preparing viewer...');
      setError('');
      setMeasurements(null);

      try {
        setLoadingStatus('Downloading file...');
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
        setLoadingStatus('Loading 3D engine...');

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

        const fileName = (request.object_key || '').toLowerCase();
        const isStep = fileName.endsWith('.stp') || fileName.endsWith('.step');
        const isIges = fileName.endsWith('.igs') || fileName.endsWith('.iges');

        if (!isStep && !isIges) {
          throw new Error('3D preview is only available for STEP (.stp, .step) and IGES (.igs, .iges) files.');
        }

        const readStep = occt.ReadStepFile || occt.ReadSTEPFile;
        const readIges = occt.ReadIgesFile || occt.ReadIGESFile;

        if (isIges && !readIges) {
          throw new Error('IGES parser not available');
        }
        if (isStep && !readStep) {
          throw new Error('STEP parser not available');
        }

        setLoadingStatus('Parsing CAD file...');
        const result = isIges ? readIges(fileBuffer) : readStep(fileBuffer);
        const meshes = result?.meshes || [];
        
        // Get unit scale from result (OpenCascade.js provides this)
        // 1 = meters, 1000 = millimeters, etc.
        const unitScale = result?.unit || 1000; // Default to millimeters if not provided
        console.log('CAD file unit scale:', unitScale);

        if (!meshes.length) {
          throw new Error('No mesh data found in file. Please ensure the file is a valid STEP or IGES CAD file.');
        }
        
        setLoadingStatus(`Processing ${meshes.length} mesh${meshes.length > 1 ? 'es' : ''}...`);

        const container = containerRef.current;
        if (!container) {
          return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#ffffff');

        // Add grid helper (AutoCAD-style)
        const gridSize = 200;
        const gridDivisions = 20;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0xcccccc);
        scene.add(gridHelper);

        const group = new THREE.Group();

        meshes.forEach((mesh) => {
          const geometry = new THREE.BufferGeometry();
          const positions = mesh.vertices || mesh.attributes?.position?.array;
          const normals = mesh.normals || mesh.attributes?.normal?.array;
          const rawIndices = mesh.indices || mesh.index?.array;

          if (!positions) return;

          // Ensure positions are in Float32Array
          const posArray = positions instanceof Float32Array 
            ? positions 
            : new Float32Array(positions);
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
          
          if (normals) {
            // Ensure normals are in Float32Array
            const normArray = normals instanceof Float32Array 
              ? normals 
              : new Float32Array(normals);
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normArray, 3));
          }
          
          if (rawIndices) {
            // Ensure indices are in a typed array (Uint16Array or Uint32Array)
            const indexArray = rawIndices instanceof Uint32Array || rawIndices instanceof Uint16Array
              ? rawIndices
              : new Uint32Array(rawIndices);
            geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
          }

          if (!normals) {
            geometry.computeVertexNormals();
          }
          geometry.computeBoundingBox();

          // Store normal attribute reference for later vertex color computation
          // Only compute colors when needed to improve loading performance

          const material = new THREE.MeshStandardMaterial({
            color: 0xbfc7d4,
            vertexColors: false, // Will be computed after first render
            metalness: 0.1,
            roughness: 0.6,
            side: THREE.DoubleSide,
            flatShading: false
          });

          const meshObj = new THREE.Mesh(geometry, material);
          meshObj.userData.hasVertexColors = false; // Will be set to true after colors computed
          group.add(meshObj);
        });
        
        setLoadingStatus('Building 3D scene...');

        scene.add(group);

        const bbox = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const size = new THREE.Vector3();
        bbox.getSize(size);

        const normalizedCenter = center.clone();
        group.position.sub(center);
        
        // Recalculate bbox after repositioning
        group.updateMatrixWorld(true);
        const bboxAfter = new THREE.Box3().setFromObject(group);
        const sizeAfter = new THREE.Vector3();
        bboxAfter.getSize(sizeAfter);

        // Volume approximation from bounding box
        const totalVolume = sizeAfter.x * sizeAfter.y * sizeAfter.z;

        // Set basic measurements immediately (defer surface area calculation)
        setMeasurements({
          dimensions: {
            length: sizeAfter.x,
            width: sizeAfter.y,
            height: sizeAfter.z,
            maxDimension: Math.max(sizeAfter.x, sizeAfter.y, sizeAfter.z)
          },
          volume: totalVolume,
          surfaceArea: null, // Will be calculated after render
          unit: 'mm' // Measurements are in millimeters
        });

        const maxDim = Math.max(sizeAfter.x, sizeAfter.y, sizeAfter.z);
        const cameraOffset = maxDim * 2.5;

        const camera = new THREE.PerspectiveCamera(
          50,
          container.clientWidth / container.clientHeight,
          0.1,
          maxDim * 1000
        );
        camera.position.set(
          normalizedCenter.x + cameraOffset,
          normalizedCenter.y + cameraOffset * 0.6,
          normalizedCenter.z + cameraOffset
        );
        camera.lookAt(normalizedCenter);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(100, 100, 100);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight2.position.set(-100, 50, -100);
        scene.add(dirLight2);

        const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight3.position.set(0, -100, 0);
        scene.add(dirLight3);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          precision: 'highp',
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = false;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Ensure main canvas can receive pointer events
        renderer.domElement.style.position = 'relative';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.touchAction = 'none'; // Prevent default touch behaviors

        // Add edge geometry
        group.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeVertexNormals();

            const edges = new THREE.EdgesGeometry(child.geometry, 20);
            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x1a1a1a,
              linewidth: 2,
              transparent: false
            });
            const edgesHelper = new THREE.LineSegments(edges, edgesMaterial);
            edgesHelper.name = 'visibleEdges';
            edgesHelper.renderOrder = 1;
            child.add(edgesHelper);

            const allEdges = new THREE.EdgesGeometry(child.geometry, 0);
            const hiddenEdgesMaterial = new THREE.LineBasicMaterial({
              color: 0x999999,
              linewidth: 1,
              transparent: true,
              opacity: 0.25,
              depthTest: false
            });
            const hiddenEdgesHelper = new THREE.LineSegments(allEdges, hiddenEdgesMaterial);
            hiddenEdgesHelper.name = 'hiddenEdges';
            hiddenEdgesHelper.renderOrder = -1;
            hiddenEdgesHelper.visible = false;
            child.add(hiddenEdgesHelper);

            const enhancedMaterial = child.material.clone();
            enhancedMaterial.flatShading = false;
            enhancedMaterial.metalness = 0.1;
            enhancedMaterial.roughness = 0.6;
            child.userData.originalMaterial = enhancedMaterial;
          }
        });

        applyDisplayMode(group, displayMode, THREE, colorMode);

        // Setup OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.enablePan = true;
        controls.panSpeed = 1.0;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 5;
        controls.enableRotate = true;
        controls.rotateSpeed = 0.8;
        controls.target.copy(normalizedCenter);
        controls.enabled = true;
        
        // Explicitly set mouse button mappings (standard CAD controls)
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        };
        
        controls.update();

        // Store scene reference
        sceneRef.current = {
          group,
          THREE,
          camera,
          controls,
          normalizedCenter,
          cameraOffset
        };

        // Animation loop
        const animate = () => {
          animationId = window.requestAnimationFrame(animate);

          if (animationRef.current.isAnimating) {
            const elapsed = performance.now() - animationRef.current.startTime;
            const progress = Math.min(elapsed / animationRef.current.duration, 1);
            const easedProgress = easeInOutCubic(progress);

            camera.position.lerpVectors(
              animationRef.current.startPosition,
              animationRef.current.targetPosition,
              easedProgress
            );

            camera.quaternion.slerpQuaternions(
              animationRef.current.startQuaternion,
              animationRef.current.targetQuaternion,
              easedProgress
            );

            camera.up.lerpVectors(
              animationRef.current.startUp,
              animationRef.current.targetUp,
              easedProgress
            );

            controls.target.copy(animationRef.current.targetCenter);

            if (progress >= 1) {
              camera.position.copy(animationRef.current.targetPosition);
              camera.quaternion.copy(animationRef.current.targetQuaternion);
              camera.up.copy(animationRef.current.targetUp);
              camera.lookAt(animationRef.current.targetCenter);
              controls.target.copy(animationRef.current.targetCenter);
              controls.update();
              animationRef.current.isAnimating = false;
            }
          }

          controls.update();

          renderer.render(scene, camera);
        };

        animate();

        handleResize = () => {
          if (!renderer || !container) return;
          const width = container.clientWidth;
          const height = container.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        setLoading(false);
        setLoadingStatus('');
        setError('');

        // Defer heavy calculations to after initial render
        setTimeout(() => {
          // Compute vertex colors for orientation-based coloring
          group.traverse((child) => {
            if (child.isMesh && child.geometry) {
              const geometry = child.geometry;
              const normalAttr = geometry.getAttribute('normal');
              
              if (normalAttr && !geometry.getAttribute('color')) {
                const colors = new Float32Array(normalAttr.count * 3);
                
                for (let i = 0; i < normalAttr.count; i++) {
                  const nx = Math.abs(normalAttr.getX(i));
                  const ny = Math.abs(normalAttr.getY(i));
                  const nz = Math.abs(normalAttr.getZ(i));
                  
                  colors[i * 3] = nx;
                  colors[i * 3 + 1] = ny;
                  colors[i * 3 + 2] = nz;
                }
                
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                child.userData.hasVertexColors = true;
              }
            }
          });
          
          // Apply vertex colors if color mode is enabled
          if (colorMode) {
            group.traverse((child) => {
              if (child.isMesh && child.material && child.userData.hasVertexColors) {
                child.material.vertexColors = true;
                child.material.needsUpdate = true;
              }
            });
          }
        }, 100);

        // Defer surface area calculation to prevent blocking
        setTimeout(() => {
          let totalSurfaceArea = 0;
          
          // Reuse Vector3 objects to reduce garbage collection
          const a = new THREE.Vector3();
          const b = new THREE.Vector3();
          const c = new THREE.Vector3();
          const ab = new THREE.Vector3();
          const ac = new THREE.Vector3();
          
          group.traverse((child) => {
            if (child.isMesh && child.geometry) {
              const geometry = child.geometry;
              
              if (geometry.index) {
                const posAttr = geometry.getAttribute('position');
                const indices = geometry.index.array;
                
                for (let i = 0; i < indices.length; i += 3) {
                  a.fromBufferAttribute(posAttr, indices[i]);
                  b.fromBufferAttribute(posAttr, indices[i + 1]);
                  c.fromBufferAttribute(posAttr, indices[i + 2]);
                  
                  ab.subVectors(b, a);
                  ac.subVectors(c, a);
                  ab.cross(ac);
                  totalSurfaceArea += ab.length() * 0.5;
                }
              }
            }
          });
          
          // Update measurements with calculated surface area
          setMeasurements(prev => ({
            ...prev,
            surfaceArea: totalSurfaceArea
          }));
        }, 200);

      } catch (err) {
        console.error('Error loading 3D viewer:', err);
        setError(err.message || 'Failed to load 3D viewer');
        setLoading(false);
        setLoadingStatus('');
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
      
      // Dispose all scene objects
      if (sceneRef.current?.group) {
        sceneRef.current.group.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      if (renderer) {
        renderer.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [request]);

  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const setView = (viewName) => {
    if (!sceneRef.current?.camera || !sceneRef.current?.controls) return;

    const { camera, controls, normalizedCenter, cameraOffset, THREE } = sceneRef.current;
    const offset = cameraOffset;

    let targetPosition = new THREE.Vector3();
    let targetUp = new THREE.Vector3();

    switch (viewName) {
      case 'front':
        targetPosition.set(normalizedCenter.x, normalizedCenter.y, normalizedCenter.z + offset);
        targetUp.set(0, 1, 0);
        break;
      case 'back':
        targetPosition.set(normalizedCenter.x, normalizedCenter.y, normalizedCenter.z - offset);
        targetUp.set(0, 1, 0);
        break;
      case 'top':
        targetPosition.set(normalizedCenter.x, normalizedCenter.y + offset, normalizedCenter.z);
        targetUp.set(0, 0, -1);
        break;
      case 'bottom':
        targetPosition.set(normalizedCenter.x, normalizedCenter.y - offset, normalizedCenter.z);
        targetUp.set(0, 0, 1);
        break;
      case 'right':
        targetPosition.set(normalizedCenter.x + offset, normalizedCenter.y, normalizedCenter.z);
        targetUp.set(0, 1, 0);
        break;
      case 'left':
        targetPosition.set(normalizedCenter.x - offset, normalizedCenter.y, normalizedCenter.z);
        targetUp.set(0, 1, 0);
        break;
      case 'iso':
        targetPosition.set(
          normalizedCenter.x + offset,
          normalizedCenter.y + offset * 0.6,
          normalizedCenter.z + offset
        );
        targetUp.set(0, 1, 0);
        break;
      default:
        return;
    }

    const tempCamera = new THREE.PerspectiveCamera();
    tempCamera.position.copy(targetPosition);
    tempCamera.up.copy(targetUp);
    tempCamera.lookAt(normalizedCenter);
    const targetQuaternion = tempCamera.quaternion.clone();

    animationRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: 500,
      startPosition: camera.position.clone(),
      targetPosition: targetPosition,
      startQuaternion: camera.quaternion.clone(),
      targetQuaternion: targetQuaternion,
      startUp: camera.up.clone(),
      targetUp: targetUp,
      targetCenter: normalizedCenter.clone()
    };

    setActiveView(viewName);
  };

  const applyDisplayMode = (group, mode, THREE, useVertexColors) => {
    if (!group) return;

    group.traverse((child) => {
      if (child.isMesh) {
        const visibleEdges = child.children.find(c => c.name === 'visibleEdges');
        const hiddenEdges = child.children.find(c => c.name === 'hiddenEdges');
        const originalMaterial = child.userData.originalMaterial;

        switch (mode) {
          case 'shaded-hidden-edges':
            child.visible = true;
            if (originalMaterial) {
              const mat = originalMaterial.clone();
              mat.color.setHex(0xbfc7d4);
              mat.vertexColors = child.userData.hasVertexColors && useVertexColors;
              mat.metalness = 0.1;
              mat.roughness = 0.6;
              child.material = mat;
            }
            if (visibleEdges) visibleEdges.visible = false;
            if (hiddenEdges) hiddenEdges.visible = false;
            break;

          case 'shaded-visible-edges':
            child.visible = true;
            if (originalMaterial) {
              const mat = originalMaterial.clone();
              mat.color.setHex(0xbfc7d4);
              mat.vertexColors = child.userData.hasVertexColors && useVertexColors;
              mat.metalness = 0.1;
              mat.roughness = 0.6;
              child.material = mat;
            }
            if (visibleEdges) {
              visibleEdges.visible = true;
              visibleEdges.material.color.setHex(0x1a1a1a);
              visibleEdges.material.linewidth = 2;
              visibleEdges.material.opacity = 1;
              visibleEdges.material.transparent = false;
            }
            if (hiddenEdges) hiddenEdges.visible = false;
            break;

          case 'wireframe':
            child.visible = true;
            child.material = new THREE.MeshBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide
            });
            if (visibleEdges) {
              visibleEdges.visible = true;
              visibleEdges.material.color.setHex(0x000000);
              visibleEdges.material.linewidth = 2;
              visibleEdges.material.opacity = 1;
              visibleEdges.material.transparent = false;
            }
            if (hiddenEdges) hiddenEdges.visible = false;
            break;

          case 'wireframe-hidden-edges':
            child.visible = true;
            child.material = new THREE.MeshBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide
            });
            if (visibleEdges) {
              visibleEdges.visible = true;
              visibleEdges.material.color.setHex(0x000000);
              visibleEdges.material.linewidth = 2.5;
              visibleEdges.material.opacity = 1;
              visibleEdges.material.transparent = false;
              visibleEdges.renderOrder = 2;
            }
            if (hiddenEdges) {
              hiddenEdges.visible = true;
              hiddenEdges.material.color.setHex(0x999999);
              hiddenEdges.material.linewidth = 1;
              hiddenEdges.material.opacity = 0.35;
              hiddenEdges.material.transparent = true;
              hiddenEdges.material.depthTest = false;
              hiddenEdges.renderOrder = -1;
            }
            break;

          case 'wireframe-visible-edges':
            child.visible = true;
            child.material = new THREE.MeshBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide
            });
            if (visibleEdges) {
              visibleEdges.visible = true;
              visibleEdges.material.color.setHex(0x1a1a1a);
              visibleEdges.material.linewidth = 2.5;
              visibleEdges.material.opacity = 1;
              visibleEdges.material.transparent = false;
              visibleEdges.material.depthTest = true;
            }
            if (hiddenEdges) hiddenEdges.visible = false;
            break;

          default:
            break;
        }
      }
    });
  };

  useEffect(() => {
    if (sceneRef.current?.group && sceneRef.current?.THREE) {
      applyDisplayMode(sceneRef.current.group, displayMode, sceneRef.current.THREE, colorMode);
    }
  }, [displayMode, colorMode]);

  return (
    <div className="flex flex-col h-full gap-4 px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Display:</label>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="shaded-hidden-edges">Shaded</option>
              <option value="shaded-visible-edges">Shaded with Visible Edges</option>
              <option value="wireframe">Wireframe</option>
              <option value="wireframe-hidden-edges">Wireframe with Hidden Edges</option>
              <option value="wireframe-visible-edges">Wireframe (Visible Edges Only)</option>
            </select>
          </div>
          
          <button
            onClick={() => setColorMode(!colorMode)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              colorMode 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            type="button"
            title={colorMode ? 'Switch to single color' : 'Switch to orientation colors'}
          >
            {colorMode ? '🎨 Colored' : '⚪ Single Color'}
          </button>
        </div>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          type="button"
        >
          <FiArrowLeft size={16} />
          Back to Quotations
        </button>
      </div>

      {!request ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Select a quotation to view its 3D model.
        </div>
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row gap-5">
          <div className="flex-1 lg:basis-[70%]">
            <div className="relative w-full h-[520px] lg:h-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm touchAction-none">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-600 font-medium">{loadingStatus || 'Loading 3D viewer...'}</p>
                </div>
              )}
              {error && !loading && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
              {!loading && !error && sceneRef.current && (
                <>
                  <AutoCADViewCube 
                    camera={sceneRef.current.camera}
                    controls={sceneRef.current.controls}
                    target={sceneRef.current.normalizedCenter}
                    size={120}
                  />
                  <button
                    onClick={() => setView('iso')}
                    className="absolute top-[10px] right-[140px] inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-500 transition-colors shadow-md z-10"
                    type="button"
                    title="Isometric View (Home)"
                  >
                    <FiHome size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="w-full lg:basis-[30%]">
            <div className="bg-white rounded-xl border border-slate-200 p-5 h-full min-h-[520px] lg:h-full">
              <p className="text-sm text-slate-600 mb-2">{request?.part_name || 'Part'}</p>
              <h3 className="font-semibold text-slate-900 mb-4">Dimensions</h3>
              {measurements ? (
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Length (X)</span>
                    <span className="font-medium text-slate-900">{measurements.dimensions.length.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Width (Y)</span>
                    <span className="font-medium text-slate-900">{measurements.dimensions.width.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Height (Z)</span>
                    <span className="font-medium text-slate-900">{measurements.dimensions.height.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Max Dimension</span>
                    <span className="font-medium text-slate-900">{measurements.dimensions.maxDimension.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Volume</span>
                    <span className="font-medium text-slate-900">{(measurements.volume / 1000).toFixed(2)} cm3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Surface Area</span>
                    <span className="font-medium text-slate-900">
                      {measurements.surfaceArea !== null 
                        ? `${(measurements.surfaceArea / 100).toFixed(2)} cm2`
                        : 'Calculating...'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                    Note: Surface area is estimated based on mesh data.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Measurements will appear once the model loads.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
