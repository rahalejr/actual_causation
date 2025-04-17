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

export function startCollisionDemo(condition, callback) {

    const [ballAYpos, ballBYpos] = parameters.scene_params[condition].ypos;
    const [angleADegrees, angleBDegrees] = parameters.scene_params[condition].angles;
    const slow = parameters.slow, speed = parameters.speed;
    const width = parameters.width, height = parameters.height;
    const freezeA = parameters.freezeA, freezeB = parameters.freezeB;

    const {Engine, Render, Runner, Bodies, Composite, Body, Events} = Matter;

    engine = Engine.create();
    engine.gravity = {x:0, y:0};

    engine.timing.timeScale = slow;

    let collisionContainer = document.getElementById('collision-container');

    render = Render.create({
        element: collisionContainer,
        engine: engine,
        options: { width, height, wireframes: false, background: '#ffffff' }
    });

    const wallOpts = { isStatic:true, friction:0, frictionAir:0, frictionStatic:0, restitution:1 };
    const gateGapHeight = 200;
    const wallThickness = 7;

    // left wall with gap centered vertically
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

    // top, bottom, and right walls
    const walls = [
        Bodies.rectangle(width / 2, wallThickness / 2, width, wallThickness, {...wallOpts, label:'topWall'}),
        Bodies.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, {...wallOpts, label:'bottomWall'}),
        Bodies.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, {...wallOpts, label:'rightWall'})
    ];

    Composite.add(engine.world, [leftWallTop, leftWallBottom, ...walls]);

    // ball settings
    const ballOpts = { restitution: 1.5, friction:0, frictionStatic: 0, frictionAir: 0, inertia: Infinity, inverseInertia: 0 };
    const ballRadius = 28;

    const ballAPos = {x: width - 40, y: ballAYpos};
    const ballBPos = {x: width - 40, y: ballBYpos};

    const ballA = Bodies.circle(ballAPos.x, ballAPos.y, ballRadius, {...ballOpts, render:{fillStyle:'red'}, label:'A'});
    const ballB = Bodies.circle(ballBPos.x, ballBPos.y, ballRadius, {...ballOpts, render:{fillStyle:'blue'}, label:'B'});

    // convert degrees to radians
    const angleA = angleADegrees * Math.PI / 180;
    const angleB = angleBDegrees * Math.PI / 180;

    Body.setVelocity(ballA, {x:0, y:0})
    Body.setVelocity(ballB, {x:0, y:0})

    // setting velocities based on angle and speed
    function startAnimation () {
        Body.setVelocity(ballA, {
            x: speed * Math.cos(angleA),
            y: speed * Math.sin(angleA)
        });
    
        Body.setVelocity(ballB, {
            x: speed * Math.cos(angleB),
            y: speed * Math.sin(angleB)
        });
        if (freezeA) Body.setVelocity(ballA, {x:0, y:0});
        if (freezeB) Body.setVelocity(ballB, {x:0, y:0});
    }

    // prevents sticking to walls after collision:
    Events.on(engine, 'collisionEnd', function(event){
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

    Composite.add(engine.world, [...walls, ballA, ballB]);

    setTimeout(()=>{
        startAnimation();
    }, 500)

    // label balls
    Events.on(render, 'afterRender', ()=>{
        let ctx = render.context;
        ctx.font='25px Arial'; ctx.textAlign='center';ctx.fillStyle='white';
        ctx.fillText('A', ballA.position.x, ballA.position.y+4);
        ctx.fillText('B', ballB.position.x, ballB.position.y+4);
    });

    Events.on(engine, 'collisionStart', function(event){
        event.pairs.forEach((pair)=>{
            const labels = [pair.bodyA.label, pair.bodyB.label];
    
            if ((labels.includes('A') || labels.includes('B')) && 
                (labels.includes('leftWallTop') || labels.includes('leftWallBottom'))) {
                    setTimeout(() => {
                        Body.setVelocity(ballA, {x:0, y:0});
                        Body.setVelocity(ballB, {x:0, y:0});
                        callback()
                    }, 1000);
            }
        });
    });

    Engine.run(engine);
    Render.run(render);
}