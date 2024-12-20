
var lightPos = vec3.fromValues(10,10.0,20.0);
var lightColor = vec3.fromValues(1.0,1.0,1.0);

var offset = 0.2;
var outLineColor = vec3.fromValues(0.0,0.0,0.0);
var celColor = vec3.fromValues(1.0,0.6,0.1);
var spherecol = vec3.fromValues(0,0,1);

var planColor = vec3.fromValues(0.9,0.9,0.9);

var canvas = null;
var gl = null;

var vMatrix = mat4.create();
var mMatrix = mat4.create();
var pMatrix = mat4.create();
var nMatrix = mat3.create();

var lightSpaceMatrix = mat4.create();
var lightProjection = mat4.create();
var lightView = mat4.create();

var teapotVertexBuffer = null;
var teapotIndexBuffer = null;
var teapotNormalBuffer = null;
var teapotNumberIndex = 0;

var planVertexBuffer = null;
var planIndexBuffer = null;
var planNormalBuffer = null;
var planNumberIndex = 0;

var prgOutLine = null;
var prgCel = null;
var prgPlan = null;
var prgShadow = null;

var depthMapFrameBuffer = null;
var depthMapRenderBuffer = null;
var depthMapTexture = null;
var shadowWidth = 1024;
var shadowHeight = 1024;

var i = 0;
var numberOfCel = 0;
var activateCelShading = false;
var activateSwapColor = false;


var sphereBuffer;
var sphereIndexBuffer;
var sphereNormalBuffer;

var sphereVertices = [];
var sphereIndices = [];
var sphereNormals = [];

let ani = false;

window.onload = function() {
    canvas = document.getElementById('glcanvas');

    try {
        gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("experimental-webgl", {antialias: true}));
        var uint = gl.getExtension("OES_element_index_uint");
        var depth =  gl.getExtension("WEBGL_depth_texture");
        var displayWidth = document.getElementById('container').clientWidth;
        var displayHeight = document.getElementById('container').clientHeight;

        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewportWidth = displayWidth;
        gl.viewportHeight = displayHeight;
    }
    catch(e) {
    }
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }

    init();

};

function init(){
    initProgramme();
    loadModelAndInitBuffer();
    initMatrix();
    initSphereBuffer();
    tick();
}

function tick() {
    requestAnimFrame(tick);
    resizeCanvas();
    animate();
    drawScene();
}


function initSphere(nslices, nstacks, radius) {
    var theta1, theta2;

    for (var i = 0; i < nslices; i++) {
        sphereVertices.push(0);
        sphereVertices.push(-radius);
        sphereVertices.push(0);
    
        sphereNormals.push(0);
        sphereNormals.push(-1.0);
        sphereNormals.push(0);
    }

    for (var j = 1; j < nstacks - 1; j++) {
        theta1 = (j * Math.PI) / nstacks - Math.PI / 2;  // Change to PI for full sphere
        for (var i = 0; i < nslices; i++) {
            theta2 = (i * 2 * Math.PI) / nslices;
            sphereVertices.push(radius * Math.cos(theta1) * Math.cos(theta2));
            sphereVertices.push(radius * Math.sin(theta1));
            sphereVertices.push(radius * Math.cos(theta1) * Math.sin(theta2));
    
            sphereNormals.push(Math.cos(theta1) * Math.cos(theta2));
            sphereNormals.push(Math.sin(theta1));
            sphereNormals.push(Math.cos(theta1) * Math.sin(theta2));
        }
    }

    for (var i = 0; i < nslices; i++) {
        sphereVertices.push(0);
        sphereVertices.push(radius);
        sphereVertices.push(0);
    
        sphereNormals.push(0);
        sphereNormals.push(1.0);
        sphereNormals.push(0);
    }

    // setup the connectivity and indices
    for (var j = 0; j < nstacks - 1; j++) {
        for (var i = 0; i <= nslices; i++) {
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
    var nstacks = 30; // same as nslices for a better sphere
    var radius = 0.5;
    initSphere(nslices, nstacks, radius);
  
    sphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertices), gl.STATIC_DRAW);
    sphereBuffer.itemSize = 3;
    sphereBuffer.numItems = sphereVertices.length / 3;
  
    sphereNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
    sphereNormalBuffer.itemSize = 3;
    sphereNormalBuffer.numItems = sphereNormals.length / 3;
  
    sphereIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(sphereIndices),
      gl.STATIC_DRAW
    );
    sphereIndexBuffer.itemSize = 1;
    sphereIndexBuffer.numItems = sphereIndices.length;
}

