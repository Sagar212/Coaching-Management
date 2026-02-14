
// Exam Management Logic
function openExamModal() {
    populateBatchDropdown('examBatch');
    openModal('examModal');
}

function saveExam(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('examModal');
    const editId = modal?.dataset.editId;

    const examData = {
        name: document.getElementById('examName').value,
        exam_code: document.getElementById('examCode').value,
        batchId: document.getElementById('examBatch').value,
        subject: document.getElementById('examSubject').value,
        examDate: document.getElementById('examDate').value,
        duration: parseInt(document.getElementById('examDuration').value) || 0,
        totalMarks: parseFloat(document.getElementById('examTotalMarks').value),
        passingMarks: parseFloat(document.getElementById('examPassingMarks').value),
        examType: document.getElementById('examType').value,
        notes: document.getElementById('examNotes').value,
        status: 'scheduled'
    };

    if (editId) {
        db.updateRecord('exams', editId, examData);
        showNotification('Exam updated successfully!');
    } else {
        tuitionManager.createExam(examData);
        showNotification('Exam created successfully!');
    }

    closeModal('examModal');
    loadExams();
}

function editExam(id) {
    const exam = db.getRecords('exams').find(e => e.id === id);
    if (!exam) return;

    populateBatchDropdown('examBatch');
    document.getElementById('examName').value = exam.name;
    document.getElementById('examCode').value = exam.exam_code;
    document.getElementById('examBatch').value = exam.batchId;
    document.getElementById('examSubject').value = exam.subject;
    document.getElementById('examDate').value = exam.examDate;
    document.getElementById('examDuration').value = exam.duration;
    document.getElementById('examTotalMarks').value = exam.totalMarks;
    document.getElementById('examPassingMarks').value = exam.passingMarks;
    document.getElementById('examType').value = exam.examType;
    document.getElementById('examNotes').value = exam.notes || '';

    document.getElementById('examModal').dataset.editId = id;
    openModal('examModal');
}

function deleteExam(id) {
    confirmAction({
        title: 'Delete Exam?',
        message: 'This will remove the exam and all student results associated with it.',
        onConfirm: () => {
            db.deleteRecord('exams', id);
            showNotification('Exam deleted');
            loadExams();
        }
    });
}

