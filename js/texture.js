function createColourTexture(gl, width, height)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA32F;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.FLOAT;
    const data = null;

    gl.texImage2D(
        gl.TEXTURE_2D, 
        level, 
        internalFormat,
        width, 
        height, 
        border, 
        srcFormat, 
        srcType,
        data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     
    return texture;
}

var ImagesLoaded = []; 

function loadTexture(gl, texturePath)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const data = new Uint8Array([255, 0, 255, 255]);
    gl.texImage2D(
        gl.TEXTURE_2D, 
        level, 
        internalFormat,
        width, 
        height, 
        border, 
        srcFormat, 
        srcType,
        data);

    var index = ImagesLoaded.length;
    ImagesLoaded.push(false)

    const image = new Image();
    image.src = texturePath;
    image.onload = function() {
        console.log(image.src)
        console.log(" ")
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        ImagesLoaded[index] = true;
    };

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    return texture;
}