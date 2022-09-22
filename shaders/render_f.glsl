#version 300 es

precision highp float;

in vec2 color;
out vec4 outColor;

void main() {
    outColor = vec4(color * 0.5 + 0.5, 1, 1);
}