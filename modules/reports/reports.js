
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
            return {
                examName: e.name || 'Unnamed Exam',
                subject: e.subject || 'N/A',
                totalMarks: total,
                obtainedMarks: marks,
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
    const examData = examResults.map(r => ({
        examName: r.examName,
        marks: r.obtainedMarks,
        total: r.totalMarks,
        passing: r.totalMarks * 0.33 // Assuming a 33% passing mark for example
    }));

    const totalClasses = totalConducted;
    const presentDays = daysPresent;
    const absentDays = daysAbsent;

    const reportHtml = `
        <div class="report-container" id="reportContent" style="width: 210mm; min-height: 297mm; padding: 20mm; margin: auto; background: white; box-shadow: none; color: #333; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; position: relative; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--primary); padding-bottom: 20px; margin-bottom: 30px;">
                <div style="flex: 1;">
                    <h1 style="color: var(--primary); margin: 0; font-size: 28px;">${settings.name || 'Coaching Center'}</h1>
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">${settings.address || ''}</p>
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">Ph: ${settings.phone || ''} | Email: ${settings.email || ''}</p>
                </div>
                <div style="text-align: right;">
                    <div style="background: var(--primary); color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; display: inline-block;">
                        PROGRESS REPORT
                    </div>
                    <p style="margin-top: 10px; font-size: 14px; font-weight: 600;">Date: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <!-- Student Profile -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 10px;">
                <div>
                    <h3 style="margin: 0 0 15px; color: var(--primary); border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-size: 16px;">Student Information</h3>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr><td style="padding: 5px 0; font-weight: 600; width: 120px;">Name:</td><td>${student.name}</td></tr>
                        <tr><td style="padding: 5px 0; font-weight: 600;">Roll Number:</td><td>${student.rollNumber || '-'}</td></tr>
                        <tr><td style="padding: 5px 0; font-weight: 600;">Batch:</td><td>${student.batches?.join(', ') || student.batch || '-'}</td></tr>
                    </table>
                </div>
                <div>
                    <h3 style="margin: 0 0 15px; color: var(--primary); border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-size: 16px;">Academic Summary</h3>
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1; text-align: center; background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b;">Attendance</div>
                            <div style="font-size: 18px; font-weight: 700; color: ${attendancePct < 75 ? 'var(--danger)' : 'var(--success)'}">${attendancePct}%</div>
                        </div>
                        <div style="flex: 1; text-align: center; background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b;">Fee Status</div>
                            <div style="font-size: 18px; font-weight: 700; color: ${pendingFee > 0 ? '#f59e0b' : '#10b981'}">${pendingFee > 0 ? 'Due' : 'Paid'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Performance -->
            <div style="margin-bottom: 40px;">
                <h3 style="color: var(--primary); margin-bottom: 15px; border-left: 4px solid var(--primary); padding-left: 10px; font-size: 16px;">Academic Performance</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; border: 1px solid #e2e8f0;">
                    <thead style="background: #f1f5f9;">
                        <tr>
                            <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Exam Name</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Marks</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Percentage</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${examData.length ? examData.map(ex => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e2e8f0;">${ex.examName}</td>
                                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${ex.marks}/${ex.total}</td>
                                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${((ex.marks / ex.total) * 100).toFixed(1)}%</td>
                                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">
                                    <span style="color: ${ex.marks >= ex.passing ? '#10b981' : '#ef4444'}; font-weight: 600;">${ex.marks >= ex.passing ? 'Pass' : 'Fail'}</span>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #94a3b8;">No academic records found for this period.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- Financial & Attendance -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">Attendance Detail</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                        <span>Total Conducted:</span>
                        <span style="font-weight: 600;">${totalClasses} Days</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                        <span>Days Present:</span>
                        <span style="font-weight: 600; color: #10b981;">${presentDays}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span>Days Absent:</span>
                        <span style="font-weight: 600; color: #ef4444;">${absentDays}</span>
                    </div>
                </div>
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">Financial Summary</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                        <span>Total Fees:</span>
                        <span style="font-weight: 600;">₹${totalFees}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                        <span>Paid Amount:</span>
                        <span style="font-weight: 600; color: #10b981;">₹${paidFees}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span>Balance Due:</span>
                        <span style="font-weight: 600; color: ${pendingFee > 0 ? '#ef4444' : '#10b981'};">₹${pendingFee}</span>
                    </div>
                </div>
            </div>

            <!-- Remarks -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; margin-bottom: 40px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--primary); text-transform: uppercase;">Teacher's Remarks</h4>
                <p style="margin: 0; font-style: italic; color: #334155; line-height: 1.6; font-size: 14px;">"${remarks}"</p>
            </div>

            <!-- Signatures -->
            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="height: 1px; width: 150px; background: #cbd5e1; margin-bottom: 8px;"></div>
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Class Teacher</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: var(--primary); margin-bottom: -5px; font-weight: 700;">${settings.director || 'Principal'}</div>
                    <div style="height: 1px; width: 180px; background: #cbd5e1; margin-bottom: 8px;"></div>
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Director / Principal</div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                Academic Session 2026 | Computer Generated Document | Verified by ${settings.name || 'Admin'}
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
        margin: 0,
        filename: `Report_${studentName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

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
