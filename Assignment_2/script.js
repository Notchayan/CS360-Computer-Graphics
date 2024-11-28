var glContext;
var drawingCanvas;

var matrixStackList = [];

var cubeBuffer;
var cubeIndexBuffer;
var cubeNormalBuffer;
var sphereBuffer;
var sphereIndexBuffer;
var sphereNormalBuffer;

var sphereVertices = [];
var sphereIndices = [];
var sphereNormals = [];

var positionAttributeLocation;
var normalAttributeLocation;
var projectionMatrixLocation;
var modelMatrixLocation;
var viewMatrixLocation;
var normalMatrixLocation;


var degree1 = 0.0;
var degree0 = 0.0;
var degree2 = 0.0;
var degree3 = 0.0;
var degree4 = 0.0;
var degree5 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var scene = 0;


var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var uNormalMatrix = mat3.create(); // normal matrix

var lightPosition = [5, 4, 4];
var ambientColor = [1, 1, 1];
var diffuseColor = [1.0, 1.0, 1.0];
var specularColor = [1.0, 1.0, 1.0];

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.0, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];


/////////////////////////////////////
// Flat Shading

// Vertex shader code
const flatVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out mat4 viewMatrix;
out vec3 vPosEyeSpace;

void main() {
    mat4 projectionModelView;
    projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);
    viewMatrix = uVMatrix;
    vPosEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;
}`;

// Fragment shader code
const flatFragShaderCode = `#version 300 es
precision mediump float;
in vec3 vPosEyeSpace;
uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
in mat4 viewMatrix;

out vec4 fragColor;

void main() {
    // Compute face normal and normalize it
    vec3 normal = normalize(cross(dFdx(vPosEyeSpace), dFdy(vPosEyeSpace)));

    // Compute light vector and normalize
    vec3 lightVector = normalize(uLightPosition - vPosEyeSpace);

    // Compute reflection vector and normalize
    vec3 reflectionVector = normalize(-reflect(lightVector, normal));

    // Compute view vector to camera and normalize
    vec3 viewVector = normalize(-vPosEyeSpace);

    // Calculate Phong shading ligting
    float ambient = 0.15;
    float diffuse = max(dot(lightVector, normal), 0.0);
    float specular = pow(max(dot(reflectionVector, viewVector), 0.0), 32.0);

    // Combine the terms to get the final colour
    vec3 light_color = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;


    fragColor = vec4(light_color, 1.0);
}`;


/////////////////////////////////////
// Gouraud Shading

// Vertex shader code
const perVertVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 fColor;

uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;

void main() {
    // Transform vertex position to eye space
    vec3 posEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

    // Transform vertex normal and normalize
    vec3 normalEyeSpace = normalize((transpose(inverse(mat3(uVMatrix * uMMatrix)))) * aNormal);

    // Compute light vector and normalize
    vec3 L = normalize(uLightPosition - posEyeSpace);

    vec3 V = normalize(-posEyeSpace);

    // Compute Phong shading
    float diffuse = max(dot(normalEyeSpace, L), 0.0);
    float specular = pow(max(dot(-reflect(L, normalEyeSpace), V), 0.0), 32.0);
    float ambient = 0.15;
    fColor = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;

    // Calculate final vertex position in clip space
    gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
}`;

// Fragment shader code
const perVertFragShaderCode = `#version 300 es
precision mediump float;
in vec3 fColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(fColor, 1.0);
}`;


/////////////////////////////////////
// Phong Shading

// Vertex shader code
const perFragVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 vPosEyeSpace;
out vec3 normalEyeSpace;

out vec3 L;
out vec3 V;

uniform vec3 uLightPosition;

void main() {
    // Transform vertex position to eye space
    vPosEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

    // Transform vertex normal and normalize
    normalEyeSpace = normalize(mat3(uVMatrix * uMMatrix) * aNormal);

    // Compute light vector and normalize
    L = normalize(uLightPosition - vPosEyeSpace);

    V = normalize(-vPosEyeSpace);

    // Calculate final vertex position in clip space
    gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
}`;

// Fragment shader code
const perFragFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 normalEyeSpace;
in vec3 L;
in vec3 V;
in vec3 vPosEyeSpace;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;

void main() {

    vec3 normal = normalEyeSpace;
    vec3 lightVector = L;
    vec3 viewVector = V;

    // Calculate reflection direction
    vec3 reflectionVector = normalize(-reflect(lightVector, normal));

    // Compute Phong shading
    float diffuse = max(dot(normal, lightVector), 0.0);
    float specular = pow(max(dot(reflectionVector, viewVector), 0.0), 32.0);
    float ambient = 0.15;
    vec3 fColor = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;
    fragColor = vec4(fColor, 1.0);
}`;


