import { EyeTrackingManager, CalibrationManager } from '/scripts/tracking.js';
import { startCollisionDemo, destroyCollisionDemo } from '/scripts/collisions.js';
import { playClip } from './scripts/clips.js';

let sequence = ['debugging', 'calibration', 'instructions', 'clips', 'response']
let stack_sequence = sequence.reverse();
let current_step = null;

let condition = 0;
let fixation = false;

let eyeTracker = null;
let calibration_score = 0;
let fixation_threshold = 0;

const sections = {
    debugging: () => render('debugging'),
    intro: () => render('intro'),
    calibration: () => render('calibration'),
    recalibrate: () => render('recalibrate'),
    clips: () => render('clips'),
    error: () => render('error'),
    collisions: () => render('collisions'),
    instructions: () => render('instructions'),
    response: () => render('response'),
};

async function nextStep() {
    current_step = stack_sequence.pop()
    await sections[current_step]();
    await new Promise(r => setTimeout(r, 0));
    stepInit(current_step);
}

async function render(componentName) {
    const res = await fetch(`components/${componentName}.html`);
    const html = await res.text();
    document.getElementById('app-root').innerHTML = html;
}

async function recalibrate() {
    await sections['recalibrate']();
    const startbutton = document.getElementById('start-button')
    startbutton.addEventListener('click', () => {
        stack_sequence.push('calibration');
        nextStep();
    });
}

function advance(callback) {
    const startbutton = document.getElementById('start-button')
    startbutton.addEventListener('click', () => {
        nextStep();
        if (callback) {callback()}
    });
}

async function stepInit(current) {

    if(current == 'debugging') {
        advance(() => {
            fixation = document.querySelector('input[name="fixation"]:checked')?.value == 'true';
            condition = parseInt(document.querySelector('input[name="scene"]:checked')?.value);
            console.log(fixation, condition);
        });
    }


    if(['intro', 'instructions', 'error'].includes(current)) {
        advance()
    }

    if (current == 'calibration') {
        if (!eyeTracker) {
            eyeTracker = new EyeTrackingManager();
            await eyeTracker.initialize();
        }
    
        let calibration = new CalibrationManager();
        calibration.setup();
    
        document.getElementById('start-button').addEventListener('click', async () => {
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => {
                calibration.start(([score, threshold]) => {
                    console.log(`calibration #${i + 1}: ${score}`);
                    calibration_score = score;
                    console.log(`threshold: ${threshold}`);
                    fixation_threshold = threshold;
                    resolve();
                });
            });

                // recalibrate if calibration score is below threshold
                if (fixation_threshold > calibration_score) {
                    nextStep();
                    break;
                }
                else {recalibrate()}
            }

            const container = document.getElementById('fixation-container');
            container.style.width = (fixation_threshold*2) + 'px';
            container.style.height = (fixation_threshold*2) + 'px';

    
        });
    }

    if (current == 'clips') {
        if (eyeTracker) {
            eyeTracker.updateFixation(fixation);
        }
    
        let fixationBroken = false;
    
        const fixationListener = () => {
            fixationBroken = true;
            resolvePromise();
        };
    
        let resolvePromise;
        await new Promise((resolve) => {
            resolvePromise = resolve;
            window.addEventListener('fixationBreak', fixationListener, { once: true });
            playClip(condition, resolve);
        });
    
        window.removeEventListener('fixationBreak', fixationListener);
    
        if (fixationBroken) {
            console.warn('Fixation broken — ending clip');
            stack_sequence.push('clips');
            stack_sequence.push('error');
            nextStep();
            return;
        }
    
        nextStep();
    }
    

    if(current == 'collisions') {
        startCollisionDemo(15, () => {
            destroyCollisionDemo();
            nextStep();
        });
    }

}

// initialize experiment
window.addEventListener('DOMContentLoaded', nextStep);