export const experimentConfig = {
    // Experiment conditions
    conditions: {
        freeViewing: {
            name: "free-viewing",
            instructions: "In this experiment, you will see animations of ball collisions. After each animation, you'll be asked to judge whether one ball caused another to go through a gate.",
            fixationRequired: false
        },
        centralFixation: {
            name: "central-fixation",
            instructions: "In this experiment, you will see animations of ball collisions. Please keep your eyes focused on the central cross (+) during the entire animation. After each animation, you'll be asked to judge whether one ball caused another to go through a gate.",
            fixationRequired: true
        }
    },
    
    // Calibration settings
    calibration: {
        points: 9,        // Number of calibration points
        repetitions: 1,   // How many times to repeat calibration
        pointSize: 20,    // Size of calibration point in pixels
        pointColor: "red",
        randomizeOrder: true
    },

    
    // Question settings
    questions: {
        causalQuestion: "How much do you agree with the following statement: Ball A caused Ball B to go through the gate?",
        scale: {
            min: 0,
            max: 100,
            default: 50,
            minLabel: "Not at all",
            maxLabel: "Very much"
        },
        confidenceQuestion: "How confident are you in your judgment?",
        confidenceScale: {
            min: 0,
            max: 100,
            default: 50,
            minLabel: "Not at all confident",
            maxLabel: "Very confident"
        }
    },
    
    // Eye tracking settings
    eyeTracking: {
        sampleRate: 30,       // Target samples per second
        showGazeDot: false,    // Whether to show where the user is looking
        gazeDotRadius: 5,
        gazeDotColor: "rgba(255, 0, 0, 0.5)",
        recordData: true,     // Whether to record eye tracking data
        fixationThreshold: 200 // Pixel distance from center allowed in fixation condition
    }
};