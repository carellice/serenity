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

    // Oggetto per memorizzare i suoni precaricati
    const sounds = {};
    
    // Flag per sapere se l'audio è stato sbloccato
    let audioUnlocked = false;
    
    // Verifica se il dispositivo è un iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log("Dispositivo iOS rilevato:", isIOS);
    
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
            // Aggiungi un pulsante per sbloccare l'audio sui dispositivi mobili
            const unlockButton = document.createElement('button');
            unlockButton.className = 'unlock-audio-button';
            unlockButton.textContent = isIOS ? 'Tocca qui per iniziare (iOS)' : 'Inizia a Rilassarti';
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

    // Funzione specifica per sbloccare l'audio su iOS
    function unlockIOSAudio() {
        console.log("Tentativo di sblocco audio iOS...");
        
        // Per iOS, creiamo un singolo audio per sbloccare il contesto audio
        const unlockAudio = new Audio();
        unlockAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        
        // Play e immediatamente pausa l'audio
        const playPromise = unlockAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Sblocco iOS riuscito!");
                unlockAudio.pause();
                unlockAudio.currentTime = 0;
                
                // Ora tenta di inizializzare tutti i suoni veri
                for (const sound in sounds) {
                    if (sounds[sound] && sounds[sound].element) {
                        // Riproduci silenziosamente e pausa per sbloccare
                        sounds[sound].element.volume = 0;
                        sounds[sound].element.play().then(() => {
                            sounds[sound].element.pause();
                            sounds[sound].element.currentTime = 0;
                            // Ripristina il volume solo se necessario
                            if (sounds[sound].volume > 0) {
                                sounds[sound].element.volume = sounds[sound].volume;
                            }
                        }).catch(e => {
                            console.warn(`Non è stato possibile sbloccare ${sound} su iOS: ${e}`);
                        });
                    }
                }
            }).catch(error => {
                console.error("Errore sblocco iOS:", error);
            });
        }
    }

    // Funzione generica per sbloccare l'audio
    function unlockAudio() {
        if (audioUnlocked) return;
        
        if (isIOS) {
            unlockIOSAudio();
        } else {
            // Approccio standard per altri browser
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                try {
                    const audioContext = new AudioContext();
                    const buffer = audioContext.createBuffer(1, 1, 22050);
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    
                    if (source.start) {
                        source.start(0);
                    } else if (source.noteOn) {
                        source.noteOn(0);
                    }
                    
                    // Resume AudioContext (necessario in Chrome)
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                } catch (e) {
                    console.warn("Errore AudioContext:", e);
                }
            }
            
            // Approccio tradizionale
            for (const sound in sounds) {
                if (sounds[sound] && sounds[sound].element) {
                    // Salva e ripristina il volume
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

    // Funzione per precaricare un file audio
    function preloadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            // Evento che indica che l'audio può essere riprodotto
            audio.addEventListener('canplaythrough', () => {
                resolve(audio);
            }, {once: true});
            
            // Gestione degli errori
            audio.addEventListener('error', (error) => {
                console.error(`Errore nel caricare: ${url}`, error);
                reject(error);
            });
            
            // Impostazioni per il precaricamento
            audio.preload = 'auto';
            audio.src = url;
            audio.load();
        });
    }

    // Carica tutti i file audio in parallelo
    Promise.all(soundFiles.map(file => {
        // const soundId = file.replace('.mp3', '');
        const soundId = file;
        return preloadAudio(`sounds/${file}`)
            .then(audio => {
                // Impostazioni audio
                audio.loop = true;
                audio.volume = 0;
                
                // Memorizza l'audio precaricato
                sounds[soundId] = { 
                    element: audio, 
                    volume: 0,
                    playing: false // Aggiungi uno stato di riproduzione
                };
                
                // Soluzione per il gap nel loop
                audio.addEventListener('timeupdate', function() {
                    const buffer = 0.44; // Buffer di 440ms prima della fine
                    if (this.currentTime > this.duration - buffer) {
                        this.currentTime = 0;
                    }
                });
                
                // Aggiorna il progresso
                updateLoadingProgress();
                
                return audio;
            })
            .catch(error => {
                // Aggiorna comunque il progresso anche in caso di errore
                updateLoadingProgress();
                // Crea un audio vuoto per non interrompere la funzionalità
                sounds[soundId] = { 
                    element: new Audio(), 
                    volume: 0,
                    playing: false
                };
            });
    }))
    .then(() => {
        console.log('Tutti i suoni sono stati precaricati con successo');
        // Inizializza gli slider ora che i suoni sono caricati
        initializeSliders();
    })
    .catch(error => {
        console.error('Si è verificato un errore nel precaricamento dei suoni', error);
        // Inizializza comunque gli slider
        initializeSliders();
    });

    // Inizializza gli slider e altri controlli
    function initializeSliders() {
        // Gestione degli slider per il volume
        const sliders = document.querySelectorAll('.slider');
        
        // Funzione specializzata per la riproduzione su iOS
        function playIOSSound(soundId, volume) {
            const sound = sounds[soundId];
            if (!sound) return;
            
            // Se il volume è 0, ferma la riproduzione
            if (volume === 0) {
                if (sound.playing) {
                    sound.element.pause();
                    sound.element.currentTime = 0;
                    sound.playing = false;
                }
                sound.volume = 0;
                return;
            }
            
            // Imposta il volume
            sound.volume = volume;
            sound.element.volume = volume;
            
            // Se non è in riproduzione, avvia
            if (!sound.playing) {
                console.log(`Avvio della riproduzione di ${soundId} con volume ${volume}`);
                
                // Su iOS dobbiamo assicurarci che l'audio sia completamente sbloccato
                if (!audioUnlocked) {
                    unlockAudio();
                    // Breve attesa per lo sblocco
                    setTimeout(() => {
                        sound.element.play().then(() => {
                            sound.playing = true;
                        }).catch(error => {
                            console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                            
                            // Secondo tentativo dopo un ulteriore sblocco
                            unlockAudio();
                            setTimeout(() => {
                                sound.element.play().catch(e => {
                                    console.error(`Secondo tentativo fallito per ${soundId}:`, e);
                                });
                            }, 500);
                        });
                    }, 100);
                } else {
                    sound.element.play().then(() => {
                        sound.playing = true;
                    }).catch(error => {
                        console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                    });
                }
            }
        }
        
        // Funzione per dispositivi non-iOS
        function playStandardSound(soundId, volume) {
            const sound = sounds[soundId];
            if (!sound) return;
            
            // Imposta il volume
            sound.volume = volume;
            sound.element.volume = volume;
            
            // Avvia o ferma l'audio in base al volume
            if (volume > 0 && sound.element.paused) {
                sound.element.play().catch(error => {
                    console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                    
                    // Riprova a sbloccare l'audio e riprodurre
                    unlockAudio();
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
        
        // Funzione comune per gestire il cambiamento del volume
        function handleVolumeChange(slider) {
            const soundId = slider.dataset.sound;
            const volume = slider.value / 100;
            
            // Diverse strategie per iOS e altri dispositivi
            if (isIOS) {
                playIOSSound(soundId, volume);
            } else {
                playStandardSound(soundId, volume);
            }
        }
        
        // Aggiungi event listener a tutti gli slider
        sliders.forEach(slider => {
            // Evento principale per i cambiamenti di input
            slider.addEventListener('input', function() {
                handleVolumeChange(this);
            });
            
            // Evento al rilascio (change)
            slider.addEventListener('change', function() {
                handleVolumeChange(this);
            });
            
            // Per dispositivi touch
            slider.addEventListener('touchend', function() {
                handleVolumeChange(this);
            });
            
            // Sbloccare l'audio al primo touch
            slider.addEventListener('touchstart', function() {
                if (!audioUnlocked) {
                    unlockAudio();
                }
            });
            
            // Gestione dell'evento touchmove per iOS
            if (isIOS) {
                slider.addEventListener('touchmove', function() {
                    handleVolumeChange(this);
                });
            }
            
            // Crea una versione potenziata dello slider solo per iOS
            if (isIOS) {
                // Aggiungi un overlay cliccabile sopra lo slider
                const soundItem = slider.closest('.sound-item');
                if (soundItem) {
                    const sliderContainer = slider.closest('.volume-slider');
                    if (sliderContainer) {
                        const overlay = document.createElement('div');
                        overlay.className = 'ios-slider-overlay';
                        
                        // Posiziona l'overlay sopra lo slider
                        sliderContainer.style.position = 'relative';
                        
                        // Evento di tocco sull'overlay
                        overlay.addEventListener('touchstart', function(e) {
                            // Rileva la posizione e imposta il valore dello slider
                            const rect = slider.getBoundingClientRect();
                            const touchX = e.touches[0].clientX - rect.left;
                            const percent = Math.max(0, Math.min(1, touchX / rect.width));
                            
                            // Imposta il nuovo valore
                            slider.value = Math.round(percent * 100);
                            
                            // Attiva il cambio di volume
                            handleVolumeChange(slider);
                            
                            // Previeni lo scroll della pagina
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
                        
                        // Aggiungi l'overlay al container
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

        // Mostra/nascondi il modale del timer
        timerBtn.addEventListener('click', function(event) {
            // Previene che l'evento si propaghi al documento
            event.stopPropagation();
            timerModal.classList.toggle('hidden');
        });

        // Aggiungiamo un listener ai pulsanti del timer per evitare la propagazione
        timerOptions.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
            });
        });

        // Chiudi il modale del timer quando si fa clic fuori
        document.addEventListener('click', function(event) {
            // Verifichiamo che il modale sia visibile
            if (!timerModal.classList.contains('hidden')) {
                // Verifichiamo che il click non sia sul modale o sul pulsante del timer
                if (!timerModal.contains(event.target) && event.target !== timerBtn) {
                    timerModal.classList.add('hidden');
                }
            }
        });

        // Gestione delle opzioni del timer
        timerOptions.forEach(option => {
            option.addEventListener('click', function(event) {
                // Previene la propagazione dell'evento
                event.stopPropagation();
                
                const minutes = parseInt(this.dataset.time);
                console.log(`Timer impostato per ${minutes} minuti`);
                
                // Resetta lo stato attivo su tutti i pulsanti
                timerOptions.forEach(btn => btn.classList.remove('active'));
                
                // Imposta lo stato attivo sul pulsante cliccato
                this.classList.add('active');
                
                // Cancella il timer esistente
                clearInterval(timerInterval);
                
                if (minutes === 0) {
                    // Timer disattivato
                    remainingTime = 0;
                    timerStatus.textContent = "Nessun timer impostato";
                } else {
                    // Imposta il nuovo timer
                    remainingTime = minutes * 60;
                    updateTimerDisplay();
                    
                    timerInterval = setInterval(function() {
                        remainingTime--;
                        updateTimerDisplay();
                        
                        if (remainingTime <= 0) {
                            // Ferma tutti i suoni quando il timer scade
                            stopAllSounds();
                            clearInterval(timerInterval);
                            timerStatus.textContent = "Timer scaduto";
                            timerOptions.forEach(btn => btn.classList.remove('active'));
                        }
                    }, 1000);
                }
                
                // Manteniamo il modale visibile per un breve momento per mostrare il feedback
                setTimeout(function() {
                    timerModal.classList.add('hidden');
                }, 300);
            });
        });

        // Aggiorna il display del timer
        function updateTimerDisplay() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerStatus.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        }

        // Ferma tutti i suoni
        function stopAllSounds() {
            for (const sound in sounds) {
                if (sounds[sound] && sounds[sound].element) {
                    sounds[sound].element.pause();
                    sounds[sound].element.currentTime = 0;
                    sounds[sound].volume = 0;
                }
            }
            
            // Resetta tutti gli slider a 0
            sliders.forEach(slider => {
                slider.value = 0;
            });
        }
    }

    // Debugging init message
    console.log("Serenity app initialized");
});