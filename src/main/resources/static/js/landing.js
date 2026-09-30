(() => {
    'use strict';

    const page = document.querySelector('.landing-page');
    if (!page) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function initializeRevealAnimations() {
        const elements = page.querySelectorAll('[data-reveal]');
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
            document.documentElement.classList.add('landing-reveal-enabled');
            if (motion.addEventListener) {
                motion.addEventListener('change', (event) => {
                    if (event.matches) showAll();
                });
            }
            page.addEventListener('focusin', (event) => {
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
    }

    function changeHealingSpot(course, spotIndex) {
        const spots = course.healingEffectSpots || [];
        if (!spots.length) return;
        const nextIndex = ((spotIndex % spots.length) + spots.length) % spots.length;
        const activeSpot = spots[nextIndex];

        spots.forEach((spot, index) => {
            const active = index === nextIndex;
            spot.button.classList.toggle('is-active', active);
            spot.button.setAttribute('aria-pressed', String(active));
            spot.image.classList.toggle('is-active', active);
            spot.image.setAttribute('aria-hidden', String(!active));
        });

        const stress = course.querySelector('[data-field="stress-reduction"]');
        const emotional = course.querySelector('[data-field="emotional-increase"]');
        stress.textContent = activeSpot.stress || '데이터 준비 중';
        stress.dataset.value = activeSpot.stress || '';
        emotional.textContent = activeSpot.emotional || '데이터 준비 중';
        emotional.dataset.value = activeSpot.emotional || '';
        course.activeSpotIndex = nextIndex;
    }

    function initializeHealingSpotCarousels() {
        const courses = Array.from(page.querySelectorAll('.landing-course-summary'));
        const rotationDelay = 4600;

        courses.forEach((course, courseIndex) => {
            const buttons = Array.from(course.querySelectorAll('.landing-course-spots button'));
            course.healingEffectSpots = buttons.map((button) => ({
                code: button.dataset.code,
                name: button.dataset.name,
                image: course.querySelector(`[data-spot-image="${button.dataset.code}"]`),
                stress: button.dataset.stress,
                emotional: button.dataset.emotional,
                button
            })).filter((spot) => spot.image);
            course.activeSpotIndex = 0;

            const scheduleNext = (delay = rotationDelay) => {
                window.clearTimeout(course.healingEffectTimer);
                if (motion.matches || course.healingEffectSpots.length < 2) return;
                course.healingEffectTimer = window.setTimeout(() => {
                    changeHealingSpot(course, course.activeSpotIndex + 1);
                    scheduleNext();
                }, delay);
            };

            course.healingEffectSpots.forEach((spot, index) => {
                spot.button.addEventListener('click', () => {
                    changeHealingSpot(course, index);
                    scheduleNext();
                });
            });

            changeHealingSpot(course, 0);
            scheduleNext(rotationDelay + (courseIndex * 750));
            course.scheduleNextHealingSpot = scheduleNext;
        });

        if (motion.addEventListener) {
            motion.addEventListener('change', () => {
                courses.forEach((course, index) => {
                    window.clearTimeout(course.healingEffectTimer);
                    if (!motion.matches) course.scheduleNextHealingSpot(rotationDelay + (index * 750));
                });
            });
        }
    }

    function initializePersonalChangeAnimation() {
        const chart = page.querySelector('[data-personal-change-chart]');
        if (!chart) return;
        const spots = Array.from(chart.querySelectorAll('[data-personal-spot]'));
        if (!spots.length) return;
        const metrics = Array.from(chart.querySelectorAll('[data-personal-metric]'));
        const labels = {
            stress: { title: '평균 스트레스 증감률' },
            emotional: { title: '평균 정서적 안정성 증감률' }
        };
        let activeMetric = 'stress';
        let activeIndex = 0;
        let timer;

        const render = () => {
            chart.dataset.activeMetric = activeMetric;
            const values = spots.map(spot => Number(spot.dataset[activeMetric]));
            const max = Math.max(...values.map(Math.abs), 1);
            metrics.forEach(button => {
                const active = button.dataset.personalMetric === activeMetric;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            spots.forEach((spot, index) => {
                const active = index === activeIndex;
                spot.classList.toggle('is-active', active);
                spot.setAttribute('aria-pressed', String(active));
                const display = spot.dataset[`${activeMetric}Display`];
                spot.querySelector('[data-comparison-value]').textContent = display;
                spot.setAttribute('aria-label', `${spot.dataset.personalSpot} · ${spot.dataset.name}, ${labels[activeMetric].title} ${display}`);
                const bar = spot.querySelector('.landing-comparison-track i');
                bar.style.height = `${Math.abs(values[index]) / max * 50}%`;
                bar.style.top = values[index] < 0 ? '50%' : 'auto';
                bar.style.bottom = values[index] < 0 ? 'auto' : '50%';
            });
            const spot = spots[activeIndex];
            chart.querySelector('[data-current-spot]').textContent = `${spot.dataset.personalSpot} · ${spot.dataset.name}`;
            chart.querySelector('[data-current-metric]').textContent = labels[activeMetric].title;
            chart.querySelector('[data-current-rate]').textContent = spot.dataset[`${activeMetric}Display`];
        };
        const scheduleNext = (delay = 6500) => {
            window.clearTimeout(timer);
            if (motion.matches || document.hidden) return;
            timer = window.setTimeout(() => {
                activeIndex = (activeIndex + 1) % spots.length;
                render();
                scheduleNext();
            }, delay);
        };
        spots.forEach((spot, index) => spot.addEventListener('click', () => {
            activeIndex = index;
            render();
            scheduleNext(8500);
        }));
        metrics.forEach(button => button.addEventListener('click', () => {
            activeMetric = button.dataset.personalMetric;
            render();
            scheduleNext(8500);
        }));
        if (motion.addEventListener) motion.addEventListener('change', () => scheduleNext());
        document.addEventListener('visibilitychange', () => scheduleNext());
        render();
        scheduleNext();
    }

    initializeRevealAnimations();
    initializeHealingSpotCarousels();
    initializePersonalChangeAnimation();
})();
