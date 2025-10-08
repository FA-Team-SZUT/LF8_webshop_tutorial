
# Integrationstests mit Testcontainers

Anstatt den Webservice immer händisch über Requests zu testen, nutzen wir **automatisierte Integrationstests**.

## Was ist Testcontainers?

**Testcontainers** ist eine Java-Bibliothek, die es ermöglicht, **Docker-Container programmatisch für Tests zu starten und zu verwalten**. 

### Vorteile von Testcontainers:

- **Realistische Testumgebung**: Statt Mock-Datenbanken oder In-Memory-Datenbanken (wie H2) wird eine echte PostgreSQL-Datenbank in einem Docker-Container gestartet. Dadurch testen wir mit der gleichen Datenbank, die auch in Produktion läuft.
- **Isolation**: Jeder Test läuft gegen eine saubere, isolierte Datenbankinstanz. Es gibt keine Konflikte zwischen verschiedenen Testläufen.
- **Automatisierung**: Der Container wird automatisch gestartet, wenn die Tests beginnen, und wieder heruntergefahren, wenn sie beendet sind.
- **CI/CD-freundlich**: Solange Docker auf der Test-Maschine (z.B. GitHub Actions, Jenkins) verfügbar ist, funktionieren die Tests ohne zusätzliche Konfiguration.

In unserem Fall nutzen wir Testcontainers, um für jeden Testlauf einen PostgreSQL-Container zu starten, der die gleiche Datenbank-Engine verwendet wie in der Produktion.

## Abhängigkeiten `build.gradle.kts`

```kotlin
testImplementation("org.testcontainers:testcontainers")
testImplementation("org.testcontainers:postgresql")
```



## AbstractIntegrationTest

