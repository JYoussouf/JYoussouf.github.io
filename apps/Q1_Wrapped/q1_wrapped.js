const quarterData = [
    {
        group: "DS Direct Customer Delivery",
        epicKey: "AAE-75",
        epic: "Q1 Greif MKE PAI PM1 Deploy",
        totalTickets: 16,
        doneTickets: 16,
        contributors: ["Robert Sunderhaft"],
        numberOfContributors: 1,
        remainingTickets: 5,
        progressPct: 100,
        priorityBreakdown: { High: 6, Medium: 4, Low: 6 },
        storyPoints: 3.5,
        missingStoryPointTickets: 16,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "DS Direct Customer Delivery",
        epicKey: "AAE-163",
        epic: "Q1 Greif Austell Anomaly Detection",
        totalTickets: 14,
        doneTickets: 14,
        contributors: ["Robert Sunderhaft"],
        numberOfContributors: 1,
        remainingTickets: 1,
        progressPct: 100,
        priorityBreakdown: { Critical: 3, High: 3, Medium: 5, Low: 3 },
        storyPoints: 0,
        missingStoryPointTickets: 14,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "DS Direct Customer Delivery",
        epicKey: "AAE-74",
        epic: "Q1 Greif Austell & Taylors DS Maintenance",
        totalTickets: 7,
        doneTickets: 7,
        contributors: ["Josha Thomas", "Robert Sunderhaft"],
        numberOfContributors: 2,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { Critical: 1, Medium: 2, Low: 4 },
        storyPoints: 0,
        missingStoryPointTickets: 7,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "DS Direct Customer Delivery",
        epicKey: "AAE-83",
        epic: "Q1 Canpack BM Scaling and Validation",
        totalTickets: 37,
        doneTickets: 37,
        contributors: ["Joe Youssouf", "Josha Thomas"],
        numberOfContributors: 2,
        remainingTickets: 1,
        progressPct: 100,
        priorityBreakdown: { High: 15, Medium: 12, Low: 10 },
        storyPoints: 16,
        missingStoryPointTickets: 23,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "DS Direct Customer Delivery",
        epicKey: "AAE-76",
        epic: "Q1 Copperworks Reverb Furnace PAI Sign Off",
        totalTickets: 7,
        doneTickets: 7,
        contributors: ["Joe Youssouf", "Robert Sunderhaft"],
        numberOfContributors: 2,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { High: 3, Medium: 1, Low: 3 },
        storyPoints: 17.5,
        missingStoryPointTickets: 0,
        storyPointTracking: ""
    },
    {
        group: "DS Process Definition and Internal Planning",
        epicKey: "AAE-85",
        epic: "Q1 Expert-Led Anomaly Detection Framework",
        totalTickets: 5,
        doneTickets: 5,
        contributors: ["Joe Youssouf", "Robert Sunderhaft"],
        numberOfContributors: 2,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { High: 3, Medium: 2 },
        storyPoints: 8,
        missingStoryPointTickets: 0,
        storyPointTracking: ""
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "AAE-104",
        epic: "Q1 Recommendations as Metrics",
        totalTickets: 9,
        doneTickets: 9,
        contributors: ["Jack Byers", "Mike Monroe"],
        numberOfContributors: 2,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { Medium: 7, Low: 2 },
        storyPoints: 0,
        missingStoryPointTickets: 9,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "AAE-165",
        epic: "Q1 OQL Aggressive Cacher",
        totalTickets: 8,
        doneTickets: 2,
        contributors: ["Russ Frank"],
        numberOfContributors: 1,
        remainingTickets: 6,
        progressPct: 25,
        priorityBreakdown: { High: 1, Medium: 7 },
        storyPoints: 0,
        missingStoryPointTickets: 8,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "AAE-178",
        epic: "Q1 OQL->Metrics via Turbine",
        totalTickets: 15,
        doneTickets: 12,
        contributors: ["Paige Carlson"],
        numberOfContributors: 1,
        remainingTickets: 3,
        progressPct: 80,
        priorityBreakdown: { High: 1, Medium: 12, Low: 2 },
        storyPoints: 26.5,
        missingStoryPointTickets: 0,
        storyPointTracking: ""
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "AAE-261",
        epic: "Q1 Data Availability Agent",
        totalTickets: 12,
        doneTickets: 11,
        contributors: ["Josha Thomas"],
        numberOfContributors: 1,
        remainingTickets: 1,
        progressPct: 91.7,
        priorityBreakdown: { High: 2, Medium: 5, Low: 5 },
        storyPoints: 6.5,
        missingStoryPointTickets: 7,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "AAE-84",
        epic: "Q1 Pattern Detection Product Development",
        totalTickets: 2,
        doneTickets: 2,
        contributors: ["Paige Carlson"],
        numberOfContributors: 1,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { Medium: 2 },
        storyPoints: 7,
        missingStoryPointTickets: 0,
        storyPointTracking: ""
    },
    {
        group: "Alert Engine Core Enablement",
        epicKey: "n/a",
        epic: "Q1 OQL Windowed Functions",
        totalTickets: 0,
        doneTickets: 0,
        contributors: ["Jack Byers"],
        numberOfContributors: 1,
        remainingTickets: 0,
        progressPct: 0,
        priorityBreakdown: {},
        storyPoints: 0,
        missingStoryPointTickets: 0,
        storyPointTracking: "-"
    },
    {
        group: "DS R&D",
        epicKey: "AAE-156",
        epic: "Q1 Columbia Capstone Project Management",
        totalTickets: 7,
        doneTickets: 7,
        contributors: ["Joe Youssouf", "Robert Sunderhaft"],
        numberOfContributors: 2,
        remainingTickets: 1,
        progressPct: 100,
        priorityBreakdown: { High: 2, Medium: 3, Low: 2 },
        storyPoints: 4.5,
        missingStoryPointTickets: 0,
        storyPointTracking: ""
    },
    {
        group: "Code Maintenance",
        epicKey: "AAE-255",
        epic: "Q1 Bug and CFR Delivery",
        totalTickets: 18,
        doneTickets: 18,
        contributors: ["Jack Byers", "Josha Thomas", "Paige Carlson", "Russ Frank"],
        numberOfContributors: 4,
        remainingTickets: 0,
        progressPct: 100,
        priorityBreakdown: { High: 2, Medium: 10, Low: 6 },
        storyPoints: 0,
        missingStoryPointTickets: 18,
        storyPointTracking: "Story Points Not Tracked Reliably"
    },
    {
        group: "Code Maintenance",
        epicKey: "AAE-80",
        epic: "Q1 Tech Debt - AAE",
        totalTickets: 15,
        doneTickets: 15,
        contributors: ["Jack Byers", "Joe Youssouf", "Josha Thomas", "Robert Sunderhaft"],
        numberOfContributors: 4,
        remainingTickets: 1,
        progressPct: 100,
        priorityBreakdown: { Critical: 1, High: 1, Medium: 10, Low: 2, "Very Low": 1 },
        storyPoints: 8.5,
        missingStoryPointTickets: 7,
        storyPointTracking: "Story Points Not Tracked Reliably"
    }
];

