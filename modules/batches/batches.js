
// Batch Management Logic
function loadBatches() {
    const batches = db.getRecords('batches');
    const students = db.getRecords('students');

    if (batches.length === 0) {
        document.getElementById('batchesTable').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No batches created yet.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Batch Code</th><th>Name</th><th>Subject</th><th>Schedule</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    batches.forEach(batch => {
        const studentCount = students.filter(s => (s.batches && s.batches.includes(batch.name)) || s.batch === batch.name).length;
        const capacity = batch.capacity || batch.maxStudents || 30;
        const fillPercentage = (studentCount / capacity) * 100;
        let fillClass = 'success';
        if (fillPercentage > 80) fillClass = 'warning';
        if (fillPercentage >= 100) fillClass = 'danger';

        html += `
            <tr>
                <td><strong>${batch.batch_code || '-'}</strong></td>
                <td>
                    <div style="font-weight: 600;">${batch.name}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Tutor: ${batch.tutor || 'Unassigned'}</div>
                </td>
                <td>${batch.subject || '-'}</td>
                <td>${batch.schedule || '-'}</td>
                <td>
                    <div class="progress-bar-mini" title="${studentCount}/${capacity} Students">
                         <div class="progress-fill ${fillClass}" style="width: ${Math.min(100, fillPercentage)}%"></div>
                    </div>
                    <div style="font-size: 11px; text-align: center; margin-top: 2px;">${studentCount}/${capacity}</div>
                </td>
                <td><span class="status-badge active">Active</span></td>
                <td>
                    <div class="row-actions">
                        <button class="btn btn-secondary btn-small" onclick="openBatchModal('${batch.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-info btn-small" onclick="viewBatchStudents('${batch.id}')" title="View Students"><i class="fas fa-users"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteBatch('${batch.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('batchesTable').innerHTML = html;
    updateBatchStats();
}

function updateBatchStats() {
    const batches = db.getRecords('batches');
    const students = db.getRecords('students');
    const totalStudents = students.length;
    const totalBatches = batches.length;

    const statsHtml = `
        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${totalStudents}</div>
                <div class="stat-label">Total Students</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
                <i class="fas fa-layer-group"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${totalBatches}</div>
                <div class="stat-label">Total Batches</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);">
                <i class="fas fa-user-graduate"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${Math.round(totalStudents / (totalBatches || 1))}</div>
                <div class="stat-label">Avg. Students/Batch</div>
            </div>
        </div>
    `;
    const batchStats = document.getElementById('batchStats');
    if (batchStats) batchStats.innerHTML = statsHtml;
}

function openBatchModal(batchId = null) {
    const modal = document.getElementById('batchModal');
    const form = document.getElementById('batchForm');

    // Populate Tutors
    populateTutorDropdown('batchTutors');

    if (batchId) {
        const batch = db.getRecords('batches').find(b => b.id === batchId);
        if (batch) {
            document.getElementById('batchName').value = batch.name || '';
            document.getElementById('batchSubject').value = batch.subject || '';
            document.getElementById('batchYear').value = batch.year || '';
            document.getElementById('batchTutors').value = batch.tutor || '';
            document.getElementById('batchSchedule').value = batch.schedule || '';
            document.getElementById('batchMaxStudents').value = batch.maxStudents || batch.capacity || '';
            modal.dataset.editId = batchId;
            modal.querySelector('.modal-title').textContent = 'Edit Batch';
        }
    } else {
        if (form) form.reset();
        delete modal.dataset.editId;
        modal.querySelector('.modal-title').textContent = 'Create New Batch';
    }

    openModal('batchModal');
}

function saveBatch(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('batchModal');
    const editId = modal?.dataset.editId;

    const batchData = {
        name: document.getElementById('batchName').value,
        subject: document.getElementById('batchSubject').value,
        year: document.getElementById('batchYear').value,
        tutor: document.getElementById('batchTutors').value,
        schedule: document.getElementById('batchSchedule').value,
        maxStudents: parseInt(document.getElementById('batchMaxStudents').value) || 30,
        capacity: parseInt(document.getElementById('batchMaxStudents').value) || 30,
        status: 'active'
    };

    if (!editId) {
        tuitionManager.createBatchWithSchedule(batchData);
        showNotification('Batch created successfully!');
    } else {
        const existingBatch = db.getRecords('batches').find(b => b.id === editId);
        if (existingBatch) {
            batchData.students = existingBatch.students || [];
            batchData.batch_code = existingBatch.batch_code;
        }
        db.updateRecord('batches', editId, batchData);
        showNotification('Batch updated successfully!');
    }

    closeModal('batchModal');
    loadBatches();
}

function deleteBatch(id) {
    confirmAction({
        title: 'Delete Batch?',
        message: 'All associated records for this batch will be preserved but the batch itself will be removed from lists.',
        onConfirm: () => {
            db.deleteRecord('batches', id);
            loadBatches();
            showNotification('Batch deleted successfully!');
        }
    });
}

function viewBatchStudents(batchId) {
    const batch = db.getRecords('batches').find(b => b.id === batchId);
    if (!batch) return;

    const students = db.getRecords('students').filter(s =>
        (s.batches && s.batches.includes(batch.name)) || s.batch === batch.name
    );

    const titleEl = document.getElementById('batchDetailTitle');
    if (titleEl) titleEl.textContent = `Students in ${batch.name} (${students.length})`;

    const listEl = document.getElementById('batchStudentsList');
    if (listEl) {
        listEl.innerHTML = students.length ? students.map(s => `
            <div class="card" style="padding: 15px; margin-bottom: 0;">
                <div class="student-card">
                    <div class="student-avatar" style="width: 40px; height: 40px;">
                        ${s.profilePic ? `<img src="${s.profilePic}">` : s.name.charAt(0)}
                    </div>
                    <div class="compact-student-info">
                        <strong style="font-size: 14px;">${s.name}</strong>
                        <div style="font-size: 11px; color: var(--text-secondary);">${s.rollNumber || s.student_code || 'No Roll #'}</div>
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <a href="tel:${s.phone || s.parentPhone}" class="btn btn-small btn-secondary" style="padding: 4px 8px;"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${(s.phone || s.parentPhone || '').replace(/\D/g, '')}" target="_blank" class="btn btn-small btn-success" style="padding: 4px 8px;"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
        `).join('') : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">No students enrolled in this batch.</p>';
    }

    const waBtn = document.getElementById('batchWhatsAppBtn');
    if (waBtn) {
        waBtn.onclick = () => {
            const phones = students.map(s => (s.phone || s.parentPhone || '').replace(/\D/g, '')).filter(p => p).join(',');
            if (phones) {
                window.open(`https://wa.me/?text=${encodeURIComponent('Notification for Batch: ' + batch.name)}`, '_blank');
            } else {
                showNotification('No phone numbers found', 'warning');
            }
        };
    }

    openModal('batchDetailModal');
}

function filterBatches() {
    const search = document.getElementById('batchSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#batchesTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}
