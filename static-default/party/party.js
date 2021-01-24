import * as THREE from '../deps/three/build/three.module.js';
import { BufferGeometryUtils } from '../deps/three/examples/jsm/utils/BufferGeometryUtils.js';
import Service from '../space/js/Service.js';
import RTCPeer from '../space/js/RTCPeer.js';
import RTCLoopback from '../space/js/RTCLoopback.js';
import { createStatsTracker } from '../space/js/createStatsTracker.js';
//import { createProjector } from './utils.js';
import buildBarn from './barn.js';

Service.get('docent', (docent) => {});

const hqs = location.hash
  .substr(1)
  .split('&')
  .filter((v) => v)
  .map((c) => c.split('=').map(decodeURIComponent))
  .reduce((params, [k, v]) => ((params[k] = v), params), {});

const stats = createStatsTracker();

const buildGlRoom = async (canvas, playerCanvas, config) => {
  const scene = new THREE.Scene();
  const playerScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60);
  camera.far = 10000;
  camera.rotation.order = 'YXZ';

  const listener = new THREE.AudioListener();

  const clock = new THREE.Clock();

  // Work around for missing echo cancellation on many kinds of audio:
  // https://crbug.com/687574
  if (navigator.userAgent.indexOf('Chrome') != -1) {
    const loopbackDestination = listener.context.createMediaStreamDestination();
    const loopbackEl = document.createElement('audio');
    const loopback = new RTCLoopback((stream) => {
      listener.gain.disconnect(listener.context.destination);
      listener.gain.connect(loopbackDestination);
      loopbackEl.srcObject = loopback.outputStream;
      gestureWrangler.playVideo(loopbackEl);
    });

    loopback.setInputStream(loopbackDestination.stream);
  }

  gestureWrangler.playAudioContext(listener.context);
  camera.add(listener);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.gammaOutput = true;
  renderer.setClearColor(new THREE.Color(0x0f5bff), 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  //renderer.physicallyCorrectLights = true;

  const hemiLight = new THREE.HemisphereLight();
  hemiLight.intensity = 0.2;
  scene.add(hemiLight);

  const light = new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 4, .3 );
  light.position.set( -1000, 1500, 1000 );

  light.castShadow = true;
  light.shadow.camera.near = 1200;
  light.shadow.camera.far = 2500;
  light.shadow.bias = 0.0001;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 1024;
  scene.add( light );
  
  const playerCamera = new THREE.PerspectiveCamera(30);
  playerCamera.rotation.order = 'YXZ';
  playerCamera.rotation.y = Math.PI;
  playerCamera.position.z -= 14;
  playerCamera.position.y -= -6;
  const playerRenderer = new THREE.WebGLRenderer({
    canvas: playerCanvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  });
  playerRenderer.setClearColor(renderer.clearColor);

  const guests = {};
  let mediaStream = null;

  const floor = new THREE.Mesh(
    new THREE.CircleBufferGeometry(100000),
    new THREE.MeshPhongMaterial({
      color: 0x094207,
      shininess: 20,
    })
  );
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  floor.rotation.order = 'YXZ';
  scene.add(floor);

  let downscale = 1;
  const resize = () => {
    renderer.setSize(
      (canvas.clientWidth * devicePixelRatio) / downscale,
      (canvas.clientHeight * devicePixelRatio) / downscale,
      false
    );
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();

    playerRenderer.setSize(
      playerCanvas.clientWidth * devicePixelRatio,
      playerCanvas.clientHeight * devicePixelRatio,
      false
    );
    playerCamera.aspect = playerCanvas.width / playerCanvas.height;
    playerCamera.updateProjectionMatrix();
  };

  const { mixer } = await buildBarn(scene);

  window.addEventListener('resize', resize);

  stats.onPerformanceNeeded = () => {
    if (downscale < 3) {
      downscale++;
      resize();
    }
  };

  stats.onPerformanceGood = () => {
    if (downscale > 1) {
      downscale--;
      resize();
    }
  };

  const headMaterial = new THREE.ShaderMaterial({
    transparent: true,
    clipping: true,
    side: THREE.DoubleSide,
    uniforms: {
      t: { value: 0 },
      map: { type: 't', value: null },
      aspect: { value: 1 },
    },
    vertexShader: `
      #include <common>
      #include <uv_pars_vertex>
      #include <uv2_pars_vertex>
      #include <clipping_planes_pars_vertex>

      varying vec2 p;
      // varying vec3 norm;

      void main() {
        #include <begin_vertex>
        #include <project_vertex>
        #include <clipping_planes_vertex>
        p = uv*2.-1.;
        // norm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,

    fragmentShader: `
      #include <common>
      #include <clipping_planes_pars_fragment>

      varying vec2 p;
      // varying vec3 norm;
      uniform sampler2D map;
      uniform float t;
      uniform float aspect;
      void main() {
        #include <clipping_planes_fragment>
        vec2 uv = p * 1.;
        uv.x /= aspect;
        uv *= cos(uv * PI / 8.) * 1.;
        uv = uv/2.+.5;
        gl_FragColor = texture2D(map, uv);

        float bri = 1. - pow(distance(p, vec2(0.0)) * 1.2 - 0.1 - sin(p.x * (p.y+0.5) * 2. + t) * 0.1, 9.);
        gl_FragColor *= 1.0-step(bri, 0.5);
        gl_FragColor.rgb *= bri;
      }
    `,
  });

  const posAudioParams = {
    refDistance: 0,
    rolloffFactor: 0,
  };

  const getOrCreateGuest = (id, remoteGuest) => {
    let guest = guests[id];
    if (guest) return guest;

    const geometry = new THREE.BoxBufferGeometry(2.5, 2.5, 2.5);
    const material = new THREE.MeshPhongMaterial({
      color: 0xaaaaaa,
      emissive: 0x777700,
    });
    const cube = new THREE.Mesh(geometry, material);

    const videoPanel = new THREE.Mesh(
      new THREE.CylinderBufferGeometry(
        3.5,
        3.5,
        5,
        64,
        1,
        true,
        Math.PI * 0.25 * 3,
        Math.PI / 2
      )
        .scale(1, 1, 0.5)
        .translate(0, 0, -0.4),
      headMaterial.clone()
    );
    videoPanel.onBeforeRender = () => {
      videoPanel.material.uniforms.t.value = performance.now() / 1000;
    };

    const head = new THREE.Group();
    head.add(cube);
    head.add(videoPanel);
    head.position.y = 6.4;
    head.rotation.order = 'YXZ';

    const body = new THREE.Mesh(
      new THREE.CylinderBufferGeometry(0.9, 0.6, 4, 64),
      new THREE.MeshPhongMaterial({ color: 0xaaaaaa, emissive: 0x555555 })
    );
    body.position.y = 2;

    const group = new THREE.Group();
    group.add(head);
    group.add(body);

    if (id === 'self') {
      playerScene.add(group);
      group.add(playerCamera);
    } else {
      scene.add(group);
    }

    const videoEl = document.createElement('video');
    videoEl.playsInline = true;
    videoEl.muted = true;

    const posSound = new THREE.PositionalAudio(listener);
    posSound.setRefDistance(posAudioParams.refDistance);
    posSound.setRolloffFactor(posAudioParams.rolloffFactor);
    posSound.setDistanceModel('exponential');
    posSound.setDirectionalCone(120, 230, 0.2);
    posSound.rotation.y = Math.PI;
    videoPanel.add(posSound);

    const videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
    videoTexture.offset.set(-0.25, 0);
    videoPanel.material.uniforms.map.value = videoTexture;
    videoEl.addEventListener('playing', () => {
      videoPanel.material.uniforms.aspect.value =
        videoEl.videoWidth / videoEl.videoHeight;
      head.add(videoPanel);
    });
    videoEl.addEventListener('paused', () => {
      head.remove(videoPanel);
    });

    let videoTrack, audioTrack;

    const updateTracks = () => {
      const tracks = [videoTrack, audioTrack].filter((t) => t);
      const stream = tracks.length ? new MediaStream(tracks) : null;
      videoEl.srcObject = stream;
      gestureWrangler.playVideo(videoEl);
      if (audioTrack) {
        try {
          posSound.setMediaStreamSource(stream);
        } catch (e) {
          console.log(e);
          videoEl.muted = false;
        }
      } else if (posSound.source) {
        posSound.disconnect();
      }
    };

    const ret = (guests[id] = {
      group,
      head,
      body,
      posSound,
      destroy() {
        videoEl.srcObject = null;
        if (posSound.source) posSound.disconnect();
      },
      set videoTrack(newVideoTrack) {
        if (newVideoTrack == videoTrack) return;
        videoTrack = newVideoTrack;
        updateTracks();
      },
      set audioTrack(newAudioTrack) {
        if (newAudioTrack == audioTrack) return;
        audioTrack = newAudioTrack;
        updateTracks();
      },
    });

    ret.videoTrack = remoteGuest.videoTrack;
    ret.audioTrack = remoteGuest.audioTrack;
    updateTracks();

    if (joinSound) {
      const joinSource = THREE.AudioContext.getContext().createBufferSource();
      joinSource.buffer = joinSound;
      joinSource.connect(posSound.getOutput());
      setTimeout(() => {
        joinSource.start();
      }, 1000);
    }

    return ret;
  };

  let projectorId = null;

  const updateGuest = (id, remoteGuest) => {
    if (remoteGuest.state.role == 'cast') {
      projectorId = id;
      return;
    }
    const guest = getOrCreateGuest(id, remoteGuest);
    const { state } = remoteGuest;
    guest.group.rotation.y = -state.look[0];
    guest.head.rotation.x = -state.look[1];

    guest.group.position.x = state.position[0];
    guest.group.position.z = -state.position[1];
    guest.group.position.y = state.position[2];
  };

  const updateMedia = (id, { videoTrack, audioTrack }) => {
    if (id == projectorId) {
      projector.setStream(
        new MediaStream([videoTrack, audioTrack].filter((t) => t))
      );
      return;
    }
    const guest = guests[id];
    if (!guest) {
      return;
    }
    guest.videoTrack = videoTrack;
    guest.audioTrack = audioTrack;
  };

  const removeGuest = (id) => {
    const guest = guests[id];
    if (!guest) return;

    if (partSound) {
      const partSource = THREE.AudioContext.getContext().createBufferSource();
      partSource.buffer = partSound;
      partSource.connect(guest.posSound.getOutput());
      partSource.start();
    }

    guest.group.parent.remove(guest.group);
    guest.destroy();
    delete guests[id];
  };

  const byteFreqData = new Uint8Array(1024);

  //let projector = createProjector(40, scene, listener);
  //projector.group.position.z = -75;
  //projector.group.position.x = -180;
  //projector.group.rotation.y = Math.PI / 2;

  const draw = ({ now, look, position }) => {
    camera.position.x = position[0];
    camera.position.z = -position[1];
    camera.position.y = 6 + position[2];
    camera.rotation.y = -look[0];
    camera.rotation.x = -look[1];

    if (musicAnalyser) musicAnalyser.getByteFrequencyData(byteFreqData);

    const delta = clock.getDelta();
    if (mixer) mixer.update( delta );
    
    renderer.render(scene, camera);

    if (guests.self) {
      playerRenderer.render(playerScene, playerCamera);
    }
  };

  const clearGuests = () => {
    for (const k in guests) {
      removeGuest(k);
    }
  };

  Service.get('knobs', (knobs) => {
    knobs.observe(
      'posAudio.refDistance',
      (refDistance) => {
        posAudioParams.refDistance = refDistance;
        for (const k in guests)
          guests[k].posSound.setRefDistance(refDistance * 50);
      },
      1
    );
    knobs.observe(
      'posAudio.rolloffFactor',
      (rolloffFactor) => {
        posAudioParams.rolloffFactor = rolloffFactor;
        for (const k in guests)
          guests[k].posSound.setRolloffFactor(rolloffFactor * 10);
      },
      1
    );
  });

  resize();
  return {
    draw,
    updateGuest,
    removeGuest,
    updateMedia,
    clearGuests,
  };
};

const buildRoom = async (el, config) => {
  let player;
  const glRoom = await buildGlRoom(
    document.getElementById('glRoom'),
    document.getElementById('glPlayerView'),
    {
      roomEl: el,
      ...config,
    }
  );

  const ret = {};

  let animationFrame;
  let lastLook, lastPosition;
  const equalVectors = (a, b) => {
    if (!(a && b)) return false;
    if (a.length != b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  };
  const draw = (rawNow) => {
    stats && stats.begin();
    const now = rawNow + timeOffset;
    player.stepPhysics();
    const { position, look } = player;
    glRoom.draw({ now, position, look });
    stats && stats.end();
    animationFrame = requestAnimationFrame(draw);
  };

  Service.get('room', (room) => {
    const ac = room.ac;
    player = room.player;

    room.join();
    room.observe('update', (id, state) => {
      if (state) glRoom.updateGuest(id, state);
      else glRoom.removeGuest(id);
    });

    room.observe('updateMedia', (id, guest) => {
      glRoom.updateMedia(id, guest);
    });

    room.observe('clear', () => {
      glRoom.clearGuests();
    });

    glRoom.clearGuests();
    for (const k in room.guests) glRoom.updateGuest(k, room.guests[k]);

    if (!animationFrame) animationFrame = requestAnimationFrame(draw);

    fetch('/sounds/join.mp3')
      .then((r) => r.arrayBuffer())
      .then((ab) => ac.decodeAudioData(ab))
      .then((buf) => {
        joinSound = buf;
      });

    fetch('/sounds/part.mp3')
      .then((r) => r.arrayBuffer())
      .then((ab) => ac.decodeAudioData(ab))
      .then((buf) => {
        partSound = buf;
      });
  });

  return ret;
};

let gestureWrangler;
let timeOffset;
let musicAnalyser;
let musicReactivity = 0;
let motion = 0;

let joinSound;
let partSound;

const start = () => {
  Service.get('knobs', (knobs) => {
    knobs.observe(
      'world.musicReactivity',
      (v) => {
        musicReactivity = v;
      },
      1
    );
    knobs.observe(
      'world.motion',
      (v) => {
        motion = v;
      },
      1
    );
  });

  Service.get('gestureWrangler', (gw) => {
    gestureWrangler = gw;
  });

  let userMedia;
  Service.get('userMedia', (um) => {
    userMedia = um;
    userMedia.start();
  });

  window.top.addEventListener('keydown', (e) => {
    switch (e.keyCode) {
      case 77: // m
        userMedia.toggleAudioMuted();
        break;
      case 86: // v
        userMedia.toggleVideoMuted();
        break;
      default:
        return; // without preventing default
    }
    e.preventDefault();
  });

  return fetch('/config.json')
    .then((r) => r.json())
    .then((config) => {
      timeOffset = new Date() - config.zeroTime;

      let builtRoom = false;
      Service.get('room', (room) => {
        THREE.AudioContext.setContext(room.ac);
        musicAnalyser = room.ac.createAnalyser();
        if (!builtRoom) {
          buildRoom(document.getElementById('room'), config);
          builtRoom = true;
        }
      });
    });
};

if (window.top.waitForGesture === true) {
  window.startOnGesture = start;
} else {
  start();
}

if (window != window.top) {
  window.addEventListener('focus', (e) => {
    window.top.focus();
  });
}
