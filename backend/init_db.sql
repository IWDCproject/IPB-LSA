--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8 (Debian 15.8-1.pgdg110+1)
-- Dumped by pg_dump version 15.8 (Debian 15.8-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: directus
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO directus;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: directus
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO directus;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: directus
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO directus;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: directus
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: directus
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO directus;

--
-- Name: sync_match_denorm(); Type: FUNCTION; Schema: public; Owner: directus
--

CREATE FUNCTION public.sync_match_denorm() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.home_score  := COALESCE((NEW.live_state->>'homeScore')::int, 0);
  NEW.away_score  := COALESCE((NEW.live_state->>'awayScore')::int, 0);
  NEW.timer_secs  := COALESCE((NEW.live_state->>'timerSecs')::int, 0);
  NEW.winner      := NEW.live_state->>'winner';
  NEW.rankings    := CASE
    WHEN NEW.live_state ? 'rankings'
     AND jsonb_array_length(NEW.live_state->'rankings') > 0
    THEN NEW.live_state->'rankings'
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_match_denorm() OWNER TO directus;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO directus;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    description text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.app_settings OWNER TO directus;

--
-- Name: competition_categories; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.competition_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    format_id uuid,
    name text NOT NULL,
    participant_type text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT competition_categories_participant_type_check CHECK ((participant_type = ANY (ARRAY['individual'::text, 'team'::text])))
);


ALTER TABLE public.competition_categories OWNER TO directus;

--
-- Name: directus_access; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_access (
    id uuid NOT NULL,
    role uuid,
    "user" uuid,
    policy uuid NOT NULL,
    sort integer
);


ALTER TABLE public.directus_access OWNER TO directus;

--
-- Name: directus_activity; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_activity (
    id integer NOT NULL,
    action character varying(45) NOT NULL,
    "user" uuid,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip character varying(50),
    user_agent text,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    origin character varying(255)
);


ALTER TABLE public.directus_activity OWNER TO directus;

--
-- Name: directus_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_activity_id_seq OWNER TO directus;

--
-- Name: directus_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_activity_id_seq OWNED BY public.directus_activity.id;


--
-- Name: directus_collections; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_collections (
    collection character varying(64) NOT NULL,
    icon character varying(64),
    note text,
    display_template character varying(255),
    hidden boolean DEFAULT false NOT NULL,
    singleton boolean DEFAULT false NOT NULL,
    translations json,
    archive_field character varying(64),
    archive_app_filter boolean DEFAULT true NOT NULL,
    archive_value character varying(255),
    unarchive_value character varying(255),
    sort_field character varying(64),
    accountability character varying(255) DEFAULT 'all'::character varying,
    color character varying(255),
    item_duplication_fields json,
    sort integer,
    "group" character varying(64),
    collapse character varying(255) DEFAULT 'open'::character varying NOT NULL,
    preview_url character varying(255),
    versioning boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_collections OWNER TO directus;

--
-- Name: directus_comments; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_comments (
    id uuid NOT NULL,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    comment text NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    user_updated uuid
);


ALTER TABLE public.directus_comments OWNER TO directus;

--
-- Name: directus_dashboards; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_dashboards (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(64) DEFAULT 'dashboard'::character varying NOT NULL,
    note text,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    color character varying(255)
);


ALTER TABLE public.directus_dashboards OWNER TO directus;

--
-- Name: directus_deployment_projects; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_deployment_projects (
    id uuid NOT NULL,
    deployment uuid NOT NULL,
    external_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    url character varying(255),
    framework character varying(255),
    deployable boolean DEFAULT true NOT NULL
);


ALTER TABLE public.directus_deployment_projects OWNER TO directus;

--
-- Name: directus_deployment_runs; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_deployment_runs (
    id uuid NOT NULL,
    project uuid NOT NULL,
    external_id character varying(255) NOT NULL,
    target character varying(255) NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    status character varying(255),
    url character varying(255),
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


ALTER TABLE public.directus_deployment_runs OWNER TO directus;

--
-- Name: directus_deployments; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_deployments (
    id uuid NOT NULL,
    provider character varying(255) NOT NULL,
    credentials text,
    options text,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    webhook_ids json,
    webhook_secret character varying(255),
    last_synced_at timestamp with time zone
);


ALTER TABLE public.directus_deployments OWNER TO directus;

--
-- Name: directus_extensions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_extensions (
    enabled boolean DEFAULT true NOT NULL,
    id uuid NOT NULL,
    folder character varying(255) NOT NULL,
    source character varying(255) NOT NULL,
    bundle uuid
);


ALTER TABLE public.directus_extensions OWNER TO directus;

--
-- Name: directus_fields; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_fields (
    id integer NOT NULL,
    collection character varying(64) NOT NULL,
    field character varying(64) NOT NULL,
    special character varying(64),
    interface character varying(64),
    options json,
    display character varying(64),
    display_options json,
    readonly boolean DEFAULT false NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    sort integer,
    width character varying(30) DEFAULT 'full'::character varying,
    translations json,
    note text,
    conditions json,
    required boolean DEFAULT false,
    "group" character varying(64),
    validation json,
    validation_message text,
    searchable boolean DEFAULT true NOT NULL
);


ALTER TABLE public.directus_fields OWNER TO directus;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_fields_id_seq OWNER TO directus;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_fields_id_seq OWNED BY public.directus_fields.id;


--
-- Name: directus_files; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_files (
    id uuid NOT NULL,
    storage character varying(255) NOT NULL,
    filename_disk character varying(255),
    filename_download character varying(255) NOT NULL,
    title character varying(255),
    type character varying(255),
    folder uuid,
    uploaded_by uuid,
    created_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modified_by uuid,
    modified_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    charset character varying(50),
    filesize bigint,
    width integer,
    height integer,
    duration integer,
    embed character varying(200),
    description text,
    location text,
    tags text,
    metadata json,
    focal_point_x integer,
    focal_point_y integer,
    tus_id character varying(64),
    tus_data json,
    uploaded_on timestamp with time zone
);


ALTER TABLE public.directus_files OWNER TO directus;

--
-- Name: directus_flows; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_flows (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(64),
    color character varying(255),
    description text,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    trigger character varying(255),
    accountability character varying(255) DEFAULT 'all'::character varying,
    options json,
    operation uuid,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_flows OWNER TO directus;

--
-- Name: directus_folders; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_folders (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    parent uuid
);


ALTER TABLE public.directus_folders OWNER TO directus;

--
-- Name: directus_migrations; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_migrations (
    version character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.directus_migrations OWNER TO directus;

--
-- Name: directus_notifications; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_notifications (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(255) DEFAULT 'inbox'::character varying,
    recipient uuid NOT NULL,
    sender uuid,
    subject character varying(255) NOT NULL,
    message text,
    collection character varying(64),
    item character varying(255)
);


ALTER TABLE public.directus_notifications OWNER TO directus;

--
-- Name: directus_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_notifications_id_seq OWNER TO directus;

--
-- Name: directus_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_notifications_id_seq OWNED BY public.directus_notifications.id;


--
-- Name: directus_operations; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_operations (
    id uuid NOT NULL,
    name character varying(255),
    key character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    options json,
    resolve uuid,
    reject uuid,
    flow uuid NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_operations OWNER TO directus;

--
-- Name: directus_panels; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_panels (
    id uuid NOT NULL,
    dashboard uuid NOT NULL,
    name character varying(255),
    icon character varying(64) DEFAULT NULL::character varying,
    color character varying(10),
    show_header boolean DEFAULT false NOT NULL,
    note text,
    type character varying(255) NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    options json,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_panels OWNER TO directus;

--
-- Name: directus_permissions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_permissions (
    id integer NOT NULL,
    collection character varying(64) NOT NULL,
    action character varying(10) NOT NULL,
    permissions json,
    validation json,
    presets json,
    fields text,
    policy uuid NOT NULL
);


ALTER TABLE public.directus_permissions OWNER TO directus;

--
-- Name: directus_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_permissions_id_seq OWNER TO directus;

--
-- Name: directus_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_permissions_id_seq OWNED BY public.directus_permissions.id;


--
-- Name: directus_policies; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_policies (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(64) DEFAULT 'badge'::character varying NOT NULL,
    description text,
    ip_access text,
    enforce_tfa boolean DEFAULT false NOT NULL,
    admin_access boolean DEFAULT false NOT NULL,
    app_access boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_policies OWNER TO directus;

--
-- Name: directus_presets; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_presets (
    id integer NOT NULL,
    bookmark character varying(255),
    "user" uuid,
    role uuid,
    collection character varying(64),
    search character varying(100),
    layout character varying(100) DEFAULT 'tabular'::character varying,
    layout_query json,
    layout_options json,
    refresh_interval integer,
    filter json,
    icon character varying(64) DEFAULT 'bookmark'::character varying,
    color character varying(255)
);


ALTER TABLE public.directus_presets OWNER TO directus;

--
-- Name: directus_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_presets_id_seq OWNER TO directus;

--
-- Name: directus_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_presets_id_seq OWNED BY public.directus_presets.id;


--
-- Name: directus_relations; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_relations (
    id integer NOT NULL,
    many_collection character varying(64) NOT NULL,
    many_field character varying(64) NOT NULL,
    one_collection character varying(64),
    one_field character varying(64),
    one_collection_field character varying(64),
    one_allowed_collections text,
    junction_field character varying(64),
    sort_field character varying(64),
    one_deselect_action character varying(255) DEFAULT 'nullify'::character varying NOT NULL
);


ALTER TABLE public.directus_relations OWNER TO directus;

--
-- Name: directus_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_relations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_relations_id_seq OWNER TO directus;

--
-- Name: directus_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_relations_id_seq OWNED BY public.directus_relations.id;


--
-- Name: directus_revisions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_revisions (
    id integer NOT NULL,
    activity integer NOT NULL,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    data json,
    delta json,
    parent integer,
    version uuid
);


ALTER TABLE public.directus_revisions OWNER TO directus;

--
-- Name: directus_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_revisions_id_seq OWNER TO directus;

--
-- Name: directus_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_revisions_id_seq OWNED BY public.directus_revisions.id;


--
-- Name: directus_roles; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_roles (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(64) DEFAULT 'supervised_user_circle'::character varying NOT NULL,
    description text,
    parent uuid
);


ALTER TABLE public.directus_roles OWNER TO directus;

--
-- Name: directus_sessions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_sessions (
    token character varying(64) NOT NULL,
    "user" uuid,
    expires timestamp with time zone NOT NULL,
    ip character varying(255),
    user_agent text,
    share uuid,
    origin character varying(255),
    next_token character varying(64)
);


ALTER TABLE public.directus_sessions OWNER TO directus;

--
-- Name: directus_settings; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_settings (
    id integer NOT NULL,
    project_name character varying(100) DEFAULT 'Directus'::character varying NOT NULL,
    project_url character varying(255),
    project_color character varying(255) DEFAULT '#6644FF'::character varying NOT NULL,
    project_logo uuid,
    public_foreground uuid,
    public_background uuid,
    public_note text,
    auth_login_attempts integer DEFAULT 25,
    auth_password_policy character varying(100),
    storage_asset_transform character varying(7) DEFAULT 'all'::character varying,
    storage_asset_presets json,
    custom_css text,
    storage_default_folder uuid,
    basemaps json,
    mapbox_key character varying(255),
    module_bar json,
    project_descriptor character varying(100),
    default_language character varying(255) DEFAULT 'en-US'::character varying NOT NULL,
    custom_aspect_ratios json,
    public_favicon uuid,
    default_appearance character varying(255) DEFAULT 'auto'::character varying NOT NULL,
    default_theme_light character varying(255),
    theme_light_overrides json,
    default_theme_dark character varying(255),
    theme_dark_overrides json,
    report_error_url character varying(255),
    report_bug_url character varying(255),
    report_feature_url character varying(255),
    public_registration boolean DEFAULT false NOT NULL,
    public_registration_verify_email boolean DEFAULT true NOT NULL,
    public_registration_role uuid,
    public_registration_email_filter json,
    visual_editor_urls json,
    project_id uuid,
    mcp_enabled boolean DEFAULT false NOT NULL,
    mcp_allow_deletes boolean DEFAULT false NOT NULL,
    mcp_prompts_collection character varying(255) DEFAULT NULL::character varying,
    mcp_system_prompt_enabled boolean DEFAULT true NOT NULL,
    mcp_system_prompt text,
    project_owner character varying(255),
    project_usage character varying(255),
    org_name character varying(255),
    product_updates boolean,
    project_status character varying(255),
    ai_openai_api_key text,
    ai_anthropic_api_key text,
    ai_system_prompt text,
    ai_google_api_key text,
    ai_openai_compatible_api_key text,
    ai_openai_compatible_base_url text,
    ai_openai_compatible_name text,
    ai_openai_compatible_models json,
    ai_openai_compatible_headers json,
    ai_openai_allowed_models json,
    ai_anthropic_allowed_models json,
    ai_google_allowed_models json,
    collaborative_editing_enabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_settings OWNER TO directus;

--
-- Name: directus_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directus_settings_id_seq OWNER TO directus;

--
-- Name: directus_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_settings_id_seq OWNED BY public.directus_settings.id;


--
-- Name: directus_shares; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_shares (
    id uuid NOT NULL,
    name character varying(255),
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    role uuid,
    password character varying(255),
    user_created uuid,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_start timestamp with time zone,
    date_end timestamp with time zone,
    times_used integer DEFAULT 0,
    max_uses integer
);


ALTER TABLE public.directus_shares OWNER TO directus;

--
-- Name: directus_translations; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_translations (
    id uuid NOT NULL,
    language character varying(255) NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.directus_translations OWNER TO directus;

--
-- Name: directus_users; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_users (
    id uuid NOT NULL,
    first_name character varying(50),
    last_name character varying(50),
    email character varying(128),
    password character varying(255),
    location character varying(255),
    title character varying(50),
    description text,
    tags json,
    avatar uuid,
    language character varying(255) DEFAULT NULL::character varying,
    tfa_secret character varying(255),
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    role uuid,
    token character varying(255),
    last_access timestamp with time zone,
    last_page character varying(255),
    provider character varying(128) DEFAULT 'default'::character varying NOT NULL,
    external_identifier character varying(255),
    auth_data json,
    email_notifications boolean DEFAULT true,
    appearance character varying(255),
    theme_dark character varying(255),
    theme_light character varying(255),
    theme_light_overrides json,
    theme_dark_overrides json,
    text_direction character varying(255) DEFAULT 'auto'::character varying NOT NULL
);


ALTER TABLE public.directus_users OWNER TO directus;

--
-- Name: directus_versions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_versions (
    id uuid NOT NULL,
    key character varying(64) NOT NULL,
    name character varying(255),
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    hash character varying(255),
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    user_updated uuid,
    delta json
);


ALTER TABLE public.directus_versions OWNER TO directus;

--
-- Name: event_phases; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.event_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text,
    date_start date NOT NULL,
    date_end date,
    time_start time without time zone NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT event_phases_status_check CHECK ((status = ANY (ARRAY['done'::text, 'current'::text, 'upcoming'::text])))
);


ALTER TABLE public.event_phases OWNER TO directus;

--
-- Name: events; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_created uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date date,
    end_date date,
    location text,
    description text,
    contact_person jsonb,
    registration_url text,
    guidebook_url text,
    instagram_url text,
    website_url text,
    card_image_url text,
    banner_image_url text,
    is_published boolean DEFAULT false NOT NULL,
    is_registration_open boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'upcoming'::text, 'active'::text, 'finished'::text, 'cancelled'::text]))),
    CONSTRAINT events_type_check CHECK ((type = ANY (ARRAY['sport'::text, 'arts'::text])))
);


ALTER TABLE public.events OWNER TO directus;

--
-- Name: institutions; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.institutions OWNER TO directus;

--
-- Name: match_formats; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.match_formats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    match_type text NOT NULL,
    modules jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_formats_match_type_check CHECK ((match_type = ANY (ARRAY['head_to_head'::text, 'solo'::text, 'open'::text]))),
    CONSTRAINT match_formats_modules_check CHECK ((jsonb_typeof(modules) = 'array'::text))
);


ALTER TABLE public.match_formats OWNER TO directus;

--
-- Name: match_participants; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.match_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    "position" integer
);


ALTER TABLE public.match_participants OWNER TO directus;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_category_id uuid NOT NULL,
    round text,
    match_name text,
    venue text,
    scheduled_at timestamp with time zone,
    home_participant_id uuid,
    away_participant_id uuid,
    winner text,
    rankings jsonb,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    timer_secs integer DEFAULT 0,
    live_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT matches_home_away_check CHECK ((home_participant_id <> away_participant_id)),
    CONSTRAINT matches_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'finished'::text, 'cancelled'::text])))
);


