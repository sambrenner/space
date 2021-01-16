import * as THREE from '../deps/three/build/three.module.js';
import { GLTFLoader } from '../deps/three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

export default async function buildBarn(scene) {
  gltfLoader.load('/assets/barn/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.position.setY(30);
    mesh.scale.set(30,30,30);

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });

  buildLights(scene);
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
  plane.position.y = 0.05;
  plane.receiveShadow = true;
  scene.add(plane);
}

function buildLights(scene) {
  const light = new THREE.SpotLight( 0xffffff, 1, 0, .7, 0.3);
  light.position.setY(50);
  light.castShadow = true;
  light.shadow.camera.near = 10;
  light.shadow.camera.far = 100;
  light.shadow.bias = 0.0001;
  scene.add(light);
}

function buildTables(scene) {
  gltfLoader.load('/assets/longtable/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.scale.set(0.04, 0.04, 0.04);
    mesh.rotateZ(Math.PI / 2)
    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });
}

async function buildFlags(scene) {
  const gltf = await gltfLoader.loadAsync('/assets/gyroflagpole.glb');
  
  gltf.scene.scale.set(20, 20, 20)
  gltf.scene.rotateY(Math.PI / 2)
  gltf.scene.position.x = 120;
  gltf.scene.position.y = 50;
  gltf.scene.position.z = 40;
  

  const mixer = new THREE.AnimationMixer( gltf.scene );
  gltf.animations.forEach( ( clip ) => {
    mixer.clipAction( clip ).play();
  } );

  scene.add(gltf.scene);

  return mixer;
}

function buildRug(scene) {
  gltfLoader.load('/assets/rug/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.scale.set(0.08, 0.08, 0.04);
    mesh.position.y = 0.1;
    //mesh.rotateZ(Math.PI / 2);
    mesh.traverse(n => { if ( n.isMesh ) {
      n.receiveShadow = true; 
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });
}


