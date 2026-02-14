
// Attendance Management Logic
function loadAttendancePage() {
    const batches = db.getRecords('batches');
    const select = document.getElementById('attendanceBatchSelect');
    if (select) {
        select.innerHTML = '<option value="">Select Batch</option>' + batches.map(b =>
            `<option value="${b.name}">${b.name}</option>`
        ).join('');
    }
}

function showAttendanceForm() {
    const batches = db.getRecords('batches');
    const select = document.getElementById('attendanceFormBatch');
    if (select) {
        select.innerHTML = '<option value="">Select Batch</option>' + batches.map(b =>
            `<option value="${b.name}">${b.name}</option>`
        ).join('');
    }
    document.getElementById('attendanceDate').valueAsDate = new Date();
    if (document.getElementById('attendanceStudentList')) {
        document.getElementById('attendanceStudentList').innerHTML = '';
    }
    openModal('attendanceModal');
}

function loadStudentsForAttendance() {
    const batchName = document.getElementById('attendanceFormBatch').value;
    const students = db.getRecords('students').filter(s => (s.batches && s.batches.includes(batchName)) || s.batch === batchName);
    const list = document.getElementById('attendanceStudentList');
    if (list) {
        list.innerHTML = students.length ? students.map(s => `
            <div style="padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span>${s.name}</span>
                <label>
                    <input type="checkbox" name="attendance_${s.id}" value="${s.id}" checked> Present
                </label>
            </div>
        `).join('') : '<p style="color: var(--text-secondary);">No students in this batch</p>';
    }
}

function saveAttendance(e) {
    if (e) e.preventDefault();
    const batch = document.getElementById('attendanceFormBatch').value;
    const date = document.getElementById('attendanceDate').value;
    const checkboxes = document.querySelectorAll('[name^="attendance_"]');
    const present = [];
    checkboxes.forEach(cb => {
        if (cb.checked) present.push(cb.value);
    });

    tuitionManager.markAttendance(batch, date, present);
    showNotification('Attendance records synchronized!');
    closeModal('attendanceModal');
    loadAttendanceData();
}

function loadAttendanceData() {
    const batch = document.getElementById('attendanceBatchSelect').value;
    const records = db.getRecords('attendance').filter(a => a.batch === batch);
    const table = document.getElementById('attendanceTable');

    if (table) {
        table.innerHTML = records.length ? `
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start;">
                <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 0;">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Present</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => `
                                <tr>
                                    <td><strong>${new Date(r.date).toLocaleDateString()}</strong></td>
                                    <td>${r.present.length} Students</td>
                                    <td><span class="status-badge paid">Recorded</span></td>
                                    <td>
                                        <div class="row-actions">
                                            <button class="btn btn-secondary btn-small" onclick="editAttendance('${r.id}')"><i class="fas fa-edit"></i></button>
                                            <button class="btn btn-danger btn-small" onclick="deleteAttendance('${r.id}')"><i class="fas fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card" style="margin-bottom: 0;">
                    <h4 style="margin-bottom: 15px; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">Attendance Trend</h4>
                    <div style="height: 250px;">
                        <canvas id="attendanceBatchChart"></canvas>
                    </div>
                </div>
            </div>
        ` : '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No attendance records found for this batch.</p>';

        if (records.length) {
            updateAttendanceChart(records);
        }
    }
}

// Global variable to store chart records for click handler access
let currentChartRecords = [];

function updateAttendanceChart(records) {
    const ctx = document.getElementById('attendanceBatchChart');
    if (!ctx) return;

    // Sort by date (chronological) for the chart
    currentChartRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);

    const labels = currentChartRecords.map(r => new Date(r.date).toLocaleDateString());
    const data = currentChartRecords.map(r => r.present.length);

    if (attendanceBatchChartInstance) attendanceBatchChartInstance.destroy();

    attendanceBatchChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Students Present',
                data: data,
                backgroundColor: '#6366f1',
                borderRadius: 4,
                hoverBackgroundColor: '#4f46e5'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            return 'Click bar to view absentees';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [2, 2], color: '#e2e8f0' },
                    ticks: { precision: 0 }
                },
                x: { grid: { display: false } }
            },
            onClick: (e, activeElements, chart) => {
                if (activeElements.length > 0) {
                    const firstPoint = activeElements[0];
                    const index = firstPoint.index;
                    // Ensure we're accessing the correct record based on the sorted data used for the chart
                    if (currentChartRecords && currentChartRecords[index]) {
                        showAbsentees(currentChartRecords[index]);
                    }
                }
            }
        }
    });
}

function showAbsentees(record) {
    const students = db.getRecords('students');
    const batchId = record.batch || record.batchId;

    // Find all students who should be in this batch
    // Using loose string matching for batch names/ids as sometimes names are stored
    const batchStudents = students.filter(s => {
        if (s.batches && Array.isArray(s.batches)) {
            return s.batches.includes(batchId);
        }
        return s.batch === batchId;
    });

    // Find absentees
    const absentStudents = batchStudents.filter(s => !record.present.includes(s.id));

    // Populate Modal
    const dateStr = new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('absenteeDate').textContent = dateStr;
    document.getElementById('absenteeBatch').textContent = `Batch: ${batchId} | ${absentStudents.length} Absent / ${batchStudents.length} Total`;

    const list = document.getElementById('absenteeList');
    if (list) {
        list.innerHTML = absentStudents.length ? absentStudents.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px;">
                        ${s.name.charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 14px;">${s.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${s.phone || 'No Phone'}</div>
                    </div>
                </div>
                <a href="https://wa.me/${(s.phone || s.parentPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent('Dear Parent, ' + s.name + ' was absent for the class on ' + dateStr + '.')}" 
                   target="_blank" 
                   class="btn btn-small"
                   style="background: #25d366; color: white; border: none; padding: 6px 10px; display: flex; gap: 5px; align-items: center;">
                   <i class="fab fa-whatsapp"></i> Notify
                </a>
            </div>
        `).join('') : `
            <div style="text-align: center; padding: 30px; color: var(--success);">
                <i class="fas fa-check-circle" style="font-size: 30px; margin-bottom: 10px;"></i>
                <p>100% Attendance! No absentees.</p>
            </div>
        `;
    }

    openModal('absenteeModal');
}


function editAttendance(id) {
    const record = db.getRecords('attendance').find(a => a.id === id);
    if (!record) return;

    showAttendanceForm();
    document.getElementById('attendanceFormBatch').value = record.batch || record.batchId;
    document.getElementById('attendanceDate').value = record.date;
    loadStudentsForAttendance();

    // Check the present students
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('[name^="attendance_"]');
        checkboxes.forEach(cb => {
            cb.checked = record.present.includes(cb.value);
        });
    }, 100);
}

function deleteAttendance(id) {
    confirmAction({
        title: 'Delete Attendance?',
        message: 'This will permanently remove the attendance record for this day.',
        onConfirm: () => {
            db.deleteRecord('attendance', id);
            showNotification('Record removed!');
            loadAttendanceData();
        }
    });
}
