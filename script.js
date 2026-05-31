const MORSE_MAP = {
    'A': '.-',  
    'B': '-...', 
    'C': '-.-.', 
    'D': '-..', 
    'E': '.', 
    'F': '..-.', 
    'G': '--.', 
    'H': '....',
    'I': '..', 
    'J': '.---', 
    'K': '-.-', 
    'L': '.-..', 
    'M': '--', 
    'N': '-.', 
    'O': '---', 
    'P': '.--.',
    'Q': '--.-', 
    'R': '.-.', 
    'S': '...', 
    'T': '-', 
    'U': '..-', 
    'V': '...-', 
    'W': '.--', 
    'X': '-..-',
    'Y': '-.--', 
    'Z': '--..', 
    '1': '.----', 
    '2': '..---', 
    '3': '...--', 
    '4': '....-', 
    '5': '.....',
    '6': '-....', 
    '7': '--...', 
    '8': '---..', 
    '9': '----.', 
    '0': '-----'
};
const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

let currentDirection = 'coder';
let selectedAlgorithm = 'morse'; 
let audioCtx = null; 

const elements = {
    dropdownContainer: document.getElementById('algo-dropdown-container'),
    
    dropdownTriggerBtn: document.getElementById('dropdown-trigger-btn'),
    
    dropdownValueText: document.getElementById('dropdown-current-value'),
    
    dropdownItems: document.querySelectorAll('.dropdown-item'),
    
    shiftGroup: document.getElementById('shift-config-group'),
    
    shiftValue: document.getElementById('cipher-shift'),
    
    inputStream: document.getElementById('input-stream'),
    
    outputBuffer: document.getElementById('output-buffer'),
    
    diagnosticMode: document.getElementById('diagnostic-mode'),
    
    btnHack: document.getElementById('btn-matrix-hack'),
    
    btnCopy: document.getElementById('btn-copy'),
    
    btnPlayAudio: document.getElementById('btn-play-audio'),
    
    analyticsView: document.getElementById('analytics-view'),
    
    modeCoder: document.getElementById('mode-coder'),
    
    modeDecoder: document.getElementById('mode-decoder'),
    
    inputLabel: document.getElementById('input-label'),
    
    outputLabel: document.getElementById('output-label')
};

const Pipelines = {
    encode: {
    
        morse: (str) => str.toUpperCase().split('').map(c => MORSE_MAP[c] || (c === ' ' ? '/' : '')).filter(Boolean).join(' ').replace(/\/ /g, ' '),
        binary: (str) => str.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '),
        caesar: (str, shift) => str.replace(/[a-z]/gi, c => String.fromCharCode(((c.charCodeAt(0) - (c.charCodeAt(0) >= 97 ? 97 : 65) + shift) % 26) + (c.charCodeAt(0) >= 97 ? 97 : 65))),
        reverse: (str) => str.split('').reverse().join('')
    },

    decode: {
        morse: (str) => str.trim().split(' ').map(word => word.split(' ').map(code => REVERSE_MORSE[code] || '').join('')).join(' '),
        binary: (str) => str.trim().split(' ').map(bin => String.fromCharCode(parseInt(bin, 2))).join(''),
        caesar: (str, shift) => Pipelines.encode.caesar(str, 26 - shift),
        reverse: (str) => str.split('').reverse().join('')
    }
};

function runSystemPipeline() {
    
    const text = elements.inputStream.value;
    const algo = selectedAlgorithm;
    
    elements.diagnosticMode.textContent = `MODE: ${currentDirection.toUpperCase()} // ${algo.toUpperCase()}`;

    if (algo === 'morse' && currentDirection === 'coder' && text.trim().length > 0) {
        elements.btnPlayAudio.disabled = false;
    } else {
        elements.btnPlayAudio.disabled = true;
    }

    if (!text) {
        elements.outputBuffer.textContent = "Awaiting pipeline compilation...";
        elements.outputBuffer.classList.add('text-muted');
        runDiagnosticAnalytics('', '');
        return;
    }
    elements.outputBuffer.classList.remove('text-muted');

    let result = "";
    const shift = parseInt(elements.shiftValue.value) || 0;

    if (currentDirection === 'coder') {
        result = algo === 'caesar' ? Pipelines.encode.caesar(text, shift) : Pipelines.encode[algo](text);
    } else {
        result = algo === 'caesar' ? Pipelines.decode.caesar(text, shift) : Pipelines.decode[algo](text);
    }

    elements.outputBuffer.textContent = result;
    
    if (currentDirection === 'coder') {
        runDiagnosticAnalytics(text, result);
    } else {
        runDiagnosticAnalytics(result, text);
    }
}

