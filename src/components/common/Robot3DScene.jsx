import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Helper function to create a precise Rounded Box (Chamfered/Beveled Cube)
function createRoundedBoxGeometry(width, height, depth, radius, smoothness = 12) {
  const shape = new THREE.Shape();
  const eps = 0.00001;
  const rad = Math.min(radius, Math.min(width, Math.min(height, depth)) / 2 - eps);
  const w = width / 2 - rad;
  const h = height / 2 - rad;

  shape.absarc(w, h, rad, 0, Math.PI / 2, false);
  shape.absarc(-w, h, rad, Math.PI / 2, Math.PI, false);
  shape.absarc(-w, -h, rad, Math.PI, Math.PI * 3 / 2, false);
  shape.absarc(w, -h, rad, Math.PI * 3 / 2, Math.PI * 2, false);

  const extrudeSettings = {
    depth: depth - rad * 2,
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: rad,
    bevelThickness: rad,
    curveSegments: smoothness
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

export default function Robot3DScene({ isLit = false, isTyping = false }) {
  const containerRef = useRef(null);
  const isLitRef = useRef(isLit);
  const isTypingRef = useRef(isTyping);

  useEffect(() => {
    isLitRef.current = isLit;
  }, [isLit]);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup (Transparent, isolated)
    const scene = new THREE.Scene();

    // 2. Camera Setup (Straight front isometric perspective)
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.7, 6.0);
    camera.lookAt(0, 1.05, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting System (Theme Adaptive)
    const ambientLight = new THREE.AmbientLight(0x23263d, 1.6);
    scene.add(ambientLight);

    // Key Spotlight from right
    const keySpot = new THREE.SpotLight(0xff1493, 16, 12, Math.PI / 3.2, 0.35, 1.1);
    keySpot.position.set(2.5, 4.5, 2.5);
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    scene.add(keySpot);

    // Secondary Backlight from left
    const leftBackLight = new THREE.SpotLight(0x7928ca, 14, 10, Math.PI / 3.5, 0.4, 1.2);
    leftBackLight.position.set(-3.5, 2.5, 2.5);
    scene.add(leftBackLight);

    // Pure White Right Rim Light
    const keyWhiteLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyWhiteLight.position.set(4, 3, 2.5);
    scene.add(keyWhiteLight);

    // Top Rim Light
    const topBackLight = new THREE.DirectionalLight(0x9d4edd, 2.8);
    topBackLight.position.set(-1, 5, -3);
    scene.add(topBackLight);

    // Soft Front Fill Light
    const fillLight = new THREE.DirectionalLight(0xd8b4fe, 1.2);
    fillLight.position.set(0, -1, 4);
    scene.add(fillLight);

    // 5. Materials (Exact Blender Metallic Shader Replication)
    const bodyMetallicMaterial = new THREE.MeshStandardMaterial({
      color: 0x484e68,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 2.0
    });

    const polishedChromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xeef2f7,
      metalness: 0.98,
      roughness: 0.08
    });

    const darkSteelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1d29,
      metalness: 0.85,
      roughness: 0.32
    });

    const screenPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6dbe6,
      metalness: 0.45,
      roughness: 0.28
    });

    const eyeSphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.06
    });

    const eyeSocketDarkMaterial = new THREE.MeshBasicMaterial({
      color: 0x07090f
    });

    // 6. Construction of the Robot Character
    const robotRoot = new THREE.Group();
    scene.add(robotRoot);
    robotRoot.position.set(0, -0.65, 0);

    // ==========================================
    // A. BASE CUBE WITH BEVELED EDGES
    // ==========================================
    const baseWidth = 1.7;
    const baseHeight = 1.5;
    const baseDepth = 1.7;
    const baseBevel = 0.08;

    const baseGeometry = createRoundedBoxGeometry(baseWidth, baseHeight, baseDepth, baseBevel, 12);
    const baseMesh = new THREE.Mesh(baseGeometry, bodyMetallicMaterial);
    baseMesh.position.set(0, baseHeight / 2 + 0.06, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    robotRoot.add(baseMesh);

    // Bottom Rubber Foot Mat
    const footGeometry = createRoundedBoxGeometry(baseWidth + 0.04, 0.08, baseDepth + 0.04, 0.03, 8);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.95 });
    const footMesh = new THREE.Mesh(footGeometry, footMat);
    footMesh.position.set(0, 0.04, 0);
    robotRoot.add(footMesh);

    // ==========================================
    // B. MECHANICAL NECK ASSEMBLY
    // ==========================================
    const neckBaseGroup = new THREE.Group();
    neckBaseGroup.position.set(0, baseHeight + 0.06, 0);
    robotRoot.add(neckBaseGroup);

    // 1. Two Parallel Vertical Pillars (Mount Legs)
    const pillarGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.32, 24);
    const leftPillar = new THREE.Mesh(pillarGeo, polishedChromeMaterial);
    leftPillar.position.set(-0.16, 0.16, 0);
    leftPillar.castShadow = true;
    neckBaseGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, polishedChromeMaterial);
    rightPillar.position.set(0.16, 0.16, 0);
    rightPillar.castShadow = true;
    neckBaseGroup.add(rightPillar);

    // 2. Neck Articulation Joint Hub
    const neckJointGroup = new THREE.Group();
    neckJointGroup.position.set(0, 0.32, 0);
    neckBaseGroup.add(neckJointGroup);

    // Lower Swivel Saucer / Bowl Cup
    const lowerCupGeo = new THREE.CylinderGeometry(0.38, 0.18, 0.18, 32);
    const lowerCup = new THREE.Mesh(lowerCupGeo, polishedChromeMaterial);
    lowerCup.position.set(0, 0.09, 0);
    lowerCup.castShadow = true;
    neckJointGroup.add(lowerCup);

    // Central Sphere Ball Socket
    const ballJointGeo = new THREE.SphereGeometry(0.32, 32, 32);
    const ballJoint = new THREE.Mesh(ballJointGeo, polishedChromeMaterial);
    ballJoint.position.set(0, 0.28, 0);
    ballJoint.castShadow = true;
    neckJointGroup.add(ballJoint);

    // Inverted Tapered Upper Neck Cone
    const upperConeGeo = new THREE.CylinderGeometry(0.24, 0.38, 0.42, 32);
    const upperCone = new THREE.Mesh(upperConeGeo, polishedChromeMaterial);
    upperCone.position.set(0, 0.58, 0);
    upperCone.castShadow = true;
    neckJointGroup.add(upperCone);

    // Top Neck Flange Collar
    const collarGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 32);
    const collar = new THREE.Mesh(collarGeo, darkSteelMaterial);
    collar.position.set(0, 0.81, 0);
    neckJointGroup.add(collar);

    // ==========================================
    // C. HEAD BOX & BEZEL
    // ==========================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.85, 0);
    neckJointGroup.add(headGroup);

    const headWidth = 1.75;
    const headHeight = 1.25;
    const headDepth = 1.35;
    const headBevel = 0.14;

    const headGeometry = createRoundedBoxGeometry(headWidth, headHeight, headDepth, headBevel, 14);
    const headMesh = new THREE.Mesh(headGeometry, bodyMetallicMaterial);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    // Front Screen Outer Bezel Frame
    const bezelWidth = headWidth - 0.16;
    const bezelHeight = headHeight - 0.16;
    const bezelGeometry = createRoundedBoxGeometry(bezelWidth, bezelHeight, 0.1, 0.1, 12);
    const bezelMesh = new THREE.Mesh(bezelGeometry, darkSteelMaterial);
    bezelMesh.position.set(0, 0, headDepth / 2 - 0.04);
    headGroup.add(bezelMesh);

    // Flat Off-White / Silver-Grey Face Screen
    const screenWidth = bezelWidth - 0.12;
    const screenHeight = bezelHeight - 0.12;
    const screenGeometry = createRoundedBoxGeometry(screenWidth, screenHeight, 0.04, 0.08, 12);
    const screenMesh = new THREE.Mesh(screenGeometry, screenPanelMaterial);
    screenMesh.position.set(0, 0, headDepth / 2 + 0.02);
    headGroup.add(screenMesh);

    // Left Ear Concentric Dial Ring
    const earOuterRingGeo = new THREE.TorusGeometry(0.24, 0.035, 16, 32);
    const leftEarOuter = new THREE.Mesh(earOuterRingGeo, polishedChromeMaterial);
    leftEarOuter.position.set(-headWidth / 2 - headBevel * 0.45, 0, 0);
    leftEarOuter.rotation.y = Math.PI / 2;
    headGroup.add(leftEarOuter);

    const earInnerRingGeo = new THREE.TorusGeometry(0.12, 0.025, 16, 32);
    const leftEarInner = new THREE.Mesh(earInnerRingGeo, polishedChromeMaterial);
    leftEarInner.position.set(-headWidth / 2 - headBevel * 0.45, 0, 0);
    leftEarInner.rotation.y = Math.PI / 2;
    headGroup.add(leftEarInner);

    // Right Ear Outer Ring
    const rightEarOuter = new THREE.Mesh(earOuterRingGeo, polishedChromeMaterial);
    rightEarOuter.position.set(headWidth / 2 + headBevel * 0.45, 0, 0);
    rightEarOuter.rotation.y = Math.PI / 2;
    headGroup.add(rightEarOuter);

    // ==========================================
    // D. EYES WITH CRESCENT SHADOW SOCKETS
    // ==========================================
    const eyesContainer = new THREE.Group();
    eyesContainer.position.set(0, 0.12, headDepth / 2 + 0.045);
    headGroup.add(eyesContainer);

    const eyeSpacing = 0.38;
    const eyeRadius = 0.17;

    // Left Eye Socket (Dark crescent backdrop)
    const socketGeo = new THREE.CircleGeometry(eyeRadius * 1.05, 32);
    const leftSocket = new THREE.Mesh(socketGeo, eyeSocketDarkMaterial);
    leftSocket.position.set(-eyeSpacing, -0.02, 0.001);
    eyesContainer.add(leftSocket);

    // Left Eye Protruding Sphere
    const eyeSphereGeo = new THREE.SphereGeometry(eyeRadius, 32, 32);
    const leftEye = new THREE.Mesh(eyeSphereGeo, eyeSphereMaterial);
    leftEye.position.set(-eyeSpacing, 0, eyeRadius * 0.45);
    leftEye.castShadow = true;
    eyesContainer.add(leftEye);

    // Right Eye Socket
    const rightSocket = new THREE.Mesh(socketGeo, eyeSocketDarkMaterial);
    rightSocket.position.set(eyeSpacing, -0.02, 0.001);
    eyesContainer.add(rightSocket);

    // Right Eye Protruding Sphere
    const rightEye = new THREE.Mesh(eyeSphereGeo, eyeSphereMaterial);
    rightEye.position.set(eyeSpacing, 0, eyeRadius * 0.45);
    rightEye.castShadow = true;
    eyesContainer.add(rightEye);

    // ==========================================
    // E. HEAD POSE & MOUSE TRACKING
    // ==========================================
    const initialHeadRotationX = 0.0;
    const initialHeadRotationY = 0.0;
    const initialHeadRotationZ = 0.0;

    let targetRotX = initialHeadRotationX;
    let targetRotY = initialHeadRotationY;
    let targetRotZ = initialHeadRotationZ;

    let currentRotX = initialHeadRotationX;
    let currentRotY = initialHeadRotationY;
    let currentRotZ = initialHeadRotationZ;

    let targetEyeX = 0;
    let targetEyeY = 0;
    let currentEyeX = 0;
    let currentEyeY = 0;

    let blinkScale = 1.0;
    let lastBlink = 0;

    // Mouse Tracking Event
    const onMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const mouseX = (e.clientX / innerWidth) * 2 - 1;
      const mouseY = -(e.clientY / innerHeight) * 2 + 1;

      targetRotY = mouseX * 0.35;
      targetRotX = -mouseY * 0.25;
      targetRotZ = -mouseX * 0.06;

      targetEyeX = mouseX * 0.04;
      targetEyeY = mouseY * 0.03;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Window Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', onResize);

    // Colors for Theme Transitions
    const goldColor = new THREE.Color(0xffd700);
    const pinkColor = new THREE.Color(0xff1493);
    const amberColor = new THREE.Color(0xf59e0b);
    const purpleColor = new THREE.Color(0x7928ca);
    const warmAmbient = new THREE.Color(0x382c18);
    const coolAmbient = new THREE.Color(0x23263d);

    // ==========================================
    // F. ANIMATION LOOP (60FPS WebGL)
    // ==========================================
    let animId;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = (performance.now() - startTime) * 0.001;

      // Theme-based smooth lighting interpolation
      const targetSpot = isLitRef.current ? goldColor : pinkColor;
      const targetBack = isLitRef.current ? amberColor : purpleColor;
      const targetAmb = isLitRef.current ? warmAmbient : coolAmbient;

      keySpot.color.lerp(targetSpot, 0.08);
      leftBackLight.color.lerp(targetBack, 0.08);
      ambientLight.color.lerp(targetAmb, 0.08);

      // Typing reaction (cute curious bobbing)
      const isTypingNow = isTypingRef.current;
      const bobSpeed = isTypingNow ? 3.5 : 2.0;
      const bobAmount = isTypingNow ? 0.04 : 0.025;

      const idleBob = Math.sin(time * bobSpeed) * bobAmount;
      const idleSway = Math.cos(time * (bobSpeed * 0.75)) * 0.015;
      robotRoot.position.y = -0.65 + idleBob;

      // Natural blink cycle
      if (time - lastBlink > 3.8 + Math.sin(time * 4) * 1.2) {
        blinkScale = 0.08;
        if (time - lastBlink > 4.0 + Math.sin(time * 4) * 1.2) {
          blinkScale = 1.0;
          lastBlink = time;
        }
      }

      // Smooth interpolation (lerp)
      currentRotX += (targetRotX + idleSway - currentRotX) * 0.07;
      currentRotY += (targetRotY - currentRotY) * 0.07;
      currentRotZ += (targetRotZ - currentRotZ) * 0.07;

      headGroup.rotation.x = currentRotX;
      headGroup.rotation.y = currentRotY;
      headGroup.rotation.z = currentRotZ;

      // Upper cone neck slight organic pivot
      upperCone.rotation.x = currentRotX * 0.4;
      upperCone.rotation.y = currentRotY * 0.3;
      upperCone.rotation.z = currentRotZ * 0.3;

      // Subtle base cube response
      baseMesh.rotation.y = currentRotY * 0.15;

      // Eye pupil tracking and blink scale
      currentEyeX += (targetEyeX - currentEyeX) * 0.12;
      currentEyeY += (targetEyeY - currentEyeY) * 0.12;

      leftEye.position.x = -eyeSpacing + currentEyeX;
      leftEye.position.y = currentEyeY;
      leftEye.scale.y = blinkScale;

      rightEye.position.x = eyeSpacing + currentEyeX;
      rightEye.position.y = currentEyeY;
      rightEye.scale.y = blinkScale;

      // Dynamic spotlight pulse
      keySpot.intensity = 15 + Math.sin(time * 3.0) * 2.0;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] sm:min-h-[480px] lg:min-h-[540px] relative pointer-events-none select-none flex items-center justify-center"
      style={{ touchAction: 'none' }}
    />
  );
}
