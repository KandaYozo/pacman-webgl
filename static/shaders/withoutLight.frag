#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_view;

out vec4 color;
in vec4 vertColor;

in vec2 v_texcoord; // texture coordinates received from the vertex shader
uniform vec4 tint;
uniform sampler2D texture_sampler; // the sampler using which we will sample colors from the texture 
struct Material {
    vec3 diffuse;
    vec3 specular;
    vec3 ambient;
    float shininess;
};
uniform Material material;

struct DirectionalLight {
    vec3 diffuse;
    vec3 specular;
    vec3 ambient;
    vec3 direction;
};
uniform DirectionalLight light;

float diffuse(vec3 n, vec3 l){
    //Diffuse (Lambert) term computation: reflected light = cosine the light incidence angle on the surface
    //max(0, ..) is used since light shouldn't be negative
    return max(0.0f, dot(n,l));
}

float specular(vec3 n, vec3 l, vec3 v, float shininess){
    //Phong Specular term computation
    return pow(max(0.0f, dot(v,reflect(-l, n))), shininess);
}

void main(){
    vec3 n = normalize(v_normal);
    vec3 v = normalize(v_view);
    vec3 l = -light.direction; // For directional lights, the light vector is the inverse of the light direction
    color = vec4(
        material.ambient*light.ambient + 
        material.diffuse*light.diffuse*diffuse(n, l) + 
        material.specular*light.specular*specular(n, l, v, material.shininess),
        1.0f
    );

    color = texture(texture_sampler, v_texcoord) * vertColor * tint;
}