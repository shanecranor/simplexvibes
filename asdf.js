// Utility: update display value.
function updateDisplay(id, value) {
  document.getElementById(id).textContent = value
}

// Get canvas and set up WebGL context.
const canvas = document.getElementById("glCanvas")
const gl = canvas.getContext("webgl")
if (!gl) {
  alert("WebGL not supported")
}

// Resize canvas to fit window.
function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
}
window.addEventListener("resize", resizeCanvas)
resizeCanvas()

// Vertex shader: full-screen quad.
const vertexShaderSource = `
  attribute vec2 aPosition;
  varying vec2 vUV;
  void main() {
    vUV = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

// Fragment shader: fractal simplex noise with mod parameter controls.
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uScale;
  uniform float uSpeed;
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uOffsetX;
  uniform float uOffsetY;
  uniform int uOctaves;
  uniform float uPersistence;
  uniform float uLacunarity;
  uniform float uTime;
  uniform float uMod1;
  uniform float uMod2;
  uniform float uBaseMod;
  uniform float uModMult;
  uniform bool uUseColor; // added for color toggle
  varying vec2 vUV;
  
  // For vec3 noise using v3_mod_1 and v3_mod_2.
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / uMod1)) * uMod2;
  }
  // For vec4 noise using uBaseMod and uModMult.
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / uBaseMod)) * (uBaseMod * uModMult);
  }
  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, vec3(C.y)));
    vec3 x0 = v - i + dot(i, vec3(C.x));
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.x;
    vec3 x2 = x0 - i2 + 2.0 * C.x;
    vec3 x3 = x0 - 1.0 + 3.0 * C.x;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.y;
    vec4 y = y_ * ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
  
  // Fractal noise with adjustable persistence and lacunarity.
  float fractalNoise(vec2 pos, float time, int octaves) {
    float total = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      total += amplitude * snoise(vec3(pos * frequency, time));
      maxValue += amplitude;
      amplitude *= uPersistence;
      frequency *= uLacunarity;
    }
    return total / maxValue;
  }
  
  void main() {
    vec2 pos = (gl_FragCoord.xy + vec2(uOffsetX, uOffsetY)) / uScale;
    float n = fractalNoise(pos, uTime * uSpeed, uOctaves);
    float c = n * 0.5 + 0.5;
    c = clamp((c - 0.5) * uContrast + 0.5 + (uBrightness / 255.0), 0.0, 1.0);
    if(uUseColor){
      gl_FragColor = vec4(c, c * 0.5, 1.0 - c, 1.0);
    } else {
      gl_FragColor = vec4(vec3(c), 1.0);
    }
  }
`

// Utility: compile a shader.
function compileShader(source, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile failed with: " + gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

// Create and link our shader program.
const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER)
const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER)
const program = gl.createProgram()
gl.attachShader(program, vertexShader)
gl.attachShader(program, fragmentShader)
gl.linkProgram(program)
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program failed to link: " + gl.getProgramInfoLog(program))
}
gl.useProgram(program)

// Define a full-screen quad.
const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
const vertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
const aPositionLoc = gl.getAttribLocation(program, "aPosition")
gl.enableVertexAttribArray(aPositionLoc)
gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0)

// Get uniform locations.
const uResolutionLoc = gl.getUniformLocation(program, "uResolution")
const uScaleLoc = gl.getUniformLocation(program, "uScale")
const uSpeedLoc = gl.getUniformLocation(program, "uSpeed")
const uBrightnessLoc = gl.getUniformLocation(program, "uBrightness")
const uContrastLoc = gl.getUniformLocation(program, "uContrast")
const uOffsetXLoc = gl.getUniformLocation(program, "uOffsetX")
const uOffsetYLoc = gl.getUniformLocation(program, "uOffsetY")
const uOctavesLoc = gl.getUniformLocation(program, "uOctaves")
const uPersistenceLoc = gl.getUniformLocation(program, "uPersistence")
const uLacunarityLoc = gl.getUniformLocation(program, "uLacunarity")
const uTimeLoc = gl.getUniformLocation(program, "uTime")
const uMod1Loc = gl.getUniformLocation(program, "uMod1")
const uMod2Loc = gl.getUniformLocation(program, "uMod2")
const uBaseModLoc = gl.getUniformLocation(program, "uBaseMod")
const uModMultLoc = gl.getUniformLocation(program, "uModMult")
const uUseColorLoc = gl.getUniformLocation(program, "uUseColor")