ALTER TABLE public.matches OWNER TO directus;

--
-- Name: news; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    event_id uuid,
    category text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    thumbnail_url text,
    content text,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT news_category_check CHECK ((category = ANY (ARRAY['announcement'::text, 'result'::text, 'news'::text, 'update'::text])))
);


ALTER TABLE public.news OWNER TO directus;

--
-- Name: participants; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_category_id uuid NOT NULL,
    institution_id uuid,
    name text NOT NULL,
    members jsonb,
    seed integer,
    notes text DEFAULT ''::text,
    custom_logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.participants OWNER TO directus;

--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    logo_url text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sponsors OWNER TO directus;

--
-- Name: directus_activity id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_activity ALTER COLUMN id SET DEFAULT nextval('public.directus_activity_id_seq'::regclass);


--
-- Name: directus_fields id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_fields ALTER COLUMN id SET DEFAULT nextval('public.directus_fields_id_seq'::regclass);


--
-- Name: directus_notifications id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_notifications ALTER COLUMN id SET DEFAULT nextval('public.directus_notifications_id_seq'::regclass);


--
-- Name: directus_permissions id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_permissions ALTER COLUMN id SET DEFAULT nextval('public.directus_permissions_id_seq'::regclass);


--
-- Name: directus_presets id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_presets ALTER COLUMN id SET DEFAULT nextval('public.directus_presets_id_seq'::regclass);


--
-- Name: directus_relations id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_relations ALTER COLUMN id SET DEFAULT nextval('public.directus_relations_id_seq'::regclass);


--
-- Name: directus_revisions id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_revisions ALTER COLUMN id SET DEFAULT nextval('public.directus_revisions_id_seq'::regclass);


