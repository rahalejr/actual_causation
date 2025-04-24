// move all component specific logic in app.js here

async function render(componentName) {
    const res = await fetch(`components/${componentName}.html`);
    const html = await res.text();
    document.getElementById('app-root').innerHTML = html;
}

export const sections = {
    debugging: () => render('debugging'),
    calibration: () => render('calibration'),
    recalibrate: () => render('recalibrate'),
    jitter: () => render('jitter'),
    clips: () => render('clips'),
    error: () => render('error'),
    collisions: () => render('collisions'),
    instructions: () => render('instructions'),
    response: () => render('response'),
    end: () => render('end')
};

export function trialData(eyeTracker, condition, responses) {
    return {
        condition: condition,
        responses: responses,
        eyetracking_data: eyeTracker.allData
    }
}

export function downloadData(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'experiment-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getRandomJitter(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}