import React, { useState, useEffect } from "react";
import { Search, Bell } from "lucide-react";
import { JobBoard } from "./components/JobBoard";
import { Sidebar } from "./components/Sidebar";
import { JobRequestForm } from "./components/JobRequestForm";
import { Dashboard } from "./components/Dashboard";
import { Payroll } from "./components/Payroll";
import { UserManagement } from "./components/UserManagement";
import { FileRepository } from "./components/FileRepository";
import { Invoices } from "./components/Invoices";
import { Settings, BusinessSettings } from "./components/Settings";
import { ClientPortal } from "./components/ClientPortal";
import { Clients } from "./components/Clients";
import { Job, Employee, PayrollRecord, AppUser, FileItem } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check for magic link in URL early - only once on mount
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get("token");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [clientPortalToken, setClientPortalToken] = useState<string | null>(initialToken);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jobsRes, employeesRes, settingsRes] = await Promise.all([
        fetch("/api/jobs").then(res => {
          if (!res.ok) throw new Error("Failed to fetch jobs");
          return res.json();
        }),
        fetch("/api/employees").then(res => {
          if (!res.ok) throw new Error("Failed to fetch employees");
          return res.json();
        }),
        fetch("/api/settings").then(res => {
          if (!res.ok) throw new Error("Failed to fetch settings");
          return res.json();
        })
      ]);

      setJobs(jobsRes);
      setEmployees(employeesRes);
      setSettings(settingsRes);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load application data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (clientPortalToken) {
    return <ClientPortal token={clientPortalToken} />;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <div className="bg-red-100 text-red-600 rounded-full p-4 mb-4">
          <Search className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-500 mb-6 max-w-md">{error}</p>
        <button
          onClick={() => fetchData()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="font-medium">Loading Auvic Solutions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 w-96">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs, clients, or invoices..."
              className="bg-transparent border-none outline-none ml-2 text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-400 hover:text-slate-600 relative" title="View notifications" aria-label="View notifications">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50"></span>
            </button>
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
              JD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === "dashboard" && <Dashboard jobs={jobs} />}
          {activeTab === "jobs" && (
            <JobBoard
              jobs={jobs}
              setJobs={setJobs}
              employees={employees}
              settings={settings}
            />
          )}
          {activeTab === "payroll" && (
            <Payroll
              employees={employees}
              setEmployees={setEmployees}
              payrollRecords={payrollRecords}
              setPayrollRecords={setPayrollRecords}
            />
          )}
          {activeTab === "users" && (
            <UserManagement users={users} setUsers={setUsers} />
          )}
          {activeTab === "files" && (
            <FileRepository files={files} setFiles={setFiles} />
          )}
          {activeTab === "invoices" && (
            <Invoices
              jobs={jobs}
              setJobs={setJobs}
              employees={employees}
              settings={settings}
            />
          )}
          {activeTab === "settings" && (
            <Settings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === "clients" && <Clients />}
          {activeTab === "new-request" && (
            <div className="max-w-4xl mx-auto">
              <JobRequestForm
                employees={employees}
                onSave={async (jobData) => {
                  try {
                    const newId = crypto.randomUUID();
                    const response = await fetch('/api/jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...jobData,
                        id: newId,
                        createdAt: new Date().toISOString()
                      })
                    });
                    if (response.ok) {
                      const newJob = await response.json();
                      setJobs([newJob, ...jobs]);
                      setActiveTab("jobs");
                    }
                  } catch (error) {
                    console.error("Error creating job:", error);
                  }
                }}
              />
            </div>
          )}
          {activeTab !== "jobs" &&
            activeTab !== "new-request" &&
            activeTab !== "invoices" &&
            activeTab !== "settings" &&
            activeTab !== "dashboard" &&
            activeTab !== "payroll" &&
            activeTab !== "users" &&
            activeTab !== "files" &&
            activeTab !== "clients" && (
              <div className="flex items-center justify-center h-full text-slate-400">
                {activeTab} content coming soon
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
