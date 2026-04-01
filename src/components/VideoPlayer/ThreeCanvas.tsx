"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

interface ThreeCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  backgroundSrc: string;
  padding: number; // 0–50 (percentage)
  borderRadius: number; // 0–50 (percentage of shorter side)
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Vertex shader — pass UVs through
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader — rounded rectangle clip + sample video texture
const fragmentShader = `
  uniform sampler2D map;
  uniform float borderRadius;
  varying vec2 vUv;

  float roundedBoxSDF(vec2 uv, float r) {
    vec2 q = abs(uv - 0.5) - vec2(0.5 - r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    float d = roundedBoxSDF(vUv, borderRadius);
    if (d > 0.0) discard;
    gl_FragColor = texture2D(map, vUv);
  }
`;

export default function ThreeCanvas({
  videoRef,
  backgroundSrc,
  padding,
  borderRadius,
  containerRef,
}: ThreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const videoPlaneRef = useRef<THREE.Mesh | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const rafRef = useRef<number>(0);
  const paddingRef = useRef(padding);
  const borderRadiusRef = useRef(borderRadius);

  // Keep refs in sync with props without rebuilding scene
  useEffect(() => {
    paddingRef.current = padding;
    if (videoPlaneRef.current) {
      const scale = 1 - (padding / 100) * 2;
      videoPlaneRef.current.scale.set(scale, scale, 1);
    }
  }, [padding]);

  useEffect(() => {
    borderRadiusRef.current = borderRadius;
    if (videoPlaneRef.current) {
      const mat = videoPlaneRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.borderRadius.value = borderRadius / 100;
    }
  }, [borderRadius]);

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!canvas || !container || !video) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Camera — orthographic, NDC space [-1,1]
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    cameraRef.current = camera;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background plane
    const bgTexture = new THREE.TextureLoader().load(backgroundSrc);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture });
    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.position.z = -0.1;
    scene.add(bgMesh);

    // Video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTextureRef.current = videoTexture;

    // Video plane with rounded-corner shader
    const videoMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: videoTexture },
        borderRadius: { value: borderRadiusRef.current / 100 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    // Size the video plane to maintain video aspect ratio within canvas
    const canvasAspect = width / height;
    const videoAspect = video.videoWidth / video.videoHeight || 16 / 9;
    let planeW: number;
    let planeH: number;
    if (videoAspect > canvasAspect) {
      planeW = 2 * 0.85;
      planeH = planeW / videoAspect * canvasAspect;
    } else {
      planeH = 2 * 0.75;
      planeW = planeH * videoAspect / canvasAspect;
    }

    const videoGeo = new THREE.PlaneGeometry(planeW, planeH);
    const videoPlane = new THREE.Mesh(videoGeo, videoMat);
    const initScale = 1 - (paddingRef.current / 100) * 2;
    videoPlane.scale.set(initScale, initScale, 1);
    scene.add(videoPlane);
    videoPlaneRef.current = videoPlane;

    // Render loop
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      if (videoTexture && video && video.readyState >= 2) {
        videoTexture.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function handleResize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      videoTexture.dispose();
      bgTexture.dispose();
    };
  }, [backgroundSrc, containerRef, videoRef]);

  useEffect(() => {
    // Wait for video metadata so we have correct dimensions
    const video = videoRef.current;
    if (!video) return;
    let cleanup: (() => void) | undefined;

    function onReady() {
      cleanup = initScene() ?? undefined;
    }

    if (video.readyState >= 1) {
      onReady();
    } else {
      video.addEventListener("loadedmetadata", onReady, { once: true });
    }

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      cleanup?.();
    };
  }, [initScene, videoRef]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}
