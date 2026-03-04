import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('data.db'); // Note: in memory could be used with ':memory:' but a file ensures persistence

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    dueDate TEXT,
    amount REAL,
    priority TEXT NOT NULL,
    invoiceNotes TEXT,
    assignedTo TEXT,
    clientEmail TEXT,
    secureToken TEXT
  );

  CREATE TABLE IF NOT EXISTS job_tags (
    job_id TEXT,
    tag TEXT,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    user TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    salary REAL,
    hourlyRate REAL,
    hoursWorked REAL,
    workerType TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    status TEXT NOT NULL,
    isCheckedIn INTEGER DEFAULT 0,
    lastCheckIn TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id TEXT,
    permission TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT NOT NULL,
    uploadedAt TEXT NOT NULL,
    uploadedBy TEXT NOT NULL,
    jobId TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only allow one row
    name TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    logoUrl TEXT,
    paymentTerms TEXT,
    currency TEXT,
    taxRate REAL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_messages (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );
`);

// Check if seeding is needed
const jobsCount = db.prepare('SELECT count(*) as count FROM jobs').get();
if (jobsCount.count === 0) {
  console.log("Seeding database with initial data...");

  const insertJob = db.prepare(`
    INSERT INTO jobs (id, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, secureToken)
    VALUES (@id, @title, @client, @description, @status, @createdAt, @dueDate, @amount, @priority, @invoiceNotes, @assignedTo, @clientEmail, @secureToken)
  `);

  const insertActivityLog = db.prepare(`
    INSERT INTO activity_logs (id, job_id, action, timestamp, user)
    VALUES (@id, @job_id, @action, @timestamp, @user)
  `);

  const insertTag = db.prepare('INSERT INTO job_tags (job_id, tag) VALUES (?, ?)');

  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, name, role, salary, hourlyRate, hoursWorked, workerType, paymentMethod, status, isCheckedIn, lastCheckIn)
    VALUES (@id, @name, @role, @salary, @hourlyRate, @hoursWorked, @workerType, @paymentMethod, @status, @isCheckedIn, @lastCheckIn)
  `);

  const insertUser = db.prepare('INSERT INTO users (id, name, email, role) VALUES (@id, @name, @email, @role)');
  const insertPermission = db.prepare('INSERT INTO user_permissions (user_id, permission) VALUES (?, ?)');

  const insertFile = db.prepare(`
    INSERT INTO files (id, name, size, type, uploadedAt, uploadedBy, jobId)
    VALUES (@id, @name, @size, @type, @uploadedAt, @uploadedBy, @jobId)
  `);

  const insertSettings = db.prepare(`
    INSERT INTO settings (id, name, address, email, phone, logoUrl, paymentTerms, currency, taxRate)
    VALUES (1, @name, @address, @email, @phone, @logoUrl, @paymentTerms, @currency, @taxRate)
  `);

  const seedTransaction = db.transaction(() => {
    const job1Id = "1";
    insertJob.run({
      id: job1Id, title: "Website Redesign", client: "Acme Corp", description: "Complete overhaul of the corporate website including new branding and e-commerce integration.", status: "request", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), dueDate: new Date(Date.now() + 86400000 * 10).toISOString(), amount: 15000, priority: "high", invoiceNotes: null, assignedTo: "Alice Smith", clientEmail: "client@acme.com", secureToken: uuidv4()
    });
    insertTag.run(job1Id, 'design');
    insertTag.run(job1Id, 'web');
    insertActivityLog.run({ id: "l1", job_id: job1Id, action: "Job request created", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), user: "System" });

    const job2Id = "2";
    insertJob.run({
      id: job2Id, title: "SEO Audit", client: "TechStart Inc", description: "Comprehensive SEO audit and keyword research for Q3 marketing push.", status: "estimation", createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), amount: null, priority: "medium", invoiceNotes: null, assignedTo: "Bob Jones", clientEmail: "tech@techstart.com", secureToken: uuidv4()
    });
    insertTag.run(job2Id, 'marketing');
    insertTag.run(job2Id, 'seo');
    insertActivityLog.run({ id: "l2", job_id: job2Id, action: "Job request created", timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), user: "System" });
    insertActivityLog.run({ id: "l3", job_id: job2Id, action: "Moved from request to estimation", timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), user: "Alice Smith" });

    const job3Id = "3";
    insertJob.run({
      id: job3Id, title: "Mobile App MVP", client: "Fitness Plus", description: "React Native mobile app MVP with user authentication and basic workout tracking.", status: "in-progress", createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), dueDate: new Date(Date.now() + 86400000 * 30).toISOString(), amount: 25000, priority: "high", invoiceNotes: null, assignedTo: "Charlie Brown", clientEmail: "fit@fitnessplus.com", secureToken: uuidv4()
    });
    insertTag.run(job3Id, 'mobile');
    insertTag.run(job3Id, 'app');
    insertActivityLog.run({ id: "l4", job_id: job3Id, action: "Job request created", timestamp: new Date(Date.now() - 86400000 * 14).toISOString(), user: "System" });
    insertActivityLog.run({ id: "l5", job_id: job3Id, action: "Moved from request to in-progress", timestamp: new Date(Date.now() - 86400000 * 12).toISOString(), user: "Bob Jones" });

    const job4Id = "4";
    insertJob.run({
      id: job4Id, title: "Logo Design", client: "Fresh Bakery", description: "New logo design and brand guidelines for local bakery chain.", status: "review", createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), dueDate: new Date(Date.now() - 86400000 * 1).toISOString(), amount: 2500, priority: "low", invoiceNotes: null, assignedTo: "Dana White", clientEmail: "bake@freshbakery.com", secureToken: uuidv4()
    });
    insertTag.run(job4Id, 'branding');
    insertTag.run(job4Id, 'logo');
    insertActivityLog.run({ id: "l6", job_id: job4Id, action: "Job request created", timestamp: new Date(Date.now() - 86400000 * 20).toISOString(), user: "System" });

    const job5Id = "5";
    insertJob.run({
      id: job5Id, title: "Q2 Marketing Campaign", client: "Global Retail", description: "Social media ad creatives and landing page design for Q2 campaign.", status: "invoiced", createdAt: new Date(Date.now() - 86400000 * 45).toISOString(), dueDate: null, amount: 8500, priority: "medium", invoiceNotes: "1. Project Delivery: Q2 Marketing Campaign - $8500", assignedTo: "Alice Smith", clientEmail: "global@retail.com", secureToken: uuidv4()
    });
    insertTag.run(job5Id, 'marketing');
    insertTag.run(job5Id, 'ads');
    insertActivityLog.run({ id: "l7", job_id: job5Id, action: "Job request created", timestamp: new Date(Date.now() - 86400000 * 45).toISOString(), user: "System" });

    insertEmployee.run({ id: "e1", name: "Alice Smith", role: "Senior Designer", salary: 5000, hourlyRate: null, hoursWorked: null, workerType: "salary", paymentMethod: "Bank Transfer", status: "active", isCheckedIn: 0, lastCheckIn: null });
    insertEmployee.run({ id: "e2", name: "Bob Jones", role: "Project Manager", salary: 4500, hourlyRate: null, hoursWorked: null, workerType: "salary", paymentMethod: "Bank Transfer", status: "active", isCheckedIn: 0, lastCheckIn: null });
    insertEmployee.run({ id: "e3", name: "Charlie Brown", role: "Developer", salary: 6000, hourlyRate: null, hoursWorked: null, workerType: "salary", paymentMethod: "PayPal", status: "active", isCheckedIn: 0, lastCheckIn: null });

    insertUser.run({ id: "u1", name: "John Doe", email: "john@example.com", role: "Admin" });
    ['dashboard', 'jobs', 'new-request', 'payroll', 'invoices', 'users', 'files'].forEach(p => insertPermission.run("u1", p));

    insertUser.run({ id: "u2", name: "Alice Smith", email: "alice@example.com", role: "Manager" });
    ['dashboard', 'jobs', 'new-request', 'files'].forEach(p => insertPermission.run("u2", p));

    insertFile.run({ id: "f1", name: "Brand_Guidelines_2024.pdf", size: 2500000, type: "application/pdf", uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "John Doe", jobId: null });
    insertFile.run({ id: "f2", name: "Logo_Assets.zip", size: 15000000, type: "application/zip", uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), uploadedBy: "Alice Smith", jobId: null });

    insertSettings.run({ name: "Auvic Solutions", address: "123 Creative Plaza, Design District, NY 10001", email: "billing@auvic.com", phone: "+1 (555) 000-1234", logoUrl: "https://picsum.photos/200/100?random=1", paymentTerms: "Please make payment within 30 days of receiving this invoice.", currency: "USD", taxRate: 0 });
  });

  seedTransaction();
  console.log("Database seeded successfully.");
}

export default db;
