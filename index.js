const VertexShaderSource = await fetch("./shaders/vertex.glsl").then(r => r.text());
const FragmentShaderSource = await fetch("./shaders/fragment.glsl").then(r => r.text());

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.orientation !== undefined;

const MOUSE_POINT_RADIUS = 3;
const PARTICLE_CNT = ~~params.particle_count || (isMobile ? 100000 : 200000);
const FPS = ~~params.fps || 60;
const G = Number.parseFloat(params.g) || 9;
const Resistance = Number.parseFloat(params.resistance) || 0.99;

const canvas = document.getElementById("canvas");

const dpr = window.devicePixelRatio;
const rect = canvas.getBoundingClientRect();

const CanvasWidth = rect.width;
const CanvasHeight = rect.height;

canvas.style.width = CanvasWidth + "px";
canvas.style.height = CanvasHeight + "px";
canvas.width = CanvasWidth * dpr;
canvas.height = CanvasHeight * dpr;

const gl = canvas.getContext('webgl2');

const MousePosition = {x: CanvasWidth / 2, y: CanvasHeight / 2};
const ParticlesBuffer = new Float32Array(PARTICLE_CNT * 4);

function storeParticleData(i, x, y, velX, velY) {
    ParticlesBuffer[i * 4] = x;
    ParticlesBuffer[i * 4 + 1] = y;
    ParticlesBuffer[i * 4 + 2] = velX;
    ParticlesBuffer[i * 4 + 3] = velY;
}

function getParticleData(i) {
    const index = i * 4;
    return [ParticlesBuffer[index], ParticlesBuffer[index + 1], ParticlesBuffer[index + 2], ParticlesBuffer[index + 3]];
}

function init() {
    for (let i = 0; i < PARTICLE_CNT; i++) {
        storeParticleData(i, Math.random() * CanvasWidth, Math.random() * CanvasWidth, 0, 0);
    }

    canvas.onmousemove = canvas.ontouchmove = (e) => {
        const point = e.touches ? e.touches[0] : e
        const bcr = e.target.getBoundingClientRect();

        MousePosition.x = point.clientX - bcr.x;
        MousePosition.y = point.clientY - bcr.y;

        e.preventDefault();
    }

    initGL();
}

function initGL() {
    function _createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            console.error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    const vertexShader = _createShader(gl.VERTEX_SHADER, VertexShaderSource);
    const fragmentShader = _createShader(gl.FRAGMENT_SHADER, FragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error(gl.getProgramInfoLog(program));
    }

    const positionAttr = gl.getAttribLocation(program, "a_position");
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, ParticlesBuffer, gl.DYNAMIC_DRAW);

    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), CanvasWidth, CanvasHeight);

    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);
}

function animateParticle(i, g, position) {
    let [x, y, velX, velY] = getParticleData(i);

    const dx = x - position.x,
        dy = y - position.y;

    const distSquare = Math.pow(dx, 2) + Math.pow(dy, 2);

    let force = 0;
    if (distSquare >= 400) // A magic number represent min process distance
    {
        force = -g / distSquare;
    }

    const xForce = dx * force
        , yForce = dy * force;

    velX *= Resistance;
    velY *= Resistance;

    velX += xForce;
    velY += yForce;

    x += velX;
    y += velY;

    if (x > CanvasWidth)
        x -= CanvasWidth;
    else if (x < 0)
        x += CanvasWidth;

    if (y > CanvasHeight)
        y -= CanvasHeight;
    else if (y < 0)
        y += CanvasHeight;

    storeParticleData(i, x, y, velX, velY);
}

function render() {
    for (let i = 0; i < PARTICLE_CNT; i++) {
        animateParticle(i, G, MousePosition);
    }

    gl.bufferData(gl.ARRAY_BUFFER, ParticlesBuffer, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);

    // ctx.fillStyle = "red";
    // ctx.beginPath();
    // ctx.arc(MousePosition.x - MOUSE_POINT_RADIUS / 2, MousePosition.y - MOUSE_POINT_RADIUS / 2,
    //     MOUSE_POINT_RADIUS, 0, Math.PI * 2);
    // ctx.fill();
}

const refreshTime = 1000 / FPS;
let lastStepTime = 0;

function step(timestamp) {
    if (timestamp >= lastStepTime + refreshTime) {
        lastStepTime = timestamp;
        render();
    }

    requestAnimationFrame(step)
}

init();
requestAnimationFrame(step);