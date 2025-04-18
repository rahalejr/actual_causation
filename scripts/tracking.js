import { experimentConfig } from './config.js';


let max_threshold = experimentConfig.eyeTracking.fixationThreshold;

// Eye tracking data management
export class EyeTrackingManager {
    constructor() {
        this.config = experimentConfig.eyeTracking;
        this.isRecording = false;
        this.currentTrialData = [];
        this.allData = [];
        this.currentTrial = null;
        this.lastTimestamp = 0;
    }
    
    initialize() {
        return new Promise((resolve, reject) => {
            // Initialize WebGazer
            webgazer
                .setGazeListener((data, elapsedTime) => {
                    if (data == null) return;
    
                    const minInterval = 1000 / this.config.sampleRate;
                    if (elapsedTime - this.lastTimestamp < minInterval) return;
    
                    this.lastTimestamp = elapsedTime;
    
                    // Update gaze visualization dot
                    // if (this.config.showGazeDot) {
                    //     const gazeDot = document.getElementById('webgazerGazeDot');
                    //     if (gazeDot) {
                    //         gazeDot.style.left = data.x + 'px';
                    //         gazeDot.style.top = data.y + 'px';
                    //     }
                    // }
    
                    // Record data if we're in recording mode
                    if (this.isRecording) {
                        this.currentTrialData.push({
                            timestamp: elapsedTime,
                            x: data.x,
                            y: data.y,
                            trialInfo: this.currentTrial
                        });
                    }
                })
                .begin(); // ✅ this was missing in the last version
    
            // Set WebGazer parameters
            webgazer.params.showVideo = false;
            webgazer.params.showFaceOverlay = false;
            webgazer.params.showFaceFeedbackBox = false;
            webgazer.params.showGazeDot = false; // implemented in setupGazeDot
    
            // Wait for WebGazer to initialize
            setTimeout(() => {
                this.setupGazeDot();
                resolve();
            }, 2000);
        });
    }
    
    setupGazeDot() {
        if (!this.config.showGazeDot) return;
        
        // Create the gaze dot if it doesn't exist
        let gazeDot = document.getElementById('webgazerGazeDot');
        if (!gazeDot) {
            gazeDot = document.createElement('div');
            gazeDot.id = 'webgazerGazeDot';
            gazeDot.style.position = 'fixed';
            gazeDot.style.left = '-100px'; // Start off-screen
            gazeDot.style.top = '-100px';
            gazeDot.style.width = this.config.gazeDotRadius * 2 + 'px';
            gazeDot.style.height = this.config.gazeDotRadius * 2 + 'px';
            gazeDot.style.borderRadius = '50%';
            gazeDot.style.backgroundColor = this.config.gazeDotColor;
            gazeDot.style.transform = 'translate(-50%, -50%)';
            gazeDot.style.pointerEvents = 'none';
            gazeDot.style.zIndex = '9999';
            document.body.appendChild(gazeDot);
        }
    }
    
    startRecording(trialInfo) {
        this.currentTrial = trialInfo;
        this.currentTrialData = [];
        this.isRecording = true;
        this.lastTimestamp = performance.now();
    }
    
    stopRecording() {
        this.isRecording = false;
        // Save the current trial data
        if (this.currentTrialData.length > 0) {
            this.allData.push({
                trial: this.currentTrial,
                gazeData: this.currentTrialData
            });
        }
        return this.currentTrialData;
    }
    
    checkFixation(centerX, centerY) {
        // Get the current gaze position
        const prediction = webgazer.getCurrentPrediction();
        console.log(prediction);
        if (!prediction) return true; // If no prediction, assume it's correct
        
        // Calculate distance from fixation point
        const distance = Math.sqrt(
            Math.pow(prediction.x - centerX, 2) + 
            Math.pow(prediction.y - centerY, 2)
        );
        
        // Return true if within threshold, false if outside
        return distance <= fix_threshold;
    }
    
    getAllData() {
        return this.allData;
    }
    
    shutdown() {
        webgazer.end();
    }
}



export class CalibrationManager {
    constructor() {
        this.config = experimentConfig.calibration;
        this.calibrationPoints = [];
        this.calibrationData = [];
        this.currentPointIndex = 0;
        this.container = null;
        this.point = null;
        this.pointClickHandler = null;
        this.onComplete = null;
    }

