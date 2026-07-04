import React, { useState, useEffect } from "react";
import { Search, Bell, Shield, LogOut, CheckSquare, RefreshCw } from "lucide-react";
import { JobBoard } from "./components/JobBoard";
import { Sidebar } from "./components/Sidebar";
import { JobRequestForm } from "./components/JobRequestForm";
import { Dashboard } from "./components/Dashboard";
import { Payroll } from "./components/Payroll";
import { UserManagement } from "./components/UserManagement";
import { FileRepository } from "./components/FileRepository";
import { Invoices } from "./components/Invoices";
import { Clients } from "./components/Clients";
import { Settings } from "./components/Settings";
import { AuthGate } from "./components/AuthGate";
import { Job, Employee, PayrollRecord, AppUser, FileItem, Client, BusinessSettings, AuthenticatedUser, Business } from "./types";

// SEED DATA FOR DEMO CORPORATIONS

const initialClients: Client[] = [
  {
    id: "c1",
    name: "John Smith",
    company: "Acme Corp",
    email: "john@acmecorp.com",
    phone: "+1 (555) 123-4567",
    address: "123 Industrial Way, Springfield, IL 62704",
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: "c2",
    name: "Sarah Johnson",
    company: "TechStart Inc",
    email: "sarah@techstart.io",
    phone: "+1 (555) 987-6543",
    address: "456 Innovation Blvd, San Francisco, CA 94105",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "c3",
    name: "Mike Miller",
    company: "Fitness Plus",
    email: "mike@fitnessplus.com",
    phone: "+1 (555) 246-8101",
    address: "789 Gym Rd, Austin, TX 78701",
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

const initialJobs: Job[] = [
  {
    id: "1",
    title: "Website Redesign",
    client: "Acme Corp",
    clientId: "c1",
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
    clientId: "c2",
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
    clientId: "c3",
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
];

const initialEmployees: Employee[] = [
  {
    id: "e1",
    name: "Alice Smith",
    role: "Project Manager",
    salary: 5000,
    workerType: "salary",
    paymentMethod: "Bank Transfer",
    status: "active",
  },
  {
    id: "e2",
    name: "Bob Jones",
    role: "Designer",
    salary: 40,
    workerType: "hourly",
    paymentMethod: "PayPal",
    status: "active",
    timeCards: [
      {
        id: "tc1",
        date: "2026-06-25",
        clockIn: "08:00",
        clockOut: "17:00",
        hoursWorked: 9,
      },
      {
        id: "tc2",
        date: "2026-06-26",
        clockIn: "09:00",
        clockOut: "17:00",
        hoursWorked: 8,
      },
    ],
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    const saved = localStorage.getItem("tickit_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeBusiness, setActiveBusiness] = useState<Business | null>(() => {
    const saved = localStorage.getItem("tickit_active_business");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState("dashboard");

  // Partitioned state variables loaded based on activeBusiness.id
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    name: "",
    address: "",
    email: "",
    phone: "",
    logoUrl: "",
    paymentTerms: "",
    currency: "USD",
    taxRate: 0,
  });

  // Fetch partitioned database when activeBusiness changes
  useEffect(() => {
    if (!activeBusiness) return;

    const bizId = activeBusiness.id;

    // Helper functions to load partition or fallback to seeds (for pre-seeded business) or defaults
    const loadPartition = <T,>(key: string, seed: T): T => {
      const stored = localStorage.getItem(`tickit_${bizId}_${key}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // parse error
        }
      }
      
      // Seeding logic: Only preseed standard demo businesses
      const isPreseeded = bizId === "biz_tickit" || bizId === "biz_apex";
      const finalSeed = isPreseeded ? seed : ([] as unknown as T);

      localStorage.setItem(`tickit_${bizId}_${key}`, JSON.stringify(finalSeed));
      return finalSeed;
    };

    // Load jobs
    const loadedJobs = loadPartition<Job[]>("jobs", initialJobs);
    setJobs(loadedJobs);

    // Load clients
    const loadedClients = loadPartition<Client[]>("clients", initialClients);
    setClients(loadedClients);

    // Load employees
    const loadedEmployees = loadPartition<Employee[]>("employees", initialEmployees);
    setEmployees(loadedEmployees);

    // Load files
    const loadedFiles = loadPartition<FileItem[]>("files", initialFiles);
    setFiles(loadedFiles);

    // Load payroll
    const loadedPayroll = loadPartition<PayrollRecord[]>("payroll", []);
    setPayrollRecords(loadedPayroll);

    // Load users
    const loadedUsers = loadPartition<AppUser[]>("users", initialUsers);
    setUsers(loadedUsers);

    // Load Settings
    const storedSettings = localStorage.getItem(`tickit_${bizId}_settings`);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {}
    } else {
      localStorage.setItem(`tickit_${bizId}_settings`, JSON.stringify(activeBusiness.settings));
      setSettings(activeBusiness.settings);
    }

  }, [activeBusiness]);

  // Synchronize partitioned database on state changes
  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_jobs`, JSON.stringify(jobs));
  }, [jobs, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_clients`, JSON.stringify(clients));
  }, [clients, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_employees`, JSON.stringify(employees));
  }, [employees, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_files`, JSON.stringify(files));
  }, [files, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_payroll`, JSON.stringify(payrollRecords));
  }, [payrollRecords, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    localStorage.setItem(`tickit_${activeBusiness.id}_users`, JSON.stringify(users));
  }, [users, activeBusiness]);

  const handleUpdateSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    if (activeBusiness) {
      localStorage.setItem(`tickit_${activeBusiness.id}_settings`, JSON.stringify(newSettings));
      
      // Update business name inside activeBusiness representation too
      const updatedBiz = { ...activeBusiness, name: newSettings.name, settings: newSettings };
      setActiveBusiness(updatedBiz);
      localStorage.setItem("tickit_active_business", JSON.stringify(updatedBiz));

      // Update registered businesses list in localStorage
      const storedBizs = localStorage.getItem("tickit_registered_businesses");
      if (storedBizs) {
        try {
          const parsed = JSON.parse(storedBizs) as Business[];
          const updatedList = parsed.map(b => b.id === activeBusiness.id ? updatedBiz : b);
          localStorage.setItem("tickit_registered_businesses", JSON.stringify(updatedList));
        } catch (e) {}
      }
    }
  };

  const handleAuthComplete = (user: AuthenticatedUser, business: Business) => {
    setCurrentUser(user);
    setActiveBusiness(business);
    localStorage.setItem("tickit_current_user", JSON.stringify(user));
    localStorage.setItem("tickit_active_business", JSON.stringify(business));
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveBusiness(null);
    localStorage.removeItem("tickit_current_user");
    localStorage.removeItem("tickit_active_business");
  };

  const handleSwitchBusiness = () => {
    setActiveBusiness(null);
    localStorage.removeItem("tickit_active_business");
  };

  // If session is unauthenticated or active business is not selected, direct to security gate
  if (!currentUser || !activeBusiness) {
    return <AuthGate onAuthComplete={handleAuthComplete} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION - Scoped strictly to the active business */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessName={settings.name || activeBusiness.name}
        onSwitchBusiness={handleSwitchBusiness}
        onLogout={handleLogout}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 w-80 border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, clients, or files..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-full text-slate-700"
              />
            </div>
            
            <div className="hidden lg:flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
              <Shield className="w-3.5 h-3.5" />
              Tenant ID: {activeBusiness.id}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator to reinforce absolute isolation and security */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Isolated Space
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border-2 border-indigo-100 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1 truncate max-w-[120px]">{currentUser.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Component Render Area */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === "dashboard" && <Dashboard jobs={jobs} />}
          {activeTab === "jobs" && (
            <JobBoard
              jobs={jobs}
              setJobs={setJobs}
              employees={employees}
              clients={clients}
              settings={settings}
            />
          )}
          {activeTab === "clients" && (
            <Clients
              clients={clients}
              setClients={setClients}
              jobs={jobs}
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
              clients={clients}
              settings={settings}
            />
          )}
          {activeTab === "settings" && (
            <Settings settings={settings} setSettings={handleUpdateSettings} />
          )}
          {activeTab === "new-request" && (
            <div className="max-w-4xl mx-auto">
              <JobRequestForm
                employees={employees}
                clients={clients}
                onSave={(jobData) => {
                  const newJob: Job = {
                    ...jobData,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    activityLog: [
                      {
                        id: crypto.randomUUID(),
                        action: `Job request initiated for ${jobData.client}`,
                        timestamp: new Date().toISOString(),
                        user: currentUser.name,
                      }
                    ]
                  };
                  setJobs([newJob, ...jobs]);
                  setActiveTab("jobs");
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