function vertexShaderSetup(vertexShaderCode) {
    shader = glContext.createShader(glContext.VERTEX_SHADER);
    glContext.shaderSource(shader, vertexShaderCode);
    glContext.compileShader(shader);
    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        alert(glContext.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = glContext.createShader(glContext.FRAGMENT_SHADER);
    glContext.shaderSource(shader, fragShaderCode);
    glContext.compileShader(shader);
    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        alert(glContext.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {
    shaderProgram = glContext.createProgram();

    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);

    glContext.attachShader(shaderProgram, vertexShader);
    glContext.attachShader(shaderProgram, fragmentShader);
    glContext.linkProgram(shaderProgram);

    if (!glContext.getProgramParameter(shaderProgram, glContext.LINK_STATUS)) {
        console.log(glContext.getShaderInfoLog(vertexShader));
        console.log(glContext.getShaderInfoLog(fragmentShader));
    }

    glContext.useProgram(shaderProgram);

    return shaderProgram;
}

function initGL(canvas) {
    try {
        glContext = canvas.getContext("webgl2");
        glContext.viewportWidth = canvas.width; 
        glContext.viewportHeight = canvas.height; 
    } catch (e) {}
    if (!glContext) {
        alert("WebGL initialization failed");
    }
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function pushMatrix(stack, m) {
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}


function initSphere(nslices, nstacks, radius) {
    var theta1, theta2;
  
    for (i = 0; i < nslices; i++) {
        sphereVertices.push(0);
        sphereVertices.push(-radius);
        sphereVertices.push(0);
    
        sphereNormals.push(0);
        sphereNormals.push(-1.0);
        sphereNormals.push(0);
    }
  
    for (j = 1; j < nstacks - 1; j++) {
        theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
        for (i = 0; i < nslices; i++) {
            theta2 = (i * 2 * Math.PI) / nslices;
            sphereVertices.push(radius * Math.cos(theta1) * Math.cos(theta2));
            sphereVertices.push(radius * Math.sin(theta1));
            sphereVertices.push(radius * Math.cos(theta1) * Math.sin(theta2));
    
            sphereNormals.push(Math.cos(theta1) * Math.cos(theta2));
            sphereNormals.push(Math.sin(theta1));
            sphereNormals.push(Math.cos(theta1) * Math.sin(theta2));
        }
    }
  
    for (i = 0; i < nslices; i++) {
        sphereVertices.push(0);
        sphereVertices.push(radius);
        sphereVertices.push(0);
    
        sphereNormals.push(0);
        sphereNormals.push(1.0);
        sphereNormals.push(0);
    }
  
    // setup the connectivity and indices
    for (j = 0; j < nstacks - 1; j++) {
        for (i = 0; i <= nslices; i++) {
            var mi = i % nslices;
            var mi2 = (i + 1) % nslices;
            var idx = (j + 1) * nslices + mi;
            var idx2 = j * nslices + mi;
            var idx3 = j * nslices + mi2;
            var idx4 = (j + 1) * nslices + mi;
            var idx5 = j * nslices + mi2;
            var idx6 = (j + 1) * nslices + mi2;
    
            sphereIndices.push(idx);
            sphereIndices.push(idx2);
            sphereIndices.push(idx3);
            sphereIndices.push(idx4);
            sphereIndices.push(idx5);
            sphereIndices.push(idx6);
        }
    }
}
  
function initSphereBuffer() {
    var nslices = 30; // use even number
    var nstacks = nslices / 2 + 1;
    var radius = 0.5;
    initSphere(nslices, nstacks, radius);
  
    sphereBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, sphereBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(sphereVertices), glContext.STATIC_DRAW);
    sphereBuffer.itemSize = 3;
    sphereBuffer.numItems = nslices * nstacks;
  
    sphereNormalBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, sphereNormalBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(sphereNormals), glContext.STATIC_DRAW);
    sphereNormalBuffer.itemSize = 3;
    sphereNormalBuffer.numItems = nslices * nstacks;
  
    sphereIndexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    glContext.bufferData(
      glContext.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(sphereIndices),
      glContext.STATIC_DRAW
    );
    sphereIndexBuffer.itemsize = 1;
    sphereIndexBuffer.numItems = (nstacks - 1) * 6 * (nslices + 1);
}

function drawSphere() {
    // bind the vertex buffer
    glContext.bindBuffer(glContext.ARRAY_BUFFER, sphereBuffer);
    glContext.vertexAttribPointer(positionAttributeLocation, sphereBuffer.itemSize, glContext.FLOAT, false, 0, 0);

    // bind the normal buffer
    glContext.bindBuffer(glContext.ARRAY_BUFFER, sphereNormalBuffer);
    glContext.vertexAttribPointer(normalAttributeLocation, sphereNormalBuffer.itemSize, glContext.FLOAT, false, 0, 0);

    // bind the index buffer
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);

    glContext.uniformMatrix4fv(modelMatrixLocation, false, mMatrix);
    glContext.uniformMatrix4fv(viewMatrixLocation, false, vMatrix);
    glContext.uniformMatrix4fv(projectionMatrixLocation, false, pMatrix);
    glContext.uniform3fv(uLightPositionLocation, lightPosition);
    glContext.uniform3fv(uAmbientColorLocation, ambientColor);
    glContext.uniform3fv(uDiffuseColorLocation, diffuseColor);
    glContext.uniform3fv(uSpecularColorLocation, specularColor);


    // draw the sphere
    glContext.drawElements(glContext.TRIANGLES, sphereIndexBuffer.numItems, glContext.UNSIGNED_INT, 0);
}