const pageShellEl = document.querySelector(".page-shell");
const slidesEl = document.getElementById("slides");
const slides = [...document.querySelectorAll(".slide")];
const topbarEl = document.querySelector(".topbar");
const ambientNextEls = {
    a: document.querySelector(".ambient-a-next"),
    b: document.querySelector(".ambient-b-next"),
    c: document.querySelector(".ambient-c-next")
};
const ambientBaseEls = {
    a: document.querySelector(".ambient-a"),
    b: document.querySelector(".ambient-b"),
    c: document.querySelector(".ambient-c")
};
const railDotsEl = document.getElementById("railDots");
const prevButton = document.getElementById("prevSlide");
const nextButton = document.getElementById("nextSlide");
const startButton = document.getElementById("startWrapped");
const restartButton = document.getElementById("restartWrapped");
const tacoBurstButton = document.getElementById("tacoBurst");
const volumeSlider = document.getElementById("volumeSlider");
const volumeLabel = document.getElementById("volumeLabel");
const muteToggle = document.getElementById("muteToggle");
let currentSlideIndex = 0;
let isTransitioning = false;
let wheelDeltaBuffer = 0;
let touchStartY = null;
let touchLocked = false;
let isAudioEnabled = true;
let activeTrackKey = null;
let audioPrimed = false;
let masterVolume = 0.2;
let lastNonZeroVolume = 0.2;
let transitionResetId = null;
let lastScrollNavigationAt = 0;
let activeTacoBursts = [];
let tacoBurstAnimationId = null;
let mobileViewportFitFrame = null;
let audioUnlocked = false;
let autoplayRetryIds = [];
let ambientFadeTimeoutId = null;
let hasInitializedBackgroundGrade = false;

const MOBILE_BREAKPOINT = 760;
const backgroundGrades = [
    {
        light: 0.2,
        dark: 0.28,
        radialA: "rgba(255, 170, 120, 0.56)",
        radialB: "rgba(255, 90, 170, 0.4)",
        radialC: "rgba(120, 170, 255, 0.2)",
        linearStart: "#2a1022",
        linearMid: "#4b1f4b",
        linearEnd: "#1a274c",
        gradeA: "rgba(255, 170, 120, 0.48)",
        gradeB: "rgba(255, 110, 170, 0.34)",
        gradeC: "rgba(255, 240, 220, 0.16)",
        shadowA: "rgba(36, 10, 34, 0.42)",
        shadowB: "rgba(18, 8, 28, 0.42)"
    },
    {
        light: 0.3,
        dark: 0.14,
        radialA: "rgba(124, 216, 255, 0.58)",
        radialB: "rgba(146, 126, 240, 0.42)",
        radialC: "rgba(118, 232, 214, 0.28)",
        linearStart: "#091a34",
        linearMid: "#1b3d78",
        linearEnd: "#0a4e63",
        gradeA: "rgba(120, 225, 255, 0.54)",
        gradeB: "rgba(140, 120, 255, 0.34)",
        gradeC: "rgba(220, 245, 255, 0.18)",
        shadowA: "rgba(10, 24, 52, 0.3)",
        shadowB: "rgba(10, 20, 38, 0.28)"
    },
    {
        light: 0.22,
        dark: 0.26,
        radialA: "rgba(80, 245, 255, 0.48)",
        radialB: "rgba(80, 150, 255, 0.34)",
        radialC: "rgba(90, 255, 205, 0.22)",
        linearStart: "#041a2b",
        linearMid: "#0d355f",
        linearEnd: "#0a243e",
        gradeA: "rgba(110, 245, 255, 0.46)",
        gradeB: "rgba(100, 170, 255, 0.3)",
        gradeC: "rgba(220, 250, 255, 0.12)",
        shadowA: "rgba(8, 28, 44, 0.42)",
        shadowB: "rgba(8, 16, 34, 0.42)"
    },
    {
        light: 0.34,
        dark: 0.12,
        radialA: "rgba(255, 214, 84, 0.82)",
        radialB: "rgba(255, 242, 92, 0.72)",
        radialC: "rgba(255, 184, 96, 0.42)",
        linearStart: "#38120f",
        linearMid: "#7a2a24",
        linearEnd: "#5d2f12",
        gradeA: "rgba(255, 150, 125, 0.52)",
        gradeB: "rgba(255, 210, 120, 0.4)",
        gradeC: "rgba(255, 246, 214, 0.2)",
        shadowA: "rgba(58, 22, 14, 0.3)",
        shadowB: "rgba(30, 14, 12, 0.28)"
    },
    {
        light: 0.14,
        dark: 0.34,
        radialA: "rgba(210, 0, 18, 0.42)",
        radialB: "rgba(92, 245, 222, 0.24)",
        radialC: "rgba(145, 100, 255, 0.2)",
        linearStart: "#090d2b",
        linearMid: "#171f58",
        linearEnd: "#0b2236",
        gradeA: "rgba(90, 120, 255, 0.34)",
        gradeB: "rgba(100, 245, 225, 0.22)",
        gradeC: "rgba(220, 230, 255, 0.1)",
        shadowA: "rgba(8, 12, 44, 0.5)",
        shadowB: "rgba(5, 8, 24, 0.5)"
    },
    {
        light: 0.32,
        dark: 0.14,
        radialA: "rgba(92, 255, 84, 0.78)",
        radialB: "rgba(136, 255, 110, 0.62)",
        radialC: "rgba(98, 255, 182, 0.34)",
        linearStart: "#132614",
        linearMid: "#295428",
        linearEnd: "#123342",
        gradeA: "rgba(200, 255, 120, 0.46)",
        gradeB: "rgba(110, 255, 210, 0.34)",
        gradeC: "rgba(245, 255, 220, 0.18)",
        shadowA: "rgba(16, 42, 22, 0.3)",
        shadowB: "rgba(8, 24, 16, 0.28)"
    },
    {
        light: 0.18,
        dark: 0.3,
        radialA: "rgba(255, 250, 242, 0.82)",
        radialB: "rgba(255, 244, 232, 0.68)",
        radialC: "rgba(255, 255, 255, 0.42)",
        linearStart: "#26170d",
        linearMid: "#5c2818",
        linearEnd: "#3a190f",
        gradeA: "rgba(255, 248, 236, 0.42)",
        gradeB: "rgba(255, 255, 255, 0.24)",
        gradeC: "rgba(255, 250, 245, 0.18)",
        shadowA: "rgba(34, 20, 12, 0.32)",
        shadowB: "rgba(18, 12, 10, 0.3)"
    },
    {
        light: 0.36,
        dark: 0.1,
        radialA: "rgba(255, 142, 220, 0.7)",
        radialB: "rgba(168, 136, 255, 0.6)",
        radialC: "rgba(132, 236, 255, 0.34)",
        linearStart: "#221033",
        linearMid: "#5d2e83",
        linearEnd: "#273a71",
        gradeA: "rgba(255, 130, 210, 0.48)",
        gradeB: "rgba(145, 120, 255, 0.4)",
        gradeC: "rgba(255, 230, 250, 0.2)",
        shadowA: "rgba(36, 10, 48, 0.24)",
        shadowB: "rgba(20, 8, 30, 0.22)"
    },
    {
        light: 0.28,
        dark: 0.16,
        radialA: "rgba(255, 186, 98, 0.52)",
        radialB: "rgba(96, 235, 255, 0.36)",
        radialC: "rgba(255, 120, 145, 0.18)",
        linearStart: "#22161a",
        linearMid: "#5c3256",
        linearEnd: "#1f4250",
        gradeA: "rgba(255, 190, 125, 0.42)",
        gradeB: "rgba(120, 235, 255, 0.3)",
        gradeC: "rgba(255, 248, 230, 0.18)",
        shadowA: "rgba(20, 24, 38, 0.3)",
        shadowB: "rgba(10, 14, 24, 0.28)"
    }
];

