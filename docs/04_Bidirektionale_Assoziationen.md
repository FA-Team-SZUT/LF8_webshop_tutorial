
# Bidirektionale Assoziationen & Lazy/Eager Loading
> **Fortschritt:** <!-- wird live gezählt -->
> - Gesamt: <span id="t-total">0</span>
> - Erledigt: <span id="t-done">0</span>

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

- [ ] Füge die Mappings in die beiden Entity-Klassen ein. Fahre die Applikation danach hoch und überprüfe in einem DB-Tool, dass die Spalte `contact_id` in der Tabelle `supplier` existiert.

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

### Eigentümer der Beziehung: mappedBy

`mappedBy = "supplier"` definiert, dass `ArticleEntity` der **Eigentümer** (Owner) der Beziehung ist. Bei bidirektionalen Beziehungen muss immer eine Seite als Eigentümer festgelegt werden:

- **Eigentümer-Seite** (`ArticleEntity` mit `@ManyToOne`): Verwaltet den Foreign Key in der Datenbank
- **Nicht-Eigentümer-Seite** (`SupplierEntity` mit `@OneToMany` und `mappedBy`): Referenziert nur, schreibt aber nicht in die DB

**Wichtig:** Bei 1:n-Beziehungen sollte **immer die n-Seite** (hier: `ArticleEntity`) der Eigentümer sein, aus folgenden Gründen:

1. **Performance**: Hibernate kann den Foreign Key direkt in der `article`-Tabelle speichern (eine INSERT-Operation)
2. **Vermeidung von Join-Tabellen**: Ohne `mappedBy` würde Hibernate eine unnötige Zwischentabelle `supplier_articles` erstellen
3. **Natürliche Struktur**: In der relationalen Datenbank hat die n-Seite ohnehin den Foreign Key

**Technisch:** `mappedBy = "supplier"` verweist auf das Attribut `supplier` in der `ArticleEntity`-Klasse, das den Foreign Key verwaltet.

- [ ] Füge die Mappings in die beiden Entity-Klassen ein.

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
