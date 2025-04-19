// Collision stimuli settings
export const parameters = {

    width: 800,
    height:  600,
    speed: 5,
    slow: 1,
    freezeA: true, 
    freezeB: false,

    // Timing
    displayTime: 4000,    // How long to show each collision in ms
    jitterTime: [1000, 3000], // Random jitter between trials

    // These are the scene numbers from Fig 1 in the paper
    // specifically focusing on the 'close call' conditions
    scenes: [3, 4, 9, 10, 15, 16],
    
    // Specify which parameter set to use for each scene
    scene_params: {
        // Scene 3: Actual hit, Counterfactual close-call
        3: {
            'ypos': [140, 460],
            'angles': [166, 208]
        },
        // Scene 4: Actual hit, Counterfactual miss
        4: {
            'ypos': [130, 470],
            'angles': [168, 210]
        },
        // Scene 9: Actual close-call, Counterfactual hit
        9: {
            'ypos': [125, 475],
            'angles': [165, 205]
        },
        // Scene 10: Actual close-call, Counterfactual miss
        10: {
            'ypos': [130, 470],
            'angles': [166, 205]
        },
        // Scene 15: Actual miss, Counterfactual hit
        15: {
            'ypos': [120, 480],
            'angles': [164, 202]
        },
        // Scene 16: Actual miss, Counterfactual close-call
        16: {
            'ypos': [125, 475],
            'angles': [163, 200]
        }
    }
}