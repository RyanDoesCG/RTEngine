var basePassVertexShaderSource = 
    `#version 300 es

    in vec4 vertex_position;
    in vec2 vertex_uvs;

    out vec2 frag_uvs;

    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var basePassFragmentShaderHeaderSource = 
    `#version 300 es

    precision highp float;

    in vec2 frag_uvs;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_normal;
    layout(location = 2) out vec4 out_uv;

`

var basePassFragmentShaderFooterSource = `
    #define AA_OFFSET 0.005

    void main() 
    {
        vec2 offset = vec2(random(-1.0, 1.0), random(-1.0, 1.0)) * AA_OFFSET;

        if (Time == 1.0)
        {
            offset = vec2(0.0, 0.0);
        }

        Ray PrimaryRay = GenerateRay(frag_uvs + offset);

        vec3 Result = vec3(1.0, 1.0, 1.0);
        float ShadowSample = 1.0;

        HitPayload Hit = TraceRay(PrimaryRay);
        if (Hit.t < 100000.0)
        {
            if (Time == 1.0)
            {
                Result = ShadeLambertian(Hit, PrimaryRay);
                out_color = vec4(Result.rgb , 1.0);
                out_normal = vec4(1.0);
                out_uv = vec4(1.0);
                return;
            }

            if (Hit.MaterialID == DIFFUSE_MATERIAL_ID)
            {
                Result = ShadeDiffuse(Hit);
            }

            if (Hit.MaterialID == REFLECTIVE_MATERIAL_ID)
            {
                Result = ShadeReflective(Hit, PrimaryRay);
            }

            if (Hit.MaterialID == REFRACTIVE_MATERIAL_ID)
            {
                Result = ShadeRefractive(Hit, PrimaryRay);
            }
        }
        
        out_color = vec4(Result.rgb , 1.0);
        out_normal = vec4(1.0);
        out_uv = vec4(1.0);
    }`