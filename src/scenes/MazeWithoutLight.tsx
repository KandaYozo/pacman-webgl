import { Scene } from '../common/game';
import ShaderProgram from '../common/shader-program';
import Mesh from '../common/mesh';
import * as MeshUtils from '../common/mesh-utils';
import Camera from '../common/camera';
import FlyCameraController from '../common/camera-controllers/fly-camera-controller';
import { vec3, mat4,quat, vec4 } from 'gl-matrix';
import { Vector, Selector, Color, NumberInput } from '../common/dom-utils';
import { createElement } from 'tsx-create-element';
import * as TextureUtils from '../common/texture-utils';
import {IntilizeTimer} from '../TimerScript';

interface Object3D {
    mesh: Mesh,
    modelMatrix: mat4,
    type:Number
};
// In this scene we will draw some monkeys with one directional light
export default class mazeWithoutLight extends Scene {
    program: ShaderProgram;
    camera: Camera;
    controller: FlyCameraController;
    meshes: {[name: string]: Mesh} = {};


     //zwdt hna 7gat global hn7tgha f kaza 7eta
     ballCurrentPosition:vec3= vec3.fromValues(0,1,0);
     orientationLeftAndRight=Math.PI/8;
     orientationUpAndDown=Math.PI/8;
     ballRadius=0.7;
     dmove = 0.15;
     totalCoins = 0;
     collectedCoins = 0;
    // This will store our material properties
    material = {
        diffuse: vec3.fromValues(0.5,0.3,0.1),
        specular: vec3.fromValues(1,1,1),
        ambient: vec3.fromValues(0.5,0.3,0.1),
        shininess: 20
    };

     // And we will store the objects here
     objects: {[name: string]: Object3D} = {};

    // And this will store our directional light properties
    light = {
        diffuse: vec3.fromValues(1,1,1),
        specular: vec3.fromValues(1,1,1),
        ambient: vec3.fromValues(0.1,0.1,0.1),
        direction: vec3.fromValues(-1,-1,-1)
    };

    textures: {[name: string]: WebGLTexture} = {};

    public load(): void {
        IntilizeTimer(0,10,false)
        // We need shader specifically designed to do directional lighting
        this.game.loader.load({
            ["vert"]:{url:'shaders/withoutLight.vert', type:'text'},
            ["frag"]:{url:'shaders/withoutLight.frag', type:'text'},
            ["suzanne"]:{url:'models/Suzanne/Suzanne.obj', type:'text'},
            ["sphere"]:{url:'models/Maze/sphere.obj', type:'text'},
            ["coin"]:{url:'models/Maze/coins.obj', type:'text'},
            ["Maze1"]:{url:'models/Maze/Maze.txt',type:'text'},
            ["ball"]:{url:'images/ball.png',type:'image'},
            ["brick"]:{url:'images/brick.png',type:'image'},
            ["concrete"]:{url:'images/concrete.png',type:'image'},
        });
    } 
    
