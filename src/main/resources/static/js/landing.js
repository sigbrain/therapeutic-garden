(() => {
    'use strict';

    const page = document.querySelector('.landing-page');
    if (!page) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const personalChangeMetrics = {
        stress: {
            label: '스트레스',
            before: 72,
            after: 51,
            changeLabel: '29.2% 감소',
            linePath: 'M32 32 C96 38 116 52 170 57 S252 75 307 79 S390 101 448 108',
            areaPath: 'M32 32 C96 38 116 52 170 57 S252 75 307 79 S390 101 448 108 L448 132 L32 132Z',
            series: [
                { label: 'Baseline', x: 32, y: 32, value: 72 },
                { label: 'HS1', x: 170, y: 57, value: 65 },
                { label: 'HS2', x: 307, y: 79, value: 58 },
                { label: 'HS3', x: 448, y: 108, value: 51 }
            ]
        },
        emotional: {
            label: '정서적 안정성',
            before: 18,
            after: 30,
            changeLabel: '66.7% 증가',
            linePath: 'M32 116 C95 108 117 94 170 88 S251 66 307 61 S390 43 448 35',
            areaPath: 'M32 116 C95 108 117 94 170 88 S251 66 307 61 S390 43 448 35 L448 132 L32 132Z',
            series: [
                { label: 'Baseline', x: 32, y: 116, value: 18 },
                { label: 'HS1', x: 170, y: 88, value: 22 },
                { label: 'HS2', x: 307, y: 61, value: 27 },
                { label: 'HS3', x: 448, y: 35, value: 30 }
            ]
        }
    };

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
        stress.textContent = `${activeSpot.stress}% 감소`;
        stress.dataset.value = activeSpot.stress;
        emotional.textContent = `${activeSpot.emotional}% 증가`;
        emotional.dataset.value = activeSpot.emotional;
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
        const card = chart.closest('.landing-person-effect');
        const guide = chart.querySelector('.landing-chart-active-guide');
        const line = chart.querySelector('.landing-chart-line');
        const area = chart.querySelector('.landing-chart-area');
        const points = Array.from(chart.querySelectorAll('.landing-chart-points circle'));
        const metricButtons = Array.from(chart.querySelectorAll('[data-personal-metric]'));
        const stageButtons = Array.from(chart.querySelectorAll('[data-chart-stage]'));
        const current = chart.querySelector('.landing-chart-current');
        const currentLabel = chart.querySelector('[data-chart-current-label]');
        const currentMetricLabel = chart.querySelector('[data-chart-current-metric-label]');
        const currentValue = chart.querySelector('[data-chart-current-value]');
        const metricKeys = Object.keys(personalChangeMetrics);
        let activeMetricKey = 'stress';
        let activeIndex = 0;
        let timelineTimer;
        let timelineStartTimer;
        let metricSwitchTimer;
        let observer;

        const showTimelineStep = (index) => {
            const metric = personalChangeMetrics[activeMetricKey];
            activeIndex = Math.max(0, Math.min(index, metric.series.length - 1));
            const stage = metric.series[activeIndex];
            guide.style.transform = `translateX(${stage.x - metric.series[0].x}px)`;
            points.forEach((point, pointIndex) => point.classList.toggle('is-timeline-active', pointIndex === activeIndex));
            stageButtons.forEach((button, buttonIndex) => {
                const active = buttonIndex === activeIndex;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            current.classList.add('is-updating');
            window.setTimeout(() => {
                currentLabel.textContent = stage.label;
                currentValue.textContent = stage.value;
                current.classList.remove('is-updating');
            }, motion.matches ? 0 : 120);
        };

        const applyMetric = (metricKey, stageIndex = 0, animate = false) => {
            if (!personalChangeMetrics[metricKey]) return;
            window.clearTimeout(metricSwitchTimer);
            activeMetricKey = metricKey;
            const metric = personalChangeMetrics[metricKey];
            chart.dataset.activeMetric = metricKey;
            metricButtons.forEach((button) => {
                const active = button.dataset.personalMetric === metricKey;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });

            const updateMetricGeometry = () => {
                line.setAttribute('d', metric.linePath);
                area.setAttribute('d', metric.areaPath);
                points.forEach((point, index) => point.setAttribute('cy', metric.series[index].y));
                currentMetricLabel.textContent = metric.label;
                showTimelineStep(stageIndex);
            };

            if (animate && !motion.matches) {
                chart.classList.add('is-switching');
                updateMetricGeometry();
                metricSwitchTimer = window.setTimeout(() => {
                    chart.classList.remove('is-switching');
                }, 360);
            } else {
                chart.classList.remove('is-switching');
                updateMetricGeometry();
            }
        };

        const scheduleTimeline = (delay) => {
            window.clearTimeout(timelineTimer);
            if (motion.matches) return;
            const metric = personalChangeMetrics[activeMetricKey];
            const nextDelay = delay ?? (activeIndex === metric.series.length - 1 ? 2200 : 1500);
            timelineTimer = window.setTimeout(() => {
                if (activeIndex < metric.series.length - 1) {
                    showTimelineStep(activeIndex + 1);
                } else {
                    const nextMetricIndex = (metricKeys.indexOf(activeMetricKey) + 1) % metricKeys.length;
                    applyMetric(metricKeys[nextMetricIndex], 0, true);
                }
                scheduleTimeline();
            }, nextDelay);
        };

        const startTimeline = () => {
            chart.classList.add('is-timeline-started');
            applyMetric(activeMetricKey, activeIndex);
            scheduleTimeline();
        };

        const show = () => {
            chart.classList.add('is-chart-visible');
            card.classList.add('is-person-visible');
        };

        metricButtons.forEach((button) => {
            button.addEventListener('click', () => {
                applyMetric(button.dataset.personalMetric, 0, true);
                scheduleTimeline(5500);
            });
        });
        stageButtons.forEach((button) => {
            button.addEventListener('click', () => {
                showTimelineStep(Number(button.dataset.chartStage));
                scheduleTimeline(5500);
            });
        });

        applyMetric('stress', 0);

        if (motion.matches) {
            show();
            chart.classList.add('is-timeline-started');
        } else {
            document.documentElement.classList.add('landing-motion-enabled');
            if (!('IntersectionObserver' in window)) {
                show();
                timelineStartTimer = window.setTimeout(startTimeline, 1700);
            } else {
                observer = new IntersectionObserver((entries) => {
                    if (entries.some((entry) => entry.isIntersecting)) {
                        show();
                        timelineStartTimer = window.setTimeout(startTimeline, 1700);
                        observer.disconnect();
                    }
                }, { threshold: .32 });
                observer.observe(chart);
            }
        }

        if (motion.addEventListener) {
            motion.addEventListener('change', (event) => {
                window.clearTimeout(timelineTimer);
                window.clearTimeout(timelineStartTimer);
                window.clearTimeout(metricSwitchTimer);
                if (event.matches) {
                    document.documentElement.classList.remove('landing-motion-enabled');
                    show();
                    chart.classList.add('is-timeline-started');
                    applyMetric('stress', 0);
                    if (observer) observer.disconnect();
                } else if (chart.classList.contains('is-chart-visible')) {
                    document.documentElement.classList.add('landing-motion-enabled');
                    startTimeline();
                }
            });
        }
    }

    initializeRevealAnimations();
    initializeHealingSpotCarousels();
    initializePersonalChangeAnimation();
})();