const soundtrack = {
    intro: {
        label: "MondaMusic",
        src: "artifacts/mondamusic-lofi-beats-499181.mp3",
        audio: new Audio("artifacts/mondamusic-lofi-beats-499181.mp3")
    },
    summary: {
        label: "Paul Winter",
        src: "artifacts/kaazoom-chill-lofi-18528.mp3",
        audio: new Audio("artifacts/kaazoom-chill-lofi-18528.mp3"),
        startTime: 20
    },
    mid: {
        label: "VibeHorn",
        src: "artifacts/vibehorn-lofi-chill-music-496931.mp3",
        audio: new Audio("artifacts/vibehorn-lofi-chill-music-496931.mp3")
    },
    openWork: {
        label: "PhantasticBeats",
        src: "artifacts/phantasticbeats-its-christmas-time-12904.mp3",
        audio: new Audio("artifacts/phantasticbeats-its-christmas-time-12904.mp3")
    },
    outro: {
        label: "prettyjohn1",
        src: "artifacts/prettyjohn1-lofi-chill-chill_38sec-490468.mp3",
        audio: new Audio("artifacts/prettyjohn1-lofi-chill-chill_38sec-490468.mp3"),
        missing: false
    }
};

Object.values(soundtrack).forEach((track) => {
    track.audio.loop = true;
    track.audio.preload = "auto";
    track.audio.volume = 0;
});

soundtrack.outro.audio.addEventListener("error", () => {
    soundtrack.outro.missing = true;
    if (currentSlideIndex === slides.length - 1 && activeTrackKey === "outro") {
        playTrackForSlide(currentSlideIndex);
    }
});

const priorityColors = {
    Medium: "#2dd4bf",
    Low: "#7ee7ff",
    High: "#ff8a47",
    Critical: "#ff4d6d",
    "Very Low": "#b6c2cf"
};

const totals = quarterData.reduce((acc, item) => {
    acc.totalTickets += item.totalTickets;
    acc.doneTickets += item.doneTickets;
    acc.remainingTickets += item.remainingTickets;
    acc.storyPoints += item.storyPoints;
    acc.missingStoryPointTickets += item.missingStoryPointTickets;
    item.contributors.forEach((name) => {
        acc.contributorCounts[name] = (acc.contributorCounts[name] || 0) + 1;
    });
    Object.entries(item.priorityBreakdown).forEach(([priority, count]) => {
        acc.priorityCounts[priority] = (acc.priorityCounts[priority] || 0) + count;
    });
    acc.groupCounts[item.group] = (acc.groupCounts[item.group] || 0) + item.totalTickets;
    return acc;
}, {
    totalTickets: 0,
    doneTickets: 0,
    remainingTickets: 0,
    storyPoints: 0,
    missingStoryPointTickets: 0,
    contributorCounts: {},
    priorityCounts: {},
    groupCounts: {}
});

const completionRate = ((totals.doneTickets / totals.totalTickets) * 100).toFixed(1);
const trackedShare = ((totals.storyPoints / (totals.storyPoints + totals.missingStoryPointTickets)) * 100).toFixed(1);
const topByTickets = [...quarterData].sort((a, b) => b.totalTickets - a.totalTickets);
const topByStoryPoints = [...quarterData].sort((a, b) => b.storyPoints - a.storyPoints);
const openEpics = [...quarterData]
    .filter((item) => item.progressPct < 100 && item.totalTickets > 0)
    .sort((a, b) => a.progressPct - b.progressPct);
