import * as THREE from '../deps/three/build/three.module.js';
import { GLTFLoader } from '../deps/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './meshopt.js';

const gltfLoader = new GLTFLoader();

export default async function buildOther(scene) {
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
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

  gltfLoader.load('/assets/deer/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    //mesh.position.setX(2500);

    mesh.position.setZ(-550);
    mesh.position.setX(-75);
    mesh.rotateZ(-Math.PI / 4);
    //mesh.scale.set(.008,.008,.008)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
   });

  gltfLoader.load('/assets/tree/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    //mesh.position.setX(2500);
    mesh.position.setZ(-550);
    mesh.position.setX(-111);
    //mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(120,120,120)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});

    const clone1 = gltf.scene.clone();
    const clone2 = gltf.scene.clone();

    clone1.position.setZ(-750);
    clone1.position.setX(180);    

    clone2.position.setZ(-850);
    clone2.position.setX(430);
    
    clone1.scale.set(.4, .4, .4);
    clone2.scale.set(.2, .2, .2);
    clone1.rotateY(-Math.PI / 2);
    clone2.rotateY(Math.PI / 2);
    
    scene.add(mesh);
    scene.add(clone1);
    scene.add(clone2);
  });



  gltfLoader.load('/assets/cake2/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.position.setX(400);
    mesh.position.setZ(-1000);
    //mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(.005,.005,.005)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });

  gltfLoader.load('/assets/kat/scene2.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.position.setX(-500);
    mesh.position.setZ(-1250);
    //mesh.rotateZ(-Math.PI / 2);
    mesh.scale.set(.005, .005, .005)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});
    
    scene.add(mesh);
  });

  gltfLoader.load('/assets/diglett/scene.gltf', (gltf) => {
    const mesh = gltf.scene.children[0];

    mesh.position.setX(400);
    mesh.position.setZ(-800);
    mesh.rotateZ(-Math.PI / 2);

    const clone = gltf.scene.clone();

    mesh.scale.set(10,10,10)

    mesh.traverse(n => { if ( n.isMesh ) {
      n.castShadow = true; 
      //n.receiveShadow = true;
      if(n.material.map) n.material.map.anisotropy = 16; 
    }});

    clone.position.setX(-50);
    
    scene.add(mesh);
    scene.add(clone);
  });
}
