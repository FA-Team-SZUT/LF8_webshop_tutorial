
# Bidirektionale Assoziationen & Lazy/Eager Loading

Hibernate mapped die Beziehungen unseres Klassenmodells auf die Beziehungen einer relationalen Datenbank.

## 1:1 – SupplierEntity ↔ ContactEntity

Zwischen `SupplierEntity` und `ContactEntity` besteht eine **1:1‑Beziehung**. In relationalen DBs wird eine 1:1 so umgesetzt, dass der Primärschlüssel einer Tabelle als **Fremdschlüssel** in der anderen aufgenommen wird. Welche Tabelle den FK erhält, ist frei wählbar.

In unserem Datenmodell geben wir die 1:1‑Beziehung über `@OneToOne` an:

```java
public class SupplierEntity {
    …
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private ContactEntity contact;
}
```

```java
public class ContactEntity {
    …
    @OneToOne(mappedBy = "contact", fetch = FetchType.LAZY)
    private SupplierEntity supplier;
}
```

Da Hibernate wissen muss, in welcher Tabelle der Fremdschlüssel eingefügt werden soll, deklarieren wir über `mappedBy` den **Eigentümer** der Beziehung. Das Mapping bewirkt, dass Hibernate in der Tabelle `supplier` statt eines eingebetteten Objekts einen **Fremdschlüssel** einfügt (Default‑Benennung `contact_id`).

### Hinweis zu Cascading

`cascade = CascadeType.ALL` sorgt dafür, dass Speichern/Ändern/Löschen vom Supplier auf Contact kaskadiert wird. Das ist hier **sinnvoll**, da `ContactEntity`  nur als Teil eines Suppliers existieren soll und ohne ihn keine eigenständige Bedeutung hat.

**Wichtig**: Cascading sollte **nur auf der Eigentümer-Seite** (`SupplierEntity`) definiert werden, nicht auf der `mappedBy`-Seite. Die nicht-besitzende Seite (`ContactEntity`) sollte **kein Cascading** haben, um unerwünschte Effekte zu vermeiden.

## Lazy Loading vs. Eager Loading

- **Eager Loading**: Verbundene Objekte einer Beziehung werden **sofort** geladen.
- **Lazy Loading**: Verbundene Objekte werden **bei Bedarf** nachgeladen (beim ersten Zugriff).

Per Voreinstellung gilt **Lazy Loading**. Vorteile: Speicher & Performance (nur wirklich benötigte Objekte). Hibernate implementiert Lazy via **Proxy** (Stellvertreter‑Objekt mit gleicher Schnittstelle, das beim ersten Methodenaufruf das Ziel lädt).

## 1:n – SupplierEntity ↔ ArticleEntity

Zwischen `SupplierEntity` und `ArticleEntity` besteht eine **1:n‑Beziehung**. Ein Lieferant liefert 0..n Artikel; ein Artikel gehört hier genau zu **einem** Lieferanten.

In der relationalen Abbildung erhält die **n‑Seite** den FK. In Java genügt auf der n‑Seite:

```java
@Entity
public class ArticleEntity {
    …
    @ManyToOne(fetch = FetchType.LAZY)
    private SupplierEntity supplier;
}
```

Die obige Annotation würde eine **unidirektionale** Assoziation implementieren (nur Artikel kennt seinen Lieferanten). Wir wollen sie **bidirektional**: Supplier kennt seine Artikel.

Ergänze daher in `SupplierEntity`:

```java
@OneToMany(mappedBy = "supplier", fetch = FetchType.LAZY)
private Set<ArticleEntity> articles = new HashSet<>();
```

Wichtig ist `mappedBy = "supplier"`. In einer bidirektionalen Beziehung muss eine Seite der **Eigentümer** sein. **Aus Performance‑Gründen** wählt man fast immer die **@ManyToOne‑Seite** (hier: `ArticleEntity`) als Eigentümer.

### ⚠️ Warnung: Kein Cascading bei 1:n-Beziehungen!

**Warum hier KEIN `cascade = CascadeType.ALL`?**

Bei 1:n-Beziehungen ist `CascadeType.ALL` meist **problematisch**:

1. **Ungewolltes Löschen**: Wird ein `SupplierEntity` gelöscht, würden **automatisch alle zugehörigen Artikel gelöscht**. In der Praxis möchte man oft die Artikel behalten und einem anderen Lieferanten zuordnen oder separat verwalten.

2. **Ungewollte Nebeneffekte**: Beim Speichern/Aktualisieren eines Suppliers würden automatisch alle Artikel mit gespeichert/aktualisiert, auch wenn das nicht beabsichtigt ist.

3. **Fehlende Kontrolle**: Die Logik für das Verwalten von Artikeln sollte explizit über den `ArticleRepository` oder einen Service erfolgen.

**Best Practice für 1:n-Beziehungen:**
- **Keine Cascade-Operationen** (wie oben) ODER
- Nur spezifische Operationen wie `cascade = {CascadeType.PERSIST, CascadeType.MERGE}`, falls wirklich benötigt
- Artikel explizit über ihren eigenen Repository verwalten

**Faustregel**: Cascading nur bei **Komposition** (Teil-von-Beziehung), nicht bei **Assoziation** (eigenständige Entities).
