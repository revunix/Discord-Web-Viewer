const express = require('express');
// Handlebars-Engine mit Helfern initialisieren
const hbs = require('express-handlebars').create({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        eq: (v1, v2) => v1 === v2,
    }
});
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

// Konfiguration
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER_ID = process.env.DISCORD_SERVER_ID;

if (!TOKEN || !SERVER_ID) {
    console.error('Bitte die Umgebungsvariablen DISCORD_BOT_TOKEN und DISCORD_SERVER_ID setzen.');
    process.exit(1);
}

// Discord Client initialisieren
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences // Benötigt für Aktivität und Status
    ]
});

// Express App initialisieren
const app = express();

// Handlebars als Template Engine einrichten
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', './views');

// Statische Dateien (falls benötigt)
app.use(express.static('public'));

// Hauptroute
// API-Endpunkte für AJAX-Refresh
app.get('/api/online-users', async (req, res) => {
    try {
        // Aktualisierte Daten abrufen
        const guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);
        if (!guild) {
            return res.status(404).json({ error: 'Server nicht gefunden' });
        }
        
        // Mitglieder mit Presence-Daten abrufen
        await guild.members.fetch({ withPresences: true });
        const members = Array.from(guild.members.cache.values());
        
        // Online Benutzer sammeln (Status: online, idle, dnd)
        const onlineMembers = members
            .filter(member => 
                member.presence && 
                ['online', 'idle', 'dnd'].includes(member.presence.status) && 
                !member.user.bot
            )
            .map(member => {
                // Priorität: 1. Server-Nickname, 2. Globaler Display Name, 3. Username
                const displayName = member.nickname || member.user.globalName || member.user.username;
                
                return {
                    id: member.id,
                    nickname: displayName,
                    avatar: member.user.displayAvatarURL({ size: 64 }),
                    status: member.presence ? member.presence.status : 'offline'
                };
            })
            .sort((a, b) => {
                // Zuerst nach Status sortieren (online > idle > dnd)
                const statusOrder = { 'online': 1, 'idle': 2, 'dnd': 3 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                // Bei gleichem Status nach Nickname sortieren
                return a.nickname.localeCompare(b.nickname);
            });
            
        res.json({ onlineMembers });
    } catch (error) {
        console.error('Fehler beim Abrufen der Online-Benutzer:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.get('/api/voice-channels', async (req, res) => {
    try {
        // Aktualisierte Daten abrufen
        const guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);
        if (!guild) {
            return res.status(404).json({ error: 'Server nicht gefunden' });
        }
        
        // Voice-Channels und Benutzer abrufen
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2); // Voice-Channels
        const voiceStates = Array.from(guild.voiceStates.cache.values());
        
        // Funktion zum Bereinigen von │-Zeichen (Emojis bleiben erhalten)
        const cleanChannelName = (name) => {
            // Entferne │-Zeichen
            let cleaned = name.replace(/│/g, '');
            // Entferne überschüssige Leerzeichen
            return cleaned.trim();
        };
        
        // Funktion zum Sammeln von Benutzerdaten
        const getUserData = (vs) => {
            try {
                const member = vs.member;
                const presence = member?.presence;
                
                // Status mit Fallbacks
                const status = 
                    presence?.status || 
                    (presence?.clientStatus ? Object.keys(presence.clientStatus)[0] : null) || 
                    'offline';

                // Aktivitäten
                let activity = null;
                let spotify = null;
                
                if (presence?.activities?.length) {
                    const spotifyActivity = presence.activities.find(a => a.name === 'Spotify');
                    if (spotifyActivity) {
                        spotify = {
                            song: spotifyActivity.details,
                            artist: spotifyActivity.state
                        };
                    } else {
                        activity = presence.activities[0]?.name;
                    }
                }

                return {
                    id: vs.id,
                    username: member?.nickname || member?.user?.username,
                    avatar: member?.user?.displayAvatarURL({ size: 64 }),
                    status: status,
                    activity: activity,
                    spotify: spotify,
                    selfMute: vs.selfMute,
                    selfDeaf: vs.selfDeaf,
                    serverMute: vs.serverMute,
                    serverDeaf: vs.serverDeaf,
                    streaming: vs.streaming,
                    video: vs.selfVideo,
                    suppress: vs.suppress,
                    requestToSpeak: vs.requestToSpeakTimestamp !== null
                };
            } catch (error) {
                console.error('Fehler in getUserData:', error);
                return {
                    id: vs.id,
                    username: 'Unbekannter Benutzer',
                    status: 'offline'
                };
            }
        };
        
        // Voice-Channels und Benutzer gruppieren
        const categories = new Map();
        const uncategorizedChannels = [];
        
        voiceChannels.forEach(channel => {
            const users = voiceStates
                .filter(vs => vs.channelId === channel.id)
                .map(getUserData);
            
            const channelData = {
                id: channel.id,
                name: cleanChannelName(channel.name),
                users,
                isCategory: false
            };
            
            if (channel.parent) {
                const categoryId = channel.parent.id;
                if (!categories.has(categoryId)) {
                    categories.set(categoryId, {
                        id: categoryId,
                        name: cleanChannelName(channel.parent.name),
                        children: [],
                        isCategory: true
                    });
                }
                categories.get(categoryId).children.push(channelData);
            } else {
                uncategorizedChannels.push(channelData);
            }
        });
        
        // Gruppierte Voice-Benutzer zusammenstellen
        const groupedVoiceUsers = [
            ...Array.from(categories.values()),
            ...uncategorizedChannels
        ];
        
        res.json({ groupedVoiceUsers });
    } catch (error) {
        console.error('Fehler beim Abrufen der Voice-Channels:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.get('/', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        if (!guild) {
            return res.status(404).render('error', { message: 'Discord-Server nicht gefunden.' });
        }

        // Alle Mitglieder des Servers holen, um sicherzustellen, dass die Daten aktuell sind
        await guild.members.fetch();

        // Server-Infos sammeln
        const owner = await guild.members.fetch(guild.ownerId);
        const members = await guild.members.fetch();

        // Boost-Level-Anforderungen
        const boostTiers = {
            0: { required: 2, label: 'Level 1' },
            1: { required: 7, label: 'Level 2' },
            2: { required: 14, label: 'Level 3' },
            3: { required: 14, label: 'Max Level' }
        };

        const currentTier = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const progressInfo = boostTiers[currentTier];
        const previousTierRequired = currentTier > 0 ? boostTiers[currentTier - 1].required : 0;
        const nextTierRequired = progressInfo.required;

        let progress = 0;
        if (currentTier < 3) {
            const boostsInCurrentTier = boostCount - previousTierRequired;
            const boostsNeededForNextTier = nextTierRequired - previousTierRequired;
            if (boostsNeededForNextTier > 0) {
                progress = Math.round(Math.min(100, (boostsInCurrentTier / boostsNeededForNextTier) * 100));
            }
        }

        // Online Benutzer sammeln (Status: online, idle, dnd)
        const onlineMembers = members
            .filter(member => 
                member.presence && 
                ['online', 'idle', 'dnd'].includes(member.presence.status) && 
                !member.user.bot
            )
            .map(member => {
                // Priorität: 1. Server-Nickname, 2. Globaler Display Name, 3. Username
                const displayName = member.nickname || member.user.globalName || member.user.username;
                
                return {
                    id: member.id,
                    nickname: displayName, // Wir behalten den Variablennamen bei, aber verwenden den Display Name
                    avatar: member.user.displayAvatarURL({ size: 64 }),
                    status: member.presence ? member.presence.status : 'offline'
                };
            })
            .sort((a, b) => {
                // Zuerst nach Status sortieren (online > idle > dnd)
                const statusOrder = { 'online': 1, 'idle': 2, 'dnd': 3 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                // Bei gleichem Status nach Nickname sortieren
                return a.nickname.localeCompare(b.nickname);
            });

        const serverInfo = {
            name: guild.name,
            icon: guild.iconURL({ size: 256 }),
            memberCount: guild.memberCount,
            botCount: members.filter(m => m.user.bot).size,
            createdAt: guild.createdAt.toLocaleDateString('de-DE'),
            owner: owner.user.tag,
            banner: guild.bannerURL({ size: 1024 }),
            id: guild.id,
            region: guild.preferredLocale || 'de',

            boosts: {
                count: boostCount,
                level: currentTier,
                progress: progress,
                nextLevelLabel: currentTier < 3 ? progressInfo.label : 'Max Level',
                nextLevelCount: currentTier < 3 ? progressInfo.required : boostCount
            }
        };

        const channels = {
            text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => c.name).sort(),
            voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).map(c => c.name).sort()
        };

        // Permanenten Invite-Link erstellen
        let inviteLink = '#';
        const firstTextChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        if (firstTextChannel) {
            try {
                const invite = await firstTextChannel.createInvite({ maxAge: 0, maxUses: 0, reason: 'Für Voice Viewer App' });
                inviteLink = invite.url;
            } catch (err) {
                console.error('Konnte keinen Invite-Link erstellen:', err.message);
            }
        }

        const voiceStates = guild.voiceStates.cache;

        // Hilfsfunktion zum Bereinigen von Channelnamen
        const cleanChannelName = (name) => {
            // Entferne Emojis (Unicode-Emoji-Bereich)
            let cleaned = name.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
            // Entferne │-Zeichen
            cleaned = cleaned.replace(/│/g, '');
            // Entferne überschüssige Leerzeichen
            return cleaned.trim();
        };

        // Funktion zum Sammeln von Benutzerdaten
        const getUserData = (vs) => {
            try {
                const member = vs.member;
                const presence = member?.presence;
                
                // Status mit Fallbacks
                const status = 
                    presence?.status || 
                    (presence?.clientStatus ? Object.keys(presence.clientStatus)[0] : null) || 
                    'offline';

                // Aktivitäten
                let activity = null;
                let spotify = null;
                
                if (presence?.activities?.length) {
                    const spotifyActivity = presence.activities.find(a => a.name === 'Spotify');
                    if (spotifyActivity) {
                        spotify = {
                            song: spotifyActivity.details,
                            artist: spotifyActivity.state
                        };
                    } else {
                        activity = presence.activities[0]?.name;
                    }
                }

                return {
                    id: vs.id,
                    username: member?.nickname || member?.user?.username,
                    avatar: member?.user?.displayAvatarURL({ size: 64 }),
                    status: status,
                    activity: activity,
                    spotify: spotify,
                    selfMute: vs.selfMute,
                    selfDeaf: vs.selfDeaf,
                    serverMute: vs.serverMute,
                    serverDeaf: vs.serverDeaf,
                    streaming: vs.streaming,
                    video: vs.selfVideo,
                    suppress: vs.suppress,
                    requestToSpeak: vs.requestToSpeakTimestamp !== null
                };
            } catch (error) {
                console.error('Fehler in getUserData:', error);
                return {
                    id: vs.id,
                    username: 'Unbekannter Benutzer',
                    status: 'offline'
                };
            }
        };

        // Kanäle nach Kategorien gruppieren
        const channelStructure = guild.channels.cache
            .filter(c => c.type === 4) // ChannelType.GuildCategory
            .sort((a, b) => a.position - b.position)
            .map(category => ({
                isCategory: true,
                name: cleanChannelName(category.name),
                children: category.children.cache
                    .filter(c => c.type === 2) // ChannelType.GuildVoice
                    .sort((a, b) => a.position - b.position)
                    .map(channel => ({
                        name: cleanChannelName(channel.name),
                        users: voiceStates.filter(vs => vs.channelId === channel.id).map(getUserData),
                        isEmpty: voiceStates.filter(vs => vs.channelId === channel.id).size === 0
                    }))
            }));

        // Voice-Channels ohne Kategorie hinzufügen
        const channelsWithoutCategory = guild.channels.cache
            .filter(c => c.type === 2 && !c.parentId)
            .sort((a, b) => a.position - b.position)
            .map(channel => ({
                isCategory: false,
                name: cleanChannelName(channel.name),
                users: voiceStates.filter(vs => vs.channelId === channel.id).map(getUserData),
                isEmpty: voiceStates.filter(vs => vs.channelId === channel.id).size === 0
            }));

        const groupedVoiceUsers = [...channelStructure, ...channelsWithoutCategory];

        // Extrahiere boosts aus serverInfo für direkten Zugriff im Template
        const { boosts } = serverInfo;
        
        res.render('index', {
            pageTitle: serverInfo.name, // Für den <title>-Tag
            serverInfo,
            groupedVoiceUsers,
            onlineMembers, // Online Benutzer für die neue Box
            inviteLink,
            channels,
            boosts, // Direkte Übergabe der Boost-Daten
            layout: 'main'
        });

    } catch (error) {
        console.error('Fehler beim Abrufen der Discord-Daten:', error);
        res.status(500).render('error', { message: 'Fehler beim Abrufen der Discord-Daten.' });
    }
});

// Discord Bot anmelden und Server starten
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    app.listen(PORT, () => {
        console.log(`Server läuft auf http://localhost:${PORT}`);
    });
});

client.login(TOKEN);