const groupAccentColors = ["#c7ff63", "#67e8c8", "#7ee7ff", "#ffd166", "#ff7847"];
const groupDisplayNames = {
    "DS R&D": "DS R&D (Columbia Capstone Project)"
};
const groupSummaries = Object.entries(quarterData.reduce((acc, item) => {
    if (!acc[item.group]) {
        acc[item.group] = {
            group: item.group,
            totalTickets: 0,
            people: {}
        };
    }

    acc[item.group].totalTickets += item.totalTickets;
    item.contributors.forEach((name) => {
        if (!acc[item.group].people[name]) {
            acc[item.group].people[name] = { name, epicCount: 0 };
        }
        acc[item.group].people[name].epicCount += 1;
    });

    return acc;
}, {}))
    .map(([group, summary], index) => ({
        group: groupDisplayNames[group] || group,
        totalTickets: summary.totalTickets,
        accent: groupAccentColors[index % groupAccentColors.length],
        contributors: Object.values(summary.people).sort((a, b) => b.epicCount - a.epicCount || a.name.localeCompare(b.name))
    }))
    .sort((a, b) => b.totalTickets - a.totalTickets);

function formatNumber(value) {
    if (Number.isInteger(value)) {
        return String(value);
    }
    return value.toFixed(1);
}

function getInitials(name) {
    return name
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function renderHeroStats() {
    const heroStats = document.getElementById("heroStats");
    const items = [
        { value: totals.totalTickets, label: "tickets tracked" },
        { value: `${completionRate}%`, label: "scoped tickets done by quarter close" },
        { value: Object.keys(totals.contributorCounts).length, label: "contributors featured" }
    ];
    heroStats.innerHTML = items.map((item) => `
        <div class="stat-pill">
            <strong>${item.value}</strong>
            <span>${item.label}</span>
        </div>
    `).join("");
}

function renderMetricGrid() {
    const metricGrid = document.getElementById("metricGrid");
    const cards = [
        { value: totals.doneTickets, label: "Done tickets", note: ""},
        { value: totals.remainingTickets, label: "Remaining tickets", note: "A small unfinished tail remained." },
        { value: `${trackedShare}%`, label: "Story Point tracking coverage", note: "Area of Improvement for Q2 Tracking." }
    ];
    metricGrid.innerHTML = cards.map((card) => `
        <div class="metric-card">
            <strong>${card.value}</strong>
            <span>${card.label}</span>
            <small>${card.note}</small>
        </div>
    `).join("");

    document.getElementById("factStrip").innerHTML = `
        <div class="fact-item">
            <strong>Largest epic by volume</strong>
            <span>${topByTickets[0].epic}</span>
        </div>
        <div class="fact-item">
            <strong>Largest epic by tracked effort</strong>
            <span>${topByStoryPoints[0].epic}</span>
        </div>
    `;
}

function renderBarChart(containerId, items, valueKey, maxValue, classNameBuilder = () => "") {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map((item) => {
        const width = maxValue === 0 ? 0 : (item[valueKey] / maxValue) * 100;
        const fillClass = classNameBuilder(item);
        return `
            <div class="bar-row">
                <div class="bar-label">${item.epic.replace(/^Q1\s+/i, "")}</div>
                <div class="bar-track">
                    <div class="bar-fill ${fillClass}" style="width:${width}%"></div>
                </div>
                <div class="bar-value">${formatNumber(item[valueKey])}</div>
            </div>
        `;
    }).join("");
}

function renderTicketSection() {
    const topItems = topByTickets.filter((item) => item.totalTickets >= 0);
    renderBarChart("ticketChart", topItems, "totalTickets", topItems[0].totalTickets);
    document.getElementById("ticketChartCaption").textContent = `${topItems.length} epics ranked by ticket count`;
}

function renderStoryPointsSection() {
    const pointItems = topByStoryPoints.filter((item) => item.storyPoints >= 0);
    renderBarChart(
        "pointsChart",
        pointItems,
        "storyPoints",
        pointItems[0].storyPoints,
        (item) => (item.storyPointTracking ? "unreliable" : "reliable")
    );
    document.getElementById("storypointCallout").innerHTML = `
        <strong>${trackedShare}%</strong>
        <span>of story-point-related volume was captured with reliable tracking.</span>
        <small>${totals.missingStoryPointTickets} tickets were attached to epics flagged for missing or inconsistent point coverage, which makes tracking hygiene part of the quarter narrative.</small>
    `;
}

function renderPrioritySection() {
    const entries = Object.entries(totals.priorityCounts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const gradients = [];
    let cursor = 0;

    entries.forEach(([label, count]) => {
        const slice = (count / total) * 100;
        const start = cursor.toFixed(2);
        const end = (cursor + slice).toFixed(2);
        gradients.push(`${priorityColors[label]} ${start}% ${end}%`);
        cursor += slice;
    });

    document.getElementById("priorityDonut").style.background = `conic-gradient(${gradients.join(", ")})`;
    document.getElementById("priorityTotal").textContent = total;
    document.getElementById("priorityLegend").innerHTML = entries.map(([label, count]) => `
        <div class="priority-pill">
            <span><span class="swatch" style="background:${priorityColors[label]}"></span>${label}</span>
            <strong>${count} (${((count / total) * 100).toFixed(1)}%)</strong>
        </div>
    `).join("");
}

function renderTeamsSection() {
    document.getElementById("groupList").innerHTML = groupSummaries.map((summary) => `
        <div class="crew-lane" style="--group-accent:${summary.accent}">
            <div class="crew-lane-header">
                <div>
                    <strong>${summary.group}</strong>
                    <small>${summary.totalTickets} tickets • ${summary.contributors.length} contributor${summary.contributors.length === 1 ? "" : "s"}</small>
                </div>
                <span class="crew-lane-glow"></span>
            </div>
            <div class="crew-pill-list">
                ${summary.contributors.map((person) => `
                    <div class="crew-pill">
                        <span class="crew-initials">${getInitials(person.name)}</span>
                        <span class="crew-pill-copy">
                            <strong>${person.name}</strong>
                        </span>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");

    document.getElementById("watchList").innerHTML = openEpics.map((item) => `
        <div class="watch-item">
            <strong>${item.epic}</strong>
            <small>${item.progressPct}% done with ${item.remainingTickets} ticket${item.remainingTickets === 1 ? "" : "s"} still open.</small>
        </div>
    `).join("");
}

function buildDots() {
    const railPreviewCopy = {
        Start: "Q1 kickoff",
        Summary: "Totals",
        Volume: "epic workload",
        "Story Points": "tracked effort",
        Priority: "urgency mix",
        Teams: "who worked where",
        "Open Work": "what rolls forward",
        Awards: "squad trophies",
        Finish: "send-off"
    };

    railDotsEl.innerHTML = slides.map((slide, index) => `
        <button
            class="rail-dot${index === 0 ? " active" : ""}"
            type="button"
            aria-label="Go to ${slide.dataset.title} slide"
            data-index="${index}">
            <span class="rail-dot-title">${slide.dataset.title}</span>
            <span class="rail-dot-copy">${railPreviewCopy[slide.dataset.title] || "section preview"}</span>
        </button>
    `).join("");
}

function updateVolumeLabel() {
    volumeLabel.textContent = isAudioEnabled ? `Music: ${Math.round(masterVolume * 100)}%` : "Music: Off";
    if (muteToggle) {
        muteToggle.textContent = isAudioEnabled ? "Mute" : "Unmute";
        muteToggle.setAttribute("aria-pressed", String(!isAudioEnabled));
        muteToggle.setAttribute("aria-label", isAudioEnabled ? "Mute music" : "Unmute music");
    }
}

function syncTrackVolumes() {
    Object.entries(soundtrack).forEach(([key, track]) => {
        track.audio.volume = isAudioEnabled && key === activeTrackKey ? masterVolume : 0;
    });
}

async function fadeToTrack(nextKey) {
    if (!soundtrack[nextKey]) {
        return;
    }

    const nextTrack = soundtrack[nextKey];
    if (nextTrack.missing) {
        return;
    }

    const previousKey = activeTrackKey;
    const previousTrack = previousKey ? soundtrack[previousKey] : null;

    if (previousKey === nextKey && !nextTrack.audio.paused) {
        updateVolumeLabel();
        return;
    }

    nextTrack.audio.currentTime = previousKey === nextKey ? nextTrack.audio.currentTime : (nextTrack.startTime || 0);

    try {
        await nextTrack.audio.play();
    } catch {
        if (previousKey !== nextKey) {
            activeTrackKey = previousKey || null;
        }
        if (!audioUnlocked) {
            updateVolumeLabel();
            return;
        }
        isAudioEnabled = false;
        updateVolumeLabel();
        return;
    }

    activeTrackKey = nextKey;

    const steps = 10;
    const stepDuration = 60;

    for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        nextTrack.audio.volume = masterVolume * progress;
        if (previousTrack) {
            previousTrack.audio.volume = masterVolume * (1 - progress);
        }
        if (stepDuration > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, stepDuration));
        }
    }

    if (previousTrack) {
        previousTrack.audio.pause();
        previousTrack.audio.currentTime = 0;
        previousTrack.audio.volume = 0;
    }

    nextTrack.audio.volume = masterVolume;
    updateVolumeLabel();
}

