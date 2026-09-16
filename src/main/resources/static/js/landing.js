(() => {
    'use strict';

    const elements = document.querySelectorAll('.landing-page [data-reveal]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!elements.length || motion.matches || !('IntersectionObserver' in window)) return;

    let observer;
    const showAll = () => {
        document.documentElement.classList.remove('landing-reveal-enabled');
        if (observer) observer.disconnect();
    };

    try {
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

        elements.forEach((element) => observer.observe(element));
        // Hide only after successful setup. No JS / unsupported browsers stay readable.
        document.documentElement.classList.add('landing-reveal-enabled');
        if (motion.addEventListener) {
            motion.addEventListener('change', (event) => {
                if (event.matches) showAll();
            });
        }
        // Keyboard navigation must never move focus into invisible CTA content.
        document.querySelector('.landing-page').addEventListener('focusin', (event) => {
            let element = event.target.closest('[data-reveal]');
            while (element) {
                element.classList.add('is-visible');
                observer.unobserve(element);
                element = element.parentElement.closest('[data-reveal]');
            }
        });
    } catch (_) {
        showAll();
    }
})();
