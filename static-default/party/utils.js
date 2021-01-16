import * as THREE from '/deps/three/build/three.module.js';

export function createProjector(size, scene, listener) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(size * (16 / 9), size)
  );
  mesh.position.y = size / 2;
  group.add(mesh);

  const light = new THREE.PointLight(0xffffff, 100, size + 30);
  light.position.z = 30;
  light.position.y = size / 2;
  light.intensity = 3;
  group.add(light);

  const posSound = new THREE.PositionalAudio(listener);
  posSound.setRefDistance(50);
  posSound.setRolloffFactor(1.5);
  posSound.setDistanceModel('exponential');
  posSound.setDirectionalCone(120, 230, 0.2);
  posSound.rotation.y = Math.PI;
  mesh.add(posSound);

  const videoEl = document.createElement('video');
  videoEl.playsInline = true;
  videoEl.muted = true;
  posSound.setMediaElementSource(videoEl);

  const videoTexture = new THREE.VideoTexture(videoEl);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
  // videoTexture.offset.set(-0.25, 0);
  mesh.material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: videoTexture,
  });
  // videoEl.addEventListener('playing', () => {
  //   videoPanel.material.uniforms.aspect.value = videoEl.videoWidth / videoEl.videoHeight;
  //   head.add(videoPanel);
  // });
  // videoEl.addEventListener('paused', () => {
  //   head.remove(videoPanel);
  // });

  scene.add(group);
  return {
    group,
    setStream: (stream) => {
      videoEl.srcObject = stream;
      gestureWrangler.playVideo(videoEl);
      posSound.setMediaStreamSource(stream);
      posSound.source.connect(musicAnalyser);
    },
  };
}
