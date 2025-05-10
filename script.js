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
        // Variabili necessarie per il timer e altre funzionalità
        let screenLocked = false;
        let moveMessageInterval;
        let anyPlaying = false;

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
            
            // Aggiorna lo stato del pulsante e le card (implementato più avanti)
            updateStopButtonState(false);
            
            // Rimuovi la classe active da tutte le card dei suoni
            const soundCards = document.querySelectorAll('.sound-item-card');
            soundCards.forEach(card => {
                card.classList.remove('active');
            });
        }

        // Gestione del pulsante di stop
        const stopBtn = document.getElementById('stop-btn');

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

        // Funzione per verificare se ci sono suoni attivi
        function checkActiveSounds() {
            let hasActiveSounds = false;
            
            // Verifica tutti i suoni
            for (const soundId in sounds) {
                if (sounds[soundId] && sounds[soundId].volume > 0) {
                    hasActiveSounds = true;
                    break;
                }
            }
            
            // Aggiorna lo stato del pulsante stop
            updateStopButtonState(hasActiveSounds);
        }

        // Gestione del blocco schermo
        const lockBtn = document.getElementById('lock-btn');
        const screenLockOverlay = document.querySelector('.screen-lock-overlay');
        const lockMessage = document.querySelector('.lock-message');
        const unlockBtn = document.querySelector('.unlock-btn');

        // Funzione per bloccare lo schermo
        function lockScreen() {
            screenLocked = true;
            
            // Modifica solo l'icona, non l'intero contenuto del pulsante
            const lockIcon = document.querySelector('#lock-btn i');
            lockIcon.className = 'fas fa-lock';
            
            // Aggiorna anche il testo
            const lockText = document.querySelector('#lock-btn span');
            lockText.textContent = 'Bloccato';
            
            // Aggiungi la classe locked
            document.getElementById('lock-btn').classList.add('locked');
            screenLockOverlay.classList.add('active');
            
            // Inizia a muovere il pulsante di sblocco per evitare burn-in
            moveUnlockButton();
        }

        // Funzione per sbloccare lo schermo
        function unlockScreen() {
            screenLocked = false;
            
            // Modifica solo l'icona, non l'intero contenuto del pulsante
            const lockIcon = document.querySelector('#lock-btn i');
            lockIcon.className = 'fas fa-lock-open';
            
            // Rimuovi la classe locked
            document.getElementById('lock-btn').classList.remove('locked');
            screenLockOverlay.classList.remove('active');
            
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
        
        // NUOVA FUNZIONALITÀ: Setup del modal per il volume
        const volumeModal = document.getElementById('volume-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const modalSlider = document.getElementById('modal-slider');
        const modalIcon = document.getElementById('modal-icon');
        const modalTitle = document.getElementById('modal-title');
        const volumePercentage = document.getElementById('volume-percentage');
        
        let currentSoundId = null;
        
        // Ottieni tutte le card dei suoni
        const soundCards = document.querySelectorAll('.sound-item-card');
        
        // Aggiungi event listeners alle card
        soundCards.forEach(card => {
            card.addEventListener('click', function() {
                if (screenLocked) return; // Non fare nulla se lo schermo è bloccato
                
                // Ottieni i dati del suono
                const soundId = this.dataset.sound;
                const soundLabel = this.querySelector('.sound-label').textContent;
                const soundIcon = this.querySelector('.sound-icon i').className;
                
                // Imposta i dati nel modal
                currentSoundId = soundId;
                modalTitle.textContent = soundLabel;
                modalIcon.className = soundIcon;
                
                // Imposta il valore dello slider
                if (sounds[soundId]) {
                    const volumeValue = sounds[soundId].volume * 100 || 0;
                    modalSlider.value = volumeValue;
                    volumePercentage.textContent = `${Math.round(volumeValue)}%`;
                } else {
                    modalSlider.value = 0;
                    volumePercentage.textContent = "0%";
                }
                
                // Mostra il modal
                volumeModal.classList.remove('hidden');
                
                // Sblocca l'audio se necessario
                if (!audioUnlocked) {
                    unlockAudio();
                }
            });
        });
        
        // Event listener per lo slider del modal
        modalSlider.addEventListener('input', function() {
            if (!currentSoundId) return;
            
            const volume = this.value / 100;
            volumePercentage.textContent = `${Math.round(this.value)}%`;
            
            // Riproduci il suono con il volume impostato
            if (isIOS) {
                playIOSSoundWithWebAudio(currentSoundId, volume);
            } else {
                playStandardSound(currentSoundId, volume);
            }
            
            // Aggiorna l'indicatore visivo sulla card
            updateSoundCardStatus(currentSoundId, volume);
            
            // Controlla se almeno un suono è attivo per aggiornare il pulsante di stop
            checkActiveSounds();
        });
        
        // Chiudi il modal
        closeModalBtn.addEventListener('click', function() {
            volumeModal.classList.add('hidden');
            currentSoundId = null;
        });
        
        // Chiudi il modal quando si fa click fuori dal contenuto
        volumeModal.addEventListener('click', function(event) {
            if (event.target === volumeModal) {
                volumeModal.classList.add('hidden');
                currentSoundId = null;
            }
        });
        
        // Funzione per aggiornare lo stato visivo delle card
        function updateSoundCardStatus(soundId, volume) {
            soundCards.forEach(card => {
                if (card.dataset.sound === soundId) {
                    if (volume > 0) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                }
            });
        }
        
        // Inizializza lo stato delle card in base ai suoni attivi
        function initializeCardStatus() {
            for (const soundId in sounds) {
                if (sounds[soundId] && sounds[soundId].volume > 0) {
                    updateSoundCardStatus(soundId, sounds[soundId].volume);
                }
            }
            
            // Controlla se ci sono suoni attivi per aggiornare il pulsante di stop
            checkActiveSounds();
        }
        
        // Esegui l'inizializzazione dopo il caricamento
        setTimeout(initializeCardStatus, 1000);
        
        // Sblocco globale al primo tocco
        document.addEventListener('touchstart', function() {
            if (!audioUnlocked) {
                unlockAudio();
            }
        }, {once: true});
    }

    // Messaggio di debug
    console.log("Serenity app inizializzata");
});

