# Discord Voice Viewer

![Discord Voice Viewer](https://img.shields.io/badge/Discord-Voice%20Viewer-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Eine elegante Onepage-Webanwendung zur Echtzeit-Anzeige aktiver Benutzer in den Sprachkanälen eines Discord-Servers. Mit automatischem Light/Dark Mode und farbcodierten Benutzer-Status-Anzeigen.

## ✨ Features

- **Echtzeit-Updates**: Live-Anzeige von Benutzern in Sprachkanälen
- **Automatischer Light/Dark Mode**: Passt sich automatisch den Systemeinstellungen an
- **Manueller Theme-Wechsel**: Ermöglicht das manuelle Umschalten zwischen Hell- und Dunkel-Modus
- **Farbcodierte Status-Anzeige**: 
  - 🟢 Online (Grün)
  - 🟡 Abwesend (Gelb)
  - 🔴 Nicht stören (Rot)
- **Responsive Design**: Optimiert für Desktop und mobile Geräte
- **Benutzerfreundliche Oberfläche**: Basierend auf dem Tabler Dashboard Framework

## 🛠️ Tech-Stack

- **Backend:** Node.js / Express
- **Frontend:** Handlebars / Tabler Dashboard
- **Styling:** Custom CSS mit nativer Dark Mode Unterstützung
- **Deployment:** Docker / Docker Compose
- **Echtzeit-Updates:** WebSockets

## 🚀 Starten der Anwendung

Die Anwendung wird mit Docker und Docker Compose gestartet.

1. **Konfiguration:**
   Erstelle eine `docker-compose.yml` aus dem Beispiel unten oder passe die vorhandene an. Du musst die Umgebungsvariablen mit deinen eigenen Discord-Bot-Daten füllen.

2. **Start:**
   Führe den folgenden Befehl im Hauptverzeichnis des Projekts aus:
   ```bash
   docker-compose up --build
   ```

3. **Aufrufen:**
   Die Anwendung ist danach unter [http://localhost:3000](http://localhost:3000) erreichbar.

## ⚙️ Umgebungsvariablen

Die folgenden Umgebungsvariablen müssen in der `docker-compose.yml` gesetzt werden:

- `DISCORD_BOT_TOKEN`: Der Token deines Discord-Bots. [Anleitung zum Erstellen eines Bots](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
- `DISCORD_SERVER_ID`: Die ID des Discord-Servers, den du überwachen möchtest.
- `DISCORD_CLIENT_ID`: Die Client-ID deines Discord-Bots.

### Beispiel `docker-compose.yml`

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DISCORD_BOT_TOKEN=dein_bot_token
      - DISCORD_SERVER_ID=deine_server_id
      - DISCORD_CLIENT_ID=deine_client_id
```

## 🎨 Theme-Anpassung

Die Anwendung unterstützt automatisch Light und Dark Mode basierend auf den Systemeinstellungen des Benutzers. Zusätzlich kann das Theme manuell über den Theme-Switcher in der Benutzeroberfläche umgeschaltet werden.

### Features des Theme-Systems:

- **Automatische Erkennung**: Passt sich den Systemeinstellungen an
- **Persistenz**: Speichert die Benutzerauswahl im LocalStorage
- **FOUC-Vermeidung**: Verhindert Flackern beim Laden durch frühes Theme-Setting
- **Konsistente Darstellung**: Speziell angepasste Stile für beide Modi

## 📱 Screenshots

### Dark Mode
![Dark Mode](https://github.com/revunix/Discord-Web-Viewer/blob/63ac1ecbc1cf58704cc6ec40cc69ddb7a41b767c/screenshot/dark.png)

### Light Mode
![Light Mode](https://github.com/revunix/Discord-Web-Viewer/blob/63ac1ecbc1cf58704cc6ec40cc69ddb7a41b767c/screenshot/light.png)

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.
