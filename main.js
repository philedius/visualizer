var audioSource = function(player) {
    var self = this;
    var audioCtx = new(window.AudioContext || window.webkitAudioContext);
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    var source = audioCtx.createMediaElementSource(player);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    var sampleAudio = function() {
        analyser.getByteFrequencyData(self.frequencyData);
        // calculate an overall volume value
        var total = 0;
        for (var i = 0; i < self.frequencyData.length; i++) {
            total += self.frequencyData[i];
        }
        self.volume = total;
    };
    setInterval(sampleAudio, 20);
    // public properties and methods
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    this.volume = 0;
    this.play = function() {
        player.play();
    }

    this.pause = function() {
        source.disconnect();
    }

    this.resume = function() {
        source.connect(analyser);
    }
}

var player = document.getElementById('player');
var songs = ['IFL', 'propaganda', 'promnight', 'tobira', 'marblesoda', 'frae', 'glosoli', 'mindspun', 'lippincott', 'endlessfantasy', 'smb', 'stupidhoe'];
// player.setAttribute('src', 'music/propaganda.mp3');
// player.setAttribute('src', 'music/' + songs[7] + '.mp3');
player.setAttribute('src', 'music/' + songs[Math.floor(Math.random() * songs.length)] + '.mp3');

var aSource = new audioSource(player);
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var width = window.innerWidth;
var height = window.innerHeight;
canvas.width = width;
canvas.height = height;
var saturation = 100;
var backgroundSaturation = 100;
var backgroundValue = 50;
var hueShift = (Math.random() * 360);
var gradientHueShift = 360 / 4;
var colorRange = 120;
var isPaused = false;
var backgroundColor;
var foregroundGradientStops = [];
var radiusAmplifier = 1.6;
var backgroundRadiusAmplifier = radiusAmplifier * 1.35;
var minRadius = 60;
var previousMidCircleSize = minRadius;
var frameCounter = 0;


// Analyses and returns averages of bass, mid, and treble for each frame. Probably useless.
// TODO: need to find a way to mold data into usable stuff that can help with conveying the 
//       feel of the audio better with visuals.
var analyseFrequencyData = function(audioSource) {
    analysedFrequencyData = {bassAvg: 0, midAvg: 0, trebleAvg: 0, totalAvg: 0};
    len = audioSource.frequencyData.length / 2 + 3;
    for (var bin = 4; bin < len; bin++) {
        if (bin < len / 3) analysedFrequencyData.bassAvg += audioSource.frequencyData[bin];
        if (bin >= len / 3 && bin <= len - (len / 3)) analysedFrequencyData.midAvg += audioSource.frequencyData[bin];
        if (bin > len - (len / 3)) analysedFrequencyData.trebleAvg += audioSource.frequencyData[bin];
        analysedFrequencyData.totalAvg += audioSource.frequencyData[bin];
    }

    analysedFrequencyData.bassAvg /= len;
    analysedFrequencyData.midAvg /= len;
    analysedFrequencyData.trebleAvg /= len;
    analysedFrequencyData.totalAvg /= len;

    return analysedFrequencyData;
}

