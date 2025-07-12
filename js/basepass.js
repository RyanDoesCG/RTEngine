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
    #define N_SAMPLES 4

    void main() 
    {

        vec3 Result = vec3(1.0, 1.0, 1.0);

        for (int i = 0; i < N_SAMPLES; ++i)
        {
            vec2 offset = vec2(
                random(-1.0, 1.0, 0.124124 + float(i) * 0.01), 
                random(-1.0, 1.0, 1.634553 + float(i)) * 0.01)
                * AA_OFFSET;
            if (Time == 1.0)
            {
                offset = vec2(0.0, 0.0);
            }

            Ray PrimaryRay = GenerateRay(frag_uvs + offset);

            HitPayload Hit = TraceRay(PrimaryRay);
            if (Hit.t < 100000.0)
            {
                vec3 Samp = ShadeDiffuse(Hit) * Hit.Material.x;

                if (Hit.Material.y > 0.0)
                {
                    Samp += ShadeReflective(Hit, PrimaryRay) * Hit.Material.y;
                }

                Result += Samp;
            }
        }

        Result /= float(N_SAMPLES);
        
        out_color = vec4(Result.rgb , 1.0);
        out_normal = vec4(1.0);
        out_uv = vec4(1.0);
    }`




    /*
            //Result = ShadeLambertian(Hit, PrimaryRay);

            
            if (Time == 1.0)
            {
                Result = ShadeLambertian(Hit, PrimaryRay);
                out_color = vec4(Result.rgb , 1.0);
                out_normal = vec4(1.0);
                out_uv = vec4(1.0);
                return;
            }

    */