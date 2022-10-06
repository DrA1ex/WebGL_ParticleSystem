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

const GL = WebGL2RenderingContext;
const CONFIGURATION1 = [
    {
        program: "_shared",
        internal: true,
        buffers: [
            {name: "position1", usageHint: GL.STREAM_DRAW},
            {name: "velocity1", usageHint: GL.STREAM_DRAW},
            {name: "position2", usageHint: GL.STREAM_DRAW},
            {name: "velocity2", usageHint: GL.STREAM_DRAW},
        ],
    },
    {
        program: "render",
        vs: RenderVertexShaderSource,
        fs: RenderFragmentShaderSource,
        attributes: [
            {name: "position"},
            {name: "velocity"}
        ],
        uniforms: [
            {type: "uniform2f", name: "resolution"},
            {type: "uniform1f", name: "point_size"}
        ],
        vertexArrays: [
            {
                name: "particle1", entries: [
                    {name: "position", buffer: "_shared.position1", type: gl.FLOAT, size: 2},
                    {name: "velocity", buffer: "_shared.velocity1", type: gl.FLOAT, size: 2},
                ]
            }, {
                name: "particle2", entries: [
                    {name: "position", buffer: "_shared.position2", type: gl.FLOAT, size: 2},
                    {name: "velocity", buffer: "_shared.velocity2", type: gl.FLOAT, size: 2},
                ]
            },
        ]
    },
    {
        program: "physics",
        vs: PhysicsVertexShaderSource,
        fs: PhysicsFragmentShaderSource,
        tfAttributes: ["next_position", "next_velocity"],
        attributes: [
            {name: "position"},
            {name: "velocity"}
        ],
        uniforms: [
            {name: "g", type: "uniform1f"},
            {name: "resistance", type: "uniform1f"},
            {name: "resolution", type: "uniform2f"},
            {name: "attractor", type: "uniform2f"},
        ],
        vertexArrays: [
            {
                name: "particle1", entries: [
                    {name: "position", buffer: "_shared.position1", type: gl.FLOAT, size: 2},
                    {name: "velocity", buffer: "_shared.velocity1", type: gl.FLOAT, size: 2},
                ]
            }, {
                name: "particle2", entries: [
                    {name: "position", buffer: "_shared.position2", type: gl.FLOAT, size: 2},
                    {name: "velocity", buffer: "_shared.velocity2", type: gl.FLOAT, size: 2},
                ]
            },
        ]
    }
]

const CONFIGURATION2 = [
    {
        program: "physics",
        transformFeedbacks: [
            {name: "particle1", buffers: ["_shared.position1", "_shared.velocity1"]},
            {name: "particle2", buffers: ["_shared.position2", "_shared.velocity2"]},
        ]
    }
]

const TransformState = {};
const State = {};

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
    webglUtils.createFromConfig(gl, CONFIGURATION1, State);

    const velocityInitial = new Float32Array(PARTICLE_CNT * 2);
    const positionInitial = new Float32Array(PARTICLE_CNT * 2);
    for (let i = 0; i < PARTICLE_CNT; i++) {
        positionInitial[i * 2] = Math.random() * CanvasWidth;
        positionInitial[i * 2 + 1] = Math.random() * CanvasHeight;
    }

    webglUtils.loadDataFromConfig(gl, State, [
        {
            program: "render",
            uniforms: [
                {name: "resolution", values: [CanvasWidth, CanvasHeight]},
                {name: "point_size", values: [dpr]}
            ],
        },
        {
            program: "physics",
            uniforms: [
                {name: "resolution", values: [CanvasWidth, CanvasHeight]},
            ]
        },
        {
            program: "_shared",
            linkProgram: "physics",
            buffers: [
                {name: "position1", data: positionInitial},
                {name: "position2", data: positionInitial},
                {name: "velocity1", data: velocityInitial},
                {name: "velocity2", data: velocityInitial},
            ]
        }
    ]);

    webglUtils.createFromConfig(gl, CONFIGURATION2, State);

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
    webglUtils.loadDataFromConfig(gl, State, [
        {
            program: "physics",
            uniforms: [
                {name: "attractor", values: [MousePosition.x, MousePosition.y]},
                {name: "g", values: [G]},
                {name: "resistance", values: [Resistance]}
            ],
        }
    ]);

    // Physics step
    gl.useProgram(State.physics.program);
    gl.bindVertexArray(State.physics.vertexArrays[TransformState.current.read]);

    gl.enable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, State.physics.transformFeedbacks[TransformState.current.write]);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_CNT);
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    gl.disable(gl.RASTERIZER_DISCARD);

    // Draw step
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(State.render.program);
    gl.bindVertexArray(State.render.vertexArrays[TransformState.current.draw]);
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