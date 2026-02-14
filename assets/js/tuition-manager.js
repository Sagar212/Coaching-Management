// =====================================================
// TUITION MANAGER - COMPREHENSIVE COACHING MANAGEMENT
// =====================================================
// This module extends the existing DataManager with advanced
// coaching institute features

class TuitionManager {
    constructor(dataManager) {
        this.db = dataManager;
        this.messageTemplates = {
            fee_reminder: "Dear {parent_name}, This is a reminder that the fee payment of ₹{fee_due} for {student_name} is due on {due_date}. Please make the payment at your earliest convenience. - {institute_name}",
            exam_notification: "Dear {parent_name}, This is to inform you that {student_name} has an upcoming {exam_name} exam on {exam_date}. Please ensure your child is well-prepared. - {institute_name}",
            holiday_notice: "Dear Parents, Please note that the institute will remain closed on {holiday_date} for {holiday_name}. Regular classes will resume from {resume_date}. - {institute_name}",
            attendance_alert: "Dear {parent_name}, {student_name}'s attendance has fallen below the required threshold. Current attendance: {attendance_percentage}%. Please ensure regular attendance. - {institute_name}"
        };
    }

    // ========== STUDENT MANAGEMENT ==========

    enrollStudent(studentData) {
        // Add student code if not provided
        if (!studentData.student_code) {
            const count = this.db.getRecords('students').length + 1;
            studentData.student_code = `STU${new Date().getFullYear()}${String(count).padStart(4, '0')}`;
        }
        return this.db.addRecord('students', studentData);
    }