// Registrazione del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registrato con successo:', registration.scope);
      })
      .catch((error) => {
        console.log('Registrazione Service Worker fallita:', error);
      });
  });
}

// Gestione dell'installazione PWA
let deferredPrompt;
const installContainer = document.getElementById('install-container');
const installBtn = document.getElementById('install-btn');
const installSuccess = document.getElementById('install-success');

window.addEventListener('beforeinstallprompt', (e) => {
    // Previene la visualizzazione del prompt predefinito
    e.preventDefault();
    
    // Salva l'evento per mostrarlo in seguito
    deferredPrompt = e;
    
    // Mostra il pulsante di installazione
    installContainer.style.display = 'block';
    
    console.log('L\'app può essere installata');
});

// Evento click sul pulsante di installazione
installBtn.addEventListener('click', () => {
    // Verifica se l'evento deferredPrompt è disponibile
    if (!deferredPrompt) {
        console.log('Evento di installazione non disponibile');
        return;
    }
    
    // Mostra il prompt di installazione
    deferredPrompt.prompt();
    
    // Nascondi il pulsante di installazione durante il prompt
    installContainer.style.display = 'none';
    
    // Attende la scelta dell'utente
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Utente ha accettato l\'installazione');
            showInstallSuccess();
        } else {
            console.log('Utente ha rifiutato l\'installazione');
            // Mostra di nuovo il pulsante se l'utente rifiuta
            setTimeout(() => {
                installContainer.style.display = 'block';
            }, 3000);
        }
        
        // Reset della variabile prompt
        deferredPrompt = null;
    });
});

