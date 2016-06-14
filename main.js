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
        for (var i = 0; i < 80; i++) { // get the volume from the first 80 bins, else it gets too loud with treble
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
var songs = ['IFL', 'promnight', 'tobira', 'marblesoda', 'frae', 'glosoli', 'mindspun', 'lippincott', 'endlessfantasy', 'smb'];
// player.setAttribute('src', 'glosoli.mp3');
// player.setAttribute('src', songs[9] + '.mp3');
player.setAttribute('src', songs[Math.floor(Math.random() * songs.length)] + '.mp3');

var aSource = new audioSource(player);
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var width = window.innerWidth;
var height = window.innerHeight;
canvas.width = width;
canvas.height = height;
var saturation = 100;
var backgroundSaturation = 100;
var backgroundValue = 75;
var hueShift = (Math.random() * 360);
var gradientHueShift = 360 / 3;
var colorRange = 120;
var isPaused = false;
var backgroundColor;
var foregroundGradientStops = [];
var backgroundGradientStops = [];
var radiusAmplifier = 1.4;
var minRadius = 50;

var drawVisualizer = function() {
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
    hueShift += aSource.volume / 7000;

    // I only use half of the frequency bins, because often most of the second half is barely used
    // and makes the visualizer look stupid. I also forego the 3 lowest frequency bins because they were
    // fairly consistently maxed out on most songs I tested on, which made for lackluster visuals.
    for (bin = aSource.frequencyData.length / 2 + 3; bin > 3; bin--) {
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
        ctx.arc(width / 2, height / 2, 300 + val * radiusAmplifier, startAngle, endAngle, false);
        ctx.lineTo(width / 2, height / 2);
        // Background hue has 180 added to it to be give the color on the opposite side of the color wheel
        backgroundGradientStops[0] = 'hsla(' + (hue + 180) % 360 + ', ' + backgroundSaturation + '%, ' + backgroundValue + '%, 0.1)';
        backgroundGradientStops[1] = 'white';
        // Radius of the second stop is a combination of the frequency value 
        // and volume per frame, with some magic numbers thrown in for fun.
        var gradient = ctx.createRadialGradient(width / 2, height / 2, 30, width / 2, height / 2, 100 + (val * 2 + aSource.volume / 35) / 2);
        gradient.addColorStop(0, backgroundGradientStops[0]);
        gradient.addColorStop(1, backgroundGradientStops[1]);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();

        //foreground
        // Subtraction from startAngle because of some offset I didn't understand that made gaps
        // between bars.
        startAngle -= 0.01;
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
    ctx.beginPath();
    // Middle circle has a minimum radius of minRadius px so that it lines up with foreground frequency bars.
    // It's radius is dependant on the overall volume per frame divided by a magic number that I felt
    // made it coolest, yo.
    ctx.arc(width / 2, height / 2, minRadius + (aSource.volume / 120), 0, 2 * Math.PI, false);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();

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