    getStudentFullProfile(studentId) {
        const student = this.db.getRecords('students').find(s => s.id === studentId);
        if (!student) return null;

        const fees = this.db.getRecords('payments').filter(p => p.studentId === studentId);
        const attendance = this.db.getRecords('attendance').filter(a => a.studentId === studentId);
        const exams = this.getStudentExamResults(studentId);
        const batches = this.getStudentBatches(studentId);

        return {
            ...student,
            fees,
            attendance,
            exams,
            batches,
            totalPaid: fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0),
            attendancePercentage: this.calculateAttendancePercentage(studentId)
        };
    }

    getStudentBatches(studentId) {
        const data = this.db.getData();
        return (data.batches || []).filter(batch =>
            (batch.students || []).includes(studentId)
        );
    }

    getStudentExamResults(studentId) {
        const data = this.db.getData();
        const exams = data.exams || [];
        const results = [];

        exams.forEach(exam => {
            const result = (exam.results || []).find(r => r.studentId === studentId);
            if (result) {
                results.push({
                    ...exam,
                    marks: result.marks,
                    grade: result.grade,
                    rank: result.rank
                });
            }
        });

        return results;
    }

    // ========== BATCH MANAGEMENT ==========

    createBatchWithSchedule(batchData) {
        if (!batchData.batch_code) {
            const count = this.db.getRecords('batches').length + 1;
            batchData.batch_code = `BATCH${new Date().getFullYear()}${String(count).padStart(3, '0')}`;
        }
        batchData.students = batchData.students || [];
        batchData.currentEnrollment = (batchData.students || []).length;
        return this.db.addRecord('batches', batchData);
    }

    assignTeacherToBatch(batchId, teacherId) {
        return this.db.updateRecord('batches', batchId, { teacherId });
    }

    addStudentToBatch(batchId, studentId) {
        const batch = this.db.getRecords('batches').find(b => b.id === batchId);
        if (!batch) return false;

        if (!batch.students) batch.students = [];
        if (!batch.students.includes(studentId)) {
            batch.students.push(studentId);
            batch.currentEnrollment = batch.students.length;
            this.db.updateRecord('batches', batchId, batch);
            return true;
        }
        return false;
    }

    // ========== FEE MANAGEMENT ==========

    recordPayment(paymentData) {
        if (!paymentData.receipt_number) {
            const count = this.db.getRecords('payments').length + 1;
            paymentData.receipt_number = `RCP${new Date().getFullYear()}${String(count).padStart(5, '0')}`;
        }
        return this.db.addRecord('payments', paymentData);
    }

    getPendingPayments(daysAhead = 7) {
        const data = this.db.getData();
        const payments = data.payments || [];
        const students = data.students || [];
        const today = new Date();
        const futureDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

        return payments.filter(p => {
            if (p.status !== 'pending' && p.status !== 'partial') return false;
            if (!p.dueDate) return false;
            const dueDate = new Date(p.dueDate);
            return dueDate >= today && dueDate <= futureDate;
        }).map(p => {
            const student = students.find(s => s.id === p.studentId);
            return {
                ...p,
                studentName: student?.name || 'Unknown',
                parentPhone: student?.parentPhone || '',
                daysUntilDue: Math.ceil((new Date(p.dueDate) - today) / (24 * 60 * 60 * 1000))
            };
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    calculateFeeStats() {
        const payments = this.db.getRecords('payments');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const stats = {
            totalCollected: 0,
            monthlyCollected: 0,
            totalPending: 0,
            totalOverdue: 0
        };

        payments.forEach(p => {
            const amount = parseFloat(p.amount) || 0;
            const paymentDate = new Date(p.paymentDate || p.date);
            const status = p.status || 'paid'; // Default to paid if not specified

            if (status === 'paid') {
                stats.totalCollected += amount;
                if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
                    stats.monthlyCollected += amount;
                }
            } else if (status === 'pending') {
                stats.totalPending += amount;
            } else if (status === 'overdue' || status === 'partial') {
                // For partial, the 'amount' is what's paid, but status might be 'partial'
                // Actually, if status is 'paid' it means this transaction is done.
                // If the whole student fee is partial, that's different.
                // In recordPayment, amount is what was just paid.
                stats.totalCollected += amount;
            }
        });

        return stats;
    }

    // ========== ATTENDANCE MANAGEMENT ==========

    markAttendance(batchId, date, present) {
        // Find if record already exists for this batch and date
        const existing = this.db.getRecords('attendance').find(a =>
            (a.batchId === batchId || a.batch === batchId) && a.date === date
        );

        const attendanceData = {
            batchId,
            batch: batchId, // legacy support
            date,
            present, // Array of student IDs
            markedBy: this.db.getData().settings.adminName || 'Admin'
        };

        if (existing) {
            return this.db.updateRecord('attendance', existing.id, attendanceData);
        } else {
            return this.db.addRecord('attendance', attendanceData);
        }
    }

    calculateAttendancePercentage(studentId, startDate = null, endDate = null) {
        const attendance = this.db.getRecords('attendance').filter(a => {
            if (a.studentId !== studentId) return false;
            if (startDate && new Date(a.date) < new Date(startDate)) return false;
            if (endDate && new Date(a.date) > new Date(endDate)) return false;
            return true;
        });

        if (attendance.length === 0) return 0;

        const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        return Math.round((present / attendance.length) * 100);
    }

    getBatchAttendanceStats(batchId) {
        const batch = this.db.getRecords('batches').find(b => b.id === batchId);
        if (!batch) return null;

        const students = batch.students || [];
        const stats = students.map(studentId => {
            const student = this.db.getRecords('students').find(s => s.id === studentId);
            return {
                studentId,
                studentName: student?.name || 'Unknown',
                percentage: this.calculateAttendancePercentage(studentId)
            };
        });

        return {
            batchName: batch.name,
            students: stats,
            averageAttendance: stats.length > 0
                ? Math.round(stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length)
                : 0
        };
    }

    // ========== EXAM MANAGEMENT ==========

    createExam(examData) {
        if (!examData.exam_code) {
            const count = this.db.getRecords('exams').length + 1;
            examData.exam_code = `EXM${new Date().getFullYear()}${String(count).padStart(4, '0')}`;
        }
        examData.results = examData.results || [];
        examData.status = examData.status || 'scheduled';
        return this.db.addRecord('exams', examData);
    }

    enterMarks(examId, results, status = 'completed') {
        const exam = this.db.getRecords('exams').find(e => e.id === examId);
        if (!exam) return false;

        exam.results = results.map((r, index) => ({
            ...r,
            rank: index + 1 // Will be recalculated after sorting
        }));

        // Sort by marks and assign ranks
        exam.results.sort((a, b) => (parseFloat(b.marks) || 0) - (parseFloat(a.marks) || 0));
        exam.results.forEach((r, index) => {
            r.rank = index + 1;
            // Calculate grade
            const percentage = (parseFloat(r.marks) / parseFloat(exam.totalMarks)) * 100;
            if (percentage >= 90) r.grade = 'A+';
            else if (percentage >= 80) r.grade = 'A';
            else if (percentage >= 70) r.grade = 'B+';
            else if (percentage >= 60) r.grade = 'B';
            else if (percentage >= 50) r.grade = 'C';
            else if (percentage >= 40) r.grade = 'D';
            else r.grade = 'F';

            r.status = parseFloat(r.marks) >= parseFloat(exam.passingMarks) ? 'Pass' : 'Fail';
        });

        exam.status = status;
        return this.db.updateRecord('exams', examId, exam);
    }

    getExamAnalytics(examId) {
        const exam = this.db.getRecords('exams').find(e => e.id === examId);
        if (!exam || !exam.results || exam.results.length === 0) return null;

        const marks = exam.results.map(r => parseFloat(r.marks) || 0);
        const passingMarks = parseFloat(exam.passingMarks) || 0;

        return {
            examName: exam.name,
            totalStudents: exam.results.length,
            averageMarks: (marks.reduce((sum, m) => sum + m, 0) / marks.length).toFixed(2),
            highestMarks: Math.max(...marks),
            lowestMarks: Math.min(...marks),
            passed: exam.results.filter(r => parseFloat(r.marks) >= passingMarks).length,
            failed: exam.results.filter(r => parseFloat(r.marks) < passingMarks).length,
            passPercentage: ((exam.results.filter(r => parseFloat(r.marks) >= passingMarks).length / exam.results.length) * 100).toFixed(2)
        };
    }

    generateReportCard(studentId, examId) {
        const student = this.db.getRecords('students').find(s => s.id === studentId);
        const exam = this.db.getRecords('exams').find(e => e.id === examId);

        if (!student || !exam) return null;

        const result = (exam.results || []).find(r => r.studentId === studentId);
        if (!result) return null;

        const analytics = this.getExamAnalytics(examId);

        return {
            student: {
                name: student.name,
                code: student.student_code,
                batch: this.getStudentBatches(studentId)[0]?.name || 'N/A',
                parent: student.parentName,
                attendance: this.getStudentAttendance(studentId)
            },
            exam: {
                name: exam.name,
                subject: exam.subject,
                date: exam.examDate,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks
            },
            result: {
                marks: result.marks,
                grade: result.grade,
                rank: result.rank,
                remarks: result.remarks || this.generateAutoRemark(result.marks, exam.totalMarks)
            },
            analytics: {
                classAverage: analytics.averageMarks,
                highest: analytics.highestMarks,
                lowest: analytics.lowestMarks,
                percentile: this.calculatePercentile(result.marks, exam.results)
            }
        };
    }

    generateAutoRemark(marks, total) {
        const percentage = (marks / total) * 100;
        if (percentage >= 90) return "Outstanding performance! Keep up the excellent work.";
        if (percentage >= 80) return "Very good performance. A little more effort can lead to perfection.";
        if (percentage >= 70) return "Good job. Consistency is key to further improvement.";
        if (percentage >= 60) return "Fair performance. Needs to focus more on weak areas.";
        if (percentage >= 50) return "Average performance. Regular practice is required.";
        return "Needs critical attention. Please schedule a meeting with the tutor.";
    }

    calculatePercentile(marks, allResults) {
        const sorted = allResults.map(r => parseFloat(r.marks)).sort((a, b) => a - b);
        const rank = sorted.indexOf(parseFloat(marks));
        return Math.round(((rank + 1) / sorted.length) * 100);
    }

    // ========== PARENT COMMUNICATION ==========

    sendMessage(recipients, message, type = 'sms') {
        // This is a placeholder function
        // In production, integrate with SMS/WhatsApp/Email APIs
        const communications = [];
        const settings = this.db.getData().settings;

        recipients.forEach(recipient => {
            const commData = {
                studentId: recipient.studentId,
                batchId: recipient.batchId || null,
                messageType: type,
                recipientPhone: recipient.phone,
                recipientEmail: recipient.email,
                subject: recipient.subject || '',
                message: this.replacePlaceholders(message, recipient),
                sentBy: settings.adminName || 'Admin',
                status: 'sent', // In production, this would be updated based on API response
                sentAt: new Date().toISOString()
            };
            communications.push(this.db.addRecord('communications', commData));
        });

        return communications;
    }

    replacePlaceholders(message, data) {
        const settings = this.db.getData().settings;
        return message
            .replace(/{student_name}/g, data.studentName || '')
            .replace(/{parent_name}/g, data.parentName || '')
            .replace(/{fee_due}/g, data.feeDue || '')
            .replace(/{due_date}/g, data.dueDate || '')
            .replace(/{exam_name}/g, data.examName || '')
            .replace(/{exam_date}/g, data.examDate || '')
            .replace(/{attendance_percentage}/g, data.attendancePercentage || '')
            .replace(/{institute_name}/g, settings.name || 'Our Institute')
            .replace(/{holiday_name}/g, data.holidayName || '')
            .replace(/{holiday_date}/g, data.holidayDate || '')
            .replace(/{resume_date}/g, data.resumeDate || '');
    }

    getMessageHistory(studentId = null) {
        const communications = this.db.getRecords('communications');
        if (studentId) {
            return communications.filter(c => c.studentId === studentId);
        }
        return communications;
    }

    // ========== COMMUNICATION HELPERS ==========

    getWhatsAppLink(phone, message) {
        if (!phone) return null;
        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '');
        // For India, add 91 if not present (assuming 10 digit number)
        const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    }

    getEmailLink(email, subject, body) {
        if (!email) return null;
        return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    triggerWhatsApp(phone, message) {
        const link = this.getWhatsAppLink(phone, message);
        if (link) window.open(link, '_blank');
        return link;
    }

    triggerEmail(email, subject, body) {
        const link = this.getEmailLink(email, subject, body);
        if (link) window.open(link, '_blank');
        return link;
    }

    // ========== TEACHER PAYROLL ==========

    calculateSalary(teacherId, month) {
        const teacher = this.db.getRecords('tutors').find(t => t.id === teacherId);
        if (!teacher) return null;

        const baseSalary = parseFloat(teacher.salary || 0);

        // Get classes taken in the month (from attendance or batch sessions)
        const classesTaken = this.getTeacherClassesInMonth(teacherId, month);

        let totalSalary = baseSalary;
        if (teacher.salaryType === 'per_class') {
            totalSalary = baseSalary * classesTaken;
        }

        return {
            teacherId,
            teacherName: teacher.name,
            month,
            baseSalary,
            classesTaken,
            totalSalary
        };
    }

    getTeacherClassesInMonth(teacherId, month) {
        // This would count actual classes from attendance or batch sessions
        // For now, returning a placeholder
        const batches = this.db.getRecords('batches').filter(b => b.teacherId === teacherId);
        return batches.length * 20; // Assuming 20 classes per batch per month
    }

    recordPayrollPayment(payrollData) {
        if (!payrollData.receipt_number) {
            const count = this.db.getRecords('payroll').length + 1;
            payrollData.receipt_number = `PAY${new Date().getFullYear()}${String(count).padStart(5, '0')}`;
        }
        return this.db.addRecord('payroll', payrollData);
    }

    getPayrollHistory(teacherId = null, month = null) {
        let payroll = this.db.getRecords('payroll');

        if (teacherId) {
            payroll = payroll.filter(p => p.teacherId === teacherId);
        }
        if (month) {
            payroll = payroll.filter(p => p.month === month);
        }

        return payroll;
    }

    calculatePayrollStats() {
        const payroll = this.db.getRecords('payroll');
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const stats = {
            totalPaid: 0,
            monthlyPaid: 0,
            totalPending: 0,
            teacherCount: new Set()
        };

        payroll.forEach(p => {
            const amount = parseFloat(p.totalAmount) || 0;
            stats.teacherCount.add(p.teacherId);

            if (p.status === 'paid') {
                stats.totalPaid += amount;
                if (p.month === currentMonth) {
                    stats.monthlyPaid += amount;
                }
            } else if (p.status === 'pending') {
                stats.totalPending += amount;
            }
        });

        stats.teacherCount = stats.teacherCount.size;

        return stats;
    }

    // ========== ANALYTICS & REPORTS ==========

    getDashboardStats() {
        const students = this.db.getRecords('students');
        const batches = this.db.getRecords('batches');
        const tutors = this.db.getRecords('tutors');
        const feeStats = this.calculateFeeStats();
        const payrollStats = this.calculatePayrollStats();

        return {
            totalStudents: students.filter(s => s.status === 'active').length,
            totalBatches: batches.filter(b => b.status === 'active').length,
            totalTutors: tutors.filter(t => t.status === 'active').length,
            monthlyRevenue: feeStats.monthlyCollected,
            totalRevenue: feeStats.totalCollected,
            pendingFees: feeStats.totalPending,
            monthlyExpenses: payrollStats.monthlyPaid,
            totalExpenses: payrollStats.totalPaid
        };
    }

    // ========== REMINDER SYNC ==========

    syncFeeRemindersToEvents() {
        const students = this.db.getRecords('students');
        let events = this.db.getRecords('events');

        let updated = false;
        students.forEach(s => {
            if (s.reminderDate) {
                const eventId = `fee-rem-${s.id}`;
                const existing = events.find(e => e.id === eventId);

                const eventData = {
                    id: eventId,
                    title: `Fee: ${s.name}`,
                    date: s.reminderDate,
                    type: 'feeReminder',
                    studentId: s.id,
                    description: `Automated reminder for ${s.name}. Plan: ${s.paymentPlan || 'N/A'}`
                };

                if (!existing) {
                    events.push(eventData);
                    updated = true;
                } else if (existing.date !== s.reminderDate) {
                    const idx = events.indexOf(existing);
                    events[idx] = eventData;
                    updated = true;
                }
            }
        });

        if (updated) {
            const data = this.db.getData();
            data.events = events;
            this.db.saveData(data);
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TuitionManager;
}
