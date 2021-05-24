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
            tracingShaderCode +
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
    var PerlinNoiseTexture = loadTexture(gl, 'images/simplex.png')
    var WhiteNoiseTexture = loadTexture(gl, 'images/white.png')
    var BlueNoiseTexture = loadTexture(gl, 'images/blue.png')

    var basePassPerlinNoiseSampler = gl.getUniformLocation(basePassShaderProgram, "perlinNoiseSampler");
    var basePassWhiteNoiseSampler  = gl.getUniformLocation(basePassShaderProgram, "whiteNoiseSampler");
    var basePassBlueNoiseSampler   = gl.getUniformLocation(basePassShaderProgram, "blueNoiseSampler");

    var presentPassPerlinNoiseSampler = gl.getUniformLocation(presentPassShaderProgram, "perlinNoiseSampler");
    var presentPassWhiteNoiseSampler  = gl.getUniformLocation(presentPassShaderProgram, "whiteNoiseSampler");
    var presentPassBlueNoiseSampler   = gl.getUniformLocation(presentPassShaderProgram, "blueNoiseSampler");

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
    var SpherePositions = [ 
        -0.9, 1.1, 0.9,
        0.9, 1.1, 1.0
    ]
    var SphereColours = [ 
        1.0, 0.0, 0.0, 1.0,
        0.2, 0.2, 0.2, 1.0
    ]
    var SphereSizes = [ 
        1.0,
        0.5
    ]

    var BoxPositions = [
        0.0, 0.0, 0.0,  // floor 
        4.0, 2.0, 0.0,  // right wall
        -4.0, 2.0, 0.0, // left wall
        0.0, 2.0, 4.0,  // front wall
        0.0, 2.0, -4.0, // back wall
        2.5, 3.9, 0.0,  // roof 1
        -2.5, 3.9, 0.0,  // roof 2
        0.0, 3.9, 3.6,  // roof 3
        0.0, 3.9, -3.6,  // roof 4
        1.0, 2.0, 0.0,   // middle platform
        -3.0, 2.0, 0.0   // step

        /* Cornell
        0.0, 0.0, 0.0,
        0.0, 4.0, 0.0,
       -2.0, 2.0, 0.0,
        2.0, 2.0, 0.0,
        0.0, 2.0, 2.0
        */
    ]

    var BoxColours = [
        0.5, 0.5, 0.5, 0.0, // floor
        0.5, 0.5, 0.5, 0.0, // right wall
        0.5, 0.5, 0.5, 0.0, // left wall
        0.5, 0.5, 0.5, 0.0, // front wall
        0.5, 0.5, 0.5, 0.0, // back wall
        0.5, 0.5, 0.5, 0.0, // roof 1
        0.5, 0.5, 0.5, 0.0, // roof 2
        0.5, 0.5, 0.5, 0.0, // roof 3
        0.5, 0.5, 0.5, 0.0, // roof 4
        0.5, 0.5, 0.5, 0.0, // middle platform 
        0.5, 0.5, 0.5, 0.0 // step 1

        /* Cornell
        0.5, 0.5, 0.5, 0.0,
        0.5, 0.5, 0.5, 0.0,
        0.5, 0.5, 0.5, 0.0,
        0.5, 0.5, 0.5, 0.0,
        0.5, 0.5, 0.5, 0.0
        */
    ]

    var BoxSizes = [
        4.0, 0.1, 4.0, // floor
        0.1, 2.0, 4.0, // right wall
        0.1, 2.0, 4.0, // left wall
        4.0, 2.0, 0.1, // front wall
        4.0, 2.0, 0.1, // back wall
        1.5, 0.1, 4.0, // roof 1
        1.5, 0.1, 4.0, // roof 2
        1.5, 0.1, 0.25, // roof 3
        1.5, 0.1, 0.25, // roof 4
        3.0, 0.1, 4.0, // middle platform
        1.5, 0.1, 0.25 // step 1

        /* Cornell
        2.0, 0.1, 2.0,
        2.0, 0.1, 2.0,
        0.1, 2.1, 2.0,
        0.1, 2.1, 2.0,
        2.1, 2.1, 0.1
        */
    ]

    var AreaLightPositions = [
        0.0, 4.2, 0.0   // light 
    ]
    
    var AreaLightNormals = [
        0.0, -1.0,  0.0   // light
    ]

    var AreaLightTangents = [
        0.0,  0.0, -1.0  // light
    ]

    var AreaLightColours = [
        2.0, 2.0, 2.0, 2.0  // light
    ]

    var AreaLightSizes = [
        10.0, 3.0  // light
    ]

    var basePassSpherePositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SpherePositions")
    var basePassSphereColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SphereColours")
    var basePassSphereSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram, "SphereSizes")
    var basePassBoxPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxPositions")
    var basePassBoxColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxColours")
    var basePassBoxSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AABoxSizes")
    var basePassAreaLightPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "AreaLightPositions")
    var basePassAreaLightNormalUniformLoc = gl.getUniformLocation(basePassShaderProgram,   "AreaLightNormals")
    var basePassAreaLightTangentUniformLoc = gl.getUniformLocation(basePassShaderProgram,  "AreaLightTangents")
    var basePassAreaLightColoursUniformLoc = gl.getUniformLocation(basePassShaderProgram,  "AreaLightColours")
    var basePassAreaLightSizesUniformLoc = gl.getUniformLocation(basePassShaderProgram,    "AreaLightSizes")
    var basePassWidthUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Width")
    var basePassHeightUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Height")
    var basePassTimeUniformLoc = gl.getUniformLocation(basePassShaderProgram, "Time")
    var basePassCameraPositionUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraPosition")
    var basePassCameraLookUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraLook")
    var basePassCameraLeftUniformLoc = gl.getUniformLocation(basePassShaderProgram, "CameraLeft")

    var presentPassSpherePositionUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "SpherePositions")
    var presentPassSphereColoursUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "SphereColours")
    var presentPassSphereSizesUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "SphereSizes")
    var presentPassBoxPositionUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "AABoxPositions")
    var presentPassBoxColoursUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "AABoxColours")
    var presentPassBoxSizesUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "AABoxSizes")
    var presentPassAreaLightPositionUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "AreaLightPositions")
    var presentPassAreaLightNormalUniformLoc = gl.getUniformLocation(presentPassShaderProgram,   "AreaLightNormals")
    var presentPassAreaLightTangentUniformLoc = gl.getUniformLocation(presentPassShaderProgram,  "AreaLightTangents")
    var presentPassAreaLightColoursUniformLoc = gl.getUniformLocation(presentPassShaderProgram,  "AreaLightColours")
    var presentPassAreaLightSizesUniformLoc = gl.getUniformLocation(presentPassShaderProgram,    "AreaLightSizes")
    var presentPassWidthUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "Width")
    var presentPassHeightUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "Height")
    var presentPassTimeUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "Time")
    var presentPassCameraPositionUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "CameraPosition")
    var presentPassCameraLookUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "CameraLook")
    var presentPassCameraLeftUniformLoc = gl.getUniformLocation(presentPassShaderProgram, "CameraLeft")

    // CAMERA
    var CameraPosition = new vec3( 0.0, 1.0, -4.0 )
    var CameraRotation = new vec3( 0.0, 0.0, 0.0)
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

        gl.uniform3fv(basePassSpherePositionUniformLoc, SpherePositions)
        gl.uniform4fv(basePassSphereColoursUniformLoc, SphereColours)
        gl.uniform1fv(basePassSphereSizesUniformLoc, SphereSizes)
        gl.uniform3fv(basePassBoxPositionUniformLoc, BoxPositions)
        gl.uniform4fv(basePassBoxColoursUniformLoc, BoxColours)
        gl.uniform3fv(basePassBoxSizesUniformLoc, BoxSizes)
        gl.uniform3fv(basePassAreaLightPositionUniformLoc, AreaLightPositions)
        gl.uniform3fv(basePassAreaLightNormalUniformLoc,   AreaLightNormals)
        gl.uniform3fv(basePassAreaLightTangentUniformLoc,  AreaLightTangents)
        gl.uniform4fv(basePassAreaLightColoursUniformLoc,  AreaLightColours)
        gl.uniform2fv(basePassAreaLightSizesUniformLoc,    AreaLightSizes)
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

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, PerlinNoiseTexture);
        gl.uniform1i(presentPassPerlinNoiseSampler, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, WhiteNoiseTexture);
        gl.uniform1i(presentPassWhiteNoiseSampler, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, BlueNoiseTexture);
        gl.uniform1i(presentPassBlueNoiseSampler, 5);

        gl.uniform3fv(presentPassSpherePositionUniformLoc, SpherePositions)
        gl.uniform4fv(presentPassSphereColoursUniformLoc, SphereColours)
        gl.uniform1fv(presentPassSphereSizesUniformLoc, SphereSizes)
        gl.uniform3fv(presentPassBoxPositionUniformLoc, BoxPositions)
        gl.uniform4fv(presentPassBoxColoursUniformLoc, BoxColours)
        gl.uniform3fv(presentPassBoxSizesUniformLoc, BoxSizes)
        gl.uniform3fv(presentPassAreaLightPositionUniformLoc, AreaLightPositions)
        gl.uniform3fv(presentPassAreaLightNormalUniformLoc,   AreaLightNormals)
        gl.uniform3fv(presentPassAreaLightTangentUniformLoc,  AreaLightTangents)
        gl.uniform4fv(presentPassAreaLightColoursUniformLoc,  AreaLightColours)
        gl.uniform2fv(presentPassAreaLightSizesUniformLoc,    AreaLightSizes)
        gl.uniform1f (presentPassWidthUniformLoc, canvas.clientWidth)
        gl.uniform1f (presentPassHeightUniformLoc, canvas.clientHeight)
        gl.uniform1f (presentPassTimeUniformLoc, frameID);
        gl.uniform3fv(presentPassCameraPositionUniformLoc, CameraPosition.array())
        gl.uniform3fv(presentPassCameraLookUniformLoc, CameraLook.array())
        gl.uniform3fv(presentPassCameraLeftUniformLoc, CameraLeft.array())

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

        if (frameID < 1000)
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
        var speed = 0.005
        if (APressed) CameraVelocity = CameraVelocity.add(CameraLeft.multiply(new vec3(speed, speed, speed)));
        if (DPressed) CameraVelocity = CameraVelocity.minus(CameraLeft.multiply(new vec3(speed, speed, speed)));
        if (SPressed) CameraVelocity = CameraVelocity.minus(CameraLook.multiply(new vec3(speed, speed, speed)));
        if (WPressed) CameraVelocity = CameraVelocity.add(CameraLook.multiply(new vec3(speed, speed, speed)));
        if (QPressed) CameraVelocity.y -= speed
        if (EPressed) CameraVelocity.y += speed
        if (RightArrowPressed) CameraAngularVelocity.y += speed
        if (LeftArrowPressed) CameraAngularVelocity.y -= speed
        if (UpArrowPressed) CameraAngularVelocity.x -= speed
        if (DownArrowPressed) CameraAngularVelocity.x += speed
    }

    function DoMovement() {
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
            CameraPosition = new vec3(0.0, 1.5, -4.0)
            CameraRotation = new vec3(0.0, 0.0, 0.0)
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