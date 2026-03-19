import 'dotenv/config';
import express from "express";
import cors from "cors";
import db from "./db.js";
import { sendPortalLink, sendStatusUpdate } from "./email.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET environment variable is not set in production. Using insecure fallback.");
}
const JWT_SECRET = process.env.JWT_SECRET || "auvic-super-secret-jwt-key-2026";

app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for now to allow external images/scripts unless explicitly configured
}));
app.use(compression());
app.use(cors());
app.use(express.json());

// --- FILE REPOSITORY SETUP ---
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
// Serve uploaded files statically (authenticated routes are below, this is just raw file access)
app.use('/uploads', express.static(UPLOADS_ROOT));

/**
 * Sanitize a string for use as a folder or file name component.
 */
const sanitizeForPath = (str) => (str || 'unknown').replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim().slice(0, 60);

/**
 * Get the absolute path to a job's dedicated folder.
 * Pattern: uploads/<AccountId>/<ClientName>/<JobId>/
 */
const getJobFolder = (accountId, clientName, jobId) => {
    return path.join(UPLOADS_ROOT, sanitizeForPath(accountId), sanitizeForPath(clientName), jobId);
};

/**
 * Ensure the job's folder exists. Returns the folder path.
 */
const ensureJobFolder = (accountId, clientName, jobId) => {
    const folder = getJobFolder(accountId, clientName, jobId);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    return folder;
};

/**
 * Append an entry to the project's audit log (project-log.json inside the job folder).
 */
const appendProjectLog = (accountId, clientName, jobId, entry) => {
    try {
        const folder = ensureJobFolder(accountId, clientName, jobId);
        const logPath = path.join(folder, 'project-log.json');
        let log = [];
        if (fs.existsSync(logPath)) {
            log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        }
        log.push({ ...entry, timestamp: new Date().toISOString() });
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    } catch(e) {
        console.error('Log write error:', e.message);
    }
};

/**
 * Save/update the quote snapshot JSON inside the job folder.
 */
const saveQuoteSnapshot = (accountId, clientName, jobId, jobData) => {
    try {
        const folder = ensureJobFolder(accountId, clientName, jobId);
        fs.writeFileSync(path.join(folder, 'quote.json'), JSON.stringify(jobData, null, 2));
    } catch(e) {
        console.error('Quote snapshot error:', e.message);
    }
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api/auth", apiLimiter);

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Forbidden" });
        req.user = user;
        req.accountId = user.account_id;
        next();
    });
};

// --- AUTHENTICATION ROUTES ---
app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, companyName } = req.body;
    if (!name || !email || !password || !companyName) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (existingUser) return res.status(400).json({ error: "Email already exists" });

        const accountId = uuidv4();
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const registerTx = db.transaction(() => {
            db.prepare("INSERT INTO accounts (id, name, createdAt) VALUES (?, ?, ?)").run(accountId, companyName, new Date().toISOString());
            db.prepare("INSERT INTO users (id, name, email, role, password_hash, account_id) VALUES (?, ?, ?, ?, ?, ?)").run(userId, name, email, "Admin", hashedPassword, accountId);
            db.prepare("INSERT INTO settings (id, name, email, account_id) VALUES (?, ?, ?, ?)").run(uuidv4(), companyName, email, accountId);
        });
        registerTx();

        const token = jwt.sign({ id: userId, email, account_id: accountId }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: userId, name, email, role: "Admin", account_id: accountId } });
    } catch (e) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : e.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!user || !user.password_hash) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email: user.email, account_id: user.account_id }, JWT_SECRET, { expiresIn: '7d' });
        delete user.password_hash;
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : e.message });
    }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
    try {
        const user = db.prepare("SELECT id, name, email, role, account_id FROM users WHERE id = ? AND account_id = ?").get(req.user.id, req.accountId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});


// Helpers for nested relations
const getJobTags = (jobId) => {
    return db.prepare("SELECT tag FROM job_tags WHERE job_id = ?").all(jobId).map(row => row.tag);
};

