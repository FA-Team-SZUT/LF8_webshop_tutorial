
# ArticleController – Endpunkte und Umsetzung

## Warum separate Article-Endpunkte?

Nachdem wir den `SupplierController` implementiert haben, kümmern wir uns nun um die **Artikel-Verwaltung**. Artikel sind zwar mit Lieferanten verknüpft, benötigen aber eigene Endpunkte, um:

- **Alle Artikel unabhängig vom Lieferanten** abzurufen
- **Einzelne Artikel** gezielt zu suchen (nach ID oder Bezeichnung)
- **Neue Artikel** einem bestimmten Lieferanten zuzuordnen

## DTO-Design: Weniger ist mehr

Bei den Attributen der `ArticleEntity` sind `lastUpdateDate` und `createDate` für API-Clients meist **irrelevant**:

- Diese Felder sind reine **Metadaten** für interne Zwecke (Auditing, Debugging)
- Sie erhöhen nur die Response-Größe
- Clients interessiert meist nur: **Was** ist der Artikel, **was kostet** er, **wer** liefert ihn

**Lösung:** Über DTOs geben wir nur die wirklich benötigten Felder heraus: `id`, `designation`, `price`.

---

## Endpunkte (Vorgabe)

| Art | Pfad | Ziel |
|---|---|---|
| GET | `/store/article` | liefert alle Artikel jeweils mit den Daten `id`, `designation`, `price` |
| GET | `/store/article/{id}` | liefert einen Artikel anhand seiner Id (`id`, `designation`, `price`) |
| GET | `/store/article{designation}` | liefert einen Artikel anhand seiner Beschreibung (`id`, `designation`, `price`) |
| POST | `/store/article/{id}` | legt einen neuen Artikel für den Lieferanten mit der gewünschten Id an; übergeben werden `designation` und `price` in einem DTO, zurückgegeben werden `id`, `designation`, `price` |

> Implementiere die Endpunkte gemäß der zuvor erläuterten Architektur. Formuliere Requests/Integrationstests.
