const { query, transaction } = require("../Config/Database");

// 1. List active institutions for public dropdown selection
const listPublicInstitutions = async (req, res) => {
    try {
        const result = await query(
            "SELECT id, institution_name, institution_code FROM institutions WHERE status = 'active' ORDER BY institution_name ASC"
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error in listPublicInstitutions:", error);
        res.status(500).json({ success: false, message: "Failed to fetch institutions" });
    }
};

// 2. Create ticket (public endpoint)
const createPublicTicket = async (req, res) => {
    try {
        const { name, email, phone, institution_id, subject, category, priority, message } = req.body;

        if (!subject || !category) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const solvedName = (name && name.trim()) || "Anonymous User";
        const solvedPhone = (phone && phone.trim()) || "0000000000";
        let solvedInstitutionId = parseInt(institution_id, 10) || null;
        let solvedEmail = (email && email.trim()) || "";
        const solvedMessage = (message && message.trim()) || subject.trim();

        const attachmentUrl = req.file?.cloudinaryUrl || null;

        // Try to match phone with an existing tenant to link user_id, institution_id, and email
        let userId = null;
        if (solvedPhone !== "0000000000") {
            const tenantMatch = await query(
                "SELECT id, email, institution_id FROM tenants WHERE phone = $1 AND deleted_at IS NULL LIMIT 1",
                [solvedPhone.trim()]
            );
            if (tenantMatch.rows.length > 0) {
                userId = tenantMatch.rows[0].id;
                if (!solvedInstitutionId) {
                    solvedInstitutionId = tenantMatch.rows[0].institution_id;
                }
                if (!solvedEmail) {
                    solvedEmail = tenantMatch.rows[0].email;
                }
            }
        }

        if (!solvedInstitutionId) {
            const firstInst = await query("SELECT id FROM institutions ORDER BY id ASC LIMIT 1");
            solvedInstitutionId = firstInst.rows[0]?.id || 1;
        }

        if (!solvedEmail) {
            solvedEmail = solvedPhone !== "0000000000"
                ? `${solvedPhone.trim()}@support.com`
                : `anonymous_${Date.now()}@support.com`;
        }

        const ticketResult = await transaction(async (client) => {
            // Insert support ticket
            const tRes = await client.query(
                `INSERT INTO support_tickets (
                    institution_id, user_id, name, email, phone, subject, category, priority, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open') RETURNING id`,
                [solvedInstitutionId, userId, solvedName, solvedEmail, solvedPhone, subject.trim(), category, priority || "Medium"]
            );
            const ticketId = tRes.rows[0].id;

            // Insert initial message
            await client.query(
                `INSERT INTO support_messages (
                    ticket_id, sender_type, sender_id, message, attachment, is_read
                ) VALUES ($1, 'user', $2, $3, $4, false)`,
                [ticketId, userId, solvedMessage, attachmentUrl]
            );

            return ticketId;
        });

        // Broadcast new ticket socket event if IO is attached
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.emit("new_ticket", { ticketId: ticketResult, name, subject });
        }

        res.json({
            success: true,
            message: "Ticket raised successfully",
            ticketId: ticketResult
        });
    } catch (error) {
        console.error("Error in createPublicTicket:", error);
        res.status(500).json({ success: false, message: "Failed to raise support ticket" });
    }
};

// 3. Fetch public ticket details for client-side chat
const getPublicTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticketRes = await query(
            `SELECT t.*, inst.institution_name 
             FROM support_tickets t
             LEFT JOIN institutions inst ON t.institution_id = inst.id
             WHERE t.id = $1`,
            [ticketId]
        );

        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const messagesRes = await query(
            "SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC",
            [ticketId]
        );

        res.json({
            success: true,
            ticket: ticketRes.rows[0],
            messages: messagesRes.rows
        });
    } catch (error) {
        console.error("Error in getPublicTicket:", error);
        res.status(500).json({ success: false, message: "Failed to load ticket" });
    }
};

// 4. Admin List Tickets
const listTickets = async (req, res) => {
    try {
        const { status, priority, category, search, today, unread } = req.body;
        const loggedInUser = req.user; // Set by AuthMiddleware

        let filterSql = "WHERE 1=1";
        const queryParams = [];

        // PG Admin role checks: restrict to their own institution
        if (loggedInUser.role === "pg_admin") {
            queryParams.push(loggedInUser.institution_id);
            filterSql += ` AND t.institution_id = $${queryParams.length}`;
        }

        // Apply filters
        if (status && status !== "All") {
            queryParams.push(status);
            filterSql += ` AND t.status = $${queryParams.length}`;
        }

        if (priority && priority !== "All") {
            queryParams.push(priority);
            filterSql += ` AND t.priority = $${queryParams.length}`;
        }

        if (category && category !== "All") {
            queryParams.push(category);
            filterSql += ` AND t.category = $${queryParams.length}`;
        }

        if (search) {
            queryParams.push(`%${search.trim()}%`);
            filterSql += ` AND (t.name ILIKE $${queryParams.length} OR t.email ILIKE $${queryParams.length} OR t.id::text = $${queryParams.length - 1} OR t.subject ILIKE $${queryParams.length})`;
        }

        if (today === true) {
            filterSql += " AND t.created_at >= CURRENT_DATE";
        }

        // Complete ticket list query
        const sql = `
            SELECT 
                t.*,
                COALESCE(un.unread_count, 0)::int AS unread_count,
                lm.message AS last_message,
                lm.created_at AS last_message_time,
                inst.institution_name,
                uc.email AS assigned_admin_email
            FROM support_tickets t
            LEFT JOIN institutions inst ON t.institution_id = inst.id
            LEFT JOIN user_credentials uc ON t.assigned_admin_id = uc.id
            LEFT JOIN (
                SELECT ticket_id, COUNT(*)::int AS unread_count 
                FROM support_messages 
                WHERE sender_type = 'user' AND is_read = false 
                GROUP BY ticket_id
            ) un ON t.id = un.ticket_id
            LEFT JOIN (
                SELECT DISTINCT ON (ticket_id) ticket_id, message, created_at
                FROM support_messages
                ORDER BY ticket_id, created_at DESC
            ) lm ON t.id = lm.ticket_id
            ${filterSql}
            ORDER BY last_message_time DESC NULLS LAST, t.created_at DESC
        `;

        const result = await query(sql, queryParams);

        // Apply post-query unread filter if required
        let tickets = result.rows;
        if (unread === true) {
            tickets = tickets.filter(t => t.unread_count > 0);
        }

        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error("Error in listTickets:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tickets" });
    }
};