// Cube generation function with normals
function initCubeBuffer() {
    var vertices = [
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
    ];
    cubeBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, cubeBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STATIC_DRAW);
    cubeBuffer.itemSize = 3;
    cubeBuffer.numItems = vertices.length / 3;
  
    var normals = [
        // Front face
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        // Back face
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
        // Top face
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
        // Bottom face
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
        // Right face
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        // Left face
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
    ];
    cubeNormalBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, cubeNormalBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(normals), glContext.STATIC_DRAW);
    cubeNormalBuffer.itemSize = 3;
    cubeNormalBuffer.numItems = normals.length / 3;
  
  
    var indices = [
      0,
      1,
      2,
      0,
      2,
      3, // Front face
      4,
      5,
      6,
      4,
      6,
      7, // Back face
      8,
      9,
      10,
      8,
      10,
      11, // Top face
      12,
      13,
      14,
      12,
      14,
      15, // Bottom face
      16,
      17,
      18,
      16,
      18,
      19, // Right face
      20,
      21,
      22,
      20,
      22,
      23, // Left face
    ];
    cubeIndexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    glContext.bufferData(
        glContext.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        glContext.STATIC_DRAW
    );
    cubeIndexBuffer.itemSize = 1;
    cubeIndexBuffer.numItems = indices.length;
}

function drawCube() {
    glContext.bindBuffer(glContext.ARRAY_BUFFER, cubeBuffer);
    glContext.vertexAttribPointer(
        positionAttributeLocation,
        cubeBuffer.itemSize,
        glContext.FLOAT,
        false,
        0,
        0
    );
        
    // draw normal buffer
    glContext.bindBuffer(glContext.ARRAY_BUFFER, cubeNormalBuffer);
    glContext.vertexAttribPointer(
        normalAttributeLocation,
        cubeNormalBuffer.itemSize,
        glContext.FLOAT,
        false,
        0,
        0
    );

    // draw elementary arrays - triangle indices
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

    // gl.uniform4fv(uColorLocation, color);
    glContext.uniformMatrix4fv(modelMatrixLocation, false, mMatrix);
    glContext.uniformMatrix4fv(viewMatrixLocation, false, vMatrix);
    glContext.uniformMatrix4fv(projectionMatrixLocation, false, pMatrix);
    glContext.uniform3fv(uLightPositionLocation, lightPosition);
    glContext.uniform3fv(uAmbientColorLocation, ambientColor);
    glContext.uniform3fv(uDiffuseColorLocation, diffuseColor);
    glContext.uniform3fv(uSpecularColorLocation, specularColor);

    glContext.drawElements(glContext.TRIANGLES, cubeIndexBuffer.numItems, glContext.UNSIGNED_SHORT, 0);
}

