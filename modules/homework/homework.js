
// Homework Templates Data
const homeworkTemplates = {
    ssc_math: {
        title: "SSC Mathematics - Pattern 2026",
        description: "Practice Set for current chapter based on SSC Board pattern. Focus on 3 marks and 4 marks questions.",
        subject: "Mathematics"
    },
    ssc_sci: {
        title: "SSC Science - Board Pattern Assignment",
        description: "Conceptual questions and diagram labeling based on board exam requirements. Include MCQ section.",
        subject: "Science"
    },
    case_study: {
        title: "Critical Analysis: Case-Based Study",
        description: "Analyze the provided scenario and answer the application-based questions. Focus on practical implications.",
        subject: "General Study"
    },
    revision: {
        title: "Quick Revision Capsule",
        description: "Important formula list and 5 high-yield numerical problems for quick revision.",
        subject: "Revision"
    }
};

function applyHomeworkTemplate() {
    const templateKey = document.getElementById('homeworkTemplateSelect').value;
    if (!templateKey || !homeworkTemplates[templateKey]) return;

    const t = homeworkTemplates[templateKey];
    document.getElementById('homeworkTitle').value = t.title;
    if (t.subject) document.getElementById('homeworkSubject').value = t.subject;
    document.getElementById('homeworkDescription').value = t.description;
}

