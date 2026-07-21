-- ============================================================
-- Migration 049: Dashboard RPCs
--
-- Collapses 15+ client-side queries into 5 server-side RPCs.
-- Each function accepts p_account_id for explicit tenant scoping
-- and returns a JSON result (single struct or array) so the
-- client makes one call per dashboard section instead of many.
-- ============================================================

-- ============================================================
-- 1. get_dashboard_metrics
-- Returns all 4 metric-card values + deltas in one round trip.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start    TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'UTC');
  yesterday_start TIMESTAMPTZ := date_trunc('day', (NOW() - INTERVAL '1 day') AT TIME ZONE 'UTC');
  v_active_conversations       INT;
  v_new_conv_today             INT;
  v_new_conv_yesterday         INT;
  v_new_contacts_today         INT;
  v_new_contacts_yesterday     INT;
  v_open_deals_value           NUMERIC;
  v_open_deals_count           INT;
  v_messages_sent_today        INT;
  v_messages_sent_yesterday    INT;
BEGIN
  SELECT COUNT(*) INTO v_active_conversations
    FROM conversations
   WHERE account_id = p_account_id AND status = 'open';

  SELECT COUNT(*) INTO v_new_conv_today
    FROM conversations
   WHERE account_id = p_account_id AND status = 'open' AND created_at >= today_start;

  SELECT COUNT(*) INTO v_new_conv_yesterday
    FROM conversations
   WHERE account_id = p_account_id AND status = 'open'
     AND created_at >= yesterday_start AND created_at < today_start;

  SELECT COUNT(*) INTO v_new_contacts_today
    FROM contacts
   WHERE account_id = p_account_id AND created_at >= today_start;

  SELECT COUNT(*) INTO v_new_contacts_yesterday
    FROM contacts
   WHERE account_id = p_account_id
     AND created_at >= yesterday_start AND created_at < today_start;

  SELECT COALESCE(SUM(value), 0), COUNT(*) INTO v_open_deals_value, v_open_deals_count
    FROM deals
   WHERE account_id = p_account_id AND status = 'open';

  SELECT COUNT(*) INTO v_messages_sent_today
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
   WHERE c.account_id = p_account_id
     AND m.sender_type IN ('agent', 'bot')
     AND m.created_at >= today_start;

  SELECT COUNT(*) INTO v_messages_sent_yesterday
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
   WHERE c.account_id = p_account_id
     AND m.sender_type IN ('agent', 'bot')
     AND m.created_at >= yesterday_start AND m.created_at < today_start;

  RETURN jsonb_build_object(
    'activeConversations', jsonb_build_object(
      'current', v_active_conversations,
      'previous', v_new_conv_today - v_new_conv_yesterday
    ),
    'newContactsToday', jsonb_build_object(
      'current', v_new_contacts_today,
      'previous', v_new_contacts_yesterday
    ),
    'openDealsValue', v_open_deals_value,
    'openDealsCount', v_open_deals_count,
    'messagesSentToday', jsonb_build_object(
      'current', v_messages_sent_today,
      'previous', v_messages_sent_yesterday
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(UUID) TO authenticated, service_role;

-- ============================================================
-- 2. get_conversations_series
-- Returns daily incoming/outgoing counts for N days.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_conversations_series(
  p_account_id UUID,
  p_range_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', NOW() AT TIME ZONE 'UTC') - (p_range_days - 1) * INTERVAL '1 day',
      date_trunc('day', NOW() AT TIME ZONE 'UTC'),
      '1 day'::interval
    )::date AS day
  ),
  counts AS (
    SELECT
      m.created_at::date AS day,
      COUNT(*) FILTER (WHERE m.sender_type = 'customer') AS incoming,
      COUNT(*) FILTER (WHERE m.sender_type IN ('agent', 'bot')) AS outgoing
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.account_id = p_account_id
      AND m.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') - (p_range_days - 1) * INTERVAL '1 day'
    GROUP BY m.created_at::date
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'incoming', COALESCE(c.incoming, 0),
      'outgoing', COALESCE(c.outgoing, 0)
    )
    ORDER BY d.day
  )
  FROM days d
  LEFT JOIN counts c ON c.day = d.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversations_series(UUID, INT) TO authenticated, service_role;

