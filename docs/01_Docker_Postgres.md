
# Aufsetzen und Konfigurieren: Docker + PostgreSQL

Statt der In‑Memory‑Datenbank H2 soll in diesem Tutorial die professionelle und Open‑Source‑Datenbank **PostgreSQL** verwendet werden. Wir setzen **keinen separaten DB‑Server** auf, sondern betreiben PostgreSQL in einem **Docker‑Container**. Dafür sind ein paar zusätzliche Konfigurationen nötig.

Erstelle ein neues Spring‑Boot‑Projekt mit dem Bezeichner `store`. **Group**: `de.szut`.  
Benötigte Abhängigkeiten: **Spring Web**, **Spring Data JPA**, **Lombok**, **PostgreSQL Driver**.

Erstelle im Hauptverzeichnis deines Projekts (auf Root-Ebene) die Datei **`compose.yml`**.
- [ ] Docker installieren


In der Regel bilden mehrere Docker‑Container eine Anwendung. **Docker Compose** dient dazu, mehrere Images zu konfigurieren und hintereinander zu starten (anstatt jeden Container einzeln). In unserem Fall benötigen wir **nur einen** Container: die PostgreSQL‑Datenbank.

Kopiere den unten abgebildeten Code in dein Compose‑File:

```yml
volumes:
  store_postgres_data:
    driver: local

services:
  postgres_for_store:
    container_name: store_postgres_container
    image: postgres:16
    volumes:
      - store_postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: store_db
      POSTGRES_USER: store
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
```

**Erläuterungen:**
- Unter `services` werden Container erstellt/konfiguriert. Unser Container heißt `store_postgres_container` und basiert auf `postgres:16` (Download aus **Docker Hub**).
- Unter `environment` setzen wir DB‑Name, Benutzer und Passwort innerhalb des Containers.
- Unter `ports` wird der Host‑Port **5432** auf den Container‑Port **5432** gemappt (Standard‑Port für PostgreSQL).
- Damit Daten **persistent** bleiben, definieren wir ein **Volume** (`store_postgres_data`) und mounten es auf den Datenpfad des Containers (`/var/lib/postgresql/data`).

## Starten/Stoppen
1. **Docker** starten.  
2. Im Terminal (z. B. IntelliJ) im Projekt-Root-Verzeichnis ausführen:
3. Starten: `docker compose up`  
   - Erfolgreich, wenn im Log steht: *"database system is ready to accept connections"*.  
   - Optional mit `-d` für Detached-Modus (Hintergrund): `docker compose up -d`
4. Beenden: `docker compose down`  
5. Volume ggf. löschen: `docker volume rm store_postgres_data`


> **Fortschritt:** <!-- wird live gezählt -->
> - Gesamt: <span id="t-total">0</span>
> - Erledigt: <span id="t-done">0</span>