// Grab slider elements.
const scaleSlider = document.getElementById("scale")
const speedSlider = document.getElementById("speed")
const brightnessSlider = document.getElementById("brightness")
const contrastSlider = document.getElementById("contrast")
const offsetXSlider = document.getElementById("offsetX")
const offsetYSlider = document.getElementById("offsetY")
const octavesSlider = document.getElementById("octaves")
const persistenceSlider = document.getElementById("persistence")
const lacunaritySlider = document.getElementById("lacunarity")
const mod1Slider = document.getElementById("mod1")
const mod2Slider = document.getElementById("mod2")
const baseModSlider = document.getElementById("baseMod")
const modMultSlider = document.getElementById("modMult")
const colorToggleCheckbox = document.getElementById("colorToggle")
// New fine-tune slider for mod1.
const mod1FineSlider = document.getElementById("mod1Fine")
const mod1FineValue = document.getElementById("mod1FineValue")

// Store parameters.
let params = {
  scale: parseFloat(scaleSlider.value),
  speed: parseFloat(speedSlider.value),
  brightness: parseFloat(brightnessSlider.value),
  contrast: parseFloat(contrastSlider.value),
  offsetX: parseFloat(offsetXSlider.value),
  offsetY: parseFloat(offsetYSlider.value),
  octaves: parseInt(octavesSlider.value),
  persistence: parseFloat(persistenceSlider.value),
  lacunarity: parseFloat(lacunaritySlider.value),
  mod1: parseFloat(mod1Slider.value),
  mod2: parseFloat(mod2Slider.value),
  baseMod: parseFloat(baseModSlider.value),
  modMult: parseFloat(modMultSlider.value),
  colorToggle: colorToggleCheckbox.checked, // added color toggle state
  mod1Fine: parseFloat(mod1FineSlider.value), // new fine adjustment parameter
}

// Update parameters on slider input and update displays.
scaleSlider.addEventListener("input", (e) => {
  params.scale = parseFloat(e.target.value)
  updateDisplay("scaleValue", params.scale)
})
speedSlider.addEventListener("input", (e) => {
  params.speed = parseFloat(e.target.value)
  updateDisplay("speedValue", params.speed)
})
brightnessSlider.addEventListener("input", (e) => {
  params.brightness = parseFloat(e.target.value)
  updateDisplay("brightnessValue", params.brightness)
})
contrastSlider.addEventListener("input", (e) => {
  params.contrast = parseFloat(e.target.value)
  updateDisplay("contrastValue", params.contrast)
})
offsetXSlider.addEventListener("input", (e) => {
  params.offsetX = parseFloat(e.target.value)
  updateDisplay("offsetXValue", params.offsetX)
})
offsetYSlider.addEventListener("input", (e) => {
  params.offsetY = parseFloat(e.target.value)
  updateDisplay("offsetYValue", params.offsetY)
})
octavesSlider.addEventListener("input", (e) => {
  params.octaves = parseInt(e.target.value)
  updateDisplay("octavesValue", params.octaves)
})
persistenceSlider.addEventListener("input", (e) => {
  params.persistence = parseFloat(e.target.value)
  updateDisplay("persistenceValue", params.persistence)
})
lacunaritySlider.addEventListener("input", (e) => {
  params.lacunarity = parseFloat(e.target.value)
  updateDisplay("lacunarityValue", params.lacunarity)
})
mod1Slider.addEventListener("input", (e) => {
  params.mod1 = parseFloat(e.target.value)
  updateDisplay("mod1Value", params.mod1 + params.mod1Fine)
})
mod1FineSlider.addEventListener("input", (e) => {
  params.mod1Fine = parseFloat(e.target.value)
  updateDisplay("mod1Value", params.mod1 + params.mod1Fine)
})
mod2Slider.addEventListener("input", (e) => {
  params.mod2 = parseFloat(e.target.value)
  updateDisplay("mod2Value", params.mod2)
})
baseModSlider.addEventListener("input", (e) => {
  params.baseMod = parseFloat(e.target.value)
  updateDisplay("baseModValue", params.baseMod)
})
modMultSlider.addEventListener("input", (e) => {
  params.modMult = parseFloat(e.target.value)
  updateDisplay("modMultValue", params.modMult)
})
colorToggleCheckbox.addEventListener("change", (e) => {
  params.colorToggle = e.target.checked
  updateDisplay("colorToggleValue", params.colorToggle)
})

// --- Save/Load State from Clipboard ---
const controlsDiv = document.getElementById("controls")

const saveStateButton = document.getElementById("saveState")
// Create Load State button.
const loadStateButton = document.getElementById("loadState")

// Save state to clipboard.
saveStateButton.addEventListener("click", () => {
  const state = {
    scale: params.scale,
    speed: params.speed,
    brightness: params.brightness,
    contrast: params.contrast,
    offsetX: params.offsetX,
    offsetY: params.offsetY,
    octaves: params.octaves,
    persistence: params.persistence,
    lacunarity: params.lacunarity,
    mod1: params.mod1,
    mod2: params.mod2,
    baseMod: params.baseMod,
    modMult: params.modMult,
    colorToggle: params.colorToggle, // added color toggle state
    mod1Fine: params.mod1Fine, // new fine adjustment parameter
  }
  const json = JSON.stringify(state)
  navigator.clipboard
    .writeText(json)
    .then(() => {
      alert("State saved to clipboard.")
    })
    .catch((err) => {
      alert("Failed to save state: " + err)
    })
})

