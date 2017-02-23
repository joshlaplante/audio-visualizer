/* START SONG SELECTION COMPONENT */

/* setup references to html elements */
var audioElement = document.getElementById('audio-element');
var songSelectButton = document.getElementById('song-select-button');
var songInput = document.getElementById('song-input');
var songTitleLabel = document.getElementById('song-title-label');
var songPlayButton = document.getElementById('song-play-button');

/* setup song-select-button to trigger the song-input on click, opening file dialogue */
songSelectButton.addEventListener('click', function(event) {
    songInput.click();
});

/* create variable to toggle value when audio file is/is not selected */
var audioSelectedToggle = 0;
/* setup function to run whenever new file is selected */
songInput.onchange = function() {
	var files = songInput.files;
	/* grab file extension and set it to lower case */
	var songFileExt = files[0].type.toLowerCase();
	/* setup regular expression to check if it is correct extension */
	var regEx = new RegExp("(.*?)\.(mp3|ogg|wav|mp4|m4a|webm)$");
	/* if it is, upload the file */
	if (regEx.test(songFileExt)){
	    var file = URL.createObjectURL(files[0]); 
	    /* set empty audio element source to selected file */
	    audioElement.src = file; 
	    /* update song title label to selected file */
	    var songTitle = 'Current Song: ';
	    songTitleLabel.innerHTML = songTitle + songInput.value;
	    /* toggle variable on */
	    audioSelectedToggle = 1;
    }
    else {
    	alert('Please select an audio file');
    	/* toggle variable off */
    	audioSelectedToggle = 0;
    };
};

/* setup play button click function */
songPlayButton.addEventListener('click', function(event) {
	/* only plays audio element if an audio file has been selected */
	if (audioSelectedToggle == 1){
    	audioElement.play();
    };
});

/* END SONG SELECTION COMPONENT */


/* START AUDIO COMPONENT */

/* create a variable to assign AudioContext */
var audioContext;

