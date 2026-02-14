
// Syllabus Management Logic
function loadSyllabus() {
    const syllabus = db.getRecords('syllabus');
    const batches = db.getRecords('batches');
    const filterValue = document.getElementById('syllabusBatchFilter')?.value || '';

    // Populate filter if empty
    const filter = document.getElementById('syllabusBatchFilter');
    if (filter && filter.options.length <= 1) {
        filter.innerHTML = '<option value="">All Batches</option>' +
            batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    let filteredSyllabus = syllabus;
    if (filterValue) {
        filteredSyllabus = syllabus.filter(s => s.batchId === filterValue);
    }

    if (filteredSyllabus.length === 0) {
        document.getElementById('syllabusContent').innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); padding: 60px 20px;">
                <i class="fas fa-book-open" style="font-size: 40px; opacity: 0.3; margin-bottom: 15px;"></i>
                <p>No syllabus items tracked for the selected filter.</p>
            </div>`;
        return;
    }

    let html = '';

    // Group by Batch
    const grouped = {};
    filteredSyllabus.forEach(item => {
        const batch = batches.find(b => b.id === item.batchId);
        const batchName = batch ? `${batch.name} (${batch.batch_code || 'No Code'})` : 'Unknown Batch';
        if (!grouped[batchName]) grouped[batchName] = [];
        grouped[batchName].push(item);
    });

    Object.keys(grouped).forEach(batchName => {
        html += `
            <div class="syllabus-batch-section" style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
                    <div style="width: 10px; height: 24px; background: var(--primary); border-radius: 2px;"></div>
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 18px;">${batchName}</h3>
                </div>
                <div class="syllabus-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        `;

        grouped[batchName].forEach(item => {
            const statusColor = item.status === 'completed' ? '#10b981' : item.status === 'in-progress' ? '#f59e0b' : '#64748b';
            const progress = item.status === 'completed' ? 100 : item.status === 'in-progress' ? 50 : 0;
            const statusLabel = item.status === 'completed' ? 'Completed' : item.status === 'in-progress' ? 'In Progress' : 'Pending';

            html += `
                <div class="syllabus-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-top: 4px solid ${statusColor}; border-radius: 12px; padding: 18px; position: relative; transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: 700; font-size: 16px; color: var(--text-primary);">${item.subject}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><i class="fas fa-clock"></i> ${item.duration || 'N/A'} Duration</div>
                        </div>
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${statusLabel}</span>
                    </div>
                    
                    <div style="background: var(--bg-primary); padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px dashed var(--border-color);">
                        <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Topics Covered</div>
                        <div style="font-size: 13px; line-height: 1.4; color: var(--text-primary);">${item.topics}</div>
                    </div>

                    <div class="syllabus-progress" style="margin-top: auto;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">
                            <span>Completion</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar" style="height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                            <div class="progress-fill" style="width: ${progress}%; background: ${statusColor}; height: 100%; transition: width 0.5s ease;"></div>
                        </div>
                    </div>

                    <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 8px;">
                        <button class="btn btn-secondary btn-small" onclick="editSyllabus('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteSyllabus('${item.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
    });

    document.getElementById('syllabusContent').innerHTML = html;
}

function openSyllabusModal(id = null) {
    const modal = document.getElementById('syllabusModal');
    const batches = db.getRecords('batches');
    const select = document.getElementById('syllabusBatch');

    if (select) {
        select.innerHTML = '<option value="">Select Batch...</option>' +
            batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    if (id) {
        const item = db.getRecords('syllabus').find(s => s.id === id);
        if (item) {
            document.getElementById('syllabusBatch').value = item.batchId;
            document.getElementById('syllabusSubject').value = item.subject;
            document.getElementById('syllabusTopics').value = item.topics;
            document.getElementById('syllabusDuration').value = item.duration;
            document.getElementById('syllabusStatus').value = item.status;
            modal.dataset.editId = id;
            modal.querySelector('.modal-title').textContent = 'Edit Syllabus Item';
        }
    } else {
        document.getElementById('syllabusForm').reset();
        delete modal.dataset.editId;
        modal.querySelector('.modal-title').textContent = 'Add Syllabus Item';
    }
    openModal('syllabusModal');
}

function saveSyllabus(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('syllabusModal');
    const editId = modal?.dataset.editId;

    const data = {
        batchId: document.getElementById('syllabusBatch').value,
        subject: document.getElementById('syllabusSubject').value,
        topics: document.getElementById('syllabusTopics').value,
        duration: document.getElementById('syllabusDuration').value,
        status: document.getElementById('syllabusStatus').value
    };

    if (editId) {
        db.updateRecord('syllabus', editId, data);
        showNotification('Syllabus updated successfully!');
    } else {
        db.addRecord('syllabus', data);
        showNotification('Syllabus item added!');
    }

    closeModal('syllabusModal');
    loadSyllabus();
    if (typeof loadDashboard === 'function') loadDashboard();
}

function editSyllabus(id) {
    openSyllabusModal(id);
}

function deleteSyllabus(id) {
    if (confirm('Delete this syllabus item?')) {
        db.deleteRecord('syllabus', id);
        loadSyllabus();
        loadDashboard();
        showNotification('Item deleted!');
    }
}
