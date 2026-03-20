
import React, { useRef, useMemo } from 'react';
import { Color, MathUtils } from 'three';
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- 1. THE "UBER" SHADER (Liquid Gemstone Engine) ---

const RockHoundUberMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorCore: new Color('#331100'),  // Deep Amber/Mineral Core
    uColorRim: new Color('#ffaa00'),   // Golden Glow
    uColorHighlight: new Color('#ffffff'), // Pure Light
    uNoiseStrength: 0.2,
    uNoiseSpeed: 0.5,
  },
  // --- VERTEX SHADER (The Shape Shifter) ---
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vDisplacement;
    varying vec3 vViewPosition;
    
    uniform float uTime;
    uniform float uNoiseStrength;
    uniform float uNoiseSpeed;

    // SIMPLEX NOISE ALGORITHM (High Performance)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vUv = uv;
      float noiseVal = snoise(position * 2.5 + uTime * uNoiseSpeed);
      vDisplacement = noiseVal;
      vec3 newPos = position + normal * (noiseVal * uNoiseStrength);
      vec4 modelViewPosition = modelViewMatrix * vec4(newPos, 1.0);
      vViewPosition = -modelViewPosition.xyz;
      vNormal = normalMatrix * normal; 
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `,
  // --- FRAGMENT SHADER (The Painter) ---
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vDisplacement;
    varying vec3 vViewPosition;

    uniform vec3 uColorCore;
    uniform vec3 uColorRim;
    uniform vec3 uColorHighlight;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      float fresnel = dot(viewDir, normal);
      fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
      float sharpFresnel = pow(fresnel, 3.0);
      float highlightMix = smoothstep(0.2, 0.5, vDisplacement);
      vec3 baseColor = mix(uColorCore, uColorRim, sharpFresnel);
      baseColor = mix(baseColor, uColorHighlight, highlightMix * sharpFresnel);
      gl_FragColor = vec4(baseColor, 0.95);
    }
  `
);

extend({ RockHoundUberMaterial });

type Mood = 'IDLE' | 'LISTENING' | 'THINKING';

interface RockHoundProps {
  mood: Mood;
  amplitude?: number;
}

export const CloverAvatar = ({ mood, amplitude = 0 }: RockHoundProps) => {
  const materialRef = useRef<any>(null);

  const targetState = useMemo(() => {
    switch (mood) {
      case 'LISTENING':
        return { speed: 2.5, strength: 0.7, rimColor: '#ffaa00', coreColor: '#442200', highlightColor: '#ffffff' };
      case 'THINKING':
        return { speed: 5.0, strength: 0.25, rimColor: '#00ffcc', coreColor: '#002211', highlightColor: '#ffffff' };
      case 'IDLE':
      default:
        return { speed: 0.3, strength: 0.15, rimColor: '#ffaa00', coreColor: '#331100', highlightColor: '#ffcc00' };
    }
  }, [mood]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta;
      
      let currentStrength = targetState.strength;
      if (mood === 'LISTENING') {
         const reaction = MathUtils.clamp(amplitude, 0, 1);
         currentStrength = (targetState.strength * 0.4) + (reaction * 0.8);
      }

      const lerpFactor = 0.1;
      materialRef.current.uNoiseSpeed = MathUtils.lerp(materialRef.current.uNoiseSpeed, targetState.speed, lerpFactor);
      materialRef.current.uNoiseStrength = MathUtils.lerp(materialRef.current.uNoiseStrength, currentStrength, 0.2);
      
      materialRef.current.uColorRim.lerp(new Color(targetState.rimColor), 0.05);
      materialRef.current.uColorCore.lerp(new Color(targetState.coreColor), 0.05);
      materialRef.current.uColorHighlight.lerp(new Color(targetState.highlightColor), 0.05);
    }
  });

  return (
    <>
      <mesh>
        <icosahedronGeometry args={[1.2, 96]} />
        {/* @ts-ignore: Custom material registered via extend() */}
        <rockHoundUberMaterial ref={materialRef} transparent={true} />
      </mesh>
      <EffectComposer enableNormalPass={false}>
        <Bloom 
            intensity={2.0} 
            luminanceThreshold={0.15} 
            luminanceSmoothing={0.9} 
            radius={0.6} 
            mipmapBlur 
        />
      </EffectComposer>
    </>
  );
};
