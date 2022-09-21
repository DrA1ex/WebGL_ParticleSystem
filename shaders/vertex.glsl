#version 300 es

precision highp float;

uniform vec2 u_resolution;
in vec4 a_position;
out vec2 a_velocity;


void main() {
    vec2 translated_pos = a_position.xy / u_resolution * 2.0 - 1.0;
    gl_Position = vec4(translated_pos * vec2(1, -1.0), 0, 1);
    gl_PointSize = 1.0;
    a_velocity = vec2(a_position.zw);
}