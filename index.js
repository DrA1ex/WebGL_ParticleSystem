import * as webglUtils from "./webgl_utils.js";

const RenderVertexShaderSource = await fetch("./shaders/render_v.glsl").then(r => r.text());
const RenderFragmentShaderSource = await fetch("./shaders/render_f.glsl").then(r => r.text());

const PhysicsVertexShaderSource = await fetch("./shaders/physics_v.glsl").then(r => r.text());
const PhysicsFragmentShaderSource = await fetch("./shaders/physics_f.glsl").then(r => r.text());

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.orientation !== undefined;

const MOUSE_POINT_RADIUS = ~~params.mouse_size || 3;
const SHOW_MOUSE = params.show_mouse ? Number.parseInt(params.show_mouse) : true;
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

const Programs = {};
const Attributes = {};
const Uniforms = {};
const VertexArrays = {};
const Buffers = {};
const TransformFeedbacks = {};

const TransformState = {};

function init() {
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
    // Rendering
    const renderVertexShader = webglUtils.createShader(gl, gl.VERTEX_SHADER, RenderVertexShaderSource);
    const renderFragmentShader = webglUtils.createShader(gl, gl.FRAGMENT_SHADER, RenderFragmentShaderSource);

    Programs.render = webglUtils.createProgram(gl, renderVertexShader, renderFragmentShader);

    Attributes.render = {
        position: gl.getAttribLocation(Programs.render, "position"),
        velocity: gl.getAttribLocation(Programs.render, "velocity"),
    };

    Uniforms.render = {
        resolution: gl.getUniformLocation(Programs.render, "resolution"),
        pointSize: gl.getUniformLocation(Programs.render, "point_size")
    };

    gl.useProgram(Programs.render);
    gl.uniform2f(Uniforms.render.resolution, CanvasWidth, CanvasHeight);
    gl.uniform1f(Uniforms.render.pointSize, dpr);

    //Physics
    const physicsVertexShader = webglUtils.createShader(gl, gl.VERTEX_SHADER, PhysicsVertexShaderSource);
    const physicsFragmentShader = webglUtils.createShader(gl, gl.FRAGMENT_SHADER, PhysicsFragmentShaderSource);

    Programs.physics = webglUtils.createProgram(
        gl, physicsVertexShader, physicsFragmentShader, ["next_position", "next_velocity"]);

    Attributes.physics = {
        position: gl.getAttribLocation(Programs.physics, "position"),
        velocity: gl.getAttribLocation(Programs.physics, "velocity")
    };

    Buffers.physics = {
        position1: gl.createBuffer(),
        velocity1: gl.createBuffer(),
        position2: gl.createBuffer(),
        velocity2: gl.createBuffer(),
    };

    // Init Data
    const positionInitial = new Float32Array(PARTICLE_CNT * 2);
    for (let i = 0; i < PARTICLE_CNT; i++) {
        positionInitial[i * 2] = Math.random() * CanvasWidth;
        positionInitial[i * 2 + 1] = Math.random() * CanvasHeight;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.physics.position1);
    gl.bufferData(gl.ARRAY_BUFFER, positionInitial, gl.STREAM_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.physics.position2);
    gl.bufferData(gl.ARRAY_BUFFER, positionInitial, gl.STREAM_DRAW);

    const velocityInitial = new Float32Array(PARTICLE_CNT * 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.physics.velocity1);
    gl.bufferData(gl.ARRAY_BUFFER, velocityInitial, gl.STREAM_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.physics.velocity2);
    gl.bufferData(gl.ARRAY_BUFFER, velocityInitial, gl.STREAM_DRAW);

    // Init VAB / TFB

    VertexArrays.physics = {
        particle1: webglUtils.createVertexArray(
            gl, [
                [Attributes.physics.position, Buffers.physics.position1],
                [Attributes.physics.velocity, Buffers.physics.velocity1]
            ], gl.FLOAT, 2
        ),
        particle2: webglUtils.createVertexArray(
            gl, [
                [Attributes.physics.position, Buffers.physics.position2],
                [Attributes.physics.velocity, Buffers.physics.velocity2]
            ], gl.FLOAT, 2
        ),
    };

    VertexArrays.render = {
        particle1: webglUtils.createVertexArray(
            gl, [
                [Attributes.render.position, Buffers.physics.position1],
                [Attributes.render.velocity, Buffers.physics.velocity1]
            ], gl.FLOAT, 2
        ),
        particle2: webglUtils.createVertexArray(
            gl, [
                [Attributes.render.position, Buffers.physics.position2],
                [Attributes.render.velocity, Buffers.physics.velocity2]
            ], gl.FLOAT, 2
        ),
    };

    Uniforms.physics = {
        attractor: gl.getUniformLocation(Programs.physics, "attractor"),
        g: gl.getUniformLocation(Programs.physics, "g"),
        resistance: gl.getUniformLocation(Programs.physics, "resistance"),
        resolution: gl.getUniformLocation(Programs.physics, "resolution"),
    };

    TransformFeedbacks.physics = {
        particle1: webglUtils.createTransformFeedback(gl, Buffers.physics.position1, Buffers.physics.velocity1),
        particle2: webglUtils.createTransformFeedback(gl, Buffers.physics.position2, Buffers.physics.velocity2),
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

    TransformState.current = {
        read: "particle1",
        write: "particle2",
        draw: "particle2",
    };

    TransformState.next = {
        read: "particle2",
        write: "particle1",
        draw: "particle1",
    };

    // Common
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function render() {
    // Physics step
    gl.useProgram(Programs.physics);

    gl.bindVertexArray(VertexArrays.physics[TransformState.current.read]);
    gl.uniform2f(Uniforms.physics.attractor, MousePosition.x, MousePosition.y);
    gl.uniform2f(Uniforms.physics.resolution, CanvasWidth, CanvasHeight);
    gl.uniform1f(Uniforms.physics.g, G);
    gl.uniform1f(Uniforms.physics.resistance, Resistance);

    gl.enable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, TransformFeedbacks.physics[TransformState.current.write]);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    gl.disable(gl.RASTERIZER_DISCARD);

    // Draw step
    gl.useProgram(Programs.render);
    gl.bindVertexArray(VertexArrays.render[TransformState.current.draw]);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);

    const temp = TransformState.current;
    TransformState.current = TransformState.next;
    TransformState.next = temp;

    if (SHOW_MOUSE) {
        ctx.clearRect(0, 0, CanvasWidth, CanvasHeight);
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(MousePosition.x - MOUSE_POINT_RADIUS / 2, MousePosition.y - MOUSE_POINT_RADIUS / 2,
            MOUSE_POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
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