(() => {
    'use strict';
    class ImageDraft {
        constructor(items) {
            this.items = items;
            this.deleted = [];
            this.normalize();
        }
        normalize() {
            const selected = this.items.find(item => item.representative) || this.items[0];
            this.items.forEach(item => { item.representative = item === selected; });
        }
        add(files) {
            if (this.items.filter(item => item.file).length + files.length > 10)
                throw new Error('한 번에 최대 10장까지 등록할 수 있습니다.');
            files.forEach(file => {
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                    throw new Error('JPEG, PNG, WebP 이미지만 등록할 수 있습니다.');
                if (!file.size || file.size > 10 * 1024 * 1024)
                    throw new Error('빈 파일은 등록할 수 없으며 파일당 최대 10MB입니다.');
            });
            files.forEach(file => this.items.push({file, representative: false}));
            this.normalize();
        }
        remove(item) {
            if (item.key) this.deleted.push(item.key);
            this.items.splice(this.items.indexOf(item), 1);
            this.normalize();
        }
        select(item) {
            this.items.forEach(candidate => { candidate.representative = candidate === item; });
        }
        move(item, direction) {
            const from = this.items.indexOf(item), to = from + direction;
            if (to < 0 || to >= this.items.length) return;
            [this.items[from], this.items[to]] = [this.items[to], this.items[from]];
        }
        payload() {
            const files = [];
            let representative = '';
            const order = this.items.map(item => {
                const key = item.file ? `n:${files.push(item.file) - 1}` : item.key;
                if (item.representative) representative = key;
                return key;
            });
            return {files, imageOrder: order.join(','), imageDeleted: this.deleted.join(','), imageRepresentative: representative};
        }
    }
    if (typeof module !== 'undefined') module.exports = ImageDraft;
    if (typeof document === 'undefined') return;
    const form = document.getElementById('place-form');
    const grid = document.querySelector('[data-image-editor]');
    if (!form || !grid || grid.dataset.unavailable === 'true') return;
    const input = document.getElementById('image-files');
    // Keep File objects in memory. formdata replaces only file parts at the final native submit.
    // No FileList assignment or asynchronous request is needed.
    if (typeof FormDataEvent === 'undefined') return;
    const draft = new ImageDraft(Array.from(grid.children, node => ({
        key: node.dataset.key, representative: node.dataset.representative === 'true', node
    })));
    const empty = document.querySelector('[data-image-empty]');
    const error = document.createElement('p');
    error.className = 'error-message'; error.setAttribute('role', 'alert');
    input.after(error);
    const render = () => {
        grid.replaceChildren();
        empty.hidden = draft.items.length !== 0;
        draft.items.forEach((item, index) => {
            if (!item.node) {
                item.node = document.createElement('article'); item.node.className = 'image-item';
                const preview = document.createElement('img'); preview.className = 'image-preview';
                item.url = URL.createObjectURL(item.file); preview.src = item.url; preview.alt = item.file.name;
                const name = document.createElement('p'); name.className = 'image-name'; name.textContent = `${item.file.name} (새 이미지)`;
                item.node.append(preview, name);
            }
            item.node.querySelector('.image-meta')?.remove();
            item.node.querySelector('.image-actions')?.remove();
            const meta = document.createElement('p'); meta.className = 'image-meta';
            meta.textContent = `순서 ${index + 1} `;
            if (item.representative) {
                const badge = document.createElement('strong'); badge.className = 'image-representative'; badge.textContent = '대표'; meta.append(badge);
            }
            const actions = document.createElement('div'); actions.className = 'image-actions';
            const button = (label, action, disabled = false) => {
                const node = document.createElement('button'); node.type = 'button'; node.className = 'secondary-link-button';
                node.textContent = label; node.disabled = disabled;
                node.addEventListener('click', () => { action(); render(); }); actions.append(node);
            };
            button('대표 이미지로 설정', () => draft.select(item), item.representative);
            button('위로 이동', () => draft.move(item, -1), index === 0);
            button('아래로 이동', () => draft.move(item, 1), index === draft.items.length - 1);
            button('삭제', () => { draft.remove(item); if (item.url) URL.revokeObjectURL(item.url); });
            item.node.append(meta, actions); grid.append(item.node);
        });
    };
    input.addEventListener('change', () => {
        error.textContent = '';
        try { draft.add(Array.from(input.files)); render(); }
        catch (exception) { error.textContent = exception.message; }
        input.value = '';
    });
    form.addEventListener('formdata', event => {
        const payload = draft.payload();
        event.formData.delete('files');
        payload.files.forEach(file => event.formData.append('files', file, file.name));
        ['imageOrder', 'imageDeleted', 'imageRepresentative'].forEach(key => event.formData.set(key, payload[key]));
    });
    render();
})();
