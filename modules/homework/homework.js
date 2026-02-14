
// Homework Management Logic
function loadHomework() {
    const homework = db.getRecords('homework') || [];
    const batches = db.getRecords('batches');
    const students = db.getRecords('students');
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

    if (filteredHomework.length === 0) {
        document.getElementById('homeworkTable').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No homework assignments found.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Title</th><th>Subject</th><th>Batch</th><th>Due Date</th><th>Actions</th></tr></thead><tbody>';

    filteredHomework.forEach(h => {
        const batchName = h.batch || 'All Batches'; // Assuming batch name stored directly or mapped
        // If h.batch is ID, find name. But in createHomework (below), we use value from dropdown. 
        // Dropdown in create uses Names or IDs?
        // Let's check openHomeworkModal below.

        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${h.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${h.description || ''}</div>
                </td>
                <td>${h.subject}</td>
                <td><span class="batch-badge">${batchName}</span></td>
                <td>${new Date(h.dueDate).toLocaleDateString()}</td>
                <td>
                    <div class="row-actions">
                        <button class="btn btn-success btn-small" onclick="notifyHomework('${h.id}')" title="Share via WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-secondary btn-small" onclick="editHomework('${h.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteHomework('${h.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('homeworkTable').innerHTML = html;
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

    const phones = students.map(s => (s.phone || s.parentPhone || '').replace(/\D/g, '')).filter(p => p);

    if (phones.length === 0) {
        showNotification('No phone numbers found for this batch', 'warning');
        return;
    }

    const text = `📝 *Homework: ${h.title}*\nSubject: ${h.subject}\nDue Date: ${new Date(h.dueDate).toLocaleDateString()}\nDetails: ${h.description}\n\nRegards,\n${db.getData().settings?.name || 'Your Coaching'}`;

    // Share to first student or open WA share dialog
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
