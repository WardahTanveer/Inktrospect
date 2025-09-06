let moodData = [];

// Mood mapping
const moodMap = {
    "Angry": { emoji: '😡', value: 1 },
    "Sad": { emoji: '😭', value: 2 },
    "Sleepy": { emoji: '😴', value: 3 },
    "Content": { emoji: '😊', value: 4 },
    "Happy": { emoji: '😂', value: 5 }
};
function mapMoodToEmoji(mood) {
    return (moodMap[mood] && moodMap[mood].emoji) || '❓';
}

// === Modal Handling ===
const modal = document.querySelector('.modal');
const statsBtn = document.querySelector(".mood-stats");
const closeBtn = document.querySelector(".close-btn");
const backBtn = document.querySelector(".back-btn");
const yearLabel = document.querySelector(".year-label");
const yearPrevBtn = document.querySelector(".year-prev");
const yearNextBtn = document.querySelector(".year-next");

let currentYear = new Date().getFullYear();
let currentView = 'year'; // 'year' or 'month'
let currentMonth = null;
let moodChartInstance = null;

statsBtn.onclick = () => {
    modal.style.display = 'block';
    currentView = 'year';
    currentYear = new Date().getFullYear();
    loadMoods()
        .then(() => {
            drawMoodChart()
        });
};

closeBtn.onclick = () => {
    modal.style.display = 'none';
    document.querySelector('.modal-transition').classList.remove('visible');
};

backBtn.onclick = () => {
    if (currentView === 'month') {
        currentView = 'year';
        drawMoodChart();
    }
};

yearPrevBtn.onclick = () => {
    if (currentView === 'year') {
        currentYear--;
        drawMoodChart();
    }
};

yearNextBtn.onclick = () => {
    if (currentView === 'year') {
        currentYear++;
        drawMoodChart();
    }
};

async function loadMoods(){
    return fetch('/api/mood')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                moodData = data.moods.map(entry => {
                    const entryDate = new Date(entry.Date).toLocaleString('en-CA').split(',')[0];
                    return {
                    date: entryDate,
                    mood: entry.Mood
                    }
                });
                console.log(moodData);
            } else {
                console.error("Failed to load notes:", data.message);
            }
        })
        .catch(error => {
            console.error("Error loading notes:", error);
        });
}

// === Chart Logic ===
function drawMoodChart() {
    const canvas = document.querySelector(".moodChart");
    const ctx = canvas.getContext("2d");

    if (moodChartInstance) {
        document.querySelector('.modal-transition').classList.remove('visible');
        moodChartInstance.destroy();
    }
    setTimeout(() => {
        if (currentView === 'year') {
            backBtn.style.display = 'none';
            yearNextBtn.style.display = 'block';
            yearPrevBtn.style.display = 'block';
            yearLabel.textContent = currentYear;
            const monthlyData = getMonthlyMoodData(currentYear);
            const labels = Object.keys(monthlyData).sort((a, b) => parseInt(a) - parseInt(b));
            const dataValues = labels.map(label => {
                const mood = monthlyData[label];
                return moodMap[mood]?.value || 0;
            });
            
            moodChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: '#9A7B4F',
                        hoverBackgroundColor: '#7b5a36',
                        borderRadius: 6,
                        barPercentage: 0.6,
                    }]
                },
                options: {
                    onClick: (e) => {
                        const points = moodChartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                        if (points.length) {
                            const index = points[0].index;
                            const month = labels[index];
                            currentView = 'month';
                            currentMonth = month;
                            drawMoodChart();
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            min: 0,
                            max: 5,
                            ticks: {
                                callback: (value) => {
                                    const mood = Object.keys(moodMap).find(key => moodMap[key].value === value);
                                    return mapMoodToEmoji(mood);
                                },
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const mood = Object.keys(moodMap).find(key => moodMap[key].value === context.raw);
                                    return mapMoodToEmoji(mood);
                                }
                            }
                        }
                    }
                }
            });
        } else if (currentView === 'month') {
            backBtn.style.display = 'block';
            yearNextBtn.style.display = 'none';
            yearPrevBtn.style.display = 'none';
            yearLabel.textContent = `${currentMonth} ${currentYear}`;
            const dailyData = getDailyMoodData(currentYear, currentMonth);
            const labels = Object.keys(dailyData).sort((a, b) => parseInt(a) - parseInt(b));
            const dataValues = labels.map(label => {
                const mood = dailyData[label];
                return moodMap[mood]?.value || 0;
            })
            
            moodChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: '#9A7B4F',
                        hoverBackgroundColor: '#7b5a36',
                        borderRadius: 6,
                        barPercentage: 0.6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            min: 0,
                            max: 5,
                            ticks: {
                                callback: (value) => {
                                    const mood = Object.keys(moodMap).find(key => moodMap[key].value === value);
                                    return mapMoodToEmoji(mood);
                                },
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const mood = Object.keys(moodMap).find(key => moodMap[key].value === context.raw);
                                    return mapMoodToEmoji(mood);
                                }
                            }
                        }
                    }
                }
            });
        }
        document.querySelector('.modal-transition').classList.add('visible');
    }, 300);
}

// Helper functions
function getMonthlyMoodData(year) {
    const monthlyMoods = {};
    for (let i = 0; i < 12; i++) {
        const month = String(i + 1).padStart(2, '0');
        const monthData = moodData.filter(entry => entry.date.startsWith(`${year}-${month}`));
        if (monthData.length) {
            const moodCounts = {};
            monthData.forEach(entry => {
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            });
            const modeMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
            monthlyMoods[month] = modeMood;
        } else {
            monthlyMoods[month] = null;
        }
    }
    return monthlyMoods;
}

function getDailyMoodData(year, month) {
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    const dailyMoods = {};
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dayData = moodData.filter(entry => entry.date === `${year}-${month}-${dayStr}`);
        if (dayData.length) {
            dailyMoods[dayStr] = dayData[0].mood;
        }
        else {
            dailyMoods[dayStr] = null;
        }
    }
    return dailyMoods;
}

document.querySelectorAll('.emoji-list li').forEach(emoji => {
    emoji.addEventListener('click', () => {
        const mood = emoji.getAttribute('data-mood');
        fetch('/api/mood', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                mood: mood
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Mood recorded!");
            } else {
                alert(data.message || "Failed to record mood.");
            }
        })
        .catch(err => {
            console.error("Error saving mood:", err);
        });
    });
});
