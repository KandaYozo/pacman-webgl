import { Scene } from '../common/game';
import ShaderProgram from '../common/shader-program';
import Mesh from '../common/mesh';
import * as MeshUtils from '../common/mesh-utils';
import Camera from '../common/camera';
import FlyCameraController from '../common/camera-controllers/fly-camera-controller';
import { vec3, mat4, quat, vec4 } from 'gl-matrix';
import { Vector, Selector, Color, NumberInput } from '../common/dom-utils';
import { createElement } from 'tsx-create-element';
import * as TextureUtils from '../common/texture-utils';
import {IntilizeTimer, IntilizeCoins} from '../TimerScript';
interface Material {
    albedo: WebGLTexture,
    albedo_tint: vec3,
    specular: WebGLTexture,
    specular_tint: vec3
    roughness: WebGLTexture,
    roughness_scale: number,
    ambient_occlusion: WebGLTexture,
    emissive: WebGLTexture,
    emissive_tint: vec3
};
interface Object3D {
    mesh: Mesh,
    modelMatrix: mat4,
    type: Number,
    material: Material
};

interface PointLight {
    type: 'point',
    color: vec3,
    position: vec3,
    attenuation_quadratic: number,
    attenuation_linear: number,
    attenuation_constant: number
};


// In this scene we will draw some monkeys with one directional light
export default class mazePoint extends Scene {
    program: ShaderProgram;
    camera: Camera;
    controller: FlyCameraController;
    meshes: { [name: string]: Mesh } = {};
    samplers: { [name: string]: WebGLSampler } = {};
    textures: { [name: string]: WebGLTexture } = {};
    light: PointLight = { type: 'point', color: vec3.fromValues(1, 1, 1), position: vec3.fromValues(+6, +1, +0), attenuation_quadratic: 0, attenuation_linear: 0.2, attenuation_constant: 0 };
    //zwdt hna 7gat global hn7tgha f kaza 7eta
    ballCurrentPosition: vec3 = vec3.fromValues(0, 1, 0);
    ballCurrentOrientation: vec3 = vec3.fromValues(0, 0, 0);
    orientationLeftAndRight = Math.PI / 8;
    orientationUpAndDown = Math.PI / 8;
    ballRadius = 0.7;
    dmove = 0.15;
    totalCoins = 0;
    YouWin = false;
    collectedCoins = 0;
    currentAngle = 0;
    slope_N = 10;

    // And we will store the objects here
    objects: { [name: string]: Object3D } = {};

    //  //38.57
    // ball_slopeDict: {[angle: number]: number} = {
    //     [38] : -1.25396, // 17.52376
    //     [77] : -0.22824,
    //     [115] : 0.4815746,
    //     [154] : 2.076521397,
    //     [192] : -4.381286,
    //     [231] : -0.79747,
    //     [269] : 0,
    //     [270] : 0,
    //     [308] : 0.79747,
    //     [347] : 4.381286
    // };
    gameover = false
    ball_slopeArr = [
        0,
        -1.25396,
        0.22824,
        0.4815746,
        2.076521397,
        -4.381286,
        -0.79747,
        0,
        0.79747,
        4.381286
    ];


    public load(): void {
        // We need shader specifically designed to do directional lighting

        this.game.loader.load({
            ["vert"]: { url: 'shaders/phong/single-light/directional.vert', type: 'text' },
            ["frag"]: { url: 'shaders/phong/single-light/directional.frag', type: 'text' },
            ["suzanne"]: { url: 'models/Suzanne/Suzanne.obj', type: 'text' },
            ["sphere"]: { url: 'models/Maze/sphere.obj', type: 'text' },
            ["wall"]: { url: 'models/wall/wall.obj', type: 'text' },
            ["coin2"]: { url: 'models/coin/coin.obj', type: 'text' },
            ["coin"]: { url: 'models/Maze/coins.obj', type: 'text' },
            ["Maze1"]: { url: 'models/Maze/Maze.txt', type: 'text' },
            ['ghost']:{url:'models/ghost/blue/MazeGhostDarkBlue.obj', type:'text'},
            ["ball"]: { url: 'images/ball.png', type: 'image' },
            ["brick"]: { url: 'images/brick.png', type: 'image' },
            ['ghostTex']:{url:'models/ghost/blue/MGhost_text.png', type:'image'},
            ["concrete"]: { url: 'images/concrete.png', type: 'image' },
            ["walltex"]: { url: 'models/wall/wall.png', type: 'image' },
            ["cointex"]: { url: 'models/coin/coin.png', type: 'image' },
            ["pacmantex"]: { url: 'models/pacman/pacman.png', type: 'image' },
        });
    }

