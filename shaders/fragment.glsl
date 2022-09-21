#version 300 es

precision highp float;

in vec2 a_velocity;
out vec4 outColor;

void main() {
    outColor = vec4(a_velocity * 0.5 + 0.5, 1, 1);
}