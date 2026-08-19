const { query, transaction } = require("../Config/Database");

// 1. List active institutions for public dropdown selection
const listPublicInstitutions = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                i.id, 
                i.institution_name, 
                i.institution_code,
                COALESCE(s.live_support_enabled, TRUE) AS live_support_enabled,
                COALESCE(s.meal_tracker_enabled, TRUE) AS meal_tracker_enabled
            FROM institutions i
            LEFT JOIN portal_settings s ON i.id = s.institution_id
            WHERE i.status = 'active' 
            ORDER BY i.institution_name ASC
        `);
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

// ==========================================
// Continuous Support Chat System (No Tickets)
// ==========================================

const getPublicChatUser = async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        const cleanPhone = phone.trim();

        // Check if support_user already exists
        const userRes = await query(
            `SELECT u.*, inst.institution_name 
             FROM support_users u
             LEFT JOIN institutions inst ON u.institution_id = inst.id
             WHERE u.phone = $1`,
            [cleanPhone]
        );

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            // Fetch message history
            const messagesRes = await query(
                "SELECT * FROM support_user_chats WHERE support_user_id = $1 ORDER BY created_at ASC",
                [user.id]
            );
            return res.json({
                success: true,
                exists: true,
                user,
                messages: messagesRes.rows
            });
        }

        // If not exists, check if they are a tenant to auto-fill details
        const tenantMatch = await query(
            "SELECT id, full_name, email, institution_id FROM tenants WHERE phone = $1 AND deleted_at IS NULL LIMIT 1",
            [cleanPhone]
        );

        if (tenantMatch.rows.length > 0) {
            return res.json({
                success: true,
                exists: false,
                suggestedInfo: {
                    name: tenantMatch.rows[0].full_name,
                    email: tenantMatch.rows[0].email,
                    institution_id: tenantMatch.rows[0].institution_id
                }
            });
        }

        return res.json({
            success: true,
            exists: false
        });
    } catch (error) {
        console.error("Error in getPublicChatUser:", error);
        res.status(500).json({ success: false, message: "Failed to load support user details" });
    }
};

const getKeywordAutoReply = (userMessage) => {
    const text = userMessage.toLowerCase().trim();
    
    // Check for issues/problems
    if (
        text.includes("issue") || 
        text.includes("problem") || 
        text.includes("complaint") || 
        text.includes("broken") || 
        text.includes("not working") || 
        text.includes("repair") || 
        text.includes("fault") || 
        text.includes("leak") || 
        text.includes("damage") ||
        text.includes("wifi") ||
        text.includes("water") ||
        text.includes("food") ||
        text.includes("clean") ||
        text.includes("electricity") ||
        text.includes("power") ||
        text.includes("help")
    ) {
        return "We understand you are facing an issue. Our management will connect with you shortly to resolve it as soon as possible.";
    }

    // Check for feedback/suggestions/improvements
    if (
        text.includes("feedback") || 
        text.includes("suggest") || 
        text.includes("improve") || 
        text.includes("recommend") || 
        text.includes("opinion") ||
        text.includes("experience") ||
        text.includes("service")
    ) {
        if (text.includes("manager") || text.includes("stay") || text.includes("blr")) {
            return "Hope you are getting good service from the BLR stays manager. If you want to give valuable feedback or suggestions to improve our services, we are happy to hear it here!";
        }
        return "What kind of suggestions do you want to tell us to improve our services? We are executives, please let us know what services we need to improve from our side.";
    }

    // Check for greetings or generic hello
    if (
        text.includes("hello") || 
        text.includes("hi ") || 
        text === "hi" || 
        text.includes("hey") || 
        text.includes("greetings") || 
        text.includes("support")
    ) {
        return "Hello! Thank you for reaching out to BLR Stay Live Support. Our management team will connect with you shortly.";
    }

    // Default fallback
    return "Thank you for your message. Our management team has received it and will connect with you shortly.";
};

const registerPublicChatUser = async (req, res) => {
    try {
        const { name, email, phone, institution_id, message } = req.body;

        if (!phone || !name || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const cleanPhone = phone.trim();
        const cleanName = name.trim();
        const cleanEmail = email.trim();
        const solvedMessage = (message && message.trim()) || "Hello! I started a chat.";
        
        let solvedInstitutionId = parseInt(institution_id, 10) || null;
        if (!solvedInstitutionId) {
            const firstInst = await query("SELECT id FROM institutions ORDER BY id ASC LIMIT 1");
            solvedInstitutionId = firstInst.rows[0]?.id || 1;
        }

        const attachmentUrl = req.file?.cloudinaryUrl || null;

        const result = await transaction(async (client) => {
            // Insert or update support_users
            const userRes = await client.query(
                `INSERT INTO support_users (
                    institution_id, name, email, phone
                ) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (phone) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    email = EXCLUDED.email, 
                    institution_id = EXCLUDED.institution_id,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *`,
                [solvedInstitutionId, cleanName, cleanEmail, cleanPhone]
            );
            const user = userRes.rows[0];

            // Insert message
            const chatRes = await client.query(
                `INSERT INTO support_user_chats (
                    support_user_id, sender_type, sender_id, message, attachment, is_read
                ) VALUES ($1, 'user', NULL, $2, $3, false) RETURNING *`,
                [user.id, solvedMessage, attachmentUrl]
            );

            // Auto reply from Admin based on keywords
            const autoReplyText = getKeywordAutoReply(solvedMessage);
            await client.query(
                `INSERT INTO support_user_chats (
                    support_user_id, sender_type, sender_id, message, attachment, is_read
                ) VALUES ($1, 'admin', NULL, $2, NULL, false)`,
                [user.id, autoReplyText]
            );

            return { user, message: chatRes.rows[0] };
        });

        // Broadcast new socket events
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.emit("ticket_list_changed");
            io.emit("new_ticket", { ticketId: result.user.id, name: cleanName, subject: solvedMessage });
        }

        res.json({
            success: true,
            message: "Registered and chat started successfully",
            user: result.user,
            chatMessage: result.message
        });
    } catch (error) {
        console.error("Error in registerPublicChatUser:", error);
        res.status(500).json({ success: false, message: "Failed to start support session" });
    }
};

const getPublicChatUserMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const userRes = await query(
            `SELECT u.*, inst.institution_name 
             FROM support_users u
             LEFT JOIN institutions inst ON u.institution_id = inst.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const messages = await query(
            "SELECT * FROM support_user_chats WHERE support_user_id = $1 ORDER BY created_at ASC",
            [userId]
        );

        res.json({ 
            success: true, 
            user: userRes.rows[0],
            messages: messages.rows 
        });
    } catch (error) {
        console.error("Error in getPublicChatUserMessages:", error);
        res.status(500).json({ success: false, message: "Failed to load messages" });
    }
};

