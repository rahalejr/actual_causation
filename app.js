import { EyeTrackingManager, CalibrationManager } from '/scripts/tracking.js';
import * as components from './components.js';
import { startCollisionDemo, destroyCollisionDemo } from '/scripts/collisions.js';
import { experimentConfig } from './scripts/config.js';
import { playClip } from './scripts/clips.js';

let participant = 'test';
let condition = '';
let conditions = null;
let fixation = false;
let randomize = true;
let trials = [];

let eyeTracker = null;
let calibration_score = 0;
let fixation_threshold = 0;

let sequence = ['debugging', 'calibration', 'instructions', 'conditions_placeholder', 'response', 'end']
let stack_sequence = sequence.reverse();
let current_step = null;

async function nextStep() {
    current_step = stack_sequence.pop()
    console.log(current_step);
    await components.sections[current_step]();
    await new Promise(r => setTimeout(r, 0));
    stepInit(current_step);
}

async function recalibrate() {
    await components.sections['recalibrate']();
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
            conditions = Array.from(document.querySelectorAll('input[name="scene[]"]:checked')).map(cb => cb.value);
            
            if (randomize) {
                for (let i = conditions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [conditions[i], conditions[j]] = [conditions[j], conditions[i]];
                }
            }

            console.log('conditions: ' + conditions);

            stack_sequence = sequence.flatMap(step => step == 'conditions_placeholder' ? conditions.flatMap(c => ['response', 'clips', 'jitter']) : [step]);
            condition = conditions.pop();
        });
    }


    if(['instructions', 'error'].includes(current)) {
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

    if (current == 'jitter') {
        eyeTracker.resume();
        eyeTracker.startRecording(condition);
        const min = experimentConfig.jitter.min, max = experimentConfig.jitter.max;
        let duration = components.getRandomJitter(min, max);
        let jitter_intro = document.getElementById('jitter-intro');
        setTimeout(() => {
            jitter_intro.classList.add('invisible');
            setTimeout(nextStep, duration * 1000);
        }, 2000);
    }

    if (current == 'clips') {

        let fixation_container = document.getElementById('fixation-container');
        
        if (eyeTracker && fixation) {
            eyeTracker.updateFixation(fixation);
            fixation_container.classList.remove('invisible');
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
    
        eyeTracker.stopRecording();
        window.removeEventListener('fixationBreak', fixationListener);
        fixation_container.classList.add('invisible');
    
        if (fixationBroken) {
            console.warn('Fixation broken — ending clip');
            stack_sequence.push('clips');
            stack_sequence.push('error');
            nextStep();
            return;
        }
        
        condition = conditions.pop();
        nextStep();
    }
    

    if(current == 'collisions') {
        startCollisionDemo(15, () => {
            destroyCollisionDemo();
            nextStep();
        });
    }

    if(current == 'response') {
        eyeTracker.pause();
        const slider = document.getElementById('causal-slider');
        const valueDisplay = document.getElementById('slider-value');
        let values = {judgment: 50};
    
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            values.judgment = slider.value;
        });
        
        advance(() => {trials.push(components.trialData(eyeTracker, condition, values))});
    }

    if(current == 'end') {
        let results = {
            'participantID': participant,
            'trials': trials
        }
        components.downloadData(results, 'causality-experiment-data.json');
    }
}


// initialize experiment
window.addEventListener('DOMContentLoaded', nextStep);