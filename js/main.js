(function () {
    var canvas = document.getElementById('canv')
    var gl = canvas.getContext("webgl2")

    var extensions = gl.getSupportedExtensions();
    console.log(extensions)

    var ext = gl.getExtension('EXT_color_buffer_float');

    // SHADERS
    var basePassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER, basePassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, 
            basePassFragmentShaderHeaderSource + 
            tracingShaderCode + 
            basePassFragmentShaderFooterSource));

    var presentPassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER, presentPassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, 
            presentPassFragmentShaderHeaderSource +
            presentPassFragmentShaderFooterSource));

    // FRAME BUFFERS
    var albedoBuffer = createColourTexture(gl, canvas.width, canvas.height)
    var normalBuffer = createColourTexture(gl, canvas.width, canvas.height)
    var uvBuffer     = createColourTexture(gl, canvas.width, canvas.height)
    var basePassFrameBuffer = createFramebuffer(gl, 
        albedoBuffer, 
        normalBuffer,
        uvBuffer)

    var presentPassAlbedoSampler = gl.getUniformLocation(presentPassShaderProgram, "AlbedoBuffer");
    var presentPassNormalSampler = gl.getUniformLocation(presentPassShaderProgram, "NormalBuffer");
    var presentPassUVSampler     = gl.getUniformLocation(presentPassShaderProgram, "UVBuffer");

    // TEXTURES
    var PerlinNoiseTexture = loadTexture(gl, 'images/noise/simplex.png')
    var WhiteNoiseTexture = loadTexture(gl, 'images/noise/white.png')
    var BlueNoiseTexture = loadTexture(gl, 'images/noise/blue.png')
    var MandlebrotTexture0 = loadTexture(gl, 'images/fractals/brot_3.png')

    var WoodAlbedoTexture = loadTexture(gl, 'images/wood/wood_albedo.jpg')
    var WoodNormalTexture = loadTexture(gl, 'images/wood/wood_normal.jpg')

    var ConcreteAlbedoTexture = loadTexture(gl, 'images/concrete/concrete_albedo.jpg')
    var ConcreteNormalTexture = loadTexture(gl, 'images/concrete/concrete_normal.jpg')

    var FabricAlbedoTexture = loadTexture(gl, 'images/fabric/fabric_albedo.jpg')
    var FabricNormalTexture = loadTexture(gl, 'images/fabric/fabric_normal.jpg')

    var GoldAlbedoTexture = loadTexture(gl, 'images/gold/gold_albedo.jpg')
    var GoldNormalTexture = loadTexture(gl, 'images/gold/gold_normal.jpg')
    var GoldAlphaTexture = loadTexture(gl, 'images/gold/gold_alpha.jpg')

    var SkyDomeTexture = loadTexture(gl, 'images/skydome.jpg')

    var basePassPerlinNoiseSampler = gl.getUniformLocation(basePassShaderProgram, "perlinNoiseSampler");
    var basePassWhiteNoiseSampler  = gl.getUniformLocation(basePassShaderProgram, "whiteNoiseSampler");
    var basePassBlueNoiseSampler   = gl.getUniformLocation(basePassShaderProgram, "blueNoiseSampler");
    var basePassBrotSampler   = gl.getUniformLocation(basePassShaderProgram, "brot0Sampler");

    var basePassWoodAlbedoSampler = gl.getUniformLocation(basePassShaderProgram, "WoodAlbedoSampler")
    var basePassWoodNormalSampler = gl.getUniformLocation(basePassShaderProgram, "WoodNormalSampler")

    var basePassConcreteAlbedoSampler = gl.getUniformLocation(basePassShaderProgram, "ConcreteAlbedoSampler")
    var basePassConcreteNormalSampler = gl.getUniformLocation(basePassShaderProgram, "ConcreteNormalSampler")

    var basePassFabricAlbedoSampler = gl.getUniformLocation(basePassShaderProgram, "FabricAlbedoSampler")
    var basePassFabricNormalSampler = gl.getUniformLocation(basePassShaderProgram, "FabricNormalSampler")

    var basePassGoldAlbedoSampler = gl.getUniformLocation(basePassShaderProgram, "GoldAlbedoSampler")
    var basePassGoldNormalSampler = gl.getUniformLocation(basePassShaderProgram, "GoldNormalSampler")
    var basePassGoldAlphaSampler = gl.getUniformLocation(basePassShaderProgram,  "GoldAlphaSampler")

    var basePassSkyDomeSampler = gl.getUniformLocation(basePassShaderProgram, "SkyDomeSampler");

    // SCREEN PASS GEOMETRY
    var screenGeometryPositions = new Float32Array([
        -1.0, -1.0, 
         1.0, -1.0, 
         1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
        -1.0,  1.0]);
        
    var screenGeometryUVs = new Float32Array([
        0.0, 1.0, 
        1.0, 1.0, 
        1.0, 0.0,
        1.0, 0.0, 
        0.0, 1.0, 
        0.0, 0.0]);

    var screenGeometryVertexArray = gl.createVertexArray();
    gl.bindVertexArray(screenGeometryVertexArray);
    var screenGeometryPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenGeometryPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, screenGeometryPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    var screenGeometryUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenGeometryUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, screenGeometryUVs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    // SCENE GEOMETRY
    // SCENE GEOMETRY
    var SpherePositions = [ 
        0.0, 1.1,  0.0,
        0.0, 0.0,  0.0
   ]
   var SphereColours = [ 
       1.0, 1.0, 1.0, 1.0,
       1.0, 1.0, 1.0, 1.6
   ]
   var SphereSizes = [ 
       1.0,
       100.0
   ]
   var SphereMaterials = [
       // diffuse   reflective    alpha mask   // texture index
       0.8,         0.0,          1.0,         3.0,
       1.0,         0.0,          0.0,         0.0
   ]

   var BoxPositions = [
       0.0, 7.8, 3.0,  // floor
       -4.1, 3.9, 0.0,  // floor
       0.0, 3.9, 4.0,  // floor
       0.0, 0.0, 0.0,  // floor
       4.1, 3.9, 0.0,  // floor
       0.0, 7.8, -3.0,  // floor
       3.0, 7.8, 0.0,
       -3.0, 7.8, 0.0,
        0.0, 0.1, 0.0,  // floor  
        0.0, 3.9, -4.0,  // floor  
   ]
   var BoxColours = [
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
       0.5, 0.5, 0.5, 0.0, // floor
   ]
   var BoxSizes = [
       4.0, 0.1, 1.0, // floor
       0.1, 4.0, 4.0, // floor
       4.0, 4.0, 0.1, // floor
       4.0, 0.1, 4.0, // floor
       0.1, 4.0, 4.0, // floor
       4.0, 0.1, 1.0, // floor
       1.0, 0.1, 2.0, // floor
       1.0, 0.1, 2.0, // floor
       3.0, 0.025, 3.0, // floor
       4.0, 4.0, 0.1, // floor
   ]
   var BoxMaterials = [
       // diffuse   reflective    alpha mask  texture index
       1.0,         0.0,          0.0,        0.0,
       1.0,         0.0,          0.0,        0.0, 
       0.0,         0.4,          0.0,        3.0, 
       1.0,         0.0,          0.0,        1.0, 
       1.0,         0.0,          0.0,        0.0, 
       1.0,         0.0,          0.0,        0.0, 
       1.0,         0.0,          0.0,        0.0, 
       1.0,         0.0,          0.0,        0.0, 
       1.0,         0.0,          0.0,        4.0,
       1.0,         0.0,          0.0,        0.0, 
   ]

   var TriangleVertexPositions = [
        1.0, 2.0, -1.0,
       -1.0, 2.0, -1.0,
        0.0, 3.8,  0.0,

       -1.0, 2.0,  1.0,
        1.0, 2.0,  1.0,
        0.0, 3.8,  0.0,

       -1.0, 2.0, -1.0,
       -1.0, 2.0,  1.0,
        0.0, 3.8,  0.0,

        1.0, 2.0,  1.0,
        1.0, 2.0, -1.0,
        0.0, 3.8,  0.0,


        -1.0, 2.0, -1.0,
         1.0, 2.0, -1.0,
         0.0, 0.2,  0.0,

         1.0, 2.0,  1.0,
        -1.0, 2.0,  1.0,
         0.0, 0.2,  0.0,

        -1.0, 2.0,  1.0,
        -1.0, 2.0, -1.0,
         0.0, 0.2,  0.0,
 
         1.0, 2.0, -1.0,
         1.0, 2.0,  1.0,
         0.0, 0.2,  0.0
   ]

   var CylinderPositions = [
        0.0, 0.0, 0.0
   ]

   var CylinderSizes = [
        0.5, 3.0, 0.5
   ]

   var CylinderColours = [
        0.5, 0.5, 0.5, 1.0
   ]
   
   var CylinderMaterials = [ 
        1.0, 0.0, 0.0, 0.0
   ]

   var AreaLightPositions = [
       0.0, 8.0, 0.0,
       0.0, 1.0, 0.0
   ]
   var AreaLightRotations = [
       0.0, 0.0, 0.0,
       0.0, 0.0, -0.6
   ]
   var AreaLightNormals = [
       0.0, -1.0,  0.0,
       0.0, -1.0,  0.0
   ]
   var AreaLightTangents = [
       0.0,  0.0, -1.0,
       0.0,  0.0, -1.0
   ]
   var AreaLightColours = [
       6.0, 6.0, 6.0, 2.0, // light
       0.3, 0.0, 0.0, 2.0  // light
   ]
   var AreaLightSizes = [
       6.0, 6.0, // light
       10.0, 2.0  // light
   ]
   var AreaLightMaterials = [
       // diffuse   reflective    alpha mask
       1.0,         0.0,          0.0,       0.0,
       1.0,         0.0,          0.0,       0.0
   ]

    var basePassSpherePositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SpherePositions")
    var basePassSphereColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SphereColours")
    var basePassSphereSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SphereSizes")
    var basePassSphereMaterialsUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SphereMaterials")

    var basePassBoxPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxPositions")
    var basePassBoxColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxColours")
    var basePassBoxSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxSizes")
    var basePassBoxMaterialsUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxMaterials")

    var basePassCylinderPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CylinderPositions")
    var basePassCylinderColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CylinderColours")
    var basePassCylinderSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CylinderSizes")
    var basePassCylinderMaterialsUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CylinderMaterials")

    var basePassTriangleVertexPositionsUniformLoc = gl.getUniformLocation(basePassShaderProgram, "TriangleVertexPositions")

    var basePassAreaLightPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram,  "AreaLightPositions")
    var basePassAreaLightNormalUniformLoc = gl.getUniformLocation(basePassShaderProgram,    "AreaLightNormals")
    var basePassAreaLightTangentUniformLoc = gl.getUniformLocation(basePassShaderProgram,   "AreaLightTangents")
    var basePassAreaLightColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram,   "AreaLightColours")
    var basePassAreaLightSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram,     "AreaLightSizes")
    var basePassAreaLightMaterialsUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AreaLightMaterials")

    var basePassWidthUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Width")
    var basePassHeightUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Height")
    var basePassTimeUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Time")
    var basePassCameraPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraPosition")
    var basePassCameraLookUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraLook")
    var basePassCameraLeftUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraLeft")

    var presentPassTimeUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "Time")

    // CAMERA
            CameraPosition = new vec3(0.0, 3.5, -3.0)
            CameraRotation = new vec3(0.1, 0.0, 0.0)
    var CameraLook     = new vec3( 0.0, 0.0, 1.0 )
    var CameraLeft     = new vec3(-1.0, 0.0, 0.0 )

    var CameraVelocity = new vec3(0.0, 0.0, 0.0);
    var CameraAngularVelocity = new vec3(0.0, 0.0, 0.0)

    var LastCameraPosition = new vec3(-1, -1, -1)
    var LastCameraLook = new vec3(-1, -1, -1)
    var ViewTransformHasChanged = true;

    var frameID = 0;

    // RENDER PASSES
    function BasePass () {
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, basePassFrameBuffer);

        if (ViewTransformHasChanged)
        {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            frameID = 1;
        }

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE)

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0, 
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2]);
        gl.useProgram(basePassShaderProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, PerlinNoiseTexture);
        gl.uniform1i(basePassPerlinNoiseSampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, WhiteNoiseTexture);
        gl.uniform1i(basePassWhiteNoiseSampler, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, BlueNoiseTexture);
        gl.uniform1i(basePassBlueNoiseSampler, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, MandlebrotTexture0);
        gl.uniform1i(basePassBrotSampler, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, ConcreteAlbedoTexture);
        gl.uniform1i(basePassConcreteAlbedoSampler, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, ConcreteNormalTexture);
        gl.uniform1i(basePassConcreteNormalSampler, 5);

        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, WoodAlbedoTexture);
        gl.uniform1i(basePassWoodAlbedoSampler, 6);

        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, WoodNormalTexture);
        gl.uniform1i(basePassWoodNormalSampler, 7);

        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, FabricAlbedoTexture);
        gl.uniform1i(basePassFabricAlbedoSampler, 8);

        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, FabricNormalTexture);
        gl.uniform1i(basePassFabricNormalSampler, 9);

        gl.activeTexture(gl.TEXTURE10);
        gl.bindTexture(gl.TEXTURE_2D, GoldAlbedoTexture);
        gl.uniform1i(basePassGoldAlbedoSampler, 10);

        gl.activeTexture(gl.TEXTURE11);
        gl.bindTexture(gl.TEXTURE_2D, GoldNormalTexture);
        gl.uniform1i(basePassGoldNormalSampler, 11);

        gl.activeTexture(gl.TEXTURE12);
        gl.bindTexture(gl.TEXTURE_2D, GoldAlphaTexture);
        gl.uniform1i(basePassGoldAlphaSampler, 12);

        gl.uniform3fv(basePassSpherePositionUniformLoc, SpherePositions)
        gl.uniform4fv(basePassSphereColoursUniformLoc, SphereColours)
        gl.uniform1fv(basePassSphereSizesUniformLoc, SphereSizes)
        gl.uniform4fv(basePassSphereMaterialsUniformLoc, SphereMaterials)

        gl.uniform3fv(basePassBoxPositionUniformLoc, BoxPositions)
        gl.uniform4fv(basePassBoxColoursUniformLoc, BoxColours)
        gl.uniform3fv(basePassBoxSizesUniformLoc, BoxSizes)
        gl.uniform4fv(basePassBoxMaterialsUniformLoc, BoxMaterials)

        gl.uniform3fv(basePassCylinderPositionUniformLoc, CylinderPositions)
        gl.uniform4fv(basePassCylinderColoursUniformLoc, CylinderColours)
        gl.uniform3fv(basePassCylinderSizesUniformLoc, CylinderSizes)
        gl.uniform4fv(basePassCylinderMaterialsUniformLoc, CylinderMaterials)

        gl.uniform3fv(basePassTriangleVertexPositionsUniformLoc, TriangleVertexPositions)

        gl.uniform3fv(basePassAreaLightPositionUniformLoc, AreaLightPositions)
        gl.uniform3fv(basePassAreaLightNormalUniformLoc,   AreaLightNormals)
        gl.uniform3fv(basePassAreaLightTangentUniformLoc,  AreaLightTangents)
        gl.uniform4fv(basePassAreaLightColoursUniformLoc,  AreaLightColours)
        gl.uniform2fv(basePassAreaLightSizesUniformLoc,    AreaLightSizes)
        gl.uniform4fv(basePassAreaLightMaterialsUniformLoc, AreaLightMaterials)

        gl.uniform1f (basePassWidthUniformLoc, canvas.clientWidth)
        gl.uniform1f (basePassHeightUniformLoc, canvas.clientHeight)
        gl.uniform1f (basePassTimeUniformLoc, frameID)
        gl.uniform3fv(basePassCameraPositionUniformLoc, CameraPosition.array())
        gl.uniform3fv(basePassCameraLookUniformLoc, CameraLook.array())
        gl.uniform3fv(basePassCameraLeftUniformLoc, CameraLeft.array())

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function PresentPass () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(presentPassShaderProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, albedoBuffer);
        gl.uniform1i(presentPassAlbedoSampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalBuffer);
        gl.uniform1i(presentPassNormalSampler, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, uvBuffer);
        gl.uniform1i(presentPassUVSampler, 2);

        gl.uniform1f (presentPassTimeUniformLoc, frameID)

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function Render () {
        BasePass();
        PresentPass();
    }

    function Loop () {
        frameID++

        PollInput();
        DoMovement();

        if (ImagesLoaded.every(v => v))
        {
            Render();
        }

        requestAnimationFrame(Loop)
    }


    // INPUT
    var APressed = false;
    var DPressed = false;
    var WPressed = false;
    var SPressed = false;
    var QPressed = false;
    var EPressed = false;

    var LeftArrowPressed = false;
    var RightArrowPressed = false;

    var UpArrowPressed = false;
    var DownArrowPressed = false;

    var SpacePressed = false;

    function PollInput() {
        var moveSpeed = 0.005
        var lookSpeed = 0.002
        if (APressed) CameraVelocity = CameraVelocity.add(CameraLeft.multiply(new vec3(moveSpeed, moveSpeed, moveSpeed)));
        if (DPressed) CameraVelocity = CameraVelocity.minus(CameraLeft.multiply(new vec3(moveSpeed, moveSpeed, moveSpeed)));
        if (SPressed) CameraVelocity = CameraVelocity.minus(CameraLook.multiply(new vec3(moveSpeed, moveSpeed, moveSpeed)));
        if (WPressed) CameraVelocity = CameraVelocity.add(CameraLook.multiply(new vec3(moveSpeed, moveSpeed, moveSpeed)));
        if (QPressed) CameraVelocity.y -= moveSpeed
        if (EPressed) CameraVelocity.y += moveSpeed
        if (RightArrowPressed) CameraAngularVelocity.y += lookSpeed
        if (LeftArrowPressed) CameraAngularVelocity.y -= lookSpeed
        if (UpArrowPressed) CameraAngularVelocity.x -= lookSpeed
        if (DownArrowPressed) CameraAngularVelocity.x += lookSpeed
    }

    function DoMovement() {

        // ROTATE AREA LIGHTS
        for (var i = 0; i < AreaLightRotations.length / 3; ++i)
        {
            var NewAreaLightNormal = new mat3().rotation(
                new vec3(0.0, -1.0, 0.0),
                AreaLightRotations[(i * 3) + 0],
                AreaLightRotations[(i * 3) + 1],
                AreaLightRotations[(i * 3) + 2])
                .normalized()
            var NewAreaLightTangent = new mat3().rotation(
                new vec3(0.0, 0.0, -1.0),
                AreaLightRotations[(i * 3) + 0],
                AreaLightRotations[(i * 3) + 1],
                AreaLightRotations[(i * 3) + 2])
                .normalized()
            AreaLightNormals[(i * 3) + 0] = NewAreaLightNormal.x
            AreaLightNormals[(i * 3) + 1] = NewAreaLightNormal.y
            AreaLightNormals[(i * 3) + 2] = NewAreaLightNormal.z
            AreaLightTangents[(i * 3) + 0] = NewAreaLightTangent.x
            AreaLightTangents[(i * 3) + 1] = NewAreaLightTangent.y
            AreaLightTangents[(i * 3) + 2] = NewAreaLightTangent.z
        }

        // CAMERA
        CameraPosition = CameraPosition.add(CameraVelocity);
        CameraRotation = CameraRotation.add(CameraAngularVelocity);

        CameraLook = new mat3().rotation(
            new vec3(0.0, 0.0, 1.0),
            CameraRotation.x, 
            CameraRotation.y, 
            CameraRotation.z)
            .normalized()

        CameraLeft = new mat3().rotation(
            new vec3(-1.0, 0.0, 0.0),
            CameraRotation.x, 
            CameraRotation.y, 
            CameraRotation.z)
            .normalized()

        var Dampening = 0.9
        CameraVelocity = CameraVelocity.multiply(new vec3(Dampening, Dampening, Dampening));
        CameraAngularVelocity = CameraAngularVelocity.multiply(new vec3(Dampening, Dampening, Dampening))

        if (CameraVelocity.length() < 0.00001) CameraVelocity = new vec3(0.0, 0.0, 0.0)
        if (CameraAngularVelocity.length() < 0.00001) CameraAngularVelocity = new vec3(0.0, 0.0, 0.0)

        if (CameraPosition.x != LastCameraPosition.x || 
            CameraPosition.y != LastCameraPosition.y || 
            CameraPosition.z != LastCameraPosition.z ||
            CameraLook.x     != LastCameraLook.x     || 
            CameraLook.y     != LastCameraLook.y     || 
            CameraLook.z     != LastCameraLook.z)
        {
            ViewTransformHasChanged = true
        }
        else
        {
            ViewTransformHasChanged = false
        }

        LastCameraPosition = CameraPosition
        LastCameraLook = CameraLook

        document.cookie = "LastCameraX="     + CameraPosition.x;
        document.cookie = "LastCameraY="     + CameraPosition.y;
        document.cookie = "LastCameraZ="     + CameraPosition.z;
        document.cookie = "LastCameraRotationX=" + CameraRotation.x;
        document.cookie = "LastCameraRotationY=" + CameraRotation.y;
        document.cookie = "LastCameraRotationZ=" + CameraRotation.z;
    }

    document.addEventListener('keyup', function(event)
    {
        if (event.key == 'a')
            APressed = false;
        else if(event.key == 'd')
            DPressed = false
        else if(event.key == 's')
            SPressed = false
        else if(event.key == 'w')
            WPressed = false
        else if(event.key == 'q')
            QPressed = false
        else if(event.key == 'e')
            EPressed = false;

        if (event.key == 'ArrowLeft')
            LeftArrowPressed = false
        if (event.key == 'ArrowRight')
            RightArrowPressed = false
        if (event.key == 'ArrowUp')
            UpArrowPressed = false
        if (event.key == 'ArrowDown')
            DownArrowPressed = false

        if (event.key == ' ')
        {
            rec.stop()
        }
    })

    document.addEventListener('keydown', function(event) {
        if (event.key == 'a')
            APressed = true
        else if(event.key == 'd') 
            DPressed = true
        else if(event.key == 's') 
            SPressed = true
        else if(event.key == 'w') 
            WPressed = true
        else if(event.key == 'q') 
            QPressed = true
        else if(event.key == 'e') 
            EPressed = true

        if (event.key == '1')
            Viewmode = 1;
        else if (event.key == '2')
            Viewmode = 2;
        else if (event.key == '3')
            Viewmode = 3;
        else if (event.key == '4')
            Viewmode = 4;
        else if (event.key == '5')
            Viewmode = 5;
        else if (event.key == '6')
            Viewmode = 6;

        if (event.key == 'r')
        {
            CameraPosition = new vec3(0.0, 3.5, -3.0)
            CameraRotation = new vec3(0.1, 0.0, 0.0)
        }

        if (event.key == ' ')
        {
            var dataURL = canvas.toDataURL("image/png");
            var newTab = window.open('about:blank','image from canvas');
            newTab.document.write("<img src='" + dataURL + "' alt='from canvas'/>");
        }

        if (event.key == 'ArrowLeft')
            LeftArrowPressed = true

        if (event.key == 'ArrowRight')
            RightArrowPressed = true

        if (event.key == 'ArrowUp')
            UpArrowPressed = true

        if (event.key == 'ArrowDown')
            DownArrowPressed = true

        if (event.key == 'p')
            new mat3().rotationPrint(32, 12, 3)
    });
    

    var CookieRecord = document.cookie;
    console.log(CookieRecord);

    var IndividualCookies = CookieRecord.split(' ');
    if (CookieRecord.includes("LastCameraX"))
    {
      for (var i = 0; i < IndividualCookies.length; ++i)
      {
        if      (IndividualCookies[i].includes("LastCameraX")) 
            CameraPosition.x = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraY")) 
            CameraPosition.y = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraZ")) 
            CameraPosition.z = parseFloat(IndividualCookies[i].split('=')[1]); 
      }
    }

    if (CookieRecord.includes("LastCameraRotationX"))
    {
      for (var i = 0; i < IndividualCookies.length; ++i)
      {
        if      (IndividualCookies[i].includes("LastCameraRotationX")) 
            CameraRotation.x = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraRotationY")) 
        CameraRotation.y = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraRotationZ")) 
        CameraRotation.z = parseFloat(IndividualCookies[i].split('=')[1]); 
      }
    }

    Loop()
}())