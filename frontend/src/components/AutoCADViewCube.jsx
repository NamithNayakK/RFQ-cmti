import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function AutoCADViewCube({
  camera,
  controls,
  target,
  size = 120
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!camera || !controls || !target) return;

    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const cubeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    cubeCamera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "default";
    renderer.domElement.style.touchAction = "none";

    // ===== FACE MATERIAL =====
    function createMaterial(label) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = "#111827";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
      });
    }

    const materials = [
      createMaterial("RIGHT"),
      createMaterial("LEFT"),
      createMaterial("TOP"),
      createMaterial("BOTTOM"),
      createMaterial("FRONT"),
      createMaterial("BACK")
    ];

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      materials
    );

    scene.add(cube);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoverIndex = null;

    // ===== HOVER GLOW =====
    function updateHover(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cubeCamera);
      const intersects = raycaster.intersectObject(cube);

      cube.material.forEach(m => m.color.set("#ffffff"));

      if (intersects.length > 0) {
        hoverIndex = intersects[0].face.materialIndex;
        cube.material[hoverIndex].color.set("#38bdf8");
        renderer.domElement.style.cursor = "pointer";
      } else {
        hoverIndex = null;
        renderer.domElement.style.cursor = "default";
      }
    }

    renderer.domElement.addEventListener("mousemove", updateHover);

    // ===== SNAP CAMERA (Quaternion Based) =====
    function snapToDirection(direction) {
      const distance = camera.position.distanceTo(controls.target);

      const desiredPos = target.clone().add(
        direction.clone().multiplyScalar(distance)
      );

      const startQuat = camera.quaternion.clone();

      const tempCamera = new THREE.PerspectiveCamera();
      tempCamera.position.copy(desiredPos);
      tempCamera.lookAt(target);
      const endQuat = tempCamera.quaternion.clone();

      const startPos = camera.position.clone();
      const duration = 700;
      const startTime = performance.now();

      function animate() {
        const elapsed = performance.now() - startTime;
        let t = Math.min(elapsed / duration, 1);
        t = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.lerpVectors(startPos, desiredPos, t);
        THREE.Quaternion.slerp(startQuat, endQuat, camera.quaternion, t);

        controls.target.copy(target);
        controls.update();

        if (t < 1) requestAnimationFrame(animate);
      }

      animate();
    }

    // ===== CLICK =====
    function handleClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cubeCamera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        const normal = intersects[0].face.normal
          .clone()
          .applyQuaternion(cube.quaternion)
          .normalize();

        snapToDirection(normal);
      }
    }

    renderer.domElement.addEventListener("click", handleClick);

    // ===== SYNC ROTATION =====
    let rafId = 0;
    function animate() {
      cube.quaternion.copy(camera.quaternion);
      renderer.render(scene, cubeCamera);
      rafId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      renderer.domElement.removeEventListener("mousemove", updateHover);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [camera, controls, target, size]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: size,
        height: size,
        zIndex: 30
      }}
    />
  );
}
