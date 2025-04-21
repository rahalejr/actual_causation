import { EyeTrackingManager, CalibrationManager } from '/scripts/tracking.js';
import { startCollisionDemo, destroyCollisionDemo } from '/scripts/collisions.js';
import { playClip } from './scripts/clips.js';

let step = 0;
let sequence = ['calibration', 'instructions', 'clips', 'response']

let eyeTracker = null;

const sections = {
  intro: () => render('intro'),
  calibration: () => render('calibration'),
  clips: () => render('clips'),
  collisions: () => render('collisions'),
  instructions: () => render('instructions'),
  response: () => render('response'),
};

async function showStep() {
  await sections[sequence[step]]();
  await new Promise(r => setTimeout(r, 0));
  stepInit(sequence[step]);
}

function nextStep() {step += 1}

async function render(componentName) {
    const res = await fetch(`components/${componentName}.html`);
    const html = await res.text();
    document.getElementById('app-root').innerHTML = html;
}



async function stepInit(current) {

  if(['intro', 'instructions'].includes(current)) {
    const startbutton = document.getElementById('start-button')
    startbutton.addEventListener('click', () => {
      nextStep();
      showStep();
    });
  }

  if (current == 'calibration') {
    if (!eyeTracker) {
      eyeTracker = new EyeTrackingManager();
      await eyeTracker.initialize();
    }
  
    let calibration = new CalibrationManager();
    calibration.setup();
  
    document.getElementById('start-button').addEventListener('click', async () => {
      for (let i = 0; i < 1; i++) {
        await new Promise(resolve => {
          calibration.start(([score, threshold]) => {
            console.log(`calibration #${i + 1}: ${score}`);
            console.log(`threshold: ${threshold}`);
            resolve();
          });
        });
      }
  
      nextStep();
      showStep();
    });
  }

  if (current == 'clips') {
    const video = document.getElementById('clips');
    const logGaze = async () => {
      const prediction = await webgazer.getCurrentPrediction();
      if (prediction) {
        const timestamp = video.currentTime;
        console.log(`Gaze: ${timestamp.toFixed(3)}s:`, prediction);
      }
    };
  
    video.addEventListener('timeupdate', logGaze);
  
    playClip(10, () => {
      video.removeEventListener('timeupdate', logGaze);
      nextStep();
      showStep();
    });
  }
  

  if(current == 'collisions') {
    startCollisionDemo(15, () => {
        destroyCollisionDemo();
        nextStep();
        showStep();
    });
  }

}

// initialize experiment
window.addEventListener('DOMContentLoaded', showStep);