    calcFixationThreshold(error_px) { 
        return 40 + (max_threshold - 40) * Math.pow(Math.min(1, (error_px + 10) / max_threshold), 0.8);
    }
    
    
    setup() {
        this.container = document.getElementById('calibration-container');
        this.point = document.getElementById('calibration-point');
        this.progressBar = document.getElementById('calibration-progress');
        this.instructions = document.getElementById('calibration-instructions');
        this.button = document.getElementById('start-button');
        
        if (!this.container || !this.point) {
            console.error('Calibration container or point element not found');
            return false;
        }
        
        // Style the calibration point
        this.point.style.width = this.config.pointSize + 'px';
        this.point.style.height = this.config.pointSize + 'px';
        this.point.style.backgroundColor = this.config.pointColor;
        
        // Generate calibration points
        this.generateCalibrationPoints();
        this.button.classList.remove('invisible');
        setTimeout(() => {
            null
        }, 3000);
        
        // Set up progress bar
        if (this.progressBar) {
            this.progressBar.max = this.calibrationPoints.length;
            this.progressBar.value = 0;
        }
        
        return true;
    }
    
    generateCalibrationPoints() {
        this.calibrationPoints = [];
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;
        const padding = 50;
        
        // Create a grid of points
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                this.calibrationPoints.push({
                    x: padding + (x * ((containerWidth - 2 * padding) / 2)),
                    y: padding + (y * ((containerHeight - 2 * padding) / 2))
                });
            }
        }
        
        // Randomize if needed
        if (this.config.randomizeOrder) {
            this.calibrationPoints.sort(() => Math.random() - 0.5);
        }
    }
    
    start(onCompleteCallback) {
        this.point.classList.remove('hidden');
        this.progressBar.classList.remove('hidden');
        this.instructions.classList.add('hidden');
        this.onComplete = onCompleteCallback;
        this.currentPointIndex = 0;
        
        // Set up click handler
        this.pointClickHandler = () => this.handlePointClick();
        this.point.addEventListener('click', this.pointClickHandler);
        
        // Show first point
        this.showCurrentPoint();
    }
    
    showCurrentPoint() {
        if (this.currentPointIndex >= this.calibrationPoints.length) {
            this.finish();
            return;
        }
        
        const point = this.calibrationPoints[this.currentPointIndex];
        this.point.style.left = point.x + 'px';
        this.point.style.top = point.y + 'px';
        
        // Update progress
        if (this.progressBar) {
            this.progressBar.value = this.currentPointIndex;
        }
    }
    
    async handlePointClick() {
        const point = this.calibrationPoints[this.currentPointIndex];

        // calibrate webgazer
        webgazer.recordScreenPosition(point.x, point.y, 'click');

        const prediction = await webgazer.getCurrentPrediction();
        console.log(prediction);
        if (prediction) {
            this.calibrationData.push({
                targetX: point.x,
                targetY: point.y,
                gazeX: prediction.x,
                gazeY: prediction.y
            });
        }

        this.currentPointIndex++;
        
        if (this.currentPointIndex >= this.calibrationPoints.length) {
            this.finish();
        } else {
            this.showCurrentPoint();
        }
    }

    calibrationScore() {
        const last3 = this.calibrationData.slice(-3);
        const errors = last3.map(({ targetX, targetY, gazeX, gazeY }) => {
            const dx = targetX - gazeX;
            const dy = targetY - gazeY;
            return Math.sqrt(dx * dx + dy * dy);
        });
        const error_px = errors.reduce((a, b) => a + b, 0) / errors.length;
        const calibration_score = Math.max(0, Math.min(1, 1 - (error_px / max_threshold)));
        const rounded_score = Math.round(calibration_score * 100);
        const fixation_threshold = this.calcFixationThreshold(error_px);

        return [rounded_score, fixation_threshold];
    }
    
    finish() {
        this.point.removeEventListener('click', this.pointClickHandler);
        const score = webgazer.getCalibrationScore?.();

        this.onComplete(this.calibrationScore());
    }
}