--
-- Name: directus_settings id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings ALTER COLUMN id SET DEFAULT nextval('public.directus_settings_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.activity_logs (id, event_id, user_id, action, entity, entity_id, description, created_at) FROM stdin;
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.app_settings (id, setting_key, setting_value, description, updated_at) FROM stdin;
\.


--
-- Data for Name: competition_categories; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.competition_categories (id, event_id, format_id, name, participant_type, display_order, created_at, updated_at) FROM stdin;
c2c2c2c2-c2c2-4000-b222-000000000001	e1e1e1e1-e1e1-4000-a111-000000000001	\N	Kata Perorang	individual	0	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
c2c2c2c2-c2c2-4000-b222-000000000002	e1e1e1e1-e1e1-4000-a111-000000000002	\N	Hackathon	team	0	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
c2c2c2c2-c2c2-4000-b222-000000000003	e1e1e1e1-e1e1-4000-a111-000000000003	\N	Open Marathon	individual	0	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
\.


--
-- Data for Name: directus_access; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_access (id, role, "user", policy, sort) FROM stdin;
19b357c6-b525-4cb1-8dc4-cfe5a74b04cb	b18d3bfd-2c54-46d4-99a5-13fdee6a2b21	\N	82ac3d98-ac2b-4195-b05c-f8e034a1b73e	\N
a29489ba-80b3-4eef-9ea3-5eb68ec60b25	7883c172-0f51-45d1-8abc-5eab66ef4a65	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	\N
37a30545-9f59-4431-8f99-deb46a73184d	dc42a2f7-80d7-4515-9719-8e2f77646540	\N	9c8d904e-e152-40ec-aca6-dc56b490a417	\N
682da8bc-23f9-4a0b-83b1-d98278246232	\N	\N	abf8a154-5b1c-4a46-ac9c-7300570f4f17	\N
75925e69-ab0d-4651-9f25-52269d61cb54	b18d3bfd-2c54-46d4-99a5-13fdee6a2b21	\N	abf8a154-5b1c-4a46-ac9c-7300570f4f17	\N
\.


--
-- Data for Name: directus_activity; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_activity (id, action, "user", "timestamp", ip, user_agent, collection, item, origin) FROM stdin;
1	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:20:23.346+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
2	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:21:57.415+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	matches	http://localhost:8055
3	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:22:26.41+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	matches	http://localhost:8055
4	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:22:44.57+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	activity_logs	http://localhost:8055
5	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:22:50.113+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	activity_logs	http://localhost:8055
6	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:22:55.54+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	app_settings	http://localhost:8055
7	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:05.627+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	competition_categories	http://localhost:8055
8	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:11.204+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	event_phases	http://localhost:8055
9	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:12.837+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	events	http://localhost:8055
10	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:14.573+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	institutions	http://localhost:8055
11	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:17.807+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	match_formats	http://localhost:8055
12	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:19.377+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	news	http://localhost:8055
13	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-17 17:23:21.007+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	participants	http://localhost:8055
14	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:39:02.624+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	sponsors	http://localhost:8055
15	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:39:23.78+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	sponsors	http://localhost:8055
16	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.418+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	159545f9-8540-4539-894f-9059b7706266	http://localhost:8055
17	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.484+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	1	http://localhost:8055
18	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.488+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	2	http://localhost:8055
19	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.493+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	3	http://localhost:8055
20	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.497+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	4	http://localhost:8055
21	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.501+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	5	http://localhost:8055
22	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.505+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	6	http://localhost:8055
23	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.51+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	7	http://localhost:8055
24	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.514+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	8	http://localhost:8055
25	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.52+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	9	http://localhost:8055
26	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.525+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	10	http://localhost:8055
27	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.529+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	11	http://localhost:8055
28	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.538+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	12	http://localhost:8055
29	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.542+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	13	http://localhost:8055
30	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.546+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	14	http://localhost:8055
31	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.549+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	15	http://localhost:8055
32	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.553+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	16	http://localhost:8055
33	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.556+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	17	http://localhost:8055
34	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.565+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	18	http://localhost:8055
35	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.569+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	19	http://localhost:8055
36	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:42:11.573+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	20	http://localhost:8055
37	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.455+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	21	http://localhost:8055
38	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.468+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	22	http://localhost:8055
39	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.471+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	23	http://localhost:8055
40	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.475+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	24	http://localhost:8055
41	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.48+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	25	http://localhost:8055
42	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:12.485+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	159545f9-8540-4539-894f-9059b7706266	http://localhost:8055
43	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 05:58:20.998+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	1	http://localhost:8055
44	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:01:02.414+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	1	http://localhost:8055
45	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:02:40.719+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	159545f9-8540-4539-894f-9059b7706266	http://localhost:8055
46	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:25:09.847+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	26	http://localhost:8055
47	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:25:09.854+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	159545f9-8540-4539-894f-9059b7706266	http://localhost:8055
48	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:27:24.053+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	159545f9-8540-4539-894f-9059b7706266	http://localhost:8055
49	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:28:01.258+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_roles	7883c172-0f51-45d1-8abc-5eab66ef4a65	http://localhost:8055
50	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.062+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	cadd0733-b4f4-4418-9734-d2890a90281c	http://localhost:8055
51	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.14+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	27	http://localhost:8055
52	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.145+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	28	http://localhost:8055
53	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.149+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	29	http://localhost:8055
54	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.152+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	30	http://localhost:8055
55	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.156+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	31	http://localhost:8055
56	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.163+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	32	http://localhost:8055
57	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.167+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	33	http://localhost:8055
58	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.174+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	34	http://localhost:8055
59	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.178+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	35	http://localhost:8055
60	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.182+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	36	http://localhost:8055
61	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.187+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	37	http://localhost:8055
62	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.191+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	38	http://localhost:8055
63	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.196+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	39	http://localhost:8055
64	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.2+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	40	http://localhost:8055
65	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.204+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	41	http://localhost:8055
66	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.207+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	42	http://localhost:8055
67	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.211+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	43	http://localhost:8055
68	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.215+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	44	http://localhost:8055
69	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.22+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	45	http://localhost:8055
70	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:30:31.224+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	46	http://localhost:8055
71	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:05.714+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	cadd0733-b4f4-4418-9734-d2890a90281c	http://localhost:8055
72	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.568+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	4a4c5001-37b7-41ce-8420-4886b1f09d01	http://localhost:8055
73	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.646+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	47	http://localhost:8055
74	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.655+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	48	http://localhost:8055
75	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.662+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	49	http://localhost:8055
76	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.668+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	50	http://localhost:8055
77	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.675+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	51	http://localhost:8055
78	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.68+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	52	http://localhost:8055
79	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.686+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	53	http://localhost:8055
80	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.692+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	54	http://localhost:8055
81	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.697+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	55	http://localhost:8055
82	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.702+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	56	http://localhost:8055
83	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.706+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	57	http://localhost:8055
84	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.709+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	58	http://localhost:8055
85	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.713+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	59	http://localhost:8055
86	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.717+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	60	http://localhost:8055
87	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.723+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	61	http://localhost:8055
88	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.732+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	62	http://localhost:8055
89	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.736+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	63	http://localhost:8055
90	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.741+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	64	http://localhost:8055
91	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.745+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	65	http://localhost:8055
92	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 06:32:21.749+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	66	http://localhost:8055
93	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:23:09.108+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	http://localhost:8055
94	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:24:08.915+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	4a4c5001-37b7-41ce-8420-4886b1f09d01	http://localhost:8055
127	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:58:26.883+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	1	http://localhost:8055
95	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.725+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
96	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.774+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	67	http://localhost:8055
97	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.779+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	68	http://localhost:8055
98	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.783+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	69	http://localhost:8055
99	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.786+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	70	http://localhost:8055
100	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.789+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	71	http://localhost:8055
101	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.792+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	72	http://localhost:8055
102	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.795+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	73	http://localhost:8055
103	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.799+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	74	http://localhost:8055
104	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.803+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	75	http://localhost:8055
105	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.806+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	76	http://localhost:8055
106	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.809+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	77	http://localhost:8055
107	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.813+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	78	http://localhost:8055
108	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.817+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	79	http://localhost:8055
109	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.82+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	80	http://localhost:8055
110	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.823+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	81	http://localhost:8055
111	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.826+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	82	http://localhost:8055
112	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.832+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	83	http://localhost:8055
113	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.837+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	84	http://localhost:8055
114	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.841+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	85	http://localhost:8055
115	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:26:40.846+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	86	http://localhost:8055
116	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.395+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	87	http://localhost:8055
117	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.41+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	88	http://localhost:8055
118	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.413+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	89	http://localhost:8055
119	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.417+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	90	http://localhost:8055
120	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.42+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	91	http://localhost:8055
121	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.424+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	92	http://localhost:8055
122	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.428+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	93	http://localhost:8055
123	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.44+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	a29489ba-80b3-4eef-9ea3-5eb68ec60b25	http://localhost:8055
124	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:41:55.443+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
125	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:43:07.38+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	2	http://localhost:8055
126	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 07:45:39.164+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	3	http://localhost:8055
128	logout	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:18:35.227+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
129	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:18:37.105+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
130	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:20:17.39+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	1	http://localhost:8055
131	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:20:25.569+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	1	http://localhost:8055
132	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:21:42.112+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	94	http://localhost:8055
133	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:21:42.127+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	95	http://localhost:8055
134	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:21:42.134+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	96	http://localhost:8055
135	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:21:42.14+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
136	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:22:05.374+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	94	http://localhost:8055
137	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:22:05.378+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	95	http://localhost:8055
138	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:22:05.38+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	96	http://localhost:8055
139	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:22:05.383+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
140	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:36:39.801+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	events	http://localhost:8055
141	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:37:03.844+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	4	http://localhost:8055
142	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:37:53.588+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	5	http://localhost:8055
143	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:00.205+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	6	http://localhost:8055
144	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:02.204+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	7	http://localhost:8055
145	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:05.578+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	8	http://localhost:8055
146	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:07.968+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	9	http://localhost:8055
147	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:09.648+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	10	http://localhost:8055
148	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:11.274+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	11	http://localhost:8055
149	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:12.948+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	12	http://localhost:8055
150	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:15.917+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	13	http://localhost:8055
151	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:17.955+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	14	http://localhost:8055
152	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:19.68+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	15	http://localhost:8055
153	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:21.217+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	16	http://localhost:8055
154	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:22.936+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	17	http://localhost:8055
155	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:25.035+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	18	http://localhost:8055
156	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:26.828+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	19	http://localhost:8055
157	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:28.48+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	20	http://localhost:8055
158	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:30.491+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	21	http://localhost:8055
159	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:32.568+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	22	http://localhost:8055
160	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:38:34.301+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	23	http://localhost:8055
161	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:39:50.958+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	24	http://localhost:8055
162	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:39:53.639+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	25	http://localhost:8055
163	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:40:02.817+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	26	http://localhost:8055
164	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:40:04.287+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	27	http://localhost:8055
165	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:40:05.713+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	28	http://localhost:8055
166	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 08:40:07.369+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	29	http://localhost:8055
167	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:19:09.918+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	97	http://localhost:8055
168	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:19:09.933+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	98	http://localhost:8055
169	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:19:09.94+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	91	http://localhost:8055
170	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:19:09.945+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
171	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:22:02.622+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	99	http://localhost:8055
172	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:22:02.635+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	91	http://localhost:8055
173	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:22:02.639+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
174	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:55:01.209+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	97	http://localhost:8055
175	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:55:01.222+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
176	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 10:58:58.799+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	events	http://localhost:8055
177	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:00:02.993+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	99	http://localhost:8055
178	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:00:02.997+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	http://localhost:8055
179	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:29:35.388+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	http://localhost:8055
180	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:31:09.108+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	9c8d904e-e152-40ec-aca6-dc56b490a417	http://localhost:8055
181	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:31:20.719+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	37a30545-9f59-4431-8f99-deb46a73184d	http://localhost:8055
182	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:31:20.723+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	9c8d904e-e152-40ec-aca6-dc56b490a417	http://localhost:8055
183	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:33:05.072+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_settings	1	http://localhost:8055
184	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:33:44.984+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_settings	1	http://localhost:8055
185	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 11:33:49.268+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_settings	1	http://localhost:8055
186	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 12:18:19.718+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_roles	7883c172-0f51-45d1-8abc-5eab66ef4a65	http://localhost:8055
187	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-18 12:18:33.444+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	http://localhost:8055
188	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:24:34.914+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
189	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:24:52.976+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_collections	match_participants	http://localhost:8055
190	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:24:54.848+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	30	http://localhost:8055
191	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:25:15.679+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	30	http://localhost:8055
192	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:25:37.816+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	31	http://localhost:8055
193	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:28:00.971+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	31	http://localhost:8055
194	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:28:02.374+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	32	http://localhost:8055
195	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 11:28:04.905+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_fields	33	http://localhost:8055
196	logout	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 12:06:56.81+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
197	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-22 12:06:59.58+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
198	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 11:43:00.677+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
199	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 11:43:59.237+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	76fc6224-3867-4e7d-bf20-7030dc05f133	http://localhost:8055
200	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 11:43:59.244+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	4adf5b80-fd07-4d70-bf9e-cd36312027a0	http://localhost:8055
201	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 11:58:05.165+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	682da8bc-23f9-4a0b-83b1-d98278246232	http://localhost:8055
202	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:00:08.403+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	75925e69-ab0d-4651-9f25-52269d61cb54	http://localhost:8055
203	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:00:08.411+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	abf8a154-5b1c-4a46-ac9c-7300570f4f17	http://localhost:8055
204	delete	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:00:17.913+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_access	76fc6224-3867-4e7d-bf20-7030dc05f133	http://localhost:8055
205	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.244+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	128	http://localhost:8055
206	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.254+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	129	http://localhost:8055
207	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.257+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	130	http://localhost:8055
208	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.262+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	131	http://localhost:8055
209	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.265+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	132	http://localhost:8055
210	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.269+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	133	http://localhost:8055
211	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.271+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	134	http://localhost:8055
212	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.276+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	135	http://localhost:8055
213	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.279+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	136	http://localhost:8055
214	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.282+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	137	http://localhost:8055
215	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.285+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	138	http://localhost:8055
216	create	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.287+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	139	http://localhost:8055
217	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 12:11:23.291+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	abf8a154-5b1c-4a46-ac9c-7300570f4f17	http://localhost:8055
218	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 13:08:45.739+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_permissions	131	http://localhost:8055
219	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-24 13:08:45.753+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	directus_policies	abf8a154-5b1c-4a46-ac9c-7300570f4f17	http://localhost:8055
220	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-25 13:27:39.412+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.112.0 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
221	update	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-25 13:28:32.097+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.112.0 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36	directus_settings	1	http://localhost:8055
222	login	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-27 13:15:57.96+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.112.0 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36	directus_users	f1ae03a9-c7a2-480b-a2af-cdba203a5636	http://localhost:8055
\.


--
-- Data for Name: directus_collections; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_collections (collection, icon, note, display_template, hidden, singleton, translations, archive_field, archive_app_filter, archive_value, unarchive_value, sort_field, accountability, color, item_duplication_fields, sort, "group", collapse, preview_url, versioning) FROM stdin;
matches	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	open	\N	f
activity_logs	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	open	\N	f
app_settings	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
competition_categories	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
event_phases	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
institutions	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
match_formats	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
news	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
participants	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
sponsors	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	open	\N	f
events	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	\N	\N	[]	\N	\N	open	\N	f
match_participants	\N	\N	\N	f	f	\N	\N	t	\N	\N	\N	all	\N	\N	\N	\N	open	\N	f
\.


--
-- Data for Name: directus_comments; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_comments (id, collection, item, comment, date_created, date_updated, user_created, user_updated) FROM stdin;
\.


--
-- Data for Name: directus_dashboards; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_dashboards (id, name, icon, note, date_created, user_created, color) FROM stdin;
\.


--
-- Data for Name: directus_deployment_projects; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_deployment_projects (id, deployment, external_id, name, date_created, user_created, url, framework, deployable) FROM stdin;
\.


--
-- Data for Name: directus_deployment_runs; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_deployment_runs (id, project, external_id, target, date_created, user_created, status, url, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: directus_deployments; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_deployments (id, provider, credentials, options, date_created, user_created, webhook_ids, webhook_secret, last_synced_at) FROM stdin;
\.


--
-- Data for Name: directus_extensions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_extensions (enabled, id, folder, source, bundle) FROM stdin;
\.


--
-- Data for Name: directus_fields; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_fields (id, collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message, searchable) FROM stdin;
2	events	user_created	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
3	competition_categories	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
1	competition_categories	event_id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
4	events	name	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
5	events	updated_at	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
6	events	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
7	events	slug	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
8	events	status	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
9	events	type	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
10	events	start_date	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
11	events	end_date	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
12	events	location	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
13	events	description	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
14	events	contact_person	cast-json	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
15	events	registration_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
16	events	guidebook_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
17	events	instagram_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
18	events	card_image_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
19	events	website_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
20	events	banner_image_url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
21	events	is_published	cast-boolean	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
22	events	is_registration_open	cast-boolean	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
23	events	created_at	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
24	competition_categories	format_id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
25	competition_categories	participant_type	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
26	competition_categories	name	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
27	competition_categories	display_order	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
28	competition_categories	created_at	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
29	competition_categories	updated_at	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
30	match_participants	match_id	uuid	select-dropdown-m2o	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
31	match_participants	participant_id	uuid	select-dropdown-m2o	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
32	match_participants	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
33	match_participants	position	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N	t
\.


--
-- Data for Name: directus_files; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_files (id, storage, filename_disk, filename_download, title, type, folder, uploaded_by, created_on, modified_by, modified_on, charset, filesize, width, height, duration, embed, description, location, tags, metadata, focal_point_x, focal_point_y, tus_id, tus_data, uploaded_on) FROM stdin;
\.


--
-- Data for Name: directus_flows; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_flows (id, name, icon, color, description, status, trigger, accountability, options, operation, date_created, user_created) FROM stdin;
\.


--
-- Data for Name: directus_folders; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_folders (id, name, parent) FROM stdin;
\.


--
-- Data for Name: directus_migrations; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_migrations (version, name, "timestamp") FROM stdin;
20201028A	Remove Collection Foreign Keys	2026-03-17 17:03:59.835972+00
20201029A	Remove System Relations	2026-03-17 17:03:59.848853+00
20201029B	Remove System Collections	2026-03-17 17:03:59.861791+00
20201029C	Remove System Fields	2026-03-17 17:03:59.875917+00
20201105A	Add Cascade System Relations	2026-03-17 17:03:59.995088+00
20201105B	Change Webhook URL Type	2026-03-17 17:04:00.008448+00
20210225A	Add Relations Sort Field	2026-03-17 17:04:00.022424+00
20210304A	Remove Locked Fields	2026-03-17 17:04:00.030851+00
20210312A	Webhooks Collections Text	2026-03-17 17:04:00.044401+00
20210331A	Add Refresh Interval	2026-03-17 17:04:00.051151+00
20210415A	Make Filesize Nullable	2026-03-17 17:04:00.066421+00
20210416A	Add Collections Accountability	2026-03-17 17:04:00.076173+00
20210422A	Remove Files Interface	2026-03-17 17:04:00.081786+00
20210506A	Rename Interfaces	2026-03-17 17:04:00.108971+00
20210510A	Restructure Relations	2026-03-17 17:04:00.141302+00
20210518A	Add Foreign Key Constraints	2026-03-17 17:04:00.159274+00
20210519A	Add System Fk Triggers	2026-03-17 17:04:00.22036+00
20210521A	Add Collections Icon Color	2026-03-17 17:04:00.227233+00
20210525A	Add Insights	2026-03-17 17:04:00.3051+00
20210608A	Add Deep Clone Config	2026-03-17 17:04:00.312246+00
20210626A	Change Filesize Bigint	2026-03-17 17:04:00.360135+00
20210716A	Add Conditions to Fields	2026-03-17 17:04:00.366639+00
20210721A	Add Default Folder	2026-03-17 17:04:00.378509+00
20210802A	Replace Groups	2026-03-17 17:04:00.385982+00
20210803A	Add Required to Fields	2026-03-17 17:04:00.393095+00
20210805A	Update Groups	2026-03-17 17:04:00.399687+00
20210805B	Change Image Metadata Structure	2026-03-17 17:04:00.407071+00
20210811A	Add Geometry Config	2026-03-17 17:04:00.413316+00
20210831A	Remove Limit Column	2026-03-17 17:04:00.419948+00
20210903A	Add Auth Provider	2026-03-17 17:04:00.459988+00
20210907A	Webhooks Collections Not Null	2026-03-17 17:04:00.473902+00
20210910A	Move Module Setup	2026-03-17 17:04:00.482996+00
20210920A	Webhooks URL Not Null	2026-03-17 17:04:00.49735+00
20210924A	Add Collection Organization	2026-03-17 17:04:00.507648+00
20210927A	Replace Fields Group	2026-03-17 17:04:00.522581+00
20210927B	Replace M2M Interface	2026-03-17 17:04:00.527096+00
20210929A	Rename Login Action	2026-03-17 17:04:00.531754+00
20211007A	Update Presets	2026-03-17 17:04:00.542822+00
20211009A	Add Auth Data	2026-03-17 17:04:00.548014+00
20211016A	Add Webhook Headers	2026-03-17 17:04:00.553801+00
20211103A	Set Unique to User Token	2026-03-17 17:04:00.565541+00
20211103B	Update Special Geometry	2026-03-17 17:04:00.570984+00
20211104A	Remove Collections Listing	2026-03-17 17:04:00.576986+00
20211118A	Add Notifications	2026-03-17 17:04:00.6276+00
20211211A	Add Shares	2026-03-17 17:04:00.68888+00
20211230A	Add Project Descriptor	2026-03-17 17:04:00.695759+00
20220303A	Remove Default Project Color	2026-03-17 17:04:00.709663+00
20220308A	Add Bookmark Icon and Color	2026-03-17 17:04:00.715209+00
20220314A	Add Translation Strings	2026-03-17 17:04:00.720832+00
20220322A	Rename Field Typecast Flags	2026-03-17 17:04:00.726116+00
20220323A	Add Field Validation	2026-03-17 17:04:00.732673+00
20220325A	Fix Typecast Flags	2026-03-17 17:04:00.739195+00
20220325B	Add Default Language	2026-03-17 17:04:00.753654+00
20220402A	Remove Default Value Panel Icon	2026-03-17 17:04:00.766124+00
20220429A	Add Flows	2026-03-17 17:04:00.892191+00
20220429B	Add Color to Insights Icon	2026-03-17 17:04:00.898264+00
20220429C	Drop Non Null From IP of Activity	2026-03-17 17:04:00.904762+00
20220429D	Drop Non Null From Sender of Notifications	2026-03-17 17:04:00.911192+00
20220614A	Rename Hook Trigger to Event	2026-03-17 17:04:00.916249+00
20220801A	Update Notifications Timestamp Column	2026-03-17 17:04:00.931682+00
20220802A	Add Custom Aspect Ratios	2026-03-17 17:04:00.937604+00
20220826A	Add Origin to Accountability	2026-03-17 17:04:00.946664+00
20230401A	Update Material Icons	2026-03-17 17:04:00.961973+00
20230525A	Add Preview Settings	2026-03-17 17:04:00.968984+00
20230526A	Migrate Translation Strings	2026-03-17 17:04:00.999563+00
20230721A	Require Shares Fields	2026-03-17 17:04:01.014906+00
20230823A	Add Content Versioning	2026-03-17 17:04:01.074576+00
20230927A	Themes	2026-03-17 17:04:01.114174+00
20231009A	Update CSV Fields to Text	2026-03-17 17:04:01.125383+00
20231009B	Update Panel Options	2026-03-17 17:04:01.132201+00
20231010A	Add Extensions	2026-03-17 17:04:01.146792+00
20231215A	Add Focalpoints	2026-03-17 17:04:01.153313+00
20240122A	Add Report URL Fields	2026-03-17 17:04:01.159288+00
20240204A	Marketplace	2026-03-17 17:04:01.229026+00
20240305A	Change Useragent Type	2026-03-17 17:04:01.246273+00
20240311A	Deprecate Webhooks	2026-03-17 17:04:01.260858+00
20240422A	Public Registration	2026-03-17 17:04:01.27148+00
20240515A	Add Session Window	2026-03-17 17:04:01.277949+00
20240701A	Add Tus Data	2026-03-17 17:04:01.284638+00
20240716A	Update Files Date Fields	2026-03-17 17:04:01.304391+00
20240806A	Permissions Policies	2026-03-17 17:04:01.431742+00
20240817A	Update Icon Fields Length	2026-03-17 17:04:01.496741+00
20240909A	Separate Comments	2026-03-17 17:04:01.541513+00
20240909B	Consolidate Content Versioning	2026-03-17 17:04:01.548785+00
20240924A	Migrate Legacy Comments	2026-03-17 17:04:01.560153+00
20240924B	Populate Versioning Deltas	2026-03-17 17:04:01.566724+00
20250224A	Visual Editor	2026-03-17 17:04:01.574905+00
20250609A	License Banner	2026-03-17 17:04:01.582811+00
20250613A	Add Project ID	2026-03-17 17:04:01.607956+00
20250718A	Add Direction	2026-03-17 17:04:01.614664+00
20250813A	Add MCP	2026-03-17 17:04:01.623426+00
20251012A	Add Field Searchable	2026-03-17 17:04:01.630175+00
20251014A	Add Project Owner	2026-03-17 17:04:01.843616+00
20251028A	Add Retention Indexes	2026-03-17 17:04:01.973967+00
20251103A	Add AI Settings	2026-03-17 17:04:01.980443+00
20251224A	Remove Webhooks	2026-03-17 17:04:01.997828+00
20260110A	Add AI Provider Settings	2026-03-17 17:04:02.019136+00
20260113A	Add Revisions Index	2026-03-17 17:04:02.054968+00
20260128A	Add Collaborative Editing	2026-03-17 17:04:02.062807+00
20260204A	Add Deployment	2026-03-17 17:04:02.226221+00
20260211A	Add Deployment Webhooks	2026-03-17 17:04:02.240151+00
\.


--
-- Data for Name: directus_notifications; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_notifications (id, "timestamp", status, recipient, sender, subject, message, collection, item) FROM stdin;
\.


--
-- Data for Name: directus_operations; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_operations (id, name, key, type, position_x, position_y, options, resolve, reject, flow, date_created, user_created) FROM stdin;
\.


--
-- Data for Name: directus_panels; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options, date_created, user_created) FROM stdin;
\.


--
-- Data for Name: directus_permissions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_permissions (id, collection, action, permissions, validation, presets, fields, policy) FROM stdin;
67	directus_collections	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
68	directus_fields	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
69	directus_relations	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
70	directus_translations	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
71	directus_activity	read	{"user":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
72	directus_comments	read	{"user_created":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
73	directus_comments	create	{}	{"comment":{"_nnull":true}}	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
74	directus_comments	update	{"user_created":{"_eq":"$CURRENT_USER"}}	\N	\N	comment	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
75	directus_comments	delete	{"user_created":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
76	directus_presets	read	{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
77	directus_presets	create	{}	{"user":{"_eq":"$CURRENT_USER"}}	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
78	directus_presets	update	{"user":{"_eq":"$CURRENT_USER"}}	{"user":{"_eq":"$CURRENT_USER"}}	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
79	directus_presets	delete	{"user":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
80	directus_roles	read	{"id":{"_in":"$CURRENT_ROLES"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
81	directus_settings	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
82	directus_translations	read	{}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
83	directus_notifications	read	{"recipient":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
84	directus_notifications	update	{"recipient":{"_eq":"$CURRENT_USER"}}	\N	\N	status	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
85	directus_shares	read	{"user_created":{"_eq":"$CURRENT_USER"}}	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
86	directus_users	read	{"id":{"_eq":"$CURRENT_USER"}}	\N	\N	id,first_name,last_name,last_page,email,password,location,title,description,tags,provider,preferences_divider,avatar,language,appearance,theme_light,theme_dark,tfa_secret,status,role	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
87	events	create	\N	\N	\N	*	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
92	events	update	{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]}	\N	\N	id,user_created,name,slug,type,status,start_date,end_date,location,description,contact_person,registration_url,guidebook_url,instagram_url,website_url,card_image_url,banner_image_url,is_published,is_registration_open,created_at,updated_at	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
93	events	delete	{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
120	match_participants	create	{}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
91	events	read	{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]}	\N	\N	user_created,name,slug,type,status,end_date,location,start_date,description,contact_person,registration_url,guidebook_url,instagram_url,website_url,card_image_url,banner_image_url,is_published,is_registration_open,created_at,updated_at,id	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
121	match_participants	read	{"match_id":{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
100	competition_categories	create	{}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
101	competition_categories	read	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
102	competition_categories	update	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
103	competition_categories	delete	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
104	match_formats	create	{}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
105	match_formats	read	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
106	match_formats	update	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
107	match_formats	delete	{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
108	participants	create	{}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
109	participants	read	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
110	participants	update	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
111	participants	delete	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
112	matches	create	{}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
113	matches	read	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
114	matches	update	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
115	matches	delete	{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
116	news	create	{}	{"author_id":{"_eq":"$CURRENT_USER"}}	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
117	news	read	{"author_id":{"_eq":"$CURRENT_USER"}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
118	news	update	{"author_id":{"_eq":"$CURRENT_USER"}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
119	news	delete	{"author_id":{"_eq":"$CURRENT_USER"}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
122	match_participants	update	{"match_id":{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
123	match_participants	delete	{"match_id":{"competition_category_id":{"event_id":{"user_created":{"_eq":"$CURRENT_USER"}}}}}	\N	\N	\N	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906
128	app_settings	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
129	competition_categories	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
130	event_phases	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
132	institutions	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
133	match_formats	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
134	match_participants	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
135	matches	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
136	news	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
137	participants	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
138	sponsors	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
139	directus_collections	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
131	events	read	\N	\N	\N	*	abf8a154-5b1c-4a46-ac9c-7300570f4f17
\.


--
-- Data for Name: directus_policies; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_policies (id, name, icon, description, ip_access, enforce_tfa, admin_access, app_access) FROM stdin;
abf8a154-5b1c-4a46-ac9c-7300570f4f17	$t:public_label	public	$t:public_description	\N	f	f	f
82ac3d98-ac2b-4195-b05c-f8e034a1b73e	Administrator	verified	$t:admin_description	\N	f	t	t
1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	Akses PJ Ormawa	badge	\N	\N	f	f	t
9c8d904e-e152-40ec-aca6-dc56b490a417	Akses SuperAdmin	badge	\N	\N	f	t	t
\.


--
-- Data for Name: directus_presets; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_presets (id, bookmark, "user", role, collection, search, layout, layout_query, layout_options, refresh_interval, filter, icon, color) FROM stdin;
1	\N	f1ae03a9-c7a2-480b-a2af-cdba203a5636	\N	directus_users	\N	cards	{"cards":{"sort":["email"],"page":1}}	{"cards":{"icon":"account_circle","title":"{{ first_name }} {{ last_name }}","subtitle":"{{ email }}","size":4}}	\N	\N	bookmark	\N
\.


--
-- Data for Name: directus_relations; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_relations (id, many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action) FROM stdin;
\.


--
-- Data for Name: directus_revisions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_revisions (id, activity, collection, item, data, delta, parent, version) FROM stdin;
1	2	directus_collections	matches	{"collection":"matches"}	{"collection":"matches"}	\N	\N
2	3	directus_collections	matches	{"collection":"matches","icon":null,"note":null,"display_template":null,"hidden":false,"singleton":false,"translations":null,"archive_field":null,"archive_app_filter":true,"archive_value":null,"unarchive_value":null,"sort_field":null,"accountability":null,"color":null,"item_duplication_fields":null,"sort":null,"group":null,"collapse":"open","preview_url":null,"versioning":false}	{"accountability":null}	\N	\N
3	4	directus_collections	activity_logs	{"collection":"activity_logs"}	{"collection":"activity_logs"}	\N	\N
4	5	directus_collections	activity_logs	{"collection":"activity_logs","icon":null,"note":null,"display_template":null,"hidden":false,"singleton":false,"translations":null,"archive_field":null,"archive_app_filter":true,"archive_value":null,"unarchive_value":null,"sort_field":null,"accountability":null,"color":null,"item_duplication_fields":null,"sort":null,"group":null,"collapse":"open","preview_url":null,"versioning":false}	{"accountability":null}	\N	\N
5	6	directus_collections	app_settings	{"collection":"app_settings"}	{"collection":"app_settings"}	\N	\N
6	7	directus_collections	competition_categories	{"collection":"competition_categories"}	{"collection":"competition_categories"}	\N	\N
7	8	directus_collections	event_phases	{"collection":"event_phases"}	{"collection":"event_phases"}	\N	\N
8	9	directus_collections	events	{"collection":"events"}	{"collection":"events"}	\N	\N
9	10	directus_collections	institutions	{"collection":"institutions"}	{"collection":"institutions"}	\N	\N
10	11	directus_collections	match_formats	{"collection":"match_formats"}	{"collection":"match_formats"}	\N	\N
11	12	directus_collections	news	{"collection":"news"}	{"collection":"news"}	\N	\N
12	13	directus_collections	participants	{"collection":"participants"}	{"collection":"participants"}	\N	\N
13	14	directus_collections	sponsors	{"collection":"sponsors"}	{"collection":"sponsors"}	\N	\N
14	15	directus_collections	sponsors	{"collection":"sponsors","icon":null,"note":null,"display_template":null,"hidden":false,"singleton":false,"translations":null,"archive_field":null,"archive_app_filter":true,"archive_value":null,"unarchive_value":null,"sort_field":null,"accountability":null,"color":null,"item_duplication_fields":null,"sort":null,"group":null,"collapse":"open","preview_url":null,"versioning":false}	{"accountability":null}	\N	\N
15	16	directus_policies	159545f9-8540-4539-894f-9059b7706266	{"name":"PJ Ormawa","admin_access":false,"app_access":true}	{"name":"PJ Ormawa","admin_access":false,"app_access":true}	\N	\N
16	17	directus_permissions	1	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	\N	\N
17	18	directus_permissions	2	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	\N	\N
18	19	directus_permissions	3	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	\N	\N
19	20	directus_permissions	4	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
20	21	directus_permissions	5	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	\N	\N
21	22	directus_permissions	6	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	\N	\N
22	23	directus_permissions	7	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	\N	\N
23	24	directus_permissions	8	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	\N	\N
24	25	directus_permissions	9	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	\N	\N
25	26	directus_permissions	10	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	\N	\N
26	27	directus_permissions	11	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	\N	\N
27	28	directus_permissions	12	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	\N	\N
28	29	directus_permissions	13	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	\N	\N
29	30	directus_permissions	14	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	\N	\N
30	31	directus_permissions	15	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	\N	\N
31	32	directus_permissions	16	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
32	33	directus_permissions	17	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	\N	\N
33	34	directus_permissions	18	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	\N	\N
34	35	directus_permissions	19	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	\N	\N
35	36	directus_permissions	20	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	\N	\N
36	37	directus_permissions	21	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"create"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"create"}	\N	\N
37	38	directus_permissions	22	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"delete"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"delete"}	\N	\N
38	39	directus_permissions	23	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"read"}	\N	\N
56	60	directus_permissions	36	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	\N	\N
39	40	directus_permissions	24	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"update"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"update"}	\N	\N
40	41	directus_permissions	25	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"create"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"create"}	\N	\N
41	43	directus_fields	1	{"special":["uuid"],"collection":"competition_categories","field":"event_id"}	{"special":["uuid"],"collection":"competition_categories","field":"event_id"}	\N	\N
42	44	directus_fields	1	{"id":1,"collection":"competition_categories","field":"event_id","special":["uuid"],"interface":"select-dropdown-m2o","options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"competition_categories","field":"event_id","interface":"select-dropdown-m2o"}	\N	\N
43	45	directus_policies	159545f9-8540-4539-894f-9059b7706266	{"id":"159545f9-8540-4539-894f-9059b7706266","name":"PJ Ormawa","icon":"account_circle","description":null,"ip_access":null,"enforce_tfa":false,"admin_access":false,"app_access":true,"permissions":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],"users":[],"roles":[]}	{"icon":"account_circle"}	\N	\N
44	46	directus_permissions	26	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"id":{"_eq":null}}]},"validation":null,"fields":null,"presets":null,"collection":"competition_categories","action":"read"}	{"policy":"159545f9-8540-4539-894f-9059b7706266","permissions":{"_and":[{"id":{"_eq":null}}]},"validation":null,"fields":null,"presets":null,"collection":"competition_categories","action":"read"}	\N	\N
45	49	directus_roles	7883c172-0f51-45d1-8abc-5eab66ef4a65	{"name":"PJ Ormawa"}	{"name":"PJ Ormawa"}	\N	\N
46	50	directus_policies	cadd0733-b4f4-4418-9734-d2890a90281c	{"name":"Policy For PJ ","admin_access":false,"app_access":true}	{"name":"Policy For PJ ","admin_access":false,"app_access":true}	\N	\N
47	51	directus_permissions	27	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	\N	\N
48	52	directus_permissions	28	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	\N	\N
49	53	directus_permissions	29	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	\N	\N
50	54	directus_permissions	30	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
51	55	directus_permissions	31	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	\N	\N
52	56	directus_permissions	32	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	\N	\N
53	57	directus_permissions	33	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	\N	\N
54	58	directus_permissions	34	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	\N	\N
55	59	directus_permissions	35	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	\N	\N
57	61	directus_permissions	37	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	\N	\N
58	62	directus_permissions	38	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	\N	\N
59	63	directus_permissions	39	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	\N	\N
60	64	directus_permissions	40	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	\N	\N
61	65	directus_permissions	41	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	\N	\N
62	66	directus_permissions	42	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
63	67	directus_permissions	43	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	\N	\N
64	68	directus_permissions	44	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	\N	\N
65	69	directus_permissions	45	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	\N	\N
66	70	directus_permissions	46	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	{"policy":"cadd0733-b4f4-4418-9734-d2890a90281c","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	\N	\N
67	72	directus_policies	4a4c5001-37b7-41ce-8420-4886b1f09d01	{"name":"Policy Ormawa","admin_access":false,"app_access":true}	{"name":"Policy Ormawa","admin_access":false,"app_access":true}	\N	\N
68	73	directus_permissions	47	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	\N	\N
69	74	directus_permissions	48	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	\N	\N
70	75	directus_permissions	49	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	\N	\N
71	76	directus_permissions	50	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
72	77	directus_permissions	51	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	\N	\N
73	78	directus_permissions	52	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	\N	\N
180	207	directus_permissions	130	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"event_phases","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"event_phases","action":"read"}	\N	\N
74	79	directus_permissions	53	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	\N	\N
75	80	directus_permissions	54	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	\N	\N
76	81	directus_permissions	55	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	\N	\N
77	82	directus_permissions	56	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	\N	\N
78	83	directus_permissions	57	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	\N	\N
79	84	directus_permissions	58	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	\N	\N
80	85	directus_permissions	59	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	\N	\N
81	86	directus_permissions	60	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	\N	\N
82	87	directus_permissions	61	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	\N	\N
83	88	directus_permissions	62	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
84	89	directus_permissions	63	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	\N	\N
85	90	directus_permissions	64	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	\N	\N
86	91	directus_permissions	65	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	\N	\N
87	92	directus_permissions	66	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	{"policy":"4a4c5001-37b7-41ce-8420-4886b1f09d01","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	\N	\N
88	93	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	{"name":"Superadmin"}	{"name":"Superadmin"}	\N	\N
89	95	directus_policies	1990d9a8-6e77-4fd7-9d79-d6d2b25e9906	{"name":"Akses PJ Ormawa","admin_access":false,"app_access":true}	{"name":"Akses PJ Ormawa","admin_access":false,"app_access":true}	\N	\N
90	96	directus_permissions	67	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_collections","action":"read"}	\N	\N
91	97	directus_permissions	68	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_fields","action":"read"}	\N	\N
92	98	directus_permissions	69	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_relations","action":"read"}	\N	\N
93	99	directus_permissions	70	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
94	100	directus_permissions	71	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_activity","action":"read"}	\N	\N
95	101	directus_permissions	72	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"read"}	\N	\N
96	102	directus_permissions	73	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":{"comment":{"_nnull":true}},"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"create"}	\N	\N
97	103	directus_permissions	74	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["comment"],"system":true,"collection":"directus_comments","action":"update"}	\N	\N
98	104	directus_permissions	75	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_comments","action":"delete"}	\N	\N
99	105	directus_permissions	76	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_or":[{"user":{"_eq":"$CURRENT_USER"}},{"_and":[{"user":{"_null":true}},{"role":{"_eq":"$CURRENT_ROLE"}}]},{"_and":[{"user":{"_null":true}},{"role":{"_null":true}}]}]},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"read"}	\N	\N
100	106	directus_permissions	77	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"create"}	\N	\N
101	107	directus_permissions	78	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":{"user":{"_eq":"$CURRENT_USER"}},"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"update"}	\N	\N
102	108	directus_permissions	79	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_presets","action":"delete"}	\N	\N
103	109	directus_permissions	80	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"id":{"_in":"$CURRENT_ROLES"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_roles","action":"read"}	\N	\N
104	110	directus_permissions	81	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_settings","action":"read"}	\N	\N
105	111	directus_permissions	82	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_translations","action":"read"}	\N	\N
106	112	directus_permissions	83	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_notifications","action":"read"}	\N	\N
107	113	directus_permissions	84	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"recipient":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["status"],"system":true,"collection":"directus_notifications","action":"update"}	\N	\N
108	114	directus_permissions	85	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"user_created":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["*"],"system":true,"collection":"directus_shares","action":"read"}	\N	\N
109	115	directus_permissions	86	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"id":{"_eq":"$CURRENT_USER"}},"validation":null,"presets":null,"fields":["id","first_name","last_name","last_page","email","password","location","title","description","tags","provider","preferences_divider","avatar","language","appearance","theme_light","theme_dark","tfa_secret","status","role"],"system":true,"collection":"directus_users","action":"read"}	\N	\N
110	116	directus_permissions	87	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"create"}	\N	\N
111	117	directus_permissions	88	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"create"}	\N	\N
112	118	directus_permissions	89	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"matches","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"matches","action":"create"}	\N	\N
113	119	directus_permissions	90	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"participants","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"participants","action":"create"}	\N	\N
114	120	directus_permissions	91	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"read"}	\N	\N
115	121	directus_permissions	92	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":["id","user_created","name","slug","type","status","start_date","end_date","location","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"presets":null,"collection":"events","action":"update"}	\N	\N
116	122	directus_permissions	93	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":null,"presets":null,"collection":"events","action":"delete"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"fields":null,"presets":null,"collection":"events","action":"delete"}	\N	\N
117	123	directus_access	a29489ba-80b3-4eef-9ea3-5eb68ec60b25	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","role":{"id":"7883c172-0f51-45d1-8abc-5eab66ef4a65"}}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","role":{"id":"7883c172-0f51-45d1-8abc-5eab66ef4a65"}}	\N	\N
118	125	directus_fields	2	{"special":["uuid"],"collection":"events","field":"user_created"}	{"special":["uuid"],"collection":"events","field":"user_created"}	\N	\N
119	126	directus_fields	3	{"special":["uuid"],"collection":"competition_categories","field":"id"}	{"special":["uuid"],"collection":"competition_categories","field":"id"}	\N	\N
120	127	directus_fields	1	{"id":1,"collection":"competition_categories","field":"event_id","special":["uuid"],"interface":null,"options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"competition_categories","field":"event_id","interface":null}	\N	\N
181	208	directus_permissions	131	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"read"}	\N	\N
121	130	directus_fields	1	{"id":1,"collection":"competition_categories","field":"event_id","special":["uuid"],"interface":"select-dropdown-m2o","options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"competition_categories","field":"event_id","interface":"select-dropdown-m2o"}	\N	\N
122	131	directus_fields	1	{"id":1,"collection":"competition_categories","field":"event_id","special":["uuid"],"interface":null,"options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"competition_categories","field":"event_id","interface":null}	\N	\N
123	132	directus_permissions	94	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"create"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"create"}	\N	\N
124	133	directus_permissions	95	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"update"}	\N	\N
125	134	directus_permissions	96	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"delete"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_users","action":"delete"}	\N	\N
126	140	directus_collections	events	{"collection":"events","icon":null,"note":null,"display_template":null,"hidden":false,"singleton":false,"translations":null,"archive_field":null,"archive_app_filter":true,"archive_value":null,"unarchive_value":null,"sort_field":null,"accountability":null,"color":null,"item_duplication_fields":null,"sort":null,"group":null,"collapse":"open","preview_url":null,"versioning":false}	{"accountability":null}	\N	\N
127	141	directus_fields	4	{"special":null,"collection":"events","field":"name"}	{"special":null,"collection":"events","field":"name"}	\N	\N
128	142	directus_fields	5	{"special":null,"collection":"events","field":"updated_at"}	{"special":null,"collection":"events","field":"updated_at"}	\N	\N
129	143	directus_fields	6	{"special":["uuid"],"collection":"events","field":"id"}	{"special":["uuid"],"collection":"events","field":"id"}	\N	\N
130	144	directus_fields	7	{"special":null,"collection":"events","field":"slug"}	{"special":null,"collection":"events","field":"slug"}	\N	\N
131	145	directus_fields	8	{"special":null,"collection":"events","field":"status"}	{"special":null,"collection":"events","field":"status"}	\N	\N
132	146	directus_fields	9	{"special":null,"collection":"events","field":"type"}	{"special":null,"collection":"events","field":"type"}	\N	\N
133	147	directus_fields	10	{"special":null,"collection":"events","field":"start_date"}	{"special":null,"collection":"events","field":"start_date"}	\N	\N
134	148	directus_fields	11	{"special":null,"collection":"events","field":"end_date"}	{"special":null,"collection":"events","field":"end_date"}	\N	\N
135	149	directus_fields	12	{"special":null,"collection":"events","field":"location"}	{"special":null,"collection":"events","field":"location"}	\N	\N
136	150	directus_fields	13	{"special":null,"collection":"events","field":"description"}	{"special":null,"collection":"events","field":"description"}	\N	\N
137	151	directus_fields	14	{"special":["cast-json"],"collection":"events","field":"contact_person"}	{"special":["cast-json"],"collection":"events","field":"contact_person"}	\N	\N
138	152	directus_fields	15	{"special":null,"collection":"events","field":"registration_url"}	{"special":null,"collection":"events","field":"registration_url"}	\N	\N
139	153	directus_fields	16	{"special":null,"collection":"events","field":"guidebook_url"}	{"special":null,"collection":"events","field":"guidebook_url"}	\N	\N
140	154	directus_fields	17	{"special":null,"collection":"events","field":"instagram_url"}	{"special":null,"collection":"events","field":"instagram_url"}	\N	\N
141	155	directus_fields	18	{"special":null,"collection":"events","field":"card_image_url"}	{"special":null,"collection":"events","field":"card_image_url"}	\N	\N
142	156	directus_fields	19	{"special":null,"collection":"events","field":"website_url"}	{"special":null,"collection":"events","field":"website_url"}	\N	\N
143	157	directus_fields	20	{"special":null,"collection":"events","field":"banner_image_url"}	{"special":null,"collection":"events","field":"banner_image_url"}	\N	\N
144	158	directus_fields	21	{"special":["cast-boolean"],"collection":"events","field":"is_published"}	{"special":["cast-boolean"],"collection":"events","field":"is_published"}	\N	\N
145	159	directus_fields	22	{"special":["cast-boolean"],"collection":"events","field":"is_registration_open"}	{"special":["cast-boolean"],"collection":"events","field":"is_registration_open"}	\N	\N
146	160	directus_fields	23	{"special":null,"collection":"events","field":"created_at"}	{"special":null,"collection":"events","field":"created_at"}	\N	\N
147	161	directus_fields	24	{"special":["uuid"],"collection":"competition_categories","field":"format_id"}	{"special":["uuid"],"collection":"competition_categories","field":"format_id"}	\N	\N
148	162	directus_fields	25	{"special":null,"collection":"competition_categories","field":"participant_type"}	{"special":null,"collection":"competition_categories","field":"participant_type"}	\N	\N
149	163	directus_fields	26	{"special":null,"collection":"competition_categories","field":"name"}	{"special":null,"collection":"competition_categories","field":"name"}	\N	\N
150	164	directus_fields	27	{"special":null,"collection":"competition_categories","field":"display_order"}	{"special":null,"collection":"competition_categories","field":"display_order"}	\N	\N
151	165	directus_fields	28	{"special":null,"collection":"competition_categories","field":"created_at"}	{"special":null,"collection":"competition_categories","field":"created_at"}	\N	\N
152	166	directus_fields	29	{"special":null,"collection":"competition_categories","field":"updated_at"}	{"special":null,"collection":"competition_categories","field":"updated_at"}	\N	\N
182	209	directus_permissions	132	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"institutions","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"institutions","action":"read"}	\N	\N
153	167	directus_permissions	97	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["id","event_id","format_id","name","participant_type","display_order","created_at","updated_at"],"presets":null,"collection":"competition_categories","action":"read"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["id","event_id","format_id","name","participant_type","display_order","created_at","updated_at"],"presets":null,"collection":"competition_categories","action":"read"}	\N	\N
154	168	directus_permissions	98	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["id","format_id","name","participant_type","display_order","created_at","updated_at","event_id"],"presets":null,"collection":"competition_categories","action":"update"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["id","format_id","name","participant_type","display_order","created_at","updated_at","event_id"],"presets":null,"collection":"competition_categories","action":"update"}	\N	\N
155	169	directus_permissions	91	{"id":91,"collection":"events","action":"read","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"presets":null,"fields":["id","user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	{"collection":"events","action":"read","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"presets":null,"fields":["id","user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	\N	\N
156	171	directus_permissions	99	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"share"}	{"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"events","action":"share"}	\N	\N
157	172	directus_permissions	91	{"id":91,"collection":"events","action":"read","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"presets":null,"fields":["user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at","id"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	{"collection":"events","action":"read","permissions":{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]},"validation":null,"presets":null,"fields":["user_created","name","slug","type","status","end_date","location","start_date","description","contact_person","registration_url","guidebook_url","instagram_url","website_url","card_image_url","banner_image_url","is_published","is_registration_open","created_at","updated_at","id"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	\N	\N
158	174	directus_permissions	97	{"id":97,"collection":"competition_categories","action":"read","permissions":{"_and":[{"_and":[{"event_id":{"_eq":null}},{"event_id":{"_eq":"$CURRENT_USER"}}]}]},"validation":null,"presets":null,"fields":["id","event_id","format_id","name","participant_type","display_order","created_at","updated_at"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	{"collection":"competition_categories","action":"read","permissions":{"_and":[{"_and":[{"event_id":{"_eq":null}},{"event_id":{"_eq":"$CURRENT_USER"}}]}]},"validation":null,"presets":null,"fields":["id","event_id","format_id","name","participant_type","display_order","created_at","updated_at"],"policy":"1990d9a8-6e77-4fd7-9d79-d6d2b25e9906"}	\N	\N
159	176	directus_collections	events	{"collection":"events","icon":null,"note":null,"display_template":null,"hidden":false,"singleton":false,"translations":null,"archive_field":null,"archive_app_filter":true,"archive_value":null,"unarchive_value":null,"sort_field":null,"accountability":null,"color":null,"item_duplication_fields":[],"sort":null,"group":null,"collapse":"open","preview_url":null,"versioning":false}	{"item_duplication_fields":[]}	\N	\N
160	179	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	{"id":"dc42a2f7-80d7-4515-9719-8e2f77646540","name":"SuperAdmin","icon":"supervised_user_circle","description":null,"parent":null,"children":[],"policies":[],"users":[]}	{"name":"SuperAdmin"}	\N	\N
161	180	directus_policies	9c8d904e-e152-40ec-aca6-dc56b490a417	{"name":"Akses SuperAdmin","admin_access":true,"app_access":true}	{"name":"Akses SuperAdmin","admin_access":true,"app_access":true}	\N	\N
162	181	directus_access	37a30545-9f59-4431-8f99-deb46a73184d	{"policy":"9c8d904e-e152-40ec-aca6-dc56b490a417","role":{"id":"dc42a2f7-80d7-4515-9719-8e2f77646540"}}	{"policy":"9c8d904e-e152-40ec-aca6-dc56b490a417","role":{"id":"dc42a2f7-80d7-4515-9719-8e2f77646540"}}	\N	\N
163	183	directus_settings	1	{"id":1,"project_name":"Directus","project_url":null,"project_color":"#4258FF","project_logo":null,"public_foreground":null,"public_background":null,"public_note":null,"auth_login_attempts":25,"auth_password_policy":null,"storage_asset_transform":"all","storage_asset_presets":null,"custom_css":null,"storage_default_folder":null,"basemaps":null,"mapbox_key":null,"module_bar":null,"project_descriptor":null,"default_language":"en-US","custom_aspect_ratios":null,"public_favicon":null,"default_appearance":"auto","default_theme_light":null,"theme_light_overrides":null,"default_theme_dark":null,"theme_dark_overrides":null,"report_error_url":null,"report_bug_url":null,"report_feature_url":null,"public_registration":false,"public_registration_verify_email":true,"public_registration_role":null,"public_registration_email_filter":null,"visual_editor_urls":null,"project_id":"019cfcc1-2243-74dc-bcd4-af4497e0ddfc","mcp_enabled":false,"mcp_allow_deletes":false,"mcp_prompts_collection":null,"mcp_system_prompt_enabled":true,"mcp_system_prompt":null,"project_owner":null,"project_usage":null,"org_name":null,"product_updates":null,"project_status":null,"ai_openai_api_key":null,"ai_anthropic_api_key":null,"ai_system_prompt":null,"ai_google_api_key":null,"ai_openai_compatible_api_key":null,"ai_openai_compatible_base_url":null,"ai_openai_compatible_name":null,"ai_openai_compatible_models":null,"ai_openai_compatible_headers":null,"ai_openai_allowed_models":["gpt-5-nano","gpt-5-mini","gpt-5"],"ai_anthropic_allowed_models":["claude-haiku-4-5","claude-sonnet-4-5"],"ai_google_allowed_models":["gemini-3-pro-preview","gemini-3-flash-preview","gemini-2.5-pro","gemini-2.5-flash"],"collaborative_editing_enabled":false}	{"project_color":"#4258FF"}	\N	\N
183	210	directus_permissions	133	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"match_formats","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"match_formats","action":"read"}	\N	\N
164	184	directus_settings	1	{"id":1,"project_name":"Directus","project_url":null,"project_color":"#4258FF","project_logo":null,"public_foreground":null,"public_background":null,"public_note":null,"auth_login_attempts":25,"auth_password_policy":null,"storage_asset_transform":"all","storage_asset_presets":null,"custom_css":null,"storage_default_folder":null,"basemaps":null,"mapbox_key":null,"module_bar":null,"project_descriptor":null,"default_language":"en-US","custom_aspect_ratios":null,"public_favicon":null,"default_appearance":"auto","default_theme_light":"Directus Color Match","theme_light_overrides":null,"default_theme_dark":null,"theme_dark_overrides":null,"report_error_url":null,"report_bug_url":null,"report_feature_url":null,"public_registration":false,"public_registration_verify_email":true,"public_registration_role":null,"public_registration_email_filter":null,"visual_editor_urls":null,"project_id":"019cfcc1-2243-74dc-bcd4-af4497e0ddfc","mcp_enabled":false,"mcp_allow_deletes":false,"mcp_prompts_collection":null,"mcp_system_prompt_enabled":true,"mcp_system_prompt":null,"project_owner":null,"project_usage":null,"org_name":null,"product_updates":null,"project_status":null,"ai_openai_api_key":null,"ai_anthropic_api_key":null,"ai_system_prompt":null,"ai_google_api_key":null,"ai_openai_compatible_api_key":null,"ai_openai_compatible_base_url":null,"ai_openai_compatible_name":null,"ai_openai_compatible_models":null,"ai_openai_compatible_headers":null,"ai_openai_allowed_models":["gpt-5-nano","gpt-5-mini","gpt-5"],"ai_anthropic_allowed_models":["claude-haiku-4-5","claude-sonnet-4-5"],"ai_google_allowed_models":["gemini-3-pro-preview","gemini-3-flash-preview","gemini-2.5-pro","gemini-2.5-flash"],"collaborative_editing_enabled":false}	{"default_theme_light":"Directus Color Match"}	\N	\N
165	185	directus_settings	1	{"id":1,"project_name":"Directus","project_url":null,"project_color":"#4258FF","project_logo":null,"public_foreground":null,"public_background":null,"public_note":null,"auth_login_attempts":25,"auth_password_policy":null,"storage_asset_transform":"all","storage_asset_presets":null,"custom_css":null,"storage_default_folder":null,"basemaps":null,"mapbox_key":null,"module_bar":null,"project_descriptor":null,"default_language":"en-US","custom_aspect_ratios":null,"public_favicon":null,"default_appearance":"auto","default_theme_light":"Directus Default","theme_light_overrides":null,"default_theme_dark":null,"theme_dark_overrides":null,"report_error_url":null,"report_bug_url":null,"report_feature_url":null,"public_registration":false,"public_registration_verify_email":true,"public_registration_role":null,"public_registration_email_filter":null,"visual_editor_urls":null,"project_id":"019cfcc1-2243-74dc-bcd4-af4497e0ddfc","mcp_enabled":false,"mcp_allow_deletes":false,"mcp_prompts_collection":null,"mcp_system_prompt_enabled":true,"mcp_system_prompt":null,"project_owner":null,"project_usage":null,"org_name":null,"product_updates":null,"project_status":null,"ai_openai_api_key":null,"ai_anthropic_api_key":null,"ai_system_prompt":null,"ai_google_api_key":null,"ai_openai_compatible_api_key":null,"ai_openai_compatible_base_url":null,"ai_openai_compatible_name":null,"ai_openai_compatible_models":null,"ai_openai_compatible_headers":null,"ai_openai_allowed_models":["gpt-5-nano","gpt-5-mini","gpt-5"],"ai_anthropic_allowed_models":["claude-haiku-4-5","claude-sonnet-4-5"],"ai_google_allowed_models":["gemini-3-pro-preview","gemini-3-flash-preview","gemini-2.5-pro","gemini-2.5-flash"],"collaborative_editing_enabled":false}	{"default_theme_light":"Directus Default"}	\N	\N
166	186	directus_roles	7883c172-0f51-45d1-8abc-5eab66ef4a65	{"id":"7883c172-0f51-45d1-8abc-5eab66ef4a65","name":"PJ Ormawa","icon":"supervised_user_circle","description":"Izin Akses untuk PJ Ormawa","parent":null,"children":[],"policies":["a29489ba-80b3-4eef-9ea3-5eb68ec60b25"],"users":[]}	{"description":"Izin Akses untuk PJ Ormawa"}	\N	\N
167	187	directus_roles	dc42a2f7-80d7-4515-9719-8e2f77646540	{"id":"dc42a2f7-80d7-4515-9719-8e2f77646540","name":"SuperAdmin","icon":"supervised_user_circle","description":"Izin Akses untuk SuperAdmin","parent":null,"children":[],"policies":["37a30545-9f59-4431-8f99-deb46a73184d"],"users":[]}	{"description":"Izin Akses untuk SuperAdmin"}	\N	\N
168	189	directus_collections	match_participants	{"collection":"match_participants"}	{"collection":"match_participants"}	\N	\N
169	190	directus_fields	30	{"special":["uuid"],"collection":"match_participants","field":"match_id"}	{"special":["uuid"],"collection":"match_participants","field":"match_id"}	\N	\N
170	191	directus_fields	30	{"id":30,"collection":"match_participants","field":"match_id","special":["uuid"],"interface":"select-dropdown-m2o","options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"match_participants","field":"match_id","interface":"select-dropdown-m2o"}	\N	\N
171	192	directus_fields	31	{"special":["uuid"],"collection":"match_participants","field":"participant_id"}	{"special":["uuid"],"collection":"match_participants","field":"participant_id"}	\N	\N
172	193	directus_fields	31	{"id":31,"collection":"match_participants","field":"participant_id","special":["uuid"],"interface":"select-dropdown-m2o","options":null,"display":null,"display_options":null,"readonly":false,"hidden":false,"sort":null,"width":"full","translations":null,"note":null,"conditions":null,"required":false,"group":null,"validation":null,"validation_message":null,"searchable":true}	{"collection":"match_participants","field":"participant_id","interface":"select-dropdown-m2o"}	\N	\N
173	194	directus_fields	32	{"special":["uuid"],"collection":"match_participants","field":"id"}	{"special":["uuid"],"collection":"match_participants","field":"id"}	\N	\N
174	195	directus_fields	33	{"special":null,"collection":"match_participants","field":"position"}	{"special":null,"collection":"match_participants","field":"position"}	\N	\N
175	199	directus_access	76fc6224-3867-4e7d-bf20-7030dc05f133	{"role":null,"policy":{"id":"82ac3d98-ac2b-4195-b05c-f8e034a1b73e"}}	{"role":null,"policy":{"id":"82ac3d98-ac2b-4195-b05c-f8e034a1b73e"}}	\N	\N
176	201	directus_access	682da8bc-23f9-4a0b-83b1-d98278246232	{"role":null,"policy":{"id":"abf8a154-5b1c-4a46-ac9c-7300570f4f17"}}	{"role":null,"policy":{"id":"abf8a154-5b1c-4a46-ac9c-7300570f4f17"}}	\N	\N
177	202	directus_access	75925e69-ab0d-4651-9f25-52269d61cb54	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","role":{"id":"b18d3bfd-2c54-46d4-99a5-13fdee6a2b21"}}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","role":{"id":"b18d3bfd-2c54-46d4-99a5-13fdee6a2b21"}}	\N	\N
178	205	directus_permissions	128	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"app_settings","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"app_settings","action":"read"}	\N	\N
179	206	directus_permissions	129	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"competition_categories","action":"read"}	\N	\N
184	211	directus_permissions	134	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"match_participants","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"match_participants","action":"read"}	\N	\N
185	212	directus_permissions	135	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"matches","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"matches","action":"read"}	\N	\N
186	213	directus_permissions	136	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"news","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"news","action":"read"}	\N	\N
187	214	directus_permissions	137	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"participants","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"participants","action":"read"}	\N	\N
188	215	directus_permissions	138	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"sponsors","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"sponsors","action":"read"}	\N	\N
189	216	directus_permissions	139	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_collections","action":"read"}	{"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17","permissions":null,"validation":null,"fields":["*"],"presets":null,"collection":"directus_collections","action":"read"}	\N	\N
190	218	directus_permissions	131	{"id":131,"collection":"events","action":"read","permissions":null,"validation":null,"presets":null,"fields":["*"],"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17"}	{"collection":"events","action":"read","permissions":null,"validation":null,"presets":null,"fields":["*"],"policy":"abf8a154-5b1c-4a46-ac9c-7300570f4f17"}	\N	\N
191	221	directus_settings	1	{"id":1,"project_name":"Directus","project_url":null,"project_color":"#4258FF","project_logo":null,"public_foreground":null,"public_background":null,"public_note":null,"auth_login_attempts":25,"auth_password_policy":null,"storage_asset_transform":"all","storage_asset_presets":null,"custom_css":null,"storage_default_folder":null,"basemaps":null,"mapbox_key":null,"module_bar":null,"project_descriptor":null,"default_language":"en-US","custom_aspect_ratios":null,"public_favicon":null,"default_appearance":"auto","default_theme_light":"Directus Default","theme_light_overrides":null,"default_theme_dark":null,"theme_dark_overrides":null,"report_error_url":null,"report_bug_url":null,"report_feature_url":null,"public_registration":false,"public_registration_verify_email":true,"public_registration_role":null,"public_registration_email_filter":null,"visual_editor_urls":null,"project_id":"019cfcc1-2243-74dc-bcd4-af4497e0ddfc","mcp_enabled":false,"mcp_allow_deletes":false,"mcp_prompts_collection":null,"mcp_system_prompt_enabled":true,"mcp_system_prompt":null,"project_owner":"aryafaiz1810@gmail.com","project_usage":"personal","org_name":null,"product_updates":true,"project_status":null,"ai_openai_api_key":null,"ai_anthropic_api_key":null,"ai_system_prompt":null,"ai_google_api_key":null,"ai_openai_compatible_api_key":null,"ai_openai_compatible_base_url":null,"ai_openai_compatible_name":null,"ai_openai_compatible_models":null,"ai_openai_compatible_headers":null,"ai_openai_allowed_models":["gpt-5-nano","gpt-5-mini","gpt-5"],"ai_anthropic_allowed_models":["claude-haiku-4-5","claude-sonnet-4-5"],"ai_google_allowed_models":["gemini-3-pro-preview","gemini-3-flash-preview","gemini-2.5-pro","gemini-2.5-flash"],"collaborative_editing_enabled":false}	{"project_owner":"aryafaiz1810@gmail.com","project_usage":"personal","org_name":null,"product_updates":true,"project_status":null}	\N	\N
\.


--
-- Data for Name: directus_roles; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_roles (id, name, icon, description, parent) FROM stdin;
b18d3bfd-2c54-46d4-99a5-13fdee6a2b21	Administrator	verified	$t:admin_description	\N
7883c172-0f51-45d1-8abc-5eab66ef4a65	PJ Ormawa	supervised_user_circle	Izin Akses untuk PJ Ormawa	\N
dc42a2f7-80d7-4515-9719-8e2f77646540	SuperAdmin	supervised_user_circle	Izin Akses untuk SuperAdmin	\N
\.


--
-- Data for Name: directus_sessions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_sessions (token, "user", expires, ip, user_agent, share, origin, next_token) FROM stdin;
gsKN1VZzoV4Ag7FSwPKRAAlN-QXflCZRPuBljLY5PYvFy1Z4e8aOP9PWRjzQNfaK	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-27 14:06:21.556+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.112.0 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36	\N	http://localhost:8055	izbFCimhB1YanbXDgbcnc9avb5TpYGESzVzAi2J-Y_C9OAm1_v8eQqHL63uKOyXZ
izbFCimhB1YanbXDgbcnc9avb5TpYGESzVzAi2J-Y_C9OAm1_v8eQqHL63uKOyXZ	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-27 14:06:25.087+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.113.0 Chrome/142.0.7444.265 Electron/39.8.3 Safari/537.36	\N	http://localhost:8055	y1kwomDGMxBA2Lb72pBb0MaQM4ltU2717xUDC5fO736TgJSCNKKW4SJdpY9uyXjH
y1kwomDGMxBA2Lb72pBb0MaQM4ltU2717xUDC5fO736TgJSCNKKW4SJdpY9uyXjH	f1ae03a9-c7a2-480b-a2af-cdba203a5636	2026-03-28 14:06:15.087+00	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.113.0 Chrome/142.0.7444.265 Electron/39.8.3 Safari/537.36	\N	http://localhost:8055	\N
\.


--
-- Data for Name: directus_settings; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_settings (id, project_name, project_url, project_color, project_logo, public_foreground, public_background, public_note, auth_login_attempts, auth_password_policy, storage_asset_transform, storage_asset_presets, custom_css, storage_default_folder, basemaps, mapbox_key, module_bar, project_descriptor, default_language, custom_aspect_ratios, public_favicon, default_appearance, default_theme_light, theme_light_overrides, default_theme_dark, theme_dark_overrides, report_error_url, report_bug_url, report_feature_url, public_registration, public_registration_verify_email, public_registration_role, public_registration_email_filter, visual_editor_urls, project_id, mcp_enabled, mcp_allow_deletes, mcp_prompts_collection, mcp_system_prompt_enabled, mcp_system_prompt, project_owner, project_usage, org_name, product_updates, project_status, ai_openai_api_key, ai_anthropic_api_key, ai_system_prompt, ai_google_api_key, ai_openai_compatible_api_key, ai_openai_compatible_base_url, ai_openai_compatible_name, ai_openai_compatible_models, ai_openai_compatible_headers, ai_openai_allowed_models, ai_anthropic_allowed_models, ai_google_allowed_models, collaborative_editing_enabled) FROM stdin;
1	Directus	\N	#4258FF	\N	\N	\N	\N	25	\N	all	\N	\N	\N	\N	\N	\N	\N	en-US	\N	\N	auto	Directus Default	\N	\N	\N	\N	\N	\N	f	t	\N	\N	\N	019cfcc1-2243-74dc-bcd4-af4497e0ddfc	f	f	\N	t	\N	aryafaiz1810@gmail.com	personal	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	["gpt-5-nano","gpt-5-mini","gpt-5"]	["claude-haiku-4-5","claude-sonnet-4-5"]	["gemini-3-pro-preview","gemini-3-flash-preview","gemini-2.5-pro","gemini-2.5-flash"]	f
\.


--
-- Data for Name: directus_shares; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_shares (id, name, collection, item, role, password, user_created, date_created, date_start, date_end, times_used, max_uses) FROM stdin;
\.


--
-- Data for Name: directus_translations; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_translations (id, language, key, value) FROM stdin;
\.


--
-- Data for Name: directus_users; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_users (id, first_name, last_name, email, password, location, title, description, tags, avatar, language, tfa_secret, status, role, token, last_access, last_page, provider, external_identifier, auth_data, email_notifications, appearance, theme_dark, theme_light, theme_light_overrides, theme_dark_overrides, text_direction) FROM stdin;
f1ae03a9-c7a2-480b-a2af-cdba203a5636	Admin	User	admin@event.com	$argon2id$v=19$m=65536,t=3,p=4$9i8ztPWUTbwY5vdcA0Ie6w$6O8qtC6D9+58Aun6VFCxBoqPsfLVjqC2OR/TIVyfnX4	\N	\N	\N	\N	\N	\N	\N	active	b18d3bfd-2c54-46d4-99a5-13fdee6a2b21	\N	2026-03-27 14:06:15.095+00	/content/events	default	\N	\N	t	\N	\N	\N	\N	\N	auto
\.


--
-- Data for Name: directus_versions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_versions (id, key, name, collection, item, hash, date_created, date_updated, user_created, user_updated, delta) FROM stdin;
\.


--
-- Data for Name: event_phases; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.event_phases (id, event_id, label, description, date_start, date_end, time_start, status, display_order) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.events (id, user_created, name, slug, type, status, start_date, end_date, location, description, contact_person, registration_url, guidebook_url, instagram_url, website_url, card_image_url, banner_image_url, is_published, is_registration_open, created_at, updated_at) FROM stdin;
e1e1e1e1-e1e1-4000-a111-000000000001	f1ae03a9-c7a2-480b-a2af-cdba203a5636	FORKI X IPB CUP 2026	forki-ipb-2026	sport	active	2026-03-25	\N	Gymnasium IPB	\N	\N	\N	\N	\N	\N	https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=1000	\N	t	f	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
e1e1e1e1-e1e1-4000-a111-000000000002	f1ae03a9-c7a2-480b-a2af-cdba203a5636	IT-TODAY HACKTODAY	hacktoday-2026	sport	active	2026-03-26	\N	Auditorium AHN	\N	\N	\N	\N	\N	\N	https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000	\N	t	f	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
e1e1e1e1-e1e1-4000-a111-000000000003	f1ae03a9-c7a2-480b-a2af-cdba203a5636	IPB BERLARI 2026	ipb-berlari-2026	sport	active	2026-03-27	\N	Lingkar IPB	\N	\N	\N	\N	\N	\N	https://www.sunlife.co.id/content/dam/sunlife/legacy/assets/id/Life%20Moments/Building%20a%20Family/Berlari%20Menyehatkan%20Tubuh%20dan%20Pikiran-1200x600.jpg	\N	t	f	2026-03-27 15:22:17.981961+00	2026-03-27 15:25:30.797094+00
\.


--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.institutions (id, event_id, name, logo_url, created_at, updated_at) FROM stdin;
b1b1b1b1-b1b1-4000-9999-000000000001	e1e1e1e1-e1e1-4000-a111-000000000001	IPB University	/universities/ipb.png	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
b1b1b1b1-b1b1-4000-9999-000000000002	e1e1e1e1-e1e1-4000-a111-000000000001	UPNVYK	/universities/ui.png	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
b1b1b1b1-b1b1-4000-9999-000000000003	e1e1e1e1-e1e1-4000-a111-000000000001	UI	/universities/ui.png	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
\.


--
-- Data for Name: match_formats; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.match_formats (id, event_id, name, match_type, modules, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: match_participants; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.match_participants (id, match_id, participant_id, "position") FROM stdin;
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.matches (id, competition_category_id, round, match_name, venue, scheduled_at, home_participant_id, away_participant_id, winner, rankings, home_score, away_score, timer_secs, live_state, status, created_at, updated_at) FROM stdin;
f4f4f4f4-f4f4-4000-d444-000000000001	c2c2c2c2-c2c2-4000-b222-000000000001	Final	Kata Perorang	Lapangan B Gor Utama	2026-03-27 15:22:17.981961+00	d3d3d3d3-d3d3-4000-c333-000000000001	d3d3d3d3-d3d3-4000-c333-000000000002	\N	\N	0	0	0	{"awayScore": 4, "homeScore": 3, "timerSecs": 272, "timerRunning": true}	live	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
f4f4f4f4-f4f4-4000-d444-000000000002	c2c2c2c2-c2c2-4000-b222-000000000002	Main Event	HackToday	Auditorium AHN	2026-03-27 15:22:17.981961+00	d3d3d3d3-d3d3-4000-c333-000000000003	d3d3d3d3-d3d3-4000-c333-000000000004	\N	\N	0	0	0	{"timerSecs": 1800, "timerRunning": true}	live	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
f4f4f4f4-f4f4-4000-d444-000000000003	c2c2c2c2-c2c2-4000-b222-000000000001	Semifinal	Kata Perorang	Lapangan B	2026-03-27 16:22:17.981961+00	d3d3d3d3-d3d3-4000-c333-000000000001	d3d3d3d3-d3d3-4000-c333-000000000002	\N	\N	0	0	0	{}	upcoming	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
f4f4f4f4-f4f4-4000-d444-000000000004	c2c2c2c2-c2c2-4000-b222-000000000003	Final	Open Marathon	Lingkar IPB	2026-03-27 15:22:17.981961+00	d3d3d3d3-d3d3-4000-c333-000000000005	\N	\N	\N	0	0	0	{"timerSecs": 3600, "timerRunning": true}	live	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.news (id, author_id, event_id, category, title, slug, excerpt, thumbnail_url, content, is_published, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.participants (id, competition_category_id, institution_id, name, members, seed, notes, custom_logo_url, created_at, updated_at) FROM stdin;
d3d3d3d3-d3d3-4000-c333-000000000001	c2c2c2c2-c2c2-4000-b222-000000000001	b1b1b1b1-b1b1-4000-9999-000000000001	Gilang Muhamad	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
d3d3d3d3-d3d3-4000-c333-000000000002	c2c2c2c2-c2c2-4000-b222-000000000001	b1b1b1b1-b1b1-4000-9999-000000000002	Agus Maragus	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
d3d3d3d3-d3d3-4000-c333-000000000003	c2c2c2c2-c2c2-4000-b222-000000000002	b1b1b1b1-b1b1-4000-9999-000000000001	Team IPB 1	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
d3d3d3d3-d3d3-4000-c333-000000000004	c2c2c2c2-c2c2-4000-b222-000000000002	b1b1b1b1-b1b1-4000-9999-000000000003	Team UI 2	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
d3d3d3d3-d3d3-4000-c333-000000000005	c2c2c2c2-c2c2-4000-b222-000000000003	b1b1b1b1-b1b1-4000-9999-000000000001	Reza Rahardian	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
d3d3d3d3-d3d3-4000-c333-000000000006	c2c2c2c2-c2c2-4000-b222-000000000003	b1b1b1b1-b1b1-4000-9999-000000000001	Gilang Muhamad	\N	\N		\N	2026-03-27 15:22:17.981961+00	2026-03-27 15:22:17.981961+00
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: sponsors; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.sponsors (id, event_id, name, logo_url, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: geocode_settings; Type: TABLE DATA; Schema: tiger; Owner: directus
--

COPY tiger.geocode_settings (name, setting, unit, category, short_desc) FROM stdin;
\.


--
-- Data for Name: pagc_gaz; Type: TABLE DATA; Schema: tiger; Owner: directus
--

COPY tiger.pagc_gaz (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_lex; Type: TABLE DATA; Schema: tiger; Owner: directus
--

COPY tiger.pagc_lex (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_rules; Type: TABLE DATA; Schema: tiger; Owner: directus
--

COPY tiger.pagc_rules (id, rule, is_custom) FROM stdin;
\.


--
-- Data for Name: topology; Type: TABLE DATA; Schema: topology; Owner: directus
--

COPY topology.topology (id, name, srid, "precision", hasz) FROM stdin;
\.


--
-- Data for Name: layer; Type: TABLE DATA; Schema: topology; Owner: directus
--

COPY topology.layer (topology_id, layer_id, schema_name, table_name, feature_column, feature_type, level, child_id) FROM stdin;
\.


--
-- Name: directus_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_activity_id_seq', 222, true);


--
-- Name: directus_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_fields_id_seq', 33, true);


--
-- Name: directus_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_notifications_id_seq', 1, false);


--
-- Name: directus_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_permissions_id_seq', 139, true);


--
-- Name: directus_presets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_presets_id_seq', 1, true);


--
-- Name: directus_relations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_relations_id_seq', 1, false);


--
-- Name: directus_revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_revisions_id_seq', 191, true);


--
-- Name: directus_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_settings_id_seq', 1, true);


--
-- Name: topology_id_seq; Type: SEQUENCE SET; Schema: topology; Owner: directus
--

SELECT pg_catalog.setval('topology.topology_id_seq', 1, false);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: competition_categories competition_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.competition_categories
    ADD CONSTRAINT competition_categories_pkey PRIMARY KEY (id);


--
-- Name: directus_access directus_access_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_pkey PRIMARY KEY (id);


--
-- Name: directus_activity directus_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_activity
    ADD CONSTRAINT directus_activity_pkey PRIMARY KEY (id);


--
-- Name: directus_collections directus_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_collections
    ADD CONSTRAINT directus_collections_pkey PRIMARY KEY (collection);


--
-- Name: directus_comments directus_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_pkey PRIMARY KEY (id);


--
-- Name: directus_dashboards directus_dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_dashboards
    ADD CONSTRAINT directus_dashboards_pkey PRIMARY KEY (id);


--
-- Name: directus_deployment_projects directus_deployment_projects_deployment_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_deployment_external_id_unique UNIQUE (deployment, external_id);


--
-- Name: directus_deployment_projects directus_deployment_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_pkey PRIMARY KEY (id);


--
-- Name: directus_deployment_runs directus_deployment_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_pkey PRIMARY KEY (id);


--
-- Name: directus_deployments directus_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_pkey PRIMARY KEY (id);


--
-- Name: directus_deployments directus_deployments_provider_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_provider_unique UNIQUE (provider);


--
-- Name: directus_extensions directus_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_extensions
    ADD CONSTRAINT directus_extensions_pkey PRIMARY KEY (id);


--
-- Name: directus_fields directus_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_fields
    ADD CONSTRAINT directus_fields_pkey PRIMARY KEY (id);


--
-- Name: directus_files directus_files_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_pkey PRIMARY KEY (id);


--
-- Name: directus_flows directus_flows_operation_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_operation_unique UNIQUE (operation);


--
-- Name: directus_flows directus_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_pkey PRIMARY KEY (id);


--
-- Name: directus_folders directus_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_folders
    ADD CONSTRAINT directus_folders_pkey PRIMARY KEY (id);


--
-- Name: directus_migrations directus_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_migrations
    ADD CONSTRAINT directus_migrations_pkey PRIMARY KEY (version);


--
-- Name: directus_notifications directus_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_pkey PRIMARY KEY (id);


--
-- Name: directus_operations directus_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_pkey PRIMARY KEY (id);


--
-- Name: directus_operations directus_operations_reject_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_reject_unique UNIQUE (reject);


--
-- Name: directus_operations directus_operations_resolve_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_resolve_unique UNIQUE (resolve);


--
-- Name: directus_panels directus_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_pkey PRIMARY KEY (id);


--
-- Name: directus_permissions directus_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_permissions
    ADD CONSTRAINT directus_permissions_pkey PRIMARY KEY (id);


--
-- Name: directus_policies directus_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_policies
    ADD CONSTRAINT directus_policies_pkey PRIMARY KEY (id);


--
-- Name: directus_presets directus_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_pkey PRIMARY KEY (id);


--
-- Name: directus_relations directus_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_relations
    ADD CONSTRAINT directus_relations_pkey PRIMARY KEY (id);


--
-- Name: directus_revisions directus_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_pkey PRIMARY KEY (id);


--
-- Name: directus_roles directus_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_roles
    ADD CONSTRAINT directus_roles_pkey PRIMARY KEY (id);


--
-- Name: directus_sessions directus_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_pkey PRIMARY KEY (token);


--
-- Name: directus_settings directus_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_pkey PRIMARY KEY (id);


--
-- Name: directus_shares directus_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_pkey PRIMARY KEY (id);


--
-- Name: directus_translations directus_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_translations
    ADD CONSTRAINT directus_translations_pkey PRIMARY KEY (id);


--
-- Name: directus_users directus_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_email_unique UNIQUE (email);


--
-- Name: directus_users directus_users_external_identifier_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_external_identifier_unique UNIQUE (external_identifier);


--
-- Name: directus_users directus_users_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_pkey PRIMARY KEY (id);


--
-- Name: directus_users directus_users_token_unique; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_token_unique UNIQUE (token);


--
-- Name: directus_versions directus_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_pkey PRIMARY KEY (id);


--
-- Name: event_phases event_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.event_phases
    ADD CONSTRAINT event_phases_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_slug_key; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_slug_key UNIQUE (slug);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: match_formats match_formats_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_formats
    ADD CONSTRAINT match_formats_pkey PRIMARY KEY (id);


--
-- Name: match_participants match_participants_match_id_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_id_participant_id_key UNIQUE (match_id, participant_id);


--
-- Name: match_participants match_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: news news_slug_key; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_slug_key UNIQUE (slug);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: directus_activity_timestamp_index; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX directus_activity_timestamp_index ON public.directus_activity USING btree ("timestamp");


--
-- Name: directus_revisions_activity_index; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX directus_revisions_activity_index ON public.directus_revisions USING btree (activity);


--
-- Name: directus_revisions_parent_index; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX directus_revisions_parent_index ON public.directus_revisions USING btree (parent);


--
-- Name: idx_categories_event; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_categories_event ON public.competition_categories USING btree (event_id);


--
-- Name: idx_events_slug; Type: INDEX; Schema: public; Owner: directus
--

CREATE UNIQUE INDEX idx_events_slug ON public.events USING btree (slug);


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- Name: idx_events_user_created; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_events_user_created ON public.events USING btree (user_created);


--
-- Name: idx_formats_event; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_formats_event ON public.match_formats USING btree (event_id);


--
-- Name: idx_inst_event_name; Type: INDEX; Schema: public; Owner: directus
--

CREATE UNIQUE INDEX idx_inst_event_name ON public.institutions USING btree (event_id, lower(name));


--
-- Name: idx_logs_created; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_logs_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_logs_entity; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_logs_entity ON public.activity_logs USING btree (entity, entity_id) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_logs_event; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_logs_event ON public.activity_logs USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: idx_logs_user; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_logs_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_matches_away; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_away ON public.matches USING btree (away_participant_id) WHERE (away_participant_id IS NOT NULL);


--
-- Name: idx_matches_category; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_category ON public.matches USING btree (competition_category_id);


--
-- Name: idx_matches_home; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_home ON public.matches USING btree (home_participant_id) WHERE (home_participant_id IS NOT NULL);


--
-- Name: idx_matches_rankings; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_rankings ON public.matches USING gin (rankings) WHERE (rankings IS NOT NULL);


--
-- Name: idx_matches_scheduled; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_scheduled ON public.matches USING btree (scheduled_at);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_matches_winner; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_matches_winner ON public.matches USING btree (winner) WHERE (winner IS NOT NULL);


--
-- Name: idx_news_event; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_news_event ON public.news USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: idx_news_published; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_news_published ON public.news USING btree (is_published, published_at);


--
-- Name: idx_news_slug; Type: INDEX; Schema: public; Owner: directus
--

CREATE UNIQUE INDEX idx_news_slug ON public.news USING btree (slug);


--
-- Name: idx_participants_category; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_participants_category ON public.participants USING btree (competition_category_id);


--
-- Name: idx_participants_institution; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_participants_institution ON public.participants USING btree (institution_id);


--
-- Name: idx_sponsors_event; Type: INDEX; Schema: public; Owner: directus
--

CREATE INDEX idx_sponsors_event ON public.sponsors USING btree (event_id);


--
-- Name: matches trg_match_denorm; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_match_denorm BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.sync_match_denorm();


--
-- Name: app_settings trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: competition_categories trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.competition_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: institutions trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: match_formats trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.match_formats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: news trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: participants trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sponsors trg_updated_at; Type: TRIGGER; Schema: public; Owner: directus
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_logs activity_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.directus_users(id);


--
-- Name: competition_categories competition_categories_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.competition_categories
    ADD CONSTRAINT competition_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: competition_categories competition_categories_format_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.competition_categories
    ADD CONSTRAINT competition_categories_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.match_formats(id) ON DELETE SET NULL;


--
-- Name: directus_access directus_access_policy_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_policy_foreign FOREIGN KEY (policy) REFERENCES public.directus_policies(id) ON DELETE CASCADE;


--
-- Name: directus_access directus_access_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_access directus_access_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_collections directus_collections_group_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_collections
    ADD CONSTRAINT directus_collections_group_foreign FOREIGN KEY ("group") REFERENCES public.directus_collections(collection);


--
-- Name: directus_comments directus_comments_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_comments directus_comments_user_updated_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_user_updated_foreign FOREIGN KEY (user_updated) REFERENCES public.directus_users(id);


--
-- Name: directus_dashboards directus_dashboards_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_dashboards
    ADD CONSTRAINT directus_dashboards_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployment_projects directus_deployment_projects_deployment_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_deployment_foreign FOREIGN KEY (deployment) REFERENCES public.directus_deployments(id) ON DELETE CASCADE;


--
-- Name: directus_deployment_projects directus_deployment_projects_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployment_runs directus_deployment_runs_project_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_project_foreign FOREIGN KEY (project) REFERENCES public.directus_deployment_projects(id) ON DELETE CASCADE;


--
-- Name: directus_deployment_runs directus_deployment_runs_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployments directus_deployments_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_files directus_files_folder_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_folder_foreign FOREIGN KEY (folder) REFERENCES public.directus_folders(id) ON DELETE SET NULL;


--
-- Name: directus_files directus_files_modified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_modified_by_foreign FOREIGN KEY (modified_by) REFERENCES public.directus_users(id);


--
-- Name: directus_files directus_files_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES public.directus_users(id);


--
-- Name: directus_flows directus_flows_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_folders directus_folders_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_folders
    ADD CONSTRAINT directus_folders_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_folders(id);


--
-- Name: directus_notifications directus_notifications_recipient_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_recipient_foreign FOREIGN KEY (recipient) REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_notifications directus_notifications_sender_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_sender_foreign FOREIGN KEY (sender) REFERENCES public.directus_users(id);


--
-- Name: directus_operations directus_operations_flow_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_flow_foreign FOREIGN KEY (flow) REFERENCES public.directus_flows(id) ON DELETE CASCADE;


--
-- Name: directus_operations directus_operations_reject_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_reject_foreign FOREIGN KEY (reject) REFERENCES public.directus_operations(id);


--
-- Name: directus_operations directus_operations_resolve_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_resolve_foreign FOREIGN KEY (resolve) REFERENCES public.directus_operations(id);


--
-- Name: directus_operations directus_operations_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_panels directus_panels_dashboard_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_dashboard_foreign FOREIGN KEY (dashboard) REFERENCES public.directus_dashboards(id) ON DELETE CASCADE;


--
-- Name: directus_panels directus_panels_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_permissions directus_permissions_policy_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_permissions
    ADD CONSTRAINT directus_permissions_policy_foreign FOREIGN KEY (policy) REFERENCES public.directus_policies(id) ON DELETE CASCADE;


--
-- Name: directus_presets directus_presets_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_presets directus_presets_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_revisions directus_revisions_activity_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_activity_foreign FOREIGN KEY (activity) REFERENCES public.directus_activity(id) ON DELETE CASCADE;


--
-- Name: directus_revisions directus_revisions_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_revisions(id);


--
-- Name: directus_revisions directus_revisions_version_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_version_foreign FOREIGN KEY (version) REFERENCES public.directus_versions(id) ON DELETE CASCADE;


--
-- Name: directus_roles directus_roles_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_roles
    ADD CONSTRAINT directus_roles_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_roles(id);


--
-- Name: directus_sessions directus_sessions_share_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_share_foreign FOREIGN KEY (share) REFERENCES public.directus_shares(id) ON DELETE CASCADE;


--
-- Name: directus_sessions directus_sessions_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_settings directus_settings_project_logo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_project_logo_foreign FOREIGN KEY (project_logo) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_background_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_background_foreign FOREIGN KEY (public_background) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_favicon_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_favicon_foreign FOREIGN KEY (public_favicon) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_foreground_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_foreground_foreign FOREIGN KEY (public_foreground) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_registration_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_registration_role_foreign FOREIGN KEY (public_registration_role) REFERENCES public.directus_roles(id) ON DELETE SET NULL;


--
-- Name: directus_settings directus_settings_storage_default_folder_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_storage_default_folder_foreign FOREIGN KEY (storage_default_folder) REFERENCES public.directus_folders(id) ON DELETE SET NULL;


--
-- Name: directus_shares directus_shares_collection_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_collection_foreign FOREIGN KEY (collection) REFERENCES public.directus_collections(collection) ON DELETE CASCADE;


--
-- Name: directus_shares directus_shares_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_shares directus_shares_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_users directus_users_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE SET NULL;


--
-- Name: directus_versions directus_versions_collection_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_collection_foreign FOREIGN KEY (collection) REFERENCES public.directus_collections(collection) ON DELETE CASCADE;


--
-- Name: directus_versions directus_versions_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_versions directus_versions_user_updated_foreign; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_user_updated_foreign FOREIGN KEY (user_updated) REFERENCES public.directus_users(id);


--
-- Name: event_phases event_phases_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.event_phases
    ADD CONSTRAINT event_phases_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_user_created_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_created_fkey FOREIGN KEY (user_created) REFERENCES public.directus_users(id);


--
-- Name: institutions institutions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: match_formats match_formats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_formats
    ADD CONSTRAINT match_formats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.directus_users(id);


--
-- Name: match_formats match_formats_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_formats
    ADD CONSTRAINT match_formats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: matches matches_away_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_away_participant_id_fkey FOREIGN KEY (away_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;


--
-- Name: matches matches_competition_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_competition_category_id_fkey FOREIGN KEY (competition_category_id) REFERENCES public.competition_categories(id) ON DELETE CASCADE;


--
-- Name: matches matches_home_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_home_participant_id_fkey FOREIGN KEY (home_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;


--
-- Name: news news_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.directus_users(id);


--
-- Name: news news_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: participants participants_competition_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_competition_category_id_fkey FOREIGN KEY (competition_category_id) REFERENCES public.competition_categories(id) ON DELETE CASCADE;


--
-- Name: participants participants_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: sponsors sponsors_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

