
# Zentrales Exception-Handling

## Warum brauchen wir Exception-Handling?

### Das Problem: Spring Boots Standard-Fehlerantworten

Beim Ausführen eines fehlerhaften Requests (z.B. POST mit ungültigen Daten oder GET mit nicht existierender ID) liefert Spring Boot standardmäßig eine sehr **generische** Fehlerantwort wie diese:

```json
{
  "timestamp": "2025-10-08T11:58:08.139+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/store/supplier"
}
```

Oder bei Validierungsfehlern manchmal auch:

```json
{
  "timestamp": "2025-10-08T11:58:08.139+00:00",
  "status": 400,
  "error": "Bad Request",
  "path": "/store/supplier"
}
```

**Probleme dieser Standard-Antworten:**

1. ❌ **Keine konkrete Fehlermeldung**: Was genau ist schiefgelaufen? Welches Feld fehlt?
2. ❌ **Kein `message`-Feld**: Clients müssen aus `status` und `error` selbst interpretieren
3. ❌ **Nicht aussagekräftig**: "Internal Server Error" sagt nichts über die Ursache
4. ❌ **Nicht einheitlich**: Je nach Exception-Typ unterschiedliche Strukturen (manchmal mit `message`, manchmal ohne)
5. ❌ **Client-unfreundlich**: Keine programmatisch auswertbaren Details
6. ❌ **Falsche Status-Codes**: Oft 500 statt 404 bei "nicht gefunden"

### Die Lösung: Zentrales Exception-Handling

Wir implementieren ein **einheitliches, aussagekräftiges Fehlerhandling** für alle Controller:

**Vorteile:**
- ✅ Einheitliche Fehlerstruktur für alle Endpunkte
- ✅ Aussagekräftige, benutzerfreundliche Fehlermeldungen
- ✅ Korrekte HTTP-Statuscodes (404, 400, 500, etc.)
- ✅ Keine Code-Duplizierung in jedem Controller
- ✅ Zentrale Verwaltung aller Exceptions
- ✅ Maschinell verarbeitbare Fehlerantworten

---

## Schritt 1: Eigene Exception für "Nicht gefunden"

### Aufgabe

Erstelle im Package `exceptionhandling` die Klasse `ResourceNotFoundException`:

```java
package de.szut.store.exceptionhandling;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

### Erklärung

**Warum von `RuntimeException` erben?**
- RuntimeExceptions sind **unchecked** – Methoden müssen nicht mit `throws` deklariert werden
- Der Code bleibt sauber ohne überall Exception-Deklarationen

**Was macht `@ResponseStatus(HttpStatus.NOT_FOUND)`?**
- Legt automatisch den HTTP-Statuscode **404 (Not Found)** fest
- Sobald diese Exception geworfen wird, antwortet Spring mit Status 404
- Ohne diese Annotation würde standardmäßig 500 (Internal Server Error) zurückgegeben

---

## Schritt 2: Einheitliche Fehlerstruktur definieren

### Aufgabe

Erstelle im Package `exceptionhandling` die Klasse `ErrorDetails`:

```java
package de.szut.store.exceptionhandling;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ErrorDetails {
    private LocalDateTime timestamp;  // Zeitpunkt des Fehlers
    private String message;            // Benutzerfreundliche Fehlermeldung
    private String details;            // Zusatzinfos (z.B. URI-Pfad)
}
```

### Erklärung

Diese Klasse definiert die **einheitliche Struktur** für alle Fehlerantworten:

- **`timestamp`**: Wann ist der Fehler aufgetreten? (wichtig für Logging/Debugging)
- **`message`**: Die Haupt-Fehlermeldung für den Client (z.B. "Supplier not found on Id = 3")
- **`details`**: Zusätzliche Kontext-Informationen (z.B. welcher Endpunkt aufgerufen wurde)

**`@AllArgsConstructor`** generiert einen Konstruktor mit allen drei Parametern, damit wir einfach Instanzen erstellen können.

---

## Schritt 3: Zentraler Exception-Handler

### Aufgabe

Erstelle im Package `exceptionhandling` die Klasse `GlobalExceptionHandler`:

```java
package de.szut.store.exceptionhandling;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;