function getTrackKeyForSlide(index) {
    const slide = slides[index];
    const trackKey = slide?.dataset.track;

    if (trackKey && soundtrack[trackKey] && !(trackKey === "outro" && soundtrack.outro.missing)) {
        return trackKey;
    }

    if (trackKey === "outro" && soundtrack.outro.missing) {
        return "summary";
    }

    if (index === 0) {
        return "intro";
    }
    if (index >= 1 && index <= 3) {
        return "mid";
    }
    if (index === slides.length - 1) {
        return soundtrack.outro.missing ? "summary" : "outro";
    }
    return "summary";
}

function playTrackForSlide(index) {
    if (!isAudioEnabled) {
        updateVolumeLabel();
        return;
    }
    fadeToTrack(getTrackKeyForSlide(index));
}

function clearAutoplayRetries() {
    autoplayRetryIds.forEach((retryId) => {
        window.clearTimeout(retryId);
    });
    autoplayRetryIds = [];
}

function retryAutoplayIfNeeded() {
    if (!isAudioEnabled) {
        return;
    }

    const trackKey = getTrackKeyForSlide(currentSlideIndex);
    const track = soundtrack[trackKey];
    if (!track || track.missing) {
        return;
    }

    if (activeTrackKey === trackKey && !track.audio.paused) {
        return;
    }

    playTrackForSlide(currentSlideIndex);
}

function scheduleAutoplayRetries() {
    clearAutoplayRetries();
    [350, 1200, 2600].forEach((delayMs) => {
        const retryId = window.setTimeout(() => {
            retryAutoplayIfNeeded();
        }, delayMs);
        autoplayRetryIds.push(retryId);
    });
}

function pauseAllTracks() {
    Object.values(soundtrack).forEach((track) => {
        track.audio.pause();
        track.audio.volume = 0;
    });
    activeTrackKey = null;
}

function primeAudio() {
    if (audioPrimed) {
        return;
    }
    audioPrimed = true;
    Object.values(soundtrack).forEach((track) => {
        track.audio.load();
    });
}

function scrollToSlide(index) {
    const boundedIndex = Math.max(0, Math.min(index, slides.length - 1));
    if (boundedIndex === currentSlideIndex) {
        return;
    }

    isTransitioning = true;
    slidesEl.classList.add("is-transitioning");
    pageShellEl?.classList.add("is-transitioning");
    currentSlideIndex = boundedIndex;
    updateActiveSlide();
    playTrackForSlide(currentSlideIndex);
    scheduleAutoplayRetries();

    const transitionDuration = document.body.classList.contains("reduced-motion") ? 80 : 760;
    if (transitionResetId) {
        window.clearTimeout(transitionResetId);
    }
    transitionResetId = window.setTimeout(() => {
        isTransitioning = false;
        slidesEl.classList.remove("is-transitioning");
        pageShellEl?.classList.remove("is-transitioning");
        transitionResetId = null;
    }, transitionDuration);
}

