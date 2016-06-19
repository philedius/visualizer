/* 

TODO:
    * Drag and drop music files?
    * Or maybe paste soundcloud links?
    * Or spotify?
    * Extract data in a meaningful way
    * Convey feeling of music <-- EASY
    * Clean up this filth some more!

*/

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
        analyser.getByteTimeDomainData(self.timeDomainData);
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
    this.timeDomainData = new Uint8Array(analyser.frequencyBinCount);
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
var songs = ['IFL', 'propaganda', 'promnight', 'tobira', 'marblesoda', 'frae', 'glosoli', 'mindspun', 'lippincott', 'endlessfantasy', 'bombay', 'stupidhoe'];
player.setAttribute('src', 'music/glosoli.mp3');
player.setAttribute('src', 'music/' + songs[Math.floor(Math.random() * songs.length)] + '.mp3');

var aSource = new audioSource(player);
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var width = window.innerWidth;
var height = window.innerHeight;
var halfWidth = width / 2;
var halfHeight = height / 2;
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
var framesSinceLastFloatingCircle = 0;
var volumeSinceLastFloatingCircle = 0;
var floatingCircles = [];


/*  Analyses and returns averages of bass, mid, and treble for each frame. Probably useless.
    TODO: need to find a way to mold data into usable stuff that can help with conveying the 
    feel of the audio better with visuals. */
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
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    frameCounter += 1;

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
    // hueShift: Shifts the hue of colors, speed of shifting depends on the total volume each frame
    hueShift += aSource.volume / 10000;

    // drawFloatingCircles();
    drawFrequencyBars();
    drawWaveform(aSource.timeDomainData, foregroundGradientStops[0], aSource.volume);    
    drawMiddleCircles();
    // drawRegularFrequencyBars();
    requestAnimationFrame(drawVisualizer);
};

var drawRegularFrequencyBars = function () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    var barWidth = (width / aSource.frequencyData.length * 2);
    for (var bin = 3; bin < aSource.frequencyData.length / 2 + 3; bin++) {
        var val = aSource.frequencyData[bin] * (1 + (bin / 150));
        ctx.fillRect((bin - 3) * barWidth, height - val * radiusAmplifier, Math.ceil(barWidth / 1.66), val * radiusAmplifier);
    }
}

var drawFrequencyBars = function () {
    /*  I only use half of the frequency bins, because often most of the second half is barely used
        and makes the visualizer look stupid. I also forego the 3 lowest frequency bins because they were
        fairly consistently maxed out on most songs I tested on, which made for lackluster visuals. */
    for (var bin = aSource.frequencyData.length / 2 + 3; bin > 3; bin--) {
        if (angleSize === 0) angleSize = 2 * Math.PI / (aSource.frequencyData.length / 2);
        startAngle = endAngle;
        endAngle += angleSize;
        /*  the * (1 + (bin / 150)) is to balance the bar a bit out. It was leaning heavily towards the bass
            which made for less satisfying visualization of treble-y parts, like snare hits. */
        var val = aSource.frequencyData[bin] * (1 + (bin / 150));        
        
        /* BACKGROUND FREQUENCY BARS */
        // hue: Hue of color within a certain colorRange and with a shift applied
        var hue = (val / 256 * colorRange + hueShift) % 360;
        // ColorVal: Value of color in the range of 25-40
        var colorVal = (val / 256 * 15) + 25;
        
        ctx.beginPath();
        // arc radius is minimum 300px radius, with added frequency value with amplifier
        if (val > 10) {
            ctx.arc(halfWidth, halfHeight, 20 + val * backgroundRadiusAmplifier, startAngle, endAngle, false);
        } else {
            ctx.arc(halfWidth, halfHeight, val * backgroundRadiusAmplifier, startAngle, endAngle, false);
        }
        
        ctx.lineTo(halfWidth, halfHeight);
        backgroundColor = 'hsla(' + hue % 360 + ', ' + backgroundSaturation + '%, ' + backgroundValue + '%, 0.2)';
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.closePath();

        /* FOREGROUND FREQUENCY BARS */
        /*  Subtraction from startAngle because of some offset I didn't understand that made gaps
            between bars. */
        startAngle -= 0.005;
        var hue = (val / 256 * colorRange + hueShift) % 360;
        /*  gradientHue: Color for second color stop. It has another hue shift added to it to recieve
            a complementary color a third of the way round the color wheel */
        var gradientHue = (hue + gradientHueShift) % 360;
        ctx.beginPath();
        /*  The radius has a minimum value of minRadius px, with added frequency value with amplifier */
        ctx.arc(halfWidth, halfHeight, minRadius + val * radiusAmplifier, startAngle, endAngle, false);
        ctx.lineTo(halfWidth, halfHeight);
        foregroundGradientStops[0] = 'hsl(' + gradientHue + ', ' + saturation + '%, ' + 70 + '%)';
        foregroundGradientStops[1] = 'hsl(' + hue + ', ' + saturation + '%, ' + colorVal + '%)';
        gradient = ctx.createRadialGradient(halfWidth, halfHeight, val, halfWidth, halfHeight, val * 2);
        gradient.addColorStop(0, foregroundGradientStops[0]);
        gradient.addColorStop(1, foregroundGradientStops[1]);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }
}