-- ============================================================
-- 3. get_pipeline_donut
-- Returns stages with deal counts + values for open deals.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pipeline_donut(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stage_data AS (
    SELECT
      ps.id,
      ps.name,
      ps.color,
      COUNT(d.id) AS deal_count,
      COALESCE(SUM(d.value), 0) AS total_value
    FROM pipeline_stages ps
    JOIN pipelines p ON p.id = ps.pipeline_id
    LEFT JOIN deals d ON d.stage_id = ps.id AND d.status = 'open'
    WHERE p.account_id = p_account_id
    GROUP BY ps.id, ps.name, ps.color, ps.position
    ORDER BY ps.position
  )
  SELECT jsonb_build_object(
    'stages', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', sd.id,
          'name', sd.name,
          'color', COALESCE(sd.color, '#64748b'),
          'dealCount', sd.deal_count,
          'totalValue', sd.total_value
        )
      ) FROM stage_data sd
       WHERE sd.total_value > 0 OR sd.deal_count > 0),
      '[]'::jsonb
    ),
    'totalValue', COALESCE((SELECT SUM(total_value) FROM stage_data), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_pipeline_donut(UUID) TO authenticated, service_role;

-- ============================================================
-- 4. get_response_time_summary
-- Returns avg response minutes per day-of-week for last 14 days,
-- plus this-week and last-week averages.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_response_time_summary(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH paired AS (
    SELECT
      EXTRACT(EPOCH FROM (MIN(m_outbound.created_at) - m_customer.created_at)) / 60 AS diff_min,
      (EXTRACT(dow FROM m_customer.created_at)::int + 6) % 7 AS dow,
      m_customer.created_at AS customer_at
    FROM messages m_customer
    JOIN conversations c ON c.id = m_customer.conversation_id
    JOIN messages m_outbound ON m_outbound.conversation_id = m_customer.conversation_id
      AND m_outbound.sender_type IN ('agent', 'bot')
      AND m_outbound.created_at > m_customer.created_at
    WHERE c.account_id = p_account_id
      AND m_customer.sender_type = 'customer'
      AND m_customer.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '13 days'
    GROUP BY m_customer.conversation_id, m_customer.created_at
    HAVING MIN(m_outbound.created_at) IS NOT NULL
  ),
  dow_agg AS (
    SELECT
      dow,
      COUNT(*) AS samples,
      AVG(diff_min)::numeric(10,1) AS avg_minutes
    FROM paired
    GROUP BY dow
  )
  SELECT jsonb_build_object(
    'buckets', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('dow', dow, 'avgMinutes', avg_minutes, 'samples', samples) ORDER BY dow)
       FROM dow_agg),
      '[]'::jsonb
    ),
    'thisWeekAvg', (SELECT AVG(diff_min)::numeric(10,1)
                    FROM paired
                    WHERE customer_at >= date_trunc('week', NOW() AT TIME ZONE 'UTC')),
    'lastWeekAvg', (SELECT AVG(diff_min)::numeric(10,1)
                    FROM paired
                    WHERE customer_at >= date_trunc('week', NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
                      AND customer_at < date_trunc('week', NOW() AT TIME ZONE 'UTC'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_response_time_summary(UUID) TO authenticated, service_role;

-- ============================================================
-- 5. get_activity_feed
-- Returns a unified, time-sorted list of recent activity across
-- messages, contacts, deals, broadcasts, and automation logs.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_activity_feed(
  p_account_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH messages_feed AS (
    SELECT
      'msg-' || m.id AS id,
      'message' AS kind,
      'New message from ' || COALESCE(cont.name, cont.phone, 'Unknown') AS text,
      m.created_at AS at,
      '/inbox?c=' || m.conversation_id AS href
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN contacts cont ON cont.id = c.contact_id
    WHERE c.account_id = p_account_id AND m.sender_type = 'customer'
    ORDER BY m.created_at DESC
    LIMIT 10
  ),
  contacts_feed AS (
    SELECT
      'contact-' || id AS id,
      'contact' AS kind,
      'New contact: ' || COALESCE(name, phone) AS text,
      created_at AS at,
      '/contacts' AS href
    FROM contacts
    WHERE account_id = p_account_id
    ORDER BY created_at DESC
    LIMIT 10
  ),
  deals_feed AS (
    SELECT
      'deal-' || d.id AS id,
      'deal' AS kind,
      CASE WHEN ps.name IS NOT NULL
        THEN 'Deal "' || d.title || '" in ' || ps.name
        ELSE 'Deal "' || d.title || '" updated'
      END AS text,
      d.updated_at AS at,
      '/pipelines' AS href
    FROM deals d
    LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
    WHERE d.account_id = p_account_id
    ORDER BY d.updated_at DESC
    LIMIT 10
  ),
  broadcasts_feed AS (
    SELECT
      'broadcast-' || id AS id,
      'broadcast' AS kind,
      'Broadcast "' || name || '" ' ||
        CASE WHEN status = 'sent'
          THEN 'sent to ' || total_recipients || ' contacts'
          ELSE status || ' (' || total_recipients || ' recipients)'
        END AS text,
      created_at AS at,
      '/broadcasts' AS href
    FROM broadcasts
    WHERE account_id = p_account_id
    ORDER BY created_at DESC
    LIMIT 5
  ),
  auto_feed AS (
    SELECT
      'auto-' || al.id AS id,
      'automation' AS kind,
      'Automation "' || COALESCE(a.name, 'Automation') || '" ' ||
        CASE WHEN al.status = 'failed' THEN 'failed for '
             ELSE 'triggered for '
        END || COALESCE(cont.name, cont.phone, 'a contact') AS text,
      al.created_at AS at,
      NULL::text AS href
    FROM automation_logs al
    LEFT JOIN automations a ON a.id = al.automation_id
    LEFT JOIN contacts cont ON cont.id = al.contact_id
    WHERE al.account_id = p_account_id
    ORDER BY al.created_at DESC
    LIMIT 10
  ),
  unified AS (
    SELECT * FROM messages_feed
    UNION ALL
    SELECT * FROM contacts_feed
    UNION ALL
    SELECT * FROM deals_feed
    UNION ALL
    SELECT * FROM broadcasts_feed
    UNION ALL
    SELECT * FROM auto_feed
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'kind', u.kind,
      'text', u.text,
      'at', u.at,
      'href', u.href
    )
    ORDER BY u.at DESC
  )
  FROM (
    SELECT * FROM unified
    ORDER BY at DESC
    LIMIT p_limit
  ) u;
$$;

GRANT EXECUTE ON FUNCTION public.get_activity_feed(UUID, INT) TO authenticated, service_role;
