import * as THREE from '../deps/three/build/three.module.js';
import { GLTFLoader } from '../deps/three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

export default async function buildBarn(scene) {
  gltfLoader.load('/assets/barn/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.position.setY(30);
    mesh.position.setZ(-550);
    mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(30,30,30);

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });

  buildTables(scene);
  buildFloor(scene);
  buildRug(scene);

  const mixer = await buildFlags(scene);
  return { mixer };
}

function buildFloor(scene) {
  const tex = new THREE.TextureLoader().load('/assets/stone.jpg');
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5,5);
  
  const geom = new THREE.PlaneGeometry(163, 134, 64);
  const mat = new THREE.MeshStandardMaterial({map: tex, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geom, mat);
  plane.rotation.x = Math.PI / 2;
  plane.rotation.z = -Math.PI / 2;
  plane.position.y = 0.05;
  plane.position.z = -550;
  
  plane.receiveShadow = true;
  scene.add(plane);
}

function buildTables(scene) {
  gltfLoader.load('/assets/woodtable/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.scale.set(4.2, 4.2, 4.2);
    mesh.position.setZ(-550);

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true;
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);

    const light = new THREE.SpotLight( 0xffffff, 1, 0, .4, 0.3);
    light.position.setX(-30);
    light.position.setY(30);
    light.position.setZ(-551);
    light.target = mesh;
    light.castShadow = true;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;
    //light.shadow.bias = 0.1;
    scene.add(light);

    const light2 = new THREE.SpotLight( 0xffffff, 1, 0, .4, 0.3);
    light2.position.setX(30);
    light2.position.setY(30);
    light2.position.setZ(-551);
    light2.target = mesh;
    light2.castShadow = true;
    light2.shadow.camera.near = 10;
    light2.shadow.camera.far = 100;
    //light2.shadow.bias = 0.1;
    scene.add(light2);
  });
}

async function buildFlags(scene) {
  const gltf = await gltfLoader.loadAsync('/assets/gyroflagpole.glb');
  
  gltf.scene.scale.set(20, 20, 20)
  //gltf.scene.rotateY(Math.PI / 2)
  gltf.scene.position.x = -40;
  gltf.scene.position.y = 50;
  gltf.scene.position.z = -440;

  const clone = gltf.scene.clone();
  clone.position.x = 50;

  const grp = new THREE.AnimationObjectGroup(gltf.scene, clone);

  const mixer = new THREE.AnimationMixer(grp);
  gltf.animations.forEach( ( clip ) => {
    mixer.clipAction( clip ).play();
  } );


  scene.add(gltf.scene);
  scene.add(clone);

  return mixer;
}

function buildRug(scene) {
  gltfLoader.load('/assets/rug/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.scale.set(0.08, 0.08, 0.04);
    mesh.position.y = 0.01;
    mesh.position.setZ(-550);
    mesh.rotateZ(-Math.PI / 2);

    //mesh.rotateZ(Math.PI / 2);
    mesh.traverse(n => { if ( n.isMesh ) {
      n.receiveShadow = true; 
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });
}