    public start(): void {
        
        // Compile and Link the shader
        this.program = new ShaderProgram(this.gl);
        this.program.attach(this.game.loader.resources["vert"], this.gl.VERTEX_SHADER);
        this.program.attach(this.game.loader.resources["frag"], this.gl.FRAGMENT_SHADER);
        this.program.link();

        // Load the models
        this.meshes['ground'] = MeshUtils.Plane(this.gl, {min:[0,0], max:[100,100]});
        this.meshes['sphere'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["sphere"]);
        this.meshes['coin'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["coin"]);
        this.meshes['cube']=MeshUtils.Cube(this.gl);
        
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        //ball
        this.textures['ball-texture'] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['ball-texture']);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.game.loader.resources['ball']);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        // Instead of using a sampler, we send the parameter directly to the texture here.
        // While we prefer using samplers since it is a clear separation of responsibilities, anisotropic filtering is yet to be supported by sampler and this issue is still not closed on the WebGL github repository.  
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);

        //ground

        this.textures['ground-texture'] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['ground-texture']);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.game.loader.resources['concrete']);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        // Instead of using a sampler, we send the parameter directly to the texture here.
        // While we prefer using samplers since it is a clear separation of responsibilities, anisotropic filtering is yet to be supported by sampler and this issue is still not closed on the WebGL github repository.  
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);


        //blocks
        this.textures['block-texture'] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['block-texture']);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.game.loader.resources['brick']);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
       

        //  //hna y wael bn7ot el maze bngbha mn file asmo maze 1 mwgood fl models byb2a .txt we a7na bn2ra mno
         let mazeStr=this.game.loader.resources["Maze1"] as string;
         mazeStr=mazeStr.trim();
         let mazeArr=mazeStr.split(/\s+/);
 
         for(let i=0;i<mazeArr.length;i++)
         {
             const row=mazeArr[i];
             for(let j=0;j<row.length;j++)
             {
                 if(row[j]=='.')continue;
                 else if(row[j]=='o')
                 {
                    this.objects['sphere'] = {
                        mesh: this.meshes['sphere'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(),vec3.fromValues((i)*2, 1, j*2), vec3.fromValues(1, 1, 1)),
                        type:0
                    };
                    this.ballCurrentPosition=vec3.fromValues((i)*2, 1, j*2);
                 }
                 else if(row[j]=='#'){
                    this.objects['cube'+i+j]={
                        mesh:this.meshes['cube'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i)*2, 1, j*2), vec3.fromValues(1, 1, 1)),
                        type:1
                         }
                 }
                else
                {
                    this.totalCoins += 1;
                    this.objects['coin'+i+j]={
                        mesh:this.meshes['coin'],
                        modelMatrix: mat4.fromRotationTranslationScale(mat4.create(), quat.create(), vec3.fromValues((i)*2, 1, j*2), vec3.fromValues(1, 1, 1)),
                        type:2
                }
             }
             
            }
        }
 

        this.textures['white'] = TextureUtils.SingleColor(this.gl, [255, 255, 255, 255]);
        this.textures['black'] = TextureUtils.SingleColor(this.gl, [0, 0, 0, 255]);
        this.textures['yellow'] = TextureUtils.SingleColor(this.gl, [255, 255, 0, 255]);
        

        // Create a camera and a controller
        // this.camera = new Camera();
        // this.camera.type = 'perspective';
        // this.camera.position = vec3.fromValues(5,5,5);
        // this.camera.direction = vec3.fromValues(-1,-1,-1);
        // this.camera.aspectRatio = this.gl.drawingBufferWidth/this.gl.drawingBufferHeight;
        
        // this.controller = new FlyCameraController(this.camera, this.game.input);
        // this.controller.movementSensitivity = 0.01;

          this.camera = new Camera();
        this.camera.type = 'perspective';
        this.camera.position = vec3.add(this.camera.position,this.ballCurrentPosition,[0,10,0]);
        this.camera.direction = vec3.fromValues(0,-10,-1);
        this.camera.aspectRatio = this.gl.drawingBufferWidth/this.gl.drawingBufferHeight;
     
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
        this.gl.clearColor(0.1,0.1,0.1,1);

       // this.setupControls();
    }
    
    public draw(deltaTime: number): void {
        //this.controller.update(deltaTime); // Update camera

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); // Clear color and depth
        
        this.program.use(); // Start using the shader for directional light

        // Send the VP and camera position
        this.program.setUniformMatrix4fv("VP", false, this.camera.ViewProjectionMatrix);
        this.program.setUniform3f("cam_position", this.camera.position);
        
        // Send light properties (remember to normalize the light direction)
        this.program.setUniform3f("light.diffuse", this.light.diffuse);
        this.program.setUniform3f("light.specular", this.light.specular);
        this.program.setUniform3f("light.ambient", this.light.ambient);
        this.program.setUniform3f("light.direction", vec3.normalize(vec3.create(), this.light.direction));

        // Create model matrix for the ground
        let groundM = mat4.create();
        mat4.scale(groundM, groundM, [100, 1, 100]);

        // Send M for position and M inverse transpose for normals
        this.program.setUniformMatrix4fv("M", false, groundM);
        this.program.setUniformMatrix4fv("M_it", true, mat4.invert(mat4.create(), groundM));

        //send textures
        this.program.setUniform4f("tint", [1, 1, 1, 1]);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['ground-texture']);
        this.program.setUniform1i('texture_sampler', 0);
        // Send material properties
        this.program.setUniform3f("material.diffuse", [0.5,0.5,0.5]);
        this.program.setUniform3f("material.specular", [0.2,0.2,0.2]);
        this.program.setUniform3f("material.ambient", [0.1,0.1,0.1]);
        this.program.setUniform1f("material.shininess", 2);

        // Draw the ground
        this.meshes['ground'].draw(this.gl.TRIANGLES);

        // // Do the same for all the monkeys
        // for(let i = -1; i <= 1; i++){
        //     for(let j = -1; j <= 1; j++){
        //         let M = mat4.create();
        //         mat4.translate(M, M, [i*4, 1, j*4]);
        
        //         this.program.setUniformMatrix4fv("M", false, M);
        //         this.program.setUniformMatrix4fv("M_it", true, mat4.invert(mat4.create(), M));
        //         this.program.setUniform3f("material.diffuse", this.material.diffuse);
        //         this.program.setUniform3f("material.specular", this.material.specular);
        //         this.program.setUniform3f("material.ambient", this.material.ambient);
        //         this.program.setUniform1f("material.shininess", this.material.shininess);
        
        //         this.meshes['suzanne'].draw(this.gl.TRIANGLES);
        //     }
        // }
        for(let name in this.objects){
            let M = mat4.create();
            let obj = this.objects[name];
            this.program.setUniformMatrix4fv("M", false, obj.modelMatrix);
            this.program.setUniformMatrix4fv("M_it", true, mat4.invert(mat4.create(), M));
            // this.program.setUniform3f("material.diffuse",vec3.fromValues(1,1,1));
            // this.program.setUniform3f("material.specular", vec3.fromValues(1,1,1));
            // this.program.setUniform3f("material.ambient", vec3.fromValues(1,1,1));
            // this.program.setUniform1f("material.shininess", 255);

            if(obj.type==0)
            {
                this.program.setUniform4f("tint", [1, 1, 1, 1]);

                this.gl.activeTexture(this.gl.TEXTURE0);
                 this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['ball-texture']);
                this.program.setUniform1i('texture_sampler', 0);
            }
            else if(obj.type==1)
            {
                this.program.setUniform4f("tint", [1, 1, 1, 1]);
                this.gl.activeTexture(this.gl.TEXTURE0);
                 this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['block-texture']);
                this.program.setUniform1i('texture_sampler', 0);
            }
            else
            {
                this.program.setUniform4f("tint", [1, 1, 1, 1]);
                this.gl.activeTexture(this.gl.TEXTURE0);
                 this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures['yellow']);
                this.program.setUniform1i('texture_sampler', 0);
            }
            obj.mesh.draw(this.gl.TRIANGLES);
        }

        this.camera.position = vec3.add(this.camera.position,this.ballCurrentPosition,[0,10,0]);
