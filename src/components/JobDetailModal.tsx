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
  const [activeTab, setActiveTab] = useState<"activity" | "notes" | "chat">("activity");
  const [messages, setMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);


  // For Demo purposes, hardcode current employee
  const currentEmployeeId = employees[0]?.id || "e1";
  const currentUser = employees[0]?.name || "Team";

  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/jobs/${job.id}/messages`);
        if (res.ok) setMessages(await res.json());
      } catch (e) {
        console.error("Fetch messages error:", e);
      }
    };

    fetchMessages();
    const poll = setInterval(fetchMessages, 5000);
    return () => clearInterval(poll);
  }, [job.id]);

  React.useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: currentUser,
          content: newChatMessage.trim()
        })
      });
      if (res.ok) {
        const sent = await res.json();
        setMessages(prev => [...prev, sent]);
        setNewChatMessage("");
      }
    } catch (e) {
      console.error("Send message error:", e);
    } finally {
      setIsSendingMessage(false);
    }
  };


  const updateJobInDb = async (updatedJob: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedJob)
      });
      if (!response.ok) throw new Error("Failed to update job");
      onUpdate(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleSaveNotes = () => {
    updateJobInDb({ ...job, invoiceNotes });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: JobNote = {
      id: crypto.randomUUID(),
      text: newNote,
      timestamp: new Date().toISOString(),
      user: "Current User",
    };
    updateJobInDb({ ...job, notes: [...(job.notes || []), note] });
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

      updateJobInDb({
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

  const [isSendingLink, setIsSendingLink] = useState(false);
  const [sendResult, setSendResult] = useState<"idle" | "success" | "error">("idle");

  const handleSendLink = async () => {
    if (!job.clientEmail) {
      alert("Please add a client email address to send the link.");
      return;
    }

    setIsSendingLink(true);
    setSendResult("idle");
    try {
      const response = await fetch(`/api/jobs/${job.id}/send-portal`, {
        method: "POST"
      });
      if (!response.ok) throw new Error("Failed to send");
      setSendResult("success");
      setTimeout(() => setSendResult("idle"), 3000);
    } catch (error) {
      console.error("Error sending link:", error);
      setSendResult("error");
      setTimeout(() => setSendResult("idle"), 3000);
    } finally {
      setIsSendingLink(false);
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
          <div className="flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendLink}
              disabled={isSendingLink || !job.clientEmail || sendResult === "success"}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${sendResult === "success"
                ? "bg-emerald-100 text-emerald-700"
                : sendResult === "error"
                  ? "bg-red-100 text-red-700"
                  : job.clientEmail
                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              title={!job.clientEmail ? "Client email required" : "Email client portal link"}
            >
              {isSendingLink ? (
                <span className="animate-spin w-3 h-3 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full" />
              ) : sendResult === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {sendResult === "success" ? "Sent!" : sendResult === "error" ? "Failed" : "Send Portal Link"}
            </button>
            <button
              onClick={onClose}
              title="Close job details"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Client Info
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {job.client}
              </p>
              <input
                type="email"
                placeholder="Client Email"
                value={job.clientEmail || ""}
                onChange={(e) => updateJobInDb({ ...job, clientEmail: e.target.value })}
                className="text-[10px] w-full px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
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
                  updateJobInDb({ ...job, assignedTo: e.target.value })
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
                  updateJobInDb({
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

          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 mb-2">
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "activity" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <History className="w-4 h-4" /> Activity
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "notes" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <FileText className="w-4 h-4" /> Notes
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === "chat" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <MessageSquare className="w-4 h-4" /> Client Chat
              {messages.some(m => m.sender === 'Client') && (
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px] flex flex-col">
            {activeTab === "activity" && (
              <div className="space-y-4 py-4">
                {job.activityLog?.slice().reverse().map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">{log.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {log.user} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!job.activityLog || job.activityLog.length === 0) && (
                  <p className="text-sm text-slate-400 italic">No activity logged yet.</p>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="flex flex-col h-full py-4">
                <div className="space-y-4 mb-4 flex-1">
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
                    placeholder="Add a private note..."
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
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-[350px] py-4">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 italic">No messages with the client yet.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={m.id || i} className={`flex ${m.sender === 'Client' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.sender !== 'Client'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 rounded-tl-none'
                        }`}>
                        <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[9px] font-bold uppercase tracking-wider">
                          <User className="w-2.5 h-2.5" /> {m.sender}
                        </div>
                        <p>{m.content}</p>
                        <p className={`text-[9px] mt-1 opacity-60 ${m.sender !== 'Client' ? 'text-right' : 'text-left'}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 mt-auto">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                    placeholder="Reply to client..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!newChatMessage.trim() || isSendingMessage}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>


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
              title="Close invoice preview"
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
