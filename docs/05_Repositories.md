
# Implementierung der Repositories

Implementiere die Datenzugriffsschicht, indem du für `ArticleEntity` und `SupplierEntity` im jeweiligen Modul‑Package ein **Repository** implementierst. (Warum kein `ContactRepository` benötigt wird, wird später diskutiert.)

> Hinweis: Du musst nur jeweils ein **Interface** anlegen, das `JpaRepository` erweitert.

**Beispiel:**

```java
public interface SupplierRepository extends JpaRepository<SupplierEntity, Long> { }
```

```java
public interface ArticleRepository extends JpaRepository<ArticleEntity, Long> { }
```

## Was bewirkt das Erweitern von JpaRepository?

Durch das Erweitern von `JpaRepository<SupplierEntity, Long>` erhält das Repository automatisch eine Vielzahl von CRUD-Operationen (Create, Read, Update, Delete), **ohne dass du diese Methoden selbst implementieren musst**:

- **`save(entity)`** – Speichert oder aktualisiert eine Entity
- **`findById(id)`** – Findet eine Entity anhand ihrer ID
- **`findAll()`** – Gibt alle Entities zurück
- **`deleteById(id)`** – Löscht eine Entity anhand ihrer ID
- **`count()`** – Zählt die Anzahl der Entities
- **`existsById(id)`** – Prüft, ob eine Entity mit der ID existiert
- und viele weitere...

Die generischen Typparameter `<SupplierEntity, Long>` geben an:
1. **`SupplierEntity`**: Die Entity-Klasse, die verwaltet wird
2. **`Long`**: Der Datentyp des Primärschlüssels (@Id-Feld)

Spring Data JPA generiert zur Laufzeit automatisch eine Implementierung dieses Interfaces, die alle SQL-Queries für diese Standard-Operationen erzeugt und ausführt. Das Repository kann dann einfach per Dependency Injection in Services oder Controller verwendet werden.