//kora

        mat4.translate(this.objects["sphere"].modelMatrix,mat4.create() , this.ballCurrentPosition);
        let spherePosition=vec4.create();
        vec4.transformMat4(spherePosition,vec4.fromValues(0,0,0,1),this.objects['sphere'].modelMatrix);
        let topOfSphere = spherePosition[2]-this.ballRadius ;
        let bottomOfSphere = spherePosition[2]+this.ballRadius ;
        let leftOFSphere=spherePosition[0]-this.ballRadius;
        let rightOFSphere=spherePosition[0]+this.ballRadius;
        if(this.game.input.isKeyDown("a"))
        {
            let hit=0
            for(let name in this.objects){
                let M = mat4.create();
                let obj = this.objects[name];
                if(obj.type == 0)continue;
                else if (obj.type == 1){
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                    let rightOFObject : Number = objectPosition[0]+1.0;
                    let leftOfObject : Number = objectPosition[0]-1.0;
                    let zCheck = false;
                    
                    if((leftOFSphere-this.dmove)>leftOfObject && (leftOFSphere-this.dmove)<rightOFObject )
                    {
                        let bottomOfObject : Number = objectPosition[2] + 1.0;
                        let topOfObject : Number = objectPosition[2] - 1.0;
                        
                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject))
                        {
                            didHit = true;
                        }
                        
                        if(didHit)
                        {
                            hit=1;
                            break;
                        }
                        
                    }
                }
                else
                {
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                    let rightOFObject : Number = objectPosition[0]+0.8;
                    let leftOfObject : Number = objectPosition[0]-0.8;
                    let zCheck = false;
                    
                    if((leftOFSphere-this.dmove)>leftOfObject && (leftOFSphere-this.dmove)<rightOFObject )
                    {
                        let bottomOfObject : Number = objectPosition[2] + 0.7;
                        let topOfObject : Number = objectPosition[2] - 0.7;
                        
                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject))
                        {
                            didHit = true;
                        }
                        
                        if(didHit)
                        {
                            //hit=1;
                            this.collectedCoins += 1;
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins)
                            {
                                this.ShowWinPopup()
                                console.log("I WON the game !!!");
                            }
                            break;
                        }
                        
                    }
                }
            }
            if(hit==0)
            {
                this.ballCurrentPosition[0]-=this.dmove;
                this.orientationLeftAndRight+=Math.PI/8;
                mat4.rotateZ(this.objects['sphere'].modelMatrix,this.objects['sphere'].modelMatrix, this.orientationLeftAndRight);
            }
         }


        if(this.game.input.isKeyDown("s"))
        {
            let hit=0
            for(let name in this.objects){
                let M = mat4.create();
                let obj = this.objects[name];
                if(obj.type == 0) continue;
                else if(obj.type == 1){
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                   
                    let zCheck = false;
                    let bottomOfObject : Number = objectPosition[2] + 1.0;
                    let topOfObject : Number = objectPosition[2] - 1.0;
                    if((bottomOfSphere+this.dmove)>topOfObject && (bottomOfSphere+this.dmove)<bottomOfObject )
                    {
                        let rightOFObject : Number = objectPosition[0]+1.0;
                        let leftOfObject : Number = objectPosition[0]-1.0;
                        
                        let didHit = false;
                        if ((leftOFSphere <rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject))
                        {
                            didHit = true;
                           
                        }
                        
                        if(didHit)
                        {
                            hit=1;
                            break;
                        }
                        
                    }
                }
                else
                {
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                   
                    let zCheck = false;
                    let bottomOfObject : Number = objectPosition[2] + 0.7;
                    let topOfObject : Number = objectPosition[2] - 0.7;
                    if((bottomOfSphere+this.dmove)>topOfObject && (bottomOfSphere+this.dmove)<bottomOfObject )
                    {
                        let rightOFObject : Number = objectPosition[0]+0.8;
                        let leftOfObject : Number = objectPosition[0]-0.8;
                        
                        let didHit = false;
                        if ((leftOFSphere <rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject))
                        {
                            didHit = true;
                           
                        }
                        
                        if(didHit)
                        {
                            //hit=1;
                            this.collectedCoins += 1;
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins)
                            {
                                this.ShowWinPopup()
                                console.log("I WON the game !!!");
                            }
                            break;
                        }
                        
                    }
                }
            }
            

            if(hit==0)
            {
                this.ballCurrentPosition[2]+=this.dmove;
                this.orientationUpAndDown+=Math.PI/8;
                mat4.rotateX(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationUpAndDown);
               // this.orientationLeftAndRight+=Math.PI/8;
           }
        }


        if(this.game.input.isKeyDown("w"))
        {
            let hit=0
            for(let name in this.objects){
                let M = mat4.create();
                let obj = this.objects[name];
                if(obj.type==0)continue;
                else if(obj.type==1){
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                   
                    let zCheck = false;
                    let bottomOfObject : Number = objectPosition[2] + 1.0;
                    let topOfObject : Number = objectPosition[2] - 1.0;
                    if((topOfSphere-this.dmove)>topOfObject && (topOfSphere-this.dmove)<bottomOfObject )
                    {
                        let rightOFObject : Number = objectPosition[0]+1.0;
                        let leftOfObject : Number = objectPosition[0]-1.0;
                        
                        let didHit = false;
                        if ((leftOFSphere <rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject))
                        {
                            didHit = true;
                        }
                        
                        if(didHit)
                        {
                            hit=1;
                            break;
                        }
                        
                    }
                }
                else
                {
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                   
                    let bottomOfObject : Number = objectPosition[2] + 0.7;
                    let topOfObject : Number = objectPosition[2] - 0.7;

                    if((topOfSphere-this.dmove)>topOfObject && (topOfSphere-this.dmove)<bottomOfObject )
                    {
                        let rightOFObject : Number = objectPosition[0]+0.8;
                        let leftOfObject : Number = objectPosition[0]-0.8;
                        
                        let didHit = false;
                        if ((leftOFSphere <rightOFObject && leftOFSphere > leftOfObject) || (rightOFSphere > leftOfObject && rightOFSphere < rightOFObject))
                        {
                            didHit = true;
                        }
                        
                        if(didHit)
                        {
                           this.collectedCoins += 1;
                           delete this.objects[name];
                           console.log("Collected coins = " + this.collectedCoins);
                           if (this.collectedCoins == this.totalCoins)
                           {
                            this.ShowWinPopup()
                                console.log("I WON the game !!!");
                           }
                           break;
                        }
                        
                    }
                }
            }
            if (hit == 0)
            {
                this.ballCurrentPosition[2]-=this.dmove;
                this.orientationUpAndDown-=Math.PI/8;
               // this.orientationLeftAndRight-=Math.PI/8;
               mat4.rotateX(this.objects['sphere'].modelMatrix, this.objects['sphere'].modelMatrix, this.orientationUpAndDown);
            }
        }


        if(this.game.input.isKeyDown("d"))
        {
            let hit=0
            for(let name in this.objects){
                let M = mat4.create();
                let obj = this.objects[name];
                if(obj.type == 0)continue;
                else if (obj.type == 1){
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                    let rightOFObject : Number = objectPosition[0]+1.0;
                    let leftOfObject : Number = objectPosition[0]-1.0;
                    
                    if((rightOFSphere+this.dmove)>leftOfObject && (rightOFSphere+this.dmove)<rightOFObject )
                    {
                       
                        let bottomOfObject : Number = objectPosition[2] + 1.0;
                        let topOfObject : Number = objectPosition[2] - 1.0;
                 
                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject))
                        {
                            didHit = true;
                         
                        }
                        
                        if(didHit)
                        {
                            hit=1;
                            break;
                        }
                    }
                }
                else
                {
                    let objectPosition=vec4.create();
                    vec4.transformMat4(objectPosition,vec4.fromValues(0,0,0,1),obj.modelMatrix);
                    let rightOFObject : Number = objectPosition[0]+0.8;
                    let leftOfObject : Number = objectPosition[0]-0.8;
                    
                    if((rightOFSphere+this.dmove)>leftOfObject && (rightOFSphere+this.dmove)<rightOFObject )
                    {
                       
                        let bottomOfObject : Number = objectPosition[2] + 0.7;
                        let topOfObject : Number = objectPosition[2] - 0.7;
                 
                        let didHit = false;
                        if ((topOfSphere < bottomOfObject && topOfSphere > topOfObject) || (bottomOfSphere > topOfObject && bottomOfSphere < bottomOfObject))
                        {
                            didHit = true;
                         
                        }
                        
                        if(didHit)
                        {
                            //hit=1;
                            this.collectedCoins += 1;
                            delete this.objects[name];
                            console.log("Collected coins = " + this.collectedCoins);
                            if (this.collectedCoins == this.totalCoins)
                            {
                                this.ShowWinPopup()
                               console.log("I WON the game !!!");
                            }
                            break;
                        }
                    }
                }
            }
            if(hit==0)
            {
                this.ballCurrentPosition[0]+=this.dmove;
                this.orientationLeftAndRight-=Math.PI/8;
                mat4.rotateZ(this.objects['sphere'].modelMatrix,this.objects['sphere'].modelMatrix, this.orientationLeftAndRight);
            }
        }
        

    }
    
    public end(): void {
        this.program.dispose();
        this.program = null;
        for(let key in this.meshes)
            this.meshes[key].dispose();
        this.meshes = {};
      //  this.clearControls();
    }

    public ShowWinPopup() {
        IntilizeTimer(0,10,true);
        document.getElementById("congratsbutton").click()
    }

   


}