
# Spring Boot – Datenbankkonfiguration
> **Fortschritt:** <!-- wird live gezählt -->
> - Gesamt: <span id="t-total">0</span>
> - Erledigt: <span id="t-done">0</span>

Als nächstes muss unsere Spring‑Boot‑Anwendung mit der PostgreSQL‑Datenbank bekannt gemacht werden. 

- [ ] Öffne dazu die Datei **`application.properties`** und kopiere folgende Konfiguration hinein:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/store_db
spring.datasource.username=store
spring.datasource.password=secret
server.port=8080
spring.jpa.hibernate.ddl-auto=create-drop
```

**Erläuterungen:**
- Zeilen 1–3: Verbindung zur lokalen Datenbank (URL, Nutzer, Passwort).
- `server.port=8080`: Der Webservice ist auf Port 8080 erreichbar.
- `spring.jpa.hibernate.ddl-auto=create-drop`: Während der Entwicklung wird bei jedem Neustart eine neue DB angelegt.

**Test:**  

- [ ] Starte deinen Docker‑Container und danach den Webservice. Beide sollten fehlerfrei laufen. Fahre beide wieder herunter.