function drawSphere() {
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(prgCel.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
    gl.vertexAttribPointer(prgCel.vertexNormalAttribute, sphereNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);

    gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
    gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
    gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
    gl.uniform3fv(prgCel.lightPosUniform, lightPos);
    gl.uniform3fv(prgCel.lightColorUniform, lightColor);

    gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);
}

// In your main render loop, add this line to draw the spheredrawSphere();



function initProgramme(){

    /*
     * Shadow Programme
     */
    var Svx = getShader("shadow-shader-vs");
    var Sfg = getShader("shadow-shader-fs");

    prgShadow = gl.createProgram();
    gl.attachShader(prgShadow, Svx);
    gl.attachShader(prgShadow, Sfg);
    gl.linkProgram(prgShadow);
    gl.deleteShader(Svx);
    gl.deleteShader(Sfg);

    if (!gl.getProgramParameter(prgShadow, gl.LINK_STATUS)) {
        alert("Could not initialise shaders Shadow");
    }

    prgShadow.vertexPositionAttribute = gl.getAttribLocation(prgShadow, 'aVertexPosition');
    prgShadow.lightSpaceMatrixUniform = gl.getUniformLocation(prgShadow, 'uLightSpaceMatrix');
    prgShadow.mMatrixUniform = gl.getUniformLocation(prgShadow, 'uMMatrix');

    /*
     * Plan Programme
     */
    var Pvx = getShader("plan-shader-vs");
    var Pfg = getShader("plan-shader-fs");

    prgPlan = gl.createProgram();
    gl.attachShader(prgPlan, Pvx);
    gl.attachShader(prgPlan, Pfg);
    gl.linkProgram(prgPlan);
    gl.deleteShader(Pvx);
    gl.deleteShader(Pfg);

    if (!gl.getProgramParameter(prgPlan, gl.LINK_STATUS)) {
        alert("Could not initialise shaders Plan");
    }

    prgPlan.vertexPositionAttribute = gl.getAttribLocation(prgPlan, 'aVertexPosition');
    prgPlan.vertexNormalAttribute = gl.getAttribLocation(prgPlan, 'aVertexNormal');
    prgPlan.pMatrixUniform = gl.getUniformLocation(prgPlan, 'uPMatrix');
    prgPlan.vMatrixUniform = gl.getUniformLocation(prgPlan, 'uVMatrix');
    prgPlan.mMatrixUniform = gl.getUniformLocation(prgPlan, 'uMMatrix');
    prgPlan.nMatrixUniform = gl.getUniformLocation(prgPlan, 'uNMatrix');
    prgPlan.lightSpaceMatrixUniform = gl.getUniformLocation(prgPlan, 'uLightSpaceMatrix');
    prgPlan.viewPositionUniform = gl.getUniformLocation(prgPlan, 'uViewPos');
    prgPlan.lightPosUniform = gl.getUniformLocation(prgPlan, 'uLightPos');
    prgPlan.lightColorUniform = gl.getUniformLocation(prgPlan, 'uLightColor');
    prgPlan.planColorUniform = gl.getUniformLocation(prgPlan, 'uPlanColor');
    prgPlan.samplerShadowMapUniform = gl.getUniformLocation(prgPlan, 'uSamplerShadow');

    /*
     * OutLine Programme
     */
    var Ovx = getShader("outline-shader-vs");
    var Ofg = getShader("outline-shader-fs");

    prgOutLine = gl.createProgram();
    gl.attachShader(prgOutLine, Ovx);
    gl.attachShader(prgOutLine, Ofg);
    gl.linkProgram(prgOutLine);
    gl.deleteShader(Ovx);
    gl.deleteShader(Ofg);

    if (!gl.getProgramParameter(prgOutLine, gl.LINK_STATUS)) {
        alert("Could not initialise shaders Outline");
    }

    prgOutLine.vertexPositionAttribute = gl.getAttribLocation(prgOutLine, 'aVertexPosition');
    prgOutLine.vertexNormalAttribute = gl.getAttribLocation(prgOutLine, 'aVertexNormal');
    prgOutLine.pMatrixUniform = gl.getUniformLocation(prgOutLine, 'uPMatrix');
    prgOutLine.vMatrixUniform = gl.getUniformLocation(prgOutLine, 'uVMatrix');
    prgOutLine.mMatrixUniform = gl.getUniformLocation(prgOutLine, 'uMMatrix');
    prgOutLine.offsetUniform = gl.getUniformLocation(prgOutLine, 'uOffset');
    prgOutLine.outLineColor = gl.getUniformLocation(prgOutLine, 'uOutLineColor');

    /*
     * Cel Programme
     */
    var Cvx = getShader("cel-shader-vs");
    var Cfg = getShader("cel-shader-fs");

    prgCel = gl.createProgram();
    gl.attachShader(prgCel, Cvx);
    gl.attachShader(prgCel, Cfg);
    gl.linkProgram(prgCel);
    gl.deleteShader(Cvx);
    gl.deleteShader(Cfg);

    if (!gl.getProgramParameter(prgCel, gl.LINK_STATUS)) {
        alert("Could not initialise shaders Cel");
    }

    prgCel.vertexPositionAttribute = gl.getAttribLocation(prgCel, 'aVertexPosition');
    prgCel.vertexNormalAttribute = gl.getAttribLocation(prgCel, 'aVertexNormal');
    prgCel.pMatrixUniform = gl.getUniformLocation(prgCel, 'uPMatrix');
    prgCel.vMatrixUniform = gl.getUniformLocation(prgCel, 'uVMatrix');
    prgCel.mMatrixUniform = gl.getUniformLocation(prgCel, 'uMMatrix');
    prgCel.nMatrixUniform = gl.getUniformLocation(prgCel, 'uNMatrix');
    prgCel.lightSpaceMatrixUniform = gl.getUniformLocation(prgCel, 'uLightSpaceMatrix');
    prgCel.viewPositionUniform = gl.getUniformLocation(prgCel, 'uViewPos');
    prgCel.lightPosUniform = gl.getUniformLocation(prgCel, 'uLightPos');
    prgCel.lightColorUniform = gl.getUniformLocation(prgCel, 'uLightColor');
    prgCel.celColorUniform = gl.getUniformLocation(prgCel, 'uCelColor');
    prgCel.samplerShadowMapUniform = gl.getUniformLocation(prgCel, 'uSamplerShadow');
    prgCel.numberCelUniform = gl.getUniformLocation(prgCel, 'uNumberCel');
    prgCel.activateCelUniform = gl.getUniformLocation(prgCel, 'uActivateCel');

    

}

