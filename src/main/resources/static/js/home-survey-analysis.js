/* TEMP / DEMO survey data: 실제 설문 API/DB로 교체 예정.
 * 지도 geometry와 무관한 계산/표시 모듈. 모든 화면은 원점수를 표시한다. */
window.HomeSurvey = (() => {
    'use strict';
    const participants = Array.from({length: 11}, (_, i) => `P${String(i + 1).padStart(3, '0')}`);
    const rounds = [1, 2, 3, 4, 5];
    const metrics = {
        stress: {name: 'VAS 스트레스 척도', max: 10, spatial: true, higher: false},
        relaxation: {name: 'VAS 마음 이완 척도', max: 10, spatial: true, higher: true},
        isi: {name: 'ISI', max: 28, spatial: false, higher: false},
        pss: {name: 'PSS', max: 40, spatial: false, higher: false}
    };
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const mean = values => {
        const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v));
        return valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;
    };
    const subjects = participant => participant === 'all' ? participants : participants.filter(p => p === participant);
    function hash(key) {
        let h = 2166136261;
        for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        // 비슷한 Spot 코드에도 충분히 다른 seed를 주는 final mixing.
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }
    function measurement(metric, participant, round, site, spot) {
        const m = metrics[metric];
        if (!m || !participants.includes(participant) || !rounds.includes(round) || (m.spatial && !spot)) return null;
        // 주간 설문 key에는 Site/HC/HS를 넣지 않는다.
        const key = m.spatial ? `${metric}|${site}|${spot.code ?? spot.spotId}` : metric;
        const base = m.spatial ? 0.15 + hash(key) * 0.65 : 0.45;
        const personal = (hash(`${metric}|${participant}`) - 0.5) * 0.32;
        const slope = (hash(`${key}|${participant}|slope`) - 0.5) * 0.055;
        const noise = (hash(`${key}|${participant}|${round}`) - 0.5) * 0.16;
        const raw = clamp((base + personal + slope * (round - 3) + noise) * m.max, 0, m.max);
        return m.spatial ? Math.round(raw * 10) / 10 : Math.round(raw);
    }
    function spotMean(metric, participant, site, spot, selectedRounds = rounds) {
        if (!metrics[metric].spatial) return null;
        return mean(subjects(participant).flatMap(p => selectedRounds.map(r => measurement(metric, p, r, site, spot))));
    }
    const courseSpots = (course, spots) => spots.filter(s => s.courseId != null && String(s.courseId) === String(course.courseId));
    function weeklyMean(metric, participant, selectedRounds = rounds) {
        if (metrics[metric].spatial) return null;
        return mean(subjects(participant).flatMap(p => selectedRounds.map(r => measurement(metric, p, r))));
    }
    function courseMean(metric, participant, site, course, spots, selectedRounds = rounds) {
        return metrics[metric].spatial
            ? mean(courseSpots(course, spots).map(s => spotMean(metric, participant, site, s, selectedRounds)))
            : weeklyMean(metric, participant, selectedRounds);
    }
    // 색상 시각화용 내부 값이며 별도의 임상/종합 점수가 아니다.
    function normalize(metric, raw) {
        if (raw == null || !Number.isFinite(raw)) return null;
        const ratio = raw / metrics[metric].max * 100;
        return clamp(metrics[metric].higher ? ratio : 100 - ratio, 0, 100);
    }
    function getSurveyColor(score) {
        if (score == null) return '#9ca3af';
        // 기존 rainbow threshold 팔레트 사이를 보간해 작은 평균 차이도 표현한다.
        const stops = [[0, '#8b5cf6'], [10, '#3b82f6'], [25, '#06b6d4'],
            [40, '#22c55e'], [55, '#eab308'], [70, '#f97316'], [85, '#ef4444'], [100, '#ef4444']];
        score = clamp(score, 0, 100);
        const upper = stops.findIndex(stop => stop[0] >= score);
        if (upper === 0) return stops[0][1];
        const [low, high] = [stops[upper - 1], stops[upper]];
        const ratio = (score - low[0]) / (high[0] - low[0]);
        const channels = [1, 3, 5].map(offset => {
            const a = parseInt(low[1].slice(offset, offset + 2), 16);
            const b = parseInt(high[1].slice(offset, offset + 2), 16);
            return Math.round(a + (b - a) * ratio).toString(16).padStart(2, '0');
        });
        return '#' + channels.join('');
    }
    const format = (raw, metric) => raw == null ? '표시할 분석 데이터가 없습니다.' : `${Number(raw.toFixed(1))} / ${metrics[metric].max}`;
    const range = metric => `원점수 0–${metrics[metric].max} · ${metrics[metric].higher ? '높을수록' : '낮을수록'} 긍정`;
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text != null) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function valueRow(label, value) {
        const row = element('div', null, 'spot-information-item');
        row.append(element('span', label), element('strong', value));
        return row;
    }
    function renderSpot(container, state) {
        const {metric, participant, site, spot} = state;
        container.replaceChildren();
        if (metrics[metric].spatial) {
            if (participant !== 'all') container.append(valueRow(`${participant} 평균 · 5회`, format(spotMean(metric, participant, site, spot), metric)));
            container.append(valueRow(`${spot.code} 전체 평균 · 5회`, format(spotMean(metric, 'all', site, spot), metric)));
        } else {
            container.append(valueRow(`${participant === 'all' ? '전체 참가자' : participant} 5회 평균`, format(weeklyMean(metric, participant), metric)));
            container.append(valueRow('공간별 지표', '주간 설문으로 HS별 점수 없음'));
        }
    }
    function svgNode(tag, attrs, text) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        if (text != null) node.textContent = text;
        return node;
    }
    function renderLineChart(metric, series) {
        const wrapper = element('div', null, 'survey-chart');
        if (!series.some(s => s.values.some(v => v != null))) {
            wrapper.append(element('p', '표시할 분석 데이터가 없습니다.', 'survey-note'));
            return wrapper;
        }
        const svg = svgNode('svg', {viewBox: '0 0 700 240', role: 'img', 'aria-label': `${metrics[metric].name} 1차~5차 원점수 변화`});
        const x = i => 48 + i * 151;
        const y = value => 202 - value / metrics[metric].max * 180;
        [0, 0.25, 0.5, 0.75, 1].forEach(ratio => {
            const value = ratio * metrics[metric].max;
            svg.append(svgNode('line', {x1: 48, x2: 652, y1: y(value), y2: y(value), stroke: '#e5e7eb'}));
            svg.append(svgNode('text', {x: 38, y: y(value) + 4, 'text-anchor': 'end'}, value));
        });
        rounds.forEach((r, i) => svg.append(svgNode('text', {x: x(i), y: 228, 'text-anchor': 'middle'}, `${r}차`)));
        const legend = element('div', null, 'survey-chart-legend');
        series.forEach((s, index) => {
            const color = `hsl(${(215 + index * 137.508) % 360} 65% 38%)`;
            let path = '', connected = false;
            s.values.forEach((v, i) => {
                if (v == null) { connected = false; return; }
                path += `${connected ? 'L' : 'M'}${x(i)},${y(v)} `;
                connected = true;
            });
            svg.append(svgNode('path', {d: path, fill: 'none', stroke: color, 'stroke-width': 2.5}));
            s.values.forEach((v, i) => {
                if (v == null) return;
                const dot = svgNode('circle', {cx: x(i), cy: y(v), r: 4, fill: color});
                dot.append(svgNode('title', {}, `${s.name} ${i + 1}차: ${format(v, metric)}`));
                svg.append(dot);
            });
            const label = element('span', s.name); label.style.color = color; legend.append(label);
        });
        // 그래프의 실제 수치도 키보드/스크린리더로 확인할 수 있다.
        const details = element('details'); details.append(element('summary', '회차별 원점수 보기'));
        series.forEach(s => details.append(element('p', `${s.name}: ${s.values.map((v, i) => `${i + 1}차 ${format(v, metric)}`).join(' · ')}`)));
        wrapper.append(svg, legend, details);
        return wrapper;
    }
    function renderModal(container, {participant, site, courses, spots}) {
        container.replaceChildren();
        Object.entries(metrics).forEach(([metric, m]) => {
            const section = element('section', null, 'survey-analysis-section');
            section.append(element('h3', m.name), element('p', range(metric), 'survey-note'));
            const series = m.spatial
                ? courses.map(c => ({name: `${c.code} · ${c.name}`, values: rounds.map(r => courseMean(metric, participant, site, c, spots, [r]))}))
                : [{name: participant === 'all' ? '전체 참가자 평균' : participant, values: rounds.map(r => weeklyMean(metric, participant, [r]))}];
            section.append(renderLineChart(metric, series));
            if (m.spatial) {
                section.append(element('h4', 'HealingSpot별 평균 · 1~5차'));
                const grid = element('div', null, 'survey-spot-grid');
                if (!spots.length) grid.append(element('p', '등록된 Healing Spot이 없습니다.', 'survey-note'));
                spots.forEach(spot => {
                    const card = element('div', null, 'survey-spot-average');
                    card.append(element('strong', `${spot.code} ${spot.name}`));
                    if (participant !== 'all') card.append(element('p', `${participant} 평균 ${format(spotMean(metric, participant, site, spot), metric)}`));
                    card.append(element('p', `전체 평균 ${format(spotMean(metric, 'all', site, spot), metric)}`));
                    grid.append(card);
                });
                section.append(grid);
            } else section.append(element('p', '주간 설문 · 공간별 점수가 아닙니다.', 'survey-note'));
            container.append(section);
        });
    }
    return {participants, rounds, metrics, mean, measurement, spotMean, weeklyMean, courseMean, normalize, getSurveyColor, format, range, renderSpot, renderModal};
})();
