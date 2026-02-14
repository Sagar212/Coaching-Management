
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

    const html = `
        <div class="report-card" style="background: white; padding: 20px; width: 210mm; min-height: 297mm; margin: 0 auto; color: #333; font-family: 'Inter', sans-serif; position: relative; box-sizing: border-box; border: 1px solid #eee;">
            <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 15px; margin-bottom: 25px;">
                <h1 style="color: var(--primary); margin: 0; font-size: 28px; letter-spacing: 1px;">${db.getData().settings.name || 'Coaching Institute'}</h1>
                <div style="color: #666; text-transform: uppercase; letter-spacing: 2px; font-size: 14px; margin-top: 5px;">Student Progress Report</div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Student Information</div>
                    <div style="font-weight: 700; font-size: 18px; color: #1e293b;">${student.name}</div>
                    <div style="font-size: 13px; color: #475569;">
                        <span><strong>Roll No:</strong> ${student.rollNumber || student.student_code || 'N/A'}</span>
                        <span style="margin-left: 20px;"><strong>Batch:</strong> ${student.batches ? student.batches.join(', ') : (student.batch || 'N/A')}</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Session Details</div>
                    <div style="font-weight: 600; color: #1e293b;">Academic Session 2026</div>
                    <div style="font-size: 13px; color: #475569;">Date: ${new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <h3 style="color: var(--primary); border-left: 4px solid var(--primary); padding-left: 10px; margin-bottom: 15px; font-size: 16px;">Academic Performance</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                    <tr style="background: var(--primary); color: white;">
                        <th style="padding: 12px; text-align: left; font-size: 13px;">Subject / Examination</th>
                        <th style="padding: 12px; text-align: center; font-size: 13px;">Obtained</th>
                        <th style="padding: 12px; text-align: center; font-size: 13px;">Total</th>
                        <th style="padding: 12px; text-align: right; font-size: 13px;">Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${examResults.length ? examResults.map(r => `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #edf2f7;">
                                <div style="font-weight: 600; color: #1e293b;">${r.examName}</div>
                                <div style="font-size: 12px; color: #64748b;">${r.subject}</div>
                            </td>
                            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #edf2f7; color: #1e293b;">${r.obtainedMarks}</td>
                            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #edf2f7; color: #1e293b;">${r.totalMarks}</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #edf2f7; font-weight: 700; color: var(--primary);">${r.percentage}%</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #94a3b8;">No academic records found for this period.</td></tr>'}
                </tbody>
            </table>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">Attendance Summary</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <div>
                            <span style="font-size: 24px; font-weight: 800; color: var(--success);">${daysPresent}</span>
                            <span style="font-size: 12px; color: #64748b;"> Present</span>
                        </div>
                        <div>
                            <span style="font-size: 24px; font-weight: 800; color: var(--danger);">${daysAbsent}</span>
                            <span style="font-size: 12px; color: #64748b;"> Absent</span>
                        </div>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #475569;">
                        Total Conduction: <strong>${totalConducted} Days</strong> | Record: <strong>${attendancePercentage}%</strong>
                    </div>
                    <div style="margin-top: 10px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                         <div style="width: ${attendancePercentage}%; height: 100%; background: ${attendancePercentage < 75 ? 'var(--danger)' : 'var(--success)'};"></div>
                    </div>
                </div>
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">Financial Summary</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #475569;">Fee Paid:</span>
                        <span style="font-weight: 700; color: #059669;">₹${paidFees}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 13px; color: #475569;">Balance Pending:</span>
                        <span style="font-weight: 700; color: #dc2626;">₹${totalFees - paidFees}</span>
                    </div>
                </div>
            </div>

            <div style="background: #fdf2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 10px; margin-bottom: 40px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; text-transform: uppercase;">Teacher's Comprehensive Remarks</h4>
                <p style="margin: 0; font-style: italic; color: #450a0a; line-height: 1.5; font-size: 14px;">"${remarks}"</p>
            </div>

            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding: 40px 20px 20px 20px;">
                <div style="text-align: center;">
                    <div style="height: 1px; width: 150px; background: #cbd5e1; margin-bottom: 8px;"></div>
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Class Teacher</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: var(--primary); margin-bottom: 0px; font-weight: 700;">Sudhesh</div>
                    <div style="height: 1px; width: 180px; background: #cbd5e1; margin-bottom: 8px;"></div>
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Director / Principal</div>
                </div>
            </div>
            
            <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8;">
                Academic Session 2026 | Computer Generated Document | Page 1 of 1
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
            <button class="btn btn-primary" onclick="printReport()"><i class="fas fa-file-pdf"></i> Download PDF Report</button>
            <button class="btn btn-success" onclick="shareReport()"><i class="fab fa-whatsapp"></i> Share on WhatsApp</button>
        </div>
    `;

    document.getElementById('reportPreview').innerHTML = html;
}

function printReport() {
    const element = document.querySelector('.report-card');
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