const replyPublicChatUser = async (req, res) => {
    try {
        const { support_user_id, message } = req.body;

        if (!support_user_id || !message) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const attachmentUrl = req.file?.cloudinaryUrl || null;

        // Insert message
        const insertRes = await query(
            `INSERT INTO support_user_chats (
                support_user_id, sender_type, sender_id, message, attachment, is_read
            ) VALUES ($1, 'user', NULL, $2, $3, false) RETURNING *`,
            [support_user_id, message.trim(), attachmentUrl]
        );

        const newMessage = insertRes.rows[0];

        // Update support user updated_at time
        await query("UPDATE support_users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [support_user_id]);

        // Broadcast to Socket.io room
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            const roomName = `ticket_${support_user_id}`;
            const clients = io.sockets.adapter.rooms.get(roomName);
            console.log(`[replyPublicChatUser] Broadcasting to room: ${roomName}. Active clients:`, clients ? Array.from(clients) : []);
            
            io.to(roomName).emit("receive_message", newMessage);
            io.emit("ticket_updated", { ticketId: support_user_id, lastMessage: newMessage });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, data: newMessage });
    } catch (error) {
        console.error("Error in replyPublicChatUser:", error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};

const listAdminChatUsers = async (req, res) => {
    try {
        const { search } = req.body;
        const loggedInUser = req.user;

        let filterSql = "WHERE 1=1";
        const queryParams = [];

        if (loggedInUser.role === "pg_admin") {
            queryParams.push(loggedInUser.institution_id);
            filterSql += ` AND u.institution_id = $${queryParams.length}`;
        }

        if (search) {
            queryParams.push(`%${search.trim()}%`);
            filterSql += ` AND (u.name ILIKE $${queryParams.length} OR u.phone ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`;
        }

        const sql = `
            SELECT 
                u.*,
                COALESCE(un.unread_count, 0)::int AS unread_count,
                lm.message AS last_message,
                lm.created_at AS last_message_time,
                inst.institution_name
            FROM support_users u
            LEFT JOIN institutions inst ON u.institution_id = inst.id
            LEFT JOIN (
                SELECT support_user_id, COUNT(*)::int AS unread_count 
                FROM support_user_chats 
                WHERE sender_type = 'user' AND is_read = false 
                GROUP BY support_user_id
            ) un ON u.id = un.support_user_id
            LEFT JOIN (
                SELECT DISTINCT ON (support_user_id) support_user_id, message, created_at
                FROM support_user_chats
                ORDER BY support_user_id, created_at DESC
            ) lm ON u.id = lm.support_user_id
            ${filterSql}
            ORDER BY COALESCE(lm.created_at, u.updated_at) DESC
        `;

        const result = await query(sql, queryParams);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error in listAdminChatUsers:", error);
        res.status(500).json({ success: false, message: "Failed to fetch chat users" });
    }
};

const getAdminChatUserMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const loggedInUser = req.user;

        // Access check for pg_admin
        if (loggedInUser.role === "pg_admin") {
            const accessCheck = await query(
                "SELECT institution_id FROM support_users WHERE id = $1",
                [userId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Chat user not found" });
            }
            if (accessCheck.rows[0].institution_id !== loggedInUser.institution_id) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }
        }

        // Mark messages as read
        await query(
            "UPDATE support_user_chats SET is_read = true WHERE support_user_id = $1 AND sender_type = 'user'",
            [userId]
        );

        // Fetch messages
        const messages = await query(
            "SELECT * FROM support_user_chats WHERE support_user_id = $1 ORDER BY created_at ASC",
            [userId]
        );

        // Broadcast read receipt
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.to(`ticket_${userId}`).emit("messages_read", { ticketId: userId, readBy: "admin" });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, data: messages.rows });
    } catch (error) {
        console.error("Error in getAdminChatUserMessages:", error);
        res.status(500).json({ success: false, message: "Failed to load chat messages" });
    }
};

