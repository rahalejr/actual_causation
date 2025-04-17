import { experimentConfig } from './config.js';

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
            webgazer.setGazeListener((data, elapsedTime) => {
                if (data == null) {
                    return;
                }
                
                // Update gaze visualization dot
                if (this.config.showGazeDot) {
                    const gazeDot = document.getElementById('webgazerGazeDot');
                    if (gazeDot) {
                        gazeDot.style.left = data.x + 'px';
                        gazeDot.style.top = data.y + 'px';
                    }
                }
                
                // Record data if we're in recording mode
                if (this.isRecording) {
                    // Only record if enough time has passed (to control sample rate)
                    const minInterval = 1000 / this.config.sampleRate;
                    if (elapsedTime - this.lastTimestamp >= minInterval) {
                        this.lastTimestamp = elapsedTime;
                        
                        // Record the gaze data with metadata
                        this.currentTrialData.push({
                            timestamp: elapsedTime,
                            x: data.x,
                            y: data.y,
                            trialInfo: this.currentTrial
                        });
                    }
                }
            }).begin();
            
            // Set WebGazer parameters
            webgazer.params.showVideo = true;
            webgazer.params.showFaceOverlay = true;
            webgazer.params.showFaceFeedbackBox = true;
            webgazer.params.showGazeDot = false; // implemented in setupGazeDot
            
            // Wait for WebGazer to initialize
            setTimeout(() => {
                this.setupGazeDot();
                resolve();
            }, 3000);
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
        if (!prediction) return true; // If no prediction, assume it's correct
        
        // Calculate distance from fixation point
        const distance = Math.sqrt(
            Math.pow(prediction.x - centerX, 2) + 
            Math.pow(prediction.y - centerY, 2)
        );
        
        // Return true if within threshold, false if outside
        return distance <= this.config.fixationThreshold;
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
        this.currentPointIndex = 0;
        this.container = null;
        this.point = null;
        this.pointClickHandler = null;
        this.onComplete = null;
    }
    
    setup() {
        this.container = document.getElementById('calibration-container');
        this.point = document.getElementById('calibration-point');
        this.progressBar = document.getElementById('calibration-progress');
        
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
        const padding = 50; // Padding from edges
        
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
    
    handlePointClick() {
        const point = this.calibrationPoints[this.currentPointIndex];

        // calibrate webgazer
        webgazer.recordScreenPosition(point.x, point.y, 'click');

        this.currentPointIndex++;
        
        if (this.currentPointIndex >= this.calibrationPoints.length) {
            this.finish();
        } else {
            this.showCurrentPoint();
        }
    }
    
    finish() {
        this.point.removeEventListener('click', this.pointClickHandler);
        this.onComplete();
    }
}