function updateActiveSlide() {
    slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === currentSlideIndex);
        slide.classList.toggle("is-before", index < currentSlideIndex);
        slide.classList.toggle("is-after", index > currentSlideIndex);
        slide.setAttribute("aria-hidden", String(index !== currentSlideIndex));
    });

    document.querySelectorAll(".rail-dot").forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlideIndex);
    });

    prevButton.disabled = currentSlideIndex === 0;
    nextButton.disabled = currentSlideIndex === slides.length - 1;
    updateBackgroundGrade();
    scheduleMobileViewportFit();
}

function updateBackgroundGrade() {
    const grade = backgroundGrades[currentSlideIndex] || backgroundGrades[0];
    const rootStyle = document.documentElement.style;

    if (!hasInitializedBackgroundGrade) {
        rootStyle.setProperty("--ambient-a-color", grade.radialA);
        rootStyle.setProperty("--ambient-b-color", grade.radialB);
        rootStyle.setProperty("--ambient-c-color", grade.radialC);
        rootStyle.setProperty("--bg-light-opacity", grade.light.toFixed(2));
        rootStyle.setProperty("--bg-dark-opacity", grade.dark.toFixed(2));
        rootStyle.setProperty("--bg-grade-a", grade.gradeA);
        rootStyle.setProperty("--bg-grade-b", grade.gradeB);
        rootStyle.setProperty("--bg-grade-c", grade.gradeC);
        rootStyle.setProperty("--bg-shadow-a", grade.shadowA);
        rootStyle.setProperty("--bg-shadow-b", grade.shadowB);
        hasInitializedBackgroundGrade = true;
        return;
    }

    if (ambientFadeTimeoutId) {
        window.clearTimeout(ambientFadeTimeoutId);
        ambientFadeTimeoutId = null;
    }

    if (ambientNextEls.a) {
        ambientNextEls.a.style.background = `radial-gradient(circle, ${grade.radialA}, rgba(255, 132, 72, 0))`;
        ambientNextEls.b.style.background = `radial-gradient(circle, ${grade.radialB}, rgba(92, 235, 255, 0))`;
        ambientNextEls.c.style.background = `radial-gradient(circle, ${grade.radialC}, rgba(210, 255, 95, 0))`;

        ambientNextEls.a.classList.remove("is-visible");
        ambientNextEls.b.classList.remove("is-visible");
        ambientNextEls.c.classList.remove("is-visible");

        void ambientNextEls.a.offsetWidth;

        ambientNextEls.a.classList.add("is-visible");
        ambientNextEls.b.classList.add("is-visible");
        ambientNextEls.c.classList.add("is-visible");
    }

    ambientFadeTimeoutId = window.setTimeout(() => {
        rootStyle.setProperty("--ambient-a-color", grade.radialA);
        rootStyle.setProperty("--ambient-b-color", grade.radialB);
        rootStyle.setProperty("--ambient-c-color", grade.radialC);
        ambientNextEls.a?.classList.remove("is-visible");
        ambientNextEls.b?.classList.remove("is-visible");
        ambientNextEls.c?.classList.remove("is-visible");
        ambientFadeTimeoutId = null;
    }, 2900);

    rootStyle.setProperty("--bg-light-opacity", grade.light.toFixed(2));
    rootStyle.setProperty("--bg-dark-opacity", grade.dark.toFixed(2));
    rootStyle.setProperty("--bg-grade-a", grade.gradeA);
    rootStyle.setProperty("--bg-grade-b", grade.gradeB);
    rootStyle.setProperty("--bg-grade-c", grade.gradeC);
    rootStyle.setProperty("--bg-shadow-a", grade.shadowA);
    rootStyle.setProperty("--bg-shadow-b", grade.shadowB);
}

function clearMobileViewportFit() {
    document.documentElement.style.removeProperty("--mobile-header-bottom");
    document.documentElement.style.removeProperty("--mobile-slide-gap");
    document.documentElement.style.removeProperty("--mobile-bottom-gap");
    slides.forEach((slide) => {
        slide.style.removeProperty("--slide-fit-scale");
        slide.style.removeProperty("--slide-fit-scale-before");
        slide.style.removeProperty("--slide-fit-scale-after");
    });
}

function fitSlideToViewport(slide, headerBottom, topGap, bottomGap, sideGap) {
    const card = slide.querySelector(".slide-card");
    if (!card) {
        return;
    }

    const availableWidth = Math.max(window.innerWidth - (sideGap * 2), 1);
    const availableHeight = Math.max(window.innerHeight - headerBottom - topGap - bottomGap, 1);
    const naturalWidth = card.offsetWidth;
    const naturalHeight = card.offsetHeight;

    if (!naturalWidth || !naturalHeight) {
        return;
    }

    const fitScale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
    const activeScale = Math.max(fitScale, 0.38);
    const beforeScale = Math.max(activeScale - 0.04, 0.34);
    const afterScale = Math.max(activeScale - 0.06, 0.32);

    slide.style.setProperty("--slide-fit-scale", activeScale.toFixed(4));
    slide.style.setProperty("--slide-fit-scale-before", beforeScale.toFixed(4));
    slide.style.setProperty("--slide-fit-scale-after", afterScale.toFixed(4));
}

function applyMobileViewportFit() {
    mobileViewportFitFrame = null;

    if (window.innerWidth > MOBILE_BREAKPOINT) {
        clearMobileViewportFit();
        return;
    }

    const shortViewport = window.innerHeight <= 780;
    const headerBottom = Math.ceil(topbarEl?.getBoundingClientRect().bottom || 0);
    const topGap = shortViewport ? 6 : 8;
    const bottomGap = shortViewport ? 6 : 8;
    const sideGap = shortViewport ? 6 : 8;

    document.documentElement.style.setProperty("--mobile-header-bottom", `${headerBottom}px`);
    document.documentElement.style.setProperty("--mobile-slide-gap", `${topGap}px`);
    document.documentElement.style.setProperty("--mobile-bottom-gap", `${bottomGap}px`);

    slides.forEach((slide) => {
        fitSlideToViewport(slide, headerBottom, topGap, bottomGap, sideGap);
    });
}

function scheduleMobileViewportFit() {
    if (mobileViewportFitFrame !== null) {
        window.cancelAnimationFrame(mobileViewportFitFrame);
    }

    mobileViewportFitFrame = window.requestAnimationFrame(applyMobileViewportFit);
}