//////////////////////////////////////////////////////////////////////

function drawScene1() {
    // Set up view and projection matrices
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    // Set up model matrix
    mat4.identity(mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.5, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.2, [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.1, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.1, 1.1, 1.1]);
    mMatrix = mat4.translate(mMatrix, [0, -0.1, 0]);

    // Draw sphere
    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.501, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4999, 0.4999, 0.4999]);
    diffuseColor = [0.008, 0.518, 0.733];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);

    // Draw cube
    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.125, 0]);
    mMatrix = mat4.scale(mMatrix, [0.445, 0.755, 0.51]);
    diffuseColor = [0.698, 0.690, 0.490];
    drawCube();
    mMatrix = popMatrix(matrixStackList);
}

function drawScene2() {
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    mat4.identity(mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree2), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree3), [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.06, [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [0.96, 0.96, 0.96]);

    drawSphereAt([0, -0.44, 0.11], [0.68, 0.68, 0.68], [0.781, 0.781, 0.781]);
    drawCubeAt([-0.35, -0.04, 0.11], [0.4, 0.4, 0.4], [0.014, 0.528, 0.018], 
        [1, 0, 0], 0.51, [0, 0, 1], -0.44, [0, 1, 0], -0.49);
    
    drawSphereAt([-0.17, 0.25, 0.26], [0.39, 0.39, 0.39], [0.74, 0.74, 0.74]);
    
    drawCubeAt([0.105, 0.42, 0.31], [0.25, 0.25, 0.25], [0.01, 0.53, 0.01], 
        [1, 0, 0], 0.51, [0, 0, 1], 0.51, [0, 1, 0], 0.21);
    
    drawSphereAt([-0.01, 0.61, 0.41], [0.24, 0.24, 0.24], [0.74, 0.74, 0.74]);
}
function drawSphereAt(position, scale, color) {
    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, position);
    mMatrix = mat4.scale(mMatrix, scale);
    diffuseColor = color;
    drawSphere();
    mMatrix = popMatrix(matrixStackList);
}

function drawCubeAt(position, scale, color, rotateAxis1, angle1, rotateAxis2, angle2, rotateAxis3, angle3) {
    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, position);
    mMatrix = mat4.scale(mMatrix, scale);
    mMatrix = mat4.rotate(mMatrix, angle1, rotateAxis1);
    mMatrix = mat4.rotate(mMatrix, angle2, rotateAxis2);
    mMatrix = mat4.rotate(mMatrix, angle3, rotateAxis3);
    diffuseColor = color;
    drawCube();
    mMatrix = popMatrix(matrixStackList);
}

