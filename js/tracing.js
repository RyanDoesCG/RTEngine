var tracingShaderCode = `

#define PI 3.1415926538

#define DIFFUSE_MATERIAL_ID    0
#define REFLECTIVE_MATERIAL_ID 1
#define REFRACTIVE_MATERIAL_ID 2

#define NUM_DIFFUSE_SAMPLES 1
#define NUM_DIFFUSE_BOUNCES 2

#define NUM_SPECULAR_BOUNCES 2

#define NUM_SPHERES 3
#if NUM_SPHERES > 0
uniform vec3  SpherePositions[NUM_SPHERES];
uniform vec4  SphereColours[NUM_SPHERES];
uniform float SphereSizes[NUM_SPHERES];
uniform int   SphereMaterials[NUM_SPHERES];
#endif

#define NUM_AA_BOXES 11
#if NUM_AA_BOXES > 0
uniform vec3 AABoxPositions[NUM_AA_BOXES];
uniform vec4 AABoxColours[NUM_AA_BOXES];
uniform vec3 AABoxSizes[NUM_AA_BOXES];
uniform int  AABoxMaterials[NUM_AA_BOXES];
#endif

#define NUM_AREA_LIGHTS 1
#if NUM_AREA_LIGHTS > 0
uniform vec3 AreaLightPositions[NUM_AREA_LIGHTS];
uniform vec3 AreaLightNormals[NUM_AREA_LIGHTS];
uniform vec3 AreaLightTangents[NUM_AREA_LIGHTS];
uniform vec4 AreaLightColours[NUM_AREA_LIGHTS];
uniform vec2 AreaLightSizes[NUM_AREA_LIGHTS];
uniform int  AreaLightMaterials[NUM_AREA_LIGHTS];
#endif

#define NUM_METABALLS 0
#if NUM_METABALLS > 0
uniform vec3  MetaballPositions[NUM_METABALLS];
uniform vec4  MetaballColours[NUM_METABALLS];
uniform float MetaballSizes[NUM_METABALLS];
uniform int   MetaballMaterials[NUM_METABALLS];
#endif

uniform sampler2D perlinNoiseSampler;
uniform sampler2D whiteNoiseSampler;
uniform sampler2D blueNoiseSampler;

uniform float Width;
uniform float Height;
uniform float Time;

uniform vec3 CameraPosition;
uniform vec3 CameraLook;
uniform vec3 CameraLeft;

struct Ray {
    vec3 Origin;
    vec3 Direction;
};

struct Sphere {
    vec4  Colour;
    vec3  Position;
    float Radius;
    int   MaterialID;
};

struct AABox {
    vec4 Colour;
    vec3 Position;
    vec3 Size;
    int  MaterialID;
};

struct AreaLight {
    vec4 Colour;
    vec3 Position;
    vec3 Tangent;
    vec3 Normal;
    vec2 Size;
    int  MaterialID;
};

struct HitPayload {
    vec4  Colour;
    vec3  Position;
    vec3  Normal;
    vec2  UV;
    float t;
    float t2;
    int   MaterialID;
    vec3  ObjectPosition;
};

float saturate (float x) 
{ 
    return clamp(x, 0.0, 1.0); 
}

vec3 saturate (vec3 v) 
{ 
    return vec3(
        clamp(v.x, 0.0, 1.0),
        clamp(v.y, 0.0, 1.0),
        clamp(v.z, 0.0, 1.0)); 
}

vec2 SphereUV (vec3 Normal)
{
    float U = saturate(((atan(Normal.z, Normal.x) / PI) + 1.0) / 2.0);
    float V = (0.5-(asin(Normal.y)/PI));
    return vec2(U, V);
}

vec2 PlaneUV (vec3 HitP, AreaLight plane)
{
    vec3 PlaneU = plane.Tangent;
    vec3 PlaneV = cross(plane.Normal, plane.Tangent);
    vec3 BottomLeftCorner  = plane.Position + (-PlaneU * plane.Size.x * 0.5) + (-PlaneV * plane.Size.y * 0.5);
    vec3 BottomRightCorner = plane.Position + ( PlaneU * plane.Size.x * 0.5) + (-PlaneV * plane.Size.y * 0.5);
    vec3 TopLeftCorner     = plane.Position + (-PlaneU * plane.Size.x * 0.5) + ( PlaneV * plane.Size.y * 0.5);
    float u = dot(normalize(BottomRightCorner - BottomLeftCorner), HitP - BottomLeftCorner) / plane.Size.x;
    float v = dot(normalize(TopLeftCorner     - BottomLeftCorner), HitP - BottomLeftCorner) / plane.Size.y;
    return vec2(u, v);
}

HitPayload IntersectRaySphere (Ray ray, HitPayload last, Sphere sphere)
{
    vec3 oc = ray.Origin - sphere.Position;
    float a = dot (ray.Direction, ray.Direction);
    float b = 2.0 * dot (oc, ray.Direction);
    float c = dot (oc, oc) - sphere.Radius * sphere.Radius;
    float d = b * b - 4.0 * a * c;
    
    if (d > 0.0)
    {
        float t = (-b - sqrt(d)) / (2.0 * a);

        if (t > 0.0 && t < last.t)
        {
            vec3 HitPosition = (ray.Origin + ray.Direction * t);
            vec3 HitNormal   = normalize(HitPosition - sphere.Position);
            vec2 HitUV       = SphereUV(HitNormal);

            return HitPayload(
                sphere.Colour,
                HitPosition,
                HitNormal,
                HitUV,
                t,
                (dot(ray.Direction, HitNormal)),
                sphere.MaterialID, 
                sphere.Position);
        }
    }

    return last;
}

HitPayload IntersectRayAABox(Ray ray, HitPayload last, AABox box)
{
    vec3 InverseRay = 1.0 / ray.Direction; 
    vec3 BoxMin     = box.Position - (box.Size);
    vec3 BoxMax     = box.Position + (box.Size);
    float tx1       = (BoxMin.x - ray.Origin.x) * InverseRay.x;
    float tx2       = (BoxMax.x - ray.Origin.x) * InverseRay.x;
    float mint      = min(tx1, tx2);
    float maxt      = max(tx1, tx2);
    float ty1       = (BoxMin.y - ray.Origin.y) * InverseRay.y;
    float ty2       = (BoxMax.y - ray.Origin.y) * InverseRay.y;
    mint            = max(mint, min(ty1, ty2));
    maxt            = min(maxt, max(ty1, ty2));
    float tz1       = (BoxMin.z - ray.Origin.z) * InverseRay.z;
    float tz2       = (BoxMax.z - ray.Origin.z) * InverseRay.z;
    mint            = max(mint, min(tz1, tz2));
    maxt            = min(maxt, max(tz1, tz2));

    if (maxt >= max(0.0, mint) && mint < last.t)
    {
        vec3 HitPositionWorldSpace = ray.Origin + ray.Direction * mint;
        vec3 HitPositionLocalSpace = HitPositionWorldSpace - box.Position;

        vec3 HitNormal = vec3(
            (float(abs(HitPositionLocalSpace.x - box.Size.x) < 0.000001)) - (float(abs(HitPositionLocalSpace.x - -box.Size.x) < 0.000001)), 
            (float(abs(HitPositionLocalSpace.y - box.Size.y) < 0.000001)) - (float(abs(HitPositionLocalSpace.y - -box.Size.y) < 0.000001)), 
            (float(abs(HitPositionLocalSpace.z - box.Size.z) < 0.000001)) - (float(abs(HitPositionLocalSpace.z - -box.Size.z) < 0.000001)));

        vec2 HitUV = vec2(
            abs(HitPositionLocalSpace.x * abs(HitNormal.z + HitNormal.y) + HitPositionLocalSpace.z * abs(HitNormal.x)),
            abs(HitPositionLocalSpace.y + HitPositionLocalSpace.z * abs(HitNormal.y))
        );

        return HitPayload(
            box.Colour,
            HitPositionWorldSpace,
            HitNormal,
            HitUV,
            mint,
            maxt,
            box.MaterialID,
            box.Position);
    }

    return last;
}

HitPayload IntersectRayPlane (Ray ray, HitPayload last, AreaLight plane)
{            
    float d = dot (plane.Normal, ray.Direction);
    if (d < 0.0)
    {
        float t = dot (plane.Position - ray.Origin, plane.Normal) / d;

        if (t > 0.0 && t < last.t)
        {
            vec3 HitPosition = ray.Origin + ray.Direction * t;
            vec3 HitNormal   = plane.Normal;
            vec2 HitUV       = PlaneUV(HitPosition, plane);
            vec4 HitColour   = plane.Colour;

            if (0.0 <= HitUV.x && HitUV.x <= 1.0 &&
                0.0 <= HitUV.y && HitUV.y <= 1.0)
            {
                return HitPayload (
                    HitColour,
                    HitPosition,
                    HitNormal,
                    HitUV,
                    t,
                    t,
                    plane.MaterialID,
                    plane.Position);
            }
        }
    }

    return last;
}

HitPayload IntersectRayMetaballs (Ray ray, HitPayload last)
{

    return last;
}

HitPayload TraceRay (Ray ray)
{
    HitPayload Hit = HitPayload(
        vec4(0.3, 0.3, 0.3, 0.0),
        vec3(-1.0, -1.0, -1.0),
        vec3(-1.0, -1.0, -1.0),
        vec2(0.0, 0.0),
        1000000.0,
        1000000.0,
        0,
        vec3(0.0, 0.0, 0.0)
    );

    #if NUM_SPHERES > 0
    for (int i = 0; i < NUM_SPHERES; ++i)
    {
        Hit = IntersectRaySphere(ray, Hit, Sphere(
            SphereColours[i],
            SpherePositions[i],
            SphereSizes[i],
            SphereMaterials[i]
        ));
    }
    #endif

    #if NUM_AA_BOXES > 0
    for (int i = 0; i < NUM_AA_BOXES; ++i)
    {
        Hit = IntersectRayAABox(ray, Hit, AABox(
            AABoxColours[i], 
            AABoxPositions[i],
            AABoxSizes[i],
            AABoxMaterials[i]
        ));
    }
    #endif

    #if NUM_AREA_LIGHTS > 0
    for (int i = 0; i < NUM_AREA_LIGHTS; ++i)
    {
        Hit = IntersectRayPlane(ray, Hit, AreaLight(
            AreaLightColours[i],
            AreaLightPositions[i],
            AreaLightTangents[i],
            AreaLightNormals[i],
            AreaLightSizes[i],
            AreaLightMaterials[i]
        ));
    }
    #endif

    #if NUM_METABALLS > 0
    Hit = IntersectRayMetaballs(ray, Hit);
    #endif

    return Hit;
}

HitPayload TraceRayMaterialMasked (Ray ray, int MaterialID)
{
    HitPayload Hit = HitPayload(
        vec4(0.3, 0.3, 0.3, 0.0),
        vec3(-1.0, -1.0, -1.0),
        vec3(-1.0, -1.0, -1.0),
        vec2(0.0, 0.0),
        1000000.0,
        1000000.0,
        0,
        vec3(0.0, 0.0, 0.0)
    );

    #if NUM_SPHERES > 0
    for (int i = 0; i < NUM_SPHERES; ++i)
    {
        if (SphereMaterials[i] == MaterialID)
        {
            Hit = IntersectRaySphere(ray, Hit, Sphere(
                SphereColours[i],
                SpherePositions[i],
                SphereSizes[i],
                SphereMaterials[i]
            ));
        }
    }
    #endif

    #if NUM_AA_BOXES > 0
    for (int i = 0; i < NUM_AA_BOXES; ++i)
    {
        if (AABoxMaterials[i] == MaterialID)
        {
            Hit = IntersectRayAABox(ray, Hit, AABox(
                AABoxColours[i], 
                AABoxPositions[i],
                AABoxSizes[i],
                AABoxMaterials[i]
            ));
        }
    }
    #endif

    #if NUM_AREA_LIGHTS > 0
    for (int i = 0; i < NUM_AREA_LIGHTS; ++i)
    {
        if (AreaLightMaterials[i] == MaterialID)
        {
            Hit = IntersectRayPlane(ray, Hit, AreaLight(
                AreaLightColours[i],
                AreaLightPositions[i],
                AreaLightTangents[i],
                AreaLightNormals[i],
                AreaLightSizes[i],
                AreaLightMaterials[i]
            ));
        }
    }
    #endif

    return Hit;
}

Ray GenerateRay (vec2 UV) 
{ 
    UV.y /= Width/Height;
    vec2 ViewPlaneUV = (vec2(-1.0, -1.0) + UV * 2.0);
    vec3 ViewPlaneYAxis = cross(CameraLeft, CameraLook);
    vec3 ViewPlaneXAxis = -CameraLeft;
    vec3 ViewPlaneWorldPosition = CameraPosition + (CameraLook) + (ViewPlaneYAxis * ViewPlaneUV.y) + (ViewPlaneXAxis * ViewPlaneUV.x);     
    vec3 CameraToViewPlane = ViewPlaneWorldPosition - CameraPosition;
    return Ray(CameraPosition, CameraToViewPlane);
}

float seed = 0.0;
float random ()
{
    seed += 0.1;
    return texture(blueNoiseSampler, vec2(sin(Time * 0.2), cos(Time * 0.2)) + (frag_uvs * 2.0) + vec2(seed)).x;
}

float random (vec2 UV)
{
    return texture(blueNoiseSampler, UV).x;
}

float random (float min, float max)
{
    return min + random() * (max - min);
}

vec3 randomDirection()
{
    // generate random UV
    float x = random(-1.0, 1.0);
    float y = random(-1.0, 1.0);
    float z = random(-1.0, 1.0);

    return normalize(vec3(x, y, z));
}

vec3 randomPointOnPlane(AreaLight plane)
{
    vec3 PlaneU = plane.Tangent;
    vec3 PlaneV = cross(plane.Normal, plane.Tangent);
    vec3 BottomLeftCorner  = plane.Position + (-PlaneU * plane.Size.x * 0.5) + (-PlaneV * plane.Size.y * 0.5);
    vec3 BottomRightCorner = plane.Position + ( PlaneU * plane.Size.x * 0.5) + (-PlaneV * plane.Size.y * 0.5);
    vec3 TopLeftCorner     = plane.Position + (-PlaneU * plane.Size.x * 0.5) + ( PlaneV * plane.Size.y * 0.5);

    float u = random(0.0, 1.0) * plane.Size.x;
    float v = random(0.0, 1.0) * plane.Size.y;

    return BottomLeftCorner + (PlaneU * u) + (PlaneV * v);
}

float Grid (vec2 uv)
{
    return mix(
        0.0, 
        1.0, 
        float((fract(uv.x * 20.0) > 0.9) || 
              (fract(uv.y * 20.0) > 0.9)));
}

vec3 Shadow (HitPayload Hit)
{
    vec3 ShadowSample = vec3(1.0);

    if (Hit.Colour.a >= 2.0)
    {
        return ShadowSample;
    }

    #if NUM_AREA_LIGHTS > 0
    for (int i = 0; i < NUM_AREA_LIGHTS; ++i)
    {
        AreaLight light = AreaLight(
            AreaLightColours[i],
            AreaLightPositions[i],
            AreaLightTangents[i],
            AreaLightNormals[i],
            AreaLightSizes[i],
            AreaLightMaterials[i]
        );
    
        Ray ShadowRay = Ray(
            Hit.Position + Hit.Normal * 0.001, 
            normalize(randomPointOnPlane(light) - Hit.Position));
    
        HitPayload ShadowHit = TraceRay(ShadowRay);
        if (ShadowHit.t < 100000.0 && ShadowHit.Colour.a < 2.0)
        {
            if (ShadowHit.MaterialID == DIFFUSE_MATERIAL_ID)
            {
                ShadowSample -= 0.75;
            }
            if (ShadowHit.MaterialID == REFRACTIVE_MATERIAL_ID)
            {
                ShadowSample += ShadowHit.Colour.rgb;
            }
        }
    }

    #endif
    return saturate(ShadowSample);
}


vec3 ShadeDiffuse(HitPayload Hit)
{
    vec3 diffuse = Hit.Colour.rgb;
    if (Hit.Colour.a >= 2.0)
    {
        return diffuse;
    }

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
    return (diffuse / float(NUM_DIFFUSE_SAMPLES)) * Shadow(Hit);
}

vec3 ShadeRefractive(HitPayload Hit, Ray InitialRay)
{
    vec3 Refract = vec3(0.0, 0.0, 0.0);

    Ray RefractRay = Ray(Hit.Position, InitialRay.Direction);
    HitPayload RefractHit = TraceRayMaterialMasked(RefractRay, DIFFUSE_MATERIAL_ID);

    if (RefractHit.t < 100000.0)
    {
        if (RefractHit.MaterialID == DIFFUSE_MATERIAL_ID)
        {
            Refract += ShadeDiffuse(RefractHit);
        }
    }
    else
    {
        Refract += vec3(1.0, 1.0, 1.0);
    }

    float t = Hit.Colour.a * (1.0 - abs(dot(InitialRay.Direction, Hit.Normal)));
    return mix(Hit.Colour.rgb, Refract, saturate(t));
}


vec3 ShadeReflective(HitPayload Hit, Ray InitialRay)
{
    vec3 Specular = vec3(0.0, 0.0, 0.0);

    Ray BounceRay = Ray(Hit.Position, reflect(InitialRay.Direction, Hit.Normal));
    HitPayload BounceHit = TraceRay(BounceRay);
    
    if (BounceHit.t < 100000.0)
    {
        if (BounceHit.MaterialID == DIFFUSE_MATERIAL_ID)
        {
            Specular += ShadeDiffuse(BounceHit);
        }
        if (BounceHit.MaterialID == REFRACTIVE_MATERIAL_ID)
        {
            Specular += ShadeRefractive(BounceHit, BounceRay);
        }
        if (BounceHit.MaterialID == REFLECTIVE_MATERIAL_ID)
        {
            BounceRay = Ray(BounceHit.Position, reflect(BounceRay.Direction, BounceHit.Normal));
            BounceHit = TraceRay(BounceRay);

            if (BounceHit.t < 100000.0)
            {
                if (BounceHit.MaterialID == DIFFUSE_MATERIAL_ID)
                {
                    Specular += ShadeDiffuse(BounceHit);
                }
                if (BounceHit.MaterialID == REFRACTIVE_MATERIAL_ID)
                {
                    Specular += ShadeRefractive(BounceHit, BounceRay);
                }
                if (BounceHit.MaterialID == REFLECTIVE_MATERIAL_ID)
                {
                    BounceRay = Ray(BounceHit.Position, reflect(BounceRay.Direction, BounceHit.Normal));
                    BounceHit = TraceRay(BounceRay);

                    if (BounceHit.t < 100000.0)
                    {
                        if (BounceHit.MaterialID == DIFFUSE_MATERIAL_ID)
                        {
                            Specular += ShadeDiffuse(BounceHit);
                        }
                        if (BounceHit.MaterialID == REFRACTIVE_MATERIAL_ID)
                        {
                            Specular += ShadeRefractive(BounceHit, BounceRay);
                        }
                    }
                    else
                    {
                        Specular += vec3(1.0);
                    }
                }
            }
            else
            {
                Specular += vec3(1.0);
            }
        }
    }
    else
    {
        Specular += vec3(1.0);
    }

    return mix(Hit.Colour.rgb, Specular, Hit.Colour.a);
}


vec3 ShadeSmokeVolume(HitPayload Hit, Ray InitialRay)
{
    vec3 HitColour = Hit.Colour.rgb * texture(perlinNoiseSampler, Hit.UV).rgb;

    float scatter = random(0.0, 1.0);
    if (scatter < 0.5)
    {
        Ray ScatterRay = Ray(Hit.Position, randomDirection());
        HitPayload ScatterHit = TraceRayMaterialMasked(
            ScatterRay,
            DIFFUSE_MATERIAL_ID);
        return ShadeDiffuse(ScatterHit);
    }

    Ray PassThroughRay = Ray(Hit.Position, InitialRay.Direction);
    HitPayload PassThroughHit = TraceRayMaterialMasked(
        PassThroughRay,
        DIFFUSE_MATERIAL_ID);
    return ShadeDiffuse(PassThroughHit);
}

`;