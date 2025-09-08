/**
 * Optimized 3D Shaders
 * High-performance shaders with GPU-based culling and LOD
 */

export const OPTIMIZED_3D_VERTEX_SHADER = `#version 300 es
precision highp float;

// Vertex attributes
in vec2 a_position;
in vec2 a_texCoord;

// Instance attributes (packed for efficiency)
in vec4 a_instanceTransform; // x, y, scaleX, scaleY
in vec4 a_instanceColor;
in vec4 a_instanceTexCoords; // u1, v1, u2, v2
in vec2 a_instanceDepthZ; // depth, z

// Uniforms
uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_view3DMatrix;
uniform vec3 u_viewerPosition; // x, y, z
uniform vec2 u_viewport;
uniform float u_time; // For animations
uniform bool u_enable3D;

// LOD and culling uniforms
uniform float u_lodDistance1;
uniform float u_lodDistance2;
uniform float u_lodDistance3;
uniform float u_cullDistance;

// Outputs
out vec2 v_texCoord;
out vec4 v_color;
out float v_depth;
out float v_distanceFromViewer;
out float v_lodFactor;
out float v_cullFactor; // 0 = culled, 1 = visible

// GPU-based distance calculation
float calculateDistance3D(vec3 pos1, vec3 pos2) {
  vec3 diff = pos1 - pos2;
  return length(diff);
}

// GPU-based LOD calculation
float calculateLOD(float distance) {
  if (distance <= u_lodDistance1) return 0.0;
  if (distance <= u_lodDistance2) return 1.0;
  if (distance <= u_lodDistance3) return 2.0;
  return 3.0;
}

// GPU-based frustum culling
float frustumCull(vec4 clipPos) {
  vec3 ndc = clipPos.xyz / clipPos.w;
  
  // Check if within normalized device coordinates
  if (abs(ndc.x) > 1.0 || abs(ndc.y) > 1.0 || ndc.z < -1.0 || ndc.z > 1.0) {
    return 0.0; // Culled
  }
  
  return 1.0; // Visible
}

void main() {
  vec3 instancePos = vec3(a_instanceTransform.xy, a_instanceDepthZ.y);
  vec3 viewerPos = u_viewerPosition;
  
  // Calculate distance for LOD and culling
  float distance = calculateDistance3D(instancePos, viewerPos);
  
  // Distance culling
  v_cullFactor = distance <= u_cullDistance ? 1.0 : 0.0;
  
  if (v_cullFactor < 0.5) {
    // Cull by moving outside clip space
    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
    return;
  }
  
  // Calculate LOD
  float lodLevel = calculateLOD(distance);
  v_lodFactor = lodLevel;
  
  // Scale based on LOD (reduce vertex processing for distant objects)
  vec2 scaleFactor = a_instanceTransform.zw;
  if (lodLevel >= 2.0) {
    scaleFactor *= 0.5; // Reduce geometry for distant objects
  }
  
  // Transform vertex
  vec2 scaledPos = a_position * scaleFactor;
  
  if (u_enable3D) {
    vec3 worldPos = vec3(scaledPos + a_instanceTransform.xy, a_instanceDepthZ.y);
    
    // Apply distance-based scaling for depth perception
    float perspectiveFactor = 1.0 / (1.0 + distance * 0.001);
    worldPos.xy *= perspectiveFactor;
    
    // 3D transformation
    vec4 clipPos = u_view3DMatrix * vec4(worldPos, 1.0);
    gl_Position = clipPos;
    
    // Frustum culling
    v_cullFactor *= frustumCull(clipPos);
    
    v_depth = distance * 0.001;
    v_distanceFromViewer = distance;
  } else {
    // 2D mode
    vec4 clipPos = u_viewProjectionMatrix * vec4(scaledPos + a_instanceTransform.xy, a_instanceDepthZ.x, 1.0);
    gl_Position = clipPos;
    
    v_depth = a_instanceDepthZ.x;
    v_distanceFromViewer = 0.0;
  }
  
  // Interpolate texture coordinates based on LOD
  v_texCoord = mix(a_instanceTexCoords.xy, a_instanceTexCoords.zw, a_texCoord);
  v_color = a_instanceColor;
  
  // Reduce alpha for very distant objects
  if (distance > u_cullDistance * 0.8) {
    float fadeStart = u_cullDistance * 0.8;
    float fadeRange = u_cullDistance * 0.2;
    float fadeAlpha = 1.0 - clamp((distance - fadeStart) / fadeRange, 0.0, 1.0);
    v_color.a *= fadeAlpha;
  }
}
`;

