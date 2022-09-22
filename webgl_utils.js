export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        console.error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

export function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error(gl.getProgramInfoLog(program));
    }

    return program;
}

export function createAttribute(gl, program, name) {
    const attr = gl.getAttribLocation(program, name);
    const attrBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer);

    return attr;
}

export function createVertexArray(gl, attribute, type, size, stride = 0, offset = 0) {
    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, type, false, stride, offset);

    return vertexArray;
}