function loadModelAndInitBuffer(){

    var teapot  = "model/teapot.json";
    var request = new XMLHttpRequest();
    //console.info('Requesting ' + teapot);
    request.open("GET", teapot, false);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {

            if (request.status == 404) {
                console.info(teapot + ' does not exist');
            }
            else {

                var teapotObj = JSON.parse(request.responseText);

                teapotNumberIndex = teapotObj.indices.length;

                teapotVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotObj.vertices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                teapotNormalBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotObj.normals), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                teapotIndexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(teapotObj.indices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

            }
        }
    };
    request.send();

    var plan  = "model/plan.json";
    var request = new XMLHttpRequest();
    //console.info('Requesting ' + plan);
    request.open("GET", plan, false);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {

            if (request.status == 404) {
                console.info(plan + ' does not exist');
            }
            else {

                var planObj = JSON.parse(request.responseText);

                planNumberIndex = planObj.indices.length;

                planVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planObj.vertices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                planNormalBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, planNormalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planObj.normals), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                planIndexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(planObj.indices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

            }
        }
    };
    request.send();

    depthMapFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFrameBuffer);

    depthMapRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthMapRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16 , shadowWidth, shadowHeight);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthMapRenderBuffer);

    depthMapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadowWidth, shadowHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthMapTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);

}

function initMatrix(){
    mat4.perspective(pMatrix, degToRad(60),gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);
    mat4.translate(vMatrix, vMatrix, [0.0, -2.0, -40.0]);
    mat4.rotateX(vMatrix, vMatrix, 0.3);

    /*
     * Light Matrix
     */
    mat4.ortho(lightProjection,-30.0,30.0,-30.0,30.0,0.1,100.0);
    mat4.lookAt(lightView,lightPos,[0.0,0.0,0.0],[0.0,1.0,0.0]);
    mat4.multiply(lightSpaceMatrix,lightProjection,lightView);
}

