
// Progress Reports Logic
function loadReportsPage() {
    const students = db.getRecords('students');
    const select = document.getElementById('reportStudentSelect');
    if (select) {
        select.innerHTML = '<option value="">Choose a student...</option>' + students.map(s =>
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
    }
}

function loadStudentReport() {
    const studentId = document.getElementById('reportStudentSelect').value;
    const preview = document.getElementById('reportPreview');
    if (!studentId) {
        if (preview) preview.innerHTML = '';
        return;
    }

    const student = db.getRecords('students').find(s => s.id === studentId);
    if (!student) {
        showNotification('Student not found', 'error');
        return;
    }

    const homework = (db.getRecords('homework') || []).filter(h =>
        (student.batches && student.batches.includes(h.batch)) || student.batch === h.batch
    );
    const payments = (db.getRecords('payments') || []).filter(p => p.studentId === studentId);

    // Calculate Exam Performance
    const exams = db.getRecords('exams') || [];
    const examResults = exams
        .filter(e => e.results && e.results.some(r => r.studentId === studentId))
        .map(e => {
            const result = e.results.find(r => r.studentId === studentId);
            const marks = parseFloat(result.marks) || 0;
            const total = parseFloat(e.totalMarks) || 100;
            const passing = parseFloat(e.passingMarks) || 40; // Default passing marks if not set
            return {
                examName: e.name || 'Unnamed Exam',
                subject: e.subject || 'N/A',
                total: total,
                marks: marks,
                passing: passing,
                percentage: ((marks / total) * 100).toFixed(1)
            };
        });

    const totalFees = parseFloat(student.totalFee) || 0;
    const paidFees = parseFloat(student.paidAmount) || 0;

    // Calculate Attendance properly
    const allAttendance = db.getRecords('attendance') || [];
    const studentBatches = student.batches || [student.batch];

    const relevantAttendance = allAttendance.filter(a => {
        const batchId = a.batchId || a.batch;
        return studentBatches.includes(batchId);
    });

    const daysPresent = relevantAttendance.filter(a =>
        a.present && Array.isArray(a.present) && a.present.includes(studentId)
    ).length;

    const totalConducted = relevantAttendance.length;
    const daysAbsent = totalConducted - daysPresent;
    const attendancePercentage = totalConducted > 0 ? Math.round((daysPresent / totalConducted) * 100) : 100;

    // Alias variables for template compatibility
    const examData = examResults;
    const totalClasses = totalConducted;
    const presentDays = daysPresent;
    const absentDays = daysAbsent;

    const toneSelect = document.getElementById('reportTone');
    const tone = toneSelect ? toneSelect.value : 'balanced';
    let remarks = '';
    if (tone === 'encouraging') remarks = "Showing great potential! Keep up the good work.";
    else if (tone === 'critical') remarks = "Needs to focus more on studies and regular attendance.";
    else if (attendancePercentage < 75) remarks = "Attendance is low. Regular presence is required for academic success.";
    else remarks = "Performance is consistent. Good progress.";

    const autoSignEl = document.getElementById('autoSign');
    const autoSign = autoSignEl ? autoSignEl.checked : true;

    // Generate Report HTML with premium A4 structure
    const settings = db.getData().settings || {};
    const attendancePct = attendancePercentage; // Using the calculated attendance percentage
    const pendingFee = totalFees - paidFees; // Using the calculated fee balance

    // Prepare exam data for the new structure

    // Prepare Homework Data
    const homeworkData = (homework || []).map(h => {
        const isSubmitted = h.submissions && (
            (Array.isArray(h.submissions) && h.submissions.includes(studentId)) ||
            (Array.isArray(h.submissions) && h.submissions.some(s => s.studentId === studentId))
        );
        return {
            title: h.title,
            deadline: new Date(h.dueDate).toLocaleDateString(),
            status: isSubmitted ? 'Completed' : 'Pending'
        };
    });

    const reportHtml = `
        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 10px; overflow: auto; text-align: center;">
            <div class="report-container" id="reportContent" style="
                width: 210mm; 
                min-height: 297mm; 
                padding: 15mm; 
                margin: 0 auto; 
                background: white; 
                box-sizing: border-box; 
                color: #333 !important; 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                position: relative; 
                text-align: left;
                box-shadow: 0 0 15px rgba(0,0,0,0.1);
            ">
                <style>
                    #reportContent h1, #reportContent h2, #reportContent h3, #reportContent h4 { color: #1e293b !important; }
                    #reportContent p, #reportContent span, #reportContent div { color: #334155; }
                    #reportContent table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; }
                    #reportContent th { background-color: #f1f5f9 !important; color: #1e293b !important; font-weight: 600; border: 1px solid #e2e8f0; padding: 8px; }
                    #reportContent td { color: #334155 !important; border: 1px solid #e2e8f0; padding: 8px; }
                    .status-pass { color: #10b981 !important; font-weight: 700; }
                    .status-fail { color: #ef4444 !important; font-weight: 700; }
                    .status-completed { color: #10b981 !important; font-weight: 600; }
                    .status-pending { color: #f59e0b !important; font-weight: 600; }
                </style>
                
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px;">
                    <div style="flex: 1;">
                        <h1 style="color: #6366f1 !important; margin: 0; font-size: 24px; font-weight: 700;">${settings.name || 'Coaching Center'}</h1>
                        <p style="margin: 4px 0; font-size: 11px; color: #64748b;">${settings.address || ''}</p>
                        <p style="margin: 4px 0; font-size: 11px; color: #64748b;">Ph: ${settings.phone || ''} | Email: ${settings.email || ''}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: #6366f1; color: white !important; padding: 5px 15px; border-radius: 4px; font-weight: bold; font-size: 12px; display: inline-block;">
                            PROGRESS REPORT
                        </div>
                        <p style="margin-top: 5px; font-size: 11px; font-weight: 600;">Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <!-- Student Profile & Summary Grid -->
                <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div>
                        <h3 style="margin: 0 0 10px; color: #6366f1 !important; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; font-size: 14px;">Student Profile</h3>
                        <table style="width: 100%; font-size: 12px; border: none !important;">
                            <tr><td style="padding: 3px 0; font-weight: 600; width: 90px; border: none !important;">Name:</td><td style="border: none !important;">${student.name}</td></tr>
                            <tr><td style="padding: 3px 0; font-weight: 600; border: none !important;">Roll No:</td><td style="border: none !important;">${student.rollNumber || '-'}</td></tr>
                            <tr><td style="padding: 3px 0; font-weight: 600; border: none !important;">Batch:</td><td style="border: none !important;">${student.batches?.join(', ') || student.batch || '-'}</td></tr>
                        </table>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 10px; color: #6366f1 !important; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; font-size: 14px;">Performance Snapshot</h3>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1; text-align: center; background: white; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="font-size: 9px; text-transform: uppercase; color: #64748b;">Attendance</div>
                                <div style="font-size: 15px; font-weight: 700; color: ${attendancePct < 75 ? '#ef4444' : '#10b981'} !important;">${attendancePct}%</div>
                            </div>
                            <div style="flex: 1; text-align: center; background: white; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="font-size: 9px; text-transform: uppercase; color: #64748b;">Fee Status</div>
                                <div style="font-size: 15px; font-weight: 700; color: ${pendingFee > 0 ? '#f59e0b' : '#10b981'} !important;">${pendingFee > 0 ? 'Due' : 'Paid'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Academic Performance -->
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #6366f1 !important; margin-bottom: 10px; border-left: 3px solid #6366f1; padding-left: 8px; font-size: 14px;">Academic Performance & Exams</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: left;">Exam Name</th>
                                <th style="text-align: center;">Obtained</th>
                                <th style="text-align: center;">Total</th>
                                <th style="text-align: center;">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${examData.length ? examData.map(ex => `
                                <tr>
                                    <td>${ex.examName}</td>
                                    <td style="text-align: center; font-weight: 600;">${ex.marks}</td>
                                    <td style="text-align: center;">${ex.total}</td>
                                    <td style="text-align: center;">
                                        <span class="${ex.marks >= ex.passing ? 'status-pass' : 'status-fail'}">${ex.marks >= ex.passing ? 'Pass' : 'Fail'}</span>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #94a3b8;">No exam records found.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <!-- Homework & Assignments -->
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #6366f1 !important; margin-bottom: 10px; border-left: 3px solid #6366f1; padding-left: 8px; font-size: 14px;">Homework & Assignments</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: left;">Assignment Title</th>
                                <th style="text-align: center;">Deadline</th>
                                <th style="text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${homeworkData.length ? homeworkData.slice(0, 10).map(h => `
                                <tr>
                                    <td>${h.title}</td>
                                    <td style="text-align: center;">${h.deadline}</td>
                                    <td style="text-align: center;">
                                        <span class="${h.status === 'Completed' ? 'status-completed' : 'status-pending'}">${h.status}</span>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #94a3b8;">No homework assigned.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <!-- Financial & Attendance Details -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; font-weight: 700;">Attendance Breakdown</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
                            <span>Total Sessions:</span>
                            <span style="font-weight: 600;">${totalClasses}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
                            <span>Present:</span>
                            <span style="font-weight: 600; color: #10b981 !important;">${presentDays}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span>Absent:</span>
                            <span style="font-weight: 600; color: #ef4444 !important;">${absentDays}</span>
                        </div>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; font-weight: 700;">Fee Summary</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
                            <span>Total Fees:</span>
                            <span style="font-weight: 600;">₹${totalFees}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
                            <span>Paid:</span>
                            <span style="font-weight: 600; color: #10b981 !important;">₹${paidFees}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span>Balance:</span>
                            <span style="font-weight: 600; color: ${pendingFee > 0 ? '#ef4444' : '#10b981'} !important;">₹${pendingFee}</span>
                        </div>
                    </div>
                </div>

                <!-- Remarks -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 40px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 12px; color: #6366f1 !important; text-transform: uppercase;">Teacher's Remarks</h4>
                    <p style="margin: 0; font-style: italic; color: #334155; line-height: 1.4; font-size: 12px;">"${remarks}"</p>
                </div>

                <!-- Signatures -->
                <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px;">
                    <div style="text-align: center;">
                        <div style="height: 1px; width: 120px; background: #cbd5e1; margin-bottom: 5px;"></div>
                        <div style="font-size: 11px; font-weight: 600; color: #1e293b;">Class Teacher</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="height: 1px; width: 120px; background: #cbd5e1; margin-bottom: 5px;"></div>
                        <div style="font-size: 11px; font-weight: 600; color: #1e293b;">Director / Principal</div>
                    </div>
                </div>
                
                <div style="text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 15px;">
                    Generated on ${new Date().toLocaleDateString()} | ${settings.name || 'Coaching Management System'}
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
            <button class="btn btn-primary" onclick="printReport()"><i class="fas fa-file-pdf"></i> Download PDF Report</button>
            <button class="btn btn-success" onclick="shareReport()"><i class="fab fa-whatsapp"></i> Share on WhatsApp</button>
        </div>
    `;

    document.getElementById('reportPreview').innerHTML = reportHtml;
}

function printReport() {
    const element = document.getElementById('reportContent');
    if (!element) return;

    const studentName = document.getElementById('reportStudentSelect').options[document.getElementById('reportStudentSelect').selectedIndex].text;

    const opt = {
        margin: [5, 5, 5, 5], // Top, Left, Bottom, Right
        filename: `Progress_Report_${studentName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: true,
            letterRendering: true,
            windowWidth: element.scrollWidth // Capture full width
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf to generate
    html2pdf().set(opt).from(element).save();
}

function shareReport() {
    const studentId = document.getElementById('reportStudentSelect').value;
    const student = db.getRecords('students').find(s => s.id === studentId);
    if (!student) return;

    const text = `Progress Report for ${student.name} is ready. Please contact the institute to collect it.`;
    const phone = student.parentPhone || student.phone;

    if (phone) {
        window.open(`https://wa.me/${phone.replace(/\\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        showNotification('No phone number available for sharing', 'warning');
    }
}