// 5. Get message history & Mark user messages as read (Admin view)
const getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const loggedInUser = req.user;

        // Verify ticket access for PG Admins
        if (loggedInUser.role === "pg_admin") {
            const accessCheck = await query(
                "SELECT institution_id FROM support_tickets WHERE id = $1",
                [ticketId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Ticket not found" });
            }
            if (accessCheck.rows[0].institution_id !== loggedInUser.institution_id) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }
        }

        // Mark user messages as read
        await query(
            "UPDATE support_messages SET is_read = true WHERE ticket_id = $1 AND sender_type = 'user'",
            [ticketId]
        );

        // Fetch messages
        const messages = await query(
            "SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC",
            [ticketId]
        );

        // Broadcast read receipt event via Socket.io
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${ticketId}`).emit("messages_read", { ticketId, readBy: "admin" });
        }

        res.json({ success: true, data: messages.rows });
    } catch (error) {
        console.error("Error in getTicketMessages:", error);
        res.status(500).json({ success: false, message: "Failed to load messages" });
    }
};

// 6. Post a reply
const replyTicket = async (req, res) => {
    try {
        const { ticket_id, sender_type, sender_id, message } = req.body;

        if (!ticket_id || !sender_type || !message) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let parsedSenderId = parseInt(sender_id, 10);
        if (isNaN(parsedSenderId)) {
            parsedSenderId = null;
        }
        const parsedTicketId = parseInt(ticket_id, 10);

        const attachmentUrl = req.file?.cloudinaryUrl || null;

        // Perform insert
        const insertRes = await query(
            `INSERT INTO support_messages (
                ticket_id, sender_type, sender_id, message, attachment, is_read
            ) VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
            [parsedTicketId, sender_type, parsedSenderId, message.trim(), attachmentUrl]
        );

        const newMessage = insertRes.rows[0];

        // Update ticket updated_at time
        await query("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [ticket_id]);

        // Broadcast to Socket.io room
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${ticket_id}`).emit("receive_message", newMessage);
            io.emit("ticket_updated", { ticketId: ticket_id, lastMessage: newMessage });
        }

        res.json({ success: true, data: newMessage });
    } catch (error) {
        console.error("Error in replyTicket:", error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};

// 7. Update ticket status
const updateTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        await query(
            "UPDATE support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [status, ticketId]
        );

        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${ticketId}`).emit("status_changed", { ticketId, status });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        console.error("Error in updateTicketStatus:", error);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
};

// 8. Update ticket priority
const updateTicketPriority = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { priority } = req.body;

        if (!priority) {
            return res.status(400).json({ success: false, message: "Priority is required" });
        }

        await query(
            "UPDATE support_tickets SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [priority, ticketId]
        );

        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${ticketId}`).emit("priority_changed", { ticketId, priority });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, message: "Priority updated successfully" });
    } catch (error) {
        console.error("Error in updateTicketPriority:", error);
        res.status(500).json({ success: false, message: "Failed to update priority" });
    }
};

// 9. Assign ticket to admin
const assignTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { assigned_admin_id } = req.body;

        await query(
            "UPDATE support_tickets SET assigned_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [assigned_admin_id || null, ticketId]
        );

        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${ticketId}`).emit("admin_assigned", { ticketId, assigned_admin_id });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, message: "Ticket assigned successfully" });
    } catch (error) {
        console.error("Error in assignTicket:", error);
        res.status(500).json({ success: false, message: "Failed to assign ticket" });
    }
};

// 10. Save internal notes
const saveInternalNote = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { internal_notes } = req.body;

        await query(
            "UPDATE support_tickets SET internal_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [internal_notes, ticketId]
        );

        res.json({ success: true, message: "Internal note saved successfully" });
    } catch (error) {
        console.error("Error in saveInternalNote:", error);
        res.status(500).json({ success: false, message: "Failed to save internal note" });
    }
};

// 11. List admins of the institution for dropdown
const listPGAdmins = async (req, res) => {
    try {
        const loggedInUser = req.user;
        let result;

        if (loggedInUser.role === "pg_admin") {
            result = await query(
                `SELECT uc.id, uc.email, pa.pg_admin_name AS name
                 FROM user_credentials uc
                 LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
                 WHERE uc.role = 'pg_admin' AND uc.institution_id = $1 AND pa.status = 'active'`,
                [loggedInUser.institution_id]
            );
        } else {
            // Super Admin can assign to any admin
            result = await query(
                `SELECT uc.id, uc.email, COALESCE(pa.pg_admin_name, sa.name) AS name
                 FROM user_credentials uc
                 LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
                 LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
                 WHERE pa.status = 'active' OR sa.id IS NOT NULL`
            );
        }

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error in listPGAdmins:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admins" });
    }
};

module.exports = {
    listPublicInstitutions,
    createPublicTicket,
    getPublicTicket,
    listTickets,
    getTicketMessages,
    replyTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    saveInternalNote,
    listPGAdmins
};
