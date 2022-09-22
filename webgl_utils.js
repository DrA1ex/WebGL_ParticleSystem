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

export function createProgram(gl, vertexShader, fragmentShader, transformFeedbacks = null) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    if (transformFeedbacks && transformFeedbacks.length > 0) {
        gl.transformFeedbackVaryings(program, transformFeedbacks, gl.SEPARATE_ATTRIBS);
    }

    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error(gl.getProgramInfoLog(program));
    }

    return program;
}

export function createVertexArray(gl, attributePairs, type, size, stride = 0, offset = 0) {
    const vertexArray = gl.createVertexArray();
    for (let i = 0; i < attributePairs.length; i++) {
        const [attribute, buffer] = attributePairs[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bindVertexArray(vertexArray);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, size, type, false, stride, offset);
    }

    return vertexArray;
}

export function createTransformFeedback(gl, ...buffers) {
    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    for (let i = 0; i < buffers.length; i++) {
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, buffers[i]);
    }
    return tf;
}