function updateLightSpaceMatrix() {
    mat4.ortho(lightProjection, -30.0, 30.0, -30.0, 30.0, 0.1, 100.0);
    mat4.lookAt(lightView, lightPos, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
    mat4.multiply(lightSpaceMatrix, lightProjection, lightView);
}

// function drawScene() {

//     /*
//      * Shadow Rendering
//      */
//     gl.cullFace(gl.FRONT);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFrameBuffer);
//     gl.useProgram(prgShadow);
//     gl.enableVertexAttribArray(prgShadow.vertexPositionAttribute);

//     gl.viewport(0.0, 0.0, shadowHeight, shadowWidth);
//     gl.clearColor(1.0, 0.0, 0.0, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     gl.uniformMatrix4fv(prgShadow.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     // Render Teapot
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [15, 0, 0]);
//     gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
//     gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

//     // Render Plane
//     mat4.identity(mMatrix);
//     mat4.translate(mMatrix, mMatrix, [0.0, -10.0, 0.0]);
//     gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
//     gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
//     gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, planNumberIndex, gl.UNSIGNED_INT, 0);

//     gl.disableVertexAttribArray(prgShadow.vertexPositionAttribute);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);

//     /*
//      * Teapot Rendering
//      */
//     gl.clearColor(0.2, 0.2, 0.2, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

//     // Render Teapot with Shadows
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [15, 0, 0]);
//     mat3.normalFromMat4(nMatrix, mMatrix);

//     gl.useProgram(prgCel);
//     gl.enableVertexAttribArray(prgCel.vertexPositionAttribute);
//     gl.enableVertexAttribArray(prgCel.vertexNormalAttribute);

//     gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
//     gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix3fv(prgCel.nMatrixUniform, false, nMatrix);
//     gl.uniformMatrix4fv(prgCel.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
//     gl.uniform1i(prgCel.samplerShadowMapUniform, 1);

//     gl.uniform1f(prgCel.numberCelUniform, numberOfCel);
//     gl.uniform1i(prgCel.activateCelUniform, activateCelShading);

//     gl.uniform3fv(prgCel.lightPosUniform, lightPos);
//     gl.uniform3fv(prgCel.lightColorUniform, lightColor);
//     gl.uniform3fv(prgCel.celColorUniform, celColor);
//     gl.uniform3fv(prgCel.viewPositionUniform, [0.0, 0.0, 0.0]);

//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
//     gl.vertexAttribPointer(prgCel.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
//     gl.vertexAttribPointer(prgCel.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

//     // Draw Sphere with Shadows
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [-20, -5, 0]);
//     mat4.scale(mMatrix,mMatrix,[13,13,13]);
//     gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
//     gl.vertexAttribPointer(prgCel.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
//     gl.vertexAttribPointer(prgCel.vertexNormalAttribute, sphereNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
//     gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
//     gl.uniform3fv(prgCel.lightPosUniform, lightPos);
//     gl.uniform3fv(prgCel.lightColorUniform, lightColor);

//     gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);

//     /*
//      * Plan Rendering
//      */
//     gl.useProgram(prgPlan);
//     gl.enableVertexAttribArray(prgPlan.vertexPositionAttribute);
//     gl.enableVertexAttribArray(prgPlan.vertexNormalAttribute);

//     mat4.identity(mMatrix);
//     mat4.translate(mMatrix, mMatrix, [0.0, -10.0, 0.0]);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat3.normalFromMat4(nMatrix, mMatrix);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
//     gl.uniform1i(prgPlan.samplerShadowMapUniform, 1);

//     gl.uniform3fv(prgPlan.planColorUniform, planColor);
//     gl.uniform3fv(prgPlan.lightPosUniform, lightPos);
//     gl.uniform3fv(prgPlan.lightColorUniform, lightColor);
//     gl.uniform3fv(prgPlan.viewPositionUniform, [0.0, 0.0, 0.0]);

//     gl.uniformMatrix4fv(prgPlan.pMatrixUniform, false, pMatrix);
//     gl.uniformMatrix4fv(prgPlan.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgPlan.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix3fv(prgPlan.nMatrixUniform, false, nMatrix);
//     gl.uniformMatrix4fv(prgPlan.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
//     gl.vertexAttribPointer(prgPlan.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, planNormalBuffer);
//     gl.vertexAttribPointer(prgPlan.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, planNumberIndex, gl.UNSIGNED_INT, 0);

//     gl.disableVertexAttribArray(prgPlan.vertexPositionAttribute);
//     gl.disableVertexAttribArray(prgPlan.vertexNormalAttribute);
// }


