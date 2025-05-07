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
            setTimeout(() => {
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.remove();
                }, 500);
            }, 500);
        }
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
            audio.src = url;
            audio.load();
        });
    }

    // Carica tutti i file audio in parallelo
    Promise.all(soundFiles.map(file => {
        // let soundId = file.replace('.mp3', '');
        let soundId = file;
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
            slider.addEventListener('input', function() {
                const soundId = this.dataset.sound;
                const volume = this.value / 100;
                
                // Imposta il volume
                if (sounds[soundId]) {
                    sounds[soundId].volume = volume;
                    sounds[soundId].element.volume = volume;
                    
                    // Avvia o ferma l'audio in base al volume
                    if (volume > 0 && sounds[soundId].element.paused) {
                        sounds[soundId].element.play().catch(error => {
                            console.error(`Errore durante la riproduzione di ${soundId}:`, error);
                        });
                    } else if (volume === 0 && !sounds[soundId].element.paused) {
                        sounds[soundId].element.pause();
                        sounds[soundId].element.currentTime = 0;
                    }
                }
            });
        });

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