function wireMobileViewportFit() {
    scheduleMobileViewportFit();
    window.addEventListener("resize", scheduleMobileViewportFit);
    window.addEventListener("orientationchange", scheduleMobileViewportFit);

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", scheduleMobileViewportFit);
    }

    if ("ResizeObserver" in window && topbarEl) {
        const topbarObserver = new ResizeObserver(() => {
            scheduleMobileViewportFit();
        });
        topbarObserver.observe(topbarEl);
    }
}

function stepSlide(delta) {
    if (delta === 0) {
        return;
    }
    scrollToSlide(currentSlideIndex + delta);
}

function wireWheelPaging() {
    window.addEventListener("wheel", (event) => {
        if (event.ctrlKey) {
            return;
        }

        event.preventDefault();
        const now = performance.now();
        const scrollCooldown = document.body.classList.contains("reduced-motion") ? 60 : 180;
        if (now - lastScrollNavigationAt < scrollCooldown) {
            return;
        }

        wheelDeltaBuffer += event.deltaY;
        if (Math.abs(wheelDeltaBuffer) < 40) {
            return;
        }

        const direction = wheelDeltaBuffer > 0 ? 1 : -1;
        wheelDeltaBuffer = 0;
        lastScrollNavigationAt = now;
        stepSlide(direction);
    }, { passive: false });
}

function wireTouchPaging() {
    window.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) {
            return;
        }
        touchStartY = event.touches[0].clientY;
        touchLocked = false;
    }, { passive: true });

    window.addEventListener("touchmove", (event) => {
        if (touchStartY === null || touchLocked) {
            return;
        }

        const now = performance.now();
        const scrollCooldown = document.body.classList.contains("reduced-motion") ? 60 : 180;
        if (now - lastScrollNavigationAt < scrollCooldown) {
            return;
        }

        const deltaY = touchStartY - event.touches[0].clientY;
        if (Math.abs(deltaY) < 48) {
            return;
        }

        event.preventDefault();
        touchLocked = true;
        lastScrollNavigationAt = now;
        stepSlide(deltaY > 0 ? 1 : -1);
    }, { passive: false });

    window.addEventListener("touchend", () => {
        touchStartY = null;
        touchLocked = false;
    }, { passive: true });
}

function wireNavigation() {
    buildDots();
    updateActiveSlide();
    playTrackForSlide(currentSlideIndex);

    railDotsEl.addEventListener("click", (event) => {
        const target = event.target.closest(".rail-dot");
        if (!target) {
            return;
        }
        scrollToSlide(Number(target.dataset.index));
    });

    prevButton.addEventListener("click", () => {
        stepSlide(-1);
    });

    nextButton.addEventListener("click", () => {
        stepSlide(1);
    });

    startButton.addEventListener("click", () => scrollToSlide(1));
    restartButton.addEventListener("click", () => scrollToSlide(0));
    wireWheelPaging();
    wireTouchPaging();

    document.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "PageDown" && event.key !== "PageUp") {
            return;
        }
        event.preventDefault();
        const delta = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
        stepSlide(delta);
    });
}

