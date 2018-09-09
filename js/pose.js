/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const videoWidth = 512;
const videoHeight = 512;
//const videoHeight = 288;

function isAndroid() { return /Android/i.test(navigator.userAgent); }
function isiOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
function isMobile() { return isAndroid() || isiOS(); }

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

const guiState = {
  input: {
    mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
    outputStride: 16,
    imageScaleFactor: 0.4,
  },
  minPoseConfidence: 0.1,
  minPartConfidence: 0.5,
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};

function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({width: 300});
  gui.close();
  gui.domElement.hidden = true;

  let input = gui.addFolder('Input');
  const architectureController = input.add(guiState.input, 'mobileNetArchitecture', ['1.01', '1.00', '0.75', '0.50']);
  input.add(guiState.input, 'outputStride', [8, 16, 32]);
  input.add(guiState.input, 'imageScaleFactor').min(0.2).max(1.0);
  input.open();

  let output = gui.addFolder('Output');
  output.add(guiState.output, 'showVideo');
  output.add(guiState.output, 'showSkeleton');
  output.add(guiState.output, 'showPoints');
  output.add(guiState.output, 'showBoundingBox');
  output.open();

  architectureController.onChange(function(architecture) {
    guiState.changeToArchitecture = architecture;
  });
}

