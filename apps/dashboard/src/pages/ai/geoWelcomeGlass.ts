const vertex = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0., 1.);
}
`;

const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float fluteCount;
uniform float phase;
uniform vec3 pointer;

float lightField(vec2 p) {
  float drift = phase * .26;
  float ribbon = cos(p.x * 3.4 + p.y * 2.7 + sin(p.y * 3.8 - drift) * .86 + drift);
  float fold = sin(p.y * 4.6 - p.x * 1.7 + sin(p.x * 2.9 + drift * .8) * .7 - drift);
  return clamp(.49 + ribbon * .29 + fold * .22, 0., 1.);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = min(2.8, resolution.x / resolution.y);
  float flute = fract(uv.x * fluteCount);
  float lens = flute * 2. - 1.;
  // Each flute samples a reversed, curved slice of the moving light field.
  float refraction = lens * inversesqrt(max(.19, 1. - lens * lens));
  float bentX = uv.x - (lens * 1.35 + refraction * 1.72) / fluteCount;
  vec2 p = (vec2(bentX, uv.y) - .5) * vec2(aspect, 1.);

  vec2 delta = (uv - pointer.xy) * vec2(aspect, 1.);
  float stir = pointer.z * exp(-dot(delta, delta) * 9.);
  p += vec2(-delta.y, delta.x) * stir * .28;

  float light = lightField(p);
  float frost = lightField(p + vec2(.037 * lens, .012));
  light = mix(light, frost, .28);

  float rim = pow(abs(lens), 10.);
  float lip = pow(max(0., 1. - abs(flute - .84) * 16.), 2.);
  float relief = .025 * lens + .14 * rim - .09 * lip;

  vec3 royalBlue = vec3(.21, .40, .80);
  vec3 iceBlue = vec3(.62, .81, 1.);
  vec3 tint = mix(royalBlue, iceBlue, smoothstep(.12, .94, light));
  tint = mix(tint, vec3(.95, .98, 1.), lip * (.18 + light * .4));

  // Give the composer and heading a calmer area while keeping the edges visible.
  float center = 1. - smoothstep(.04, .62, length((uv - vec2(.5, .55)) * vec2(1.6, 1.)));
  float opacity = (.15 + (1. - light) * .21 + relief) * (1. - center * .64);
  gl_FragColor = vec4(tint, clamp(opacity, 0., .40));
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function makeProgram(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const program = vs && fs ? gl.createProgram() : null;

  if (program && vs && fs) {
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
  }
  if (vs) gl.deleteShader(vs);
  if (fs) gl.deleteShader(fs);
  if (!program || gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

export function mountGeoWelcomeGlass(canvas: HTMLCanvasElement) {
  const region = canvas.parentElement?.parentElement;
  if (!region || typeof WebGLRenderingContext === "undefined"
    || typeof ResizeObserver === "undefined" || typeof IntersectionObserver === "undefined") return;

  const context = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  if (!context) return;
  const gl = context;

  const program = makeProgram(gl);
  if (!program) return;

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, "resolution");
  const fluteCount = gl.getUniformLocation(program, "fluteCount");
  const phase = gl.getUniformLocation(program, "phase");
  const pointer = gl.getUniformLocation(program, "pointer");

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    const scale = Math.min(1, Math.sqrt(480_000 / Math.max(1, width * height)));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(fluteCount, Math.max(12, Math.min(64, Math.round(width / 22))));
  }

  let targetX = .5, targetY = .5, targetStrength = 0;
  let x = .5, y = .5, strength = 0;
  let frame = 0, last = 0, time = 0;
  let visible = true;
  let lost = false;
  let painted = false;

  function draw(now: number) {
    frame = requestAnimationFrame(draw);
    if (last && now - last < 32) return;
    if (last) time += Math.min(50, now - last) / 1000;
    last = now;
    x += (targetX - x) * .12;
    y += (targetY - y) * .12;
    strength += (targetStrength - strength) * .12;
    gl.uniform1f(phase, time);
    gl.uniform3f(pointer, x, y, strength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!painted) {
      canvas.dataset.rendered = "true";
      painted = true;
    }
  }

  function syncPlayback() {
    if (visible && !lost && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
  }

  function move(event: PointerEvent) {
    if (event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    targetX = (event.clientX - rect.left) / rect.width;
    targetY = 1 - (event.clientY - rect.top) / rect.height;
    targetStrength = 1;
  }

  function leave() { targetStrength = 0; }
  function contextLost() {
    lost = true;
    delete canvas.dataset.rendered;
    syncPlayback();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  });
  intersectionObserver.observe(canvas);
  document.addEventListener("visibilitychange", syncPlayback);
  region.addEventListener("pointermove", move, { passive: true });
  region.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", contextLost);
  syncPlayback();

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", syncPlayback);
    region.removeEventListener("pointermove", move);
    region.removeEventListener("pointerleave", leave);
    canvas.removeEventListener("webglcontextlost", contextLost);
    delete canvas.dataset.rendered;
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
