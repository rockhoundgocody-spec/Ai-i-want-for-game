
import React, { useMemo, Suspense, useRef } from 'react';
import { useLoader, Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, Environment, Center, Sparkles, ContactShadows, Float, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Rock } from '../types';

// Preload the model
useGLTF.preload('https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/models/crystal-v2.glb');

const Specimen: React.FC<{ rock?: Rock }> = ({ rock }) => {
  const { nodes } = useGLTF('https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/models/crystal-v2.glb') as any;
  const meshRef = useRef<THREE.Mesh>(null!);

  const crystalMaterial = useMemo(() => {
    const baseColor = rock?.color?.[0] ? new THREE.Color(rock.color[0].toLowerCase()) : new THREE.Color('#ffffff');
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      metalness: 0.1,
      roughness: 0.05,
      ior: 2.4, // Index of Refraction (Diamond-like)
      transmission: 1.0, // Full light transmission
      thickness: 1.5, // How thick the material is for refraction
      envMapIntensity: 2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.9
    });
  }, [rock]);

  useFrame((state, delta) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += delta * 0.1;
    }
  });

  if (!nodes || !nodes.crystal) return null;

  return (
    <Center>
      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={0.8}>
        <mesh 
          ref={meshRef} 
          geometry={nodes.crystal.geometry} 
          material={crystalMaterial} 
          castShadow 
          receiveShadow
          scale={2.5}
        />
        <Sparkles count={80} scale={3} size={8} speed={0.5} color={rock?.color?.[0] || '#ffffff'} />
      </Float>
    </Center>
  );
};

export const Rock3DViewer: React.FC<{ modelUrl: string; rock?: Rock }> = ({ modelUrl, rock }) => {
  return (
    <div className="w-full h-full relative bg-transparent">
        {/* Tactical HUD Elements */}
        <div className="absolute top-4 left-4 text-[8px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none z-10 animate-pulse">
            RHG_ID: {rock?.id.slice(0, 8)}...
        </div>
        <div className="absolute bottom-4 right-4 text-[8px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none z-10">
            RHG_VOXEL_INTEGRITY: 99.8%
        </div>
        <div className="absolute top-1/2 left-4 w-0.5 h-16 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent pointer-events-none z-10" />
        <div className="absolute top-1/2 right-4 w-0.5 h-16 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent pointer-events-none z-10" />

      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 35 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#030508']} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} color={rock?.color?.[0] || '#ffffff'} intensity={1.5} />
          
          <PresentationControls global polar={[-0.1, 0.4]} azimuth={[-0.4, 0.4]}>
            <Specimen rock={rock} />
          </PresentationControls>
          
          <Environment preset="city" />
          <ContactShadows position={[0, -2.5, 0]} opacity={0.3} scale={20} blur={2} far={3} />
          
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={0.8} luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} />
            <Noise opacity={0.025} />
            <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Rock3DViewer;