    public start(): void {
        IntilizeTimer(0,1000,false);
        IntilizeCoins(0);
        // Compile and Link the shader
        this.program = new ShaderProgram(this.gl);
        this.program.attach(this.game.loader.resources["vert"], this.gl.VERTEX_SHADER);
        this.program.attach(this.game.loader.resources["frag"], this.gl.FRAGMENT_SHADER);
        this.program.link();

        // Load the models
        this.meshes['ground'] = MeshUtils.Plane(this.gl, { min: [0, 0], max: [100, 100] });
        this.meshes['sphere'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["sphere"]);
        this.meshes['coin'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["coin"]);
        this.meshes['coin2'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["coin2"]);
        this.meshes['ghost'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["ghost"]);
        //this.meshes['wall'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["wall"]);
        this.meshes['cube'] = MeshUtils.Cube(this.gl);

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        //ball
        this.textures['ball-texture'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['ball']);
        //ghost
        this.textures['ghostTex'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['ghostTex']);
        //ground
        this.textures['ground-texture'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['concrete']);
        //blocks
        this.textures['brick-texture'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['brick']);
        this.textures['pacmantex'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['pacmantex']);
        // texture colors
        this.textures['white'] = TextureUtils.SingleColor(this.gl, [255, 255, 255, 255]);
        this.textures['black'] = TextureUtils.SingleColor(this.gl, [0, 0, 0, 255]);
        this.textures['yellow'] = TextureUtils.SingleColor(this.gl, [255, 255, 0, 255]);
        this.textures['grey'] = TextureUtils.SingleColor(this.gl, [128, 128, 128, 255]);
        this.textures['blue'] = TextureUtils.SingleColor(this.gl, [0, 0, 255, 255]);
        this.textures['red'] = TextureUtils.SingleColor(this.gl, [255, 0, 0, 255]);



        //ground

        this.objects['ground'] = {
            mesh: this.meshes['ground'],
            modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues(0, 0, 0), vec3.fromValues(100, 1, 100)),
            type: 3,
            material: {
                albedo: this.textures['ground-texture'],
                albedo_tint: vec3.fromValues(1, 1, 1),
                specular: this.textures['black'],
                specular_tint: vec3.fromValues(1, 1, 1),
                roughness: this.textures['grey'],
                roughness_scale: 1,
                emissive: this.textures['black'],
                emissive_tint: vec3.fromValues(1, 1, 1),
                ambient_occlusion: this.textures['white']
            }
        };
        //Read from texure file
        let mazeStr = this.game.loader.resources["Maze1"] as string;
        mazeStr = mazeStr.trim();
        let mazeArr = mazeStr.split(/\s+/);