// Homework Management Logic
function loadHomework() {
    const homework = db.getRecords('homework') || [];
    const batches = db.getRecords('batches');
    const filterBatchId = document.getElementById('homeworkBatchFilter')?.value || '';

    // Populate batch filter dropdown if empty
    const batchFilter = document.getElementById('homeworkBatchFilter');
    if (batchFilter && batchFilter.children.length <= 1) {
        batchFilter.innerHTML = '<option value="">All Batches</option>';
        batches.forEach(batch => {
            batchFilter.innerHTML += `<option value="${batch.name}">${batch.name}</option>`;
        });
    }

    // Filter homework by batch if selected
    let filteredHomework = homework;
    if (filterBatchId) {
        filteredHomework = homework.filter(h => h.batch === filterBatchId);
    }

    // Sort by due date descending
    filteredHomework.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    const tableEl = document.getElementById('homeworkTable');
    if (!tableEl) return;

    if (filteredHomework.length === 0) {
        tableEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No homework assignments found.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Title</th><th>Subject</th><th>Batch</th><th>Due Date</th><th>Actions</th></tr></thead><tbody>';

    filteredHomework.forEach(h => {
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${h.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${h.description || ''}</div>
                </td>
                <td>${h.subject}</td>
                <td><span class="batch-badge">${h.batch}</span></td>
                <td>${new Date(h.dueDate).toLocaleDateString()}</td>
                <td>
                    <div class="row-actions">
                        <button class="btn btn-info btn-small" onclick="trackHomework('${h.id}')" title="Track Submissions"><i class="fas fa-tasks"></i></button>
                        <button class="btn btn-success btn-small" onclick="notifyHomework('${h.id}')" title="Share via WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-secondary btn-small" onclick="editHomework('${h.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteHomework('${h.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tableEl.innerHTML = html;
}

function openHomeworkModal(id = null) {
    const batches = db.getRecords('batches');
    const select = document.getElementById('homeworkBatch');
    select.innerHTML = '<option value="">Select Batch...</option>' + batches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

    const modal = document.getElementById('homeworkModal');
    if (id) {
        const h = db.getRecords('homework').find(x => x.id === id);
        if (h) {
            document.getElementById('homeworkTitle').value = h.title;
            document.getElementById('homeworkSubject').value = h.subject;
            document.getElementById('homeworkBatch').value = h.batch;
            document.getElementById('homeworkDueDate').value = h.dueDate;
            document.getElementById('homeworkDescription').value = h.description || '';
            modal.dataset.editId = id;
        }
    } else {
        document.getElementById('homeworkForm').reset();
        delete modal.dataset.editId;
    }
    openModal('homeworkModal');
}

function editHomework(id) {
    openHomeworkModal(id);
}

function saveHomework(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('homeworkModal');
    const editId = modal?.dataset.editId;

    const homework = {
        title: document.getElementById('homeworkTitle').value,
        subject: document.getElementById('homeworkSubject').value,
        batch: document.getElementById('homeworkBatch').value,
        dueDate: document.getElementById('homeworkDueDate').value,
        description: document.getElementById('homeworkDescription').value,
        assignedDate: new Date().toISOString()
    };

    if (editId) {
        db.updateRecord('homework', editId, homework);
        showNotification('Homework updated successfully!');
    } else {
        db.addRecord('homework', homework);
        showNotification('Homework assigned successfully!');
    }

    closeModal('homeworkModal');
    loadHomework();
    if (typeof loadDashboard === 'function') loadDashboard();
}

// Individual Tracking Logic
let currentTrackingHwId = null;

function trackHomework(id) {
    const h = db.getRecords('homework').find(x => x.id === id);
    if (!h) return;

    currentTrackingHwId = id;
    const students = db.getRecords('students').filter(s =>
        (s.batches && s.batches.includes(h.batch)) || s.batch === h.batch
    );

    const submissions = db.getRecords('homework_submissions').filter(s => s.homeworkId === id);

    document.getElementById('hwTrackTitle').textContent = h.title;
    document.getElementById('hwTrackBatch').textContent = `Batch: ${h.batch} | Students: ${students.length}`;

    let html = '';
    if (students.length === 0) {
        html = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No students enrolled in this batch.</p>';
    } else {
        students.forEach(s => {
            const sub = submissions.find(x => x.studentId === s.id);
            const status = sub ? sub.status : 'pending';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
                     <div>
                        <strong>${s.name}</strong>
                        <div style="font-size: 11px; color: var(--text-secondary);">${s.rollNumber || 'No Roll #'}</div>
                     </div>
                     <select class="hw-status-select" data-student-id="${s.id}" style="padding: 5px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 12px;">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="submitted" ${status === 'submitted' ? 'selected' : ''}>Submitted</option>
                        <option value="reviewed" ${status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                        <option value="late" ${status === 'late' ? 'selected' : ''}>Late Submission</option>
                     </select>
                </div>
            `;
        });
    }

    document.getElementById('hwStudentStatusList').innerHTML = html;
    openModal('homeworkStatusModal');
}

function saveHomeworkTracking() {
    if (!currentTrackingHwId) return;

    const selects = document.querySelectorAll('.hw-status-select');
    const existingSubmissions = db.getRecords('homework_submissions');

    selects.forEach(sel => {
        const studentId = sel.dataset.studentId;
        const status = sel.value;
        const existingId = existingSubmissions.find(x => x.homeworkId === currentTrackingHwId && x.studentId === studentId)?.id;

        const subData = {
            homeworkId: currentTrackingHwId,
            studentId,
            status,
            updatedAt: new Date().toISOString()
        };

        if (existingId) {
            db.updateRecord('homework_submissions', existingId, subData);
        } else {
            db.addRecord('homework_submissions', subData);
        }
    });

    showNotification('Homework tracking saved!');
    closeModal('homeworkStatusModal');
}

function deleteHomework(id) {
    confirmAction({
        title: 'Delete Assignment?',
        message: 'This will remove the homework assignment and its tracking data.',
        onConfirm: () => {
            db.deleteRecord('homework', id);
            loadHomework();
            showNotification('Homework deleted!');
        }
    });
}

function shareHomeworkGroup() {
    const homework = db.getRecords('homework') || [];
    const filterBatchId = document.getElementById('homeworkBatchFilter')?.value || '';

    let filtered = homework;
    if (filterBatchId) {
        filtered = homework.filter(h => h.batch === filterBatchId);
    }

    if (filtered.length === 0) {
        showNotification('No homework to share', 'warning');
        return;
    }

    const text = filtered.map(h => `📝 *${h.title}*\nSubject: ${h.subject}\nDue: ${new Date(h.dueDate).toLocaleDateString()}\nDetails: ${h.description || '-'}`).join('\n\n---\n\n');

    const shareText = `📚 *Homework Assignments ${filterBatchId ? 'for ' + filterBatchId : ''}*\n\n${text}\n\nRegards,\n${db.getData().settings?.name || 'Your Coaching'}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
}

function notifyHomework(id) {
    const h = db.getRecords('homework').find(x => x.id === id);
    if (!h) return;

    const students = db.getRecords('students').filter(s =>
        (s.batches && s.batches.includes(h.batch)) || s.batch === h.batch
    );

    if (students.length === 0) {
        showNotification('No phone numbers found for this batch', 'warning');
        return;
    }

    const text = `📝 *Homework: ${h.title}*\nSubject: ${h.subject}\nDue Date: ${new Date(h.dueDate).toLocaleDateString()}\nDetails: ${h.description}\n\nRegards,\n${db.getData().settings?.name || 'Your Coaching'}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
