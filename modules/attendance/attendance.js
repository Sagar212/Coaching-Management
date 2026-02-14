
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
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Present Count</th>
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
                                <button class="btn btn-secondary btn-small" onclick="editAttendance('${r.id}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-danger btn-small" onclick="deleteAttendance('${r.id}')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No attendance records found for this batch.</p>';
    }
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
