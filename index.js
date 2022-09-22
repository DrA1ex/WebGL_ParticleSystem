const VertexShaderSource = await fetch("./shaders/vertex.glsl").then(r => r.text());
const FragmentShaderSource = await fetch("./shaders/fragment.glsl").then(r => r.text());

import * as webglUtils from "./webgl_utils.js";

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.orientation !== undefined;

const MOUSE_POINT_RADIUS = 3;
const PARTICLE_CNT = ~~params.particle_count || (isMobile ? 100000 : 200000);
const FPS = ~~params.fps || 60;
const G = Number.parseFloat(params.g) || 9;
const Resistance = Number.parseFloat(params.resistance) || 0.99;

const webglCanvas = document.getElementById("webgl");
const canvas = document.getElementById("canvas");

const dpr = window.devicePixelRatio;
const rect = webglCanvas.getBoundingClientRect();

const CanvasWidth = rect.width;
const CanvasHeight = rect.height;

webglCanvas.style.width = CanvasWidth + "px";
webglCanvas.style.height = CanvasHeight + "px";
webglCanvas.width = CanvasWidth * dpr;
webglCanvas.height = CanvasHeight * dpr;

canvas.style.width = CanvasWidth + "px";
canvas.style.height = CanvasHeight + "px";
canvas.width = CanvasWidth * dpr;
canvas.height = CanvasHeight * dpr;

const gl = webglCanvas.getContext("webgl2");
const ctx = canvas.getContext("2d");

const MousePosition = {x: CanvasWidth / 2, y: CanvasHeight / 2};
const Particles = new Array(PARTICLE_CNT);
const ParticlesBuffer = new Float32Array(PARTICLE_CNT * 4);

function syncParticleBuffer(i) {
    ParticlesBuffer[i * 4] = Particles[i].x;
    ParticlesBuffer[i * 4 + 1] = Particles[i].y;
    ParticlesBuffer[i * 4 + 2] = Particles[i].velX;
    ParticlesBuffer[i * 4 + 3] = Particles[i].velY;
}

function init() {
    for (let i = 0; i < PARTICLE_CNT; i++) {
        Particles[i] = {
            x: Math.random() * CanvasWidth,
            y: Math.random() * CanvasHeight,
            velX: 0, velY: 0
        };

        syncParticleBuffer(i);
    }

    webglCanvas.onmousemove = webglCanvas.ontouchmove = (e) => {
        const point = e.touches ? e.touches[0] : e
        const bcr = e.target.getBoundingClientRect();

        MousePosition.x = point.clientX - bcr.x;
        MousePosition.y = point.clientY - bcr.y;

        e.preventDefault();
    }

    ctx.scale(dpr, dpr);
    initGL();
}

function initGL() {
    const vertexShader = webglUtils.createShader(gl, gl.VERTEX_SHADER, VertexShaderSource);
    const fragmentShader = webglUtils.createShader(gl, gl.FRAGMENT_SHADER, FragmentShaderSource);

    const program = webglUtils.createProgram(gl, vertexShader, fragmentShader);

    const positionAttr = webglUtils.createAttribute(gl, program, "a_position");
    webglUtils.createVertexArray(gl, positionAttr, gl.FLOAT, 4);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), CanvasWidth, CanvasHeight);
    gl.uniform1f(gl.getUniformLocation(program, "u_point_size"), dpr);
}

function animateParticle(particle, g, position) {
    const dx = particle.x - position.x,
        dy = particle.y - position.y;

    const distSquare = Math.pow(dx, 2) + Math.pow(dy, 2);

    let force = 0;
    if (distSquare >= 400) // A magic number represent min process distance
    {
        force = -g / distSquare;
    }

    const xForce = dx * force
        , yForce = dy * force;

    particle.velX *= Resistance;
    particle.velY *= Resistance;

    particle.velX += xForce;
    particle.velY += yForce;

    particle.x += particle.velX;
    particle.y += particle.velY;

    if (particle.x > CanvasWidth)
        particle.x -= CanvasWidth;
    else if (particle.x < 0)
        particle.x += CanvasWidth;

    if (particle.y > CanvasHeight)
        particle.y -= CanvasHeight;
    else if (particle.y < 0)
        particle.y += CanvasHeight;
}

function render() {
    for (let i = 0; i < Particles.length; i++) {
        const particle = Particles[i];
        animateParticle(particle, G, MousePosition);

        syncParticleBuffer(i);
    }

    gl.bufferData(gl.ARRAY_BUFFER, ParticlesBuffer, gl.STREAM_DRAW);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);

    ctx.clearRect(0, 0, CanvasWidth, CanvasHeight);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(MousePosition.x - MOUSE_POINT_RADIUS / 2, MousePosition.y - MOUSE_POINT_RADIUS / 2,
        MOUSE_POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
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