var drawVisualizer = function() {
    frameCounter += 1;
    // analysedData = analyseFrequencyData(aSource);

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Make colors b/w monochromatic when paused
    if (!isPaused) {
        saturation = 100;
        backgroundSaturation = 100;
    } else {
        saturation = 0;
        backgroundSaturation = 0;
    }

    angleSize = 0;
    startAngle = 0;
    endAngle = -Math.PI / 2;
    // hueShift: Shifts the hue value of colors, speed of shifting depends on the total volume each frame
    hueShift += aSource.volume / 10000;

    // I only use half of the frequency bins, because often most of the second half is barely used
    // and makes the visualizer look stupid. I also forego the 3 lowest frequency bins because they were
    // fairly consistently maxed out on most songs I tested on, which made for lackluster visuals.
    for (var bin = aSource.frequencyData.length / 2 + 3; bin > 3; bin--) {
        if (angleSize === 0) angleSize = 2 * Math.PI / (aSource.frequencyData.length / 2);
        startAngle = endAngle;
        endAngle += angleSize;
        
        var val = aSource.frequencyData[bin];

        // ~~ Magic number land ~~
        
        // background
        // hue: Hue of color within a certain colorRange and with a shift applied
        var hue = (val / 256 * colorRange + hueShift) % 360;
        // ColorVal: Value of color in the range of 20-60
        var colorVal = (val / 256 * 30) + 20;
        
        ctx.beginPath();
        // arc radius is minimum 300px radius, with added frequency value with amplifier
        if (val > 10) {
            ctx.arc(width / 2, height / 2, 20 + val * (backgroundRadiusAmplifier + bin / 150), startAngle, endAngle, false);
        } else {
            ctx.arc(width / 2, height / 2, val * (backgroundRadiusAmplifier + bin / 150), startAngle, endAngle, false);
        }
        
        
        ctx.lineTo(width / 2, height / 2);
        backgroundColor = 'hsla(' + hue % 360 + ', ' + backgroundSaturation + '%, ' + backgroundValue + '%, 0.2)';
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.closePath();

        //foreground
        // Subtraction from startAngle because of some offset I didn't understand that made gaps
        // between bars.
        startAngle -= 0.005;
        var hue = (val / 256 * colorRange + hueShift) % 360;
        // gradientHue: Color for second color stop. It has another hue shift added to it to recieve
        //              a complementary color a third of the way round the color wheel
        var gradientHue = (hue + gradientHueShift) % 360;
        ctx.beginPath();
        // The radius has a minimum value of minRadius px, with added frequency value with amplifier
        // and has some magic number (bin/150) added to it to balance 
        // out the difference in frequency values to make the circle more even and prettier.
        // NOTE: It could be evened out more but it makes the colors go out of "alignment". Stupid hack
        // ctx.arc(width / 2, height / 2, minRadius + val * radiusAmplifier, startAngle, endAngle, false);
        ctx.arc(width / 2, height / 2, minRadius + val * (radiusAmplifier + bin / 150), startAngle, endAngle, false);
        ctx.lineTo(width / 2, height / 2);
        foregroundGradientStops[0] = 'hsl(' + gradientHue + ', ' + saturation + '%, ' + 65 + '%)';
        foregroundGradientStops[1] = 'hsl(' + hue + ', ' + saturation + '%, ' + colorVal + '%)';
        gradient = ctx.createRadialGradient(width / 2, height / 2, val, width / 2, height / 2, val * 2);
        gradient.addColorStop(0, foregroundGradientStops[0]);
        gradient.addColorStop(1, foregroundGradientStops[1]);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }

    // Middle circle
    var middleCircleRadius = minRadius + (aSource.volume / 110);
    ctx.beginPath();
    // Middle circle has a minimum radius of minRadius px so that it lines up with foreground frequency bars.
    // It's radius is dependant on the overall volume per frame divided by a magic number that I felt
    // made it coolest, yo.
    ctx.arc(width / 2, height / 2, middleCircleRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
    if (middleCircleRadius > 30) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 30, 0, 2 * Math.PI, false);
        ctx.fillStyle = foregroundGradientStops[0];
        ctx.fill();
        ctx.closePath();
    }
    if (middleCircleRadius > 50) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 40, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 50, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
    }
    if (middleCircleRadius > 80) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 80, 0, 2 * Math.PI, false);
        ctx.fillStyle = foregroundGradientStops[1];
        ctx.fill();
        ctx.closePath();
    }
    if (middleCircleRadius > 100) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 90, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 100, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
    }

    if (middleCircleRadius > 130) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 130, 0, 2 * Math.PI, false);
        ctx.fillStyle = foregroundGradientStops[0];
        ctx.fill();
        ctx.closePath();
    }

    if (middleCircleRadius > 150) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, middleCircleRadius - 150, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.closePath();
    }

    requestAnimationFrame(drawVisualizer);
};

aSource.play();

// Pause and unpause with spacebar
document.addEventListener("keydown", function(event) {
    if (event.which === 32 && !isPaused) {
        aSource.pause();
        isPaused = !isPaused;
    } else if (event.which === 32) {
        aSource.resume();
        isPaused = !isPaused;
    }
});


drawVisualizer();