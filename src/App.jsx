import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  GraduationCap,
  ShieldCheck,
  Search,
  Upload,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  LogOut,
  Trash2,
  UserCheck,
  Calendar,
  Hash
} from 'lucide-react';
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAM_TITLE,
  DEFAULT_INSTITUTION_NAME
} from './defaultData';

const STORAGE_KEY_DATA = 'exam_portal_students_v1';
const STORAGE_KEY_META = 'exam_portal_meta_v1';
const ADMIN_PASSCODE = 'admin123'; // Change this or use env variable VITE_ADMIN_PASSCODE

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const cleaned = String(dateStr).trim();
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return cleaned;
}

function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export default function App() {
  const [view, setView] = useState('student'); // 'student' | 'admin'
  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
  });
  const [meta, setMeta] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_META);
    return saved
      ? JSON.parse(saved)
      : {
          institutionName: DEFAULT_INSTITUTION_NAME,
          examTitle: DEFAULT_EXAM_TITLE,
          passPercentage: 40
        };
  });

  // Student Search State
  const [admissionNo, setAdmissionNo] = useState('');
  const [dob, setDob] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);

  // Admin State
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
  }, [meta]);

  const handleStudentSearch = (e) => {
    e.preventDefault();
    setSearchError('');
    setFoundStudent(null);

    const queryAdm = admissionNo.trim().toUpperCase();
    const queryDob = normalizeDate(dob);

    if (!queryAdm || !queryDob) {
      setSearchError('Please enter both Admission Number and Date of Birth.');
      return;
    }

    const match = students.find(
      (s) =>
        s.admission_no.trim().toUpperCase() === queryAdm &&
        normalizeDate(s.dob) === queryDob
    );

    if (!match) {
      setSearchError(
        'No matching record found. Please verify your Admission Number and Date of Birth.'
      );
      return;
    }

    setFoundStudent(match);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSCODE || ADMIN_PASSCODE;
    if (passwordInput === expected) {
      setIsAdminAuth(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Invalid admin passcode.');
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          if (!rows || rows.length === 0) {
            setUploadStatus({
              type: 'error',
              message: 'The uploaded CSV file is empty.'
            });
            return;
          }

          const reservedKeys = new Set([
            'admission_no',
            'dob',
            'student_name',
            'class_batch',
            'max_marks_per_subject'
          ]);

          const parsedStudents = [];

          for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            // Normalize header keys
            const row = {};
            Object.keys(rawRow).forEach((k) => {
              row[k.trim().toLowerCase()] = rawRow[k];
            });

            const adm = String(row['admission_no'] || '').trim();
            const studentDob = normalizeDate(row['dob']);
            const name = String(row['student_name'] || '').trim();
            const batch = String(row['class_batch'] || 'General').trim();
            const defaultMax = Number(row['max_marks_per_subject']) || 100;

            if (!adm || !studentDob || !name) {
              continue; // skip incomplete rows
            }

            const subjects = [];
            Object.keys(rawRow).forEach((origKey) => {
              const lowerKey = origKey.trim().toLowerCase();
              if (!reservedKeys.has(lowerKey) && origKey.trim() !== '') {
                const val = rawRow[origKey];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  const numericMark = Number(val);
                  if (!Number.isNaN(numericMark)) {
                    subjects.push({
                      name: origKey.replace(/_/g, ' ').trim(),
                      marks: numericMark,
                      maxMarks: defaultMax
                    });
                  }
                }
              }
            });

            if (subjects.length > 0) {
              parsedStudents.push({
                admission_no: adm,
                dob: studentDob,
                student_name: name,
                class_batch: batch,
                subjects
              });
            }
          }

          if (parsedStudents.length === 0) {
            setUploadStatus({
              type: 'error',
              message:
                'No valid student records found. Ensure columns include admission_no, dob, student_name, and subject marks.'
            });
            return;
          }

          setStudents(parsedStudents);
          setUploadStatus({
            type: 'success',
            message: `Successfully imported ${parsedStudents.length} student result records.`
          });
          e.target.value = '';
        } catch (err) {
          setUploadStatus({
            type: 'error',
            message: 'Failed to parse CSV file. Please check the format.'
          });
        }
      },
      error: () => {
        setUploadStatus({
          type: 'error',
          message: 'Error reading the CSV file.'
        });
      }
    });
  };

  const downloadSampleCsv = () => {
    const csvContent = [
      'admission_no,dob,student_name,class_batch,Mathematics,Physics,Chemistry,English,Computer_Science,Max_Marks_Per_Subject',
      'ADM1001,2008-05-14,Aarav Menon,Grade 10 - A,92,88,85,91,95,100',
      'ADM1002,2008-11-23,Diya Nair,Grade 10 - A,78,82,79,89,84,100',
      'ADM1003,2008-02-09,Rohan Varma,Grade 10 - B,34,45,38,62,55,100',
      'ADM1004,2008-08-30,Meera Krishnan,Grade 10 - B,96,94,91,95,98,100'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_exam_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetToDemoData = () => {
    setStudents(DEFAULT_STUDENTS);
    setUploadStatus({
      type: 'success',
      message: 'Restored default demo dataset (4 students).'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setView('student');
              setFoundStudent(null);
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                {meta.institutionName}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Official Examination Results Portal
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setView('student')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'student'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Student Portal
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                view === 'admin'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {view === 'student' ? (
          <div className="space-y-8">
            {/* Search Box */}
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 no-print">
              <div className="text-center mb-6">
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-2">
                  {meta.examTitle}
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  Check Your Exam Result
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your Admission Number and Date of Birth to view your scorecard.
                </p>
              </div>

              <form onSubmit={handleStudentSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Admission Number
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g., ADM1001"
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm uppercase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                {searchError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{searchError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>View Result</span>
                </button>
              </form>

              {/* Quick Demo Hint */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>Demo Credentials:</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdmissionNo('ADM1001');
                    setDob('2008-05-14');
                  }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Try ADM1001 (DOB: 2008-05-14)
                </button>
              </div>
            </div>

            {/* Result Marksheet Card */}
            {foundStudent && (
              <ResultCard
                student={foundStudent}
                meta={meta}
                onClose={() => setFoundStudent(null)}
              />
            )}
          </div>
        ) : (
          /* Admin Panel */
          <div className="max-w-3xl mx-auto">
            {!isAdminAuth ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-center text-slate-900">
                  Admin Authentication
                </h2>
                <p className="text-sm text-slate-500 text-center mt-1 mb-6">
                  Enter the administrator passcode to manage exam results.
                </p>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Enter admin passcode"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      required
                    />
                  </div>

                  {authError && (
                    <p className="text-sm text-rose-600 font-medium">{authError}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
                  >
                    Unlock Dashboard
                  </button>
                </form>
                <p className="text-xs text-center text-slate-400 mt-4">
                  Default demo passcode: <code className="text-slate-600">admin123</code>
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Admin Header Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Result Management Dashboard
                    </h2>
                    <p className="text-sm text-slate-500">
                      Upload CSV sheets and configure examination details.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAdminAuth(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Lock</span>
                  </button>
                </div>

                {/* Exam Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-base">
                    Portal & Exam Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        value={meta.institutionName}
                        onChange={(e) =>
                          setMeta({ ...meta, institutionName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Examination Title
                      </label>
                      <input
                        type="text"
                        value={meta.examTitle}
                        onChange={(e) =>
                          setMeta({ ...meta, examTitle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Minimum Pass Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={meta.passPercentage}
                        onChange={(e) =>
                          setMeta({
                            ...meta,
                            passPercentage: Number(e.target.value) || 40
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CSV Upload Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">
                        Upload Results via CSV
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Required columns: <code>admission_no</code>, <code>dob</code> (YYYY-MM-DD), <code>student_name</code>, plus any subject columns.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Sample CSV</span>
                    </button>
                  </div>

                  <label className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      Click to upload your CSV file
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Supports dynamic subject columns automatically
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadStatus && (
                    <div
                      className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${
                        uploadStatus.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {uploadStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{uploadStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Active Dataset Preview */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-slate-900">
                        Loaded Student Records ({students.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={resetToDemoData}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset to Demo Data</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                          <th className="py-3 px-4">Admission No</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">DOB</th>
                          <th className="py-3 px-4">Class / Batch</th>
                          <th className="py-3 px-4 text-right">Subjects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((st) => (
                          <tr key={st.admission_no} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                              {st.admission_no}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {st.student_name}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{st.dob}</td>
                            <td className="py-3 px-4 text-slate-600">{st.class_batch}</td>
                            <td className="py-3 px-4 text-right text-slate-600">
                              {st.subjects.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 no-print">
        <p>
          © {new Date().getFullYear()} {meta.institutionName} • Examination Portal
        </p>
      </footer>
    </div>
  );
}

function ResultCard({ student, meta, onClose }) {
  const totalMarks = student.subjects.reduce((acc, s) => acc + s.marks, 0);
  const totalMax = student.subjects.reduce((acc, s) => acc + s.maxMarks, 0);
  const percentage = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(2) : 0;

  const hasFailedAnySubject = student.subjects.some(
    (s) => (s.marks / s.maxMarks) * 100 < meta.passPercentage
  );
  const isPassed =
    !hasFailedAnySubject && Number(percentage) >= meta.passPercentage;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden print-card">
      {/* Banner */}
      <div className="bg-slate-900 text-white px-6 py-6 sm:px-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
            {meta.institutionName}
          </p>
          <h3 className="text-xl font-bold mt-0.5">{meta.examTitle}</h3>
          <p className="text-xs text-slate-400 mt-1">Official Statement of Marks</p>
        </div>

        <div
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isPassed
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {isPassed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Passed</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              <span>Needs Improvement</span>
            </>
          )}
        </div>
      </div>

      {/* Student Metadata */}
      <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Student Name</p>
          <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{student.student_name}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Admission No</p>
          <p className="font-mono font-semibold text-slate-900 mt-0.5">
            {student.admission_no}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Date of Birth</p>
          <p className="font-semibold text-slate-900 mt-0.5">{student.dob}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Class / Batch</p>
          <p className="font-semibold text-slate-900 mt-0.5">{student.class_batch}</p>
        </div>
      </div>

      {/* Marks Table */}
      <div className="p-6 sm:p-8">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-right">Max Marks</th>
                <th className="py-3 px-4 text-right">Marks Obtained</th>
                <th className="py-3 px-4 text-center">Grade</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {student.subjects.map((sub, idx) => {
                const subPct = (sub.marks / sub.maxMarks) * 100;
                const subPass = subPct >= meta.passPercentage;
                return (
                  <tr key={idx}>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {sub.name}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {sub.maxMarks}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {sub.marks}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-indigo-600">
                      {calculateGrade(subPct)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          subPass
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {subPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                <td className="py-3.5 px-4">Grand Total</td>
                <td className="py-3.5 px-4 text-right">{totalMax}</td>
                <td className="py-3.5 px-4 text-right text-indigo-700">
                  {totalMarks}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {calculateGrade(Number(percentage))}
                </td>
                <td className="py-3.5 px-4 text-right">{percentage}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
          >
            Clear Result
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
