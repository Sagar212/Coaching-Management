
// Syllabus Templates
const SYLLABUS_TEMPLATES = {
    'ssc_math_10': ['Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progression', 'Financial Planning', 'Probability', 'Statistics', 'Similarity', 'Pythagoras Theorem', 'Circle', 'Geometric Constructions', 'Coordinate Geometry', 'Trigonometry', 'Mensuration'],
    'ssc_sci_10': ['Gravitation', 'Periodic Classification of Elements', 'Chemical Reactions and Equations', 'Effects of Electric Current', 'Heat', 'Refraction of Light', 'Lenses', 'Metallurgy', 'Carbon Compounds', 'Space Missions', 'Heredity and Evolution', 'Life Processes in Living Organisms Part 1', 'Life Processes in Living Organisms Part 2', 'Environmental Management', 'Towards Green Energy', 'Animal Classification'],
    'cbse_math_10': ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Constructions', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
    'cbse_sci_10': ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Periodic Classification of Elements', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity and Evolution', 'Light – Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy', 'Our Environment', 'Sustainable Management of Natural Resources']
};

function preloadSyllabusTemplate(templateKey) {
    const list = document.getElementById('syllabusTopicsContainer');
    if (!list) return;

    // Confirm before overwriting if data exists
    if (list.children.length > 0 && !confirm('This will overwrite current topics. Continue?')) {
        document.getElementById('syllabusTemplate').value = ""; // Reset dropdown
        return;
    }

    list.innerHTML = ''; // Clear existing

    if (SYLLABUS_TEMPLATES[templateKey]) {
        SYLLABUS_TEMPLATES[templateKey].forEach(topic => addTopicRow(topic));
    }
}

function addTopicRow(name = '', completed = false) {
    const list = document.getElementById('syllabusTopicsContainer');
    if (!list) return;

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';

    tr.innerHTML = `
        <td style="padding: 8px; text-align: center;">
            <input type="checkbox" class="topic-check" ${completed ? 'checked' : ''}>
        </td>
        <td style="padding: 8px;">
            <input type="text" class="topic-name" value="${name}" placeholder="Chapter Name" style="width: 100%; border: 1px solid transparent; background: transparent; padding: 4px;">
        </td>
        <td style="padding: 8px; text-align: center;">
            <button type="button" class="btn-text-danger" onclick="this.closest('tr').remove()" style="background: none; border: none; cursor: pointer; color: var(--danger);">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    list.appendChild(tr);

    // Auto-focus new input if empty
    if (!name) {
        const input = tr.querySelector('.topic-name');
        if (input) setTimeout(() => input.focus(), 50);
    }
}

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
                <div style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="openSyllabusModal()">Start Tracking</button>
                </div>
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
                <div class="syllabus-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px;">
        `;

        grouped[batchName].forEach(item => {
            // Parse topics safely
            let topics = [];
            try {
                topics = (typeof item.topics === 'string' && item.topics.startsWith('['))
                    ? JSON.parse(item.topics)
                    : (item.topics ? [{ name: item.topics, completed: item.status === 'completed' }] : []);
            } catch (e) {
                topics = [{ name: item.topics, completed: false }];
            }

            // Calculate progress dynamically
            const totalTopics = topics.length;
            const completedTopics = topics.filter(t => t.completed).length;
            const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

            // Determine status based on progress
            let status = 'pending';
            if (progress === 100) status = 'completed';
            else if (progress > 0) status = 'in-progress';

            const statusColor = status === 'completed' ? '#10b981' : (status === 'in-progress' ? '#f59e0b' : '#64748b');
            const statusLabel = status === 'completed' ? 'Completed' : (status === 'in-progress' ? 'In Progress' : 'Pending');

            // Generate Topics List HTML
            const topicsHtml = topics.map((t, idx) => `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px;">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} 
                        onclick="toggleTopicCompletion('${item.id}', ${idx}, this.checked)"
                        style="cursor: pointer; accent-color: var(--primary);">
                    <span style="${t.completed ? 'text-decoration: line-through; color: var(--text-secondary);' : 'color: var(--text-primary);'} transition: all 0.2s;">
                        ${t.name}
                    </span>
                </div>
            `).join('');

            html += `
                <div class="syllabus-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-top: 4px solid ${statusColor}; border-radius: 12px; padding: 18px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: 700; font-size: 16px; color: var(--text-primary);">${item.subject}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                <i class="fas fa-list-ul"></i> ${completedTopics}/${totalTopics} Chapters | <i class="fas fa-clock"></i> ${item.duration || 'N/A'}
                            </div>
                        </div>
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${statusLabel}</span>
                    </div>
                    
                    <div style="background: var(--bg-primary); padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px dashed var(--border-color); max-height: 200px; overflow-y: auto;">
                        ${topicsHtml || '<p style="color: var(--text-secondary); font-size: 12px; text-align: center;">No topics added</p>'}
                    </div>

                    <div class="syllabus-progress">
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

function toggleTopicCompletion(id, topicIndex, isChecked) {
    const record = db.getRecords('syllabus').find(s => s.id === id);
    if (!record) return;

    let topics = [];
    try {
        topics = (typeof record.topics === 'string' && record.topics.startsWith('['))
            ? JSON.parse(record.topics)
            : [{ name: record.topics, completed: false }];
    } catch (e) { topics = []; }

    if (topics[topicIndex]) {
        topics[topicIndex].completed = isChecked;
        record.topics = JSON.stringify(topics);

        // Auto update main status if all completed
        const allDone = topics.every(t => t.completed);
        const noneDone = topics.every(t => !t.completed);
        record.status = allDone ? 'completed' : (noneDone ? 'pending' : 'in-progress');

        db.updateRecord('syllabus', id, record);
        loadSyllabus(); // Refresh UI
    }
}

function openSyllabusModal(id = null) {
    const modal = document.getElementById('syllabusModal');
    const container = document.getElementById('syllabusTopicsContainer');
    document.getElementById('syllabusForm').reset();
    container.innerHTML = ''; // Clear items

    // Load Batches
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
            document.getElementById('syllabusDuration').value = item.duration;
            document.getElementById('syllabusStatus').value = item.status;

            // Load Topics
            let topics = [];
            try {
                topics = JSON.parse(item.topics);
            } catch (e) {
                // Fallback for legacy plain text
                topics = [{ name: item.topics, completed: item.status === 'completed' }];
            }

            if (Array.isArray(topics)) {
                topics.forEach(t => addTopicRow(t.name, t.completed));
            } else {
                addTopicRow();
            }

            modal.dataset.editId = id;
            modal.querySelector('.modal-title').textContent = 'Edit Syllabus Item';
        }
    } else {
        delete modal.dataset.editId;
        modal.querySelector('.modal-title').textContent = 'Add Syllabus Item';
        addTopicRow(); // Add one empty row by default
    }
    openModal('syllabusModal');
}

function saveSyllabus(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('syllabusModal');
    const editId = modal?.dataset.editId;

    // Collect Topics data from DOM
    const rows = document.querySelectorAll('#syllabusTopicsContainer tr');
    const topics = [];
    rows.forEach(row => {
        const name = row.querySelector('.topic-name').value.trim();
        const completed = row.querySelector('.topic-check').checked;
        if (name) {
            topics.push({ name, completed });
        }
    });

    const data = {
        batchId: document.getElementById('syllabusBatch').value,
        subject: document.getElementById('syllabusSubject').value,
        topics: JSON.stringify(topics), // Store as JSON string
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
        if (typeof loadDashboard === 'function') loadDashboard();
        showNotification('Item deleted!');
    }
}
