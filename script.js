// Morse conversion arrays
var MORSE_MAP = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', 
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', 
    '9': '----.', '0': '-----'
};

var REVERSE_MORSE = {};
for (var key in MORSE_MAP) {
    if (MORSE_MAP.hasOwnProperty(key)) {
        REVERSE_MORSE[MORSE_MAP[key]] = key;
    }
}

// status variables
var curDir = 'coder';
var selAlgo = 'morse'; 
var audioCtx = null; 

// DOM selectors
var dropContainer = document.getElementById('algo-dropdown-container');
var dropTriggerBtn = document.getElementById('dropdown-trigger-btn');
var dropValueText = document.getElementById('dropdown-current-value');
var dropItems = document.querySelectorAll('.dropdown-item');
var shiftGroup = document.getElementById('shift-config-group');
var shiftVal = document.getElementById('cipher-shift');
var inStream = document.getElementById('input-stream');
var outBuf = document.getElementById('output-buffer');
var diagMode = document.getElementById('diagnostic-mode');
var btnHack = document.getElementById('btn-matrix-hack');
var btnCopy = document.getElementById('btn-copy');
var btnPlayAudio = document.getElementById('btn-play-audio');
var analyticsView = document.getElementById('analytics-view');
var modeCoder = document.getElementById('mode-coder');
var modeDecoder = document.getElementById('mode-decoder');
var inputLabel = document.getElementById('input-label');
var outputLabel = document.getElementById('output-label');

// core algorithms
var Pipelines = {
    encode: {
        morse: function(str) {
            return str.toUpperCase().split('').map(function(c) {
                return MORSE_MAP[c] || (c === ' ' ? '/' : '');
            }).filter(Boolean).join(' ').replace(/\/ /g, ' ');
        },
        binary: function(str) {
            return str.split('').map(function(c) {
                return c.charCodeAt(0).toString(2).padStart(8, '0');
            }).join(' ');
        },
        caesar: function(str, shift) {
            return str.replace(/[a-z]/gi, function(c) {
                var startCode = c.charCodeAt(0) >= 97 ? 97 : 65;
                return String.fromCharCode(((c.charCodeAt(0) - startCode + shift) % 26) + startCode)
            });
        },
        reverse: function(str) {
            return str.split('').reverse().join('')
        }
    },
    decode: {
        morse: function(str) {
            return str.trim().split(' ').map(function(word) {
                return word.split(' ').map(function(code) {
                    return REVERSE_MORSE[code] || '';
                }).join('');
            }).join(' ');
        },
        binary: function(str) {
            return str.trim().split(' ').map(function(bin) {
                return String.fromCharCode(parseInt(bin, 2));
            }).join('');
        },
        caesar: function(str, shift) {
            return Pipelines.encode.caesar(str, 26 - shift);
        },
        reverse: function(str) {
            return str.split('').reverse().join('');
        }
    }
};

function runSystemPipeline() {
    var text = inStream.value;
    var algo = selAlgo;
    
    // debug check
    console.log("running pipeline for: " + algo);

    diagMode.textContent = "MODE: " + curDir.toUpperCase() + " // " + algo.toUpperCase();

    if (algo === 'morse' && curDir === 'coder' && text.trim().length > 0) {
        btnPlayAudio.disabled = false;
    } else {
        btnPlayAudio.disabled = true;
    }

    if (!text) {
        outBuf.textContent = "Awaiting pipeline compilation...";
        outBuf.classList.add('text-muted');
        runDiagnosticAnalytics('', '');
        return;
    }
    outBuf.classList.remove('text-muted');

    var result = "";
    var shift = parseInt(shiftVal.value) || 0;

    if (curDir === 'coder') {
        result = (algo === 'caesar') ? Pipelines.encode.caesar(text, shift) : Pipelines.encode[algo](text);
    } else {
        result = (algo === 'caesar') ? Pipelines.decode.caesar(text, shift) : Pipelines.decode[algo](text);
    }

    outBuf.textContent = result;
    
    if (curDir === 'coder') {
        runDiagnosticAnalytics(text, result);
    } else {
        runDiagnosticAnalytics(result, text);
    }
}

function runDiagnosticAnalytics(plainText, convertedText) {
    var cleanText = plainText.toUpperCase();
    var totalChars = cleanText.replace(/\s/g, '').length;
    
    var dots = 0;
    var dashes = 0;
    
    // basic loop for counters
    for (var i = 0; i < cleanText.length; i++) {
        var char = cleanText[i];
        if (MORSE_MAP[char]) {
            dots += (MORSE_MAP[char].match(/\./g) || []).length;
            dashes += (MORSE_MAP[char].match(/-/g) || []).length;
        }
    }
    var totalSignals = dots + dashes || 1;

    var zeros = 0;
    var ones = 0;
    var binaryString = (selAlgo === 'binary' && curDir === 'coder') ? convertedText : Pipelines.encode.binary(plainText);
    
    for (var j = 0; j < binaryString.length; j++) {
        var bit = binaryString[j];
        if (bit === '0') zeros++;
        if (bit === '1') ones++;
    }
    var totalBits = zeros + ones || 1;

    analyticsView.innerHTML = 
        '<div class="analyzer-section-title">Global Analytics</div>' +
        '<div class="analyzer-bar-row">' +
            '<div class="char-label">CHARS</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width: ' + Math.min(totalChars * 5, 100) + '%"></div></div>' +
            '<div class="char-count">' + totalChars + '</div>' +
        '</div>' +
        '<div class="analyzer-section-title">Morse Weight Metrics</div>' +
        '<div class="analyzer-bar-row">' +
            '<div class="char-label">DOTS (.)</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width: ' + ((dots / totalSignals) * 100) + '%; background-color: var(--accent)"></div></div>' +
            '<div class="char-count">' + dots + '</div>' +
        '</div>' +
        '<div class="analyzer-bar-row">' +
            '<div class="char-label">DASHES(-)</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width: ' + ((dashes / totalSignals) * 100) + '%; background-color: #ff3b30"></div></div>' +
            '<div class="char-count">' + dashes + '</div>' +
        '</div>' +
        '<div class="analyzer-section-title">Binary Bit Weights</div>' +
        '<div class="analyzer-bar-row">' +
            '<div class="char-label">ZEROS (0)</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width: ' + ((zeros / totalBits) * 100) + '%; background-color: #ffcc00"></div></div>' +
            '<div class="char-count">' + zeros + '</div>' +
        '</div>' +
        '<div class="analyzer-bar-row">' +
            '<div class="char-label">ONES (1)</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width: ' + ((ones / totalBits) * 100) + '%; background-color: var(--primary)"></div></div>' +
            '<div class="char-count">' + ones + '</div>' +
        '</div>';
}

