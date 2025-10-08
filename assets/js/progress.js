(function () {
    const STORAGE_KEY = 'lf8-progress-v1';

    // Material lädt Seiten "instant": document$ triggert nach jedem Seitenwechsel
    document.addEventListener('DOMContentLoaded', init);
    if (window.document$) document$.subscribe(init);

    function init() {
        const state = loadState();
        const key = pageKey();
        state[key] = state[key] || {};

        // Alle Task-Checkboxen im Artikel
        const boxes = document.querySelectorAll('article input[type="checkbox"]');

        boxes.forEach((box, idx) => {
            // 1) Klickbar machen (Material setzt disabled)
            if (box.hasAttribute('disabled')) {
                box.removeAttribute('disabled');
            }

            // 2) stabile ID pro Checkbox
            if (!box.dataset.trackId) {
                const heading = document.querySelector('article h1, article h2, article h3');
                const htext = heading ? heading.textContent.trim() : 'page';
                box.dataset.trackId = `${htext}#${idx}`;
            }
            const id = box.dataset.trackId;

            // 3) gespeicherten Zustand anwenden
            if (state[key][id] !== undefined) {
                box.checked = !!state[key][id];
            }

            // 4) Änderungen speichern
            box.addEventListener('change', () => {
                state[key][id] = box.checked;
                saveState(state);
                updateCounters();
            });
        });

        updateCounters();
    }

    function pageKey() {
        return location.pathname.replace(/\/+$/, '');
    }
    function loadState() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch { return {}; }
    }
    function saveState(s) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }

    // Optional: Zähler in #t-total / #t-done befüllen, falls vorhanden
    function updateCounters() {
        const boxes = Array.from(document.querySelectorAll('article input[type="checkbox"]'));
        const total = boxes.length;
        const done = boxes.filter(b => b.checked).length;
        const tTotal = document.getElementById('t-total');
        const tDone = document.getElementById('t-done');
        if (tTotal) tTotal.textContent = String(total);
        if (tDone) tDone.textContent = String(done);
    }
})();