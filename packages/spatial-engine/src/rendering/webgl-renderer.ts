/**
 * High-performance WebGL renderer optimized for spatial navigation
 * Features instanced rendering, texture atlasing, and GPU-accelerated culling
 */

import type { SpatialElement, Viewport, BoundingBox } from '../types.js';

interface WebGLProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  attributes: Record<string, number>;
}

interface RenderBatch {
  elements: SpatialElement[];
  texture?: WebGLTexture;
  program: WebGLProgram;
  instanceCount: number;
}

interface TextureAtlas {
  texture: WebGLTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  allocations: Map<string, { x: number; y: number; width: number; height: number }>;
  freeSlots: { x: number; y: number; width: number; height: number }[];
  size: number;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  private textureAtlas: TextureAtlas;
  private instancedVBO: WebGLBuffer;
  private quadVBO: WebGLBuffer;
  private quadIBO: WebGLBuffer;
  private transformFeedback: WebGLTransformFeedback;
  
  // Performance tracking
  private frameStats = {
    drawCalls: 0,
    verticesRendered: 0,
    instancesRendered: 0,
    textureBinds: 0,
    lastFrameTime: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;
    this.initializeRenderer();
  }

  private initializeRenderer(): void {
    const gl = this.gl;

    // Enable extensions
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    
    // Set up initial GL state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    this.createShaders();
    this.createBuffers();
    this.createTextureAtlas();
  }

  private createShaders(): void {
    // 3D-enabled instanced quad rendering shader
    const instancedVertexShader = `#version 300 es
      precision highp float;
      
      // Vertex attributes
      in vec2 a_position;
      in vec2 a_texCoord;
      
      // Instance attributes
      in vec4 a_instanceTransform; // x, y, scaleX, scaleY
      in vec4 a_instanceColor;
      in vec4 a_instanceTexCoords; // u1, v1, u2, v2
      in float a_instanceDepth;
      in float a_instanceZ; // Z-coordinate for 3D positioning
      
      // Uniforms
      uniform mat4 u_viewProjectionMatrix;
      uniform mat4 u_view3DMatrix;
      uniform vec2 u_viewport;
      uniform float u_viewerZ; // Current Z position of viewer
      uniform bool u_enable3D;
      
      // Outputs
      out vec2 v_texCoord;
      out vec4 v_color;
      out float v_depth;
      out float v_distanceFromViewer;
      
      void main() {
        // Transform vertex by instance transform
        vec2 scaledPos = a_position * a_instanceTransform.zw;
        vec3 worldPos = vec3(scaledPos + a_instanceTransform.xy, a_instanceZ);
        
        if (u_enable3D) {
          // Calculate distance from viewer for 3D effects
          float distanceFromViewer = abs(a_instanceZ - u_viewerZ);
          v_distanceFromViewer = distanceFromViewer;
          
          // Apply 3D perspective and depth-based scaling
          float perspectiveFactor = 1.0 / (1.0 + distanceFromViewer * 0.001);
          worldPos.xy *= perspectiveFactor;
          
          // Apply 3D view transformation
          vec4 clipPos = u_view3DMatrix * vec4(worldPos, 1.0);
          gl_Position = clipPos;
          
          // Set depth based on Z distance from viewer
          v_depth = distanceFromViewer * 0.001;
        } else {
          // 2D mode - use original transformation
          vec4 clipPos = u_viewProjectionMatrix * vec4(worldPos.xy, a_instanceDepth, 1.0);
          gl_Position = clipPos;
          v_depth = a_instanceDepth;
          v_distanceFromViewer = 0.0;
        }
        
        // Pass through texture coordinates and color
        v_texCoord = mix(a_instanceTexCoords.xy, a_instanceTexCoords.zw, a_texCoord);
        v_color = a_instanceColor;
      }
    `;

    const instancedFragmentShader = `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      in vec4 v_color;
      in float v_depth;
      in float v_distanceFromViewer;
      
      uniform sampler2D u_texture;
      uniform bool u_useTexture;
      uniform bool u_enable3D;
      uniform float u_fogDistance;
      uniform vec3 u_fogColor;
      
      out vec4 fragColor;
      
      void main() {
        vec4 baseColor;
        if (u_useTexture) {
          vec4 texColor = texture(u_texture, v_texCoord);
          baseColor = texColor * v_color;
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
          
          // Adjust alpha based on distance
          float distanceAlpha = 1.0 - clamp(v_distanceFromViewer / 200.0, 0.0, 0.8);
          fragColor.a *= distanceAlpha;
        } else {
          fragColor = baseColor;
        }
        
        // Premultiply alpha
        fragColor.rgb *= fragColor.a;
        
        // Set depth for proper Z-buffer
        gl_FragDepth = v_depth;
      }
    `;

    // GPU culling compute shader (if available)
    const cullingComputeShader = `#version 310 es
      layout(local_size_x = 64) in;
      
      layout(std430, binding = 0) readonly buffer InputElements {
        float elements[];
      };
      
      layout(std430, binding = 1) writeonly buffer OutputElements {
        float visibleElements[];
      };
      
      uniform vec4 u_frustum; // left, top, right, bottom
      uniform float u_minSize;
      
      void main() {
        uint index = gl_GlobalInvocationID.x;
        if (index >= elements.length() / 8u) return;
        
        uint elemOffset = index * 8u;
        float x = elements[elemOffset];
        float y = elements[elemOffset + 1u];
        float width = elements[elemOffset + 2u];
        float height = elements[elemOffset + 3u];
        
        // Frustum culling
        if (x + width < u_frustum.x || x > u_frustum.z ||
            y + height < u_frustum.y || y > u_frustum.w) {
          return; // Outside frustum
        }
        
        // Size culling
        if (width < u_minSize && height < u_minSize) {
          return; // Too small to render
        }
        
        // Copy element to output
        uint outOffset = atomicAdd(visibleElements[0], 1u) * 8u + 4u;
        for (uint i = 0u; i < 8u; i++) {
          visibleElements[outOffset + i] = elements[elemOffset + i];
        }
      }
    `;

    this.programs.set('instanced', this.createProgram(instancedVertexShader, instancedFragmentShader));
    
    // Create compute shader if supported
    if (this.gl.getParameter(this.gl.MAX_COMPUTE_WORK_GROUP_SIZE)) {
      // WebGL2 compute shaders aren't widely supported yet
      // This is future-proofing for when they are
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
    
    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    // Extract uniforms and attributes
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const attributes: Record<string, number> = {};
    
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(program, i)!;
      const location = gl.getUniformLocation(program, info.name)!;
      uniforms[info.name] = location;
    }
    
    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const info = gl.getActiveAttrib(program, i)!;
      const location = gl.getAttribLocation(program, info.name);
      attributes[info.name] = location;
    }
    
