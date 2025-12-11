// controllers/movementController.js

const getMovementDetail = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Get movement detail with approval status
        const movementQuery = `
            WITH movement_details AS (
                SELECT 
                    gm.movement_id,
                    gm.reference_no,
                    gm.movement_date,
                    gm.status as movement_status,
                    gm.source_location_id,
                    gm.target_location_id,
                    gm.created_at,
                    gm.updated_at,
                    gm.approval_level,
                    gm.receive_status,
                    gm.loss_status,
                    sl.name as source_location_name,
                    tl.name as target_location_name,
                    u.email as created_by_email,
                    u.user_id as created_by_id,
                    ar.record_id,
                    ar.overall_status as approval_status,
                    ar.current_level_order,
                    ar.submitted_at,
                    ar.completed_at,
                    afl.level_name as current_level_name,
                    als.status as current_level_status,
                    als.revision_notes,
                    als.approved_by as current_approved_by,
                    als.approved_at as current_approved_at,
                    approver.email as current_approver_email,
                    approver_requester.email as revision_requested_by_email,
                    als.revision_requested_at,
                    EXISTS (
                        SELECT 1 
                        FROM gh_user_approval_level ual
                        WHERE ual.user_id = $2
                            AND ual.flow_id = ar.flow_id
                            AND ual.level_order = ar.current_level_order
                            AND ual.is_active = true
                    ) as user_can_approve,
                    -- Check if user is creator
                    CASE WHEN u.user_id = $2 THEN true ELSE false END as is_creator,
                    -- Check if movement can be edited
                    CASE 
                        WHEN ar.overall_status IN ('needRevision', 'onReview') 
                            AND u.user_id = $2 
                            THEN true
                        ELSE false
                    END as can_edit
                FROM gh_movement gm
                LEFT JOIN warehouse sl ON gm.source_location_id = sl.warehouse_id
                LEFT JOIN warehouse tl ON gm.target_location_id = tl.warehouse_id
                LEFT JOIN "user" u ON gm.created_by = u.user_id
                LEFT JOIN gh_approve_record ar 
                    ON ar.reference_id = gm.movement_id 
                    AND ar.reference_type = 'good_movement'
                LEFT JOIN gh_approval_flow_level afl 
                    ON ar.flow_id = afl.flow_id 
                    AND ar.current_level_order = afl.level_order
                LEFT JOIN gh_approval_level_status als 
                    ON ar.record_id = als.record_id 
                    AND als.level_order = ar.current_level_order
                LEFT JOIN "user" approver ON als.approved_by = approver.user_id
                LEFT JOIN "user" approver_requester ON als.revision_requested_by = approver_requester.user_id
                WHERE gm.movement_id = $1
            )
            SELECT * FROM movement_details
        `;

        const movementResult = await db.query(movementQuery, [id, userId]);
        const movement = movementResult.rows[0];

        if (!movement) {
            return res.status(404).json({ error: 'Movement not found' });
        }

        // Get approval history
        const historyQuery = `
            SELECT 
                h.history_id,
                h.level_order,
                h.level_name,
                h.action,
                h.comment,
                h.action_at,
                u.email as action_by_email,
                u.user_id as action_by_id,
                als.status as level_status,
                als.revision_notes,
                als.approved_at,
                CASE 
                    WHEN h.action = 'revision_requested' THEN true
                    ELSE false
                END as is_revision
            FROM gh_approval_history h
            LEFT JOIN "user" u ON h.user_id = u.user_id
            LEFT JOIN gh_approve_record ar ON h.record_id = ar.record_id
            LEFT JOIN gh_approval_level_status als 
                ON ar.record_id = als.record_id 
                AND h.level_order = als.level_order
            WHERE ar.reference_id = $1
                AND ar.reference_type = 'good_movement'
            ORDER BY h.action_at DESC
        `;

        // Get movement items
        const itemsQuery = `
            SELECT 
                mi.movement_item_id,
                mi.qty,
                mi.uom,
                mi.qty_received,
                mi.qty_loss,
                mi.revision_notes as item_revision_notes,
                mi.last_revised_at,
                mu.material_name,
                mu.material_used_id,
                mu.unit_price,
                mu.total_price,
                mu.openbravo_id
            FROM gh_movement_item mi
            LEFT JOIN gh_material_used mu ON mi.material_used_id = mu.material_used_id
            WHERE mi.movement_id = $1
            ORDER BY mu.material_name
        `;

        // Get receiving info
        const receivingQuery = `
            SELECT 
                mr.receiving_id,
                mr.received_at,
                mr.total_received,
                mr.total_shortage,
                mr.notes as receiving_notes,
                mr.status as receiving_status,
                u.email as received_by_email,
                (
                    SELECT json_agg(
                        json_build_object(
                            'material_name', mu.material_name,
                            'qty_requested', mri.qty_requested,
                            'qty_received', mri.qty_received,
                            'qty_shortage', mri.qty_shortage,
                            'notes', mri.notes
                        )
                    )
                    FROM gh_movement_receiving_item mri
                    LEFT JOIN gh_material_used mu ON mri.material_used_id = mu.material_used_id
                    WHERE mri.receiving_id = mr.receiving_id
                ) as receiving_items
            FROM gh_movement_receiving mr
            LEFT JOIN "user" u ON mr.received_by = u.user_id
            WHERE mr.movement_id = $1
            ORDER BY mr.received_at DESC
        `;

        // Get approval flow levels
        const flowLevelsQuery = `
            SELECT 
                afl.level_order,
                afl.level_name,
                afl.is_final_level,
                als.status,
                als.approved_at,
                u.email as approved_by_email,
                als.revision_notes,
                als.revision_requested_at,
                rev.email as revision_requested_by_email,
                -- Check if this is current level
                CASE 
                    WHEN ar.current_level_order = afl.level_order THEN true
                    ELSE false
                END as is_current_level,
                -- Get all approvers for this level
                (
                    SELECT json_agg(json_build_object(
                        'user_id', ual.user_id,
                        'email', u2.email,
                        'is_active', ual.is_active
                    ))
                    FROM gh_user_approval_level ual
                    LEFT JOIN "user" u2 ON ual.user_id = u2.user_id
                    WHERE ual.flow_id = ar.flow_id
                        AND ual.level_order = afl.level_order
                        AND ual.is_active = true
                ) as approvers
            FROM gh_approval_flow_level afl
            LEFT JOIN gh_approve_record ar ON ar.flow_id = afl.flow_id
            LEFT JOIN gh_approval_level_status als 
                ON ar.record_id = als.record_id 
                AND afl.level_order = als.level_order
            LEFT JOIN "user" u ON als.approved_by = u.user_id
            LEFT JOIN "user" rev ON als.revision_requested_by = rev.user_id
            WHERE ar.reference_id = $1
                AND ar.reference_type = 'good_movement'
            ORDER BY afl.level_order
        `;

        const [historyResult, itemsResult, receivingResult, flowLevelsResult] = await Promise.all([
            db.query(historyQuery, [id]),
            db.query(itemsQuery, [id]),
            db.query(receivingQuery, [id]),
            db.query(flowLevelsQuery, [id])
        ]);

        // Calculate totals
        const totalQty = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.qty), 0);
        const totalValue = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

        // Determine button visibility
        const canShowButtons = movement.user_can_approve 
            && movement.current_level_status !== 'approved'
            && movement.current_level_status !== 'rejected';

        const response = {
            success: true,
            data: {
                movement: {
                    ...movement,
                    total_qty: totalQty,
                    total_value: totalValue,
                    total_items: itemsResult.rows.length
                },
                items: itemsResult.rows,
                approval_history: historyResult.rows,
                receiving_info: receivingResult.rows[0] || null,
                approval_flow: flowLevelsResult.rows,
                permissions: {
                    can_approve: canShowButtons,
                    can_edit: movement.can_edit,
                    can_request_revision: canShowButtons && movement.current_level_status !== 'needRevision',
                    can_receive: movement.movement_status === 'Approved' && !movement.receive_status,
                    is_creator: movement.is_creator
                },
                button_status: {
                    show_approve: canShowButtons && movement.current_level_status !== 'needRevision',
                    show_reject: canShowButtons,
                    show_revision: canShowButtons && movement.current_level_status !== 'needRevision',
                    show_edit: movement.can_edit,
                    show_receive: movement.movement_status === 'Approved' && !movement.receive_status
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error fetching movement detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API to submit approval action
const submitApprovalAction = async (req, res) => {
    const { id } = req.params;
    const { action, notes } = req.body;
    const userId = req.user.id;

    try {
        // Validate action
        const validActions = ['approve', 'reject', 'request_revision'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Get movement and approval record
        const movementQuery = `
            SELECT 
                gm.movement_id,
                gm.reference_no,
                ar.record_id,
                ar.current_level_order,
                ar.flow_id,
                ar.overall_status,
                als.status as level_status
            FROM gh_movement gm
            LEFT JOIN gh_approve_record ar 
                ON ar.reference_id = gm.movement_id 
                AND ar.reference_type = 'good_movement'
            LEFT JOIN gh_approval_level_status als 
                ON ar.record_id = als.record_id 
                AND als.level_order = ar.current_level_order
            WHERE gm.movement_id = $1
        `;

        const movementResult = await db.query(movementQuery, [id]);
        const movement = movementResult.rows[0];

        if (!movement) {
            return res.status(404).json({ error: 'Movement not found' });
        }

        // Check if user can approve
        const canApproveQuery = `
            SELECT EXISTS (
                SELECT 1 
                FROM gh_user_approval_level 
                WHERE user_id = $1
                    AND flow_id = $2
                    AND level_order = $3
                    AND is_active = true
            ) as can_approve
        `;

        const canApproveResult = await db.query(canApproveQuery, [
            userId, 
            movement.flow_id, 
            movement.current_level_order
        ]);

        if (!canApproveResult.rows[0].can_approve) {
            return res.status(403).json({ error: 'You are not authorized to approve this movement' });
        }

        // Check if level already processed
        if (movement.level_status === 'approved' || movement.level_status === 'rejected') {
            return res.status(400).json({ error: 'This level has already been processed' });
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Insert into approval history
            const historyQuery = `
                INSERT INTO gh_approval_history (
                    record_id,
                    flow_id,
                    user_id,
                    level_order,
                    action,
                    comment,
                    level_name
                ) VALUES (
                    $1, $2, $3, $4, 
                    CASE $5 
                        WHEN 'approve' THEN 'approved'
                        WHEN 'reject' THEN 'rejected'
                        WHEN 'request_revision' THEN 'revision_requested'
                    END,
                    $6,
                    (SELECT level_name FROM gh_approval_flow_level 
                     WHERE flow_id = $2 AND level_order = $4)
                ) RETURNING *
            `;

            const historyResult = await db.query(historyQuery, [
                movement.record_id,
                movement.flow_id,
                userId,
                movement.current_level_order,
                action,
                notes
            ]);

            // Update approval level status
            const updateLevelQuery = `
                UPDATE gh_approval_level_status
                SET 
                    status = CASE $3
                        WHEN 'approve' THEN 'approved'
                        WHEN 'reject' THEN 'rejected'
                        WHEN 'request_revision' THEN 'needRevision'
                    END,
                    ${action === 'approve' ? 'approved_by = $2, approved_at = NOW(),' : ''}
                    ${action === 'request_revision' ? 'revision_notes = $4, revision_requested_by = $2, revision_requested_at = NOW(),' : ''}
                    updated_at = NOW()
                WHERE record_id = $1 
                    AND level_order = $5
            `;

            await db.query(updateLevelQuery, [
                movement.record_id,
                userId,
                action,
                notes,
                movement.current_level_order
            ]);

            // Update movement status if rejected
            if (action === 'reject') {
                await db.query(`
                    UPDATE gh_movement 
                    SET status = 'Rejected',
                        updated_at = NOW()
                    WHERE movement_id = $1
                `, [id]);
            }

            // If approved, check if need to move to next level or complete
            if (action === 'approve') {
                // Check if this is the final level
                const finalLevelQuery = `
                    SELECT is_final_level 
                    FROM gh_approval_flow_level 
                    WHERE flow_id = $1 
                        AND level_order = $2
                `;

                const finalLevelResult = await db.query(finalLevelQuery, [
                    movement.flow_id,
                    movement.current_level_order
                ]);

                const isFinalLevel = finalLevelResult.rows[0]?.is_final_level;

                if (isFinalLevel) {
                    // Complete the approval
                    await db.query(`
                        UPDATE gh_approve_record 
                        SET 
                            overall_status = 'approved',
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE record_id = $1
                    `, [movement.record_id]);

                    // Update movement status
                    await db.query(`
                        UPDATE gh_movement 
                        SET status = 'Approved',
                            updated_at = NOW()
                        WHERE movement_id = $1
                    `, [id]);
                } else {
                    // Move to next level
                    await db.query(`
                        UPDATE gh_approve_record 
                        SET 
                            current_level_order = current_level_order + 1,
                            updated_at = NOW()
                        WHERE record_id = $1
                    `, [movement.record_id]);
                }
            }

            // Commit transaction
            await db.query('COMMIT');

            res.json({
                success: true,
                message: `Movement ${action}d successfully`,
                data: {
                    history: historyResult.rows[0],
                    next_level: action === 'approve' ? movement.current_level_order + 1 : null
                }
            });

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error submitting approval:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};