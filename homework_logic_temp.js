// ========== HOMEWORK MANAGEMENT FUNCTIONS ==========

function loadHomework() {
    const homework = db.getRecords('homework') || [];
    const batches = db.getRecords('batches');
    const filterBatchId = document.getElementById('homeworkBatchFilter')?.value || '';

    // Populate batch filter dropdown
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

    let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Batch</th>
                            <th>Subject</th>
                            <th>Due Date</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

    filteredHomework.forEach(h => {
        html += `
                    <tr>
                        <td><strong>${h.title}</strong></td>
                        <td>${h.batch}</td>
                        <td>${h.subject || 'N/A'}</td>
                        <td>${new Date(h.dueDate).toLocaleDateString()}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.description || 'N/A'}</td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-small btn-primary" onclick="openHomeworkModal('${h.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-small btn-success" onclick="shareHomeworkWhatsApp('${h.id}')" title="Share WhatsApp"><i class="fab fa-whatsapp"></i></button>
                                <button class="btn btn-small btn-info" onclick="shareHomeworkEmail('${h.id}')" title="Share Email"><i class="fas fa-envelope"></i></button>
                                <button class="btn btn-small btn-danger" onclick="deleteHomework('${h.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
    });

    html += '</tbody></table>';
    document.getElementById('homeworkTable').innerHTML = html;
}

function openHomeworkModal(id = null) {
    const modal = document.getElementById('homeworkModal');

    // Populate batch dropdown
    const batches = db.getRecords('batches');
    const batchSelect = document.getElementById('homeworkBatch');
    if (batchSelect) {
        batchSelect.innerHTML = '<option value="">Select Batch...</option>' + batches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    }

    if (id) {
        const h = db.getRecords('homework').find(item => item.id === id);
        if (h) {
            document.getElementById('homeworkTitle').value = h.title;
            document.getElementById('homeworkBatch').value = h.batch;
            document.getElementById('homeworkSubject').value = h.subject || '';
            document.getElementById('homeworkDueDate').value = h.dueDate;
            document.getElementById('homeworkDescription').value = h.description || '';
            modal.dataset.editId = id;
        }
    } else {
        document.getElementById('homeworkTitle').value = '';
        document.getElementById('homeworkBatch').value = '';
        document.getElementById('homeworkSubject').value = '';
        document.getElementById('homeworkDueDate').valueAsDate = new Date();
        document.getElementById('homeworkDescription').value = '';
        modal.dataset.editId = '';
    }
    openModal('homeworkModal');
}

function saveHomework(e) {
    e.preventDefault();
    const modal = document.getElementById('homeworkModal');
    const editId = modal?.dataset.editId;

    const homeworkData = {
        title: document.getElementById('homeworkTitle').value,
        batch: document.getElementById('homeworkBatch').value,
        subject: document.getElementById('homeworkSubject').value,
        dueDate: document.getElementById('homeworkDueDate').value,
        description: document.getElementById('homeworkDescription').value,
        createdAt: new Date().toISOString()
    };

    if (editId) {
        db.updateRecord('homework', editId, homeworkData);
        showNotification('Homework updated!');
    } else {
        db.addRecord('homework', homeworkData);
        showNotification('Homework assigned!');
    }

    closeModal('homeworkModal');
    loadHomework();
}

function deleteHomework(id) {
    if (confirm('Delete this assignment?')) {
        db.deleteRecord('homework', id);
        loadHomework();
        showNotification('Assignment deleted!');
    }
}

function shareHomeworkWhatsApp(id) {
    const h = db.getRecords('homework').find(item => item.id === id);
    if (!h) return;

    // Get all parents in this batch
    const students = db.getRecords('students').filter(s => s.batches && s.batches.includes(h.batch));
    if (students.length === 0) {
        showNotification('No students in this batch', 'warning');
        return;
    }

    const message = `*New Homework: ${h.title}*\nSubject: ${h.subject}\nDue: ${new Date(h.dueDate).toLocaleDateString()}\n\n${h.description}`;

    // We can't batch send WhatsApp, so we'll just open a generic one or show instruction
    // For now, let's just open the first parent as a demo or use a 'broadcast' approach if possible
    // Better UX: Show a modal with links for each parent? Or just copy to clipboard?
    // Let's copy to clipboard and notify

    navigator.clipboard.writeText(message).then(() => {
        showNotification('Message copied! You can now paste in WhatsApp Group.');
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    });
}

function shareHomeworkEmail(id) {
    const h = db.getRecords('homework').find(item => item.id === id);
    if (!h) return;

    const students = db.getRecords('students').filter(s => s.batches && s.batches.includes(h.batch));
    const emails = students.map(s => s.parentEmail).filter(e => e).join(',');

    if (!emails) {
        showNotification('No parent emails found for this batch', 'warning');
        return;
    }

    const subject = `Homework: ${h.title}`;
    const body = `Dear Parent,\n\nPlease note the following homework assignment for your child:\n\nTitle: ${h.title}\nSubject: ${h.subject}\nDue Date: ${new Date(h.dueDate).toLocaleDateString()}\nDetails: ${h.description}\n\nRegards,\n${db.getData().settings.name}`;

    window.open(`mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}