// c

// function drawScene() {

//     /*
//      * Shadow Rendering
//      */
//     gl.cullFace(gl.FRONT);  // Use front-face culling for shadow pass
//     gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFrameBuffer);
//     gl.useProgram(prgShadow);
//     gl.enableVertexAttribArray(prgShadow.vertexPositionAttribute);

//     gl.viewport(0.0, 0.0, shadowHeight, shadowWidth);
//     gl.clearColor(1.0, 0.0, 0.0, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     gl.uniformMatrix4fv(prgShadow.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     // Render Teapot (for shadow)
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     // mat4.translate(mMatrix, mMatrix, [15, 0, 0]);
//     gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
//     gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

//     // Render Sphere (for shadow)
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [-20, -5, 0]);
//     mat4.scale(mMatrix, mMatrix, [13, 13, 13]);
//     gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
//     gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
//     gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);

//     // Render Plane (for shadow)
//     mat4.identity(mMatrix);
//     mat4.translate(mMatrix, mMatrix, [0.0, -10.0, 0.0]);
//     gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
//     gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
//     gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, planNumberIndex, gl.UNSIGNED_INT, 0);

//     gl.disableVertexAttribArray(prgShadow.vertexPositionAttribute);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);  // Unbind the framebuffer for normal rendering

//     /*
//      * Teapot and Sphere Rendering with Shadows
//      */
//     gl.clearColor(0.2, 0.2, 0.2, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

//     // Render Teapot with Shadows
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [15, 0, 0]);
//     mat3.normalFromMat4(nMatrix, mMatrix);

//     gl.useProgram(prgCel);
//     gl.enableVertexAttribArray(prgCel.vertexPositionAttribute);
//     gl.enableVertexAttribArray(prgCel.vertexNormalAttribute);

//     gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
//     gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix3fv(prgCel.nMatrixUniform, false, nMatrix);
//     gl.uniformMatrix4fv(prgCel.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
//     gl.uniform1i(prgCel.samplerShadowMapUniform, 1);

//     gl.uniform1f(prgCel.numberCelUniform, numberOfCel);
//     gl.uniform1i(prgCel.activateCelUniform, activateCelShading);

//     gl.uniform3fv(prgCel.lightPosUniform, lightPos);
//     gl.uniform3fv(prgCel.lightColorUniform, lightColor);
//     gl.uniform3fv(prgCel.celColorUniform, celColor);
//     gl.uniform3fv(prgCel.viewPositionUniform, [0.0, 0.0, 0.0]);

//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
//     gl.vertexAttribPointer(prgCel.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
//     gl.vertexAttribPointer(prgCel.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

//     // Render Sphere with Shadows
//     mat4.identity(mMatrix);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat4.translate(mMatrix, mMatrix, [-20, -5, 0]);
//     mat4.scale(mMatrix, mMatrix, [13, 13, 13]);
//     mat3.normalFromMat4(nMatrix, mMatrix);

//     gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
//     gl.vertexAttribPointer(prgCel.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
//     gl.vertexAttribPointer(prgCel.vertexNormalAttribute, sphereNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
//     gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
//     gl.uniform3fv(prgCel.lightPosUniform, lightPos);
//     gl.uniform3fv(prgCel.lightColorUniform, lightColor);

//     gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);

//     /*
//      * Plane Rendering
//      */
//     gl.useProgram(prgPlan);
//     gl.enableVertexAttribArray(prgPlan.vertexPositionAttribute);
//     gl.enableVertexAttribArray(prgPlan.vertexNormalAttribute);

//     mat4.identity(mMatrix);
//     mat4.translate(mMatrix, mMatrix, [0.0, -10.0, 0.0]);
//     mat4.rotateY(mMatrix, mMatrix, i * 0.01);
//     mat3.normalFromMat4(nMatrix, mMatrix);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
//     gl.uniform1i(prgPlan.samplerShadowMapUniform, 1);

//     gl.uniform3fv(prgPlan.planColorUniform, planColor);
//     gl.uniform3fv(prgPlan.lightPosUniform, lightPos);
//     gl.uniform3fv(prgPlan.lightColorUniform, lightColor);
//     gl.uniform3fv(prgPlan.viewPositionUniform, [0.0, 0.0, 0.0]);