/* try instantiating a new AudioContext, throw an error if it fails */
try {
    /* setup an AudioContext, default to the non-prefixed version if possible */
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch(e) {
    throw new Error('The Web Audio API is unavailable');
}

/* setup Media Element Source Node from audio element */
var source = audioContext.createMediaElementSource(audioElement);

/* setup a frequency analyzer node for the AudioContext */
var freqAnalyzer = audioContext.createAnalyser();
/* set the FFT size (default is 2048) */
freqAnalyzer.fftSize = 256;
/* set the buffer length (default is half of the FFT) */
var freqBufferLength = freqAnalyzer.frequencyBinCount;
/* set up an 8 bit unsigned integeter array */
var freqDataArray = new Uint8Array(freqBufferLength);
/* wire the analyzer into the AudioContext*/
freqAnalyzer.connect(audioContext.destination);

/* setup a waveform analyzer node for the AudioContext */
var waveAnalyzer = audioContext.createAnalyser();
/* set the FFT size (default is 2048) */
waveAnalyzer.fftSize = 2048;
/* set the buffer length (default is half of the FFT) */
var waveBufferLength = waveAnalyzer.frequencyBinCount;
/* set up an 8 bit unsigned integeter array */
var waveDataArray = new Uint8Array(waveBufferLength);
/* wire the analyzer into the AudioContext*/
waveAnalyzer.connect(audioContext.destination);

/* wire the Media Source Element Node into both analyzer nodes */
source.connect(freqAnalyzer);
source.connect(waveAnalyzer);

/* END AUDIO COMPONENT */


/* START VISUAL COMPONENT */

/* setup FREQUENCY VISUALIZER first */

/* grab width and height of canvas */
var canvasWidth = document.getElementById('freq-canvas').offsetWidth;
var canvasHeight = document.getElementById('freq-canvas').offsetHeight;

/* setup function to draw frequency bars */
function drawFreq() {
	var canvas = document.getElementById('freq-canvas');
	/* check if canvas is supported */
	if (canvas.getContext) {
	    var canvasContext = canvas.getContext('2d');
	
		/* request to continue drawing */
	    drawVisual = requestAnimationFrame(drawFreq);
		/* grab the frequency data */
	    freqAnalyzer.getByteFrequencyData(freqDataArray);
		/* set style for canvas */
	    canvasContext.fillStyle = 'rgb(0, 0, 0)';
	    canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
	    /* setup bar width, height, and x position variable */
	    var barWidth = (canvasWidth / freqBufferLength) * 1;
	    var barHeight;
	    var x = 1;
	    /* loop through data values */
	    for(var i = 0; i < freqBufferLength; i++) {
    	/* set bar height to current frequency value*/
        barHeight = freqDataArray[i];
		/* set color and opacity for current bar */
        canvasContext.fillStyle = 'rgba(50,' + (barHeight+100) + ',50,' + (barHeight/canvasHeight) + ')';
        /* set dimensions for current bar*/
        canvasContext.fillRect(x,canvasHeight-barHeight/2,barWidth,barHeight);
		/* move x variable over for next bar */
        x += barWidth + 1;
        }
    };
}

/* call function to start drawing frequency visualizer bars */
drawFreq();

/* setup WAVEFORM VISUALIZER next */

/* setup some constant variables, numOfSlices can be increased 
 * to smooth out visualizer, but it increases latency */
var numOfSlices = 200;
/* setup step constant to partition waveform data into our slices */
var step = Math.floor(waveDataArray.length / numOfSlices);
/* anytime the analyser receives no data, all values in the array will be 128 */
var noSignal = 128;
/* create empty array to store slice data */
var slices = [];

/* setup function to clone an icon */
function iconClone(iconID){
	/* get the element we want to slice. */
	var icon = document.getElementById(iconID);
	
	/* reset the slice data array in case icon has already been cloned */
	slices = [];
	var rect = icon.getBoundingClientRect(),
	    /* grab dimensions around icon element */
	    rectWidth = rect.width,
	    rectHeight = rect.height,
	    /* determine how wide each slice will be */
	    widthPerSlice = rectWidth / numOfSlices;
	
	/* create a container <div> to hold our cloned slices */
	var cloneContainer = document.createElement('div');
	cloneContainer.className = 'clone-container';
	cloneContainer.style.width = rectWidth + 'px';
	cloneContainer.style.height = rectHeight + 'px';
	
	/* start slicing image */
	for (var i = 0; i < numOfSlices; i++) {
	    /* calculate the horizontal 'offset' for current slice */
	    var offset = i * widthPerSlice;
	
	    /* create a mask <div> for current slice */
	    var mask = document.createElement('div');
	    mask.className = 'mask';
	    mask.style.width = widthPerSlice + 'px';
	    /* for the best performance, and to prevent artefacting when we
	     * use 'scale' we instead use a 2d matrix that is in the form:
	     * matrix(scaleX, 0, 0, scaleY, translateX, translateY). We 
	     * initially translate by the 'offset' on the x-axis */
	    mask.style.transform = 'matrix(1,0,0,1,' + offset + '0)';
	
	    /* clone the original element */
	    var clone = icon.cloneNode(true);
	    clone.className = 'clone';
	    clone.style.width = rectWidth + 'px';
	    /* we won't be changing this transform so we don't need to use a matrix */
	    clone.style.transform = 'translate3d(' + -offset + 'px,0,0)';
	    clone.style.height = mask.style.height = rectHeight + 'px';
		
		/* add the clone slice into the mask <div>, and 
		 * the mask <div> into the clone container <div> */
	    mask.appendChild(clone);
	    cloneContainer.appendChild(mask);
	
	    /* add the 'offset' data to the slice data array for the render function */
	    slices.push({ offset: offset, elem: mask });
	}
	
	/* replace the original icon element with our new clone container of slices */
	waveContainer = document.querySelector('.wave-container');
	waveContainer.appendChild(cloneContainer);
}

/* setup the icon rendering function to animate the cloned slices */
function waveRender() {
    /* request to continue rendering animation */
    requestAnimationFrame(waveRender);
    waveAnalyzer.getByteTimeDomainData(waveDataArray);

    /* loop through the slices and step through the waveform data array */
    for (var i = 0, n = 0; i < numOfSlices; i++, n+=step) {
        var slice = slices[i],
            elem = slice.elem,
            offset = slice.offset;

        /* make sure the val is positive and divide it by the noSignal constant
         * to ensure a value suitable for use to scale by vertically */
        var val = Math.abs(waveDataArray[n]) / noSignal;
        
        /* change the scaleY value of current slice, while
         * keeping its original horizontal offset */
        elem.style.transform = 'matrix(1,0,0,' + val + ',' + offset + ',0)';
        elem.style.opacity = val;
    }
}

/* END VISUAL COMPONENT */

/* START BUTTON TOGGLE COMPONENT */

/* setup the WAVEFORM ICON TOGGLE BUTTONS first */

/* initialize variable to keep track of whether the waveRender is running */
var waveRenderToggle = 0;

/* setup reference to the icon toggle button */
var heartToggle = document.getElementById('heart-button');
/* define function to run when it's clicked */
heartToggle.addEventListener('click', function(event) {
	/* see if waveRender is currently running */
	if(waveRenderToggle==1){
		/* if so, cancel animation requests */
		cancelAnimationFrame(waveRender);
		/* then remove the whole clone container */
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	/* call the clone function on the respective icon */
	iconClone('heart-icon');
	/* start rendering animation on that clone and change the toggle variable */
    waveRender();
    waveRenderToggle = 1;
});

/* then repeat the above code nugget for all the other icon toggle buttons */

var ghettoblasterToggle = document.getElementById('ghettoblaster-button');
ghettoblasterToggle.addEventListener('click', function(event) {
	if(waveRenderToggle==1){
		cancelAnimationFrame(waveRender);
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	iconClone('ghettoblaster-icon');
    waveRender();
    waveRenderToggle = 1;
});

var moonToggle = document.getElementById('moon-button');
moonToggle.addEventListener('click', function(event) {
	if(waveRenderToggle==1){
		cancelAnimationFrame(waveRender);
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	iconClone('moon-icon');
    waveRender();
    waveRenderToggle = 1;
});

var starToggle = document.getElementById('star-button');
starToggle.addEventListener('click', function(event) {
	if(waveRenderToggle==1){
		cancelAnimationFrame(waveRender);
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	iconClone('star-icon');
    waveRender();
    waveRenderToggle = 1;
});

var noteToggle = document.getElementById('note-button');
noteToggle.addEventListener('click', function(event) {
	if(waveRenderToggle==1){
		cancelAnimationFrame(waveRender);
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	iconClone('note-icon');
    waveRender();
    waveRenderToggle = 1;
});

var rainToggle = document.getElementById('rain-button');
rainToggle.addEventListener('click', function(event) {
	if(waveRenderToggle==1){
		cancelAnimationFrame(waveRender);
		var currentClone = document.querySelector('.clone-container');
		currentClone.remove();
	};
	iconClone('rain-icon');
    waveRender();
    waveRenderToggle = 1;
});

/* setup VISUALIZER TOGGLE BUTTONS next */

/* hide the wave container when the freq toggle button is clicked, and vice versa. 
 * hide the start container when either toggle button is clicked*/

var freqToggle = document.getElementById('freq-button');
freqToggle.addEventListener('click', function(event) {
    freqContainer = document.querySelector('.freq-container');
    freqContainer.style.visibility = 'visible';
    startContainer = document.querySelector('.start-container');
    startContainer.style.visibility = 'hidden';
    waveContainer = document.querySelector('.wave-container');
    waveContainer.style.visibility = 'hidden';
    
});

var iconToggle = document.getElementById('icon-button');
iconToggle.addEventListener('click', function(event) {
    freqContainer = document.querySelector('.freq-container');
    freqContainer.style.visibility = 'hidden';
    startContainer = document.querySelector('.start-container');
    startContainer.style.visibility = 'hidden';
    waveContainer = document.querySelector('.wave-container');
    waveContainer.style.visibility = 'visible';
});

