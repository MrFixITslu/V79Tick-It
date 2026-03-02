import React, { useState } from "react";
import { Job, Employee, JobNote } from "../types";
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Tag,
  Calendar,
  History,
  Building2,
  Image as ImageIcon,
  Printer,
  MessageSquare,
  Send,
  Timer,
  Play,
  Square,
} from "lucide-react";
import { BusinessSettings } from "./Settings";

export function JobDetailModal({
  job,
  employees,
  settings,
  onClose,
  onUpdate,
}: {
  job: Job;
  employees: Employee[];
  settings: BusinessSettings;
  onClose: () => void;
  onUpdate: (updatedJob: Job) => void;
}) {
  const [invoiceNotes, setInvoiceNotes] = useState(job.invoiceNotes || "");
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerStart, setActiveTimerStart] = useState<string | null>(null);

  // For Demo purposes, hardcode current employee
  const currentEmployeeId = employees[0]?.id || "e1";

  const handleSaveNotes = () => {
    onUpdate({ ...job, invoiceNotes });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: JobNote = {
      id: crypto.randomUUID(),
      text: newNote,
      timestamp: new Date().toISOString(),
      user: "Current User",
    };
    onUpdate({ ...job, notes: [...(job.notes || []), note] });
    setNewNote("");
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // Stop timer logic
      const sessionStart = activeTimerStart || new Date().toISOString();
      const sessionEnd = new Date().toISOString();
      const newTimeLog = {
        id: crypto.randomUUID(),
        employeeId: currentEmployeeId,
        startTime: sessionStart,
        endTime: sessionEnd,
      };

      onUpdate({
        ...job,
        timeLogs: [...(job.timeLogs || []), newTimeLog],
      });

      setIsTimerRunning(false);
      setActiveTimerStart(null);
    } else {
      // Start timer logic
      setIsTimerRunning(true);
      setActiveTimerStart(new Date().toISOString());
    }
  };

  const calculateTotalHours = () => {
    if (!job.timeLogs || job.timeLogs.length === 0) return 0;

    return job.timeLogs.reduce((total, log) => {
      if (!log.endTime) return total;
      const start = new Date(log.startTime).getTime();
      const end = new Date(log.endTime).getTime();
      return total + (end - start) / (1000 * 60 * 60); // convert ms to hours
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${job.priority === "high"
                  ? "bg-red-100 text-red-700"
                  : job.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-200 text-slate-700"
                }`}
            >
              {job.priority}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Client
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {job.client}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Status
              </p>
              <p className="font-semibold text-slate-900 capitalize">
                {job.status.replace("-", " ")}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Amount
              </p>
              <p className="font-semibold text-slate-900 flex items-center">
                {job.amount ? job.amount.toLocaleString() : "TBD"}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> Time Logged
                  </p>
                  <button
                    onClick={handleToggleTimer}
                    className={`p-1.5 rounded-full flex items-center gap-1 text-[10px] font-bold uppercase transition-all shadow-sm ${isTimerRunning
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Square className="w-3 h-3 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" /> Start Timer
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {calculateTotalHours().toFixed(2)}<span className="text-sm font-semibold text-slate-500 ml-1">hrs</span>
                  </p>
                  {isTimerRunning && (
                    <span className="flex h-2.5 w-2.5 relative mb-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> Assigned To
              </h4>
              <select
                value={job.assignedTo || ""}
                onChange={(e) =>
                  onUpdate({ ...job, assignedTo: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" /> Tags (comma separated)
              </h4>
              <input
                type="text"
                value={job.tags?.join(", ") || ""}
                onChange={(e) =>
                  onUpdate({
                    ...job,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                placeholder="e.g. urgent, design, web"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">
              Description
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap">
              {job.description || "No description provided."}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" /> Job Notes
            </h4>
            <div className="space-y-4 mb-4">
              {job.notes?.map((note) => (
                <div key={note.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700 mb-1">{note.text}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {note.user} • {new Date(note.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
              {(!job.notes || job.notes.length === 0) && (
                <p className="text-sm text-slate-400 italic">No notes yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={handleAddNote}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {job.activityLog && job.activityLog.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" /> Activity Log
              </h4>
              <div className="space-y-4">
                {job.activityLog
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700">{log.action}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {log.user} •{" "}
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {job.status === "invoiced" ||
            job.status === "completed" ||
            invoiceNotes ? (
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Invoice Configuration
                </h4>
                <button
                  onClick={() => setShowInvoicePreview(true)}
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Preview & Print Invoice
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Business Details
                  </p>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="text-sm font-bold text-slate-900">{settings.name}</p>
                    <p className="text-xs text-slate-500">{settings.address}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Manage these details in the Settings tab.</p>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Invoice Terms
                  </p>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600 line-clamp-3">{settings.paymentTerms}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Line Items</p>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none text-sm text-slate-700"
                  placeholder="Enter invoice line items (e.g., 1. Web Design - $500)..."
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showInvoicePreview && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl my-8 rounded-none shadow-2xl p-12 relative print:p-0 print:shadow-none print:my-0">
            <button
              onClick={() => setShowInvoicePreview(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex justify-between items-start mb-12">
              <div>
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 mb-4 object-contain" referrerPolicy="no-referrer" />
                )}
                <h2 className="text-2xl font-bold text-slate-900">{settings.name}</h2>
                <p className="text-sm text-slate-500 max-w-xs">{settings.address}</p>
                <p className="text-sm text-slate-500">{settings.email} | {settings.phone}</p>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-light text-slate-300 uppercase tracking-widest mb-4">Invoice</h1>
                <p className="text-sm font-bold text-slate-900">Invoice #: INV-{job.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To:</h4>
                <p className="font-bold text-slate-900">{job.client}</p>
                <p className="text-sm text-slate-500">Project: {job.title}</p>
              </div>
            </div>

            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-3 text-xs font-bold uppercase tracking-widest">Description</th>
                  <th className="text-right py-3 text-xs font-bold uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceNotes.split('\n').filter(line => line.trim()).map((line, i) => (
                  <tr key={i}>
                    <td className="py-4 text-sm text-slate-700">{line}</td>
                    <td className="py-4 text-right text-sm font-medium text-slate-900">
                      {/* Simple logic to extract amount if present, else just show - */}
                      {line.includes('$') ? line.split('$')[1] : '-'}
                    </td>
                  </tr>
                ))}
                {!invoiceNotes && (
                  <tr>
                    <td className="py-4 text-sm text-slate-700">{job.title} - Full Project</td>
                    <td className="py-4 text-right text-sm font-medium text-slate-900">${job.amount?.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-6 text-right font-bold text-slate-900 uppercase tracking-widest">Total</td>
                  <td className="py-6 text-right text-xl font-bold text-indigo-600">${job.amount?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div className="border-t border-slate-100 pt-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes & Terms:</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {settings.paymentTerms}
                <br />
                Thank you for your business!
              </p>
            </div>

            <div className="mt-12 flex justify-center print:hidden">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
              >
                <Printer className="w-5 h-5" />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
