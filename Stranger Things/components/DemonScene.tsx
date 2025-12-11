import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { RitualStage, DemonSceneRef } from '../types';
import { ASSETS, COLORS, ANIMATION_CONFIG } from '../constants';

// --- Shaders ---
const particleVertexShader = `
    uniform float uTime;
    uniform float uBurst;
    attribute vec3 randomDir;
    attribute float randomScale;
    attribute vec3 aColor;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vColor = aColor;
        vec3 pos = position;
        if (uBurst > 0.5) {
            pos.x += randomDir.x * uTime * 2.0;
            pos.y += (randomDir.y + 1.0) * uTime * 1.5;
            pos.z += randomDir.z * uTime * 2.0;
        }
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (30.0 + randomScale * 10.0) * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = 0.3 - (uTime * 0.05);
        if (vAlpha < 0.0) vAlpha = 0.0;
    }
`;

const particleFragmentShader = `
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        if (vAlpha <= 0.0) discard;
        vec2 coord = gl_PointCoord - vec2(0.5);
        if(length(coord) > 0.5) discard;
        gl_FragColor = vec4(vColor, vAlpha);
    }
`;

interface Props {
  onLoadComplete: () => void;
  onStageChange: (stage: RitualStage) => void;
}

const DemonScene = forwardRef<DemonSceneRef, Props>(({ onLoadComplete, onStageChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const demonWrapperRef = useRef<THREE.Group | null>(null);
  const demonMeshRef = useRef<THREE.Group | null>(null);
  const demonParticlesRef = useRef<THREE.Points | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  
  // State Refs
  const stageRef = useRef<RitualStage>(RitualStage.IDLE);
  const isShakingRef = useRef(false);
  const isLoadedRef = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    isLoaded: () => isLoadedRef.current,
    
    resetRitual: () => {
      if (!isLoadedRef.current || !demonWrapperRef.current || !demonMeshRef.current || !demonParticlesRef.current) return;
      
      // Kill all active tweens
      gsap.killTweensOf(demonWrapperRef.current.position);
      gsap.killTweensOf(demonMeshRef.current.rotation);
      gsap.killTweensOf((demonParticlesRef.current.material as THREE.ShaderMaterial).uniforms.uTime);
      
      setStage(RitualStage.IDLE);
      isShakingRef.current = false;
      
      demonMeshRef.current.visible = true;
      demonMeshRef.current.position.set(0, 0, 0);
      demonMeshRef.current.rotation.y = -Math.PI / 2;
      
      demonWrapperRef.current.position.set(0, -7, -25);
      
      demonParticlesRef.current.visible = false;
      (demonParticlesRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = 0;
      (demonParticlesRef.current.material as THREE.ShaderMaterial).uniforms.uBurst.value = 0;
    },

    triggerAscend: () => {
      if (stageRef.current !== RitualStage.IDLE) return;
      
      setStage(RitualStage.RISING);
      isShakingRef.current = true;
      
      if (demonWrapperRef.current) {
        gsap.to(demonWrapperRef.current.position, {
          y: 15.0,
          duration: ANIMATION_CONFIG.ASCEND_DURATION,
          ease: "power2.inOut",
          onComplete: () => {
            setStage(RitualStage.HOVERING_HIGH);
            isShakingRef.current = true;
          }
        });
      }
    },

    triggerPullDown: () => {
      if (stageRef.current !== RitualStage.HOVERING_HIGH) return;
      
      setStage(RitualStage.MOVING_DOWN);
      isShakingRef.current = true;
      
      if (demonWrapperRef.current) {
        gsap.to(demonWrapperRef.current.position, {
          x: 0,
          y: 0,
          z: -8,
          duration: ANIMATION_CONFIG.PULL_DOWN_DURATION,
          ease: "power3.out",
          onComplete: () => {
            setStage(RitualStage.HOVERING_NEAR);
            isShakingRef.current = true;
          }
        });
      }
    },

    triggerAsh: () => {
      if (stageRef.current !== RitualStage.HOVERING_NEAR) return;
      
      setStage(RitualStage.DISSOLVING);
      isShakingRef.current = false;
      
      if (demonParticlesRef.current && demonWrapperRef.current && demonMeshRef.current) {
        demonParticlesRef.current.position.copy(demonWrapperRef.current.position);
        demonParticlesRef.current.rotation.copy(demonMeshRef.current.rotation);
        demonParticlesRef.current.scale.copy(demonMeshRef.current.scale);

        demonMeshRef.current.visible = false;
        demonParticlesRef.current.visible = true;
        
        const material = demonParticlesRef.current.material as THREE.ShaderMaterial;
        material.uniforms.uBurst.value = 1.0;
        material.uniforms.uTime.value = 0.1;

        gsap.to(material.uniforms.uTime, {
          value: 12.0,
          duration: ANIMATION_CONFIG.ASH_DURATION,
          ease: "linear"
        });
      }
    }
  }));

  const setStage = (newStage: RitualStage) => {
    stageRef.current = newStage;
    onStageChange(newStage);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.FOG, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(COLORS.MAIN_LIGHT, 3.85);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const hellLight = new THREE.DirectionalLight(COLORS.HELL_LIGHT, 4.35);
    hellLight.position.set(-5, 5, -10);
    scene.add(hellLight);

    // 3. Background
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(ASSETS.BACKGROUND_URL, (texture) => {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const bgMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        depthWrite: false,
        fog: false,
        color: COLORS.BG_FALLBACK
      });

      const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMaterial);
      bgMesh.position.set(0, 1, -150);
      scene.add(bgMesh);
      bgMeshRef.current = bgMesh;
      updateBackgroundCover();
    }, undefined, () => {
        // Error loading background, mostly harmless
        console.warn("Background image not found, using fallback color");
    });

    // 4. Model Loading & Particles
    const wrapper = new THREE.Group();
    wrapper.position.set(0, -7, -25);
    scene.add(wrapper);
    demonWrapperRef.current = wrapper;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(ASSETS.MODEL_URL, (gltf) => {
      const model = gltf.scene;
      model.scale.set(10.4, 10.4, 10.4);
      model.rotation.y = -Math.PI / 2;
      
      const vertices: number[] = [];
      const randomDirs: number[] = [];
      const randomScales: number[] = [];
      const colors: number[] = [];

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          const pos = mesh.geometry.attributes.position;
          const count = pos.count;
          const tempVec = new THREE.Vector3();
          
          for(let i=0; i < count; i+=3) {
            tempVec.fromBufferAttribute(pos, i);
            vertices.push(tempVec.x, tempVec.y, tempVec.z);
            randomDirs.push((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
            randomScales.push(Math.random());
            const rand = Math.random();
            if (rand > 0.7) colors.push(0.9, 0.9, 1.0);
            else if (rand > 0.4) colors.push(1.0, 0.5, 0.1);
            else colors.push(1.0, 1.0, 1.0);
          }
        }
      });

      demonMeshRef.current = model;
      wrapper.add(model);

      // Particle System
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      particleGeo.setAttribute('randomDir', new THREE.Float32BufferAttribute(randomDirs, 3));
      particleGeo.setAttribute('randomScale', new THREE.Float32BufferAttribute(randomScales, 1));
      particleGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));

      const particleMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uBurst: { value: 0 } },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const particles = new THREE.Points(particleGeo, particleMat);
      particles.visible = false;
      demonParticlesRef.current = particles;
      scene.add(particles);

      isLoadedRef.current = true;
      onLoadComplete();
    }, undefined, (err) => {
        console.error("Error loading model", err);
        // We trigger load complete anyway so UI shows up, but nothing will render
        onLoadComplete();
    });

    // 5. Animation Loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Shake Effect
      if (isShakingRef.current && demonMeshRef.current) {
        let shakeAmp = (stageRef.current === RitualStage.RISING || stageRef.current === RitualStage.HOVERING_HIGH) ? 0.3 : 0.2;
        demonMeshRef.current.position.set(
          (Math.random()-0.5)*shakeAmp, 
          (Math.random()-0.5)*shakeAmp, 
          (Math.random()-0.5)*shakeAmp
        );
      } else if (demonMeshRef.current && !stageRef.current.includes('DISSOLVING')) {
        demonMeshRef.current.position.set(0,0,0);
      }

      // Hover Effect
      if (demonWrapperRef.current && (stageRef.current === RitualStage.HOVERING_HIGH || stageRef.current === RitualStage.HOVERING_NEAR)) {
        demonWrapperRef.current.position.y += Math.sin(time * 2) * 0.01;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 6. Resize Handler
    const updateBackgroundCover = () => {
      if (!bgMeshRef.current || !cameraRef.current) return;
      const mesh = bgMeshRef.current;
      const texture = (mesh.material as THREE.MeshBasicMaterial).map;
      if (!texture || !texture.image) return;

      const windowAspect = window.innerWidth / window.innerHeight;
      const imageAspect = texture.image.width / texture.image.height;
      const vFOV = THREE.MathUtils.degToRad(cameraRef.current.fov);
      const visibleHeight = 2 * Math.tan(vFOV / 2) * (cameraRef.current.position.z - mesh.position.z);
      const visibleWidth = visibleHeight * windowAspect;

      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(visibleWidth * 1.02, visibleHeight * 1.02);

      if (windowAspect > imageAspect) {
        texture.repeat.set(1, imageAspect / windowAspect);
        texture.offset.set(0, (1 - texture.repeat.y) / 2);
      } else {
        texture.repeat.set(windowAspect / imageAspect, 1);
        texture.offset.set((1 - texture.repeat.x) / 2, 0);
      }
      texture.needsUpdate = true;
    };

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      updateBackgroundCover();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
         containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
});

export default DemonScene;
