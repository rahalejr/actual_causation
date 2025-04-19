import { EyeTrackingManager, CalibrationManager } from '/scripts/tracking.js';

let step = 0;
let sequence = ['collisions', 'intro', 'calibration', 'instructions', 'collisions', 'response'];

let eyeTracker = null;
let worker = null;

const sections = {
  intro: () => render('intro'),
  calibration: () => render('calibration'),
  collisions: () => render('collisions'),
  instructions: () => render('instructions'),
  response: () => render('response'),
};

async function showStep() {
  await sections[sequence[step]]();
  requestAnimationFrame(() => stepInit(sequence[step]));
}

function nextStep() { step += 1; }

async function render(componentName) {
  const res = await fetch(`components/${componentName}.html`);
  const html = await res.text();
  document.getElementById('app-root').innerHTML = html;
}

async function stepInit(current) {
  if (['intro', 'instructions'].includes(current)) {
    const startbutton = document.getElementById('start-button');
    startbutton?.addEventListener('click', () => {
      nextStep();
      showStep();
    });
  }

  if (current === 'calibration') {
    if (!eyeTracker) {
      eyeTracker = new EyeTrackingManager();
      await eyeTracker.initialize();
    }
    let calibration = new CalibrationManager();

    calibration.setup();
    document.getElementById('start-button')?.addEventListener('click', () => {
      calibration.start((score, threshold) => {
        console.log('calibration: ' + score);
        console.log('threshold: ' + threshold);
        nextStep();
        showStep();
      });
    });
  }

  if (current === 'collisions') {
    const container = document.getElementById('collision-container');
    if (!container) {
      console.error('collision-container not found');
      return;
    }

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'collision-canvas';
    canvas.width = 800;
    canvas.height = 600;
    container.appendChild(canvas);

    try {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new Worker('/scripts/collisions.js', { type: 'module' });
      worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
      worker.postMessage({ type: 'start', condition: 15 });

      worker.onmessage = (e) => {
        if (e.data.type === 'frame') {
          const { timestamp, frame } = e.data;
          const closestGaze = eyeTracker?.getClosestSample?.(timestamp);
          console.log(`Frame ${frame}, gaze:`, closestGaze);
        }
        if (e.data.type === 'done') {
          nextStep();
          showStep();
        }
      };
    } catch (err) {
      console.error('Offscreen canvas failed:', err);
    }
  }

  if (current === 'response') {
    const submitbutton = document.getElementById('submit-button');
    submitbutton?.addEventListener('click', () => {
      nextStep();
      showStep();
    });
  }
}

// initialize experiment
window.addEventListener('DOMContentLoaded', showStep);