        for (let i = 0; i < mazeArr.length; i++) {
            const row = mazeArr[i];
            for (let j = 0; j < row.length; j++) {
                if (row[j] == '.') continue;
                else if (row[j] == 'o') {
                    this.objects['sphere'] = {
                        mesh: this.meshes['sphere'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 0,
                        material: {
                            albedo: this.textures['ball-texture'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['black'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['grey'],
                            roughness_scale: 1,
                            emissive: this.textures['black'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['white']
                        }
                    };
                    this.ballCurrentPosition = vec3.fromValues((i) * 2, 1, j * 2);
                }
                else if (row[j] == '#') {
                    this.objects['cube' + i + j] = {
                        mesh: this.meshes['cube'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 1,
                        material: {
                            albedo: this.textures['blue'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['black'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['grey'],
                            roughness_scale: 1,
                            emissive: this.textures['black'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['walltex']
                        }
                    }
                }
                else if(row[j] == '*') {
                    this.totalCoins += 1;
                    this.objects['coin' + i + j] = {
                        mesh: this.meshes['coin2'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 2,
                        material: {
                            albedo: this.textures['yellow'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['black'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['grey'],
                            roughness_scale: 1,
                            emissive: this.textures['black'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['white']
                        }
                    }
                }
                else if(row[j] == 'X') {
                    this.objects['ghost'] = {
                        mesh: this.meshes['coin'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 4,
                        material: {
                            albedo: this.textures['red'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['red'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['red'],
                            roughness_scale: 1,
                            emissive: this.textures['red'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['ghostTex']
                        }
                    }
                }
                else if(row[j] == 'Y') {
                    this.objects['ghost'] = {
                        mesh: this.meshes['coin'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 4,
                        material: {
                            albedo: this.textures['blue'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['blue'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['blue'],
                            roughness_scale: 1,
                            emissive: this.textures['blue'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['ghostTex']
                        }
                    }
                }
                else if(row[j] == 'Z') {
                    this.objects['ghost'] = {
                        mesh: this.meshes['coin'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 4,
                        material: {
                            albedo: this.textures['white'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['white'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['white'],
                            roughness_scale: 1,
                            emissive: this.textures['white'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['ghostTex']
                        }
                    }
                }
                else {
                    this.objects['ghost'] = {
                        mesh: this.meshes['coin'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i) * 2, 1, j * 2), vec3.fromValues(1, 1, 1)),
                        type: 4,
                        material: {
                            albedo: this.textures['yellow'],
                            albedo_tint: vec3.fromValues(1, 1, 1),
                            specular: this.textures['yellow'],
                            specular_tint: vec3.fromValues(1, 1, 1),
                            roughness: this.textures['yellow'],
                            roughness_scale: 1,
                            emissive: this.textures['yellow'],
                            emissive_tint: vec3.fromValues(1, 1, 1),
                            ambient_occlusion: this.textures['ghostTex']
                        }
                    }
                }

            }
        }


        // Create a regular sampler for textures rendered on the scene objects
        this.samplers['regular'] = this.gl.createSampler();
        this.gl.samplerParameteri(this.samplers['regular'], this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.samplerParameteri(this.samplers['regular'], this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.samplerParameteri(this.samplers['regular'], this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.samplerParameteri(this.samplers['regular'], this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);



        this.camera = new Camera();
        this.camera.type = 'perspective';
        this.camera.position = vec3.add(this.camera.position, this.ballCurrentPosition, [0, 10, 0]);
        //this.camera.up=vec3.fromValues(0,0,1);
        this.camera.direction = vec3.fromValues(0, -10, -1);
        this.camera.aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;

        this.controller = new FlyCameraController(this.camera, this.game.input);
        this.controller.movementSensitivity = 0.01;


        // As usual, we enable face culling and depth testing
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.frontFace(this.gl.CCW);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        // We don't need blending
        this.gl.disable(this.gl.BLEND);

        // Use a dark grey clear color
        this.gl.clearColor(0.1, 0.1, 0.1, 1);

        // this.setupControls();
    }

    public draw(deltaTime: number): Boolean {
        //this.controller.update(deltaTime); // Update camera

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); // Clear color and depth

        this.program.use(); // Start using the shader for directional light

        // Send the VP and camera position
        this.program.setUniformMatrix4fv("VP", false, this.camera.ViewProjectionMatrix);
        this.program.setUniform3f("cam_position", this.camera.position);

        // Send light properties
        this.program.setUniform3f(`light.color`, this.light.color);
        this.program.setUniform3f(`light.position`, this.camera.position);
        this.program.setUniform1f(`light.attenuation_quadratic`, this.light.attenuation_quadratic);
        this.program.setUniform1f(`light.attenuation_linear`, this.light.attenuation_linear);
        this.program.setUniform1f(`light.attenuation_constant`, this.light.attenuation_constant);


        for (let name in this.objects) {
            let M = mat4.create();
            let obj = this.objects[name];
            this.program.setUniformMatrix4fv("M", false, obj.modelMatrix);
            this.program.setUniformMatrix4fv("M_it", true, mat4.invert(mat4.create(), obj.modelMatrix));

            // Send material properties and bind the textures
            this.program.setUniform3f("material.albedo_tint", obj.material.albedo_tint);
            this.program.setUniform3f("material.specular_tint", obj.material.specular_tint);
            this.program.setUniform3f("material.emissive_tint", obj.material.emissive_tint);
            this.program.setUniform1f("material.roughness_scale", obj.material.roughness_scale);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.material.albedo);
            this.gl.bindSampler(0, this.samplers['regular']);
            this.program.setUniform1i("material.albedo", 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.material.specular);
            this.gl.bindSampler(1, this.samplers['regular']);
            this.program.setUniform1i("material.specular", 1);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.material.roughness);
            this.gl.bindSampler(2, this.samplers['regular']);
            this.program.setUniform1i("material.roughness", 2);

            this.gl.activeTexture(this.gl.TEXTURE3);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.material.emissive);
            this.gl.bindSampler(3, this.samplers['regular']);
            this.program.setUniform1i("material.emissive", 3);

            this.gl.activeTexture(this.gl.TEXTURE4);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.material.ambient_occlusion);
            this.gl.bindSampler(4, this.samplers['regular']);
            this.program.setUniform1i("material.ambient_occlusion", 4);

            obj.mesh.draw(this.gl.TRIANGLES);
        }

        this.camera.position = vec3.add(this.camera.position, this.ballCurrentPosition, [0, 10, 0]);
        //kora

        mat4.translate(this.objects["sphere"].modelMatrix, mat4.create(), this.ballCurrentPosition);
        let spherePosition = vec4.create();
        vec4.transformMat4(spherePosition, vec4.fromValues(0, 0, 0, 1), this.objects['sphere'].modelMatrix);
        let topOfSphere = spherePosition[2] - this.ballRadius;
        let bottomOfSphere = spherePosition[2] + this.ballRadius;
        let leftOFSphere = spherePosition[0] - this.ballRadius;
        let rightOFSphere = spherePosition[0] + this.ballRadius;
        if (this.game.input.isKeyDown("a")) {
            let hit = 0
            for (let name in this.objects) {
                let M = mat4.create();
                let obj = this.objects[name];
                if (obj.type == 0) continue;
                else if (obj.type == 1) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                        }

                        if (didHit) {
                            hit = 1;
                            break;
                        }

                    }
                }
                else if (obj.type == 4) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                        if (didHit) {
                            hit = 1;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                    }
                }
                else {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 0.8;
                    let leftOfObject: Number = objectPosition[0] - 0.8;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 0.7;
                        let topOfObject: Number = objectPosition[2] - 0.7;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                        }

                        if (didHit) {
                            //hit=1;
                            this.collectedCoins += 1;
                            IntilizeCoins(this.collectedCoins)
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins) {
                                this.ShowWinPopup()

                                console.log("I WON the game !!!");
                            }
                            break;
                        }

                    }
                }
            }
            if (hit == 0) {
                this.ballCurrentPosition[0] -= this.dmove;
                this.orientationLeftAndRight += Math.PI / 12;
                //console.log("Ball x = " + this.ballCurrentPosition[0]);
                //let yAxis_custom = Math.cos(this.getRadian(this.ballCurrentPosition[0] * 100.0));
                //console.log("Y Axis = " + yAxis_custom);
                mat4.rotateY(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationLeftAndRight);
                //this.decrementAngle();
            } else {
                return this.gameover;
            }
        }


        if (this.game.input.isKeyDown("s")) {
            let hit = 0;
            for (let name in this.objects) {
                let M = mat4.create();
                let obj = this.objects[name];
                if (obj.type == 0) continue;
                else if (obj.type == 1) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);

                    let zCheck = false;
                    let bottomOfObject: Number = objectPosition[2] + 1.0;
                    let topOfObject: Number = objectPosition[2] - 1.0;
                    if ((bottomOfSphere + this.dmove) > topOfObject && (bottomOfSphere + this.dmove) < bottomOfObject) {
                        let rightOFObject: Number = objectPosition[0] + 1.0;
                        let leftOfObject: Number = objectPosition[0] - 1.0;

                        let didHit = false;
                        if ((leftOFSphere < rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject)) {
                            didHit = true;
                        }

                        if (didHit) {
                            hit = 1;
                            break;
                        }

                    }
                }
                else if (obj.type == 4) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                        if (didHit) {
                            hit = 1;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                    }
                }
                else {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);

                    let zCheck = false;
                    let bottomOfObject: Number = objectPosition[2] + 0.7;
                    let topOfObject: Number = objectPosition[2] - 0.7;
                    if ((bottomOfSphere + this.dmove) > topOfObject && (bottomOfSphere + this.dmove) < bottomOfObject) {
                        let rightOFObject: Number = objectPosition[0] + 0.8;
                        let leftOfObject: Number = objectPosition[0] - 0.8;

                        let didHit = false;
                        if ((leftOFSphere < rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject)) {
                            didHit = true;

                        }

                        if (didHit) {
                            //hit=1;
                            this.collectedCoins += 1;
                            IntilizeCoins(this.collectedCoins)
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins) {
                                console.log("I WON the game !!!");
                                this.ShowWinPopup()
                            }
                            break;
                        }

                    }
                }
            }


            if (hit == 0) {
                this.ballCurrentPosition[2] += this.dmove;
                this.orientationUpAndDown += Math.PI / 12;
                //this.orientationLeftAndRight = 0;
                // let yAxis_custom = Math.cos(this.getRadian(this.ballCurrentPosition[0] * 100.0));

                // if (yAxis_custom < 0)
                // {
                //     yAxis_custom = yAxis_custom*-1;
                // }
                //mat4.rotate(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationUpAndDown, [yAxis_custom, 0, 0]);
            } else {
                return this.gameover;
            }
        }


        if (this.game.input.isKeyDown("w")) {
            let hit = 0
            for (let name in this.objects) {
                let M = mat4.create();
                let obj = this.objects[name];
                if (obj.type == 0) continue;
                else if (obj.type == 1) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);

                    let zCheck = false;
                    let bottomOfObject: Number = objectPosition[2] + 1.0;
                    let topOfObject: Number = objectPosition[2] - 1.0;
                    if ((topOfSphere - this.dmove) > topOfObject && (topOfSphere - this.dmove) < bottomOfObject) {
                        let rightOFObject: Number = objectPosition[0] + 1.0;
                        let leftOfObject: Number = objectPosition[0] - 1.0;

                        let didHit = false;
                        if ((leftOFSphere < rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject)) {
                            didHit = true;
                        }

                        if (didHit) {
                            hit = 1;
                            break;
                        }
                    }
                }
                else if (obj.type == 4) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                        if (didHit) {
                            hit = 1;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                    }
                }
                else {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);

                    let bottomOfObject: Number = objectPosition[2] + 0.7;
                    let topOfObject: Number = objectPosition[2] - 0.7;

                    if ((topOfSphere - this.dmove) > topOfObject && (topOfSphere - this.dmove) < bottomOfObject) {
                        let rightOFObject: Number = objectPosition[0] + 0.8;
                        let leftOfObject: Number = objectPosition[0] - 0.8;

                        let didHit = false;
                        if ((leftOFSphere < rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject)) {
                            didHit = true;
                        }

                        if (didHit) {
                            this.collectedCoins += 1;
                            IntilizeCoins(this.collectedCoins)
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins) {
                                console.log("I WON the game !!!");
                                this.ShowWinPopup()
                            }
                            break;
                        }

                    }
                }
            }
            if (hit == 0) {
                this.ballCurrentPosition[2] -= this.dmove;
                this.orientationUpAndDown -= Math.PI / 12;
                //this.orientationLeftAndRight = 0;
                // let yAxis_custom = Math.cos(this.getRadian(this.ballCurrentPosition[0] * 100.0));

                // if (yAxis_custom < 0)
                // {
                //     yAxis_custom = yAxis_custom*-1;
                // }
                //mat4.rotate(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationUpAndDown, [yAxis_custom, 0, 0]);
            }else {
                return this.gameover;
            }
        }


        if (this.game.input.isKeyDown("d")) {
            let hit = 0
            for (let name in this.objects) {
                let M = mat4.create();
                let obj = this.objects[name];
                if (obj.type == 0) continue;
                else if (obj.type == 1) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;

                    if ((rightOFSphere + this.dmove) > leftOfObject && (rightOFSphere + this.dmove) < rightOFObject) {

                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;

                        }

                        if (didHit) {
                            hit = 1;
                            break;
                        }
                    }
                }
                else if (obj.type == 4) {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 1.0;
                    let leftOfObject: Number = objectPosition[0] - 1.0;
                    let zCheck = false;

                    if ((leftOFSphere - this.dmove) > leftOfObject && (leftOFSphere - this.dmove) < rightOFObject) {
                        let bottomOfObject: Number = objectPosition[2] + 1.0;
                        let topOfObject: Number = objectPosition[2] - 1.0;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                        if (didHit) {
                            hit = 1;
                            this.gameover = true;
                            console.log("I Lost the game !!!");
                            break;
                        }

                    }
                }
                else {
                    let objectPosition = vec4.create();
                    vec4.transformMat4(objectPosition, vec4.fromValues(0, 0, 0, 1), obj.modelMatrix);
                    let rightOFObject: Number = objectPosition[0] + 0.8;
                    let leftOfObject: Number = objectPosition[0] - 0.8;

                    if ((rightOFSphere + this.dmove) > leftOfObject && (rightOFSphere + this.dmove) < rightOFObject) {

                        let bottomOfObject: Number = objectPosition[2] + 0.7;
                        let topOfObject: Number = objectPosition[2] - 0.7;

                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject)) {
                            didHit = true;

                        }

                        if (didHit) {
                            //hit=1;
                            this.collectedCoins += 1;
                            IntilizeCoins(this.collectedCoins)
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins) {
                                this.ShowWinPopup()
                                console.log("I WON the game !!!");
                            }
                            break;
                        }
                    }
                }
            }
            if (hit == 0) {
                this.ballCurrentPosition[0] += this.dmove;
                this.orientationLeftAndRight -= Math.PI / 12;
                //console.log("Ball x = " + this.ballCurrentPosition[0]);
                //let yAxis_custom = Math.cos(this.getRadian(this.ballCurrentPosition[0] * 100.0));
                //console.log("Y Axis = " + yAxis_custom);
                mat4.rotateY(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationLeftAndRight);
                //this.incrementAngle();
            }else {
                return this.gameover;
            }
        }

        //mat4.rotateY(this.objects['sphere'].modelMatrix,this.objects['sphere'].modelMatrix, this.orientationLeftAndRight);
        mat4.rotateX(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationUpAndDown);
    }

    public end(): void {
        this.program.dispose();
        this.program = null;
        for (let key in this.meshes)
            this.meshes[key].dispose();
        this.meshes = {};
        //  this.clearControls();
    }

    public getRotationAxis(angle: number, xSphere: number, ySphere: number): vec3 {
        if (this.currentAngle == 0) {
            return vec3.fromValues(1, 0, 1);
        }
        let normals = this.ball_slopeArr[angle];
        let c = (ySphere - (xSphere * normals));
        let newy = (ySphere / c) - 1;
        let newx = (xSphere * normals / c) - 1;
        return vec3.fromValues(newx, 0, newy); // -0.4293462, -1.429346213
    }

    public incrementAngle() {
        this.currentAngle = (this.currentAngle + 1) % this.slope_N;
    }

    public decrementAngle() {
        this.currentAngle = (this.currentAngle - 1) % this.slope_N;
        if (this.currentAngle < 0) {
            this.currentAngle = this.slope_N - 1;
        }
    }

    public getRadian(degree: number): number {
        return (Math.PI * degree / 180.0)
    }
    public ShowWinPopup() {
        IntilizeTimer(0,1000,true);
        document.getElementById("congratsbutton").click()
    }

}