function loadExams() {
    const exams = db.getRecords('exams');
    const batches = db.getRecords('batches');

    // Populate batch filter if empty
    const batchFilter = document.getElementById('examBatchFilter');
    if (batchFilter && batchFilter.options.length <= 1) {
        batchFilter.innerHTML = '<option value="">All Batches</option>' + batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    const selectedBatchId = batchFilter?.value;
    const searchText = document.getElementById('examSearch')?.value?.toLowerCase() || '';

    const filtered = exams.filter(e => {
        const matchesBatch = !selectedBatchId || e.batchId === selectedBatchId;
        const matchesSearch = !searchText || e.name.toLowerCase().includes(searchText) || e.exam_code.toLowerCase().includes(searchText);
        return matchesBatch && matchesSearch;
    });

    if (filtered.length === 0) {
        document.getElementById('examsTable').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No exams found matching filters.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Exam Code</th><th>Name</th><th>Batch</th><th>Subject</th><th>Date</th><th>Marks</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    filtered.forEach(exam => {
        const batch = batches.find(b => b.id === exam.batchId);
        const statusClass = exam.status === 'completed' ? 'paid' : exam.status === 'scheduled' ? 'pending' : 'inactive';

        html += `
            <tr>
                <td><strong>${exam.exam_code}</strong></td>
                <td>${exam.name}</td>
                <td>${batch?.name || 'N/A'}</td>
                <td>${exam.subject}</td>
                <td>${new Date(exam.examDate).toLocaleDateString()}</td>
                <td>${exam.totalMarks}</td>
                <td><span class="status-badge ${statusClass}">${exam.status}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="btn btn-small btn-primary" onclick="openMarksEntry('${exam.id}')" title="Capture Marks"><i class="fas fa-file-signature"></i></button>
                        <button class="btn btn-small btn-success" onclick="whatsappResults('${exam.id}')" title="Share Results"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-small btn-secondary" onclick="editExam('${exam.id}')" title="Edit Info"><i class="fas fa-cog"></i></button>
                        <button class="btn btn-small btn-danger" onclick="deleteExam('${exam.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('examsTable').innerHTML = html;
}

function whatsappResults(examId) {
    const exam = db.getRecords('exams').find(e => e.id === examId);
    if (!exam || !exam.results || exam.results.length === 0) {
        showNotification('No results available to share', 'warning');
        return;
    }

    const students = db.getRecords('students');
    const settings = db.getData().settings;

    exam.results.forEach(res => {
        const student = students.find(s => s.id === res.studentId);
        if (student && (student.phone || student.parentPhone)) {
            const status = res.marks >= exam.passingMarks ? 'PASSED ✅' : 'FAILED ❌';
            const message = `📊 *EXAM RESULT: ${exam.name}*\n\nStudent: ${student.name}\nSubject: ${exam.subject}\nMarks: ${res.marks} / ${exam.totalMarks}\nStatus: ${status}\nRemarks: ${res.remarks || '-'}\n\nRegards,\n${settings.name || 'Our Institute'}`;

            tuitionManager.triggerWhatsApp(student.phone || student.parentPhone, message);
        }
    });

    showNotification('Launching WhatsApp for all students...', 'info');
}

function openMarksEntry(examId) {
    const exam = db.getRecords('exams').find(e => e.id === examId);
    if (!exam) return;

    const batch = db.getRecords('batches').find(b => b.id === exam.batchId);
    // Standardize batch identification
    const targetBatchId = exam.batchId;
    const targetBatchName = batch?.name;

    // Find students who are either in the batch.students list OR have this batch in their profile
    const students = db.getRecords('students').filter(s => {
        const hasBatchId = (batch?.students || []).includes(s.id);
        const hasBatchName = (s.batches || []).includes(targetBatchName) || s.batch === targetBatchName;
        return hasBatchId || hasBatchName;
    });

    if (students.length === 0) {
        showNotification('No students found in this batch to capture marks.', 'warning');
        return;
    }

    document.getElementById('marksExamTitle').textContent = exam.name;
    document.getElementById('marksExamDetails').innerHTML = `
        ${exam.subject} | Total Marks: ${exam.totalMarks} | Passing: ${exam.passingMarks}
        <select id="examStatusUpdate" style="margin-left: 20px; padding: 5px; border-radius: 4px; border: 1px solid var(--border-color);">
            <option value="scheduled" ${exam.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="completed" ${exam.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${exam.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
    `;

    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    students.forEach(student => {
        const existingResult = (exam.results || []).find(r => r.studentId === student.id);
        html += `
            <div style="display: flex; gap: 15px; align-items: center; padding: 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <strong>${student.name}</strong>
                    <div style="font-size: 12px; color: var(--text-secondary);">${student.student_code || student.rollNumber || ''}</div>
                </div>
                <div style="width: 120px;">
                    <input type="number" class="marks-input" data-student-id="${student.id}" 
                           placeholder="Marks" min="0" max="${exam.totalMarks}" 
                           value="${existingResult?.marks || ''}"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;">
                </div>
                <div style="width: 200px;">
                    <input type="text" class="remarks-input" data-student-id="${student.id}" 
                           placeholder="Remarks (optional)" 
                           value="${existingResult?.remarks || ''}"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;">
                </div>
            </div>
        `;
    });
    html += '</div>';

    document.getElementById('marksStudentList').innerHTML = html;
    document.getElementById('marksModal').dataset.examId = examId;
    openModal('marksModal');
}

function saveAllMarks() {
    const examId = document.getElementById('marksModal').dataset.examId;
    const marksInputs = document.querySelectorAll('.marks-input');
    const remarksInputs = document.querySelectorAll('.remarks-input');

    const results = [];
    const newStatus = document.getElementById('examStatusUpdate').value;

    marksInputs.forEach((input, index) => {
        const marks = parseFloat(input.value);
        if (!isNaN(marks)) {
            results.push({
                studentId: input.dataset.studentId,
                marks: marks,
                remarks: remarksInputs[index].value
            });
        }
    });

    if (results.length === 0) {
        showNotification('Please enter marks for at least one student', 'warning');
        return;
    }

    tuitionManager.enterMarks(examId, results, newStatus);
    closeModal('marksModal');
    loadExams();
    showNotification('Marks and Status saved successfully!');
}

function viewExamAnalytics(examId) {
    const analytics = tuitionManager.getExamAnalytics(examId);
    if (!analytics) {
        showNotification('No results available for this exam', 'warning');
        return;
    }

    const html = `
        <div class="analytics-view">
            <h4 style="margin-bottom: 5px;">${analytics.examName}</h4>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Total Students Attempted: ${analytics.totalStudents}</p>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid var(--success);">
                    <div style="font-size: 24px; font-weight: bold; color: var(--success);">${analytics.passed}</div>
                    <div style="font-size: 13px; font-weight: 600;">Passed</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid var(--danger);">
                    <div style="font-size: 24px; font-weight: bold; color: var(--danger);">${analytics.failed}</div>
                    <div style="font-size: 13px; font-weight: 600;">Failed</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
                 <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; text-align: center; border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--primary); font-size: 12px; text-transform: uppercase;">Average</div>
                    <div style="font-size: 18px; margin-top: 5px;">${analytics.averageMarks}</div>
                 </div>
                 <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; text-align: center; border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--success); font-size: 12px; text-transform: uppercase;">Highest</div>
                    <div style="font-size: 18px; margin-top: 5px;">${analytics.highestMarks}</div>
                 </div>
                 <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; text-align: center; border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--danger); font-size: 12px; text-transform: uppercase;">Lowest</div>
                    <div style="font-size: 18px; margin-top: 5px;">${analytics.lowestMarks}</div>
                 </div>
            </div>

            <div style="text-align: center;">
                <div style="width: 100%; height: 10px; background: var(--bg-secondary); border-radius: 5px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${analytics.passPercentage}%; height: 100%; background: var(--success);"></div>
                </div>
                <p style="font-size: 13px; font-weight: 500;">Pass Percentage: <span style="color: var(--success);">${analytics.passPercentage}%</span></p>
            </div>
        </div>
    `;

    document.getElementById('examAnalyticsContent').innerHTML = html;
    openModal('examAnalyticsModal');
}

function filterExams() {
    const search = document.getElementById('examSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#examsTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}
