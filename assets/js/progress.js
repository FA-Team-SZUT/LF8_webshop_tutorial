(function () {
    const STORAGE_KEY = 'lf8-progress-v1';

    function loadState() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch { return {}; }
    }
    function saveState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function pageKey() {
        // pro Seite eigener Namespace
        return location.pathname.replace(/\/+$/, '');
    }

    function init() {
        const state = loadState();
        const key = pageKey();
        state[key] = state[key] || {};

        // alle Checkboxes im Artikel
        const boxes = document.querySelectorAll('article input[type="checkbox"]');
        boxes.forEach((box, idx) => {
            // stabile ID ableiten: Heading + Index
            if (!box.dataset.trackId) {
                const heading = box.closest('article').querySelector('h1,h2,h3,h4,h5,h6');
                const htext = heading ? heading.textContent.trim() : 'page';
                box.dataset.trackId = `${htext}#${idx}`;
            }
            const id = box.dataset.trackId;

            // gespeicherten Zustand anwenden
            if (state[key][id] !== undefined) {
                box.checked = !!state[key][id];
            }

            // Änderungen speichern
            box.addEventListener('change', () => {
                state[key][id] = box.checked;
                saveState(state);
            });
        });

        // Optional: Reset-Button einfügen
        addResetButton(() => {
            delete state[key];
            saveState(state);
            boxes.forEach(b => (b.checked = false));
        });
    }

    function addResetButton(onClick) {
        const header = document.querySelector('.md-content__inner > :first-child');
        if (!header) return;
        const btn = document.createElement('button');
        btn.textContent = 'Fortschritt zurücksetzen';
        btn.style.margin = '0.5rem 0 1rem';
        btn.className = 'md-button';
        btn.addEventListener('click', onClick);
        header.insertAdjacentElement('afterend', btn);
    }

    // neu initialisieren, wenn Material Seiten “instant” lädt
    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') init();
    });
    document.addEventListener('swup:contentReplaced', init);
})();