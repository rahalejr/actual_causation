import { EyeTrackingManager, CalibrationManager } from '/scripts/tracking.js';
import { startCollisionDemo, destroyCollisionDemo } from '/scripts/collisions.js';

let step = 0;
let sequence = ['collisions', 'intro', 'calibration', 'instructions', 'collisions', 'response']

let eyeTracker = null;

const sections = {
  intro: () => render('intro'),
  calibration: () => render('calibration'),
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
    document.getElementById('start-button').addEventListener('click', () => {
      nextStep();
      showStep();
    });
  }

  if(current == 'calibration') {
    if(!eyeTracker) {
        eyeTracker = new EyeTrackingManager();
        await eyeTracker.initialize();
    }
    let calibration = new CalibrationManager();

    calibration.setup()
    calibration.start(() => {
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
