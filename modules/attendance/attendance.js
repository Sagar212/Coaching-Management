
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

let attendanceBatchChartInstance = null;
function updateAttendanceChart(records) {
    const ctx = document.getElementById('attendanceBatchChart');
    if (!ctx) return;

    const labels = records.map(r => new Date(r.date).toLocaleDateString()).reverse().slice(-7);
    const data = records.map(r => r.present.length).reverse().slice(-7);

    if (attendanceBatchChartInstance) attendanceBatchChartInstance.destroy();

    attendanceBatchChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Students Present',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
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
