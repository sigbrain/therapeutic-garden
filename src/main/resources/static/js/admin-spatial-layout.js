(() => {
    'use strict';
    class SpatialDraft {
        constructor(items) {
            this.items = items.map(item => ({...item}));
            this.selected = null;
        }
        select(id) { this.selected = this.items.find(item => item.id === id) || null; }
        place(clientX, clientY, rect) {
            if (!this.selected || rect.width <= 0 || rect.height <= 0) return false;
            const x = (clientX - rect.left) / rect.width * 100;
            const y = (clientY - rect.top) / rect.height * 100;
            if (![x, y].every(Number.isFinite) || x < 0 || x > 100 || y < 0 || y > 100) return false;
            this.selected.x = Number(x.toFixed(4)); this.selected.y = Number(y.toFixed(4));
            return true;
        }
        clear(id) {
            const item = this.items.find(item => item.id === id);
            if (item) { item.x = null; item.y = null; }
        }
    }
    if (typeof module !== 'undefined') module.exports = SpatialDraft;
    if (typeof document === 'undefined') return;
    const form = document.getElementById('spatial-form');
    if (!form) return;
    const image = document.getElementById('spatial-image');
    const markers = document.getElementById('spatial-markers');
    const status = document.getElementById('spatial-status');
    const save = document.getElementById('spatial-save');
    const rows = Array.from(form.querySelectorAll('[data-spot]'));
    const draft = new SpatialDraft(rows.map(row => ({
        id: row.dataset.spotId, code: row.dataset.code, name: row.dataset.name, url: row.dataset.url,
        x: row.querySelector('[data-x]').value === '' ? null : Number(row.querySelector('[data-x]').value),
        y: row.querySelector('[data-y]').value === '' ? null : Number(row.querySelector('[data-y]').value)
    })));
    let dirty = false;
    const render = () => {
        markers.replaceChildren();
        draft.items.forEach((item, index) => {
            const row = rows[index], placed = item.x !== null && item.y !== null;
            row.querySelector('[data-x]').value = item.x ?? '';
            row.querySelector('[data-y]').value = item.y ?? '';
            row.querySelector('[data-select]').setAttribute('aria-pressed', String(item === draft.selected));
            row.querySelector('[data-clear]').disabled = !placed;
            row.querySelector('[data-position-status]').textContent = placed ? `지정됨 · ${item.x}% / ${item.y}%` : '미지정';
            row.querySelector('[data-position-status]').setAttribute('data-placed', String(placed));
            if (!placed) return;
            const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'spatial-marker';
            marker.style.left = `${item.x}%`; marker.style.top = `${item.y}%`;
            marker.setAttribute('aria-label', `${item.code} · ${item.name} 선택`);
            marker.setAttribute('aria-pressed', String(item === draft.selected));
            const circle = document.createElement('span'); circle.className = 'spatial-marker-circle'; circle.textContent = item.code;
            if (item.url) {
                const photo = document.createElement('img'); photo.src = item.url; photo.alt = ''; photo.referrerPolicy = 'no-referrer';
                photo.addEventListener('error', () => photo.remove()); circle.append(photo);
            }
            const label = document.createElement('span'); label.className = 'spatial-marker-label'; label.textContent = item.code;
            marker.append(circle, label);
            marker.addEventListener('click', () => { draft.select(item.id); render(); });
            markers.append(marker);
        });
        status.textContent = (draft.selected ? `${draft.selected.code} · ${draft.selected.name}: 이미지를 클릭하면 위치가 지정됩니다.` : 'HS를 선택해 주세요.')
            + (dirty ? ' 저장하지 않은 변경사항이 있습니다.' : '');
    };
    rows.forEach(row => {
        row.querySelector('[data-select]').addEventListener('click', () => { draft.select(row.dataset.spotId); render(); });
        row.querySelector('[data-clear]').addEventListener('click', () => { draft.clear(row.dataset.spotId); dirty = true; render(); });
    });
    image.addEventListener('click', event => {
        if (draft.place(event.clientX, event.clientY, image.getBoundingClientRect())) { dirty = true; render(); }
    });
    const ready = () => { save.disabled = !image.naturalWidth || rows.length === 0; };
    image.addEventListener('load', ready);
    image.addEventListener('error', () => { save.disabled = true; status.textContent = '모니터링 이미지를 불러오지 못했습니다. 화면을 다시 열어 주세요.'; });
    form.addEventListener('submit', event => {
        if (save.disabled) { event.preventDefault(); return; }
        dirty = false;
    });
    window.addEventListener('beforeunload', event => {
        if (dirty) { event.preventDefault(); event.returnValue = ''; }
    });
    render(); ready();
})();
