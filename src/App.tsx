import React, { useState } from "react";
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
import { Job, Employee, PayrollRecord, AppUser, FileItem } from "./types";

const initialJobs: Job[] = [
  {
    id: "1",
    title: "Website Redesign",
    client: "Acme Corp",
    description:
      "Complete overhaul of the corporate website including new branding and e-commerce integration.",
    status: "request",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    amount: 15000,
    priority: "high",
    assignedTo: "Alice Smith",
    tags: ["design", "web"],
    activityLog: [
      {
        id: "l1",
        action: "Job request created",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        user: "System",
      },
    ],
  },
  {
    id: "2",
    title: "SEO Audit",
    client: "TechStart Inc",
    description:
      "Comprehensive SEO audit and keyword research for Q3 marketing push.",
    status: "estimation",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    priority: "medium",
    assignedTo: "Bob Jones",
    tags: ["marketing", "seo"],
    activityLog: [
      {
        id: "l2",
        action: "Job request created",
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        user: "System",
      },
      {
        id: "l3",
        action: "Moved from request to estimation",
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        user: "Alice Smith",
      },
    ],
  },
  {
    id: "3",
    title: "Mobile App MVP",
    client: "Fitness Plus",
    description:
      "React Native mobile app MVP with user authentication and basic workout tracking.",
    status: "in-progress",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    amount: 25000,
    priority: "high",
    assignedTo: "Charlie Brown",
    tags: ["mobile", "app"],
    activityLog: [
      {
        id: "l4",
        action: "Job request created",
        timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
        user: "System",
      },
      {
        id: "l5",
        action: "Moved from request to in-progress",
        timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
        user: "Bob Jones",
      },
    ],
  },
  {
    id: "4",
    title: "Logo Design",
    client: "Fresh Bakery",
    description: "New logo design and brand guidelines for local bakery chain.",
    status: "review",
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    amount: 2500,
    priority: "low",
    assignedTo: "Dana White",
    tags: ["branding", "logo"],
    activityLog: [
      {
        id: "l6",
        action: "Job request created",
        timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
        user: "System",
      },
    ],
  },
  {
    id: "5",
    title: "Q2 Marketing Campaign",
    client: "Global Retail",
    description:
      "Social media ad creatives and landing page design for Q2 campaign.",
    status: "invoiced",
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    amount: 8500,
    priority: "medium",
    assignedTo: "Alice Smith",
    tags: ["marketing", "ads"],
    activityLog: [
      {
        id: "l7",
        action: "Job request created",
        timestamp: new Date(Date.now() - 86400000 * 45).toISOString(),
        user: "System",
      },
    ],
  },
];

const initialEmployees: Employee[] = [
  {
    id: "e1",
    name: "Alice Smith",
    role: "Senior Designer",
    salary: 5000,
    workerType: "salary",
    paymentMethod: "Bank Transfer",
    status: "active",
  },
  {
    id: "e2",
    name: "Bob Jones",
    role: "Project Manager",
    salary: 4500,
    workerType: "salary",
    paymentMethod: "Bank Transfer",
    status: "active",
  },
  {
    id: "e3",
    name: "Charlie Brown",
    role: "Developer",
    salary: 6000,
    workerType: "salary",
    paymentMethod: "PayPal",
    status: "active",
  },
];

const initialUsers: AppUser[] = [
  {
    id: "u1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    permissions: ["dashboard", "jobs", "new-request", "payroll", "invoices", "users", "files"],
  },
  {
    id: "u2",
    name: "Alice Smith",
    email: "alice@example.com",
    role: "Manager",
    permissions: ["dashboard", "jobs", "new-request", "files"],
  },
];

const initialFiles: FileItem[] = [
  {
    id: "f1",
    name: "Brand_Guidelines_2024.pdf",
    size: 2500000,
    type: "application/pdf",
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    uploadedBy: "John Doe",
  },
  {
    id: "f2",
    name: "Logo_Assets.zip",
    size: 15000000,
    type: "application/zip",
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    uploadedBy: "Alice Smith",
  },
];

const initialSettings: BusinessSettings = {
  name: "Jobdo Solutions",
  address: "123 Creative Plaza, Design District, NY 10001",
  email: "billing@jobdo.com",
  phone: "+1 (555) 000-1234",
  logoUrl: "https://picsum.photos/200/100?random=1",
  paymentTerms: "Please make payment within 30 days of receiving this invoice.",
  currency: "USD",
  taxRate: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [settings, setSettings] = useState<BusinessSettings>(initialSettings);

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
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
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
          {activeTab === "new-request" && (
            <div className="max-w-4xl mx-auto">
              <JobRequestForm
                employees={employees}
                onSave={(jobData) => {
                  const newJob: Job = {
                    ...jobData,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                  };
                  setJobs([newJob, ...jobs]);
                  // Optionally switch to jobs tab after a delay or keep on form
                }}
              />
            </div>
          )}
          {activeTab !== "jobs" &&
            activeTab !== "new-request" &&
            activeTab !== "invoices" &&
            activeTab !== "settings" && (
              <div className="flex items-center justify-center h-full text-slate-400">
                {activeTab} content coming soon
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
