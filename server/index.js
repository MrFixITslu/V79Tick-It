import 'dotenv/config';
import express from "express";
import cors from "cors";
import db from "./db.js";
import { sendPortalLink, sendStatusUpdate } from "./email.js";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// --- API ROUTES ---

// Get all jobs
app.get("/api/jobs", (req, res) => {
    try {
        const jobs = db.prepare("SELECT * FROM jobs ORDER BY createdAt DESC").all();

        // Populate nested fields
        const populatedJobs = jobs.map(job => ({
            ...job,
            tags: getJobTags(job.id),
            activityLog: getJobActivityLogs(job.id)
        }));

        res.json(populatedJobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new job
app.post("/api/jobs", (req, res) => {
    const { id: reqId, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, tags, activityLog } = req.body;
    const id = reqId || uuidv4();
    const secureToken = uuidv4();

    try {
        const insertJob = db.prepare(`
            INSERT INTO jobs (id, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, secureToken)
            VALUES (@id, @title, @client, @description, @status, @createdAt, @dueDate, @amount, @priority, @invoiceNotes, @assignedTo, @clientEmail, @secureToken)
        `);

        insertJob.run({ id, title, client, description, status, createdAt, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, secureToken });

        if (tags && tags.length > 0) {
            const insertTag = db.prepare('INSERT INTO job_tags (job_id, tag) VALUES (?, ?)');
            tags.forEach(tag => insertTag.run(id, tag));
        }

        if (activityLog && activityLog.length > 0) {
            const insertActivity = db.prepare('INSERT INTO activity_logs (id, job_id, action, timestamp, user) VALUES (@id, @job_id, @action, @timestamp, @user)');
            activityLog.forEach(log => insertActivity.run({ ...log, job_id: id }));
        }

        // Auto-create/update client profile
        if (client) {
            const existingClient = db.prepare("SELECT id FROM clients WHERE name = ?").get(client);
            if (existingClient) {
                if (clientEmail) db.prepare("UPDATE clients SET email = ? WHERE id = ?").run(clientEmail, existingClient.id);
            } else {
                db.prepare("INSERT INTO clients (id, name, email, phone, company, notes, createdAt) VALUES (?, ?, ?, NULL, NULL, NULL, ?)").run(uuidv4(), client, clientEmail || null, new Date().toISOString());
            }
        }

        // Return the full job object so the frontend can display it correctly
        const newJob = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
        res.status(201).json({
            ...newJob,
            tags: getJobTags(id),
            activityLog: getJobActivityLogs(id)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a job
app.put("/api/jobs/:id", async (req, res) => {
    const { id } = req.params;
    const { title, client, description, status, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail, tags, activityLog } = req.body;

    try {
        // Get old status to detect a change
        const existingJob = db.prepare("SELECT status, secureToken, clientEmail, title FROM jobs WHERE id = ?").get(id);
        const statusChanged = existingJob && status && existingJob.status !== status;

        const updateJob = db.prepare(`
            UPDATE jobs SET 
                title = @title, client = @client, description = @description, status = @status, 
                dueDate = @dueDate, amount = @amount, priority = @priority, invoiceNotes = @invoiceNotes, 
                assignedTo = @assignedTo, clientEmail = @clientEmail
            WHERE id = @id
        `);

        updateJob.run({ id, title, client, description, status, dueDate, amount, priority, invoiceNotes, assignedTo, clientEmail });

        if (tags) {
            db.prepare('DELETE FROM job_tags WHERE job_id = ?').run(id);
            const insertTag = db.prepare('INSERT INTO job_tags (job_id, tag) VALUES (?, ?)');
            tags.forEach(tag => insertTag.run(id, tag));
        }

        if (activityLog && activityLog.length > 0) {
            const insertActivity = db.prepare('INSERT OR IGNORE INTO activity_logs (id, job_id, action, timestamp, user) VALUES (@id, @job_id, @action, @timestamp, @user)');
            activityLog.forEach(log => insertActivity.run({ ...log, job_id: id }));
        }

        // Auto-send status update email if status changed and client has email
        const recipientEmail = clientEmail || existingJob?.clientEmail;
        const jobTitle = title || existingJob?.title;
        const token = existingJob?.secureToken;

        if (statusChanged && recipientEmail && token) {
            sendStatusUpdate(recipientEmail, jobTitle, status, token)
                .then(r => console.log(`📧 Status update email ${r.success ? 'sent' : 'failed'} to ${recipientEmail}`))
                .catch(e => console.error('Email error:', e));
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Secure endpoint for client portal
app.get("/api/portal/:token", (req, res) => {
    const { token } = req.params;
    try {
        const job = db.prepare("SELECT * FROM jobs WHERE secureToken = ?").get(token);

        if (!job) {
            return res.status(404).json({ error: "Invalid link" });
        }

        // Omit the token from response for extra safety if desired, though since they have it it's fine.
        const populatedJob = {
            ...job,
            activityLog: getJobActivityLogs(job.id),
            messages: getJobMessages(job.id)
        };

        res.json(populatedJob);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send portal link email
app.post("/api/jobs/:id/send-portal", async (req, res) => {
    const { id } = req.params;

    try {
        const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);

        if (!job) return res.status(404).json({ error: "Job not found" });
        if (!job.clientEmail) return res.status(400).json({ error: "Client does not have an email address" });

        const result = await sendPortalLink(job.clientEmail, job.title, job.secureToken);

        if (result.success) {
            res.json({ success: true, previewUrl: result.previewUrl });
        } else {
            res.status(500).json({ error: result.error || "Failed to send email" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get business settings
app.get("/api/settings", (req, res) => {
    try {
        const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all employees
app.get("/api/employees", (req, res) => {
    try {
        const employees = db.prepare("SELECT * FROM employees").all();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Client Profile Routes ─────────────────────────────────────────────────────

// Auto-sync helper: upsert a client record from a job
const upsertClientFromJob = (clientName, clientEmail) => {
    if (!clientName) return;
    const existing = db.prepare("SELECT id FROM clients WHERE name = ?").get(clientName);
    if (existing) {
        if (clientEmail) {
            db.prepare("UPDATE clients SET email = ? WHERE id = ?").run(clientEmail, existing.id);
        }
    } else {
        db.prepare("INSERT INTO clients (id, name, email, phone, company, notes, createdAt) VALUES (?, ?, ?, NULL, NULL, NULL, ?)")
            .run(uuidv4(), clientName, clientEmail || null, new Date().toISOString());
    }
};

// On startup: seed clients table from existing jobs
{
    const existingJobs = db.prepare("SELECT client, clientEmail FROM jobs").all();
    existingJobs.forEach(j => upsertClientFromJob(j.client, j.clientEmail));
}

// Get all clients with job summary
app.get("/api/clients", (req, res) => {
    try {
        const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
        const clientsWithStats = clients.map(c => {
            const jobs = db.prepare("SELECT id, title, status, amount, createdAt, dueDate, priority, assignedTo FROM jobs WHERE client = ?").all(c.name);
            const totalRevenue = jobs.reduce((sum, j) => sum + (j.amount || 0), 0);
            const activeJobs = jobs.filter(j => !['completed', 'invoiced'].includes(j.status)).length;
            return { ...c, jobs, totalJobs: jobs.length, activeJobs, totalRevenue };
        });
        res.json(clientsWithStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update client contact info
app.put("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const { phone, company, notes, email } = req.body;
    try {
        db.prepare("UPDATE clients SET phone = ?, company = ?, notes = ?, email = ? WHERE id = ?")
            .run(phone || null, company || null, notes || null, email || null, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Job Messages (Chat)
app.get("/api/jobs/:id/messages", (req, res) => {
    try {
        const messages = getJobMessages(req.params.id);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/jobs/:id/messages", (req, res) => {
    const { id: jobId } = req.params;
    const { sender, content } = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    try {
        db.prepare("INSERT INTO job_messages (id, job_id, sender, content, timestamp) VALUES (?, ?, ?, ?, ?)")
            .run(id, jobId, sender, content, timestamp);

        res.status(201).json({ id, jobId, sender, content, timestamp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
