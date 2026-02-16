import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ViewCube = ({ camera, controls, size = 100 }) => {
  const cubeRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const [hoveredFace, setHoveredFace] = useState(null);
  
  // AutoCAD ViewCube configurations
  const viewConfigurations = {
    FRONT: { position: [0, 0, 5], up: [0, 1, 0] },
    BACK: { position: [0, 0, -5], up: [0, 1, 0] },
    TOP: { position: [0, 5, 0], up: [0, 0, -1] },
    BOTTOM: { position: [0, -5, 0], up: [0, 0, 1] },
    LEFT: { position: [-5, 0, 0], up: [0, 1, 0] },
    RIGHT: { position: [5, 0, 0], up: [0, 1, 0] },
    
    // Isometric views
    'TOP-FRONT-RIGHT': { position: [5, 5, 5], up: [0, 1, 0] },
    'TOP-FRONT-LEFT': { position: [-5, 5, 5], up: [0, 1, 0] },
    'TOP-BACK-RIGHT': { position: [5, 5, -5], up: [0, 1, 0] },
    'TOP-BACK-LEFT': { position: [-5, 5, -5], up: [0, 1, 0] },
    'BOTTOM-FRONT-RIGHT': { position: [5, -5, 5], up: [0, 1, 0] },
    'BOTTOM-FRONT-LEFT': { position: [-5, -5, 5], up: [0, 1, 0] },
    'BOTTOM-BACK-RIGHT': { position: [5, -5, -5], up: [0, 1, 0] },
    'BOTTOM-BACK-LEFT': { position: [-5, -5, -5], up: [0, 1, 0] }
  };

  useEffect(() => {
    if (!cubeRef.current) return;

    // Create scene for ViewCube
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create renderer for ViewCube
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    cubeRef.current.appendChild(renderer.domElement);

    // Create ViewCube geometry with proper face materials
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // Materials for each face with AutoCAD-style colors and labels
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // Right
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // Left
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // Top
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // Bottom
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // Front
      new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide })  // Back
    ];

    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);

    // Create text labels for each face
    const loader = new THREE.FontLoader();
    
    // Create text sprites for each face
    const createTextSprite = (text, color = 0x0000FF) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 128;
      
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, 128, 128);
      
      context.font = 'Bold 48px Arial';
      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 64, 64);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(1, 1, 1);
      
      return sprite;
    };

    // Add text labels to each face
    const labels = [
      { text: 'RIGHT', position: [1.1, 0, 0], color: 0x0000FF },   // Right face
      { text: 'LEFT', position: [-1.1, 0, 0], color: 0x0000FF },    // Left face
      { text: 'TOP', position: [0, 1.1, 0], color: 0x0000FF },      // Top face
      { text: 'BOTTOM', position: [0, -1.1, 0], color: 0x0000FF },  // Bottom face
      { text: 'FRONT', position: [0, 0, 1.1], color: 0x0000FF },   // Front face
      { text: 'BACK', position: [0, 0, -1.1], color: 0x0000FF }     // Back face
    ];

    labels.forEach(label => {
      const sprite = createTextSprite(label.text, label.color);
      sprite.position.set(...label.position);
      scene.add(sprite);
    });

    // Add edge highlights
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    cube.add(edges);

    // Setup camera for ViewCube
    const cubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    cubeCamera.position.set(3, 3, 3);
    cubeCamera.lookAt(0, 0, 0);

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cubeCamera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        const faceIndex = intersects[0].face.materialIndex;
        const faceNames = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
        setHoveredFace(faceNames[faceIndex]);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredFace(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cubeCamera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        const faceIndex = intersects[0].face.materialIndex;
        const faceNames = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
        const faceName = faceNames[faceIndex];
        
        if (viewConfigurations[faceName] && camera && controls) {
          animateCameraToView(viewConfigurations[faceName]);
        }
      }
    };

    const animateCameraToView = (targetView) => {
      if (!camera || !controls) return;

      const startPos = camera.position.clone();
      const startTarget = controls.target.clone();
      const endPos = new THREE.Vector3(...targetView.position);
      const endTarget = new THREE.Vector3(0, 0, 0);
      
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate cube to match main camera orientation
      if (camera) {
        cube.rotation.copy(camera.rotation);
      }
      
      renderer.render(scene, cubeCamera);
    };

    animate();

    return () => {
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      cubeRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [camera, controls, size]);

  return (
    <div 
      ref={cubeRef} 
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: `${size}px`,
        height: `${size}px`,
        border: hoveredFace ? '2px solid #007bff' : '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        cursor: hoveredFace ? 'pointer' : 'default'
      }}
    />
  );
};

export default ViewCube;