function playMorseAudio() {
    var morseCode = outBuf.textContent;
    if (!morseCode || morseCode.includes("Awaiting")) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    btnPlayAudio.disabled = true;
    var currentTime = audioCtx.currentTime;
    
    var dotDuration = 0.1; 
    var dashDuration = dotDuration * 3;
    var intraLetterSpace = dotDuration;
    var interLetterSpace = dotDuration * 3;
    var interWordSpace = dotDuration * 7;

    var words = morseCode.split(' ');

    words.forEach(function(word) {
        var characters = word.split(' ');
        characters.forEach(function(char) {
            for (var i = 0; i < char.length; i++) {
                var symbol = char[i];
                if (symbol === '.' || symbol === '-') {
                    var duration = (symbol === '.') ? dotDuration : dashDuration;
                    var osc = audioCtx.createOscillator();
                    var gain = audioCtx.createGain();
                    
                    osc.type = "square"; 
                    osc.frequency.value = 600; 
                    
                    gain.gain.setValueAtTime(0, currentTime);
                    gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.005); 
                    gain.gain.setValueAtTime(0.1, currentTime + duration - 0.005);
                    gain.gain.linearRampToValueAtTime(0, currentTime + duration);
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    osc.start(currentTime);
                    osc.stop(currentTime + duration);
                    
                    currentTime += duration + intraLetterSpace;
                }
            }
            currentTime += interLetterSpace - intraLetterSpace;
        });
        currentTime += interWordSpace - interLetterSpace;
    });

    setTimeout(function() {
        btnPlayAudio.disabled = false;
    }, (currentTime - audioCtx.currentTime) * 1000);
}

function initApp() {
    inStream.addEventListener('input', runSystemPipeline);
    shiftVal.addEventListener('input', runSystemPipeline);

    dropTriggerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropContainer.classList.toggle('open');
    });

    dropItems.forEach(function(item) {
        item.addEventListener('click', function() {
            dropItems.forEach(function(i) { i.classList.remove('active'); });
            item.classList.add('active');

            dropValueText.textContent = item.textContent;
            selAlgo = item.getAttribute('data-value');

            shiftGroup.style.display = (selAlgo === 'caesar') ? 'flex' : 'none';
            dropContainer.classList.remove('open');
            runSystemPipeline();
        });
    });

    document.addEventListener('click', function() {
        dropContainer.classList.remove('open');
    });

    modeCoder.addEventListener('click', function() {
        curDir = 'coder';
        modeCoder.classList.add('active');
        modeDecoder.classList.remove('active');
        inputLabel.textContent = "Input Cleartext Stream (English)";
        outputLabel.textContent = "Transcoded Output Manifest";
        inStream.placeholder = "Type plain readable text message here...";
        runSystemPipeline();
    });

    modeDecoder.addEventListener('click', function() {
        curDir = 'decoder';
        modeDecoder.classList.add('active');
        modeCoder.classList.remove('active');
        inputLabel.textContent = "Input Encoded Stream Array";
        outputLabel.textContent = "Decoded Plaintext Output Manifest";
        inStream.placeholder = "Paste Morse code (. -), Binary blocks (01001000), or encrypted text streams here...";
        runSystemPipeline();
    });

    btnCopy.addEventListener('click', function() {
        var textToCopy = outBuf.textContent;
        if (!textToCopy || textToCopy.includes("Awaiting")) return;
        
        navigator.clipboard.writeText(textToCopy).then(function() {
            var originalText = btnCopy.textContent;
            btnCopy.textContent = "✅ Copied Buffer!";
            setTimeout(function() { btnCopy.textContent = originalText; }, 1500);
        });
    });

    btnPlayAudio.addEventListener('click', playMorseAudio);

    btnHack.addEventListener('click', function() {
        var outText = outBuf.textContent;
        if (outText.includes("Awaiting")) return;
        
        var count = 0;
        btnHack.disabled = true;
        
        var clock = setInterval(function() {
            outBuf.innerHTML = outText.split('').map(function(c) {
                if (c === ' ' || c === '\n') return c;
                return Math.random() > (count / 12) ? ("⚡01.-*X#@"[Math.floor(Math.random() * 9)]) : c;
            }).join('');
            
            if (++count > 12) {
                clearInterval(clock);
                outBuf.textContent = outText;
                btnHack.disabled = false;
                console.log("scramble completed");
            }
        }, 50);
    });

    runSystemPipeline();
}

// load logic
document.addEventListener('DOMContentLoaded', initApp);