@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Behandelt ResourceNotFoundException (404 - Not Found)
     * Wird geworfen, wenn eine angeforderte Ressource nicht existiert
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleResourceNotFound(
            ResourceNotFoundException ex, 
            WebRequest request) {
        
        ErrorDetails error = new ErrorDetails(
            LocalDateTime.now(),
            ex.getMessage(),
            request.getDescription(false)
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    /**
     * Behandelt MethodArgumentNotValidException (400 - Bad Request)
     * Wird von @Valid automatisch geworfen, wenn DTO-Validierung fehlschlägt
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetails> handleValidation(
            MethodArgumentNotValidException ex, 
            WebRequest request) {
        
        // Extrahiere die erste Fehlermeldung aus den Validierungs-Errors
        String message = ex.getBindingResult()
            .getFieldErrors()
            .get(0)
            .getDefaultMessage();
        
        ErrorDetails error = new ErrorDetails(
            LocalDateTime.now(),
            message,
            request.getDescription(false)
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Behandelt ConstraintViolationException (400 - Bad Request)
     * Wird geworfen, wenn Bean-Validation-Constraints verletzt werden
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorDetails> handleConstraintViolation(
            ConstraintViolationException ex, 
            WebRequest request) {
        
        // Extrahiere die erste Constraint-Verletzungs-Nachricht
        String message = ex.getConstraintViolations()
            .iterator()
            .next()
            .getMessage();
        
        ErrorDetails error = new ErrorDetails(
            LocalDateTime.now(),
            message,
            request.getDescription(false)
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Behandelt alle anderen Exceptions (500 - Internal Server Error)
     * Fallback für unerwartete Fehler
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetails> handleGlobalException(
            Exception ex, 
            WebRequest request) {
        
        ErrorDetails error = new ErrorDetails(
            LocalDateTime.now(),
            "Internal server error",
            request.getDescription(false)
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

### Erklärung: Wie funktioniert das?

#### `@ControllerAdvice`
Diese Annotation macht die Klasse zu einem **globalen Controller-Berater**:
- Gilt für **alle Controller** in der Anwendung
- Zentrale Stelle für Exception-Handling
- Spring wendet diese Handler automatisch auf alle Endpunkte an

#### `@ExceptionHandler(ExceptionType.class)`
Definiert, welche Exception-Methode behandelt:
- Sobald **irgendwo** in der Anwendung diese Exception geworfen wird
- Wird automatisch die annotierte Methode aufgerufen
- Die Methode baut eine passende HTTP-Response

#### Handler-Flow am Beispiel `ResourceNotFoundException`:

```
1. Service wirft: throw new ResourceNotFoundException("Supplier not found")
                            ↓
2. Spring fängt Exception ab
                            ↓
3. Spring sucht passenden @ExceptionHandler
                            ↓
4. handleResourceNotFound() wird ausgeführt
                            ↓
5. ErrorDetails-Objekt wird erstellt
                            ↓
6. ResponseEntity mit Status 404 wird zurückgegeben
                            ↓
7. Spring serialisiert ErrorDetails zu JSON
                            ↓
8. Client erhält einheitliche Fehlerantwort
```

---

## Schritt 4: Exception im Service verwenden

### Aufgabe

Passe die Methode `findById()` im `SupplierService` an:

```java
@Service
public class SupplierService {
    
    private final SupplierRepository supplierRepository;
    
    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }
    
    public SupplierEntity findById(Long id) {
        return supplierRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Supplier not found on Id = " + id));
    }
    
    // ... weitere Methoden
}
```

### Testen

**Test-Request:**
```http
GET http://localhost:8080/store/supplier/999
```

**Erwartete Antwort (Status 404):**
```json
{
  "timestamp": "2025-10-08T14:23:11.770",
  "message": "Supplier not found on Id = 999",
  "details": "uri=/store/supplier/999"
}
```

✅ **Viel besser!** Klare Fehlermeldung, korrekte Statuscode, einheitliche Struktur.

---

## Testen: Die verschiedenen Fehlertypen

Jetzt können wir die verschiedenen Exception-Handler testen:

### Test 1: ResourceNotFoundException (404 Not Found)

**Test-Request (nicht existierende ID):**
```http
GET http://localhost:8080/store/supplier/999
```

**Erwartete Antwort:**
```json
{
  "timestamp": "2025-10-08T14:23:11.770",
  "message": "Supplier not found on Id = 999",
  "details": "uri=/store/supplier/999"
}
```

✅ Status 404, klare Fehlermeldung!

---

### Test 2: MethodArgumentNotValidException (400 Bad Request)

**Test-Request (fehlender Name):**
```http
POST http://localhost:8080/store/supplier
Content-Type: application/json

{
  "street": "Hauptstraße 1",
  "postcode": "28209",
  "city": "Bremen",
  "phone": "0421123456"
}
```

**Erwartete Antwort:**
```json
{
  "timestamp": "2025-10-08T14:25:33.123",
  "message": "Name is mandatory",
  "details": "uri=/store/supplier"
}
```

✅ Nur die relevante Fehlermeldung aus der `@NotBlank(message = "...")`-Annotation!

**Wichtig:** Die Handler für `MethodArgumentNotValidException` und `ConstraintViolationException` extrahieren automatisch die **benutzerdefinierten Fehlermeldungen** aus den Validierungs-Annotationen im DTO:

```java
// Im AddSupplierDto:
@NotBlank(message = "Name is mandatory")  // ← Diese Message wird verwendet
private String name;
```

---

### Test 3: ConstraintViolationException (400 Bad Request)

**Test-Request (ungültige Postleitzahl):**
```http
POST http://localhost:8080/store/supplier
Content-Type: application/json

{
  "name": "Test Supplier",
  "street": "Hauptstraße 1",
  "postcode": "123456789",
  "city": "Bremen",
  "phone": "0421123456"
}
```

**Erwartete Antwort:**
```json
{
  "timestamp": "2025-10-08T14:27:15.456",
  "message": "Postcode must be 5 characters",
  "details": "uri=/store/supplier"
}
```

✅ Auch hier wird die Message aus der `@Size`-Annotation verwendet!

---

## Übersicht: Welcher Handler für welchen Fehler?

| Exception | HTTP-Status | Wann wird sie geworfen? | Beispiel |
|-----------|-------------|-------------------------|----------|
| `ResourceNotFoundException` | 404 Not Found | Ressource existiert nicht | Supplier mit ID 999 nicht gefunden |
| `MethodArgumentNotValidException` | 400 Bad Request | `@Valid` schlägt fehl | Pflichtfeld fehlt in POST-Request |
| `ConstraintViolationException` | 400 Bad Request | Bean-Validation verletzt | Ungültige Postleitzahl (zu lang) |
| `Exception` (alle anderen) | 500 Internal Server Error | Unerwarteter Fehler | Datenbankverbindung fehlgeschlagen |

---

## Pro & Contra: Zentrales Exception-Handling

### ✅ Vorteile

| Vorteil | Erklärung |
|---------|-----------|
| **Keine Duplizierung** | Code wird nur einmal geschrieben, gilt für alle Controller |
| **Einheitlichkeit** | Alle Fehler haben die gleiche Struktur |
| **Wartbarkeit** | Änderungen an Fehlerstruktur an einer Stelle |
| **Übersichtlichkeit** | Alle Exception-Typen zentral dokumentiert |
| **Separation of Concerns** | Controller bleiben fokussiert auf Business-Logik |

### ⚠️ Nachteile

| Nachteil | Erklärung |
|----------|-----------|
| **Weniger Kontrolle** | Exceptions "verschwinden" aus dem Controller |
| **Debugging schwieriger** | Stack-Traces müssen genau angeschaut werden |
| **Übersicht geht verloren** | Welche Exceptions kann ein Endpunkt werfen? |

### Alternative: Controller-basiertes Exception-Handling

Manche Teams bevorzugen Exception-Handling **pro Controller**:

```java
@RestController
@RequestMapping("/store/supplier")
public class SupplierController {
    
    // ... Controller-Methoden
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleNotFound(ResourceNotFoundException ex) {
        // Nur für diesen Controller
    }
}
```

**Vorteil:** Entwickler sieht sofort, welche Exceptions der Controller werfen kann  
**Nachteil:** Code-Duplizierung in jedem Controller

---

## Zusammenfassung

1. **Eigene Exceptions definieren** (`ResourceNotFoundException`) für fachliche Fehler
2. **Einheitliche Fehlerstruktur** (`ErrorDetails`) für alle Responses
3. **Zentraler Handler** (`@ControllerAdvice` + `@ExceptionHandler`) für alle Controller
4. **Aussagekräftige Messages** aus Validierungs-Annotationen extrahieren
5. **Korrekte HTTP-Statuscodes** für jeden Fehlertyp

**Ergebnis:** Eine professionelle REST-API mit klaren, einheitlichen Fehlermeldungen! 🎉
```