Erzeuge im Ordner `test/java/de/szut/store` das Package `testcontainers` und lege folgende Klassen an.

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("it")
@ContextConfiguration(initializers = PostgresContextInitializer.class)
public class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ArticleRepository articleRepository;

    @Autowired
    protected SupplierRepository supplierRepository;

    @BeforeEach
    void setUp() {
        articleRepository.deleteAll();
        supplierRepository.deleteAll();
    }
}
```
Dem Test wird per Dependency-Injection eine Instanz vom Typ `MockMvc` zur Verfügung gestellt. Mit dem Tool `MockMvc` stellt Spring eine sehr gute Möglichkeit bereit Spring Boot Applikationen zu testen. Es startet einen kompletten Mock des Spring -Web-MVC-Moduls, sprich: Es bildet URLs auf Controller ab, lädt Exception Handler und mehr. Die `setUp`-Methode wird dank der Annotation `@BeforeEach` vor jedem Test ausgeführt und bewirkt in diesem Fall, dass die Datenbank geleert wird.

### Test-Profileigenschaften

Lege `application-it.properties` an:

```properties
spring.datasource.url=set_by_test_containers
spring.datasource.username=set_by_test_containers
spring.datasource.password=set_by_test_containers
```

### PostgresContextInitializer

```java
public class PostgresContextInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:14"))
            .withDatabaseName("test_db")
            .withUsername("test-db-user")
            .withPassword("test-db-password")
            .withReuse(true);

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        postgres.start();
        TestPropertyValues.of(
                "spring.datasource.url=" + postgres.getJdbcUrl(),
                "spring.datasource.username=" + postgres.getUsername(),
                "spring.datasource.password=" + postgres.getPassword()
        ).applyTo(context.getEnvironment());
    }
}
```

## Beispieltests

### PostSupplierIT

```java
public class PostSupplierIT extends AbstractIntegrationTest {
    @Test
    @Transactional
    void postSupplier() throws Exception {
        String content = "{\n" +
                "  \"name\": \"Meier\",\n" +
                "  \"street\": \"Benquestraße 50\",\n" +
                "  \"postcode\": \"28209\",\n" +
                "  \"city\": \"Bremen\",\n" +
                "  \"phone\": \"01637122020\"\n" +
                "}";

        final var contentAsString = this.mockMvc.perform(post("/store/supplier").content(content).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("name", is("Meier")))
                .andExpect(jsonPath("street", is("Benquestraße 50")))
                .andExpect(jsonPath("city", is("Bremen")))
                .andExpect(jsonPath("postcode", is("28209")))
                .andExpect(jsonPath("phone", is("01637122020")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        final var id = Long.parseLong(new JSONObject(contentAsString).get("sid").toString());

        final var loadedEntity = supplierRepository.findById(id);
        assertThat(loadedEntity.get().getName()).isEqualTo("Meier");
        assertThat(loadedEntity.get().getContact().getStreet()).isEqualTo("Benquestraße 50");
        assertThat(loadedEntity.get().getContact().getPostcode()).isEqualTo("28209");
        assertThat(loadedEntity.get().getContact().getCity()).isEqualTo("Bremen");
        assertThat(loadedEntity.get().getContact().getPhone()).isEqualTo("01637122020");
    }
}
```

### Erklärung des Tests

**Struktur:**
- Die Test-Klasse erweitert `AbstractIntegrationTest` und erbt damit die Test-Infrastruktur (MockMvc, Repositories, setUp-Methode)
- Die Test-Methode ist mit `@Test` annotiert, damit JUnit sie als Test erkennt

**Test-Ablauf in zwei Phasen:**

#### Phase 1: HTTP-Request testen


Erzeuge den JSON-Request-Body als String:
```java
String content = "{\n" +
                "  \"name\": \"Meier\",\n" +
                ...
                "}";
````
Der JSON-String enthält die Daten für den neuen Lieferanten. Die Struktur der JSON-Daten muss dem `AddSupplierDTO` entsprechen!

```java
this.mockMvc.perform(post("/store/supplier")
        .content(content)
        .contentType(MediaType.APPLICATION_JSON))
    .andExpect(status().isCreated())
    .andExpect(jsonPath("name", is("Meier")))
    // ... weitere Assertions
```

Mit `mockMvc.perform()` wird ein **simulierter HTTP-Request** an den Controller gesendet. Anschließend können wir die komplette Response prüfen:
- **Status-Code**: `status().isCreated()` erwartet HTTP 201
- **Response-Body**: `jsonPath()` prüft einzelne JSON-Felder mit JSONPath-Syntax
- **Header**: Könnte mit `andExpect(header().exists("Location"))` geprüft werden

#### Phase 2: Datenbank-Persistierung verifizieren
```java
final var id = Long.parseLong(new JSONObject(contentAsString).get("sid").toString());
final var loadedEntity = supplierRepository.findById(id);
assertThat(loadedEntity.get().getName()).isEqualTo("Meier");
```

Nachdem wir die HTTP-Response geprüft haben:
1. **ID extrahieren**: Aus der JSON-Response wird die generierte `sid` ausgelesen
2. **Entity laden**: Mit dieser ID wird direkt aus der Datenbank gelesen
3. **Persistierung prüfen**: Mit AssertJ (`assertThat`) wird verifiziert, dass die Daten korrekt gespeichert wurden

**Warum beide Phasen?**  
Ein vollständiger Integrationstest prüft nicht nur die HTTP-Schnittstelle, sondern auch die tatsächliche Datenpersistierung. So stellen wir sicher, dass der gesamte Stack (Controller → Service → Repository → Datenbank) funktioniert.

> **Wichtig: `@Transactional` auf der Test-Methode**  
> Diese Annotation ist notwendig, weil `ContactEntity` im Supplier via **Lazy-Loading** (`FetchType.LAZY`) nachgeladen wird. Lazy-Loading funktioniert nur innerhalb einer aktiven Datenbanktransaktion. Ohne `@Transactional` würde beim Zugriff auf `loadedEntity.get().getContact()` eine `LazyInitializationException` geworfen.

### Test ausführen

**Voraussetzung:** Docker-Daemon muss laufen (Testcontainers benötigt Docker zum Starten des PostgreSQL-Containers).

Führe den Test aus über:
- **IntelliJ**: Rechtsklick auf Test-Klasse → "Run"
- **Terminal**: `./gradlew test` oder `./gradlew test --tests PostSupplierIT`

Beim ersten Durchlauf lädt Testcontainers das PostgreSQL-Image herunter (kann einige Minuten dauern). 


### SupplierFindAllIT
Hier ein weiterer Beispieltest für den Endpunkt „**alle Lieferanten holen**“:

```java
public class SupplierFindAllIT extends AbstractIntegrationTest {
    @Test
    void findAll() throws Exception {
        var supplier1 = new SupplierEntity();
        supplier1.setName("Meier");
        var contact1 = new ContactEntity();
        contact1.setStreet("Hauptstraße");
        contact1.setPostcode("12345");
        contact1.setCity("Bremen");
        contact1.setPhone("+4912345");
        supplier1.setContact(contact1);
        this.supplierRepository.save(supplier1);

        this.mockMvc.perform(get("/store/supplier"))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Meier")))
                .andExpect(jsonPath("$[0].street", is("Hauptstraße")))
                .andExpect(jsonPath("$[0].postcode", is("12345")))
                .andExpect(jsonPath("$[0].city", is("Bremen")))
                .andExpect(jsonPath("$[0].phone", is("+4912345")));
    }
}
```

## Aufgabe
Ergänze einen Integrationstest für „**get by id**“.