//     gl.uniformMatrix4fv(prgPlan.pMatrixUniform, false, pMatrix);
//     gl.uniformMatrix4fv(prgPlan.vMatrixUniform, false, vMatrix);
//     gl.uniformMatrix4fv(prgPlan.mMatrixUniform, false, mMatrix);
//     gl.uniformMatrix3fv(prgPlan.nMatrixUniform, false, nMatrix);
//     gl.uniformMatrix4fv(prgPlan.lightSpaceMatrixUniform, false, lightSpaceMatrix);

//     gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
//     gl.vertexAttribPointer(prgPlan.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, planNormalBuffer);
//     gl.vertexAttribPointer(prgPlan.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
//     gl.drawElements(gl.TRIANGLES, planNumberIndex, gl.UNSIGNED_INT,    0);

//     // Disable attributes to avoid errors
//     gl.disableVertexAttribArray(prgPlan.vertexPositionAttribute);
//     gl.disableVertexAttribArray(prgPlan.vertexNormalAttribute);

//     gl.disableVertexAttribArray(prgCel.vertexPositionAttribute);
//     gl.disableVertexAttribArray(prgCel.vertexNormalAttribute);

//     gl.disableVertexAttribArray(prgShadow.vertexPositionAttribute);


// }

function drawScene() {
    /*
     * Shadow Rendering (Excluding the plane)
     */
    gl.cullFace(gl.FRONT);  // Use front-face culling for shadow pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFrameBuffer);
    gl.useProgram(prgShadow);
    gl.enableVertexAttribArray(prgShadow.vertexPositionAttribute);

    gl.viewport(0.0, 0.0, shadowHeight, shadowWidth);
    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(prgShadow.lightSpaceMatrixUniform, false, lightSpaceMatrix);

    // Render Teapot (for shadow)
    mat4.identity(mMatrix);
    mat4.rotateY(mMatrix, mMatrix, i * 0.01);
    mat4.translate(mMatrix, mMatrix, [8, -5, -8]);
    mat4.scale(mMatrix, mMatrix, [0.5, 0.5, 0.5]);
    gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
    gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

    // Render Sphere (for shadow)
    mat4.identity(mMatrix);
    mat4.rotateY(mMatrix, mMatrix, i * 0.01);
    mat4.translate(mMatrix, mMatrix, [-9, -7, 5]);
    mat4.scale(mMatrix, mMatrix, [8, 8, 8]);
    gl.uniformMatrix4fv(prgShadow.mMatrixUniform, false, mMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(prgShadow.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);

    // We do not render the plane here in the shadow pass

    gl.disableVertexAttribArray(prgShadow.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);  // Unbind the framebuffer for normal rendering

    /*
     * Teapot and Sphere Rendering with Shadows
     */
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    // Render Teapot with Shadows
    mat4.identity(mMatrix);
    mat4.rotateY(mMatrix, mMatrix, i * 0.01);
    mat4.translate(mMatrix, mMatrix, [8, -5, -8]);
    mat4.scale(mMatrix, mMatrix, [0.5, 0.5, 0.5]);
    mat3.normalFromMat4(nMatrix, mMatrix);

    gl.useProgram(prgCel);
    gl.enableVertexAttribArray(prgCel.vertexPositionAttribute);
    gl.enableVertexAttribArray(prgCel.vertexNormalAttribute);

    gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
    gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
    gl.uniformMatrix3fv(prgCel.nMatrixUniform, false, nMatrix);
    gl.uniformMatrix4fv(prgCel.lightSpaceMatrixUniform, false, lightSpaceMatrix);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
    gl.uniform1i(prgCel.samplerShadowMapUniform, 1);

    gl.uniform1f(prgCel.numberCelUniform, numberOfCel);
    gl.uniform1i(prgCel.activateCelUniform, activateCelShading);

    gl.uniform3fv(prgCel.lightPosUniform, lightPos);
    gl.uniform3fv(prgCel.lightColorUniform, lightColor);
    gl.uniform3fv(prgCel.celColorUniform, celColor);
    gl.uniform3fv(prgCel.viewPositionUniform, [0.0, 0.0, 0.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.vertexAttribPointer(prgCel.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
    gl.vertexAttribPointer(prgCel.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotIndexBuffer);
    gl.drawElements(gl.TRIANGLES, teapotNumberIndex, gl.UNSIGNED_INT, 0);

    // Render Sphere with Shadows
    mat4.identity(mMatrix);
    mat4.rotateY(mMatrix, mMatrix, i * 0.01);
    mat4.translate(mMatrix, mMatrix, [-9, -7, 5]);
    mat4.scale(mMatrix, mMatrix, [8, 8, 8]);
    mat3.normalFromMat4(nMatrix, mMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(prgCel.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
    gl.vertexAttribPointer(prgCel.vertexNormalAttribute, sphereNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.uniformMatrix4fv(prgCel.mMatrixUniform, false, mMatrix);
    gl.uniformMatrix4fv(prgCel.vMatrixUniform, false, vMatrix);
    gl.uniformMatrix4fv(prgCel.pMatrixUniform, false, pMatrix);
    gl.uniform3fv(prgCel.lightPosUniform, lightPos);
    gl.uniform3fv(prgCel.lightColorUniform, lightColor);

    gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_INT, 0);

    /*
     * Plane Rendering (No shadow calculation for itself)
     */
    gl.useProgram(prgPlan);
    gl.enableVertexAttribArray(prgPlan.vertexPositionAttribute);
    gl.enableVertexAttribArray(prgPlan.vertexNormalAttribute);

    mat4.identity(mMatrix);
    mat4.translate(mMatrix, mMatrix, [0.0, -10.0, 0.0]);
    mat4.rotateY(mMatrix, mMatrix, i * 0.01);
    mat4.scale(mMatrix, mMatrix, [0.5, 0.5, 0.5]);
    mat3.normalFromMat4(nMatrix, mMatrix);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthMapTexture);
    gl.uniform1i(prgPlan.samplerShadowMapUniform, 1);

    gl.uniform3fv(prgPlan.planColorUniform, planColor);
    gl.uniform3fv(prgPlan.lightPosUniform, lightPos);
    gl.uniform3fv(prgPlan.lightColorUniform, lightColor);
    gl.uniform3fv(prgPlan.viewPositionUniform, [0.0, 0.0, 0.0]);

    gl.uniformMatrix4fv(prgPlan.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(prgPlan.vMatrixUniform, false, vMatrix);
    gl.uniformMatrix4fv(prgPlan.mMatrixUniform, false, mMatrix);
    gl.uniformMatrix3fv(prgPlan.nMatrixUniform, false, nMatrix);
    gl.uniformMatrix4fv(prgPlan.lightSpaceMatrixUniform, false, lightSpaceMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, planVertexBuffer);
    gl.vertexAttribPointer(prgPlan.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, planNormalBuffer);
    gl.vertexAttribPointer(prgPlan.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planIndexBuffer);
    gl.drawElements(gl.TRIANGLES, planNumberIndex, gl.UNSIGNED_INT, 0);

    // Disable attributes to avoid errors
    gl.disableVertexAttribArray(prgPlan.vertexPositionAttribute);
    gl.disableVertexAttribArray(prgPlan.vertexNormalAttribute);

    gl.disableVertexAttribArray(prgCel.vertexPositionAttribute);
    gl.disableVertexAttribArray(prgCel.vertexNormalAttribute);

    gl.disableVertexAttribArray(prgShadow.vertexPositionAttribute);
}





function animate() {
    if(ani){
        i += 1;
        if(i == 630){
            i = 0;
        }
    }
   

    if(activateSwapColor){
        var color = HSVtoRGB(i/630.0,0.9,0.9);
        celColor = vec3.fromValues(color.r,color.g,color.b);
    }


}

function updateValue(val) {
    lightPos = vec3.fromValues(10,10,val-30);
    updateLightSpaceMatrix();
    // drawScene();
}

function resizeCanvas() {
    var displayWidth = document.getElementById('container').clientWidth;
    var displayHeight = document.getElementById('container').clientHeight;

    if (gl.viewportWidth != displayWidth || gl.viewportHeight != displayHeight) {
        gl.viewportWidth = displayWidth;
        gl.viewportHeight = displayHeight;
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

function changeCelMode(radio) {
    if (radio.checked) {
        // If it is already checked, uncheck it and set ani to false
        if (ani) {
            radio.checked = false; // Uncheck the radio button
            ani = false; // Update the state
        } else {
            ani = true; // Set to true if it's being checked
        }
    }
}


// function enableSwapColor() {
//     activateSwapColor = activateSwapColor == true ? false : true;
// }
function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}

function getShader(id) {
    var script = document.getElementById(id);
    if (!script) {
        return null;
    }

    var str = "";
    var k = script.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }
    var shader;
    if (script.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (script.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: r,
        g: g ,
        b: b
    };
}

