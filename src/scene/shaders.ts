import * as THREE from 'three';

/** Point-cloud shader: differential rotation, distance fog, twinkle and soft round falloff. */
export const POINT_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uSize;
  uniform float uRotation;
  uniform float uEnergy;
  uniform float uPixelRatio;
  uniform float uFogDensity;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uMaxSize;
  uniform float uTwinkle;
  uniform float uRadius;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aRadius;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    float radial = clamp(aRadius / max(uRadius, 0.001), 0.0, 1.0);
    float spin = uTime * uRotation * (1.0 + 0.08 * (1.0 - radial));
    float c = cos(spin);
    float s = sin(spin);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    pos.y += sin(uTime * 0.45 + aSeed * 6.2831) * 0.03 * (1.0 + uEnergy * 0.4);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.001);

    float twinkle = 1.0 - uTwinkle * 0.5 + uTwinkle * 0.5 * sin(uTime * (1.1 + aSeed * 2.7) + aSeed * 43.0);
    float bassPulse = 1.0 + uEnergy * 0.12;

    float size = aSize * uSize * uPixelRatio * (170.0 / depth) * bassPulse;
    gl_PointSize = clamp(size, 0.7, uMaxSize);

    float fog = exp(-max(depth - 16.0, 0.0) * uFogDensity);
    float brightness = (0.32 + 0.55 * uEnergy) * uGlow;
    float centerSoftening = mix(0.12, 1.0, smoothstep(0.0, uRadius * 0.14, aRadius));

    vColor = aColor;
    vAlpha = aAlpha * twinkle * fog * brightness * centerSoftening * 0.4 * uOpacity;
    gl_Position = projectionMatrix * mv;
  }
`;

export const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = 1.0 - d * 2.0;
    float soft = falloff * falloff;
    float hot = pow(falloff, 6.0);
    vec3 col = vColor * (0.5 + 1.15 * soft) + vColor * hot * 0.55;
    gl_FragColor = vec4(col, vAlpha * soft);
  }
`;

export interface PointUniforms {
  uTime: { value: number };
  uSize: { value: number };
  uRotation: { value: number };
  uEnergy: { value: number };
  uPixelRatio: { value: number };
  uFogDensity: { value: number };
  uGlow: { value: number };
  uOpacity: { value: number };
  uMaxSize: { value: number };
  uTwinkle: { value: number };
  uRadius: { value: number };
}

export function createPointUniforms(radius: number): PointUniforms {
  return {
    uTime: { value: 0 },
    uSize: { value: 1 },
    uRotation: { value: 0.14 },
    uEnergy: { value: 0.55 },
    uPixelRatio: { value: 1 },
    uFogDensity: { value: 0.0066 },
    uGlow: { value: 1 },
    uOpacity: { value: 1 },
    uMaxSize: { value: 46 },
    uTwinkle: { value: 0.6 },
    uRadius: { value: radius },
  };
}

export function createPointMaterial(
  uniforms: PointUniforms,
  overrides: { maxSize?: number; twinkle?: number } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uMaxSize: { value: overrides.maxSize ?? 46 },
      uTwinkle: { value: overrides.twinkle ?? 0.6 },
    },
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

/** Attaches a particle buffer set to an existing BufferGeometry. */
export function applyBuffers(
  geometry: THREE.BufferGeometry,
  buffers: {
    position: Float32Array;
    color: Float32Array;
    size: Float32Array;
    seed: Float32Array;
    radius: Float32Array;
    alpha: Float32Array;
  },
): void {
  geometry.setAttribute('position', new THREE.BufferAttribute(buffers.position, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(buffers.color, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(buffers.size, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seed, 1));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(buffers.radius, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(buffers.alpha, 1));
  geometry.computeBoundingSphere();
}