export const OPTIMIZED_3D_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec4 v_color;
in float v_depth;
in float v_distanceFromViewer;
in float v_lodFactor;
in float v_cullFactor;

uniform sampler2D u_texture;
uniform sampler2D u_lodTexture1; // Medium detail texture
uniform sampler2D u_lodTexture2; // Low detail texture
uniform bool u_useTexture;
uniform bool u_enable3D;
uniform float u_fogDistance;
uniform vec3 u_fogColor;

// Dithering for smooth LOD transitions
uniform float u_time;

out vec4 fragColor;

// Simple random function for dithering
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Dithered LOD selection
vec4 sampleLODTexture() {
  if (!u_useTexture) {
    return vec4(1.0);
  }
  
  // Use dithering for smooth LOD transitions
  float dither = rand(gl_FragCoord.xy + u_time) * 0.5;
  float effectiveLOD = v_lodFactor + dither;
  
  if (effectiveLOD < 0.5) {
    return texture(u_texture, v_texCoord);
  } else if (effectiveLOD < 1.5) {
    // Blend between high and medium detail
    float blend = fract(effectiveLOD);
    vec4 highDetail = texture(u_texture, v_texCoord);
    vec4 mediumDetail = texture(u_lodTexture1, v_texCoord);
    return mix(highDetail, mediumDetail, blend);
  } else if (effectiveLOD < 2.5) {
    return texture(u_lodTexture1, v_texCoord);
  } else {
    return texture(u_lodTexture2, v_texCoord);
  }
}

void main() {
  // Early discard for culled fragments
  if (v_cullFactor < 0.5) {
    discard;
  }
  
  vec4 baseColor;
  
  if (u_useTexture) {
    baseColor = sampleLODTexture() * v_color;
  } else {
    baseColor = v_color;
  }
  
  if (u_enable3D) {
    // Apply distance-based fog for depth perception
    float fogFactor = 1.0;
    if (u_fogDistance > 0.0) {
      fogFactor = exp(-v_distanceFromViewer / u_fogDistance);
      fogFactor = clamp(fogFactor, 0.0, 1.0);
    }
    
    // Mix with fog color
    fragColor = mix(vec4(u_fogColor, baseColor.a), baseColor, fogFactor);
    
    // Apply LOD-based quality reduction
    if (v_lodFactor >= 2.0) {
      // Reduce color precision for distant objects
      fragColor.rgb = floor(fragColor.rgb * 8.0) / 8.0;
    }
  } else {
    fragColor = baseColor;
  }
  
  // Premultiply alpha
  fragColor.rgb *= fragColor.a;
  
  // Set depth for proper Z-buffer
  gl_FragDepth = v_depth;
}
`;

// Compute shader for GPU-based culling (WebGL 2.0 compute where supported)
export const GPU_CULLING_COMPUTE_SHADER = `#version 310 es
layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// Input/output buffers
layout(std430, binding = 0) readonly buffer InputElements {
  float elements[]; // Packed: x, y, z, width, height, zMin, zMax, id (8 floats per element)
};

layout(std430, binding = 1) writeonly buffer OutputVisible {
  uint visibleIndices[];
};

layout(std430, binding = 2) writeonly buffer OutputCulled {
  uint culledIndices[];
};

