/*
Creatie Programming II

Randiel Zoquier

Turbulence

Last update - 3/18/2021

*/


let gridSize; // the groid size of the video feed
let gridScale = 4; // the scaling amount to scale the video to the entire screen
let ignoreThresh; //threshold to ignore motion

let flow; //flow calculating object
let previousPixels; //an object to hold the previous pixels
let video; //video object

let particles; //particle array
let maxParticles; //maximum particles that can be generated at a time
let lastGen = 0; // generation timing

let pause = false; // to pause

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);

  var videoRatio = video.height / video.width;
  video.size((width / gridScale), (width / gridScale) * videoRatio);
  video.hide();

  gridSize = video.width/ 32;
  ignoreThresh = gridSize * 1.85;


  maxParticles = 1000;
  // set up flow calculator
  flow = new FlowCalculator(gridSize);

  particles = [];
  frameRate(60);
}



function draw() {
  // print particle counts ( this was useful for optimatization)
  print("particles - max: " + maxParticles + ", actual: " + particles.length);



  push();

  //create the video window world
  translate(video.width * gridScale, 0); // move over so the reversed image goes to the same place
  scale(-1 * gridScale,1 * gridScale); //reverse and enlarge


  // I wanted to see if I can also display video but the impact on performance was too much :( it also affected the streaks

  // image(video, 0, 0);
  // filter(THRESHOLD, 0.3);
  // fill(0, 253);
  // noStroke();
  // rect(0,0, video.width, video.height);

  background(20, 80);

  //generate particles at a certain rate
  //only generate a batch if we don't have too many particles
  if(particles.length < maxParticles && millis() > lastGen + 1000){
    lastGen = millis();
    for(var i = 0; i < video.width; i += gridSize){
      for(var j = 0; j < video.height; j += gridSize){
        particles.push(new Particle(i, j, 0.5, radians(90), 200));
      }
    }
  }

  //update particle positions
  if(particles.length > 0){
    //delete dead particles
    for(var d= 0; d <particles.length; d++){
      if(particles[d].dead) particles.splice(d,1);
    }
    for(var p = 0; p < particles.length; p++){
      particles[p].update();
    }
  }

  video.loadPixels();
  if (video.pixels.length > 0) {
    // calculate flow only if the previous pixels weren't the same
    if (previousPixels) {
      if (!same(previousPixels, video.pixels, 4, width)) {
        flow.calculate(previousPixels, video.pixels, video.width,video.height);
      }
    }

    //determine the flow
    if (flow.zones) {
      for (let zone of flow.zones) {
        // continue of the flow magnitude is too small
        if (zone.mag < ignoreThresh) {
          continue;
        }
        push();
          translate(zone.pos.x, zone.pos.y);

          //draw a rectangle to show the active zone
          stroke(255, 50);
          strokeWeight(0.5);
          noFill();
          rect(0,0, gridSize * 2, gridSize * 2);

          //check each particle if it is close to a bounding box based on the magnitude
          for(let p = 0; p < particles.length; p++){
            if(dist(particles[p].x, particles[p].y, ((zone.pos.x) + gridSize), ((zone.pos.y) + gridSize)) < zone.mag / 1.5){

              //change the magnitude based on how far it is from the center of the zone
              var distance = dist(particles[p].x, particles[p].y, ((zone.pos.x) + gridSize), ((zone.pos.y) + gridSize));
              var adjustment = map(distance, gridSize, 0, 0.01, 0.9);
              var velocity = (zone.mag * adjustment) / 10;

              //constrain the magnitude
              constrain(velocity, 1, 15);
              //effect the particle
              particles[p].effect(velocity, zone.angle);
            }
        }
        pop();
      }
    }
    //draw the video?

    //draw the particles
    if(particles.length >0){
        for(let part = 0; part < particles.length; part++){
          particles[part].display();
        }
    }

    pop();

    // copy the current pixels into previous for the next frame
    previousPixels = copyImage(video.pixels, previousPixels);

    //frame rate counter
    fill(255);
    stroke(0);
    strokeWeight(5);
    textSize(20);
    text("fps: " + frameRate(), 0, 20);
  }
}

function windowResized(){
  setup();
}


class Particle{
  constructor(startPosX, startPosY, velocity, angle, lifetime){

    this.acceleration = 0.01;
    this.x = startPosX;
    this.y = startPosY;
    this.startX = startPosX;
    this.startY = startPosY;
    this.velocity = velocity;

    this.angle = angle;
    this.lifetime = lifetime;
    this.age = 0;
    this.t = 0;

    this.color = color(0, 100, 255, 50);
    this.effected = false;
    this.effectX = 0;
    this.effectY = 0;
    this.dead = false;
  }

  update(){

    if(this.age < this.lifetime){

      //delete pixels out of bounds
      if(this.x < 0 || this.x > width || this.y < 0 || this.y > video.height){
        this.dead = true;
        return;
      }

      //physics
      this.x = this.startX + (cos(this.angle) * this.velocity * this.t);
      this.y = this.startY + (sin(this.angle) * this.velocity * this.t) + (0.5 * this.acceleration * sq(this.t));

      this.age++;
      this.t++;
      //gradually slow down particles over time
      if(this.velocity > 1) this.velocity *= 0.25;
    }else{
      this.dead = true;
    }
  }

  display(){
    noStroke();
    fill(this.color);
    circle(this.x, this.y, 2);
    fill(14, 94, 52, map(this.age, 0, this.lifetime, 100, 0));
    if(this.effected) circle(this.effectX, this.effectY, 2.5);
  }

  effect(magnitude, angle){
    this.effectX = this.x;
    this.effectY = this.y;
    this.color= color(142, 237, 202, 200);
    this.effected = true;
    this.velocity = magnitude;
    this.angle = angle;
  }
}

function keyPressed(){
  if(keyCode == 32) {
    if(!pause){
      noLoop();
      pause = true;
    }else{
      loop();
      pause = false;
    }
  }
}
