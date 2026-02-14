
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

function viewExamAnalytics(id) {
    const exam = db.getRecords('exams').find(e => e.id === id);
    if (!exam || !exam.results) {
        showNotification('No data for this exam', 'warning');
        return;
    }

    const analytics = tuitionManager.getExamAnalytics(id);
    const results = exam.results;
    const marks = results.map(r => r.marks).sort((a, b) => b - a);

    // Performance Tiers
    const topPerformers = results.filter(r => r.marks >= exam.totalMarks * 0.9).length;
    const averagePerformers = results.filter(r => r.marks < exam.totalMarks * 0.9 && r.marks >= exam.passingMarks).length;
    const needsAttention = results.filter(r => r.marks < exam.passingMarks).length;

    const html = `
        <div class="analytics-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid var(--border-color); padding-bottom: 15px;">
                <div>
                    <h2 style="margin: 0; color: var(--primary);">${exam.name}</h2>
                    <p style="color: var(--text-secondary); margin-top: 4px;">${exam.subject} | Total: ${exam.totalMarks} | Pass: ${exam.passingMarks}</p>
                </div>
                <div style="text-align: right;">
                    <span class="status-badge paid" style="font-size: 14px; padding: 8px 15px;">${analytics.passPercentage}% Success Rate</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                <div class="stat-box" style="background: var(--bg-secondary); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Average</div>
                    <div style="font-size: 22px; font-weight: 800; color: var(--primary);">${analytics.averageMarks}</div>
                </div>
                <div class="stat-box" style="background: var(--bg-secondary); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Highest</div>
                    <div style="font-size: 22px; font-weight: 800; color: var(--success);">${analytics.highestMarks}</div>
                </div>
                <div class="stat-box" style="background: var(--bg-secondary); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Passed</div>
                    <div style="font-size: 22px; font-weight: 800; color: #10b981;">${analytics.passed}</div>
                </div>
                <div class="stat-box" style="background: var(--bg-secondary); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Failed</div>
                    <div style="font-size: 22px; font-weight: 800; color: #ef4444;">${analytics.failed}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 20px;">
                <div class="card" style="margin-bottom: 0;">
                    <h4 style="margin-bottom: 15px; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">Score Distribution</h4>
                    <div style="height: 250px;">
                        <canvas id="examDistributionChart"></canvas>
                    </div>
                </div>
                <div class="card" style="margin-bottom: 0;">
                    <h4 style="margin-bottom: 15px; font-size: 14px; text-transform: uppercase; color: var(--text-secondary);">Student Tiers</h4>
                    <div style="height: 250px;">
                        <canvas id="examTiersChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('examAnalyticsContent').innerHTML = html;
    openModal('examAnalyticsModal');

    // Render Charts
    setTimeout(() => {
        const ctxDist = document.getElementById('examDistributionChart');
        const ctxTiers = document.getElementById('examTiersChart');

        new Chart(ctxDist, {
            type: 'bar',
            data: {
                labels: results.slice(0, 5).map((r, i) => `Top ${i + 1}`),
                datasets: [{
                    label: 'Score',
                    data: marks.slice(0, 5),
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'var(--primary)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        new Chart(ctxTiers, {
            type: 'doughnut',
            data: {
                labels: ['Top (>90%)', 'Pass', 'Fail'],
                datasets: [{
                    data: [topPerformers, averagePerformers, needsAttention],
                    backgroundColor: ['#10b981', '#6366f1', '#ef4444'],
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 300);
}

function filterExams() {
    const search = document.getElementById('examSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#examsTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}
