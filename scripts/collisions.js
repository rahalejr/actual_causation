import { parameters } from './conditions.js';

export let engine = null;
export let render = null;

export function destroyCollisionDemo() {
    if (render) Matter.Render.stop(render);
    if (engine) {
        Matter.Engine.clear(engine);
        Matter.World.clear(engine.world);
    }
    render = null;
    engine = null;
}

// Offline simulation to precompute positions
function simulateAndRecord(condition, totalTimeMs = 5000, timeStepMs = 16) {
    const [ballAYpos, ballBYpos] = parameters.scene_params[condition].ypos;
    const [angleADegrees, angleBDegrees] = parameters.scene_params[condition].angles;
    const { speed, slow, width, height, freezeA, freezeB } = parameters;

    const { Engine, Bodies, Composite, Body, Events } = Matter;

    const simEngine = Engine.create();
    simEngine.gravity = { x: 0, y: 0 };
    simEngine.timing.timeScale = slow;

    const wallOpts = { isStatic: true, friction: 0, frictionAir:0, frictionStatic:0, restitution: 1 };
    const gateGapHeight = 200;
    const wallThickness = 7;

    const leftWallTop = Bodies.rectangle(
        wallThickness / 2, 
        (height - gateGapHeight) / 4, 
        wallThickness, 
        (height - gateGapHeight) / 2, 
        { ...wallOpts, label: 'leftWallTop' }
    );
    const leftWallBottom = Bodies.rectangle(
        wallThickness / 2, 
        height - (height - gateGapHeight) / 4, 
        wallThickness, 
        (height - gateGapHeight) / 2, 
        { ...wallOpts, label: 'leftWallBottom' }
    );

    const walls = [
        Bodies.rectangle(width / 2, wallThickness / 2, width, wallThickness, {...wallOpts, label:'topWall'}),
        Bodies.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, {...wallOpts, label:'bottomWall'}),
        Bodies.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, {...wallOpts, label:'rightWall'})
    ];

    Composite.add(simEngine.world, [leftWallTop, leftWallBottom, ...walls]);

    const ballOpts = { restitution: 1.5, friction:0, frictionAir:0, frictionStatic:0, inertia: Infinity, inverseInertia: 0 };
    const ballRadius = 28;

    const ballA = Bodies.circle(width - 40, ballAYpos, ballRadius, {...ballOpts, label: 'A'});
    const ballB = Bodies.circle(width - 40, ballBYpos, ballRadius, {...ballOpts, label: 'B'});

    const angleA = angleADegrees * Math.PI / 180;
    const angleB = angleBDegrees * Math.PI / 180;

    Body.setVelocity(ballA, { x: speed * Math.cos(angleA), y: speed * Math.sin(angleA) });
    Body.setVelocity(ballB, { x: speed * Math.cos(angleB), y: speed * Math.sin(angleB) });

    Composite.add(simEngine.world, [ballA, ballB]);

    let positions = [];
    let currentTime = 0;
    let stopped = false;
    let stopTime = null;

    Events.on(simEngine, 'collisionEnd', function(event){
        event.pairs.forEach((pair)=>{
            [pair.bodyA, pair.bodyB].forEach((b)=>{
                if(!b.isStatic && b.label!=='wall'){
                    const v = b.velocity;
                    const currentSpeed = Math.hypot(v.x, v.y);
                    Body.setVelocity(b, { x: v.x/currentSpeed * speed, y: v.y/currentSpeed * speed });
                }
            });
        });
    });

    Events.on(simEngine, 'collisionStart', (event) => {
        event.pairs.forEach(pair => {
            const labels = [pair.bodyA.label, pair.bodyB.label];
            if (!stopped && 
                (labels.includes('A') || labels.includes('B')) &&
                (labels.includes('leftWallTop') || labels.includes('leftWallBottom'))) {
                stopped = true;
                stopTime = currentTime + 1000;
            }
        });
    });

    while (currentTime <= totalTimeMs) {
        Engine.update(simEngine, timeStepMs);
        positions.push({
            t: currentTime,
            ballA: { x: ballA.position.x, y: ballA.position.y },
            ballB: { x: ballB.position.x, y: ballB.position.y }
        });

        if (stopped && currentTime >= stopTime) {
            break;
        }

        currentTime += timeStepMs;
    }

    return { positions, walls: [leftWallTop, leftWallBottom, ...walls] };
}

// Playback the precomputed simulation
export function startCollisionDemo(condition, callback) {
    destroyCollisionDemo();

    const { positions: precomputedPositions, walls } = simulateAndRecord(condition);

    let collisionContainer = document.getElementById('collision-container');
    const { width, height } = parameters;
    const { Engine, Render, Bodies, Composite, Body } = Matter;

    engine = Engine.create();
    render = Render.create({
        element: collisionContainer,
        engine: engine,
        options: { width, height, wireframes: false, background: '#ffffff' }
    });

    const wallOpts = { isStatic: true, friction: 0, restitution: 1 };
    const ballOpts = { restitution: 1.5, friction: 0, frictionStatic: 0, frictionAir: 0, inertia: Infinity, inverseInertia: 0 };
    const ballRadius = 28;

    const ballA = Bodies.circle(0, 0, ballRadius, { ...ballOpts, render: { fillStyle: 'red' }, label: 'A' });
    const ballB = Bodies.circle(0, 0, ballRadius, { ...ballOpts, render: { fillStyle: 'blue' }, label: 'B' });

    Composite.add(engine.world, [ballA, ballB, ...walls]);

    let currentFrame = 0;

    function animate() {
        if (currentFrame >= precomputedPositions.length) {
            callback();
            return;
        }

        const sample = precomputedPositions[currentFrame];

        Body.setPosition(ballA, sample.ballA);
        Body.setPosition(ballB, sample.ballB);

        Render.world(render);
        currentFrame++;

        requestAnimationFrame(animate);
    }

    Render.run(render);
    requestAnimationFrame(animate);
}