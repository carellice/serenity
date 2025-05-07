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
            unlockButton.textContent = 'Inizia a Rilassarti';
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

    // Funzione per sbloccare l'audio sui dispositivi mobili
    function unlockAudio() {
        if (audioUnlocked) return;
        
        // Crea un context audio temporaneo
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioContext = new AudioContext();
            
            // Crea un buffer vuoto
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            
            // Riproduci il buffer (risolve il problema sui dispositivi iOS)
            if (source.start) {
                source.start(0);
            } else if (source.noteOn) {
                source.noteOn(0);
            }
        }
        
        // Risolve il problema sui dispositivi Android
        // Avvia e mette subito in pausa tutti i suoni
        const silentPlay = function(sound) {
            // Salva il volume attuale e imposta a 0
            const originalVolume = sounds[sound].element.volume;
            sounds[sound].element.volume = 0;
            
            const playPromise = sounds[sound].element.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    sounds[sound].element.pause();
                    sounds[sound].element.currentTime = 0;
                    // Ripristina il volume originale
                    sounds[sound].element.volume = originalVolume;
                }).catch(error => {
                    console.warn(`Silent play non riuscito per ${sound}, è normale su alcuni browser:`, error);
                    // Ripristina il volume originale anche in caso di errore
                    sounds[sound].element.volume = originalVolume;
                });
            }
        };
        
        // Prova a riprodurre silenziosamente ogni suono
        for (const sound in sounds) {
            if (sounds[sound] && sounds[sound].element) {
                silentPlay(sound);
            }
        }
        
        audioUnlocked = true;
        console.log('Audio sbloccato con successo');
    }

    // Funzione per precaricare un file audio
    function preloadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                // Il file è stato precaricato
                resolve(audio);
            }, {once: true});
            audio.addEventListener('error', (error) => {
                console.error(`Errore nel caricare: ${url}`, error);
                reject(error);
            });
            audio.preload = 'auto'; // Forza il precaricamento
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
                    volume: 0 
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
                    volume: 0 
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
        sliders.forEach(slider => {
            // Funzione per gestire il cambiamento del volume
            function handleVolumeChange() {
                const soundId = slider.dataset.sound;
                const volume = slider.value / 100;
                
                // Se l'audio non è stato sbloccato, fallo adesso
                if (!audioUnlocked) {
                    unlockAudio();
                }
                
                // Imposta il volume
                if (sounds[soundId]) {
                    sounds[soundId].volume = volume;
                    sounds[soundId].element.volume = volume;
                    
                    // Avvia o ferma l'audio in base al volume
                    if (volume > 0 && sounds[soundId].element.paused) {
                        const playPromise = sounds[soundId].element.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                                // Riprova a sbloccare l'audio e riprodurre
                                unlockAudio();
                                setTimeout(() => {
                                    sounds[soundId].element.play().catch(e => {
                                        console.error(`Secondo tentativo fallito per ${soundId}:`, e);
                                    });
                                }, 100);
                            });
                        }
                    } else if (volume === 0 && !sounds[soundId].element.paused) {
                        sounds[soundId].element.pause();
                        sounds[soundId].element.currentTime = 0;
                    }
                }
            }
            
            // Aggiungi molteplici event listener per assicurarti che l'evento sia catturato
            slider.addEventListener('input', handleVolumeChange);
            slider.addEventListener('change', handleVolumeChange);
            
            // Speciale handling per i dispositivi touch
            slider.addEventListener('touchstart', function() {
                if (!audioUnlocked) {
                    unlockAudio();
                }
            });
            
            slider.addEventListener('touchend', handleVolumeChange);
            slider.addEventListener('touchmove', handleVolumeChange);
        });

        // Aggiungi un evento di tocco al documento per sbloccare l'audio
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