function wireAudioUnlock() {
    const unlockAudio = () => {
        audioUnlocked = true;
        primeAudio();
        if (!isAudioEnabled) {
            return;
        }
        playTrackForSlide(currentSlideIndex);
        clearAutoplayRetries();
        window.removeEventListener("pointerdown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
}

function wireAutoplayRetry() {
    scheduleAutoplayRetries();

    window.addEventListener("pageshow", () => {
        scheduleAutoplayRetries();
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            retryAutoplayIfNeeded();
        }
    });

    window.addEventListener("focus", () => {
        retryAutoplayIfNeeded();
    });
}

function updateTacoBursts(now) {
    activeTacoBursts = activeTacoBursts.filter((burst) => {
        const elapsed = now - burst.launchedAt;
        const progress = Math.min(elapsed / burst.duration, 1);
        const inverse = 1 - progress;
        const x = (inverse * inverse * burst.startX)
            + (2 * inverse * progress * burst.controlX)
            + (progress * progress * burst.endX);
        const y = (inverse * inverse * burst.startY)
            + (2 * inverse * progress * burst.controlY)
            + (progress * progress * burst.endY);
        const tangentX = 2 * inverse * (burst.controlX - burst.startX) + 2 * progress * (burst.endX - burst.controlX);
        const tangentY = 2 * inverse * (burst.controlY - burst.startY) + 2 * progress * (burst.endY - burst.controlY);
        const pathAngle = Math.atan2(tangentY, tangentX) * (180 / Math.PI);
        const extraSpin = burst.spin * progress;
        const scale = burst.baseScale + (Math.sin(progress * Math.PI) * 0.12);
        const opacity = progress < 0.82 ? 1 : 1 - ((progress - 0.82) / 0.18);

        burst.element.style.opacity = `${Math.max(opacity, 0)}`;
        burst.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${pathAngle + extraSpin}deg) scale(${scale})`;

        if (progress < 1) {
            return true;
        }

        burst.element.remove();
        return false;
    });

    if (activeTacoBursts.length > 0) {
        tacoBurstAnimationId = window.requestAnimationFrame(updateTacoBursts);
        return;
    }

    tacoBurstAnimationId = null;
}

function launchTacoBurst() {
    if (!tacoBurstButton) {
        return;
    }

    const origin = tacoBurstButton.getBoundingClientRect();
    const burstCount = 2 + Math.floor(Math.random() * 9);
    const startX = origin.left + origin.width / 2;
    const startY = origin.top + origin.height / 2;

    for (let index = 0; index < burstCount; index += 1) {
        const taco = document.createElement("span");
        const horizontalDirection = Math.random() > 0.5 ? 1 : -1;
        const endX = startX + (horizontalDirection * (260 + Math.random() * 420));
        const endY = window.innerHeight + 120 + Math.random() * 120;
        const controlX = startX + (horizontalDirection * (120 + Math.random() * 260));
        const controlY = startY - (220 + Math.random() * 220);
        const spin = (Math.random() * 320 + 220) * horizontalDirection;
        const duration = 1500 + Math.random() * 700;
        const spreadX = (Math.random() - 0.5) * Math.min(origin.width * 1.25, 130);
        const spreadY = (Math.random() - 0.5) * 36;
        const baseScale = 0.76 + Math.random() * 0.18;
        const startRotation = -22 * horizontalDirection;

        taco.className = "taco-burst";
        taco.textContent = "🌮";
        taco.style.left = "0";
        taco.style.top = "0";
        taco.style.fontSize = `${1.5 + Math.random() * 1.6}rem`;
        taco.style.opacity = "1";
        taco.style.transform = `translate3d(${startX + spreadX}px, ${startY + spreadY}px, 0) translate(-50%, -50%) rotate(${startRotation}deg) scale(${baseScale})`;

        document.body.appendChild(taco);
        activeTacoBursts.push({
            element: taco,
            launchedAt: performance.now(),
            duration,
            startX: startX + spreadX,
            startY: startY + spreadY,
            controlX,
            controlY,
            endX,
            endY,
            spin,
            baseScale
        });
    }

    if (!tacoBurstAnimationId) {
        tacoBurstAnimationId = window.requestAnimationFrame(updateTacoBursts);
    }
}

function wireVolumeSlider() {
    volumeSlider.addEventListener("input", () => {
        masterVolume = Number(volumeSlider.value) / 100;
        isAudioEnabled = masterVolume > 0;
        if (masterVolume > 0) {
            lastNonZeroVolume = masterVolume;
        }
        if (!isAudioEnabled) {
            pauseAllTracks();
            updateVolumeLabel();
            return;
        }
        primeAudio();
        syncTrackVolumes();
        if (!activeTrackKey) {
            playTrackForSlide(currentSlideIndex);
        } else {
            updateVolumeLabel();
        }
    });
}

function wireMuteToggle() {
    if (!muteToggle) {
        return;
    }

    muteToggle.addEventListener("click", () => {
        if (isAudioEnabled) {
            if (masterVolume > 0) {
                lastNonZeroVolume = masterVolume;
            }
            masterVolume = 0;
            isAudioEnabled = false;
            volumeSlider.value = "0";
            pauseAllTracks();
            updateVolumeLabel();
            return;
        }

        masterVolume = lastNonZeroVolume > 0 ? lastNonZeroVolume : 0.2;
        isAudioEnabled = true;
        volumeSlider.value = String(Math.round(masterVolume * 100));
        primeAudio();
        syncTrackVolumes();
        if (!activeTrackKey) {
            playTrackForSlide(currentSlideIndex);
        } else {
            updateVolumeLabel();
        }
    });
}

function revealAwardPill(pill) {
    if (!pill || !pill.classList.contains("is-concealed") || pill.classList.contains("is-revealing")) {
        return;
    }

    pill.classList.add("is-revealing");
    pill.setAttribute("aria-pressed", "true");

    window.setTimeout(() => {
        pill.classList.remove("is-concealed", "is-revealing");
    }, 700);
}

function wireAwardReveal() {
    document.querySelectorAll(".award-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
            revealAwardPill(pill);
        });

        pill.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }
            event.preventDefault();
            revealAwardPill(pill);
        });
    });
}

function randomInRange(min, max) {
    return min + (Math.random() * (max - min));
}

function applyAmbientMotionPair(key) {
    const baseEl = ambientBaseEls[key];
    const nextEl = ambientNextEls[key];
    if (!baseEl || !nextEl) {
        return;
    }

    const config = {
        x1: `${randomInRange(-7, 7).toFixed(2)}vw`,
        y1: `${randomInRange(-6, 6).toFixed(2)}vw`,
        x2: `${randomInRange(-7, 7).toFixed(2)}vw`,
        y2: `${randomInRange(-7, 7).toFixed(2)}vw`,
        x3: `${randomInRange(-6, 6).toFixed(2)}vw`,
        y3: `${randomInRange(-6, 6).toFixed(2)}vw`,
        scale1: randomInRange(1.08, 1.18).toFixed(3),
        scale2: randomInRange(1.16, 1.28).toFixed(3),
        scale3: randomInRange(1.1, 1.2).toFixed(3),
        driftDuration: `${randomInRange(12.5, 17.5).toFixed(2)}s`,
        breatheDuration: `${randomInRange(16, 21).toFixed(2)}s`,
        driftDelay: `${randomInRange(-10, 0).toFixed(2)}s`,
        breatheDelay: `${randomInRange(-14, 0).toFixed(2)}s`
    };

    [baseEl, nextEl].forEach((el) => {
        el.style.setProperty("--ambient-x-1", config.x1);
        el.style.setProperty("--ambient-y-1", config.y1);
        el.style.setProperty("--ambient-x-2", config.x2);
        el.style.setProperty("--ambient-y-2", config.y2);
        el.style.setProperty("--ambient-x-3", config.x3);
        el.style.setProperty("--ambient-y-3", config.y3);
        el.style.setProperty("--ambient-scale-1", config.scale1);
        el.style.setProperty("--ambient-scale-2", config.scale2);
        el.style.setProperty("--ambient-scale-3", config.scale3);
        el.style.setProperty("--ambient-drift-duration", config.driftDuration);
        el.style.setProperty("--ambient-breathe-duration", config.breatheDuration);
        el.style.setProperty("--ambient-drift-delay", config.driftDelay);
        el.style.setProperty("--ambient-breathe-delay", config.breatheDelay);
    });
}

function initializeAmbientMotion() {
    ["a", "b", "c"].forEach((key) => {
        applyAmbientMotionPair(key);
    });
}

function init() {
    renderHeroStats();
    renderMetricGrid();
    renderTicketSection();
    renderStoryPointsSection();
    renderPrioritySection();
    renderTeamsSection();
    initializeAmbientMotion();
    wireNavigation();
    wireAutoplayRetry();
    wireMobileViewportFit();
    wireAudioUnlock();
    wireVolumeSlider();
    wireMuteToggle();
    wireAwardReveal();
    if (tacoBurstButton) {
        tacoBurstButton.addEventListener("click", launchTacoBurst);
    }
    syncTrackVolumes();
    updateVolumeLabel();
}

init();
