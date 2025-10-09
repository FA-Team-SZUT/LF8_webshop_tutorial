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
                updateNavigationProgress();
            });
        });

        updateCounters();
        updateNavigationProgress();
        loadAllProgress();
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

    // ========== Neue Funktionen für Navigation-Färbung ==========

    function updateNavigationProgress() {
        const boxes = document.querySelectorAll('article input[type="checkbox"]');
        if (boxes.length === 0) return;

        const checked = Array.from(boxes).filter(cb => cb.checked).length;
        const total = boxes.length;
        const progress = total > 0 ? (checked / total) * 100 : 0;

        const currentPath = pageKey();

        // Speichere Page-Progress
        savePageProgress(currentPath, checked, total);

        // Update Navigation für aktuelle Seite
        updateNavLinkForCurrentPage(currentPath, checked, total, progress);
    }

    function updateNavLinkForCurrentPage(pagePath, checked, total, progress) {
        const navLinks = document.querySelectorAll('.md-nav__link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && pagePath.includes(href.replace(/\.\.\//g, '').replace('.md', '').replace(/\//g, ''))) {
                // Entferne alte Klassen und Indicator
                link.classList.remove('completed', 'in-progress');
                const oldIndicator = link.querySelector('.progress-indicator');
                if (oldIndicator) {
                    oldIndicator.remove();
                }

                // Füge neuen Progress-Indicator hinzu
                const indicator = document.createElement('span');
                indicator.className = 'progress-indicator';

                if (progress === 100) {
                    indicator.innerHTML = ' ✓';
                    link.classList.add('completed');
                } else if (progress > 0) {
                    indicator.innerHTML = ` (${checked}/${total})`;
                    link.classList.add('in-progress');
                } else {
                    indicator.innerHTML = ` (0/${total})`;
                }

                link.appendChild(indicator);
            }
        });
    }

    function savePageProgress(path, checked, total) {
        const progress = JSON.parse(localStorage.getItem('tutorialProgress') || '{}');
        progress[path] = {
            checked,
            total,
            completed: checked === total,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem('tutorialProgress', JSON.stringify(progress));
    }

    function loadAllProgress() {
        const progress = JSON.parse(localStorage.getItem('tutorialProgress') || '{}');
        const navLinks = document.querySelectorAll('.md-nav__link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const pageName = href.replace(/\.\.\//g, '').replace('.md', '').replace(/\//g, '');

            Object.keys(progress).forEach(savedPath => {
                if (savedPath.includes(pageName) || pageName.includes(savedPath.replace(/\//g, ''))) {
                    const { checked, total, completed } = progress[savedPath];

                    const oldIndicator = link.querySelector('.progress-indicator');
                    if (oldIndicator) {
                        oldIndicator.remove();
                    }

                    link.classList.remove('completed', 'in-progress');

                    const indicator = document.createElement('span');
                    indicator.className = 'progress-indicator';

                    if (completed) {
                        indicator.innerHTML = ' ✓';
                        link.classList.add('completed');
                    } else if (checked > 0) {
                        indicator.innerHTML = ` (${checked}/${total})`;
                        link.classList.add('in-progress');
                    } else {
                        indicator.innerHTML = ` (0/${total})`;
                    }

                    link.appendChild(indicator);
                }
            });
        });
    }
})();