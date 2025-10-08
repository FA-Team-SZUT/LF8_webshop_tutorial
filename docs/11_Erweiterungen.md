
# Erweiterungen

## 1. Weitere Article-Endpunkte

Lege im `ArticleController` weitere sinnvolle Endpunkte an:

**Mögliche Erweiterungen:**
- `PUT /store/article/{id}` – Artikel aktualisieren
- `DELETE /store/article/{id}` – Artikel löschen
- `GET /store/article/supplier/{supplierId}` – Alle Artikel eines Suppliers
- `PATCH /store/article/{id}` – Nur z.B. Preis aktualisieren

---

## 2. Integrationstests

Versehe **jeden Endpunkt** mit einem **Integrationstest**. Stelle sicher, dass:
- ✅ Erfolgreiche Requests getestet werden (Happy Path)
- ✅ Fehlerszenarien getestet werden (z.B. nicht existierende IDs)
- ✅ Validierungen geprüft werden (z.B. negative Preise)
- ✅ Datenbank-Persistierung verifiziert wird

---

## 3. HATEOAS – Hypermedia as the Engine of Application State

### Was ist HATEOAS?

**HATEOAS** ist ein Prinzip von REST-APIs, bei dem die Response **Links zu verwandten Ressourcen** enthält. Der Client muss URLs nicht selbst zusammenbauen, sondern folgt den bereitgestellten Links.

**Kernidee:** Eine REST-API sollte wie eine Website funktionieren – der Client entdeckt verfügbare Aktionen durch Links in der Antwort.

### Vorteile von HATEOAS

| Vorteil | Beschreibung |
|---------|--------------|
| **Entkopplung** | Client muss URL-Struktur nicht kennen |
| **Self-Discovery** | API ist selbstbeschreibend |
| **Evolvability** | URLs können sich ändern, ohne Clients zu brechen |
| **Bessere UX** | Client weiß, welche Aktionen möglich sind |

### Beispiel: Ohne vs. Mit HATEOAS

#### ❌ Ohne HATEOAS (traditionell)

```json
GET /store/supplier/1

{
  "sid": 1,
  "name": "Meier GmbH",
  "street": "Hauptstraße 10",
  "postcode": "28209",
  "city": "Bremen",
  "phone": "0421123456"
}
```

**Problem:** Client muss selbst wissen, dass er unter `/store/article/supplier/1` die Artikel finden kann.

#### ✅ Mit HATEOAS (empfohlen)

```json
GET /store/supplier/1

{
  "sid": 1,
  "name": "Meier GmbH",
  "street": "Hauptstraße 10",
  "postcode": "28209",
  "city": "Bremen",
  "phone": "0421123456",
  "_links": {
    "self": {
      "href": "http://localhost:8080/store/supplier/1"
    },
    "articles": {
      "href": "http://localhost:8080/store/article/supplier/1"
    },
    "update": {
      "href": "http://localhost:8080/store/supplier/1"
    },
    "delete": {
      "href": "http://localhost:8080/store/supplier/1"
    }
  }
}
```

**Vorteil:** Der Client sieht sofort:
- Wo er die **Artikel** dieses Suppliers findet
- Wie er den Supplier **aktualisieren** kann
- Wie er ihn **löschen** kann
- Den Link zur **Ressource selbst** (self)

### Aufgabe: HATEOAS implementieren

Beim `GET /store/supplier/{id}`-Endpunkt soll ein Link enthalten sein, der auf die **Artikel des Lieferanten** verweist.

#### Abhängigkeit hinzufügen

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-hateoas")
```

#### GetSupplierDto erweitern

```java
import org.springframework.hateoas.RepresentationModel;

@Getter
@Setter
@NoArgsConstructor
public class GetSupplierDto extends RepresentationModel<GetSupplierDto> {
    private Long sid;
    private String name;
    private String street;
    private String postcode;
    private String city;
    private String phone;
    
    public static GetSupplierDto toDto(SupplierEntity entity) {
        GetSupplierDto dto = new GetSupplierDto();
        dto.setSid(entity.getSid());
        dto.setName(entity.getName());
        
        if (entity.getContact() != null) {
            dto.setStreet(entity.getContact().getStreet());
            dto.setPostcode(entity.getContact().getPostcode());
            dto.setCity(entity.getContact().getCity());
            dto.setPhone(entity.getContact().getPhone());
        }
        
        return dto;
    }
}
```

#### Controller-Methode anpassen

```java
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@GetMapping("/{id}")
public ResponseEntity<GetSupplierDto> getSupplierById(@PathVariable Long id) {
    SupplierEntity entity = supplierService.findById(id);
    GetSupplierDto dto = GetSupplierDto.toDto(entity);
    
    // HATEOAS-Links hinzufügen
    dto.add(linkTo(methodOn(SupplierController.class).getSupplierById(id)).withSelfRel());
    dto.add(linkTo(methodOn(ArticleController.class).getArticlesBySupplier(id)).withRel("articles"));
    
    return ResponseEntity.ok(dto);
}
```

#### Artikel-Endpunkt im ArticleController

```java
@GetMapping("/supplier/{supplierId}")
public ResponseEntity<List<GetArticleDto>> getArticlesBySupplier(@PathVariable Long supplierId) {
    List<ArticleEntity> articles = articleService.findBySupplier(supplierId);
    List<GetArticleDto> dtos = articles.stream()
        .map(GetArticleDto::toDto)
        .collect(Collectors.toList());
    return ResponseEntity.ok(dtos);
}
```

#### Service-Methode hinzufügen

```java
// ArticleService
public List<ArticleEntity> findBySupplier(Long supplierId) {
    SupplierEntity supplier = supplierRepository.findById(supplierId)
        .orElseThrow(() -> new ResourceNotFoundException(
            "Supplier not found on Id = " + supplierId));
    return new ArrayList<>(supplier.getArticles());
}
```

### Erwartete Response mit HATEOAS

```json
{
  "sid": 1,
  "name": "Meier GmbH",
  "street": "Hauptstraße 10",
  "postcode": "28209",
  "city": "Bremen",
  "phone": "0421123456",
  "_links": {
    "self": {
      "href": "http://localhost:8080/store/supplier/1"
    },
    "articles": {
      "href": "http://localhost:8080/store/article/supplier/1"
    }
  }
}
```

### Weitere HATEOAS-Möglichkeiten

**Erweitere die Links je nach Bedarf:**

```java
// Conditionelle Links (nur wenn Aktionen erlaubt sind)
if (entity.getArticles().isEmpty()) {
    dto.add(linkTo(methodOn(SupplierController.class).deleteSupplier(id)).withRel("delete"));
}

// Link zum Aktualisieren
dto.add(linkTo(methodOn(SupplierController.class).updateSupplier(id, null)).withRel("update"));

// Link zu allen Suppliers
dto.add(linkTo(methodOn(SupplierController.class).getAllSuppliers()).withRel("all-suppliers"));
```

---

## Ressourcen

- **Spring HATEOAS Dokumentation:** [https://spring.io/projects/spring-hateoas](https://spring.io/projects/spring-hateoas)
- **Baeldung Tutorial:** [https://www.baeldung.com/spring-hateoas-tutorial](https://www.baeldung.com/spring-hateoas-tutorial)
- **REST Maturity Model (Richardson):** HATEOAS entspricht Level 3 (höchste REST-Reife)