function drawScene3() {
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
    
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.11, 1000, pMatrix);

    mat4.identity(mMatrix);

    // First Sphere
    mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.01, -0.59, 0.11]);
    // mMatrix = mat4.scale(mMatrix, [0.41, 0.41, 0.41]);
    // diffuseColor = [0, 0.7, 0.15];
    // drawSphere();
    // mMatrix = popMatrix(matrixStackList);

    // First Cube
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.02, -0.37, 0.11]);
    // mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    // mMatrix = mat4.rotate(mMatrix, -0.59, [0, 0, 1]);
    // mMatrix = mat4.rotate(mMatrix, 0.11, [0, 1, 0]);
    // mMatrix = mat4.rotate(mMatrix, -0.09, [1, 0, 0]);
    // mMatrix = mat4.scale(mMatrix, [1.36, 0.04, 0.26]);
    // diffuseColor = [0.94, 0.05, 0.08];
    // drawCube();
    // mMatrix = popMatrix(matrixStackList);

    // Second Sphere
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [-0.34, -0.20, 0.41]);
    // mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    // diffuseColor = [0.27, 0.28, 0.54];
    // drawSphere();
    // mMatrix = popMatrix(matrixStackList);

    // Third Sphere
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.36, -0.20, -0.19]);
    // mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    // diffuseColor = [0.11, 0.33, 0.31];
    // drawSphere();
    // mMatrix = popMatrix(matrixStackList);

    // Second Cube
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [-0.34, -0.06, 0.46]);
    // mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    // mMatrix = mat4.rotate(mMatrix, -1.44, [0, 0, 1]);
    // mMatrix = mat4.rotate(mMatrix, 0.61, [0, 1, 0]);
    // mMatrix = mat4.rotate(mMatrix, 0.11, [1, 0, 0]);
    // mMatrix = mat4.scale(mMatrix, [0.61, 0.04, 0.31]);
    // diffuseColor = [0.71, 0.61, 0.01];
    // drawCube();
    // mMatrix = popMatrix(matrixStackList);

    // Fourth Cube
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.36, -0.06, -0.19]);
    // mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    // mMatrix = mat4.rotate(mMatrix, -1.44, [0, 0, 1]);
    // mMatrix = mat4.rotate(mMatrix, 0.61, [0, 1, 0]);
    // mMatrix = mat4.rotate(mMatrix, 0.11, [1, 0, 0]);
    // mMatrix = mat4.scale(mMatrix, [0.61, 0.04, 0.31]);
    // diffuseColor = [0.19, 0.63, 0.01];
    // drawCube();
    // mMatrix = popMatrix(matrixStackList);

    // Fifth Sphere
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [-0.34, 0.11, 0.41]);
    // mMatrix = mat4.scale(mMatrix, [0.31, 0.31, 0.31]);
    // diffuseColor = [0.70, 0.01, 0.70];
    // drawSphere();
    // mMatrix = popMatrix(matrixStackList);

    // Sixth Sphere
    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.36, 0.11, -0.19]);
    // mMatrix = mat4.scale(mMatrix, [0.32, 0.32, 0.32]);
    // diffuseColor = [0.66, 0.48, 0.13];
    // drawSphere();
    // mMatrix = popMatrix(matrixStackList);


    // pushMatrix(matrixStackList, mMatrix);
    // mMatrix = mat4.translate(mMatrix, [0.010, 0.29, 0.11]);
    // mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    // mMatrix = mat4.rotate(mMatrix, -0.59, [0, 0, 1]);
    // mMatrix = mat4.rotate(mMatrix, 0.11, [0, 1, 0]);
    // mMatrix = mat4.rotate(mMatrix, -0.09, [1, 0, 0]);
    // mMatrix = mat4.scale(mMatrix, [1.36, 0.04, 0.26]);
    // diffuseColor = [0.94, 0.05, 0.08];
    // drawCube();
    // mMatrix = popMatrix(matrixStackList);

    mMatrix = mat4.translate(mMatrix, [0, -0.05, 0]);
    mMatrix = mat4.scale(mMatrix, [0.9, 0.9, 0.9]);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5,0.5, 0.5]);
    diffuseColor = [0, 0.8, 0];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);


     pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.3, 0.05]);
    mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -0.59, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.11, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, -0.09, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [1.36, 0.04, 0.26]);
    diffuseColor = [0.94, 0.05, 0.08];
    drawCube();
    mMatrix = popMatrix(matrixStackList);


    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.34, -0.15, 0.4]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    diffuseColor = [0.27, 0.28, 0.54];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.34, -0.13, -0.17]);
    mMatrix = mat4.scale(mMatrix, [0.31, 0.31, 0.31]);
    diffuseColor = [0.0, 0.2, 0.8];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.32, -0.01, 0.45]);
    mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -1.44, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.45, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.20, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.91, 0.04, 0.31]);
    diffuseColor = [0.8, 0.8, 0.01];
    drawCube();
    mMatrix = popMatrix(matrixStackList);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.36, 0.05, -0.16]);
    mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -1.44, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.45, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.21, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.91, 0.04, 0.31]);
    diffuseColor = [0.25, 1.0, 0.8];
    drawCube();
    mMatrix = popMatrix(matrixStackList);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.32, 0.16, 0.49]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    diffuseColor = [0.8, 0.0, 1.0];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);

    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.36, 0.21, -0.1]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    diffuseColor = [1.0, 0.24, 0.1];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);


    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.0, 0.345, 0.28]);
    mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -0.55, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.11, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, -0.08, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [1.36, 0.04, 0.26]);
    diffuseColor = [0.94, 0.05, 0.08];
    drawCube();
    mMatrix = popMatrix(matrixStackList);



    pushMatrix(matrixStackList, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.60, 0.3]);
    mMatrix = mat4.scale(mMatrix, [0.5,0.5, 0.5]);
    diffuseColor = [1.0, 0.75, 1.0];
    drawSphere();
    mMatrix = popMatrix(matrixStackList);


}


