#version 300 es

uniform float g;
uniform float resistance;
uniform vec2 attractor;
uniform vec2 resolution;

in vec2 position;
in vec2 velocity;
out vec2 next_position;
out vec2 next_velocity;

float minDistSquare = 400.0;

void main() {
    float force = 0.0;
    vec2 deltaPos =  position - attractor;

    vec2 squareDelta = deltaPos * deltaPos;
    float distSquare = squareDelta.x + squareDelta.y;
    if (distSquare >= minDistSquare)
    {
        force = -g / distSquare;
    }

    vec2 forceVec = deltaPos * force;

    next_velocity = velocity * vec2(resistance, resistance) + forceVec;
    next_position = position + next_velocity;

    if (next_position.x > resolution.x) {
        next_position.x -= resolution.x;
    } else if (next_position.x < 0.0) {
        next_position.x += resolution.x;
    }

    if (next_position.y > resolution.y) {
        next_position.y -= resolution.y;
    } else if (next_position.y < 0.0){
        next_position.y += resolution.y;
    }
}