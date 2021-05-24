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

    #define NUM_DIFFUSE_SAMPLES 1
    #define NUM_DIFFUSE_BOUNCES 2
    #define NUM_SHADOW_RAYS 2

    #define AA_OFFSET 0.005

    void main() 
    {
        vec2 offset = vec2(random(-1.0, 1.0), random(-1.0, 1.0)) * AA_OFFSET;

        Ray PrimaryRay = GenerateRay(frag_uvs + offset);

        vec3 Result = vec3(0.0, 0.0, 0.0);
        float ShadowSample = 0.0;

        HitPayload Hit = TraceRay(PrimaryRay);
        if (Hit.t < 100000.0)
        {
            vec3 diffuse = Hit.Colour.rgb * ((Hit.Colour.a >= 2.0) ? 1.0 : Grid(Hit.UV));
            for (int i = 0; i < NUM_DIFFUSE_SAMPLES; ++i)
            {
                vec3 s = vec3(0.0, 0.0, 0.0);

                for (int i = 0; i < NUM_DIFFUSE_BOUNCES; ++i)
                {
                    Ray BounceRay = Ray(
                        Hit.Position + Hit.Normal * 0.001, 
                        normalize(Hit.Normal - (randomDirection())));
                        
                    Hit = TraceRay(BounceRay);
                    s += Hit.Colour.rgb * Hit.Colour.a * (1.0 - (float(i) / float(NUM_DIFFUSE_BOUNCES)));
                }

                diffuse += s;
            }

            diffuse /= float(NUM_DIFFUSE_SAMPLES);
            Result = diffuse;

            #if NUM_AREA_LIGHTS > 0
            AreaLight light = AreaLight(
                AreaLightColours[0],
                AreaLightPositions[0],
                AreaLightTangents[0],
                AreaLightNormals[0],
                AreaLightSizes[0]
            );

            Ray ShadowRay = Ray(
                Hit.Position + Hit.Normal * 0.001, 
                normalize(randomPointOnPlane(light) - Hit.Position));

            HitPayload Hit = TraceRay(ShadowRay);
            if (Hit.t < 100000.0 && Hit.Colour.a < 2.0)
            {
                ShadowSample += 1.0;
            }
            #endif
        }
        else
        {
            Result = vec3(1.0, 1.0, 1.0);
        }

        out_color = vec4(Result.rgb * max(1.0 - ShadowSample, 0.0), 1.0);
        out_normal = vec4(1.0);
        out_uv = vec4(1.0);
    }`