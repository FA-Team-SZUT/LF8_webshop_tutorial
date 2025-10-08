
# DTOs und Mapping

In früheren Übungen wurden Entity‑Objekte direkt in JSON serialisiert/deserialisiert. Das koppelt jedoch **Controller** und **Persistenzstruktur** sehr eng. Änderungen an der DB‑Struktur erzwingen API‑Änderungen (und umgekehrt). Best Practice ist daher die Entkopplung über **DTOs (Data Transfer Objects)** und ein **Mapping** zwischen DTOs und Entities.

## Warum sind DTOs wichtig?

### 1. **Entkopplung von API und Datenbank**
Ohne DTOs sind die Endpunkt-Strukturen direkt an die Datenbankstruktur gebunden. Jede Änderung am Datenbankmodell (z.B. Umbenennung, neue Felder) würde die API brechen und alle Clients zwingen, ihre Integration anzupassen. Mit DTOs können API und Datenbank **unabhängig voneinander evolvieren**.

### 2. **Vermeidung von Lazy-Loading-Problemen**
Entities enthalten oft bidirektionale Beziehungen und Lazy-Loading. Wird eine Entity direkt serialisiert, kann das zu:
- **LazyInitializationException** führen (außerhalb der Transaktion)
- **Zirkulären Referenzen** führen (JSON-Serialisierung schlägt fehl)

DTOs enthalten nur die wirklich benötigten Daten ohne Beziehungen.

### 3. **Sicherheit und Datenschutz**
Entities enthalten oft **interne Felder**, die nicht nach außen gegeben werden sollen:
- Passwort-Hashes
- Interne IDs oder Referenzen
- Zeitstempel wie `lastUpdateDate`, `createdBy`
- Soft-Delete-Flags

Mit DTOs kontrollierst du **explizit**, welche Daten exponiert werden.

### 4. **API-Design nach Use-Cases**
Verschiedene Endpunkte benötigen verschiedene Datenstrukturen:
- **GET /suppliers** → Liste mit Basis-Info (ohne Details)
- **GET /suppliers/{id}** → Vollständige Details inkl. Kontakt
- **POST /suppliers** → Eingabe-DTO mit Validierung
- **GET /suppliers/{id}/articles** → Supplier mit zugehörigen Artikeln

Ein DTO pro Use-Case macht die API klar und effizient.

### 5. **Validierung auf API-Ebene**
Input-DTOs können mit `@Valid`, `@NotBlank`, `@Size` etc. annotiert werden, **ohne die Entity zu verschmutzen**. Die Entity bleibt fokussiert auf die Datenbank-Logik, das DTO auf die API-Validierung.

### 6. **Performance**
Entities enthalten oft große Objektgraphen (z.B. ein Supplier mit 1000 Artikeln). DTOs serialisieren nur die **wirklich benötigten Felder**, was Bandbreite spart und die Antwortzeit reduziert.

### 7. **Saubere Architektur**
DTOs gehören zur **Präsentationsschicht**, Entities zur **Persistenzschicht**. Diese Trennung folgt dem **Separation of Concerns**-Prinzip und macht die Anwendung wartbarer.

---


## Supplier‑Controller – DTO‑Sicht

Die Webschnittstelle soll vollständige **CRUD**‑Funktionalität anbieten. Aus Client‑Sicht ergibt eine separate Trennung in `Supplier` und `Contact` wenig Sinn – wir nehmen/senden die Daten **unnormalisiert** (Name + Kontaktdaten in einem DTO).

## Mapping-Strategie: Statische Methoden in DTOs

Statt eines zentralen `MappingService` (der schnell zu einer unübersichtlichen "God-Class" wird) verwenden wir **statische Mapping-Methoden direkt in den DTOs**. 

**Vorteile:**
- ✅ **Bessere Kohäsion**: Die Mapping-Logik ist dort, wo sie hingehört – im DTO selbst
- ✅ **Keine God-Class**: Jede DTO-Klasse bleibt klein und fokussiert
- ✅ **Einfacher zu finden**: Mapping-Logik ist direkt in der DTO-Klasse
- ✅ **Weniger Abhängigkeiten**: Kein zusätzlicher Service nötig

**Naming-Konvention:**
- `toEntity(dto)` – Konvertiert DTO zu Entity (bei Input-DTOs)
- `toDto(entity)` – Konvertiert Entity zu DTO (bei Output-DTOs)

### Beispiel‑DTOs mit Mapping-Logik

```java
@Getter
@Setter
@NoArgsConstructor
public class AddSupplierDto {
    @NotBlank(message = "Name is mandatory")
    private String name;
    
    @NotBlank(message = "Street is mandatory")
    private String street;
    
    @NotBlank(message = "Postcode is mandatory")
    private String postcode;
    
    @NotBlank(message = "City is mandatory")
    private String city;
    
    @NotBlank(message = "Phone is mandatory")
    private String phone;
    
    /**
     * Konvertiert dieses DTO in eine SupplierEntity mit ContactEntity
     */
    public static SupplierEntity toEntity(AddSupplierDto dto) {
        SupplierEntity supplier = new SupplierEntity();
        supplier.setName(dto.getName());
        
        ContactEntity contact = new ContactEntity();
        contact.setStreet(dto.getStreet());
        contact.setPostcode(dto.getPostcode());
        contact.setCity(dto.getCity());
        contact.setPhone(dto.getPhone());
        
        supplier.setContact(contact);
        return supplier;
    }
}
```