function runDiagnosticAnalytics(plainText, convertedText) {
    const cleanText = plainText.toUpperCase();
    let totalChars = cleanText.replace(/\s/g, '').length;
    
    let dots = 0, dashes = 0;
    for (let char of cleanText) {
        if (MORSE_MAP[char]) {
            dots += (MORSE_MAP[char].match(/\./g) || []).length;
            dashes += (MORSE_MAP[char].match(/-/g) || []).length;
        }
    }
    const totalSignals = dots + dashes || 1;

    let zeros = 0, ones = 0;
    const binaryString = selectedAlgorithm === 'binary' && currentDirection === 'coder' ? convertedText : Pipelines.encode.binary(plainText);
    for (let bit of binaryString) {
        if (bit === '0') zeros++;
        if (bit === '1') ones++;
    }
    const totalBits = zeros + ones || 1;

    elements.analyticsView.innerHTML = `
        <div class="analyzer-section-title">Global Analytics</div>
        <div class="analyzer-bar-row">
            <div class="char-label">CHARS</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(totalChars * 5, 100)}%"></div></div>
            <div class="char-count">${totalChars}</div>
        </div>


        <div class="analyzer-section-title">Morse Weight Metrics</div>
        <div class="analyzer-bar-row">
            <div class="char-label">DOTS (.)</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${(dots / totalSignals) * 100}%; background-color: var(--accent)"></div></div>
            <div class="char-count">${dots}</div>
        </div>
        <div class="analyzer-bar-row">
            <div class="char-label">DASHES(-)</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${(dashes / totalSignals) * 100}%; background-color: #ff3b30"></div></div>
            <div class="char-count">${dashes}</div>
        </div>


        <div class="analyzer-section-title">Binary Bit Weights</div>
        <div class="analyzer-bar-row">
            <div class="char-label">ZEROS (0)</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${(zeros / totalBits) * 100}%; background-color: #ffcc00"></div></div>
            <div class="char-count">${zeros}</div>
        </div>
        <div class="analyzer-bar-row">
            <div class="char-label">ONES (1)</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${(ones / totalBits) * 100}%; background-color: var(--primary)"></div></div>
            <div class="char-count">${ones}</div>
        </div>
    `;
}

function playMorseAudio() {
    const morseCode = elements.outputBuffer.textContent;
    if (!morseCode || morseCode.includes("Awaiting")) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    elements.btnPlayAudio.disabled = true;
    let currentTime = audioCtx.currentTime;
    
    const dotDuration = 0.1; 
    
    const dashDuration = dotDuration * 3;
    
    const intraLetterSpace = dotDuration;
    
    const interLetterSpace = dotDuration * 3;
    
    const interWordSpace = dotDuration * 7;

    const words = morseCode.split(' ');

    words.forEach((word) => {
        const characters = word.split(' ');
        characters.forEach((char) => {
            for (let symbol of char) {
                if (symbol === '.' || symbol === '-') {
                    const duration = (symbol === '.') ? dotDuration : dashDuration;
                    
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    
                    osc.type = 'square'; 
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

    setTimeout(() => {
        elements.btnPlayAudio.disabled = false;
    }, (currentTime - audioCtx.currentTime) * 1000);
}

function initApp() {
    elements.inputStream.addEventListener('input', runSystemPipeline);
    
    elements.shiftValue.addEventListener('input', runSystemPipeline);

    elements.dropdownTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.dropdownContainer.classList.toggle('open');
    });

    elements.dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            elements.dropdownValueText.textContent = item.textContent;
            selectedAlgorithm = item.getAttribute('data-value');

            elements.shiftGroup.style.display = selectedAlgorithm === 'caesar' ? 'flex' : 'none';
            
            elements.dropdownContainer.classList.remove('open');
            runSystemPipeline();
        });
    });

    document.addEventListener('click', () => {
        elements.dropdownContainer.classList.remove('open');
    });

    elements.modeCoder.addEventListener('click', () => {
        currentDirection = 'coder';
    
        elements.modeCoder.classList.add('active');
    
        elements.modeDecoder.classList.remove('active');
    
        elements.inputLabel.textContent = "Input Cleartext Stream (English)";
    
        elements.outputLabel.textContent = "Transcoded Output Manifest";
    
        elements.inputStream.placeholder = "Type plain readable text message here...";
    
        runSystemPipeline();
    });

    elements.modeDecoder.addEventListener('click', () => {
        currentDirection = 'decoder';
    
        elements.modeDecoder.classList.add('active');
    
        elements.modeCoder.classList.remove('active');
    
        elements.inputLabel.textContent = "Input Encoded Stream Array";
    
        elements.outputLabel.textContent = "Decoded Plaintext Output Manifest";
    
        elements.inputStream.placeholder = "Paste Morse code (. -), Binary blocks (01001000), or encrypted text streams here...";
        runSystemPipeline();
    });

    elements.btnCopy.addEventListener('click', () => {
        const textToCopy = elements.outputBuffer.textContent;
        if (!textToCopy || textToCopy.includes("Awaiting")) return;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = elements.btnCopy.textContent;
            elements.btnCopy.textContent = "✅ Copied Buffer!";
            setTimeout(() => elements.btnCopy.textContent = originalText, 1500);
        });
    });

    elements.btnPlayAudio.addEventListener('click', playMorseAudio);

    elements.btnHack.addEventListener('click', () => {
        const outText = elements.outputBuffer.textContent;
        if (outText.includes("Awaiting")) return;
        
        let count = 0;
        elements.btnHack.disabled = true;
        const clock = setInterval(() => {
            elements.outputBuffer.innerHTML = outText.split('').map(c => {
                if(c === ' ' || c === '\n') return c;
                return Math.random() > (count / 12) ? ("⚡01.-*X#@"[Math.floor(Math.random() * 9)]) : c;
            }).join('');
            if (++count > 12) {
                clearInterval(clock);
                elements.outputBuffer.textContent = outText;
                elements.btnHack.disabled = false;
            }
        }, 50);
    });

    runSystemPipeline();
}

document.addEventListener('DOMContentLoaded', initApp);