// Mostra il messaggio di installazione completata
function showInstallSuccess() {
    installSuccess.classList.add('show');
    
    // Nascondi il messaggio dopo 3 secondi
    setTimeout(() => {
        installSuccess.classList.remove('show');
    }, 3000);
}

// Controlla se l'app è già installata
window.addEventListener('appinstalled', (evt) => {
    console.log('App installata con successo!');
    installContainer.style.display = 'none';
    showInstallSuccess();
});

// Verifica se l'app è già in modalità standalone (già installata)
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
    console.log('App già installata e in esecuzione in modalità standalone');
    installContainer.style.display = 'none';
}

// Aggiungi una funzione per mostrare il pulsante di installazione manualmente
function showInstallPrompt() {
    if (deferredPrompt) {
        installContainer.style.display = 'block';
    }
}

// Funzione per controllare periodicamente se l'app può essere installata
function checkInstallability() {
    // Su iOS, navigator.standalone è true se l'app è installata
    const isIOSInstalled = window.navigator.standalone === true;
    
    // Su altri browser, matchMedia controlla la modalità display
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Se già installata, nascondi il pulsante
    if (isIOSInstalled || isStandalone) {
        installContainer.style.display = 'none';
    } 
    // Altrimenti, se l'evento di installazione è disponibile, mostra il pulsante
    else if (deferredPrompt) {
        installContainer.style.display = 'block';
    }
}

// Controlla ogni 5 secondi se l'app può essere installata
setInterval(checkInstallability, 5000);

// Gestione media query per rilevare cambiamenti nella modalità di visualizzazione
window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) {
        console.log('App ora in modalità standalone');
        installContainer.style.display = 'none';
    }
});

// Verifica lo stato della connessione all'avvio
document.addEventListener('DOMContentLoaded', function() {
  checkConnectionAndCacheStatus();
});

// Verifica se l'app è online e se tutti i suoni sono in cache
function checkConnectionAndCacheStatus() {
  const isOnline = navigator.onLine;
  console.log('Stato connessione:', isOnline ? 'Online' : 'Offline');
  
  if (!isOnline) {
    // Se siamo offline, verifichiamo che tutti i file audio siano in cache
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
    
    Promise.all(
      soundFiles.map(file => {
        return caches.match(`sounds/${file}`)
          .then(response => {
            if (!response) {
              console.warn(`Il file audio ${file} non è disponibile offline`);
              return false;
            }
            return true;
          });
      })
    ).then(results => {
      const allCached = results.every(result => result === true);
      if (!allCached) {
        // Mostra un avviso che alcuni suoni potrebbero non essere disponibili
        showOfflineWarning();
      }
    });
  }
}

// Mostra un avviso per l'utente quando è offline e mancano file audio
function showOfflineWarning() {
  const warningElement = document.createElement('div');
  warningElement.className = 'offline-warning';
  warningElement.innerHTML = `
    <div class="offline-warning-content">
      <i class="fas fa-wifi"></i>
      <p>Sei offline. Alcuni suoni potrebbero non essere disponibili.</p>
      <button class="offline-dismiss">OK</button>
    </div>
  `;
  
  document.body.appendChild(warningElement);
  
  // Pulsante per chiudere l'avviso
  warningElement.querySelector('.offline-dismiss').addEventListener('click', function() {
    warningElement.remove();
  });
}

// Aggiungi stile CSS per l'avviso offline
const offlineStyle = document.createElement('style');
offlineStyle.textContent = `
.offline-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 171, 0, 0.9);
  color: #000;
  padding: 10px;
  text-align: center;
  z-index: 9999;
  font-size: 14px;
}

.offline-warning-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.offline-warning i {
  font-size: 18px;
}

.offline-dismiss {
  background: transparent;
  border: 1px solid #000;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
}
`;
document.head.appendChild(offlineStyle);

// Ascolta i cambiamenti di connettività
window.addEventListener('online', checkConnectionAndCacheStatus);
window.addEventListener('offline', checkConnectionAndCacheStatus);