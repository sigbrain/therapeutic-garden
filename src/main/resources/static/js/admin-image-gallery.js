(() => {
    'use strict';
    document.querySelectorAll('[data-image-gallery]').forEach(gallery => {
        const main = gallery.querySelector('[data-gallery-main]');
        if (!main) return;
        const badge = gallery.querySelector('[data-gallery-badge]');
        const caption = gallery.querySelector('[data-gallery-caption]');
        const thumbnails = gallery.querySelectorAll('.image-thumbnail');
        thumbnails.forEach(button => {
            button.addEventListener('click', () => {
                main.src = button.dataset.imageUrl;
                main.alt = button.dataset.imageName;
                caption.textContent = button.dataset.imageName;
                badge.hidden = button.dataset.representative !== 'true';
                thumbnails.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            });
        });
    });
})();