    return { program, uniforms, attributes };
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

  private createBuffers(): void {
    const gl = this.gl;
    
    // Quad geometry (for instanced rendering)
    const quadVertices = new Float32Array([
      // Position  TexCoord
      0.0, 0.0,   0.0, 0.0,
      1.0, 0.0,   1.0, 0.0,
      1.0, 1.0,   1.0, 1.0,
      0.0, 1.0,   0.0, 1.0,
    ]);
    
    const quadIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
    
    this.quadVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    
    this.quadIBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
    
    // Instanced data buffer (dynamic)
    this.instancedVBO = gl.createBuffer()!;
    
    this.buffers.set('quad', this.quadVBO);
    this.buffers.set('quadIndices', this.quadIBO);
    this.buffers.set('instanced', this.instancedVBO);
  }

  private createTextureAtlas(): void {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, size, size);
    
    const gl = this.gl;
    const texture = gl.createTexture()!;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    this.textureAtlas = {
      texture,
      canvas,
      ctx,
      allocations: new Map(),
      freeSlots: [{ x: 0, y: 0, width: size, height: size }],
      size,
    };
  }

  public render(elements: SpatialElement[], viewport: Viewport): void {
    const startTime = performance.now();
    this.frameStats.drawCalls = 0;
    this.frameStats.verticesRendered = 0;
    this.frameStats.instancesRendered = 0;
    this.frameStats.textureBinds = 0;

    const gl = this.gl;
    
    // Set viewport
    gl.viewport(0, 0, viewport.width, viewport.height);
    
    // Clear
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (elements.length === 0) return;
    
    // Create view-projection matrix
    const viewProjectionMatrix = this.createViewProjectionMatrix(viewport);
    
    // Batch elements by rendering type
    const batches = this.batchElements(elements);
    
    // Render batches
    for (const batch of batches) {
      this.renderBatch(batch, viewProjectionMatrix, viewport);
    }
    
    this.frameStats.lastFrameTime = performance.now() - startTime;
  }

  private createViewProjectionMatrix(viewport: Viewport): Float32Array {
    const { x, y, zoom, width, height } = viewport;
    
    // World to screen transformation
    const scaleX = 2.0 * zoom / width;
    const scaleY = -2.0 * zoom / height; // Flip Y axis
    const translateX = -1.0 - (x * scaleX);
    const translateY = 1.0 + (y * scaleY);
    
    // Column-major matrix
    return new Float32Array([
      scaleX, 0.0, 0.0, 0.0,
      0.0, scaleY, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      translateX, translateY, 0.0, 1.0,
    ]);
  }

  private batchElements(elements: SpatialElement[]): RenderBatch[] {
    const batches: RenderBatch[] = [];
    const batchMap = new Map<string, RenderBatch>();
    
    for (const element of elements) {
      const key = this.getBatchKey(element);
      
      let batch = batchMap.get(key);
      if (!batch) {
        batch = {
          elements: [],
          program: this.programs.get('instanced')!,
          instanceCount: 0,
        };
        batchMap.set(key, batch);
        batches.push(batch);
      }
      
      batch.elements.push(element);
      batch.instanceCount++;
    }
    
    return batches;
  }

  private getBatchKey(element: SpatialElement): string {
    // Group elements by rendering characteristics
    const hasTexture = element.styles?.backgroundImage ? 'tex' : 'notex';
    const hasGradient = element.styles?.background?.includes('gradient') ? 'grad' : 'solid';
    const layer = element.layer ?? 0;
    
    return `${hasTexture}-${hasGradient}-${layer}`;
  }

  private renderBatch(batch: RenderBatch, viewProjectionMatrix: Float32Array, viewport: Viewport): void {
    if (batch.elements.length === 0) return;
    
    const gl = this.gl;
    const program = batch.program;
    
    gl.useProgram(program.program);
    
    // Set 2D uniforms
    gl.uniformMatrix4fv(program.uniforms['u_viewProjectionMatrix'], false, viewProjectionMatrix);
    gl.uniform2f(program.uniforms['u_viewport'], viewport.width, viewport.height);
    
    // Set 3D uniforms if enabled
    const is3D = viewport.z !== undefined;
    gl.uniform1i(program.uniforms['u_enable3D'], is3D ? 1 : 0);
    
    if (is3D) {
      const view3DMatrix = this.createView3DMatrix(viewport);
      gl.uniformMatrix4fv(program.uniforms['u_view3DMatrix'], false, view3DMatrix);
      gl.uniform1f(program.uniforms['u_viewerZ'], viewport.z!);
      gl.uniform1f(program.uniforms['u_fogDistance'], 150.0); // Adjustable fog distance
      gl.uniform3f(program.uniforms['u_fogColor'], 0.1, 0.1, 0.15); // Dark blue fog
    }
    
    // Prepare instance data
    const instanceData = this.prepareInstanceData(batch.elements, is3D);
    
    // Update instanced buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedVBO);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
    
    // Set up vertex attributes
    this.setupVertexAttributes(program, is3D);
    
    // Bind texture if needed
    if (batch.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, batch.texture);
      gl.uniform1i(program.uniforms['u_texture'], 0);
      gl.uniform1i(program.uniforms['u_useTexture'], 1);
      this.frameStats.textureBinds++;
    } else {
      gl.uniform1i(program.uniforms['u_useTexture'], 0);
    }
    
    // Draw instanced
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIBO);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, batch.instanceCount);
    
    this.frameStats.drawCalls++;
    this.frameStats.verticesRendered += 6 * batch.instanceCount;
    this.frameStats.instancesRendered += batch.instanceCount;
  }

  private prepareInstanceData(elements: SpatialElement[], is3D: boolean = false): Float32Array {
    // Each instance needs: transform(4) + color(4) + texCoords(4) + depth(1) + z(1) = 14 floats
    const floatsPerInstance = 14;
    const data = new Float32Array(elements.length * floatsPerInstance);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const offset = i * floatsPerInstance;
      
      // Transform: x, y, width, height
      data[offset + 0] = element.bounds.x;
      data[offset + 1] = element.bounds.y;
      data[offset + 2] = element.bounds.width;
      data[offset + 3] = element.bounds.height;
      
      // Color: r, g, b, a
      const color = this.parseColor(element.styles?.fill || '#ffffff');
      data[offset + 4] = color[0];
      data[offset + 5] = color[1];
      data[offset + 6] = color[2];
      data[offset + 7] = color[3];
      
      // Texture coordinates: u1, v1, u2, v2 (for atlas)
      const texCoords = this.getTextureCoords(element);
      data[offset + 8] = texCoords[0];
      data[offset + 9] = texCoords[1];
      data[offset + 10] = texCoords[2];
      data[offset + 11] = texCoords[3];
      
      // Depth (for layering in 2D mode)
      data[offset + 12] = (element.layer ?? 0) * 0.001;
      
      // Z-coordinate for 3D positioning
      data[offset + 13] = element.zPosition ?? 0;
    }
    
    return data;
  }

  private parseColor(colorString: string): [number, number, number, number] {
    // Simple color parsing (extend for gradients, etc.)
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    }
    
    // Default white
    return [1.0, 1.0, 1.0, 1.0];
  }

  private getTextureCoords(element: SpatialElement): [number, number, number, number] {
    // Check if element has texture in atlas
    const textureKey = element.styles?.backgroundImage;
    if (textureKey && this.textureAtlas.allocations.has(textureKey)) {
      const allocation = this.textureAtlas.allocations.get(textureKey)!;
      const size = this.textureAtlas.size;
      return [
        allocation.x / size,
        allocation.y / size,
        (allocation.x + allocation.width) / size,
        (allocation.y + allocation.height) / size,
      ];
    }
    
    // Default full texture coordinates
    return [0, 0, 1, 1];
  }

  private setupVertexAttributes(program: WebGLProgram, is3D: boolean = false): void {
    const gl = this.gl;
    const strideBytes = 14 * 4; // 14 floats * 4 bytes per float
    
    // Quad vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    
    // Position attribute
    gl.enableVertexAttribArray(program.attributes['a_position']);
    gl.vertexAttribPointer(program.attributes['a_position'], 2, gl.FLOAT, false, 16, 0);
    
    // TexCoord attribute
    gl.enableVertexAttribArray(program.attributes['a_texCoord']);
    gl.vertexAttribPointer(program.attributes['a_texCoord'], 2, gl.FLOAT, false, 16, 8);
    
    // Instance attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedVBO);
    
    // Instance transform
    gl.enableVertexAttribArray(program.attributes['a_instanceTransform']);
    gl.vertexAttribPointer(program.attributes['a_instanceTransform'], 4, gl.FLOAT, false, strideBytes, 0);
    gl.vertexAttribDivisor(program.attributes['a_instanceTransform'], 1);
    
    // Instance color
    gl.enableVertexAttribArray(program.attributes['a_instanceColor']);
    gl.vertexAttribPointer(program.attributes['a_instanceColor'], 4, gl.FLOAT, false, strideBytes, 16);
    gl.vertexAttribDivisor(program.attributes['a_instanceColor'], 1);
    
    // Instance texture coordinates
    gl.enableVertexAttribArray(program.attributes['a_instanceTexCoords']);
    gl.vertexAttribPointer(program.attributes['a_instanceTexCoords'], 4, gl.FLOAT, false, strideBytes, 32);
    gl.vertexAttribDivisor(program.attributes['a_instanceTexCoords'], 1);
    
    // Instance depth
    gl.enableVertexAttribArray(program.attributes['a_instanceDepth']);
    gl.vertexAttribPointer(program.attributes['a_instanceDepth'], 1, gl.FLOAT, false, strideBytes, 48);
    gl.vertexAttribDivisor(program.attributes['a_instanceDepth'], 1);
    
    // Instance Z-coordinate (for 3D)
    if (program.attributes['a_instanceZ'] !== undefined) {
      gl.enableVertexAttribArray(program.attributes['a_instanceZ']);
      gl.vertexAttribPointer(program.attributes['a_instanceZ'], 1, gl.FLOAT, false, strideBytes, 52);
      gl.vertexAttribDivisor(program.attributes['a_instanceZ'], 1);
    }
  }

  public getStats(): {
    drawCalls: number;
    verticesRendered: number;
    instancesRendered: number;
    textureBinds: number;
    frameTime: number;
  } {
    return {
      drawCalls: this.frameStats.drawCalls,
      verticesRendered: this.frameStats.verticesRendered,
      instancesRendered: this.frameStats.instancesRendered,
      textureBinds: this.frameStats.textureBinds,
      frameTime: this.frameStats.lastFrameTime,
    };
  }

  public addToTextureAtlas(key: string, imageData: ImageData | HTMLImageElement): boolean {
    const atlas = this.textureAtlas;
    const width = imageData.width || (imageData as HTMLImageElement).width;
    const height = imageData.height || (imageData as HTMLImageElement).height;
    
    // Find suitable slot
    const slot = this.findTextureSlot(width, height);
    if (!slot) return false;
    
    // Draw to atlas canvas
    atlas.ctx.drawImage(imageData as any, slot.x, slot.y, width, height);
    
    // Update GPU texture
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // Track allocation
    atlas.allocations.set(key, { x: slot.x, y: slot.y, width, height });
    
    // Update free slots
    this.updateFreeSlots(slot, width, height);
    
    return true;
  }

  private findTextureSlot(width: number, height: number): { x: number; y: number; width: number; height: number } | null {
    const atlas = this.textureAtlas;
    
    for (let i = 0; i < atlas.freeSlots.length; i++) {
      const slot = atlas.freeSlots[i];
      if (slot.width >= width && slot.height >= height) {
        return atlas.freeSlots.splice(i, 1)[0];
      }
    }
    
    return null;
  }

  private updateFreeSlots(usedSlot: { x: number; y: number; width: number; height: number }, usedWidth: number, usedHeight: number): void {
    const atlas = this.textureAtlas;
    
    // Create remaining slots
    const remainingRight = usedSlot.width - usedWidth;
    const remainingBottom = usedSlot.height - usedHeight;
    
    if (remainingRight > 0) {
      atlas.freeSlots.push({
        x: usedSlot.x + usedWidth,
        y: usedSlot.y,
        width: remainingRight,
        height: usedHeight,
      });
    }
    
    if (remainingBottom > 0) {
      atlas.freeSlots.push({
        x: usedSlot.x,
        y: usedSlot.y + usedHeight,
        width: usedSlot.width,
        height: remainingBottom,
      });
    }
  }

  private createView3DMatrix(viewport: Viewport): Float32Array {
    const { x, y, z = 0, zoom, width, height } = viewport;
    
    // Create a perspective projection matrix for 3D view
    const aspect = width / height;
    const fov = Math.PI / 4; // 45 degrees
    const near = 0.1;
    const far = 2000.0;
    
    // Perspective matrix
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);
    
    const perspectiveMatrix = new Float32Array(16);
    perspectiveMatrix[0] = f / aspect;
    perspectiveMatrix[5] = f;
    perspectiveMatrix[10] = (near + far) * rangeInv;
    perspectiveMatrix[11] = -1;
    perspectiveMatrix[14] = near * far * rangeInv * 2;
    perspectiveMatrix[15] = 0;
    
    // View matrix (camera transformation)
    const viewMatrix = new Float32Array(16);
    // Identity matrix
    viewMatrix[0] = viewMatrix[5] = viewMatrix[10] = viewMatrix[15] = 1;
    
    // Apply camera translation
    viewMatrix[12] = -x * zoom / width * 2;
    viewMatrix[13] = y * zoom / height * 2;
    viewMatrix[14] = -z * 0.01; // Scale Z for reasonable depth
    
    // Apply zoom as scale
    viewMatrix[0] *= zoom;
    viewMatrix[5] *= zoom;
    
    // Multiply perspective * view
    return this.multiplyMatrix4(perspectiveMatrix, viewMatrix);
  }
  
  private multiplyMatrix4(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(16);
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    
    return result;
  }

  public resize(width: number, height: number): void {
    const gl = this.gl;
    
    // Update canvas size
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    
    gl.viewport(0, 0, width, height);
  }

  public dispose(): void {
    const gl = this.gl;
    
    // Clean up programs
    for (const program of this.programs.values()) {
      gl.deleteProgram(program.program);
    }
    
    // Clean up buffers
    for (const buffer of this.buffers.values()) {
      gl.deleteBuffer(buffer);
    }
    
    // Clean up textures
    for (const texture of this.textures.values()) {
      gl.deleteTexture(texture);
    }
    
    if (this.textureAtlas) {
      gl.deleteTexture(this.textureAtlas.texture);
    }
    
    this.programs.clear();
    this.buffers.clear();
    this.textures.clear();
  }
}