// Load state from clipboard.
loadStateButton.addEventListener("click", () => {
  navigator.clipboard
    .readText()
    .then((text) => {
      try {
        const state = JSON.parse(text)
        // Update slider and checkbox values.
        scaleSlider.value = state.scale
        speedSlider.value = state.speed
        brightnessSlider.value = state.brightness
        contrastSlider.value = state.contrast
        offsetXSlider.value = state.offsetX
        offsetYSlider.value = state.offsetY
        octavesSlider.value = state.octaves
        persistenceSlider.value = state.persistence
        lacunaritySlider.value = state.lacunarity
        mod1Slider.value = state.mod1
        mod2Slider.value = state.mod2
        baseModSlider.value = state.baseMod
        modMultSlider.value = state.modMult
        colorToggleCheckbox.checked = state.colorToggle // update color toggle
        mod1FineSlider.value = state.mod1Fine // new fine adjustment parameter

        // Update parameters.
        params.scale = parseFloat(state.scale)
        params.speed = parseFloat(state.speed)
        params.brightness = parseFloat(state.brightness)
        params.contrast = parseFloat(state.contrast)
        params.offsetX = parseFloat(state.offsetX)
        params.offsetY = parseFloat(state.offsetY)
        params.octaves = parseInt(state.octaves)
        params.persistence = parseFloat(state.persistence)
        params.lacunarity = parseFloat(state.lacunarity)
        params.mod1 = parseFloat(state.mod1)
        params.mod2 = parseFloat(state.mod2)
        params.baseMod = parseFloat(state.baseMod)
        params.modMult = parseFloat(state.modMult)
        params.colorToggle = state.colorToggle // update color toggle
        params.mod1Fine = parseFloat(state.mod1Fine) // new fine adjustment parameter

        // Update displays.
        updateDisplay("scaleValue", state.scale)
        updateDisplay("speedValue", state.speed)
        updateDisplay("brightnessValue", state.brightness)
        updateDisplay("contrastValue", state.contrast)
        updateDisplay("offsetXValue", state.offsetX)
        updateDisplay("offsetYValue", state.offsetY)
        updateDisplay("octavesValue", state.octaves)
        updateDisplay("persistenceValue", state.persistence)
        updateDisplay("lacunarityValue", state.lacunarity)
        updateDisplay("mod1Value", state.mod1)
        updateDisplay("mod2Value", state.mod2)
        updateDisplay("baseModValue", state.baseMod)
        updateDisplay("modMultValue", state.modMult)
        updateDisplay("colorToggleValue", state.colorToggle) // update color toggle display
        updateDisplay("mod1FineValue", state.mod1Fine) // new fine adjustment parameter display

        alert("State loaded from clipboard.")
      } catch (err) {
        alert("Failed to load state: " + err)
      }
    })
    .catch((err) => {
      alert("Failed to read from clipboard: " + err)
    })
})

// --- FPS Counter ---
const fpsCounter = document.getElementById("fpsCounter")
let frameCount = 0
let lastTime = performance.now()
const startTime = performance.now()

// Render loop.
function render() {
  const currentTime = (performance.now() - startTime) / 1000.0
  gl.clear(gl.COLOR_BUFFER_BIT)

  // Pass uniforms.
  gl.uniform2f(uResolutionLoc, canvas.width, canvas.height)
  gl.uniform1f(uScaleLoc, params.scale)
  gl.uniform1f(uSpeedLoc, params.speed)
  gl.uniform1f(uBrightnessLoc, params.brightness)
  gl.uniform1f(uContrastLoc, params.contrast)
  gl.uniform1f(uOffsetXLoc, params.offsetX)
  gl.uniform1f(uOffsetYLoc, params.offsetY)
  gl.uniform1i(uOctavesLoc, params.octaves)
  gl.uniform1f(uPersistenceLoc, params.persistence)
  gl.uniform1f(uLacunarityLoc, params.lacunarity)
  // Update uMod1 by adding the fine adjustment.
  gl.uniform1f(uMod1Loc, params.mod1 + params.mod1Fine)
  gl.uniform1f(uMod2Loc, params.mod2)
  gl.uniform1f(uBaseModLoc, params.baseMod)
  gl.uniform1f(uModMultLoc, params.modMult)
  gl.uniform1i(uUseColorLoc, params.colorToggle ? 1 : 0) // pass color toggle state
  gl.uniform1f(uTimeLoc, currentTime)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  // FPS counter.
  frameCount++
  const now = performance.now()
  const delta = now - lastTime
  if (delta >= 1000) {
    const fps = Math.round((frameCount / delta) * 1000)
    fpsCounter.textContent = "FPS: " + fps
    frameCount = 0
    lastTime = now
  }
  requestAnimationFrame(render)
}
render()
