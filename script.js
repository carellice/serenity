document.addEventListener('DOMContentLoaded', function() {
    // Elenco di tutti i suoni disponibili
    const soundFiles = [
        'white-noise.mp3',
        'brown-noise.mp3',
        'pink-noise.mp3',
        'rain.wav',
        'storm.mp3',
        'wind.mp3',
        'stream.mp3',
        'birds.mp3',
        'waves.mp3',
        'boat.mp3',
        'city.mp3',
        'fireplace.mp3',
        'hair-dryer.mp3'
    ];

    // Oggetto per memorizzare i suoni
    const sounds = {};
    
    // Flag per sapere se l'audio è stato sbloccato
    let audioUnlocked = false;
    
    // Verifica se il dispositivo è un iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log("Dispositivo iOS rilevato:", isIOS);
    
    // AudioContext globale per iOS
    let audioContext = null;
    
    // Nodi gain per iOS
    const gainNodes = {};
    
    // Indicatore di caricamento
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-overlay';
    loadingElement.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Caricamento suoni in corso...</p>
            <p class="loading-progress">0/${soundFiles.length}</p>
        </div>
    `;
    document.body.appendChild(loadingElement);

    // Contatore per i file caricati
    let loadedCount = 0;

    // Funzione che aggiorna l'indicatore di progresso
    function updateLoadingProgress() {
        loadedCount++;
        const progressElement = document.querySelector('.loading-progress');
        progressElement.textContent = `${loadedCount}/${soundFiles.length}`;
        
        // Se tutti i file sono stati caricati, nascondi l'indicatore di caricamento
        if (loadedCount === soundFiles.length) {
            // Aggiungi un pulsante per sbloccare l'audio
            const unlockButton = document.createElement('button');
            unlockButton.className = 'unlock-audio-button';
            // unlockButton.textContent = isIOS ? 'Tocca qui per iniziare (iOS)' : 'Inizia a Rilassarti';
            unlockButton.textContent = isIOS ? 'Inizia a Rilassarti' : 'Inizia a Rilassarti';
            unlockButton.addEventListener('click', function() {
                unlockAudio();
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.remove();
                }, 500);
            });
            
            const loadingContainer = document.querySelector('.loading-container');
            loadingContainer.appendChild(unlockButton);
        }
    }

    // Inizializza l'AudioContext per iOS
    function initAudioContextiOS() {
        if (audioContext) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            console.log("AudioContext creato per iOS:", audioContext.state);
            
            // Resume AudioContext se necessario
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed:", audioContext.state);
                });
            }
        } catch (e) {
            console.error("Errore creazione AudioContext:", e);
        }
    }

    // Carica un buffer audio per iOS
    function loadAudioBufferiOS(url) {
        return new Promise((resolve, reject) => {
            if (!audioContext) {
                initAudioContextiOS();
            }
            
            // Fetch del file audio
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    resolve(audioBuffer);
                })
                .catch(error => {
                    console.error(`Errore caricamento buffer audio ${url}:`, error);
                    reject(error);
                });
        });
    }

    // Funzione per sbloccare l'audio su iOS
    function unlockIOSAudio() {
        console.log("Tentativo di sblocco audio iOS...");
        
        if (!audioContext) {
            initAudioContextiOS();
        }
        
        // Su iOS, creiamo un breve suono per sbloccare il contesto audio
        if (audioContext) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            gainNode.gain.value = 0.001; // Volume quasi inudibile
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(0);
            oscillator.stop(0.001);
            
            // Resume AudioContext in response to user gesture
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed after unlock:", audioContext.state);
                });
            }
            
            console.log("iOS audio unlock attempted");
        }
    }

    // Funzione generica per sbloccare l'audio
    function unlockAudio() {
        if (audioUnlocked) return;
        
        if (isIOS) {
            unlockIOSAudio();
            
            // Inizializza tutti i nodi per i suoni
            for (const soundId in sounds) {
                if (sounds[soundId] && sounds[soundId].buffer) {
                    setupAudioNodesiOS(soundId);
                }
            }
        } else {
            // Approccio standard per altri browser
            for (const sound in sounds) {
                if (sounds[sound] && sounds[sound].element) {
                    const originalVolume = sounds[sound].element.volume;
                    sounds[sound].element.volume = 0;
                    
                    sounds[sound].element.play().then(() => {
                        sounds[sound].element.pause();
                        sounds[sound].element.currentTime = 0;
                        sounds[sound].element.volume = originalVolume;
                    }).catch(e => {
                        console.warn(`Silent play non riuscito per ${sound}:`, e);
                        sounds[sound].element.volume = originalVolume;
                    });
                }
            }
        }
        
        audioUnlocked = true;
        console.log('Audio sbloccato con successo');
    }

    // Configurazione dei nodi audio per iOS
    function setupAudioNodesiOS(soundId) {
        if (!audioContext || !sounds[soundId] || !sounds[soundId].buffer) return;
        
        try {
            // Creiamo nodi audio freschi ogni volta
            const source = audioContext.createBufferSource();
            source.buffer = sounds[soundId].buffer;
            source.loop = true;
            
            // Crea gain node
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // Inizia muto
            
            // Connetti i nodi
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Memorizza i nodi
            sounds[soundId].source = source;
            gainNodes[soundId] = gainNode;
            sounds[soundId].playing = false;
            sounds[soundId].volume = 0;
            
            console.log(`Nodi audio configurati per ${soundId}`);
        } catch (e) {
            console.error(`Errore configurazione nodi audio per ${soundId}:`, e);
        }
    }

    // Gestione playback per iOS con Web Audio API
    function playIOSSoundWithWebAudio(soundId, volume) {
        if (!audioContext || !sounds[soundId]) return;
        
        // Assicurati che l'AudioContext sia attivo
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Memorizza il volume desiderato
        sounds[soundId].volume = volume;
        
        // Se il volume è 0 e sta suonando, ferma
        if (volume === 0 && sounds[soundId].playing) {
            try {
                if (sounds[soundId].source) {
                    sounds[soundId].source.stop();
                }
                sounds[soundId].playing = false;
                console.log(`Fermato suono ${soundId}`);
                
                // Prepara nuovi nodi
                setupAudioNodesiOS(soundId);
            } catch (e) {
                console.warn(`Errore fermando ${soundId}:`, e);
            }
            return;
        }
        
        // Se il volume > 0 ma non sta suonando, avvia
        if (volume > 0 && !sounds[soundId].playing) {
            try {
                // Prepara nuovi nodi se necessario
                if (!sounds[soundId].source) {
                    setupAudioNodesiOS(soundId);
                }
                
                // Imposta il volume
                if (gainNodes[soundId]) {
                    gainNodes[soundId].gain.value = volume;
                }
                
                // Avvia il suono
                sounds[soundId].source.start();
                sounds[soundId].playing = true;
                console.log(`Avviato suono ${soundId} con volume ${volume}`);
            } catch (e) {
                console.error(`Errore avviando ${soundId}:`, e);
                // Riprova a configurare e avviare
                setupAudioNodesiOS(soundId);
                try {
                    if (gainNodes[soundId]) {
                        gainNodes[soundId].gain.value = volume;
                    }
                    sounds[soundId].source.start();
                    sounds[soundId].playing = true;
                } catch (retryError) {
                    console.error(`Secondo tentativo fallito per ${soundId}:`, retryError);
                }
            }
        } 
        // Se sta già suonando, aggiorna solo il volume
        else if (volume > 0 && sounds[soundId].playing) {
            if (gainNodes[soundId]) {
                gainNodes[soundId].gain.value = volume;
                console.log(`Aggiornato volume di ${soundId} a ${volume}`);
            }
        }
    }

    // Approccio standard per dispositivi non-iOS
    function playStandardSound(soundId, volume) {
        const sound = sounds[soundId];
        if (!sound || !sound.element) return;
        
        // Imposta il volume
        sound.volume = volume;
        sound.element.volume = volume;
        
        // Avvia o ferma l'audio in base al volume
        if (volume > 0 && sound.element.paused) {
            sound.element.play().catch(error => {
                console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                
                // Riprova dopo un breve momento
                setTimeout(() => {
                    sound.element.play().catch(e => {
                        console.error(`Secondo tentativo fallito per ${soundId}:`, e);
                    });
                }, 100);
            });
            sound.playing = true;
        } else if (volume === 0 && !sound.element.paused) {
            sound.element.pause();
            sound.element.currentTime = 0;
            sound.playing = false;
        }
    }

    // Funzione per precaricare un file audio (approccio diverso per iOS)
    function preloadAudio(url, soundId) {
        if (isIOS) {
            // Approccio Web Audio API per iOS
            return loadAudioBufferiOS(`sounds/${soundId}`)
                .then(buffer => {
                    sounds[soundId] = {
                        buffer: buffer,
                        volume: 0,
                        playing: false
                    };
                    
                    // Preconfiguriamo i nodi audio per questo suono
                    setupAudioNodesiOS(soundId);
                    
                    return buffer;
                });
        } else {
            // Approccio standard per altri browser
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                
                audio.addEventListener('canplaythrough', () => {
                    resolve(audio);
                }, {once: true});
                
                audio.addEventListener('error', (error) => {
                    console.error(`Errore nel caricare: ${url}`, error);
                    reject(error);
                });
                
                audio.preload = 'auto';
                audio.src = url;
                audio.loop = true;
                audio.volume = 0;
                audio.load();
            });
        }
    }

    // Precarica tutti i suoni
    if (isIOS) {
        // Per iOS inizializziamo prima l'AudioContext
        initAudioContextiOS();
        
        // Poi carichiamo ogni suono
        const loadPromises = soundFiles.map(file => {
            const soundId = file;
            return loadAudioBufferiOS(`sounds/${file}`)
                .then(buffer => {
                    sounds[soundId] = {
                        buffer: buffer,
                        volume: 0,
                        playing: false
                    };
                    updateLoadingProgress();
                    return buffer;
                })
                .catch(error => {
                    console.error(`Errore caricamento ${file}:`, error);
                    updateLoadingProgress();
                    sounds[soundId] = {
                        buffer: null,
                        volume: 0,
                        playing: false
                    };
                });
        });
        
        Promise.all(loadPromises)
            .then(() => {
                console.log('Tutti i buffer audio caricati per iOS');
                initializeSliders();
            })
            .catch(error => {
                console.error('Errore caricamento buffer:', error);
                initializeSliders();
            });
    } else {
        // Approccio standard per altri browser
        Promise.all(soundFiles.map(file => {
            const soundId = file;
            return preloadAudio(`sounds/${file}`)
                .then(audio => {
                    sounds[soundId] = { 
                        element: audio, 
                        volume: 0,
                        playing: false
                    };
                    
                    // Soluzione per il gap nel loop
                    audio.addEventListener('timeupdate', function() {
                        const buffer = 0.44; // Buffer di 440ms prima della fine
                        if (this.currentTime > this.duration - buffer) {
                            this.currentTime = 0;
                        }
                    });
                    
                    updateLoadingProgress();
                    return audio;
                })
                .catch(error => {
                    updateLoadingProgress();
                    sounds[soundId] = { 
                        element: new Audio(), 
                        volume: 0,
                        playing: false
                    };
                });
        }))
        .then(() => {
            console.log('Tutti i suoni precaricati con successo');
            initializeSliders();
        })
        .catch(error => {
            console.error('Errore nel precaricamento:', error);
            initializeSliders();
        });
    }

    // Inizializza gli slider
    function initializeSliders() {
        const sliders = document.querySelectorAll('.slider');
        
        // Funzione comune per gestire i cambiamenti di volume
        function handleVolumeChange(slider) {
            const soundId = slider.dataset.sound;
            const volume = slider.value / 100;
            
            if (isIOS) {
                playIOSSoundWithWebAudio(soundId, volume);
            } else {
                playStandardSound(soundId, volume);
            }
        }
        
        // Aggiungi event listener a tutti gli slider
        sliders.forEach(slider => {
            // Per iOS, aggiungi un evento di click diretto che farà sbloccare l'audio
            if (isIOS) {
                slider.addEventListener('click', function(e) {
                    // Sblocca l'audio al primo click
                    if (!audioUnlocked) {
                        unlockAudio();
                    }
                    
                    // Calcola la posizione relativa del click
                    const rect = this.getBoundingClientRect();
                    const clickPosition = e.clientX - rect.left;
                    const newValue = Math.round((clickPosition / rect.width) * 100);
                    
                    // Limita il valore tra 0 e 100
                    this.value = Math.max(0, Math.min(100, newValue));
                    handleVolumeChange(this);
                });
            }
            
            // Evento principale per i cambiamenti di input
            slider.addEventListener('input', function() {
                handleVolumeChange(this);
            });
            
            // Altri eventi standard
            slider.addEventListener('change', function() {
                handleVolumeChange(this);
            });
            
            slider.addEventListener('touchend', function() {
                handleVolumeChange(this);
            });
            
            // Sblocco audio al primo touch
            slider.addEventListener('touchstart', function() {
                if (!audioUnlocked) {
                    unlockAudio();
                }
            });
            
            // Per iOS, touch events specifici
            if (isIOS) {
                slider.addEventListener('touchmove', function(e) {
                    // Calcola la posizione relativa del touch
                    const rect = this.getBoundingClientRect();
                    const touchPosition = e.touches[0].clientX - rect.left;
                    const newValue = Math.round((touchPosition / rect.width) * 100);
                    
                    // Limita il valore tra 0 e 100
                    this.value = Math.max(0, Math.min(100, newValue));
                    handleVolumeChange(this);
                    
                    // Previeni lo scroll
                    e.preventDefault();
                });
                
                // Overlay migliorato per iOS
                const soundItem = slider.closest('.sound-item');
                if (soundItem) {
                    const sliderContainer = slider.closest('.volume-slider');
                    if (sliderContainer) {
                        const overlay = document.createElement('div');
                        overlay.className = 'ios-slider-overlay';
                        
                        // Posiziona l'overlay
                        sliderContainer.style.position = 'relative';
                        
                        // Eventi touch dell'overlay
                        overlay.addEventListener('touchstart', function(e) {
                            // Sblocca audio se necessario
                            if (!audioUnlocked) {
                                unlockAudio();
                            }
                            
                            // Calcola posizione
                            const rect = slider.getBoundingClientRect();
                            const touchX = e.touches[0].clientX - rect.left;
                            const percent = Math.max(0, Math.min(1, touchX / rect.width));
                            
                            // Imposta valore
                            slider.value = Math.round(percent * 100);
                            handleVolumeChange(slider);
                            
                            e.preventDefault();
                        });
                        
                        overlay.addEventListener('touchmove', function(e) {
                            const rect = slider.getBoundingClientRect();
                            const touchX = e.touches[0].clientX - rect.left;
                            const percent = Math.max(0, Math.min(1, touchX / rect.width));
                            
                            slider.value = Math.round(percent * 100);
                            handleVolumeChange(slider);
                            
                            e.preventDefault();
                        });
                        
                        // Aggiungi l'overlay
                        sliderContainer.appendChild(overlay);
                    }
                }
            }
        });

        // Sblocco globale al primo tocco
        document.addEventListener('touchstart', function() {
            if (!audioUnlocked) {
                unlockAudio();
            }
        }, {once: true});

        // Gestione migliorata del timer
        const timerBtn = document.getElementById('timer-btn');
        const timerModal = document.getElementById('timer-modal');
        const timerOptions = document.querySelectorAll('.timer-options button');
        const timerStatus = document.getElementById('timer-status');
        let timerInterval;
        let remainingTime = 0;

        // Mostra/nascondi modale timer
        timerBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            timerModal.classList.toggle('hidden');
        });

        // Previeni propagazione eventi dai pulsanti timer
        timerOptions.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
            });
        });

        // Chiudi modale timer quando si fa click fuori
        document.addEventListener('click', function(event) {
            if (!timerModal.classList.contains('hidden')) {
                if (!timerModal.contains(event.target) && event.target !== timerBtn) {
                    timerModal.classList.add('hidden');
                }
            }
        });

        // Gestione delle opzioni timer
        timerOptions.forEach(option => {
            option.addEventListener('click', function(event) {
                event.stopPropagation();
                
                const minutes = parseInt(this.dataset.time);
                console.log(`Timer impostato per ${minutes} minuti`);
                
                // Reset stato attivo
                timerOptions.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Cancella timer esistente
                clearInterval(timerInterval);
                
                if (minutes === 0) {
                    remainingTime = 0;
                    timerStatus.textContent = "Nessun timer impostato";
                } else {
                    remainingTime = minutes * 60;
                    updateTimerDisplay();
                    
                    timerInterval = setInterval(function() {
                        remainingTime--;
                        updateTimerDisplay();
                        
                        if (remainingTime <= 0) {
                            stopAllSounds();
                            clearInterval(timerInterval);
                            timerStatus.textContent = "Timer scaduto";
                            timerOptions.forEach(btn => btn.classList.remove('active'));
                        }
                    }, 1000);
                }
                
                setTimeout(function() {
                    timerModal.classList.add('hidden');
                }, 300);
            });
        });

        // Aggiorna display timer
        function updateTimerDisplay() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerStatus.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        }

        // Ferma tutti i suoni
        function stopAllSounds() {
            if (isIOS) {
                // Approccio Web Audio per iOS
                for (const soundId in sounds) {
                    if (sounds[soundId] && sounds[soundId].playing) {
                        try {
                            if (sounds[soundId].source) {
                                sounds[soundId].source.stop();
                            }
                            sounds[soundId].playing = false;
                            sounds[soundId].volume = 0;
                            
                            // Ricrea i nodi per uso futuro
                            setupAudioNodesiOS(soundId);
                        } catch (e) {
                            console.warn(`Errore fermando ${soundId}:`, e);
                        }
                    }
                }
            } else {
                // Approccio standard
                for (const sound in sounds) {
                    if (sounds[sound] && sounds[sound].element) {
                        sounds[sound].element.pause();
                        sounds[sound].element.currentTime = 0;
                        sounds[sound].volume = 0;
                        sounds[sound].playing = false;
                    }
                }
            }
            
            // Reset sliders
            sliders.forEach(slider => {
                slider.value = 0;
            });
        }

        // Gestione del pulsante di stop
        const stopBtn = document.getElementById('stop-btn');
        let anyPlaying = false; // Flag per tracciare se c'è almeno un suono in riproduzione

        // Aggiungi l'event listener al pulsante stop
        stopBtn.addEventListener('click', function() {
            stopAllSounds();
            updateStopButtonState(false);
        });

        // Funzione per aggiornare lo stato del pulsante stop in base alla riproduzione
        function updateStopButtonState(playing) {
            if (playing) {
                stopBtn.classList.add('playing');
                anyPlaying = true;
            } else {
                stopBtn.classList.remove('playing');
                anyPlaying = false;
            }
        }

        // Funzione comune per gestire i cambiamenti di volume
        function handleVolumeChange(slider) {
            const soundId = slider.dataset.sound;
            const volume = slider.value / 100;
            
            if (isIOS) {
                playIOSSoundWithWebAudio(soundId, volume);
            } else {
                playStandardSound(soundId, volume);
            }
            
            // Controlla se almeno un suono è attivo
            checkActiveSounds();
        }

        // Funzione per verificare se ci sono suoni attivi
        function checkActiveSounds() {
            let hasActiveSounds = false;
            
            // Verifica tutti gli slider
            sliders.forEach(slider => {
                if (parseInt(slider.value) > 0) {
                    hasActiveSounds = true;
                }
            });
            
            // Aggiorna lo stato del pulsante stop
            updateStopButtonState(hasActiveSounds);
        }

        // Aggiorna la funzione stopAllSounds per chiamare anche updateStopButtonState
        const originalStopAllSounds = stopAllSounds;
        stopAllSounds = function() {
            originalStopAllSounds();
            updateStopButtonState(false);
        };

        // Esegui un controllo iniziale dei suoni attivi
        setTimeout(checkActiveSounds, 1000);

        // Gestione del blocco schermo
        const lockBtn = document.getElementById('lock-btn');
        const screenLockOverlay = document.querySelector('.screen-lock-overlay');
        const lockMessage = document.querySelector('.lock-message');
        const unlockBtn = document.querySelector('.unlock-btn');
        let screenLocked = false;
        let moveMessageInterval;

        // Funzione per bloccare lo schermo
        function lockScreen() {
            screenLocked = true;
            lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
            lockBtn.classList.add('locked');
            screenLockOverlay.classList.add('active');
            
            // Disabilita tutti gli slider
            sliders.forEach(slider => {
                slider.disabled = true;
            });
            
            // Disabilita anche il pulsante timer
            if (timerBtn) timerBtn.disabled = true;
            
            // Inizia a muovere il pulsante di sblocco per evitare burn-in
            moveUnlockButton();
        }

        // Funzione per sbloccare lo schermo
        function unlockScreen() {
            screenLocked = false;
            lockBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
            lockBtn.classList.remove('locked');
            screenLockOverlay.classList.remove('active');
            
            // Abilita tutti gli slider
            sliders.forEach(slider => {
                slider.disabled = false;
            });
            
            // Riabilita il pulsante timer
            if (timerBtn) timerBtn.disabled = false;
            
            // Ferma il movimento del pulsante
            clearInterval(moveMessageInterval);
        }

        // Funzione per muovere il pulsante di sblocco periodicamente
        function moveUnlockButton() {
            // Posizione iniziale casuale
            setRandomPosition();
            
            // Imposta un intervallo per muovere il pulsante ogni 8 secondi
            moveMessageInterval = setInterval(() => {
                setRandomPosition();
            }, 3000);
        }

        // Imposta una posizione casuale per il messaggio di sblocco
        function setRandomPosition() {
            // Ottieni le dimensioni della finestra
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Ottieni le dimensioni del messaggio
            const messageRect = lockMessage.getBoundingClientRect();
            const messageWidth = messageRect.width;
            const messageHeight = messageRect.height;
            
            // Calcola limiti per posizionamento sicuro (non troppo vicino ai bordi)
            const maxX = windowWidth - messageWidth - 40;
            const maxY = windowHeight - messageHeight - 40;
            
            // Genera coordinate casuali entro i limiti sicuri
            const randomX = 20 + Math.floor(Math.random() * maxX);
            const randomY = 20 + Math.floor(Math.random() * maxY);
            
            // Applica la nuova posizione con una transizione fluida
            lockMessage.style.left = `${randomX}px`;
            lockMessage.style.top = `${randomY}px`;
        }

        // Gestione del pulsante di blocco
        lockBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            if (screenLocked) {
                unlockScreen();
            } else {
                lockScreen();
            }
        });

        // Sblocco tramite il pulsante nell'overlay
        unlockBtn.addEventListener('click', function() {
            unlockScreen();
        });

        // Impedisci che lo schermo si spenga automaticamente
        let wakeLock = null;
        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    wakeLock.addEventListener('release', () => {
                        console.log('Wake Lock rilasciato');
                    });
                    console.log('Wake Lock attivato');
                }
            } catch (err) {
                console.error(`Errore durante l'attivazione del Wake Lock: ${err.message}`);
            }
        }

        // Attiva il Wake Lock quando l'app è in uso
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        });

        // Attiva Wake Lock all'avvio dell'app
        requestWakeLock();
    }

    // Messaggio di debug
    console.log("Serenity app inizializzata");
});