var drawMiddleCircles = function () {
    var middleCircleRadius = minRadius + (aSource.volume / 110);
    /*  Middle circle has a minimum radius of minRadius px so that it lines up with foreground frequency bars.
        It's radius is dependant on the overall volume per frame divided by a magic number that I felt
        made it coolest, yo. */
    
    var transparentWhite = 'rgba(255, 255, 255, 0.3)';
    drawCircle(halfWidth, halfHeight, middleCircleRadius, 'white');

    if (middleCircleRadius > 30) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 30, foregroundGradientStops[0]);
    }
    if (middleCircleRadius > 50) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 40, transparentWhite);
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 50, 'white');
    }
    if (middleCircleRadius > 80) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 80, foregroundGradientStops[1]);

    }
    if (middleCircleRadius > 100) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 90, transparentWhite);
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 100, 'white');
    }

    if (middleCircleRadius > 130) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 130, foregroundGradientStops[0]);
    }

    if (middleCircleRadius > 150) {
        drawCircle(halfWidth, halfHeight, middleCircleRadius - 150, transparentWhite);
    }
}

var drawWaveform = function (timeDomainData, style, volume) {
    var startHeight = halfHeight - timeDomainData[timeDomainData.length / 2];
    var alteredTimeDomainData = timeDomainData;
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = "lighter";
    var minLineWidth = 2;
    ctx.lineWidth = minLineWidth + volume / 1200;
    ctx.moveTo(0, startHeight * val);
    for (var i = 0; i < timeDomainData.length; i++) {
        var interval = width / timeDomainData.length;
        var size = 2;
        var val = timeDomainData[i];
        ctx.lineTo(i * interval, startHeight + val);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
}

var drawFloatingCircles = function () {

    volumeSinceLastFloatingCircle += aSource.volume;
    framesSinceLastFloatingCircle += 1;
    var thickness = 2;
    if (!isPaused) {
        var velocity = 2 + aSource.volume / 3000;
    } else {
        var velocity = 0;
    }
    if (volumeSinceLastFloatingCircle > 90000 && !isPaused) {
        floatingCircles.push(minRadius);
        volumeSinceLastFloatingCircle = 0;
    }
    ctx.lineWidth = thickness + aSource.volume / 6000;
    ctx.strokeStyle = foregroundGradientStops[1];
    ctx.beginPath();
    for (var i = 0; i < floatingCircles.length; i++) {
        floatingCircles[i] += velocity;
        if (floatingCircles[i] > width / 1.25) floatingCircles.splice(i, 1);
        ctx.arc(halfWidth, halfHeight, floatingCircles[i], 0, 2 * Math.PI, false);
        if (i + 1 < floatingCircles.length) ctx.moveTo(halfWidth + floatingCircles[i+1] + velocity, halfHeight);
    }
    ctx.globalAlpha = aSource.volume / 12000;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.closePath();
}

var drawCircle = function(x, y, radius, fillstyle) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = fillstyle;
    ctx.fill();
    ctx.closePath();
}

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

aSource.play();
drawVisualizer();