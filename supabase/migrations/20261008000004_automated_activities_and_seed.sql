-- ====================================================================
-- PropertyLedge Automated Autopilot Activities & Test Data Seeding
-- Migration: 20261008000004_automated_activities_and_seed.sql
-- ====================================================================

-- 1. Autopilot sync function for generating activities from leases & condition reports
CREATE OR REPLACE FUNCTION public.sync_workspace_autopilot_activities(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_lease RECORD;
  v_cr RECORD;
  v_defect RECORD;
  v_owner_id UUID;
  v_agent_id UUID;
  v_target_user UUID;
  v_activity_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Find workspace owner and active agent for default assignments
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  SELECT user_id INTO v_agent_id FROM public.workspace_members 
   WHERE workspace_id = p_workspace_id AND status = 'active' AND user_id != v_owner_id 
   LIMIT 1;

  v_target_user := COALESCE(v_agent_id, v_owner_id);

  -- A. Generate Activities for Active Leases
  FOR v_lease IN
    SELECT l.*, p.name AS property_name, p.workspace_id
    FROM public.leases l
    JOIN public.properties p ON p.id = l.property_id
    WHERE p.workspace_id = p_workspace_id
  LOOP
    -- 1. Lease Expiry Review Activity
    IF v_lease.end_date IS NOT NULL THEN
      SELECT id INTO v_activity_id FROM public.activities
      WHERE workspace_id = p_workspace_id AND property_id = v_lease.property_id 
        AND lease_id = v_lease.id AND activity_type_id = 'lease_expiry';

      IF v_activity_id IS NULL THEN
        INSERT INTO public.activities (
          workspace_id, property_id, lease_id, activity_type_id, title, description,
          lifecycle_status, is_recurring, recurrence_frequency, owner_id
        ) VALUES (
          p_workspace_id, v_lease.property_id, v_lease.id, 'lease_expiry',
          'Lease Expiry & Renewal Review — ' || v_lease.property_name,
          'Review upcoming lease expiration, tenant intentions, and renewal terms.',
          'active', false, NULL, v_owner_id
        ) RETURNING id INTO v_activity_id;

        INSERT INTO public.activity_occurrences (
          activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
        ) VALUES (
          v_activity_id, p_workspace_id, v_lease.property_id,
          GREATEST(CURRENT_DATE, v_lease.end_date - INTERVAL '60 days')::DATE,
          v_target_user, 'open', 1
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    -- 2. Rent Review Activity
    IF v_lease.start_date IS NOT NULL THEN
      SELECT id INTO v_activity_id FROM public.activities
      WHERE workspace_id = p_workspace_id AND property_id = v_lease.property_id 
        AND lease_id = v_lease.id AND activity_type_id = 'rent_review';

      IF v_activity_id IS NULL THEN
        INSERT INTO public.activities (
          workspace_id, property_id, lease_id, activity_type_id, title, description,
          lifecycle_status, is_recurring, recurrence_frequency, owner_id
        ) VALUES (
          p_workspace_id, v_lease.property_id, v_lease.id, 'rent_review',
          'Annual Rent Review — ' || v_lease.property_name,
          'Evaluate current market rental yields and prepare annual rent adjustment notice.',
          'active', true, 'annual', v_owner_id
        ) RETURNING id INTO v_activity_id;

        INSERT INTO public.activity_occurrences (
          activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
        ) VALUES (
          v_activity_id, p_workspace_id, v_lease.property_id,
          (v_lease.start_date + INTERVAL '6 months')::DATE,
          v_target_user, 'open', 1
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- B. Generate Activities for Condition Reports & Inspections
  FOR v_cr IN
    SELECT cr.*, p.name AS property_name
    FROM public.condition_reports cr
    JOIN public.properties p ON p.id = cr.property_id
    WHERE cr.workspace_id = p_workspace_id
  LOOP
    SELECT id INTO v_activity_id FROM public.activities
    WHERE workspace_id = p_workspace_id AND property_id = v_cr.property_id 
      AND activity_type_id = 'inspection'
      AND title LIKE ('%' || v_cr.type || '%');

    IF v_activity_id IS NULL THEN
      INSERT INTO public.activities (
        workspace_id, property_id, lease_id, activity_type_id, title, description,
        lifecycle_status, is_recurring, recurrence_frequency, owner_id
      ) VALUES (
        p_workspace_id, v_cr.property_id, v_cr.lease_id, 'inspection',
        v_cr.type || ' Condition Report Review — ' || v_cr.property_name,
        'Review inspection details, tenant agreement, and baseline photographic records.',
        'active', false, NULL, v_owner_id
      ) RETURNING id INTO v_activity_id;

      INSERT INTO public.activity_occurrences (
        activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number,
        completed_at, completed_by
      ) VALUES (
        v_activity_id, p_workspace_id, v_cr.property_id,
        v_cr.inspection_date,
        v_target_user,
        CASE WHEN v_cr.status = 'Completed' THEN 'completed' ELSE 'in_progress' END,
        1,
        CASE WHEN v_cr.status = 'Completed' THEN NOW() ELSE NULL END,
        CASE WHEN v_cr.status = 'Completed' THEN v_owner_id ELSE NULL END
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- C. Generate Activities for Defects logged during Inspections
  FOR v_defect IN
    SELECT d.*, cr.property_id, p.name AS property_name, cr.workspace_id
    FROM public.inspection_defects d
    JOIN public.inspection_rooms r ON r.id = d.room_id
    JOIN public.condition_reports cr ON cr.id = r.report_id
    JOIN public.properties p ON p.id = cr.property_id
    WHERE cr.workspace_id = p_workspace_id
  LOOP
    SELECT id INTO v_activity_id FROM public.activities
    WHERE workspace_id = p_workspace_id AND property_id = v_defect.property_id 
      AND activity_type_id = 'repair'
      AND title LIKE ('%' || COALESCE(v_defect.item_name, 'Defect') || '%');

    IF v_activity_id IS NULL THEN
      INSERT INTO public.activities (
        workspace_id, property_id, activity_type_id, title, description,
        lifecycle_status, is_recurring, recurrence_frequency, owner_id
      ) VALUES (
        p_workspace_id, v_defect.property_id, 'repair',
        'Defect Repair: ' || COALESCE(v_defect.item_name, 'Inspection Issue') || ' — ' || v_defect.property_name,
        v_defect.notes || ' (Severity: ' || v_defect.severity || ')',
        'active', false, NULL, v_owner_id
      ) RETURNING id INTO v_activity_id;

      INSERT INTO public.activity_occurrences (
        activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
      ) VALUES (
        v_activity_id, p_workspace_id, v_defect.property_id,
        CASE 
          WHEN v_defect.severity = 'Urgent' THEN CURRENT_DATE
          WHEN v_defect.severity = 'Major' THEN CURRENT_DATE + INTERVAL '3 days'
          ELSE CURRENT_DATE + INTERVAL '7 days'
        END::DATE,
        v_target_user,
        'open',
        1
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'activities_created', v_count);
END;
$$;
