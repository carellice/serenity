document.addEventListener('DOMContentLoaded', function() {
    // Oggetti Audio per ogni suono (versione semplificata)
    const sounds = {
        'white-noise.mp3': { element: null, volume: 0 },
        'brown-noise.mp3': { element: null, volume: 0 },
        'pink-noise.mp3': { element: null, volume: 0 },
        'rain.wav': { element: null, volume: 0 },
        'storm.mp3': { element: null, volume: 0 },
        'wind.mp3': { element: null, volume: 0 },
        'stream.mp3': { element: null, volume: 0 },
        'birds.mp3': { element: null, volume: 0 },
        'waves.mp3': { element: null, volume: 0 },
        'boat.mp3': { element: null, volume: 0 },
        'city.mp3': { element: null, volume: 0 },
        'fireplace.mp3': { element: null, volume: 0 },
        'hair-dryer.mp3': { element: null, volume: 0 }
    };

    // Inizializza gli elementi audio
    for (const sound in sounds) {
        sounds[sound].element = new Audio(`sounds/${sound}`);
        sounds[sound].element.loop = true; // Usiamo il loop nativo
        sounds[sound].element.volume = 0;
        
        // Soluzione per il problema del gap nel loop
        sounds[sound].element.addEventListener('timeupdate', function() {
            const buffer = 0.44; // Buffer di 440ms prima della fine
            if (this.currentTime > this.duration - buffer) {
                // Resettiamo il tempo audio con un piccolo offset per evitare il click
                this.currentTime = 0;
            }
        });
    }

    // Gestione degli slider per il volume
    const sliders = document.querySelectorAll('.slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const soundId = this.dataset.sound;
            const volume = this.value / 100;
            
            // Imposta il volume
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

    // Gestione delle opzioni del timer (codice migliorato)
    timerOptions.forEach(option => {
        option.addEventListener('click', function(event) {
            // Previene la propagazione dell'evento
            event.stopPropagation();
            
            const minutes = parseInt(this.dataset.time);
            console.log(`Timer impostato per ${minutes} minuti`); // Debug
            
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
        console.log(`Timer aggiornato: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`); // Debug
    }

    // Ferma tutti i suoni
    function stopAllSounds() {
        console.log("Stopping all sounds"); // Debug
        for (const sound in sounds) {
            sounds[sound].element.pause();
            sounds[sound].element.currentTime = 0;
            sounds[sound].volume = 0;
        }
        
        // Resetta tutti gli slider a 0
        sliders.forEach(slider => {
            slider.value = 0;
        });
    }

    // Debugging init message
    console.log("Serenity app initialized");
});