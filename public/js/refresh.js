// AJAX-Refresh für Online-Benutzer und Voice-Channels
document.addEventListener('DOMContentLoaded', function() {
    // DOM-Elemente
    const onlineUsersContainer = document.getElementById('online-users-container');
    const onlineUsersLoading = document.getElementById('online-users-loading');
    const voiceChannelsContainer = document.getElementById('voice-channels-container');
    const voiceChannelsLoading = document.getElementById('voice-channels-loading');
    
    // Refresh-Intervall in Millisekunden (5 Sekunden)
    const refreshInterval = 5000;
    
    // Flag für initiales Laden (nur beim ersten Mal Ladeanimation zeigen)
    let initialLoad = true;
    
    // Hilfsfunktion zum Entfernen von Emojis und │-Zeichen
    function cleanChannelName(text) {
        if (!text) return '';
        
        // Entferne alle Emojis (einschließlich Discord-Emojis im Format <:name:id>)
        let cleaned = text
            .replace(/<a?:.+?:\d+>/g, '') // Discord-Emojis
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Gesichts-Emojis
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbole & Piktogramme
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Karten
            .replace(/[\u{2600}-\u{26FF}]/gu, '') // Verschiedene Symbole
            .replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
        
        // Entferne │-Zeichen und andere unerwünschte Zeichen
        cleaned = cleaned.replace(/[\u2502\|\-\+\=]/g, '');
        
        // Entferne überschüssige Leerzeichen und trimme
        return cleaned.replace(/\s+/g, ' ').trim();
    }
    
    // Funktion zum Aktualisieren der Online-Benutzer
    function refreshOnlineUsers() {
        // Zeige Ladeanzeige und verstecke Container nur beim initialen Laden
        if (initialLoad && onlineUsersLoading && onlineUsersContainer) {
            onlineUsersLoading.style.display = 'block';
            onlineUsersContainer.style.display = 'none';
        }
        
        fetch('/api/online-users')
            .then(response => response.json())
            .then(data => {
                if (data.onlineMembers && onlineUsersContainer) {
                    let html = '';
                    
                    if (data.onlineMembers.length > 0) {
                        html += '<div class="online-users-tags">';
                        data.onlineMembers.forEach(member => {
                            let statusClass = '';
                            if (member.status === 'online') statusClass = 'tag-green';
                            else if (member.status === 'idle') statusClass = 'tag-yellow';
                            else if (member.status === 'dnd') statusClass = 'tag-red';
                            
                            html += `
                            <span class="tag ${statusClass}">
                                <img src="${member.avatar}" class="avatar avatar-xxs tag-avatar" alt="${member.nickname}" />
                                ${member.nickname}
                            </span>`;
                        });
                        html += '</div>';
                    } else {
                        html = '<span class="text-muted">Keine Benutzer online</span>';
                    }
                    
                    onlineUsersContainer.innerHTML = html;
                    
                    // Warte 2 Sekunden, dann verstecke Ladeanzeige und zeige Container, aber nur beim initialen Laden
                    if (initialLoad) {
                        setTimeout(() => {
                            if (onlineUsersLoading) {
                                onlineUsersLoading.style.display = 'none';
                            }
                            onlineUsersContainer.style.display = 'block';
                        }, 2000);
                    } else {
                        // Bei späteren Refreshes direkt anzeigen
                        if (onlineUsersLoading) {
                            onlineUsersLoading.style.display = 'none';
                        }
                        onlineUsersContainer.style.display = 'block';
                    }
                }
            })
            .catch(error => console.error('Fehler beim Aktualisieren der Online-Benutzer:', error));
    }
    
    // Funktion zum Aktualisieren der Voice-Channels
    function refreshVoiceChannels() {
        // Zeige Ladeanzeige und verstecke Container nur beim initialen Laden
        if (initialLoad && voiceChannelsLoading && voiceChannelsContainer) {
            voiceChannelsLoading.style.display = 'block';
            voiceChannelsContainer.style.display = 'none';
        }
        
        fetch('/api/voice-channels')
            .then(response => response.json())
            .then(data => {
                if (data.groupedVoiceUsers && voiceChannelsContainer) {
                    let html = '';
                    
                    if (data.groupedVoiceUsers.length > 0) {
                        data.groupedVoiceUsers.forEach(item => {
                            if (item.isCategory) {
                                if (item.children.length > 0) {
                                    // Entferne Emojis aus Kategorienamen
                                    const cleanedCategoryName = cleanChannelName(item.name);
                                    html += `<div class="list-group-header">${cleanedCategoryName}</div>`;
                                    
                                    item.children.forEach(channel => {
                                        // Entferne Emojis aus Channelnamen
                                        channel.name = cleanChannelName(channel.name);
                                        html += renderVoiceChannel(channel);
                                    });
                                }
                            } else {
                                // Entferne Emojis aus Channelnamen
                                item.name = cleanChannelName(item.name);
                                html += renderVoiceChannel(item);
                            }
                        });
                    } else {
                        html = `
                        <div class="list-group-item">
                            <p class="text-center text-muted m-0">Keine Voice-Channels auf diesem Server gefunden.</p>
                        </div>`;
                    }
                    
                    voiceChannelsContainer.innerHTML = html;
                    
                    // Warte 2 Sekunden, dann verstecke Ladeanzeige und zeige Container, aber nur beim initialen Laden
                    if (initialLoad) {
                        setTimeout(() => {
                            if (voiceChannelsLoading) {
                                voiceChannelsLoading.style.display = 'none';
                            }
                            voiceChannelsContainer.style.display = 'block';
                        }, 2000);
                    } else {
                        // Bei späteren Refreshes direkt anzeigen
                        if (voiceChannelsLoading) {
                            voiceChannelsLoading.style.display = 'none';
                        }
                        voiceChannelsContainer.style.display = 'block';
                    }
                }
            })
            .catch(error => console.error('Fehler beim Aktualisieren der Voice-Channels:', error));
    }
    
    // Hilfsfunktion zum Rendern eines Voice-Channels
    function renderVoiceChannel(channel) {
        let html = `
        <div class="list-group-item">
            <div class="row align-items-center">
                <div class="col-auto">
                    <span class="avatar avatar-sm" style="background-color: ${channel.users.length > 0 ? 'rgba(88, 101, 242, 0.2)' : 'rgba(173, 181, 189, 0.2)'}; color: ${channel.users.length > 0 ? '#5865F2' : '#6c757d'};">
                        <i class="ti ti-${channel.users.length > 0 ? 'volume' : 'volume-3'}"></i>
                    </span>
                </div>
                <div class="col">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>${cleanChannelName(channel.name)}</div>
                        <div class="text-muted small">${channel.users.length} Benutzer</div>
                    </div>
                </div>
            </div>`;

        if (channel.users.length > 0) {
            html += `
            <div class="list-group-item-body mt-2">`;

            channel.users.forEach(user => {
                // Status-Indikatoren
                const statusClass = {
                    online: 'bg-green',
                    idle: 'bg-yellow',
                    dnd: 'bg-red',
                    offline: 'bg-secondary'
                }[user.status || 'offline'];

                // Status-Icons (rechtsbündig)
                let statusIcons = '<div class="ms-auto d-flex align-items-center">';
                if (user.selfMute || user.serverMute) {
                    statusIcons += '<i class="ti ti-microphone-off text-red ms-2" title="Stummgeschaltet"></i>';
                }
                if (user.selfDeaf || user.serverDeaf) {
                    statusIcons += '<i class="ti ti-headphones-off text-purple ms-2" title="Taubgeschaltet"></i>';
                }
                if (user.streaming) {
                    statusIcons += '<i class="ti ti-video text-twitch ms-2" title="Streamt"></i>';
                }
                if (user.video) {
                    statusIcons += '<i class="ti ti-video-plus text-blue ms-2" title="Video aktiv"></i>';
                }
                if (user.requestToSpeak) {
                    statusIcons += '<i class="ti ti-hand-stop text-orange ms-2" title="Möchte sprechen"></i>';
                }
                statusIcons += '</div>';

                html += `
                <div class="d-flex align-items-center mb-3">
                    <div class="position-relative me-3">
                        <span class="avatar avatar-sm" style="background-image: url(${user.avatar})">
                            <span class="badge ${statusClass} badge-status"></span>
                        </span>
                    </div>
                    <div class="flex-fill d-flex align-items-center">
                        <span>${user.username}</span>
                        ${statusIcons}
                    </div>`;

                // Spotify/Activity-Anzeige
                if (user.spotify) {
                    html += `
                        <div class="text-muted small mt-1">
                            <i class="ti ti-brand-spotify text-success me-1"></i>
                            ${user.spotify.song} - ${user.spotify.artist}
                        </div>`;
                } else if (user.activity) {
                    html += `
                        <div class="text-muted small mt-1">
                            <i class="ti ti-device-gamepad text-blue me-1"></i>
                            ${user.activity.name || user.activity}
                        </div>`;
                }

                html += `
                </div>`;
            });

            html += `
            </div>`;
        }

        html += `
        </div>`;
        return html;
    }
    
    // Sofortiges erstes Update beim Laden der Seite
    refreshOnlineUsers();
    refreshVoiceChannels();
    
    // Nach dem ersten Laden das initialLoad-Flag zurücksetzen
    setTimeout(() => {
        initialLoad = false;
    }, 2500); // Etwas mehr als die 2 Sekunden Ladezeit
    
    // Periodisches Update alle 5 Sekunden
    setInterval(refreshOnlineUsers, refreshInterval);
    setInterval(refreshVoiceChannels, refreshInterval);
});
