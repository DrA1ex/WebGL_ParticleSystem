#version 300 es

uniform vec2 resolution;
uniform float point_size;
in vec2 position;
in vec2 velocity;

out vec2 color;

void main() {
    vec2 translated_pos = position / resolution * 2.0 - 1.0;
    gl_Position = vec4(translated_pos * vec2(1, -1.0), 0, 1);
    gl_PointSize = point_size;
    color = velocity;
}