function drawScene() {
    
    // You need to enable scissor_test to be able to use multiple viewports
    glContext.enable(glContext.SCISSOR_TEST);

    // Now define 3 different viewport areas for drawing

    ////////////////////////////////////////
    // Left viewport area
    shaderProgram = flatShaderProgram;
    glContext.useProgram(shaderProgram);

    glContext.viewport(0, 0, 400, 400);
    glContext.scissor(0, 0, 400, 400);

    glContext.clearColor(0.85, 0.85, 0.95, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    positionAttributeLocation = glContext.getAttribLocation(shaderProgram, "aPosition");
    normalAttributeLocation = glContext.getAttribLocation(shaderProgram, "aNormal"); 
    modelMatrixLocation = glContext.getUniformLocation(shaderProgram, "uMMatrix");
    viewMatrixLocation = glContext.getUniformLocation(shaderProgram, "uVMatrix");
    projectionMatrixLocation = glContext.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = glContext.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = glContext.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = glContext.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = glContext.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    glContext.enableVertexAttribArray(positionAttributeLocation);
    glContext.enableVertexAttribArray(normalAttributeLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    glContext.enable(glContext.DEPTH_TEST);
    drawScene1();

    ////////////////////////////////////////
    // Mid viewport area
    shaderProgram = perVertShaderProgram;
    glContext.useProgram(shaderProgram);

    glContext.viewport(400, 0, 400, 400);
    glContext.scissor(400, 0, 400, 400);

    glContext.clearColor(0.95, 0.85, 0.85, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    positionAttributeLocation = glContext.getAttribLocation(shaderProgram, "aPosition");
    normalAttributeLocation = glContext.getAttribLocation(shaderProgram, "aNormal"); 
    modelMatrixLocation = glContext.getUniformLocation(shaderProgram, "uMMatrix");
    viewMatrixLocation = glContext.getUniformLocation(shaderProgram, "uVMatrix");
    projectionMatrixLocation = glContext.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = glContext.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = glContext.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = glContext.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = glContext.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    glContext.enableVertexAttribArray(positionAttributeLocation);
    glContext.enableVertexAttribArray(normalAttributeLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    glContext.enable(glContext.DEPTH_TEST);
    drawScene2();


    ////////////////////////////////////////
    // Right viewport area
    shaderProgram = perFragShaderProgram;
    glContext.useProgram(shaderProgram);

    glContext.viewport(800, 0, 400, 400);
    glContext.scissor(800, 0, 400, 400);

    glContext.clearColor(0.85, 0.95, 0.85, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    positionAttributeLocation = glContext.getAttribLocation(shaderProgram, "aPosition");
    normalAttributeLocation = glContext.getAttribLocation(shaderProgram, "aNormal"); 
    modelMatrixLocation = glContext.getUniformLocation(shaderProgram, "uMMatrix");
    viewMatrixLocation = glContext.getUniformLocation(shaderProgram, "uVMatrix");
    projectionMatrixLocation = glContext.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = glContext.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = glContext.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = glContext.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = glContext.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    glContext.enableVertexAttribArray(positionAttributeLocation);
    glContext.enableVertexAttribArray(normalAttributeLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    glContext.enable(glContext.DEPTH_TEST);
    drawScene3();
};


function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);

    // Get the mouse position relative to the canvas
    const rect = drawingCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Adjusted for canvas position
    const mouseY = rect.bottom - event.clientY; // Adjusted Y for top-down to bottom-up

    if (mouseX >= 0 && mouseX <= drawingCanvas.width && mouseY >= 0 && mouseY <= drawingCanvas.height) {
        prevMouseX = mouseX;
        prevMouseY = mouseY;

        // Check which scene the mouse is interacting with based on X coordinates
        const yLim = prevMouseY <= 300 && prevMouseY >= -100; // Within viewport height range

        if (prevMouseX >= 0 && prevMouseX < 400 && yLim) {
            scene = 1; // Left viewport
        } else if (prevMouseX >= 400 && prevMouseX < 800 && yLim) {
            scene = 2; // Middle viewport
        } else if (prevMouseX >= 800 && prevMouseX < 1200 && yLim) {
            scene = 3; // Right viewport
        }
    }
}

function onMouseMove(event) {
    // Get the current mouse position relative to the canvas
    const rect = drawingCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = rect.bottom - event.clientY;

    const diffX1 = mouseX - prevMouseX;
    const diffY2 = mouseY - prevMouseY;
    
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    console.log(mouseX, mouseY);

    // Check mouse within Y-limit (ensure it's within the viewport height)
    const yLim = mouseY <= 300 && mouseY >= -100;

    // Adjust rotation based on the current scene
    if (mouseX >= 0 && mouseX < 400 && yLim && scene == 1) {
        degree0 = degree0 + diffX1 / 5;
        degree1 = degree1 - diffY2 / 5;
    } else if (mouseX >= 400 && mouseX < 800 && yLim && scene == 2) {
        degree2 = degree2 + diffX1 / 5;
        degree3 = degree3 - diffY2 / 5;
    } else if (mouseX >= 800 && mouseX < 1200 && yLim && scene == 3) {
        degree4 = degree4 + diffX1 / 5;
        degree5 = degree5 - diffY2 / 5;
    }
    drawScene(); // Redraw the scene with updated rotations
}


function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}


// This is the entry point from the html
function webGLStart() {
    drawingCanvas = document.getElementById("assn2");
    document.addEventListener("mousedown", onMouseDown, false);

    // Get the light slider element
    let autoMove = false;
    let lightPos = parseFloat(document.getElementById("light-slider").value);
    let moveSpeed = 0.05;
    let autoMoveInterval;
    
    // Function to update the light position based on the slider value
    function updateLightPosition() {
        const lightSlider = document.getElementById('light-slider');
        lightPos = parseFloat(lightSlider.value);
        // Update the WebGL light position using lightPos
        lightPosition = [lightPos, 3.0, 4.0]; // Adjust according to your needs
        drawScene(); // Redraw the scene
    }
    
    // Function to auto-move the lights
    function autoMoveLights() {
        const slider = document.getElementById("light-slider");
        if (autoMove) {
            lightPos += moveSpeed;
            if (lightPos > 15.0 || lightPos < -15.0) moveSpeed = -moveSpeed;
            slider.value = lightPos.toFixed(2);
            updateLightPosition();
        }
    }
    
    // Function to toggle automatic light movement
    function toggleAutoMove() {
        autoMove = !autoMove;
        const btn = document.getElementById("auto-move-btn");
        if (autoMove) {
            btn.innerHTML = "Stop Auto Move";
            autoMoveInterval = setInterval(autoMoveLights, 1000 / 60); // 60 FPS
        } else {
            btn.innerHTML = "Auto Move Lights";
            clearInterval(autoMoveInterval);
        }
    }
    
    // Initialize the slider event listener
    document.getElementById("light-slider").addEventListener("input", updateLightPosition);
    
    // Get the camera slider element
    const cameraSlider = document.getElementById('camera-slider');

    // Initialize camera position
    let cameraZ = parseFloat(cameraSlider.value);

    // Update camera position when the slider changes
    cameraSlider.addEventListener('input', (event) => {
        cameraZ = parseFloat(event.target.value);
        eyePos = [0.0, 0.0, cameraZ];

         // Redraw the scene
        drawScene();
    });

    // initialize WebGL
    initGL(drawingCanvas);

    // initialize shader program
    flatShaderProgram = initShaders(flatVertexShaderCode, flatFragShaderCode);
    perVertShaderProgram = initShaders(perVertVertexShaderCode, perVertFragShaderCode);
    perFragShaderProgram = initShaders(perFragVertexShaderCode, perFragFragShaderCode);

    drawScene();
}

// 
