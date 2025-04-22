import { experimentConfig } from './config.js';


let max_threshold = experimentConfig.eyeTracking.fixationThreshold;
let fixation_threshold = max_threshold;

// Eye tracking data management
export class EyeTrackingManager {
    constructor() {
        this.config = experimentConfig.eyeTracking;
        this.fixation = false;
        this.fixationCross = null;
        this.isRecording = false;
        this.currentTrialData = [];
        this.allData = [];
        this.currentTrial = null;
        this.latestPrediction = null;
        this.lastTimestamp = 0;
        this.offFixationCount = 0;
        this.fixationBreakSamplesRequired = this.config.fixationBreakSamplesRequired;
    }
    
    initialize() {
        this.fixationCross = document.getElementById('fixation');

        return new Promise((resolve, reject) => {
            webgazer.setGazeListener((data, elapsedTime) => {
                if (data == null) return;

                this.latestPrediction = data;

                if (this.fixation) {
                    let fixated = this.checkFixation();
            
                    if (!fixated) {
                        this.offFixationCount++;
                    } else {
                        this.offFixationCount = 0;
                    }
            
                    if (this.offFixationCount >= this.fixationBreakSamplesRequired) {
                        if (!this.fixationBroken) {
                            this.currentTrialData = []
                            console.warn("Fixation broken at", elapsedTime);
                            const event = new CustomEvent('fixationBreak', {
                                detail: {
                                  timestamp: performance.now(),
                                  trial: this.currentTrial
                                } 
                              });
                              window.dispatchEvent(event);
                        }
                    }
                }
    
                const minInterval = 1000 / this.config.sampleRate;
                if (elapsedTime - this.lastTimestamp < minInterval) return;
    
                this.lastTimestamp = elapsedTime;
    
                if (this.isRecording) {
                    // lookup the video element and get currentTime
                    let video = document.getElementById('clips');
                    let videoTime = video ? video.currentTime : null;
            
                    this.currentTrialData.push({
                        timestamp: elapsedTime,
                        x: data.x,
                        y: data.y,
                        trialInfo: this.currentTrial,
                        fixed_gaze: this.fixation,
                        videoTime: videoTime
                    });
                }
            });
    
            window.localStorage.clear();
            webgazer.saveDataAcrossSessions = false;
    
            webgazer.begin();
    
            // Set WebGazer parameters
            webgazer.params.showVideo = false;
            webgazer.params.showFaceOverlay = false;
            webgazer.params.showFaceFeedbackBox = false;
            webgazer.params.showGazeDot = true;
    
            // Wait for WebGazer to fully initialize
            setTimeout(() => {
                this.setupGazeDot();
                resolve();
            }, 4000);
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

    updateFixation(bool) {
        this.fixation = bool;
    }
    
    async checkFixation() {

        if (!this.latestPrediction) return true; // If no prediction, assume it's correct

        const rect = this.fixationCross.getBoundingClientRect();
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from fixation point
        const distance = Math.sqrt(
            Math.pow(this.latestPrediction.x - centerX, 2) + 
            Math.pow(this.latestPprediction.y - centerY, 2)
        );

        console.log(distance);
        
        // Return true if within threshold, false if outside
        return distance <= fixation_threshold;
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
        this.point.onclick = () => {
            this.recordCalibrationPoint();
            this.handlePointClick();
        };
        
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

    async recordCalibrationPoint() {

        const rect = this.point.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
    
        // collect 5 samples spaced 100ms apart
        for (let i = 0; i < 5; i++) {
            webgazer.recordScreenPosition(centerX, centerY, 'click');
            await new Promise(res => setTimeout(res, 100));
        }
    
        // record last gazepoint
        const prediction = await webgazer.getCurrentPrediction();
        if (prediction) {
            this.calibrationData.push({
                targetX: centerX,
                targetY: centerY,
                gazeX: prediction.x,
                gazeY: prediction.y
            });
        }
    }
    
    async handlePointClick() {
        await this.recordCalibrationPoint();

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
        console.log('error_px ' + error_px);
        const calibration_score = Math.max(0, Math.min(1, 1 - (error_px / max_threshold)));
        const rounded_score = Math.round(calibration_score * 100);
        fixation_threshold = Math.round(this.calcFixationThreshold(error_px));

        return [Math.round(error_px), fixation_threshold];
    }
    
    finish() {
        this.point.removeEventListener('click', this.handlePointClick);

        this.onComplete(this.calibrationScore());
    }
}