const getJobActivityLogs = (jobId) => {
    return db.prepare("SELECT * FROM activity_logs WHERE job_id = ? ORDER BY timestamp ASC").all(jobId);
};

const getJobMessages = (jobId) => {
    return db.prepare("SELECT * FROM job_messages WHERE job_id = ? ORDER BY timestamp ASC").all(jobId);
};

const createNotification = ({ userId, title, message, type, accountId }) => {
    try {
        db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, createdAt, account_id, isRead)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(uuidv4(), userId, title, message, type, new Date().toISOString(), accountId);
    } catch (e) {
        console.error("Failed to create notification:", e.message);
    }
};

// --- API ROUTES (PROTECTED) ---

// Get all jobs
app.get("/api/jobs", authenticateToken, (req, res) => {
    try {
        const jobs = db.prepare("SELECT * FROM jobs WHERE account_id = ? ORDER BY createdAt DESC").all(req.accountId);
        
        const populatedJobs = jobs.map(job => ({
            ...job,
            tags: getJobTags(job.id),
            activityLog: getJobActivityLogs(job.id),
            lineItems: job.lineItems ? JSON.parse(job.lineItems) : [],
            deliverables: job.deliverables ? JSON.parse(job.deliverables) : [],
            timeLogs: job.timeLogs ? JSON.parse(job.timeLogs) : [],
            stageAssignments: job.stageAssignments ? JSON.parse(job.stageAssignments) : {}
        }));

        res.json(populatedJobs);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Notifications
app.get("/api/notifications", authenticateToken, (req, res) => {
    try {
        const notifications = db.prepare("SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND account_id = ? ORDER BY createdAt DESC LIMIT 50")
            .all(req.user.id, req.accountId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.put("/api/notifications/read", authenticateToken, (req, res) => {
    const { id } = req.body;
    try {
        if (id) {
            db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ? AND account_id = ?").run(id, req.accountId);
        } else {
            db.prepare("UPDATE notifications SET isRead = 1 WHERE user_id = ? AND account_id = ?").run(req.user.id, req.accountId);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Create a new job
app.post("/api/jobs", authenticateToken, (req, res) => {
    const { id: reqId, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, tags, activityLog, depositPaid, lineItems, deliverables, timerStartedAt, stageAssignments, timeLogs } = req.body;
    const id = reqId || uuidv4();
    const secureToken = uuidv4();

    try {
        const insertJob = db.prepare(`
            INSERT INTO jobs (id, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, secureToken, depositPaid, account_id, lineItems, deliverables, timerStartedAt, stageAssignments, timeLogs)
            VALUES (@id, @title, @client, @description, @status, @createdAt, @dueDate, @amount, @priority, @invoiceNotes, @assignedTo, @clientEmail, @secureToken, @depositPaid, @account_id, @lineItems, @deliverables, @timerStartedAt, @stageAssignments, @timeLogs)
        `);

        insertJob.run({ 
            id, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, secureToken, 
            depositPaid: depositPaid ? 1 : 0, 
            account_id: req.accountId,
            lineItems: lineItems ? JSON.stringify(lineItems) : null,
            deliverables: deliverables ? JSON.stringify(deliverables) : null,
            timerStartedAt: timerStartedAt || new Date().toISOString(),
            stageAssignments: stageAssignments ? JSON.stringify(stageAssignments) : null,
            timeLogs: timeLogs ? JSON.stringify(timeLogs) : null
        });

        if (tags && tags.length > 0) {
            const insertTag = db.prepare('INSERT INTO job_tags (job_id, tag, account_id) VALUES (?, ?, ?)');
            tags.forEach(tag => insertTag.run(id, tag, req.accountId));
        }

        if (activityLog && activityLog.length > 0) {
            const insertActivity = db.prepare('INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (@id, @job_id, @action, @timestamp, @user, @account_id)');
            activityLog.forEach(log => insertActivity.run({ ...log, job_id: id, account_id: req.accountId }));
        }

        // Auto-create/update client profile
        if (client) {
            const existingClient = db.prepare("SELECT id FROM clients WHERE name = ? AND account_id = ?").get(client, req.accountId);
            if (existingClient) {
                if (clientEmail) db.prepare("UPDATE clients SET email = ? WHERE id = ?").run(clientEmail, existingClient.id);
            } else {
                db.prepare("INSERT INTO clients (id, name, email, phone, company, notes, createdAt, account_id) VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?)").run(uuidv4(), client, clientEmail || null, new Date().toISOString(), req.accountId);
            }
        }

        // --- AUTO-CREATE FILE REPOSITORY FOLDER ---
        try {
            const jobFolder = ensureJobFolder(req.accountId, client || 'unknown', id);
            // Write a README so the folder is clearly labelled
            const readme = `# Project: ${title}\nClient: ${client}\nJob ID: ${id}\nCreated: ${new Date().toISOString()}\n\nThis folder contains all files, quotes, invoices, and logs for this project.\n`;
            fs.writeFileSync(path.join(jobFolder, 'README.md'), readme);
            // Seed initial project log
            appendProjectLog(req.accountId, client || 'unknown', id, {
                type: 'job_created',
                action: 'Job created',
                user: req.user?.email || 'System',
                details: { title, client, status, amount }
            });
        } catch(folderErr) {
            console.error('Could not create job folder:', folderErr.message);
            // Non-fatal — don't block job creation
        }

        // --- NOTIFICATION ---
        if (assignedTo) {
            const assignedUser = db.prepare("SELECT id FROM users WHERE name = ? AND account_id = ?").get(assignedTo, req.accountId);
            if (assignedUser) {
                createNotification({
                    userId: assignedUser.id,
                    title: "New Job Assigned",
                    message: `You have been assigned to: ${title}`,
                    type: "assignment",
                    accountId: req.accountId
                });
            }
        }

        const newJob = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
        res.status(201).json({
            ...newJob,
            tags: getJobTags(id),
            activityLog: getJobActivityLogs(id),
            lineItems: newJob.lineItems ? JSON.parse(newJob.lineItems) : [],
            deliverables: newJob.deliverables ? JSON.parse(newJob.deliverables) : [],
            timeLogs: newJob.timeLogs ? JSON.parse(newJob.timeLogs) : [],
            stageAssignments: newJob.stageAssignments ? JSON.parse(newJob.stageAssignments) : {}
        });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Update a job
app.put("/api/jobs/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, client, description, status, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, tags, activityLog, depositPaid, quoteApproved, lineItems, deliverables, timerStartedAt, stageAssignments, timeLogs } = req.body;

    try {
        const existingJob = db.prepare("SELECT status, secureToken, clientEmail, title, stageAssignments FROM jobs WHERE id = ? AND account_id = ?").get(id, req.accountId);
        if (!existingJob) return res.status(404).json({ error: "Job not found" });

        // BLOCK manual PAID transition
        if (status === 'paid' && existingJob.status !== 'paid') {
            return res.status(403).json({ error: "Job status cannot be manually moved to 'Paid'. This occurs automatically upon payment confirmation." });
        }

        const statusChanged = status && existingJob.status !== status;
        let finalAssignedTo = assignedTo;
        let finalTimerStartedAt = timerStartedAt;

        // AUTOMATION: If status changed, check for stage assignment
        if (statusChanged) {
            const assignments = stageAssignments || (existingJob.stageAssignments ? JSON.parse(existingJob.stageAssignments) : {});
            if (assignments[status]) {
                finalAssignedTo = assignments[status];
                finalTimerStartedAt = new Date().toISOString();
                
                // Add automated activity log
                db.prepare("INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (?, ?, ?, ?, ?, ?)")
                    .run(uuidv4(), id, `Auto-assigned to ${finalAssignedTo} for stage: ${status}`, new Date().toISOString(), "System", req.accountId);
                
                console.log(`AUTOMATION: Job ${id} moved to ${status}. Auto-assigned to ${finalAssignedTo}. Timer started.`);
            }
        }

        const updateJob = db.prepare(`
            UPDATE jobs SET 
                title = @title, client = @client, description = @description, status = @status, 
                dueDate = @dueDate, amount = @amount, priority = @priority, invoiceNotes = @invoiceNotes, 
                assignedTo = @assignedTo, clientEmail = @clientEmail, depositPaid = @depositPaid,
                quoteApproved =  COALESCE(@quoteApproved, quoteApproved),
                lineItems = @lineItems, deliverables = @deliverables, timerStartedAt = @timerStartedAt,
                stageAssignments = @stageAssignments, timeLogs = @timeLogs
            WHERE id = @id AND account_id = @account_id
        `);

        updateJob.run({ 
            id, title, client, description, status, dueDate, amount, priority, invoiceNotes, 
            assignedTo: finalAssignedTo, clientEmail, 
            depositPaid: depositPaid ? 1 : 0, 
            quoteApproved: quoteApproved !== undefined ? (quoteApproved ? 1 : 0) : null,
            account_id: req.accountId,
            lineItems: lineItems ? JSON.stringify(lineItems) : null,
            deliverables: deliverables ? JSON.stringify(deliverables) : null,
            timerStartedAt: finalTimerStartedAt !== undefined ? finalTimerStartedAt : null,
            stageAssignments: stageAssignments ? JSON.stringify(stageAssignments) : (existingJob.stageAssignments || null),
            timeLogs: timeLogs ? JSON.stringify(timeLogs) : null
        });

        if (tags) {
            db.prepare('DELETE FROM job_tags WHERE job_id = ? AND account_id = ?').run(id, req.accountId);
            const insertTag = db.prepare('INSERT INTO job_tags (job_id, tag, account_id) VALUES (?, ?, ?)');
            tags.forEach(tag => insertTag.run(id, tag, req.accountId));
        }

        if (activityLog && activityLog.length > 0) {
            const insertActivity = db.prepare('INSERT OR IGNORE INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (@id, @job_id, @action, @timestamp, @user, @account_id)');
            activityLog.forEach(log => insertActivity.run({ ...log, job_id: id, account_id: req.accountId }));
        }

        const recipientEmail = clientEmail || existingJob?.clientEmail;
        const jobTitle = title || existingJob?.title;
        const token = existingJob?.secureToken;

        if (statusChanged && recipientEmail && token) {
            sendStatusUpdate(recipientEmail, jobTitle, status, token)
                .then(r => console.log(`📧 Status update email ${r.success ? 'sent' : 'failed'} to ${recipientEmail}`))
                .catch(e => console.error('Email error:', e));
        }

        // --- NOTIFICATION ---
        if (statusChanged || (assignedTo && assignedTo !== existingJob.assignedTo)) {
            const targetUser = assignedTo || existingJob.assignedTo;
            if (targetUser) {
                const assignedUser = db.prepare("SELECT id FROM users WHERE name = ? AND account_id = ?").get(targetUser, req.accountId);
                if (assignedUser) {
                    createNotification({
                        userId: assignedUser.id,
                        title: statusChanged ? "Job Status Updated" : "Job Reassigned",
                        message: statusChanged 
                            ? `"${jobTitle}" is now: ${status}`
                            : `You have been assigned to: "${jobTitle}"`,
                        type: statusChanged ? "status_change" : "assignment",
                        accountId: req.accountId
                    });
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});


// Send portal link email
app.post("/api/jobs/:id/send-portal", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND account_id = ?").get(id, req.accountId);
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!job.clientEmail) return res.status(400).json({ error: "Client does not have an email address" });

        const result = await sendPortalLink(job.clientEmail, job.title, job.secureToken);

        if (result.success) {
            res.json({ success: true, previewUrl: result.previewUrl });
        } else {
            res.status(500).json({ error: result.error || "Failed to send email" });
        }
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Send Quote workflow email
app.post("/api/jobs/:id/send-quote", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND account_id = ?").get(id, req.accountId);
        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!job.clientEmail) return res.status(400).json({ error: "Client does not have an email address" });

        // Update status to estimation if it was request
        if(job.status === "request") {
            db.prepare("UPDATE jobs SET status = 'estimation' WHERE id = ?").run(id);
        }

        // We can reuse sendPortalLink for now, or imagine adapting it to explicitly say "Quote Approval"
        const result = await sendPortalLink(job.clientEmail, `Quote Ready: ${job.title}`, job.secureToken);

        if (result.success) {
            db.prepare("INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (?, ?, ?, ?, ?, ?)")
                .run(uuidv4(), job.id, "Quote link sent to client", new Date().toISOString(), req.user.email, req.accountId);
            res.json({ success: true, previewUrl: result.previewUrl });
        } else {
            res.status(500).json({ error: result.error || "Failed to send quote email" });
        }
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Get business settings
app.get("/api/settings", authenticateToken, (req, res) => {
    try {
        const settings = db.prepare("SELECT * FROM settings WHERE account_id = ? LIMIT 1").get(req.accountId);
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Update business settings
app.put("/api/settings", authenticateToken, (req, res) => {
    const { name, address, email, phone, logoUrl, paymentTerms, currency, taxRate } = req.body;
    try {
        db.prepare(`
            UPDATE settings 
            SET name = ?, address = ?, email = ?, phone = ?, logoUrl = ?, paymentTerms = ?, currency = ?, taxRate = ? 
            WHERE account_id = ?
        `).run(name, address, email, phone, logoUrl, paymentTerms, currency, taxRate, req.accountId);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Get all employees
app.get("/api/employees", authenticateToken, (req, res) => {
    try {
        const employees = db.prepare("SELECT * FROM employees WHERE account_id = ?").all(req.accountId);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Get all clients with job summary
app.get("/api/clients", authenticateToken, (req, res) => {
    try {
        const clients = db.prepare("SELECT * FROM clients WHERE account_id = ? ORDER BY name ASC").all(req.accountId);
        const clientsWithStats = clients.map(c => {
            const jobs = db.prepare("SELECT id, title, status, amount, createdAt, dueDate, priority, assignedTo FROM jobs WHERE client = ? AND account_id = ?").all(c.name, req.accountId);
            const totalRevenue = jobs.reduce((sum, j) => sum + (j.amount || 0), 0);
            const activeJobs = jobs.filter(j => !['completed', 'invoiced'].includes(j.status)).length;
            return { ...c, jobs, totalJobs: jobs.length, activeJobs, totalRevenue };
        });
        res.json(clientsWithStats);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Update client contact info
app.put("/api/clients/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { phone, company, notes, email } = req.body;
    try {
        db.prepare("UPDATE clients SET phone = ?, company = ?, notes = ?, email = ? WHERE id = ? AND account_id = ?")
            .run(phone || null, company || null, notes || null, email || null, id, req.accountId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// Job Messages (Chat)
app.get("/api/jobs/:id/messages", authenticateToken, (req, res) => {
    try {
        const messages = getJobMessages(req.params.id);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.post("/api/jobs/:id/messages", authenticateToken, (req, res) => {
    const { id: jobId } = req.params;
    const { sender, content } = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    try {
        db.prepare("INSERT INTO job_messages (id, job_id, sender, content, timestamp, account_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(id, jobId, sender, content, timestamp, req.accountId);

        // Append to project log
        const job = db.prepare("SELECT client FROM jobs WHERE id = ? AND account_id = ?").get(jobId, req.accountId);
        if (job) {
            appendProjectLog(req.accountId, job.client, jobId, {
                type: 'message',
                action: `Message sent by ${sender}`,
                user: sender,
                details: { content: content.slice(0, 200) }
            });
        }

        res.status(201).json({ id, jobId, sender, content, timestamp });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// --- FILE REPOSITORY ENDPOINTS ---

// Dynamic multer storage — destination is set per-job folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const job = db.prepare("SELECT client, account_id FROM jobs WHERE id = ? AND account_id = ?").get(req.params.id, req.accountId);
            if (!job) return cb(new Error('Job not found'), null);
            const folder = ensureJobFolder(req.accountId, job.client, req.params.id);
            cb(null, folder);
        } catch(e) { cb(e, null); }
    },
    filename: (req, file, cb) => {
        // Prefix with timestamp to avoid collisions, preserve original name
        const safe = file.originalname.replace(/[^a-zA-Z0-9_.\-]/g, '_');
        cb(null, `${Date.now()}-${safe}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

// POST /api/jobs/:id/files  — upload one or many files into the job folder
app.post("/api/jobs/:id/files", authenticateToken, upload.array('files', 20), (req, res) => {
    const { id: jobId } = req.params;
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const job = db.prepare("SELECT client FROM jobs WHERE id = ? AND account_id = ?").get(jobId, req.accountId);
        const uploaded = req.files.map(f => ({
            name: f.originalname,
            filename: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            url: `/uploads/${sanitizeForPath(req.accountId)}/${sanitizeForPath(job?.client || 'unknown')}/${jobId}/${f.filename}`,
            uploadedAt: new Date().toISOString()
        }));

        // Log the upload
        if (job) {
            appendProjectLog(req.accountId, job.client, jobId, {
                type: 'file_upload',
                action: `${req.files.length} file(s) uploaded`,
                user: req.user?.email || 'Team',
                details: { files: uploaded.map(f => f.name) }
            });
        }

        res.status(201).json({ success: true, files: uploaded });
    } catch(error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// GET /api/jobs/:id/files  — list all files in the job folder
app.get("/api/jobs/:id/files", authenticateToken, (req, res) => {
    const { id: jobId } = req.params;
    try {
        const job = db.prepare("SELECT client FROM jobs WHERE id = ? AND account_id = ?").get(jobId, req.accountId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const folder = getJobFolder(req.accountId, job.client, jobId);
        if (!fs.existsSync(folder)) return res.json({ files: [], log: [] });

        const entries = fs.readdirSync(folder, { withFileTypes: true })
            .filter(e => e.isFile() && e.name !== 'project-log.json')
            .map(e => {
                const stat = fs.statSync(path.join(folder, e.name));
                return {
                    filename: e.name,
                    // Original name: strip leading timestamp prefix if present
                    name: e.name.replace(/^\d+-/, ''),
                    size: stat.size,
                    uploadedAt: stat.mtime.toISOString(),
                    url: `/uploads/${sanitizeForPath(req.accountId)}/${sanitizeForPath(job.client)}/${jobId}/${e.name}`
                };
            });

        // Also read project log
        const logPath = path.join(folder, 'project-log.json');
        const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];

        res.json({ files: entries, log });
    } catch(error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

// DELETE /api/jobs/:id/files/:filename  — delete a specific file from the job folder
app.delete("/api/jobs/:id/files/:filename", authenticateToken, (req, res) => {
    const { id: jobId, filename } = req.params;
    try {
        const job = db.prepare("SELECT client FROM jobs WHERE id = ? AND account_id = ?").get(jobId, req.accountId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const folder = getJobFolder(req.accountId, job.client, jobId);
        const filePath = path.join(folder, filename);

        // Security: ensure file is inside the job folder (prevent path traversal)
        if (!filePath.startsWith(folder)) return res.status(403).json({ error: 'Forbidden' });
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

        fs.unlinkSync(filePath);
        appendProjectLog(req.accountId, job.client, jobId, {
            type: 'file_deleted',
            action: `File deleted: ${filename}`,
            user: req.user?.email || 'Team',
        });
        res.json({ success: true });
    } catch(error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});


// --- CLIENT PORTAL PUBLIC SECURE ROUTES ---

// Helper to get settings for a public portal
const getSettingsForPortal = (accountId) => {
    return db.prepare("SELECT * FROM settings WHERE account_id = ? LIMIT 1").get(accountId) || {};
}

// Secure endpoint for client portal
app.get("/api/portal/:token", (req, res) => {
    const { token } = req.params;
    try {
        const job = db.prepare("SELECT * FROM jobs WHERE secureToken = ?").get(token);
        if (!job) return res.status(404).json({ error: "Invalid link" });

        const populatedJob = {
            ...job,
            activityLog: getJobActivityLogs(job.id),
            messages: getJobMessages(job.id),
            lineItems: job.lineItems ? JSON.parse(job.lineItems) : [],
            deliverables: job.deliverables ? JSON.parse(job.deliverables) : [],
            timeLogs: job.timeLogs ? JSON.parse(job.timeLogs) : [],
            stageAssignments: job.stageAssignments ? JSON.parse(job.stageAssignments) : {},
            timerStartedAt: job.timerStartedAt
        };
        const settings = getSettingsForPortal(job.account_id);
        res.json({ job: populatedJob, settings });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.post("/api/portal/:token/approve-quote", (req, res) => {
    const { token } = req.params;
    try {
        const job = db.prepare("SELECT id, account_id FROM jobs WHERE secureToken = ?").get(token);
        if (!job) return res.status(404).json({ error: "Invalid link" });

        db.prepare("UPDATE jobs SET quoteApproved = 1, status = 'in-progress' WHERE id = ?").run(job.id);

        db.prepare("INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(uuidv4(), job.id, "Quote approved by Client - Job automatically started", new Date().toISOString(), "Client", job.account_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.post("/api/portal/:token/pay-deposit", (req, res) => {
    const { token } = req.params;
    try {
        const job = db.prepare("SELECT id, account_id FROM jobs WHERE secureToken = ?").get(token);
        if (!job) return res.status(404).json({ error: "Invalid link" });

        db.prepare("UPDATE jobs SET depositPaid = 1 WHERE id = ?").run(job.id);
        db.prepare("INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(uuidv4(), job.id, "30% Deposit paid via portal", new Date().toISOString(), "Client", job.account_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.post("/api/portal/:token/pay-final", (req, res) => {
    const { token } = req.params;
    try {
        const job = db.prepare("SELECT id, account_id FROM jobs WHERE secureToken = ?").get(token);
        if (!job) return res.status(404).json({ error: "Invalid link" });

        db.prepare("UPDATE jobs SET status = 'paid' WHERE id = ?").run(job.id);
        db.prepare("INSERT INTO activity_logs (id, job_id, action, timestamp, user, account_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(uuidv4(), job.id, "Final payment received via portal", new Date().toISOString(), "Client", job.account_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});

app.post("/api/portal/:token/messages", (req, res) => {
    const { token } = req.params;
    const { sender, content } = req.body;
    try {
        const job = db.prepare("SELECT id, account_id FROM jobs WHERE secureToken = ?").get(token);
        if (!job) return res.status(404).json({ error: "Invalid link" });

        const id = uuidv4();
        const timestamp = new Date().toISOString();
        db.prepare("INSERT INTO job_messages (id, job_id, sender, content, timestamp, account_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(id, job.id, sender, content, timestamp, job.account_id);
        
        res.status(201).json({ id, jobId: job.id, sender, content, timestamp });
    } catch (error) {
        res.status(500).json({ error: isProduction ? "Internal Server Error" : error.message });
    }
});


// Serve static frontend files in production
if (isProduction) {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please run 'fuser -k ${PORT}/tcp' or choose a different port.`);
        process.exit(1);
    } else {
        console.error(err);
    }
});
