// Dashboard Logic
function loadDashboard() {
    const students = db.getRecords('students');
    const batches = db.getRecords('batches');
    const events = db.getRecords('events');
    const homework = db.getRecords('homework');
    const syllabus = db.getRecords('syllabus');
    const tutors = db.getRecords('tutors');
    const payments = db.getRecords('payments');

    const totalFees = students.reduce((sum, s) => sum + (parseFloat(s.totalFee) || 0), 0);
    const collectedFees = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const pendingFees = totalFees - collectedFees;

    const dashboardStats = document.getElementById('dashboardStats');
    if (dashboardStats) {
        const collectedDisplay = collectedFees >= 1000 ? `₹${(collectedFees / 1000).toFixed(1)}K` : `₹${collectedFees}`;
        const pendingDisplay = pendingFees >= 1000 ? `₹${(pendingFees / 1000).toFixed(1)}K` : `₹${pendingFees}`;

        dashboardStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon students">👨‍🎓</div>
                <div class="stat-value">${students.length}</div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon batches">🎯</div>
                <div class="stat-value">${batches.length}</div>
                <div class="stat-label">Active Batches</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon fees">💰</div>
                <div class="stat-value" style="color: var(--success);">${collectedDisplay}</div>
                <div class="stat-label">Fees Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">💸</div>
                <div class="stat-value" style="color: var(--danger);">${pendingDisplay}</div>
                <div class="stat-label">Pending Balance</div>
            </div>
        `;
    }

    // Recent Homework
    const recentHW = homework.slice(-5).reverse();
    const recentHomeworkEl = document.getElementById('recentHomework');
    if (recentHomeworkEl) {
        recentHomeworkEl.innerHTML = recentHW.length ? recentHW.map(h => `
            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid var(--primary);">
                <div style="font-weight: 600;">${h.title}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                    ${h.batch} | Due: ${new Date(h.dueDate).toLocaleDateString()}
                </div>
            </div>
        `).join('') : '<p style="color: var(--text-secondary);">No homework assigned</p>';
    }

    // Syllabus Progress
    const syllabusProgressEl = document.getElementById('syllabusProgress');
    if (syllabusProgressEl) {
        syllabusProgressEl.innerHTML = syllabus.length ? syllabus.slice(0, 5).map(s => {
            const batch = batches.find(b => b.id === s.batchId);
            const progress = s.status === 'completed' ? 100 : s.status === 'in-progress' ? 50 : 0;
            return `
                <div class="syllabus-progress-item">
                    <div class="progress-header">
                        <div><strong>${batch?.name || 'Unknown'}</strong> - ${s.subject}</div>
                        <div><strong>${progress}%</strong></div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('') : '<p style="color: var(--text-secondary);">No syllabus data</p>';
    }

    // Fee Reminders
    const today = new Date();
    const daysAhead = parseInt(document.getElementById('dashboardFeeFilter')?.value || 7);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);

    const upcomingFeeReminders = events.filter(e => {
        if (e.type !== 'feeReminder') return false;
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= futureDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const feeRemindersEl = document.getElementById('feeReminders');
    if (feeRemindersEl) {
        feeRemindersEl.innerHTML = upcomingFeeReminders.length ? upcomingFeeReminders.slice(0, 5).map(r => `
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--warning); padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; font-size: 13px;">${r.title}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">
                    ${new Date(r.date).toLocaleDateString()}
                </div>
            </div>
        `).join('') : '<p style="color: var(--text-secondary); font-size: 13px;">No reminders</p>';
    }

    // Holidays (Requires global indianHolidays2026 or fetch from DB/TuitionManager)
    // Assuming indianHolidays2026 is loaded globally or we need to define it here?
    // It was defined in index.html. We should move it to a shared place or inside calendar.
    // For now, check if exists, else empty.
    const holidays = (typeof indianHolidays2026 !== 'undefined') ? indianHolidays2026 : [];
    const upcomingHolidays = holidays.filter(h => new Date(h.date) >= today).slice(0, 4);

    const upcomingHolidaysEl = document.getElementById('upcomingHolidays');
    if (upcomingHolidaysEl) {
        upcomingHolidaysEl.innerHTML = upcomingHolidays.length ? upcomingHolidays.map(h => `
            <div style="background: rgba(236, 72, 153, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 6px;">
                <div style="font-weight: 600; font-size: 13px;">${h.name} 🇮🇳</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">
                    ${new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
            </div>
        `).join('') : '<p style="color: var(--text-secondary); font-size: 13px;">No upcoming holidays</p>';
    }

    // Batch Sessions
    const batchDays = parseInt(document.getElementById('dashboardDaysFilter')?.value || 7);
    const sessions = [];
    for (let i = 0; i < batchDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkDate.getDay()];
        batches.forEach(b => {
            if (b.schedule && b.schedule.toLowerCase().includes(dayName.substring(0, 3).toLowerCase())) {
                sessions.push({ batch: b, date: checkDate.toISOString().split('T')[0], dayName: dayName });
            }
        });
    }

    const upcomingBatchesEl = document.getElementById('upcomingBatches');
    if (upcomingBatchesEl) {
        upcomingBatchesEl.innerHTML = sessions.length ? sessions.slice(0, 8).map(s => `
            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid var(--session);">
                <div style="display: flex; justify-content: space-between;">
                    <strong style="font-size: 13px;">${s.batch.name}</strong>
                    <span style="font-size: 12px; color: var(--text-secondary);">${s.batch.schedule}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                    ${new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
            </div>
        `).join('') : '<p style="color: var(--text-secondary);">No sessions</p>';
    }

    // Recent Students - Compact
    const recentStudents = students.slice(-5).reverse();
    const recentStudentsTable = document.getElementById('recentStudentsTable');
    if (recentStudentsTable) {
        recentStudentsTable.innerHTML = recentStudents.length ? `
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Batches</th>
                        <th>Standard</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentStudents.map(s => `
                        <tr>
                            <td>
                                <div class="student-card">
                                    <div class="student-avatar">
                                        ${s.profilePic ? `<img src="${s.profilePic}">` : s.name.charAt(0)}
                                    </div>
                                    <div class="compact-student-info">
                                        <strong>${s.name}</strong>
                                        ${s.parentPhone}
                                    </div>
                                </div>
                            </td>
                            <td style="font-size: 12px;">${s.batches ? s.batches.slice(0, 2).join(', ') : 'N/A'}</td>
                            <td style="font-size: 12px;">${s.class || 'N/A'}</td>
                            <td><span class="status-badge ${s.paidAmount >= s.totalFee ? 'paid' : 'pending'}">
                                ${s.paidAmount >= s.totalFee ? 'Paid' : 'Pending'}
                            </span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary);">No students enrolled</p>';
    }

    // Recent Payments
    const recentPayments = payments.slice(-5).reverse();
    const recentPaymentsEl = document.getElementById('recentPayments');
    if (recentPaymentsEl) {
        recentPaymentsEl.innerHTML = recentPayments.length ? recentPayments.map(p => {
            const student = students.find(s => s.id === p.studentId);
            return `
            <div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between;">
                    <div style="font-weight: 600; font-size: 13px;">${student ? student.name : 'Unknown'}</div>
                    <div style="font-weight: 600; color: var(--success); font-size: 13px;">₹${p.amount}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px;">
                    <div style="font-size: 11px; color: var(--text-secondary);">
                        ${new Date(p.date).toLocaleDateString()} | ${p.mode}
                    </div>
                    <div style="display: flex; gap: 5px;">
                         <button class="btn btn-small btn-secondary disabled" title="Edit via Fees Page" style="padding: 2px 6px; font-size: 10px; opacity: 0.5;"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            </div>
        `}).join('') : '<p style="color: var(--text-secondary); font-size: 13px;">No payments yet</p>';
    }
}

// Export? No need, plain script.
