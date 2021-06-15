var tracingShaderCode = `

#define PI 3.1415926538

#define NUM_DIFFUSE_SAMPLES 1
#define NUM_DIFFUSE_BOUNCES 1

#define NUM_SPECULAR_BOUNCES 1

#define NUM_SPHERES 0
#if NUM_SPHERES > 0
uniform vec3  SpherePositions[NUM_SPHERES];
uniform vec4  SphereColours[NUM_SPHERES];
uniform float SphereSizes[NUM_SPHERES];
uniform vec4   SphereMaterials[NUM_SPHERES];
#endif

#define NUM_AA_BOXES 10
#if NUM_AA_BOXES > 0
uniform vec3 AABoxPositions[NUM_AA_BOXES];
uniform vec4 AABoxColours[NUM_AA_BOXES];
uniform vec3 AABoxSizes[NUM_AA_BOXES];
uniform vec4  AABoxMaterials[NUM_AA_BOXES];
#endif

#define NUM_TRIANGLES 0
#if NUM_TRIANGLES > 0
uniform vec3 TriangleVertexPositions[NUM_TRIANGLES * 3];
#endif

#define NUM_CYLINDERS 0
#if NUM_CYLINDERS > 0
uniform vec3 CylinderPositions[NUM_CYLINDERS];
uniform vec4 CylinderColours[NUM_CYLINDERS];
uniform vec3 CylinderSizes[NUM_CYLINDERS];
uniform vec4 CylinderMaterials[NUM_CYLINDERS];
#endif

#define NUM_AREA_LIGHTS 1
#if NUM_AREA_LIGHTS > 0
uniform vec3 AreaLightPositions[NUM_AREA_LIGHTS];
uniform vec3 AreaLightNormals[NUM_AREA_LIGHTS];
uniform vec3 AreaLightTangents[NUM_AREA_LIGHTS];
uniform vec4 AreaLightColours[NUM_AREA_LIGHTS];
uniform vec2 AreaLightSizes[NUM_AREA_LIGHTS];
uniform vec4 AreaLightMaterials[NUM_AREA_LIGHTS];
#endif

uniform sampler2D perlinNoiseSampler;
uniform sampler2D whiteNoiseSampler;
uniform sampler2D blueNoiseSampler;
uniform sampler2D brot0Sampler;

uniform sampler2D WoodAlbedoSampler;
uniform sampler2D WoodNormalSampler;

uniform sampler2D ConcreteAlbedoSampler;
uniform sampler2D ConcreteNormalSampler;

uniform sampler2D FabricAlbedoSampler;
uniform sampler2D FabricNormalSampler;

uniform sampler2D GoldAlbedoSampler;
uniform sampler2D GoldNormalSampler;
uniform sampler2D GoldAlphaSampler;

uniform sampler2D SkyDomeSampler;

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
    vec4  Material;
};

struct AABox {
    vec4 Colour;
    vec3 Position;
    vec3 Size;
    vec4 Material;
};

struct Triangle {
    vec4 Colour;
    vec3 A;
    vec3 B;
    vec3 C;
    vec4 Material;
};

struct Cylinder {
    vec4 Colour;
    vec3 Position;
    vec3 Size;
    vec4 Material;
};

struct AreaLight {
    vec4 Colour;
    vec3 Position;
    vec3 Tangent;
    vec3 Normal;
    vec2 Size;
    vec4 Material;
};

struct HitPayload {
    vec4  Colour;
    vec3  Position;
    vec3  Normal;
    vec2  UV;
    float t;
    float t2;
    vec4  Material;
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

float Grid (vec2 uv, float Thickness)
{
    return mix(
        0.0, 
        1.0, 
        float((fract(uv.x * 20.0) > Thickness) || 
              (fract(uv.y * 20.0) > Thickness)));
}

vec4 AlbedoForTextureID(vec2 UV, float index)
{
    if (index == 0.0) return texture(ConcreteAlbedoSampler, UV);

    if (index == 1.0) return texture(WoodAlbedoSampler, UV);

    if (index == 2.0) return vec4(Grid(UV, 0.9));

    if (index == 3.0) return vec4(0.2);

    if (index == 4.0) return texture(FabricAlbedoSampler, UV);

    if (index == 5.0) return texture(GoldAlbedoSampler, UV);

    return vec4(1.0, 0.0, 1.0, 1.0);
}

vec4 NormalForTextureID(vec2 UV, float index)
{
    if (index == 0.0) return -1.0 + texture(ConcreteNormalSampler, UV) * 2.0;

    if (index == 1.0) return -1.0 + texture(WoodNormalSampler, UV) * 2.0;

    if (index == 2.0) return vec4(0.0, 0.0, 1.0, 0.0);
    
    if (index == 4.0) return -1.0 + texture(FabricNormalSampler, UV) * 2.0;

    if (index == 5.0) return -1.0 + texture(GoldNormalSampler, UV) * 2.0;

    return vec4(0.0, 0.0, 1.0, 0.0);
}

float AlphaForTextureID(vec2 UV, float index)
{
    if (index == 0.0) return 1.0;

    if (index == 1.0) return 1.0;

    if (index == 2.0) return 1.0;
    
    if (index == 4.0) return 1.0;

    if (index == 5.0) return texture(GoldAlphaSampler, UV).x;

    return 1.0;  
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
        vec2 AlphaMaskUV = vec2(0.0, 0.3425);

        float t  = (-b - sqrt(d)) / (2.0 * a);
        float t1 = (-b + sqrt(d)) / (2.0 * a);

        if (t > 0.0 && t < last.t)
        {
            vec3 HitPosition = (ray.Origin + ray.Direction * t);
            vec3 HitNormal   = normalize(HitPosition - sphere.Position);
            vec2 HitUV       = SphereUV(HitNormal);

            float a = AlphaForTextureID(HitUV, sphere.Material.w);

            if (a > 0.1)
            {
                vec3 Tangent = normalize(cross(vec3(0.0, 1.0, 0.0), HitPosition - sphere.Position));
                vec3 Bitangent = cross(HitNormal, Tangent);
                vec3 Normal = HitNormal;

                vec4 ShadingAlbedo = AlbedoForTextureID(HitUV, sphere.Material.w);
                vec3 ShadingNormal = normalize(
                    mat3(Tangent, Bitangent, Normal) 
                    * 
                    (NormalForTextureID(HitUV, sphere.Material.w).xyz));
    
                return HitPayload(
                    ShadingAlbedo,
                    HitPosition,
                    ShadingNormal,
                    HitUV,
                    t,
                    t1,
                    sphere.Material, 
                    sphere.Position);
            }
        }

        if (t1 > 0.0 && t1 < last.t)
        {
            vec3 HitPosition = (ray.Origin + ray.Direction * t1);
            vec3 HitNormal   = normalize(HitPosition - sphere.Position);
            vec2 HitUV       = SphereUV(HitNormal);

            float a = AlphaForTextureID(HitUV, sphere.Material.w);

            if (a > 0.1)
            {
                vec3 Tangent = normalize(cross(vec3(0.0, 1.0, 0.0), HitPosition - sphere.Position));
                vec3 Bitangent = cross(HitNormal, Tangent);
                vec3 Normal = HitNormal;
                vec4 ShadingAlbedo = AlbedoForTextureID(HitUV, sphere.Material.w);
                vec3 ShadingNormal = normalize(
                    mat3(Tangent, Bitangent, Normal) 
                    * 
                    (NormalForTextureID(HitUV, sphere.Material.w).xyz));
                return HitPayload(
                    ShadingAlbedo,
                    HitPosition,
                    ShadingNormal,
                    HitUV,
                    t1,
                    t,
                    sphere.Material, 
                    sphere.Position);
            }
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
            (float(abs(HitPositionLocalSpace.x - box.Size.x) < 0.00001)) - (float(abs(HitPositionLocalSpace.x - -box.Size.x) < 0.00001)), 
            (float(abs(HitPositionLocalSpace.y - box.Size.y) < 0.00001)) - (float(abs(HitPositionLocalSpace.y - -box.Size.y) < 0.00001)), 
            (float(abs(HitPositionLocalSpace.z - box.Size.z) < 0.00001)) - (float(abs(HitPositionLocalSpace.z - -box.Size.z) < 0.00001)));

        vec3 HitTangent = vec3(
            (float(abs(HitPositionLocalSpace.y - box.Size.y) < 0.00001)) - (float(abs(HitPositionLocalSpace.y - -box.Size.y) < 0.00001)),
            (float(abs(HitPositionLocalSpace.z - box.Size.z) < 0.00001)) - (float(abs(HitPositionLocalSpace.z - -box.Size.z) < 0.00001)), 
            (float(abs(HitPositionLocalSpace.x - box.Size.x) < 0.00001)) - (float(abs(HitPositionLocalSpace.x - -box.Size.x) < 0.00001)));

        vec3 HitBitangent = cross(HitTangent, HitNormal);

        vec2 HitUV = vec2(
            0.2 + abs(HitPositionLocalSpace.x * abs(HitNormal.z + HitNormal.y) + HitPositionLocalSpace.z * abs(HitNormal.x)),
            0.2 + abs(HitPositionLocalSpace.y + HitPositionLocalSpace.z * abs(HitNormal.y))) * 0.2;

        vec4 ShadingAlbedo = AlbedoForTextureID(HitUV, box.Material.w);
        vec3 ShadingNormal = normalize(
            mat3(HitTangent, HitBitangent, HitNormal) 
            * 
            (NormalForTextureID(HitUV, box.Material.w).xyz));

        float a = AlphaForTextureID(HitUV, box.Material.w);
        if (a > 0.25)
        {
            if (box.Colour.a == 2.0)
            {
                return HitPayload(
                    ShadingAlbedo,
                    HitPositionWorldSpace,
                    ShadingNormal,
                    HitUV,
                    mint,
                    maxt,
                    box.Material,
                    box.Position);
            }
            else
            {
                return HitPayload(
                    ShadingAlbedo,
                    HitPositionWorldSpace,
                    ShadingNormal,
                    HitUV,
                    mint,
                    maxt,
                    box.Material,
                    box.Position);
            }
        }
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
                    plane.Material,
                    plane.Position);
            }
        }
    }

    return last;
}

HitPayload IntersectRayTriangle (Ray ray, HitPayload last, Triangle tri)
{
    vec3 u = tri.B - tri.A; 
    vec3 v = tri.C - tri.A;
    vec3 n = cross(ray.Direction, v);

    float area = dot(u, n);

    vec3 s = ray.Origin - tri.A;
    vec3 r = cross(s, u);

    float beta  = dot (s, n) / area;
    float gamma = dot (ray.Direction, r) / area;
    float alpha = 1.0 - (beta + gamma);

    float t = dot (v, r) / area;

    float eps1 = 1e-7f;
    float eps2 = 1e-10;

    if (!((area  <=  eps1) || (alpha <  -eps2) || (beta  <  -eps2) || (gamma <  -eps2) || (t <= 0.0)))
    {
        if (t < last.t)
        {
            return HitPayload (
                tri.Colour,
                ray.Origin + ray.Direction * t,
                normalize(cross(u, v)),
                vec2(0.0, 0.0),
                t,
                t,
                tri.Material,
                vec3(0.0, 0.0, 0.0));
        }
    }

    return last;
}

HitPayload IntersectRayCylinder(Ray ray, HitPayload last, Cylinder cylinder)
{
    float a = (ray.Direction.x * ray.Direction.x) + (ray.Direction.z * ray.Direction.z);
    float b = 2.0 * (ray.Direction.x * (ray.Origin.x - cylinder.Position.x) + ray.Direction.z * (ray.Origin.z - cylinder.Position.z));
    float c = 
        (ray.Origin.x - cylinder.Position.x) 
        * 
        (ray.Origin.x - cylinder.Position.x) 
        + 
        (ray.Origin.z - cylinder.Position.z) 
        * 
        (ray.Origin.z - cylinder.Position.z) 
        -
        (cylinder.Size.x * cylinder.Size.x);
    
    float d = b * b - 4.0 * (a * c);

    if (abs(d) < 0.001) return last;
    if (d < 0.0) return last;

    float t0 = (-b - sqrt(d)) / (2.0 * a);
    float t1 = (-b + sqrt(d)) / (2.0 * a);

    float r = ray.Origin.y + t0 * ray.Direction.y;
    if (r >= cylinder.Position.y && r <= cylinder.Position.y + cylinder.Size.y && t0 < last.t)
    {
        return HitPayload (
            cylinder.Colour,
            ray.Origin + ray.Direction * t0,
            vec3(0.0, 1.0, 0.0),
            vec2(0.0, 0.0),
            t0,
            t1,
            cylinder.Material,
            cylinder.Position);
    }

    r = ray.Origin.y + t1 * ray.Direction.y;
    if (r >= cylinder.Position.y && r <= cylinder.Position.y + cylinder.Size.y && t1 < last.t)
    {
        return HitPayload (
            cylinder.Colour,
            ray.Origin + ray.Direction * t1,
            vec3(0.0, 1.0, 0.0),
            vec2(0.0, 0.0),
            t1,
            t0,
            cylinder.Material,
            cylinder.Position);
    }

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
        vec4(0.0, 0.0, 0.0, 0.0),
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

    #if NUM_TRIANGLES > 0
    for (int i = 0; i < NUM_TRIANGLES * 3; i += 3)
    {
        Hit = IntersectRayTriangle(ray, Hit, Triangle(
            vec4(0.1, 0.1, 0.1, 1.0),
            TriangleVertexPositions[i + 0],
            TriangleVertexPositions[i + 1],
            TriangleVertexPositions[i + 2],
            vec3(1.0, 0.0, 0.0)
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

    #if NUM_CYLINDERS > 0
    for (int i = 0 ; i < NUM_CYLINDERS; ++i)
    {
        Hit = IntersectRayCylinder(ray, Hit, Cylinder(
            CylinderColours[i],
            CylinderPositions[i],
            CylinderSizes[i],
            CylinderMaterials[i]
        ));
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
            ShadowSample -= 0.75;
        }
    }

    #endif
    return saturate(ShadowSample);
}


vec3 ShadeDiffuse(HitPayload Hit)
{
    vec3 diffuse = vec3(0.0, 0.0, 0.0);
    
    // rasterize hit
    diffuse += Hit.Colour.rgb * 1.0;
    
    // one bounce
    Ray BounceRay = Ray(
        Hit.Position + Hit.Normal * 0.0001, 
        normalize(Hit.Normal - (randomDirection())));
    HitPayload BounceHit = TraceRay(BounceRay);
    diffuse += BounceHit.Colour.rgb * 1.0;

    // second bounce
    BounceRay = Ray(
        BounceHit.Position + BounceHit.Normal * 0.0001,
        normalize(BounceHit.Normal - (randomDirection())));
    BounceHit = TraceRay(BounceRay);
    diffuse += BounceHit.Colour.rgb * 1.0;

    return diffuse / 3.0;
}

vec3 ShadeReflective(HitPayload Hit, Ray InitialRay)
{
    if (Hit.Colour.a >= 2.0)
        return Hit.Colour.rgb;

    Ray BounceRay = Ray(
        Hit.Position + Hit.Normal * 0.001,
        reflect(InitialRay.Direction, Hit.Normal));
    Hit = TraceRay(BounceRay);

    return ShadeDiffuse(Hit) * Hit.Material.x;
}

vec3 ShadeLambertian(HitPayload Hit, Ray InitialRay)
{
    float Lighting = 0.2;
    for (int i = 0; i < NUM_AREA_LIGHTS; ++i)
    {
        #if NUM_AREA_LIGHTS > 0
            vec3 LightPosition = AreaLightPositions[i];
        #else
            vec3 LightPosition = vec3(0.0, 0.0, 0.0);
        #endif
        vec3 DirectionToLight = normalize(LightPosition - Hit.Position);
        Lighting += max(dot (DirectionToLight, Hit.Normal), 0.0);
    }
    return Hit.Colour.rgb * Lighting * Shadow(Hit);
}

`;