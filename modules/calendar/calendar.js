
// Indian Holidays 2026
const indianHolidays2026 = [
    { date: '2026-01-26', name: 'Republic Day' },
    { date: '2026-03-14', name: 'Holi' },
    { date: '2026-04-02', name: 'Ram Navami' },
    { date: '2026-04-06', name: 'Mahavir Jayanti' },
    { date: '2026-04-10', name: 'Good Friday' },
    { date: '2026-05-01', name: 'May Day' },
    { date: '2026-08-15', name: 'Independence Day' },
    { date: '2026-08-24', name: 'Janmashtami' },
    { date: '2026-09-16', name: 'Ganesh Chaturthi' },
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-10-20', name: 'Dussehra' },
    { date: '2026-11-09', name: 'Diwali' },
    { date: '2026-11-30', name: 'Guru Nanak Jayanti' },
    { date: '2026-12-25', name: 'Christmas' }
];
window.indianHolidays2026 = indianHolidays2026;

// Calendar Logic
// currentCalendarMonth and currentCalendarYear are defined globally in app.js

function loadCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarYear;
    const month = currentCalendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let html = `
        <div class="calendar-widget">
            <div class="calendar-header">
                <button class="calendar-nav" onclick="changeMonth(-1)">←</button>
                <h3>${monthNames[month]} ${year}</h3>
                <button class="calendar-nav" onclick="changeMonth(1)">→</button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day header">Sun</div>
                <div class="calendar-day header">Mon</div>
                <div class="calendar-day header">Tue</div>
                <div class="calendar-day header">Wed</div>
                <div class="calendar-day header">Thu</div>
                <div class="calendar-day header">Fri</div>
                <div class="calendar-day header">Sat</div>
    `;

    const events = db.getRecords('events');
    const dayNotes = db.getRecords('dayNotes');
    const batches = db.getRecords('batches');
    const today = new Date();

    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        let classes = ['calendar-day'];
        if (date.toDateString() === today.toDateString()) classes.push('today');
        if (dayOfWeek === 0) classes.push('sunday');

        const holiday = indianHolidays2026.find(h => h.date === dateString);
        if (holiday) classes.push('holiday');

        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        const dayShort = dayName.substring(0, 3).toLowerCase();

        // Find batches scheduled for this day
        const daysBatches = batches.filter(b => b.schedule && b.schedule.toLowerCase().includes(dayShort));
        const hasSession = daysBatches.length > 0;

        if (hasSession) classes.push('session');

        const dayEvents = events.filter(e => e.date === dateString);
        const note = dayNotes.find(n => n.date === dateString);

        html += `<div class="${classes.join(' ')}" onclick="showDayDetails('${dateString}')">
            <div class="date-number">${day}</div>
            <div class="calendar-indicators">
                ${daysBatches.length ? `<div class="indicator-pill batch-pill" title="${daysBatches.length} Batches">${daysBatches.length} Classes</div>` : ''}
                ${holiday ? '<div class="indicator-dot indicator-holiday" title="Holiday"></div>' : ''}
                ${dayEvents.some(e => e.type === 'feeReminder') ? '<div class="indicator-dot indicator-fee" title="Fee Reminder"></div>' : ''}
                ${note ? '<div class="indicator-dot indicator-note" title="Note"></div>' : ''}
            </div>
        </div>`;
    }

    html += '</div></div>';
    document.getElementById('calendarWidget').innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarMonth += delta;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    } else if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    renderCalendar();
}

function showDayDetails(dateString) {
    const date = new Date(dateString);
    const events = db.getRecords('events').filter(e => e.date === dateString);
    const note = db.getRecords('dayNotes').find(n => n.date === dateString);
    const holiday = indianHolidays2026.find(h => h.date === dateString);
    const batches = db.getRecords('batches');
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const sessions = batches.filter(b => b.schedule && b.schedule.toLowerCase().includes(dayName.substring(0, 3).toLowerCase()));

    let html = `<h4>📌 ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>`;

    if (holiday) {
        html += `<div style="background: rgba(236, 72, 153, 0.1); padding: 10px; border-radius: 8px; margin: 10px 0; border-left: 3px solid var(--holiday);">
            <strong>🇮🇳 ${holiday.name}</strong>
        </div>`;
    }

    if (sessions.length) {
        html += '<div style="margin: 10px 0;"><strong>Batch Sessions:</strong></div>';
        sessions.forEach(s => {
            html += `<div style="background: rgba(14, 165, 233, 0.1); padding: 8px; border-radius: 6px; margin: 5px 0; border-left: 3px solid var(--session); font-size: 13px;">${s.name} - ${s.schedule}</div>`;
        });
    }

    if (events.length) {
        html += '<div style="margin: 10px 0;"><strong>Events:</strong></div>';
        events.forEach(e => {
            html += `<div style="background: var(--bg-primary); padding: 8px; border-radius: 6px; margin: 5px 0; font-size: 13px;">${e.title}</div>`;
        });
    }

    if (note) {
        html += `<div style="margin: 10px 0;"><strong>Note:</strong><div style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 6px; margin-top: 5px; font-size: 13px;">${note.text}</div></div>`;
    }

    if (!holiday && !sessions.length && !events.length && !note) {
        html += '<p style="color: var(--text-secondary); margin-top: 10px; font-size: 13px;">No events for this day</p>';
    }

    document.getElementById('dayDetailsPane').innerHTML = html;
}

function loadIndianHolidays() {
    if (confirm('Add all Indian holidays for 2026?')) {
        indianHolidays2026.forEach(holiday => {
            const existing = db.getRecords('events').find(e => e.date === holiday.date && e.title.includes(holiday.name));
            if (!existing) {
                db.addRecord('events', {
                    title: holiday.name + ' 🇮🇳',
                    date: holiday.date,
                    time: 'All Day',
                    description: 'National Holiday',
                    type: 'holiday'
                });
            }
        });
        showNotification('Holidays loaded!');
        renderCalendar();
        if (window.loadDashboard) loadDashboard();
    }
}

function openEventModal() {
    document.getElementById('eventDate').valueAsDate = new Date();
    openModal('eventModal');
}

function saveEvent(e) {
    if (e) e.preventDefault();
    const event = {
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        description: document.getElementById('eventDescription').value,
        type: 'custom'
    };
    db.addRecord('events', event);
    showNotification('Event added!');
    closeModal('eventModal');
    renderCalendar();
}

function openDayNoteModal() {
    document.getElementById('noteDate').valueAsDate = new Date();
    openModal('dayNoteModal');
}

function saveDayNote(e) {
    if (e) e.preventDefault();
    const note = {
        date: document.getElementById('noteDate').value,
        text: document.getElementById('noteText').value
    };
    db.addRecord('dayNotes', note);
    showNotification('Note saved!');
    closeModal('dayNoteModal');
    renderCalendar();
}