layout(std430, binding = 3) buffer Counters {
  uint visibleCount;
  uint culledCount;
};

// Uniforms
uniform vec3 u_viewerPosition;
uniform vec4 u_frustum; // left, right, top, bottom
uniform vec2 u_frustumDepth; // near, far
uniform float u_cullDistance;
uniform float u_lodDistance;

bool isInFrustum(uint elementIndex) {
  uint baseIndex = elementIndex * 8u;
  
  float x = elements[baseIndex];
  float y = elements[baseIndex + 1u];
  float width = elements[baseIndex + 3u];
  float height = elements[baseIndex + 4u];
  float zMin = elements[baseIndex + 5u];
  float zMax = elements[baseIndex + 6u];
  
  // Frustum culling
  if (x + width < u_frustum.x || x > u_frustum.y ||
      y + height < u_frustum.z || y > u_frustum.w ||
      zMax < u_frustumDepth.x || zMin > u_frustumDepth.y) {
    return false;
  }
  
  return true;
}

float calculateDistance(uint elementIndex) {
  uint baseIndex = elementIndex * 8u;
  
  float x = elements[baseIndex];
  float y = elements[baseIndex + 1u];
  float z = elements[baseIndex + 2u];
  
  vec3 elementPos = vec3(x, y, z);
  vec3 diff = elementPos - u_viewerPosition;
  
  return length(diff);
}

void main() {
  uint elementIndex = gl_GlobalInvocationID.x;
  uint totalElements = uint(elements.length()) / 8u;
  
  if (elementIndex >= totalElements) {
    return;
  }
  
  // Frustum culling
  if (!isInFrustum(elementIndex)) {
    uint culledIndex = atomicAdd(culledCount, 1u);
    culledIndices[culledIndex] = elementIndex;
    return;
  }
  
  // Distance culling
  float distance = calculateDistance(elementIndex);
  if (distance > u_cullDistance) {
    uint culledIndex = atomicAdd(culledCount, 1u);
    culledIndices[culledIndex] = elementIndex;
    return;
  }
  
  // Element is visible
  uint visibleIndex = atomicAdd(visibleCount, 1u);
  visibleIndices[visibleIndex] = elementIndex;
}
`;

/**
 * Optimized shader manager with GPU culling capabilities
 */
export class OptimizedShaderManager {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private computePrograms: Map<string, WebGLProgram> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initializeShaders();
  }
  
  private initializeShaders(): void {
    // Create optimized 3D rendering program
    const program = this.createProgram(
      OPTIMIZED_3D_VERTEX_SHADER,
      OPTIMIZED_3D_FRAGMENT_SHADER
    );
    this.programs.set('optimized-3d', program);
    
    // Create compute shader if supported
    if (this.gl.getParameter(this.gl.MAX_COMPUTE_WORK_GROUP_SIZE)) {
      try {
        const computeProgram = this.createComputeProgram(GPU_CULLING_COMPUTE_SHADER);
        this.computePrograms.set('gpu-culling', computeProgram);
      } catch (error) {
        console.warn('GPU compute culling not available:', error);
      }
    }
  }
  
  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Shader program linking failed: ${info}`);
    }
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return program;
  }
  
  private createComputeProgram(computeSource: string): WebGLProgram {
    const gl = this.gl;
    
    const computeShader = this.createShader((gl as any).COMPUTE_SHADER, computeSource);
    const program = gl.createProgram()!;
    gl.attachShader(program, computeShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Compute program linking failed: ${info}`);
    }
    
    gl.deleteShader(computeShader);
    return program;
  }
  
  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }
    
    return shader;
  }
  
  getProgram(name: string): WebGLProgram | null {
    return this.programs.get(name) || null;
  }
  
  getComputeProgram(name: string): WebGLProgram | null {
    return this.computePrograms.get(name) || null;
  }
  
  hasGPUCulling(): boolean {
    return this.computePrograms.has('gpu-culling');
  }
}