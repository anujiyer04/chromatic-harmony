document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const styleElement = document.createElement('style');
    styleElement.textContent = styleAdditions;
    document.head.appendChild(styleElement);
    const colorPicker = document.getElementById('color-picker');
    const hexDisplay = document.querySelector('.color-hex-display');
    const sphereCore = document.querySelector('.sphere-core');
    const loginBtn = document.getElementById('login-btn');
    const switchAccountBtn = document.getElementById('switch-account-btn');
    const getPlaylistBtn = document.getElementById('get-playlist');
    const savePlaylistBtn = document.getElementById('save-playlist');
    const playlistContainer = document.getElementById('playlist-container');
    
    // State variables
    let currentTracks = [];
    let isLoggedIn = false;
    let isGenerating = false;
    
    // Audio visualizer elements
    const visualizerBars = document.querySelectorAll('.visualizer-bar');
    
    // Check login state on page load
    checkLoginStatus();
    
    // Initialize color picker with a default value
    updateColorDisplay(colorPicker.value);
    
    // Event Listeners
    colorPicker.addEventListener('input', function(e) {
        updateColorDisplay(e.target.value);
    });
    
    loginBtn.addEventListener('click', handleLoginClick);
    switchAccountBtn.addEventListener('click', handleSwitchAccount);
    getPlaylistBtn.addEventListener('click', generatePlaylist);
    savePlaylistBtn.addEventListener('click', savePlaylist);
    
    // Start visual animations
    initializeVisualizer();
    
    // Functions
    function updateColorDisplay(color) {
        hexDisplay.textContent = color.toUpperCase();
        sphereCore.style.backgroundColor = color;
        sphereCore.style.boxShadow = `0 0 20px ${color}`;
        
        // Update UI theme based on color
        document.documentElement.style.setProperty('--primary-color', color);
        document.documentElement.style.setProperty('--primary-color-translucent', `${color}4D`); // 30% opacity
        
        // Update nebula colors with a mix of the selected color
        const nebula = document.querySelector('.nebula');
        nebula.style.background = `
            radial-gradient(circle at 30% 30%, ${color}4D 0%, transparent 30%),
            radial-gradient(circle at 70% 60%, var(--tertiary-color) 0%, transparent 40%),
            radial-gradient(circle at 20% 80%, var(--secondary-color) 0%, transparent 35%)
        `;
        
        // Update sound waves color
        const soundWaves = document.querySelector('.sound-waves');
        soundWaves.style.background = `
            repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                ${color}0D 2px,
                ${color}0D 4px
            )
        `;
        
        // Update grid overlay
        const gridOverlay = document.querySelector('.grid-overlay');
        gridOverlay.style.backgroundImage = `
            linear-gradient(to right, ${color}0D 1px, transparent 1px),
            linear-gradient(to bottom, ${color}0D 1px, transparent 1px)
        `;
    }
    
    function checkLoginStatus() {
        fetch('/check_login')
            .then(response => response.json())
            .then(data => {
                isLoggedIn = data.logged_in;
                updateLoginUI();
            })
            .catch(error => {
                console.error('Error checking login status:', error);
                isLoggedIn = false;
                updateLoginUI();
            });
    }
    
    function updateLoginUI() {
        if (isLoggedIn) {
            loginBtn.textContent = 'CONNECTED';
            loginBtn.classList.add('connected');
            switchAccountBtn.style.display = 'block';
            getPlaylistBtn.disabled = false;
            savePlaylistBtn.disabled = false;
        } else {
            loginBtn.textContent = 'CONNECT';
            loginBtn.classList.remove('connected');
            switchAccountBtn.style.display = 'none';
            getPlaylistBtn.disabled = false; // Still allow generation, but will prompt login
            savePlaylistBtn.disabled = true;
        }
    }
    
    function handleLoginClick() {
        if (!isLoggedIn) {
            window.location.href = '/login';
        }
    }
    
    function handleSwitchAccount() {
        window.location.href = '/logout';
    }
    
    function generatePlaylist() {
        if (isGenerating) return;
        
        const selectedColor = colorPicker.value;
        
        // Show loading state
        isGenerating = true;
        getPlaylistBtn.innerHTML = `
            <div class="button-icon spinning">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span>GENERATING...</span>
        `;
        
        // Clear previous playlist
        playlistContainer.innerHTML = '';
        
        // Add pulse effect to sphere during generation
        sphereCore.classList.add('generating-pulse');
        
        // If not logged in, prompt login first
        if (!isLoggedIn) {
            // First show a cosmic notification about login
            const notification = document.createElement('div');
            notification.className = 'cosmic-notification';
            notification.innerHTML = `
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="notification-message">Connect to Spotify to sync your cosmic sound profile</div>
            `;
            document.body.appendChild(notification);
            
            // Animate notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Remove notification after delay
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                    // Reset UI
                    resetGenerationUI();
                    // Redirect to login
                    window.location.href = '/login';
                }, 500);
            }, 3000);
            
            return;
        }
        
        // Activate visualizer animation
        activateVisualizer();
        
        // Make API call to get playlist
        fetch('/get_playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                color: selectedColor
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Store tracks for later use
            currentTracks = data.songs;
            
            // Display tracks with staggered animation
            displayTracks(data.songs);
            
            // Reset UI state
            resetGenerationUI();
        })
        .catch(error => {
            console.error('Error generating playlist:', error);
            
            // Show error message
            playlistContainer.innerHTML = `
                <div class="playlist-error">
                    <div class="error-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <p>Cosmic interference detected. Please try again.</p>
                </div>
            `;
            
            // Reset UI state
            resetGenerationUI();
        });
    }
    
    function resetGenerationUI() {
        isGenerating = false;
        getPlaylistBtn.innerHTML = `
            <div class="button-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M9.5 8.5L14.5 12L9.5 15.5V8.5Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span>GENERATE PLAYLIST</span>
        `;
        sphereCore.classList.remove('generating-pulse');
        deactivateVisualizer();
    }
    
    function displayTracks(tracks) {
        if (!tracks || tracks.length === 0) {
            playlistContainer.innerHTML = `
                <div class="placeholder-message">
                    <div class="placeholder-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18V6L21 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2"/>
                            <circle cx="18" cy="15" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <p>No tracks found for this cosmic frequency</p>
                </div>
            `;
            return;
        }
        
        // Clear container
        playlistContainer.innerHTML = '';
        
        // Create and append track elements with staggered animation
        tracks.forEach((track, index) => {
            const trackElement = createTrackElement(track, index);
            playlistContainer.appendChild(trackElement);
            
            // Staggered entrance animation
            setTimeout(() => {
                trackElement.classList.add('visible');
            }, 50 * index);
        });
    }
    
    function createTrackElement(track, index) {
        const trackElement = document.createElement('div');
        trackElement.className = 'track-item';
        
        // Generate random bar heights for the waveform visualization
        const waveformBars = Array.from({length: 20}, () => 
            Math.floor(Math.random() * 15) + 5
        );
        
        trackElement.innerHTML = `
            <div class="track-album-art">
                <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="2"/>
                    <circle cx="25" cy="25" r="10" stroke="currentColor" stroke-width="1"/>
                    <circle cx="25" cy="25" r="5" fill="currentColor"/>
                </svg>
            </div>
            <div class="track-info">
                <div class="track-title">${track.name}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <div class="track-controls">
                <button class="track-btn track-play" data-link="${track.link}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="track-waveform">
                ${waveformBars.map(height => `<div class="waveform-bar" style="height: ${height}px;"></div>`).join('')}
            </div>
        `;
        
        // Add event listener to play button
        trackElement.querySelector('.track-play').addEventListener('click', function(e) {
            e.stopPropagation();
            const link = this.getAttribute('data-link');
            if (link) {
                window.open(link, '_blank');
            }
        });
        
        // Add event listener to track for hover effects
        trackElement.addEventListener('mouseenter', function() {
            // Animate waveform on hover
            const bars = this.querySelectorAll('.waveform-bar');
            bars.forEach(bar => {
                const height = Math.floor(Math.random() * 15) + 5;
                bar.style.height = `${height}px`;
                bar.style.transition = 'height 0.2s ease';
            });
        });
        
        return trackElement;
    }
    
    function savePlaylist() {
        if (!isLoggedIn) {
            const notification = document.createElement('div');
            notification.className = 'cosmic-notification';
            notification.innerHTML = `
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="notification-message">Connect to Spotify to save your cosmic playlist</div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                    window.location.href = '/login';
                }, 500);
            }, 3000);
            
            return;
        }
        
        if (!currentTracks || currentTracks.length === 0) {
            const notification = document.createElement('div');
            notification.className = 'cosmic-notification';
            notification.innerHTML = `
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="notification-message">Generate a playlist first before saving</div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500);
            }, 3000);
            
            return;
        }
        
        // Show saving animation
        savePlaylistBtn.innerHTML = `
            <span class="holo-icon spinning">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
            <span>SAVING...</span>
        `;
        savePlaylistBtn.disabled = true;
        
        // Create cosmic energy effect during saving
        const energyEffect = document.createElement('div');
        energyEffect.className = 'cosmic-energy-effect';
        document.body.appendChild(energyEffect);
        
        // Get track URIs
        const trackUris = currentTracks.map(track => track.uri);
        
        fetch('/save_playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracks: trackUris,
                color: colorPicker.value
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Remove energy effect
            document.body.removeChild(energyEffect);
            
            // Success notification
            const notification = document.createElement('div');
            notification.className = 'cosmic-notification success';
            notification.innerHTML = `
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4278C2.43727 15.6038 1.87979 13.4365 2.02168 11.2575C2.16356 9.07849 2.99721 7.01429 4.39828 5.3499C5.79935 3.68553 7.69279 2.51976 9.79619 2.01572C11.8996 1.51167 14.1003 1.69464 16.07 2.53571" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="notification-message">${data.message}</div>
                <a href="${data.playlist_url}" target="_blank" class="notification-action">Open in Spotify</a>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500);
            }, 6000);
            
            // Reset button
            savePlaylistBtn.innerHTML = `
                <span class="holo-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L20.7071 8.70711C20.8946 8.89464 21 9.149 21 9.41421V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </span>
                <span>SAVE TO SPOTIFY</span>
            `;
            savePlaylistBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error saving playlist:', error);
            
            // Remove energy effect
            document.body.removeChild(energyEffect);
            
            // Error notification
            const notification = document.createElement('div');
            notification.className = 'cosmic-notification error';
            notification.innerHTML = `
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="notification-message">Failed to save playlist. Please try again.</div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500);
            }, 4000);
            
            // Reset button
            savePlaylistBtn.innerHTML = `
                <span class="holo-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L20.7071 8.70711C20.8946 8.89464 21 9.149 21 9.41421V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </span>
                <span>SAVE TO SPOTIFY</span>
            `;
            savePlaylistBtn.disabled = false;
        });
    }
    
    // Audio visualizer animations
    function initializeVisualizer() {
        visualizerBars.forEach(bar => {
            bar.style.height = '5px';
        });
    }
    
    function activateVisualizer() {
        visualizerBars.forEach(bar => {
            animateBar(bar);
        });
    }
    
    function deactivateVisualizer() {
        visualizerBars.forEach(bar => {
            clearInterval(bar.animation);
            bar.style.height = '5px';
        });
    }
    
    function animateBar(bar) {
        // Clear any existing animation
        if (bar.animation) {
            clearInterval(bar.animation);
        }
        
        // Set random animation speed
        const speed = Math.random() * 200 + 100; // 100-300ms
        
        // Start animation
        bar.animation = setInterval(() => {
            const height = Math.random() * 30 + 5; // 5-35px
            bar.style.height = `${height}px`;
            bar.style.transition = `height ${speed/1000}s ease`;
        }, speed);
    }
    
    // Add additional cosmic animation effects
    function addCosmicParticles() {
        const particleContainer = document.createElement('div');
        particleContainer.className = 'particle-container';
        document.body.appendChild(particleContainer);
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'cosmic-particle';
            
            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random size
            const size = Math.random() * 5 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random opacity
            particle.style.opacity = Math.random() * 0.7 + 0.3;
            
            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 5}s`;
            
            particleContainer.appendChild(particle);
        }
    }
    
    // Add cosmic particles
    addCosmicParticles();
});

// CSS Additions for new elements
const styleAdditions = `
/* Additional Styles */
.cosmic-notification {
    position: fixed;
    top: 20px;
    right: -350px;
    width: 300px;
    background: rgba(8, 13, 21, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid var(--primary-color);
    border-radius: 10px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
    z-index: 1000;
    transition: right 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    box-shadow: 0 0 15px rgba(29, 185, 84, 0.3);
}

.cosmic-notification.show {
    right: 20px;
}

.cosmic-notification.success {
    border-color: var(--primary-color);
}

.cosmic-notification.error {
    border-color: #FF4757;
}

.notification-icon {
    width: 24px;
    height: 24px;
    color: var(--primary-color);
}

.cosmic-notification.error .notification-icon {
    color: #FF4757;
}

.notification-message {
    flex: 1;
    font-size: 14px;
}

.notification-action {
    margin-top: 8px;
    display: block;
    text-align: right;
    color: var(--primary-color);
    font-size: 12px;
    text-decoration: none;
    font-family: 'Orbitron', sans-serif;
}

.spinning {
    animation: spin 1.5s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.track-item {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.5s ease, transform 0.5s ease;
}

.track-item.visible {
    opacity: 1;
    transform: translateY(0);
}

.generating-pulse {
    animation: generating-pulse 1s ease-in-out infinite alternate !important;
}

@keyframes generating-pulse {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; box-shadow: 0 0 30px var(--primary-color); }
    100% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; box-shadow: 0 0 50px var(--primary-color); }
}

