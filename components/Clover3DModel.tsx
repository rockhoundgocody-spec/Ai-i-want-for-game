
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend, ThreeElement } from '@react-three/fiber';
import { Environment, shaderMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

type CloverMood = 'IDLE' | 'LISTENING' | 'THINKING';

interface CloverAvatarProps {
  mood: CloverMood;
  listeningAmplitude: number; 
}

const vertexShader = `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;
  uniform float uTime;
  uniform float uNoiseStrength;
  uniform float uNoiseSpeed;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec4 j = p - 49.0 * floor(p * (1.0/49.0));
    vec4 x_ = floor(j * (1.0/7.0));
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * (1.0/7.0) + 0.5/7.0;
    vec4 y = y_ * (1.0/7.0) + 0.5/7.0;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float noiseVal = snoise(position * 1.5 + uTime * uNoiseSpeed);
    vDisplacement = noiseVal;
    vec3 newPosition = position + normal * (noiseVal * uNoiseStrength);

    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = mvPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uIsThinking;
  uniform vec3 uColorCenter;
  uniform vec3 uColorEdge1;
  uniform vec3 uColorEdge2;
  uniform vec3 uColorGold;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  void main() {
    vec3 viewDirection = normalize(-vViewPosition);
    float fresnel = pow(1.0 - max(0.0, dot(vViewNormal, viewDirection)), 3.0);

    vec3 baseColor = mix(uColorCenter, uColorEdge1, fresnel);
    vec3 shiftedColor = mix(baseColor, uColorEdge2, vDisplacement * 0.5 + 0.5);
    
    float goldPulse = (sin(uTime * 15.0) * 0.5 + 0.5) * uIsThinking;
    vec3 finalColor = mix(shiftedColor, uColorGold, goldPulse);

    gl_FragColor = vec4(finalColor, fresnel * 1.5 + 0.2);
  }
`;

const LiquidGemMaterial = shaderMaterial(
  {
    uTime: 0,
    uNoiseSpeed: 0.5,
    uNoiseStrength: 0.2,
    uIsThinking: 0.0,
    uColorCenter: new THREE.Color('#110022'),
    uColorEdge1: new THREE.Color('#7700ff'),
    uColorEdge2: new THREE.Color('#00ccff'),
    uColorGold: new THREE.Color('#ffcc00'),
  },
  vertexShader,
  fragmentShader
);

extend({ LiquidGemMaterial });

// Fix: Removed global JSX shadowing block to restore standard React HTML elements.

const LiquidSphere: React.FC<CloverAvatarProps> = ({ mood, listeningAmplitude }) => {
  const materialRef = useRef<any>(null);

  const targetState = useMemo(() => {
    const amplitudeFactor = Math.min(1.0, listeningAmplitude / 128.0);
    switch (mood) {
      case 'LISTENING':
        return { speed: 2.0 + amplitudeFactor * 5.0, strength: 0.2 + amplitudeFactor * 0.5, isThinking: 0.0 };
      case 'THINKING':
        return { speed: 5.0, strength: 0.4, isThinking: 1.0 };
      case 'IDLE':
      default:
        return { speed: 0.5, strength: 0.15, isThinking: 0.0 };
    }
  }, [mood, listeningAmplitude]);
  
  useFrame((state, delta) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.uTime = state.clock.elapsedTime;
    
    mat.uNoiseSpeed = THREE.MathUtils.lerp(mat.uNoiseSpeed, targetState.speed, delta * 4);
    mat.uNoiseStrength = THREE.MathUtils.lerp(mat.uNoiseStrength, targetState.strength, delta * 6);
    mat.uIsThinking = THREE.MathUtils.lerp(mat.uIsThinking, targetState.isThinking, delta * 5);
  });

  return (
    <mesh scale={2}>
      <icosahedronGeometry args={[1, 64]} />
      {/* @ts-ignore: Custom material element */}
      <liquidGemMaterial 
        ref={materialRef} 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const CloverAvatar: React.FC<CloverAvatarProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <LiquidSphere {...props} />
        <Environment preset="night" />
        <EffectComposer enableNormalPass={false}>
          <Bloom 
            intensity={2.0} 
            luminanceThreshold={0.1} 
            radius={0.8} 
            mipmapBlur 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default CloverAvatar;
