#version 300 es
layout(location=0) in vec3 position;
layout(location=1) in vec4 color;
layout(location=3) in vec3 normal;
layout(location=2) in vec2 texcoord; // We have a new attribute "texcoord" that contains the texture coordinates of the vertex

out vec2 v_texcoord; // We will pass the texture coordinates to the fragment shader
out vec4 vertColor;

out vec3 v_normal;
out vec3 v_view;

uniform mat4 M;
uniform mat4 M_it;
uniform mat4 VP;
uniform vec3 cam_position;

void main(){
    vec4 world = M * vec4(position, 1.0f);
    gl_Position = VP * world;
    vertColor=color;
    v_texcoord = texcoord; // pass the texture coordinates as is to the fragment shader

    v_normal = (M_it * vec4(normal, 0.0f)).xyz;
    v_view = cam_position - world.xyz;
}