.cosmic-energy-effect {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    pointer-events: none;
    background: radial-gradient(circle at center, transparent 0%, transparent 60%, rgba(29, 185, 84, 0.1) 100%);
    animation: energy-pulse 2s ease-in-out infinite;
}

@keyframes energy-pulse {
    0% { opacity: 0.2; }
    50% { opacity: 0.5; }
    100% { opacity: 0.2; }
}

.connected {
    background-color: rgba(29, 185, 84, 0.2);
    color: var(--primary-color);
    border-color: var(--primary-color);
}

.placeholder-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Orbitron', sans-serif;
    text-align: center;
}

.placeholder-icon {
    margin-bottom: 15px;
    width: 40px;
    height: 40px;
    opacity: 0.6;
}

.playlist-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #FF4757;
    text-align: center;
}

.error-icon {
    margin-bottom: 15px;
    width: 40px;
    height: 40px;
    color: #FF4757;
}

.particle-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.cosmic-particle {
    position: absolute;
    background-color: white;
    border-radius: 50%;
    opacity: 0.5;
    animation: float 15s linear infinite;
}

@keyframes float {
    0% {
        transform: translateY(0) translateX(0);
    }
    25% {
        transform: translateY(-20px) translateX(10px);
    }
    50% {
        transform: translateY(-40px) translateX(-10px);
    }
    75% {
        transform: translateY(-20px) translateX(15px);
    }
    100% {
        transform: translateY(0) translateX(0);
    }
}

.track-waveform {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 15px;
}

.waveform-bar {
    width: 2px;
    height: 5px;
    background-color: var(--primary-color);
    opacity: 0.5;
    transition: height 0.3s ease;
}

.track-item:hover .waveform-bar {
    animation: wave-animation 0.8s ease infinite alternate;
    animation-delay: calc(var(--animation-order) * 0.1s);
}

@keyframes wave-animation {
    0% {
        height: 5px;
    }
    100% {
        height: 25px;
    }
}
`;