
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
    if (typeof tuitionManager !== 'undefined' && tuitionManager.syncFeeRemindersToEvents) {
        tuitionManager.syncFeeRemindersToEvents();
    }
    renderCalendar();
}


// --- Helper for Session Actions ---
function toggleRescheduleFields() {
    const type = document.getElementById('sessionActionType').value;
    const fields = document.getElementById('rescheduleFields');
    fields.style.display = type === 'rescheduled' ? 'block' : 'none';
}

function manageSession(batchId, dateString, batchName) {
    document.getElementById('sessionBatchName').textContent = batchName;
    document.getElementById('sessionOriginalDate').textContent = `Original Session: ${new Date(dateString).toLocaleDateString()}`;
    document.getElementById('sessionActionBatchId').value = batchId;
    document.getElementById('sessionActionDate').value = dateString;
    document.getElementById('sessionActionType').value = 'cancelled';
    toggleRescheduleFields();
    document.getElementById('sessionActionReason').value = '';

    openModal('sessionActionModal');
}

function saveSessionAdjustment(e) {
    e.preventDefault();
    const batchId = document.getElementById('sessionActionBatchId').value;
    const originalDate = document.getElementById('sessionActionDate').value;
    const type = document.getElementById('sessionActionType').value;
    const reason = document.getElementById('sessionActionReason').value;

    const adjustment = {
        batchId,
        originalDate, // The scheduled date
        type,         // 'cancelled' or 'rescheduled'
        reason,
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
    };

    if (type === 'rescheduled') {
        adjustment.newDate = document.getElementById('sessionNewDate').value;
        adjustment.newTime = document.getElementById('sessionNewTime').value;
        if (!adjustment.newDate) {
            showNotification('Please select a new date', 'error');
            return;
        }
    }

    if (typeof tuitionManager !== 'undefined') {
        tuitionManager.recordSessionAdjustment(adjustment);
        showNotification('Session updated successfully!');
        closeModal('sessionActionModal');
        renderCalendar();
        if (typeof loadDashboard === 'function') loadDashboard();
    }
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
    const adjustments = db.getRecords('batch_adjustments') || [];
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

        // 1. Regular Schedule
        let scheduledBatches = batches.filter(b => b.schedule && b.schedule.toLowerCase().includes(dayShort));

        // 2. Apply Adjustments (Filter out cancelled/rescheduled-from)
        const effectiveBatches = scheduledBatches.filter(b => {
            const adj = adjustments.find(a => a.batchId === b.id && a.originalDate === dateString);
            return !adj;
        });

        // 3. Add Rescheduled-To Sessions
        const rescheduledToHere = adjustments.filter(a => a.type === 'rescheduled' && a.newDate === dateString);

        const totalSessionCount = effectiveBatches.length + rescheduledToHere.length;
        const hasSession = totalSessionCount > 0;

        if (hasSession) classes.push('session');

        const dayEvents = events.filter(e => e.date === dateString);
        const note = dayNotes.find(n => n.date === dateString);

        html += `<div class="${classes.join(' ')}" onclick="showDayDetails('${dateString}')">
            <div class="date-number">${day}</div>
            <div class="calendar-indicators">
                ${totalSessionCount ? `<div class="indicator-pill batch-pill" title="${totalSessionCount} Batches">${totalSessionCount} Classes</div>` : ''}
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
    const adjustments = db.getRecords('batch_adjustments') || [];
    const attendance = db.getRecords('attendance').filter(a => a.date === dateString);

    // Determine Sessions
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const standardSessions = batches.filter(b => b.schedule && b.schedule.toLowerCase().includes(dayName.substring(0, 3).toLowerCase()));

    // Rescheduled TO here
    const rescheduledToHere = adjustments.filter(a => a.type === 'rescheduled' && a.newDate === dateString);

    let html = `<h4>📌 ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>`;

    if (holiday) {
        html += `<div style="background: rgba(236, 72, 153, 0.1); padding: 10px; border-radius: 8px; margin: 10px 0; border-left: 3px solid var(--holiday);">
            <strong>🇮🇳 ${holiday.name}</strong>
        </div>`;
    }

    if (attendance.length) {
        html += '<div style="margin: 10px 0;"><strong>Attendance Records:</strong></div>';
        attendance.forEach(a => {
            const batch = batches.find(b => b.id === (a.batchId || a.batch));
            const presentCount = (a.present || []).length;
            const totalInBatch = (batch?.students || []).length;
            const absentCount = totalInBatch - presentCount;

            html += `
                <div style="background: var(--bg-secondary); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${batch?.name || 'Unknown Batch'}</strong>
                        <span style="font-size: 11px; color: var(--text-secondary);">${a.markedBy || 'Admin'}</span>
                    </div>
                    <div style="display: flex; gap: 10px; font-size: 12px;">
                        <span style="color: var(--success);"><i class="fas fa-check-circle"></i> ${presentCount} Present</span>
                        <span style="color: var(--danger);"><i class="fas fa-times-circle"></i> ${absentCount > 0 ? absentCount : 0} Absent</span>
                    </div>
                </div>
            `;
        });
    }

    // --- SESSIONS DISPLAY ---
    if (standardSessions.length || rescheduledToHere.length) {
        html += '<div style="margin: 10px 0;"><strong>Scheduled Batches:</strong></div>';

        // 1. Standard (Check for cancellations/moves)
        standardSessions.forEach(s => {
            const adj = adjustments.find(a => a.batchId === s.id && a.originalDate === dateString);

            if (adj) {
                // Cancelled or Moved FROM here
                if (adj.type === 'cancelled') {
                    html += `
                        <div style="background: var(--bg-secondary); padding: 8px; border-radius: 6px; margin: 5px 0; border-left: 3px solid var(--danger); opacity: 0.7;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <div style="text-decoration: line-through;">${s.name}</div>
                                    <div style="font-size: 11px; color: var(--danger);">🚫 Cancelled: ${adj.reason || 'No reason'}</div>
                                </div>
                                <button class="btn btn-small btn-secondary" style="font-size: 10px;" onclick="manageSession('${s.id}', '${dateString}', '${s.name}')">Edit</button>
                            </div>
                        </div>`;
                } else if (adj.type === 'rescheduled') {
                    html += `
                        <div style="background: var(--bg-secondary); padding: 8px; border-radius: 6px; margin: 5px 0; border-left: 3px solid var(--warning); opacity: 0.7;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <div style="text-decoration: line-through;">${s.name}</div>
                                    <div style="font-size: 11px; color: var(--warning);">🗓️ Rescheduled to ${new Date(adj.newDate).toLocaleDateString()}</div>
                                </div>
                                <button class="btn btn-small btn-secondary" style="font-size: 10px;" onclick="manageSession('${s.id}', '${dateString}', '${s.name}')">Edit</button>
                            </div>
                        </div>`;
                }
            } else {
                // Active Session
                html += `
                <div style="background: rgba(14, 165, 233, 0.1); padding: 8px; border-radius: 6px; margin: 5px 0; border-left: 3px solid var(--session);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px;">${s.name} <span style="color:var(--text-secondary)">${s.schedule}</span></div>
                        <button class="btn btn-small btn-secondary" title="Cancel/Reschedule" style="padding: 2px 6px;" onclick="manageSession('${s.id}', '${dateString}', '${s.name}')">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>`;
            }
        });

        // 2. Rescheduled TO here
        rescheduledToHere.forEach(adj => {
            const batch = batches.find(b => b.id === adj.batchId);
            const name = batch ? batch.name : 'Unknown Batch';
            html += `
                <div style="background: rgba(99, 102, 241, 0.1); padding: 8px; border-radius: 6px; margin: 5px 0; border-left: 3px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">${name}</div>
                            <div style="font-size: 11px; color: var(--primary);">Rescheduled from ${new Date(adj.originalDate).toLocaleDateString()}</div>
                             ${adj.newTime ? `<div style="font-size: 11px;">⏰ ${adj.newTime}</div>` : ''}
                        </div>
                    </div>
                </div>`;
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

    if (!holiday && !standardSessions.length && !rescheduledToHere.length && !events.length && !note && !attendance.length) {
        html += '<p style="color: var(--text-secondary); margin-top: 10px; font-size: 13px;">No activities or records for this day</p>';
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
