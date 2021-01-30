import * as THREE from '../deps/three/build/three.module.js';
import { GLTFLoader } from '../deps/three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

export default async function buildOther(scene) {
  gltfLoader.load('/assets/cake/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    //mesh.position.setX(2500);
    mesh.position.setY(3.2);
    mesh.position.setZ(-550);
    //mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(.008,.008,.008)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });

  gltfLoader.load('/assets/cake2/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.position.setX(1000);
    mesh.position.setZ(-1000);
    //mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(.7,.7,.7)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });
}