const replyAdminChatUser = async (req, res) => {
    try {
        const { support_user_id, message } = req.body;
        const loggedInUser = req.user;

        if (!support_user_id || !message) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const attachmentUrl = req.file?.cloudinaryUrl || null;
        const adminId = loggedInUser.id; // user_credentials ID

        // Insert message
        const insertRes = await query(
            `INSERT INTO support_user_chats (
                support_user_id, sender_type, sender_id, message, attachment, is_read
            ) VALUES ($1, 'admin', $2, $3, $4, false) RETURNING *`,
            [support_user_id, adminId, message.trim(), attachmentUrl]
        );

        const newMessage = insertRes.rows[0];

        // Update support user updated_at time
        await query("UPDATE support_users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [support_user_id]);

        // Broadcast to Socket.io room
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            const roomName = `ticket_${support_user_id}`;
            const clients = io.sockets.adapter.rooms.get(roomName);
            console.log(`[replyAdminChatUser] Broadcasting to room: ${roomName}. Active clients:`, clients ? Array.from(clients) : []);
            
            io.to(roomName).emit("receive_message", newMessage);
            io.emit("ticket_updated", { ticketId: support_user_id, lastMessage: newMessage });
            io.emit("ticket_list_changed");
        }

        res.json({ success: true, data: newMessage });
    } catch (error) {
        console.error("Error in replyAdminChatUser:", error);
        res.status(500).json({ success: false, message: "Failed to send admin message" });
    }
};

const getAdminUnreadCount = async (req, res) => {
    try {
        const loggedInUser = req.user;
        let filterSql = "";
        const queryParams = [];

        if (loggedInUser.role === "pg_admin") {
            queryParams.push(loggedInUser.institution_id);
            filterSql = " AND u.institution_id = $1";
        }

        const result = await query(
            `SELECT COUNT(DISTINCT u.id)::int AS unread_chats_count
             FROM support_users u
             INNER JOIN support_user_chats c ON u.id = c.support_user_id
             WHERE c.sender_type = 'user' AND c.is_read = false${filterSql}`,
            queryParams
        );

        res.json({ success: true, count: result.rows[0]?.unread_chats_count || 0 });
    } catch (error) {
        console.error("Error in getAdminUnreadCount:", error);
        res.status(500).json({ success: false, count: 0 });
    }
};

const markAdminChatUserUnread = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find the last message sent by user
        const lastUserMsg = await query(
            "SELECT id FROM support_user_chats WHERE support_user_id = $1 AND sender_type = 'user' ORDER BY created_at DESC LIMIT 1",
            [userId]
        );
        
        if (lastUserMsg.rows.length > 0) {
            await query(
                "UPDATE support_user_chats SET is_read = false WHERE id = $1",
                [lastUserMsg.rows[0].id]
            );
        }
        
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.emit("ticket_list_changed");
        }
        
        res.json({ success: true, message: "Marked as unread successfully" });
    } catch (error) {
        console.error("Error in markAdminChatUserUnread:", error);
        res.status(500).json({ success: false, message: "Failed to mark as unread" });
    }
};

const deleteAdminChatUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Delete all chats for the user
        await query("DELETE FROM support_user_chats WHERE support_user_id = $1", [userId]);
        // Delete the support user
        await query("DELETE FROM support_users WHERE id = $1", [userId]);
        
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.emit("ticket_list_changed");
        }
        
        res.json({ success: true, message: "Conversation deleted successfully" });
    } catch (error) {
        console.error("Error in deleteAdminChatUser:", error);
        res.status(500).json({ success: false, message: "Failed to delete conversation" });
    }
};

const markAdminChatUserRead = async (req, res) => {
    try {
        const { userId } = req.params;
        
        await query(
            "UPDATE support_user_chats SET is_read = true WHERE support_user_id = $1 AND sender_type = 'user'",
            [userId]
        );
        
        if (req.app.get("socketio")) {
            const io = req.app.get("socketio");
            io.emit("ticket_list_changed");
        }
        
        res.json({ success: true, message: "Marked as read successfully" });
    } catch (error) {
        console.error("Error in markAdminChatUserRead:", error);
        res.status(500).json({ success: false, message: "Failed to mark as read" });
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
    listPGAdmins,
    // Support Chats API exports
    getPublicChatUser,
    registerPublicChatUser,
    getPublicChatUserMessages,
    replyPublicChatUser,
    listAdminChatUsers,
    getAdminChatUserMessages,
    replyAdminChatUser,
    getAdminUnreadCount,
    markAdminChatUserUnread,
    deleteAdminChatUser,
    markAdminChatUserRead
};
