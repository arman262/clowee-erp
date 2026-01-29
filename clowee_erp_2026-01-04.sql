--
-- PostgreSQL database dump
--

\restrict vWwVqTFdyFhpuyuGR0qJn8Gh2tIRnc0pW9OY55SyEhHLgot7mpi4QOkl2dWLzOF

-- Dumped from database version 14.19 (Ubuntu 14.19-1.pgdg22.04+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: auto_generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    franchise_id_val UUID;
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        -- Get franchise_id
        IF NEW.franchise_id IS NOT NULL THEN
            franchise_id_val := NEW.franchise_id;
        ELSIF NEW.machine_id IS NOT NULL THEN
            SELECT m.franchise_id INTO franchise_id_val
            FROM machines m
            WHERE m.id = NEW.machine_id;
        END IF;
        
        NEW.invoice_number := generate_unique_invoice_number(NEW.sales_date, franchise_id_val, NEW.machine_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_generate_invoice_number() OWNER TO postgres;

--
-- Name: generate_invoice_number(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_invoice_number(p_year integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_seq INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get the next sequence number for the year
    SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '/', 3) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM sales 
    WHERE invoice_number LIKE 'clw/' || p_year || '/%';
    
    -- Format the invoice number
    invoice_num := 'clw/' || p_year || '/' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN invoice_num;
END;
$$;


ALTER FUNCTION public.generate_invoice_number(p_year integer) OWNER TO postgres;

--
-- Name: generate_unique_invoice_number(date, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_unique_invoice_number(p_sales_date date DEFAULT NULL::date, p_franchise_id uuid DEFAULT NULL::uuid, p_machine_id uuid DEFAULT NULL::uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    current_day INTEGER;
    invoice_num TEXT;
    payment_duration TEXT;
    machine_number TEXT;
    clean_machine_number TEXT;
BEGIN
    IF p_sales_date IS NULL THEN
        p_sales_date := CURRENT_DATE;
    END IF;
    
    current_year := EXTRACT(YEAR FROM p_sales_date);
    current_month := EXTRACT(MONTH FROM p_sales_date);
    current_day := EXTRACT(DAY FROM p_sales_date);
    
    -- Get machine number
    IF p_machine_id IS NOT NULL THEN
        SELECT m.machine_number INTO machine_number
        FROM machines m
        WHERE m.id = p_machine_id;
        
        -- Clean machine number: remove 'M' prefix and pad to 2 digits
        clean_machine_number := LPAD(REGEXP_REPLACE(COALESCE(machine_number, '0'), '^M', '', 'i'), 2, '0');
    ELSE
        clean_machine_number := '00';
    END IF;
    
    -- Get franchise payment duration - check both direct franchise_id and via machine
    IF p_franchise_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        WHERE f.id = p_franchise_id;
    ELSIF p_machine_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        JOIN machines m ON m.franchise_id = f.id
        WHERE m.id = p_machine_id;
    END IF;
    
    -- Debug log
    RAISE NOTICE 'Payment Duration: %, Machine: %, Date: %', payment_duration, clean_machine_number, p_sales_date;
    
    -- Generate invoice based on payment duration
    IF payment_duration = 'Half Monthly' THEN
        -- Half monthly: clw/01/2025/01H1 or clw/01/2025/01H2
        IF current_day <= 15 THEN
            invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || 'H1';
        ELSE
            invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || 'H2';
        END IF;
    ELSE
        -- Monthly: clw/01/2025/01 (month number)
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0');
    END IF;
    
    RAISE NOTICE 'Generated Invoice: %', invoice_num;
    
    RETURN invoice_num;
END;
$$;


ALTER FUNCTION public.generate_unique_invoice_number(p_sales_date date, p_franchise_id uuid, p_machine_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    franchise_id uuid,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_type character varying(100) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bank_money_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_money_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_id uuid NOT NULL,
    action_type character varying(10) NOT NULL,
    amount numeric(15,2) NOT NULL,
    transaction_date date NOT NULL,
    remarks text,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bank_money_logs_action_type_check CHECK (((action_type)::text = ANY (ARRAY[('add'::character varying)::text, ('deduct'::character varying)::text])))
);


ALTER TABLE public.bank_money_logs OWNER TO postgres;

--
-- Name: banks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bank_name character varying(255) NOT NULL,
    account_number character varying(100),
    account_holder_name character varying(255),
    branch_name character varying(255),
    routing_number character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.banks OWNER TO postgres;

--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    category_name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: franchise_agreements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.franchise_agreements (
    id uuid NOT NULL,
    franchise_id uuid,
    effective_date date,
    coin_price numeric,
    doll_price numeric,
    franchise_share integer,
    clowee_share integer,
    electricity_cost numeric,
    vat_percentage numeric,
    payment_duration character varying,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.franchise_agreements OWNER TO postgres;

--
-- Name: franchises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.franchises (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    coin_price numeric(10,2) NOT NULL,
    doll_price numeric(10,2) NOT NULL,
    electricity_cost numeric(10,2) NOT NULL,
    vat_percentage numeric(5,2),
    franchise_share numeric(5,2) NOT NULL,
    clowee_share numeric(5,2) NOT NULL,
    payment_duration character varying(50) NOT NULL,
    maintenance_percentage numeric(5,2),
    security_deposit_type character varying(100),
    security_deposit_notes text,
    agreement_copy text,
    trade_nid_copy text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_bank_id uuid,
    is_active boolean DEFAULT true
);


ALTER TABLE public.franchises OWNER TO postgres;

--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    item_id uuid,
    transaction_type character varying(50) NOT NULL,
    quantity integer NOT NULL,
    transaction_date date NOT NULL,
    related_invoice uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entry_date date NOT NULL,
    type character varying(100) NOT NULL,
    debit numeric(10,2) DEFAULT 0,
    credit numeric(10,2) DEFAULT 0,
    balance numeric(10,2),
    description text,
    reference_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: machine_counters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_counters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_id uuid,
    reading_date date NOT NULL,
    coin_counter integer NOT NULL,
    prize_counter integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


ALTER TABLE public.machine_counters OWNER TO postgres;

--
-- Name: machine_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_id uuid,
    expense_date date NOT NULL,
    expense_details text NOT NULL,
    quantity integer DEFAULT 1,
    item_price numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category_id integer,
    bank_id uuid,
    created_by uuid,
    employee_id character varying(50),
    expense_number character varying(50),
    item_name character varying(255)
);


ALTER TABLE public.machine_expenses OWNER TO postgres;

--
-- Name: machine_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_id uuid,
    bank_id uuid,
    payment_date date NOT NULL,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    invoice_id uuid,
    created_by uuid
);


ALTER TABLE public.machine_payments OWNER TO postgres;

--
-- Name: machines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_name character varying(255) NOT NULL,
    machine_number character varying(100) NOT NULL,
    esp_id character varying(100) NOT NULL,
    franchise_id uuid,
    branch_location character varying(255) NOT NULL,
    installation_date date NOT NULL,
    initial_coin_counter integer DEFAULT 0 NOT NULL,
    initial_prize_counter integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.machines OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type character varying(50) NOT NULL,
    message text NOT NULL,
    related_module character varying(50) NOT NULL,
    user_id uuid,
    status character varying(20) DEFAULT 'unread'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    franchise_id uuid,
    effective_date date NOT NULL,
    coin_price numeric(10,2),
    doll_price numeric(10,2),
    electricity_cost numeric(10,2),
    vat_percentage numeric(5,2),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_id uuid,
    franchise_id uuid,
    sales_date date NOT NULL,
    coin_sales integer NOT NULL,
    sales_amount numeric(10,2) NOT NULL,
    prize_out_quantity integer NOT NULL,
    prize_out_cost numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    invoice_number character varying(100),
    payment_status character varying(50) DEFAULT 'Due'::character varying,
    coin_adjustment integer DEFAULT 0,
    prize_adjustment integer DEFAULT 0,
    adjustment_notes text,
    vat_amount numeric(10,2) DEFAULT 0,
    net_sales_amount numeric(10,2) DEFAULT 0,
    clowee_profit numeric(10,2) DEFAULT 0,
    pay_to_clowee numeric(10,2) DEFAULT 0,
    created_by uuid,
    amount_adjustment numeric(10,2) DEFAULT 0,
    electricity_cost numeric(10,2) DEFAULT 0
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: COLUMN sales.amount_adjustment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sales.amount_adjustment IS 'Small amount adjustment to handle payment differences (e.g., client pays 12400 instead of 12404)';


--
-- Name: stock_out_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_out_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    out_date date NOT NULL,
    machine_id uuid,
    item_id uuid,
    quantity integer NOT NULL,
    remarks text,
    handled_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    adjustment_type character varying(50),
    category character varying(100),
    item_name character varying(255),
    unit_price numeric(10,2),
    total_price numeric(10,2)
);


ALTER TABLE public.stock_out_history OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    franchise_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    first_name character varying(255),
    last_name character varying(255),
    username character varying(255),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('user'::character varying)::text, ('spectator'::character varying)::text, ('super_admin'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, franchise_id, file_name, file_url, file_type, file_size, mime_type, uploaded_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, table_name, record_id, action, old_data, new_data, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: bank_money_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_money_logs (id, bank_id, action_type, amount, transaction_date, remarks, created_by, created_at, updated_at) FROM stdin;
a6c95c17-7bf8-4f61-b550-9d570593709b	841a7673-e6b8-4f07-9d2a-5f14ee159df6	add	341911.00	2025-10-26	27 Oct 2025 \nNCC Bank balance from google sheet - 403322 taka\nClowee ERP balance is - 61411 taka\nBalance: 403322-61411= 341911	\N	2025-10-27 17:38:24.234778	2025-10-27 17:38:24.234778
82e30030-f3a1-45b5-930a-016b19f44d17	8c018b67-1073-45ce-af3b-4c2cf980badc	deduct	92878.00	2025-12-21	105185-12307 tk = 92878	12ad4585-93b8-4559-b76b-9b4ff2dabc9a	2025-12-21 12:44:14.799198	2025-12-21 12:44:14.799198
d9f807a4-6459-4c3c-a765-58d4351740d7	d2fabda9-ee77-4536-a783-67d66406889a	add	215037.87	2025-12-21	187990+47047 tk= 235037.87	12ad4585-93b8-4559-b76b-9b4ff2dabc9a	2025-12-21 12:45:18.831409	2025-12-21 12:45:18.831409
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banks (id, bank_name, account_number, account_holder_name, branch_name, routing_number, is_active, created_at) FROM stdin;
841a7673-e6b8-4f07-9d2a-5f14ee159df6	NCC Bank	00120210025913	I3 Technologies	Gulshan Branch	160261721	t	2025-10-06 08:05:45.735694+00
d2fabda9-ee77-4536-a783-67d66406889a	Cash	Cash				t	2025-10-06 08:05:58.574379+00
8c018b67-1073-45ce-af3b-4c2cf980badc	MDB Bank	00111050008790	I3 TECHNOLOGIES	Gulshan Branch	285261727	t	2025-09-27 18:29:48.525882+00
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, category_name, description, is_active, created_at, updated_at) FROM stdin;
9	Local Accessories		t	2025-10-09 16:22:41.259371	2025-10-09 16:22:41.259371
10	Conveyance		t	2025-10-09 16:22:54.93711	2025-10-09 16:22:54.93711
11	Employee Salary		t	2025-10-09 16:23:02.783653	2025-10-09 16:23:02.783653
12	Factory Rent		t	2025-10-09 16:23:16.332898	2025-10-09 16:23:16.332898
15	Server Bill		t	2025-10-09 16:23:56.991701	2025-10-09 16:23:56.991701
16	HR & Admin Cost		t	2025-10-09 16:24:08.702513	2025-10-09 16:24:08.702513
17	Prize Delivery Cost		t	2025-10-09 16:24:21.032248	2025-10-09 16:24:21.032248
18	Prize Purchase		t	2025-10-09 16:24:26.545548	2025-10-09 16:24:26.545548
19	Carrying Cost		t	2025-10-09 16:24:36.802003	2025-10-09 16:24:36.802003
20	Import Accessories		t	2025-10-09 16:24:46.26095	2025-10-09 16:24:46.26095
22	Profit Share(Share Holders)	Amount Deduct from NCC Bank	t	2025-10-12 14:55:48.569558	2025-10-12 14:55:48.569558
23	Office Rent 		t	2025-10-22 18:58:19.433001	2025-10-22 18:58:19.433001
\.


--
-- Data for Name: franchise_agreements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.franchise_agreements (id, franchise_id, effective_date, coin_price, doll_price, franchise_share, clowee_share, electricity_cost, vat_percentage, payment_duration, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: franchises; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.franchises (id, name, coin_price, doll_price, electricity_cost, vat_percentage, franchise_share, clowee_share, payment_duration, maintenance_percentage, security_deposit_type, security_deposit_notes, agreement_copy, trade_nid_copy, created_at, updated_at, payment_bank_id, is_active) FROM stdin;
45f8ecfd-161e-476c-80eb-ad4655cdb752	The Dinning Lounge\t	25.00	130.00	337.50	0.00	50.00	50.00	Monthly	\N	\N	\N	\N	{}	2025-10-12 12:37:26.623+00	2025-10-17 18:17:29.631+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
29248edb-d4a3-4a78-9800-a10f60ad3488	PizzaBurg	25.00	130.00	0.00	0.00	60.00	40.00	Monthly	\N	\N	\N	\N	{}	2025-10-12 04:47:58.31+00	2025-10-12 04:47:58.31+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
01e5be66-b965-4adb-bc9a-2cfa16954161	Baily Deli\t	25.00	110.00	0.00	5.00	50.00	50.00	Half Monthly	5.00	\N	\N	\N	{}	2025-10-12 12:49:18.478+00	2025-10-13 09:10:00.275+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
cd9b585a-fefd-44bf-a97e-7d9b3624126d	The Cafe Rio 	25.00	150.00	250.00	5.00	50.00	50.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-12 05:35:35.788+00	2025-10-13 12:23:23.192+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
643bfd3f-24b6-491c-bed7-2d7d17968924	Fino 	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 10:56:16.927+00	2025-10-16 06:42:13.938+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
5ff5d038-a23e-431e-a26c-e98a0bcac2ed	ChefMate Lounge	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 11:43:46.795+00	2025-11-16 06:49:42.441+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
c754765f-279d-4800-88dd-c08b89803b36	Keedlee	25.00	150.00	0.00	0.00	50.00	50.00	Half Month	10.00	\N	\N	\N	{}	2025-10-13 10:53:12.682+00	2025-10-16 07:06:38.88+00	841a7673-e6b8-4f07-9d2a-5f14ee159df6	t
c41a6043-e460-480b-a569-430c96d00541	Crush Station	25.00	140.00	0.00	0.00	50.00	50.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-13 10:48:50.617+00	2025-10-16 07:11:50.577+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	Food Rail	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 11:31:57.469+00	2025-10-16 10:34:36.283+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
c9168bd5-0b15-49dc-9a35-cc5b52535600	Shang High	30.00	150.00	0.00	0.00	40.00	60.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-13 10:54:31.972+00	2025-10-16 10:34:44.315+00	841a7673-e6b8-4f07-9d2a-5f14ee159df6	t
ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	Fuoco	25.00	130.00	78.25	0.00	50.00	50.00	Half Monthly	5.00	\N	\N	\N	{}	2025-10-13 10:52:19.237+00	2025-10-16 10:34:53.581+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
3002befd-50db-4aca-964e-9476d0521850	Kolapata Burger	25.00	140.00	0.00	0.00	50.00	50.00	Half Monthly	5.00	\N	\N	https://erp.tolpar.com.bd/uploads/1761654997165-Kalapata_Aug_Partnership_Agreement_Clowee_pagesetup.pdf	{}	2025-10-16 05:22:28.99+00	2025-10-28 12:36:41.374+00	8c018b67-1073-45ce-af3b-4c2cf980badc	t
9f092d84-60ed-481b-9466-ec5862e4acf9	MadChef 	25.00	150.00	168.00	0.00	40.00	60.00	Half Monthly	\N	\N	\N	https://erp.tolpar.com.bd/uploads/1761655068924-MadChef Baily Road Agreement.pdf	{"http://202.59.208.112:3008/uploads/1761655080728-CamScanner 10-28-2025 18.21 (1).jpg","http://202.59.208.112:3008/uploads/1761655080738-CamScanner 10-28-2025 18.21.jpg"}	2025-10-28 12:37:28.704+00	2025-11-16 08:14:07.153+00	841a7673-e6b8-4f07-9d2a-5f14ee159df6	t
9bbb9704-569c-4293-bbf8-df983d8ed37b	Mr Manik Food 	25.00	140.00	0.00	0.00	50.00	50.00	Monthly	10.00	\N	\N	\N	{}	2025-10-13 11:45:50.089+00	2025-11-28 16:28:04.312+00	\N	f
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, item_id, transaction_type, quantity, transaction_date, related_invoice, notes, created_at) FROM stdin;
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, entry_date, type, debit, credit, balance, description, reference_id, created_at) FROM stdin;
\.


--
-- Data for Name: machine_counters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_counters (id, machine_id, reading_date, coin_counter, prize_counter, notes, created_at, created_by) FROM stdin;
4747d147-e0ee-40d3-9924-e65918e3294c	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-10-31	40014	3117		2025-11-02 06:05:30.855001+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f348b1d2-0c23-472d-8b5f-7b27731a2f1e	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-10-31	21651	1538		2025-11-02 06:09:08.565975+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
99fc6762-7f9f-422d-807b-fa9d19522004	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-09-30	35353	3150		2025-10-12 04:51:51.819367+00	\N
05b876e1-4ac1-4564-ac4b-a5304a96a9de	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-09-30	4748	2206		2025-10-12 05:10:22.022137+00	\N
d5625581-c3c6-442e-98c7-aef5b1c7b588	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-09-30	49198	2935		2025-10-12 05:16:41.167682+00	\N
26b73420-e01f-4f70-abc3-47d79aa72f45	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-09-30	53791	3491		2025-10-12 05:42:32.931121+00	\N
96b5415d-590d-44bc-9179-252e4a2123eb	3869bce6-8e5d-4e64-9197-24400000d168	2025-09-30	13352	6894		2025-10-12 12:52:32.023729+00	\N
78ea3608-70a2-4fad-9b2e-581f7dcc7704	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-09-30	20824	1423		2025-10-14 04:49:37.34701+00	\N
cdf8e3e4-7880-48fa-b885-affd650d0b3f	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-09-30	52434	3667		2025-10-14 04:59:08.064458+00	\N
976cd2d7-fff5-4429-ba9f-2e9bae9af9ae	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-09-30	14410	42493		2025-10-14 05:01:25.419586+00	\N
27055443-8d1a-41bb-9ded-f37ad958b136	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-09-30	16109	2189		2025-10-14 05:02:14.921282+00	\N
82659336-a65b-4797-ad28-f4a1c01a4242	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-09-30	25842	1619		2025-10-14 05:02:46.524782+00	\N
88305ebe-56c3-436e-8fda-8c5d44314d29	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-09-30	20126	1253		2025-10-14 05:12:57.311241+00	\N
c956e914-bdc5-42a0-b925-d0758301961d	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-09-30	36582	2956		2025-10-14 05:13:32.775364+00	\N
a96efe7b-570e-4eaf-a5a8-e5d9829657b3	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-09-30	13070	1406		2025-10-14 05:14:10.212464+00	\N
08574b1d-c896-4f81-9b44-07bdb407b7f6	277b890a-f8fe-4cb2-a106-066731d848e3	2025-09-30	9694	1326		2025-10-14 05:38:21.19013+00	\N
b54938dc-6981-41ef-b270-34cbbfa7dcda	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-09-30	424	16		2025-10-14 05:43:02.04616+00	\N
0455025f-9857-4945-a33a-d2f4a97debb1	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-09-30	6412	1939		2025-10-14 05:50:34.183366+00	\N
987b7f85-9489-4f83-a8b2-a170dce45864	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-09-30	1837	806		2025-10-14 05:53:26.454391+00	\N
796aa512-8a07-4465-966a-0c71be9825a3	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-09-30	16962	997		2025-10-14 05:54:24.863799+00	\N
07c66665-11c7-4da4-9c36-9b1e4a879cda	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-09-30	6885	1788		2025-10-14 06:04:06.805592+00	\N
fcb5966d-81ef-4833-8f0b-27524963159c	d3e8eb14-b460-4f82-b334-790165c2a922	2025-09-30	6160	2114		2025-10-14 06:04:35.476399+00	\N
20737c2d-6235-4e2c-908c-8e87f2c7a55a	1885a455-019b-43d3-80e6-7a4fcc1e1232	2025-09-30	10236	24648		2025-10-14 06:26:43.351096+00	\N
5c48977c-5e1d-4383-8bef-19adf486cdf5	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-10-15	16318	2199		2025-10-16 04:32:16.231479+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
a3980e05-b30e-486c-8f9e-16a76e283221	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-09-30	18009	1053		2025-10-16 05:27:30.150351+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
d64bb0c1-e420-4d1e-9422-20b76ba01cbf	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-10-15	698	35		2025-10-16 05:31:52.260525+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
fb526ac8-0481-4526-b275-beffaffc381c	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-15	56547	3635		2025-10-16 06:08:58.231878+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
2c98c10e-a154-4254-ba21-a091e2528a2f	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-10-15	6734	1949		2025-10-16 06:38:34.289218+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
b4313bef-3ac5-4e01-8007-3fbe92459961	3869bce6-8e5d-4e64-9197-24400000d168	2025-10-15	15115	6938		2025-10-16 07:34:21.914608+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
30efc8f4-eb5c-4fa6-b390-5f493b0ce8a5	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-10-15	18292	1058		2025-10-16 07:54:44.695707+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
5669d5a6-b81d-4f54-97aa-d1a9bc2ec36f	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-10-15	52749	3689		2025-10-16 07:56:42.010521+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
000ce0b9-428c-4794-bcd9-97f9fcbd152b	277b890a-f8fe-4cb2-a106-066731d848e3	2025-10-15	9837	1337		2025-10-16 09:33:27.861355+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
11e392fe-c2d3-473e-9556-58fa9374b706	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-10-15	26220	1644		2025-10-16 09:41:20.320053+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
dd5b2507-b5df-437e-a66a-209580bd05fd	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-10-15	469	38		2025-10-16 09:49:40.539576+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
9171d100-621e-4898-80e4-1c7e1759869d	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-10-15	21340	1508		2025-10-16 10:55:46.046878+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
5e56711a-4ee1-44d1-a7cf-fbb7dc7695c8	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-10-15	3097	959		2025-10-19 05:53:04.974057+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
6b53703a-c9f4-437a-bef5-14076bc9b656	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-10-15	2509	830		2025-10-19 06:08:56.057547+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
ad3d9615-3d72-4df5-9b51-e4eb1445f5a6	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-10-31	26481	1657		2025-11-02 07:02:19.310669+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c90d7a6a-33be-4604-b43e-fb49e92e5484	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-10-15	17380	1006		2025-10-19 06:29:24.64463+00	b61a9829-5b43-41bc-b09a-3d74a0e05767
f83f5c22-73fb-4530-85c5-ace922ffd236	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-10-15	7135	1795		2025-10-19 10:00:09.544567+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
aae8a08b-a40b-4de1-95eb-4018b83357e5	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-09-30	2824	940		2025-10-20 10:35:36.749509+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
7e1b0ddb-dfbf-433a-a716-bec90b33e51d	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-10-15	14813	42507		2025-10-20 10:58:32.036836+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
1ca9927e-3919-49b7-8779-50586c9495a2	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-09-30	37348	3043		2025-10-21 09:48:51.916596+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9c7f812d-1168-471f-8181-d91c2e63ee8c	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-10-15	39162	3095		2025-10-21 09:49:30.143091+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
1515a0c1-8969-494e-b5d7-f264cb6fb950	277b890a-f8fe-4cb2-a106-066731d848e3	2025-10-31	10010	1343		2025-11-02 04:31:38.195465+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5e3da6df-5988-41a1-bdc4-7e9f66942e7f	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-31	59379	3802		2025-11-02 04:36:59.970695+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
58347684-1ced-4484-b8c0-84c5d4188bc9	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-10-31	53139	3717		2025-11-02 07:04:10.270748+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b00aa8c7-931c-4829-a68a-74e4cbc506ff	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-10-31	15190	42521		2025-11-02 07:05:03.407352+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f2d80fd9-2ee1-4825-afb5-7f3fe72583bd	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-10-31	1082	67		2025-11-02 07:11:07.192536+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
75e41f0d-c402-4fad-8069-d71c07e0775a	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-10-31	7112	1957		2025-11-02 07:21:05.780207+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
7b438d12-29e8-4e60-87b0-1bfa26bb1618	1885a455-019b-43d3-80e6-7a4fcc1e1232	2025-10-31	10592	24671		2025-11-02 07:26:40.78459+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c595b683-54ed-4e8a-8d3b-9d0a6d902d68	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-10-31	669	49		2025-11-02 07:32:08.251351+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ff1bed34-cf04-4c5f-9743-25f89bfc9283	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-10-31	2982	836		2025-11-02 08:17:18.994094+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
2889a7f7-3654-47e8-b1ef-522b93d60ba0	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-10-31	17904	1019		2025-11-02 08:17:48.555116+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c026be0b-84ab-46fb-912e-f11ce27b45be	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-09-30	26727	1973		2025-11-02 09:57:46.297186+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ca8d7dc9-c1d4-4922-8416-1e8459de7b53	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-10-30	27286	2000		2025-11-02 09:58:17.598436+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d003bd35-5af3-40f0-a2a6-967de47fde01	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-10-31	13341	1437		2025-11-02 10:08:10.518913+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
32505381-3e2f-4012-83b1-f0df3b62e0bc	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-10-31	20747	1290		2025-11-02 10:08:41.513376+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f429a73a-7cc6-4bc9-813f-77ed55d5a393	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-10-31	37451	3021		2025-11-02 10:09:46.760699+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f98f8b94-f2a9-482c-a2a1-c34bf1fcff3c	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-10-31	7583	1811		2025-11-02 10:39:29.73829+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
69bc6c68-33ff-4c05-9cba-b58ac83836a2	3869bce6-8e5d-4e64-9197-24400000d168	2025-10-31	17003	7033		2025-11-02 10:53:59.83479+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d223d534-7b82-4e37-bc01-d424bb63859b	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-10-31	18511	1065		2025-11-02 12:18:25.293765+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5f622409-0a55-4a01-a69f-3ca5b3077671	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-10-31	16735	2222		2025-11-03 12:13:10.713061+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
2cb02e2b-0301-42e9-ad40-fbb34bcd2058	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-10-31	36509	3222		2025-11-03 12:55:36.460883+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
84dff9f2-d63e-4b24-8560-e4d90903911e	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-10-31	5654	2241		2025-11-03 12:56:09.437807+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c072f8db-cb07-4063-9276-5672463e1e1f	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-10-31	51297	3028		2025-11-03 13:03:11.220974+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
89f2d3b9-85e9-46cd-a43b-4b0f6426b26e	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-10-31	3532	976		2025-11-04 05:07:00.99204+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f2f4aa1d-a18d-4d42-adb2-7541f712ba61	1885a455-019b-43d3-80e6-7a4fcc1e1232	2025-11-12	10747	24683		2025-11-12 10:06:41.131549+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
36eb485c-9196-4a88-9b8c-d03f4a7af007	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-11-15	15502	42529		2025-11-16 04:42:36.187402+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
4dbc8c2c-b022-4715-976f-e28a7e15e05d	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-11-15	17016	2233		2025-11-16 04:37:59.716888+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c80ed5a8-c033-4ecc-9c19-fe663318ac5b	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-11-15	1446	97		2025-11-16 04:54:01.786173+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
73c6437f-d00e-4b11-a4a9-95b51294d674	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-11-15	7447	1964		2025-11-16 05:31:06.672253+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
98ca76b9-752d-4c8a-9f10-b8de1afedbdb	d5a1699b-e816-4560-b055-433d69949c23	2025-11-15	825	628		2025-11-16 05:49:04.55539+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
84e19dbb-78af-4f97-a2e9-bc4e0e6228cb	277b890a-f8fe-4cb2-a106-066731d848e3	2025-11-15	10217	1349		2025-11-16 06:08:33.611881+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d2019fb2-3ba5-47ab-807a-9fa274ab4a17	3869bce6-8e5d-4e64-9197-24400000d168	2025-11-15	18440	7088		2025-11-16 06:28:35.973423+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0da77ff7-8374-4554-9976-e6227a76d30b	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-11-15	40914	3139		2025-11-16 07:12:46.354972+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d2117aaf-8bf4-4385-a85f-79536b66ccf1	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-11-15	22079	1606		2025-11-16 07:12:07.71473+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b04f00bf-2dc6-4ddb-9f63-b146401e5d40	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-11-15	18888	1071		2025-11-16 08:31:11.471099+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
900b813b-8130-4507-adf4-101492ddd1e6	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-11-15	1013	61		2025-11-16 08:36:00.079363+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0550195e-d072-4d11-8f6a-68fa0ce688f8	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-11-15	61623	3948		2025-11-16 12:23:06.012245+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
71ea6d80-ff6d-4c03-ab18-136bd46fb996	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-11-15	26661	1669		2025-11-16 12:53:13.318784+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
1b0fb652-e907-445c-8eb8-bb7f4cf03bd1	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-11-15	53334	3731		2025-11-17 05:27:22.837673+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
977340cd-8936-4719-a1ab-ad01fe7fb20f	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-11-15	3339	849		2025-11-17 05:52:54.932381+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
64c63cd9-3f7d-4fd3-be05-8bfca61d6a68	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-11-15	18610	1044		2025-11-17 05:53:45.522016+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f771f962-9751-4eae-a4b7-4e2bbce50811	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-11-15	7844	1821		2025-11-17 10:21:16.193186+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9383b9a9-2666-4dc1-8006-8be920343815	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-11-15	3914	991		2025-11-19 07:43:32.238223+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a058fe01-5374-4217-b292-17d277cbb10d	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-11-30	63360	4047		2025-12-01 09:14:03.185485+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0feacd6c-1882-453a-a437-8a7f9188e955	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-11-30	41812	3173		2025-12-01 09:52:07.099273+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d77580c3-aa7a-4ae1-b299-d4de62ae2377	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-11-30	22261	1628		2025-12-01 09:56:02.33058+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ce949fc4-416e-48fd-af19-7c33dac5508e	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-11-30	15766	42537		2025-12-02 06:50:05.055426+00	eb521af0-7f91-4dc5-9b13-70094e501da3
83e449fb-3fc3-43c6-b6fc-b887c1b12670	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-11-30	53496	3743		2025-12-02 06:57:54.399858+00	eb521af0-7f91-4dc5-9b13-70094e501da3
05355e04-822a-4941-a251-679ea2b7074a	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-11-30	17248	2250		2025-12-02 06:59:44.346656+00	eb521af0-7f91-4dc5-9b13-70094e501da3
c7cd06ac-cb7b-4321-bbd5-e3fff196ecb2	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-11-30	26865	1680		2025-12-02 07:04:45.039693+00	eb521af0-7f91-4dc5-9b13-70094e501da3
facc18ba-cfc7-44a3-93e7-aee0717b8a97	d5a1699b-e816-4560-b055-433d69949c23	2025-11-30	1573	661		2025-12-02 07:10:10.075227+00	eb521af0-7f91-4dc5-9b13-70094e501da3
2319d6fa-3403-4f95-8fdc-7ebe5db217ba	277b890a-f8fe-4cb2-a106-066731d848e3	2025-11-30	10435	1359		2025-12-02 07:18:32.628027+00	eb521af0-7f91-4dc5-9b13-70094e501da3
6e69c3ce-eed3-4721-8272-f1fa4ca63be7	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-11-30	1578	111		2025-12-02 07:22:28.705768+00	eb521af0-7f91-4dc5-9b13-70094e501da3
e2c9a2a7-9196-4d07-a6bb-f579e25d6e1c	3869bce6-8e5d-4e64-9197-24400000d168	2025-11-30	19374	7136		2025-12-02 07:27:12.895682+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
42b3553b-87f6-4832-9115-f4e66a4618e8	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-11-30	27561	2015		2025-12-02 07:27:52.061005+00	eb521af0-7f91-4dc5-9b13-70094e501da3
e7e1afde-5898-4648-bd52-886a70d58430	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-11-30	21152	1309		2025-12-02 07:32:12.93607+00	eb521af0-7f91-4dc5-9b13-70094e501da3
057ca2c0-6e12-43a4-ad1c-23684978229c	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-11-30	38126	3069		2025-12-02 07:35:23.413415+00	eb521af0-7f91-4dc5-9b13-70094e501da3
e4625203-fee2-445e-9f36-2579618095ae	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-11-30	13400	1446		2025-12-02 07:38:05.589646+00	eb521af0-7f91-4dc5-9b13-70094e501da3
590aba30-e2b8-41a6-9878-16d11567dd3b	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-11-30	13400	1446		2025-12-02 07:39:13.512715+00	eb521af0-7f91-4dc5-9b13-70094e501da3
7a3cec9a-c331-4347-b327-7acb5dc615a7	33a1a534-951a-4f86-a832-188fa5117b57	2025-11-30	11333	24730		2025-12-02 07:42:43.880507+00	eb521af0-7f91-4dc5-9b13-70094e501da3
6a87875a-37fb-4602-b253-6162251b1916	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-11-30	19142	1080		2025-12-02 08:42:48.105488+00	eb521af0-7f91-4dc5-9b13-70094e501da3
c857707e-f6f2-4123-9688-687c5adc9a83	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-11-30	8104	1833		2025-12-02 08:46:56.813974+00	eb521af0-7f91-4dc5-9b13-70094e501da3
0583c264-b1b8-475c-bb70-7e85893e742f	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-11-30	7753	1968		2025-12-02 08:51:05.69114+00	eb521af0-7f91-4dc5-9b13-70094e501da3
15a3ca1c-4218-4b43-9286-208cf6694425	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-11-30	1198	72		2025-12-02 08:56:21.120568+00	eb521af0-7f91-4dc5-9b13-70094e501da3
0ec98133-7cef-4722-9ccf-770d936265ac	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-11-30	52596	3083		2025-12-02 09:55:31.208269+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
844be2f3-da1d-4e0e-b5aa-40d50a0edfa3	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-11-30	6659	2290		2025-12-03 11:20:39.391242+00	eb521af0-7f91-4dc5-9b13-70094e501da3
35ade8d7-04b2-45b4-90ee-5932f7860aa6	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-11-30	37403	3234		2025-12-03 11:26:25.20925+00	eb521af0-7f91-4dc5-9b13-70094e501da3
54dc8bd9-8ead-444d-9807-b4221ecb0fae	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-11-30	3721	856		2025-12-03 11:32:18.237053+00	eb521af0-7f91-4dc5-9b13-70094e501da3
8e1d0a9d-c16e-4f92-9f19-4865c762d2ac	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-11-30	19033	1055		2025-12-03 11:32:56.42758+00	eb521af0-7f91-4dc5-9b13-70094e501da3
1411bc58-f9c1-47e0-8667-f975b2a66e7b	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-11-30	4332	1007		2025-12-04 11:36:07.840751+00	eb521af0-7f91-4dc5-9b13-70094e501da3
bb9b81d1-2c1a-4420-aea7-bc2db0cbc34f	d3e8eb14-b460-4f82-b334-790165c2a922	2025-10-15	6232	2115		2025-12-10 06:24:01.463873+00	eb521af0-7f91-4dc5-9b13-70094e501da3
b705e742-4ff3-4022-9733-c76692d0eb10	d3e8eb14-b460-4f82-b334-790165c2a922	2025-10-31	6355	2118		2025-12-10 06:20:12.546877+00	eb521af0-7f91-4dc5-9b13-70094e501da3
0d25c6ca-9b6f-4b9a-9fdc-4af2f6ababe3	d3e8eb14-b460-4f82-b334-790165c2a922	2025-11-30	6799	2123	1-30 Nov together	2025-12-10 07:18:55.306324+00	eb521af0-7f91-4dc5-9b13-70094e501da3
5aced838-587a-4b92-ae2b-3e93486c116c	277b890a-f8fe-4cb2-a106-066731d848e3	2025-12-15	10684	1369		2025-12-17 09:22:56.971166+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
cc8736f2-5c06-42f5-90a1-3bb07fed47f8	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-12-15	53734	3760		2025-12-17 11:00:45.45001+00	eb521af0-7f91-4dc5-9b13-70094e501da3
63321747-a5f1-4ee3-8734-fe1e860cf175	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-12-15	27057	1693		2025-12-17 11:05:57.487077+00	eb521af0-7f91-4dc5-9b13-70094e501da3
8ac48836-d6de-4824-abcf-9edaaa2ec605	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-12-15	16026	42547		2025-12-17 11:12:38.47563+00	eb521af0-7f91-4dc5-9b13-70094e501da3
0503ff28-8ba2-4848-b6ec-b4d25a2add04	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-12-15	17493	2269		2025-12-17 11:18:06.115878+00	eb521af0-7f91-4dc5-9b13-70094e501da3
f4c1f382-5082-4737-81ee-55e926397c7c	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-12-15	762	43		2025-12-17 11:23:10.689949+00	eb521af0-7f91-4dc5-9b13-70094e501da3
9179b258-5429-49f3-985b-617af81d6ee6	33a1a534-951a-4f86-a832-188fa5117b57	2025-12-15	11787	24755		2025-12-17 11:29:17.682367+00	eb521af0-7f91-4dc5-9b13-70094e501da3
c403c904-109b-4001-9814-57f74c812bd4	d5a1699b-e816-4560-b055-433d69949c23	2025-12-15	2478	712		2025-12-17 11:35:12.990522+00	eb521af0-7f91-4dc5-9b13-70094e501da3
ff854980-6eae-4a04-8d27-c671f221dad5	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-15	65432	4176		2025-12-17 11:58:16.538814+00	eb521af0-7f91-4dc5-9b13-70094e501da3
171c7d13-a1f2-41fe-8cf7-ddbc8d3267d8	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-12-15	22645	1651		2025-12-17 12:07:32.221204+00	eb521af0-7f91-4dc5-9b13-70094e501da3
3671327f-9cbb-4ce2-994a-70bae3cd8232	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-12-15	1350	80		2025-12-17 12:27:40.82704+00	eb521af0-7f91-4dc5-9b13-70094e501da3
e0840e23-7f6f-45ca-8c98-0d2f84885bc8	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-12-15	1700	121		2025-12-17 12:32:56.941466+00	eb521af0-7f91-4dc5-9b13-70094e501da3
83cdfd46-dfa0-4d52-94b8-390e85d8d091	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-12-15	8172	1978		2025-12-17 12:36:28.131923+00	eb521af0-7f91-4dc5-9b13-70094e501da3
15604941-3313-4ac7-815f-17fd408e5021	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-15	21315	7262		2025-12-17 12:51:17.802044+00	eb521af0-7f91-4dc5-9b13-70094e501da3
3fb506a0-d5f4-48c9-9b24-f28c7f0c636e	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-12-15	4412	1010		2025-12-17 13:07:25.205322+00	eb521af0-7f91-4dc5-9b13-70094e501da3
392e9263-22f6-4be0-aa22-30a6d05487fb	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-12-15	8422	1840		2025-12-17 13:15:29.135902+00	eb521af0-7f91-4dc5-9b13-70094e501da3
0b5ac7b5-3dc8-4013-9c82-90e42c9f8510	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-12-15	19411	1088		2025-12-17 15:19:24.292391+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
6f61d5e3-0773-4552-bc06-d92e3247167a	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-12-15	4181	884		2025-12-18 07:07:27.511597+00	eb521af0-7f91-4dc5-9b13-70094e501da3
37669941-f9a3-4318-9412-ff11ab7138da	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-12-15	19449	1099		2025-12-18 07:14:02.022454+00	eb521af0-7f91-4dc5-9b13-70094e501da3
decf454c-f3ba-477c-b8eb-75b0c51aa2fd	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-12-18	42758	3220		2025-12-18 12:09:40.922055+00	eb521af0-7f91-4dc5-9b13-70094e501da3
866daa0c-efa8-406f-a694-8d01e13388c1	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-12-31	17738	2284		2026-01-01 04:24:10.742891+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
20e2e007-1793-48da-9445-0545893fe8df	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-12-31	1626	91		2026-01-01 04:45:50.225323+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fc13edda-d50a-4c3b-90ea-3c96b9471984	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-12-31	8723	1993		2026-01-01 05:08:23.946077+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
6a09e1e3-e6b7-4176-8ab4-c7f7893d05e9	33a1a534-951a-4f86-a832-188fa5117b57	2025-12-31	12313	24789		2026-01-01 05:27:26.451858+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
8e2201c8-e0ef-40d3-ac05-377bcefdc75e	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-12-31	1025	65		2026-01-01 05:46:03.696466+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5d6afb17-c4b3-42ec-bfc4-b17df0a368ad	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-31	23041	7368		2026-01-01 06:11:44.591038+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
27c20ba4-39df-4015-b047-c1b415abe623	d5a1699b-e816-4560-b055-433d69949c23	2025-12-31	3328	754		2026-01-01 06:13:17.167488+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
52571908-c31a-47af-9dd1-9b28943c53fb	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-12-31	43895	3282		2026-01-01 06:37:12.489904+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
56ac9528-56d5-4ee2-8182-c973c9d850f7	277b890a-f8fe-4cb2-a106-066731d848e3	2025-12-31	10915	1389		2026-01-01 06:41:17.632151+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a7459542-0a2d-4ff1-827f-e8e686445cb2	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2026-01-01	19688	1096		2026-01-01 06:46:04.497261+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fa2aecf8-dd21-4db1-9c65-2b959055a7bc	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-12-31	27922	2040		2026-01-01 07:00:19.600199+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9ad99017-3af8-403d-a366-4c465f4a7473	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-12-31	16420	42555		2026-01-01 07:35:59.069597+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
db6fdd11-8d4e-4398-a645-6c3c28133045	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-31	68664	4363		2026-01-01 07:42:45.944588+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fa67ca60-c71d-4f9a-8577-cf03718d65ab	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-12-31	1861	134		2026-01-01 08:14:50.627143+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c4f6aaee-ad29-431b-b942-00da75662000	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-12-31	38658	3103		2026-01-01 09:23:53.085118+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
07f10992-f9d9-4627-badb-a04071b0f244	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-12-31	13514	1454		2026-01-01 09:29:16.310603+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
49c830d0-04cb-4b23-9cb4-52ffe6c9f757	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-12-31	27236	1698		2026-01-01 09:37:16.488898+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
249871f4-afc4-4820-a26c-627028c2e5ad	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-12-31	21547	1336		2026-01-01 10:29:46.799022+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
4a3a6b50-9734-475c-9f0f-6e72528582f4	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-12-31	54675	3195		2026-01-01 11:03:32.383846+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d6ce62ac-ef3c-4d46-a7fe-a242e4dbd338	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-12-31	8747	1846		2026-01-01 12:45:56.316363+00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ac8a0a6a-0ddf-4218-a950-d2d3a573345a	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-12-31	53931	3774		2026-01-04 06:20:47.078812+00	eb521af0-7f91-4dc5-9b13-70094e501da3
1374f485-3180-4bf6-9092-a94a962ee842	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-12-31	53931	3774		2026-01-04 06:26:38.421161+00	eb521af0-7f91-4dc5-9b13-70094e501da3
ee2011e3-e278-4e00-add9-a779c7377eb5	d3e8eb14-b460-4f82-b334-790165c2a922	2025-12-31	6828	2124		2026-01-04 07:11:33.984293+00	eb521af0-7f91-4dc5-9b13-70094e501da3
e70a32e9-08a3-4730-b837-c08555996002	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-12-31	38823	3292		2026-01-04 08:56:56.667492+00	eb521af0-7f91-4dc5-9b13-70094e501da3
\.


--
-- Data for Name: machine_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_expenses (id, machine_id, expense_date, expense_details, quantity, item_price, total_amount, created_at, category_id, bank_id, created_by, employee_id, expense_number, item_name) FROM stdin;
10574f5c-fdc4-406d-a39d-7ee05e2bebfa	\N	2025-09-01	Salary- Office Boy- Rezaul Karim - Sep 2025	1	3000.00	3000.00	2025-10-24 18:16:07.858391+00	11	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	10021	clw-ex-0039	\N
27ecfc02-2e71-4ff1-a8db-02c78659bd63	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-10-26	Expense	50	100.00	5000.00	2025-10-26 11:05:53.527801+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0040	\N
e858d33a-5f96-4e5d-8a2b-5a409991fb06	\N	2025-09-30	Expense	1	13998.00	13998.00	2025-10-22 07:50:36.380832+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0002	\N
b596455a-2404-4d59-bfdb-517ef10d6836	\N	2025-09-30	Utility bills (3:1)	1	4323.00	4323.00	2025-10-22 13:00:14.648728+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0024	\N
68d12eea-373b-4369-b455-8fe2ae0513ea	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-10-27	Expense	100	100.00	10000.00	2025-10-27 11:52:32.322718+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0042	\N
66c2c0a3-f52b-4f28-8768-7b91211e5dfb	3869bce6-8e5d-4e64-9197-24400000d168	2025-10-06	Expense	100	100.00	10000.00	2025-10-27 12:00:17.969815+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0044	\N
b50d83db-b930-455d-ae76-e33167799f19	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-27	Expense	100	100.00	10000.00	2025-10-27 12:00:56.728583+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0046	\N
4c2bd39d-9433-4a90-aa2f-7a48a6e45906	\N	2025-10-27	Rezaul vai Conveyance	1	4180.00	4180.00	2025-10-27 12:08:53.379091+00	10	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0048	\N
b676e7ce-15c7-48ca-a1d7-c3c06adec0ba	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-10-28	Expense	50	100.00	5000.00	2025-10-28 11:49:49.957406+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0050	\N
bde9ca0b-c3c4-4de1-9e10-163af10fd6d9	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-11-03	Expense	100	100.00	10000.00	2025-11-03 11:55:20.141807+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0052	\N
11eaa642-5389-4272-8ebd-872638ac3525	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-10-27	Office to Mohmmadpur cafe Rio Bill Collection Oct 1-15	1	100.00	100.00	2025-11-04 06:31:37.771885+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0054	\N
9e152744-4892-4318-81f9-8cd0235d483f	\N	2025-10-28	Visiting MadChef Brunch – Bailey Road & Banani +Lunch	1	450.00	450.00	2025-11-04 06:33:04.130844+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0056	\N
8160fff6-8254-455c-a9c3-10f8c77447d2	d5a1699b-e816-4560-b055-433d69949c23	2025-10-30	MadChef Baily Road for clowee New Machine Setup	1	300.00	300.00	2025-11-04 06:38:10.187616+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0058	\N
b99a4a45-da3b-4db7-bf4a-3bcecc3fd875	\N	2025-10-01	Expense	1	48000.00	48000.00	2025-11-04 06:39:16.990087+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10006	clw-ex-0060	\N
af712b4f-f963-45a3-8ef5-6be95ab86eb4	\N	2025-10-01	Expense	1	18000.00	18000.00	2025-11-04 06:41:03.735265+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10011	clw-ex-0062	\N
1b17734a-4613-4330-9cbb-a5940fb6d953	\N	2025-10-01	Expense	1	5500.00	5500.00	2025-11-04 06:41:49.894814+00	12	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0064	\N
0c4a9979-4c09-4ce6-a744-a9410fd27018	\N	2025-10-01	Expense	1	5000.00	5000.00	2025-11-04 06:42:54.695109+00	15	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0066	\N
893f7cf9-1297-426c-9075-ff17584cc44b	277b890a-f8fe-4cb2-a106-066731d848e3	2025-11-01	Fuoco Uttara press button fix - Rezaul	1	400.00	400.00	2025-11-04 06:51:13.214748+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0068	\N
fea17699-6315-4b60-98c9-d6cf2fa21859	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-11-02	ChefMate Lounge Bill Collection	1	100.00	100.00	2025-11-04 06:54:48.216921+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0070	\N
8a2ef2f3-c2d0-4696-9862-b2a7407a1b4d	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-11-03	Office to Pizzaburg Gulshan Machine Crane Problem	1	300.00	300.00	2025-11-04 06:55:40.788593+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0072	\N
b29b1762-6f88-4e74-84f9-ce1958fb3384	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-11-04	Expense	50	100.00	5000.00	2025-11-04 11:04:07.051036+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0074	\N
5b552f75-0d05-449e-b930-bc0d2d05be9b	3869bce6-8e5d-4e64-9197-24400000d168	2025-11-11	Expense	100	100.00	10000.00	2025-11-11 11:39:39.941784+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0078	\N
98124b24-91b6-4fb5-80ff-8309c07a5dd6	33a1a534-951a-4f86-a832-188fa5117b57	2025-11-09	Expense	100	100.00	10000.00	2025-11-09 13:30:52.886317+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0077	\N
f207a882-b6c4-429d-8fd9-4a1a9819de11	1885a455-019b-43d3-80e6-7a4fcc1e1232	2025-11-08	Mr Manik Food To Office Machine 	1	2550.00	2550.00	2025-11-13 05:13:01.418329+00	19	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0080	\N
2f5ca1af-fa33-4a8d-a557-0c0481af3a5e	33a1a534-951a-4f86-a832-188fa5117b57	2025-11-09	Office to MadChef Dhanmondi Outlet Visit	1	100.00	100.00	2025-11-13 05:14:27.470351+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0082	\N
1785d946-f1e6-41cd-9d9e-37f36f17d8e3	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-11-13	Cafe Rio Mipur bill collection	1	250.00	250.00	2025-11-13 05:15:09.564886+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0084	\N
396e59cb-91bd-433e-90d2-f56ea4201823	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-10-27	sticker change	1	1675.00	1675.00	2025-11-13 12:06:46.396801+00	9	d2fabda9-ee77-4536-a783-67d66406889a	12ad4585-93b8-4559-b76b-9b4ff2dabc9a	\N	clw-ex-0086	Sticker Print(Cafe rio Uttara)
4b9ff4a9-7437-45ff-8b38-6f88cbc1b22e	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-11	clowee sticker print - cafe rio mirpur	1	1675.00	1675.00	2025-10-27 12:08:16.613461+00	9	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0047	Clowee sticker print(cafe rio mirpur)
f8a3deaa-f63f-4439-976b-a17d18c6eea6	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-11-17	Expense	50	100.00	5000.00	2025-11-17 11:39:11.57226+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0088	\N
40ed370e-ac70-4169-8fa6-c0ebadb40111	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-11-19	Expense	1	80.00	80.00	2025-11-19 12:15:57.567601+00	10	d2fabda9-ee77-4536-a783-67d66406889a	b61a9829-5b43-41bc-b09a-3d74a0e05767	\N	clw-ex-0090	\N
8bc1ac12-a66f-423d-b44e-2be1b7de9821	\N	2025-11-20	Expense	2	25.00	50.00	2025-11-20 08:00:14.879925+00	9	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0091	Blade
48830322-0f53-4785-bb32-730ed861d62d	\N	2025-11-20	Expense	1	300.00	300.00	2025-11-20 08:00:32.603469+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0092	\N
3489205b-29b6-4554-aad1-e5ee35bfbeca	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-11-22	Expense	100	100.00	10000.00	2025-11-22 14:56:07.908925+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0093	\N
14e08c8d-e45b-4e0a-9d4c-22014d4d84ba	d5a1699b-e816-4560-b055-433d69949c23	2025-11-23	Expense	100	100.00	10000.00	2025-11-23 12:15:58.744747+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0095	\N
e815d5a5-b2da-467a-8e82-37421ba4cc1e	\N	2025-09-01	Server Bill Sep 2025	1	5000.00	5000.00	2025-10-22 12:59:26.499603+00	15	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0023	\N
27095973-7fca-4e89-9afb-2325176304a1	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-09-02	Expense	100	100.00	10000.00	2025-10-22 07:54:22.795241+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0003	\N
8069278d-478d-47ce-83a5-fd54825cf7b2	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-09-04	Expense	400	100.00	40000.00	2025-10-22 07:55:09.558962+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0004	\N
d8f790bd-9f38-46ee-95a1-f5c50dd009b6	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-09-10	Expense	100	100.00	10000.00	2025-10-22 07:55:52.213933+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0005	\N
707ccb11-6d73-46c6-80f1-0a8b723fae3a	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-09-10	Expense	100	100.00	10000.00	2025-10-22 07:56:30.215829+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0006	\N
38d2b8ba-5468-49fb-93a5-3771d86a19e8	3869bce6-8e5d-4e64-9197-24400000d168	2025-09-11	Expense	100	100.00	10000.00	2025-10-22 07:57:02.941928+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0007	\N
c54698e8-f4c7-4f7b-813e-ce5d3eb3bdf2	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-09-18	Expense	100	100.00	10000.00	2025-10-22 07:58:18.389666+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0008	\N
3e40d61c-d605-4c2d-b440-a6880be61003	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-09-18	Expense	50	100.00	5000.00	2025-10-22 07:58:53.595111+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0009	\N
97288574-97a8-48a3-96ec-750e787db30a	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-09-21	Expense	100	100.00	10000.00	2025-10-22 08:00:17.996882+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0011	\N
58604c04-a1da-4406-82a2-683b23e69327	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-09-25	Expense	50	100.00	5000.00	2025-10-22 08:01:05.615881+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0012	\N
70c37b44-097c-4d28-8629-72eae40effa6	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-09-25	Expense	50	100.00	5000.00	2025-10-22 08:01:47.636599+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0013	\N
715bccd3-bbd6-4dcc-98a2-6c499fb8116f	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-09-21	Expense	100	100.00	10000.00	2025-10-22 07:59:28.410407+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0010	\N
f27fb3bb-8f72-48c6-81d3-64aab353da10	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-09-25	Expense	100	100.00	10000.00	2025-10-22 08:02:20.590808+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0014	\N
59ff60c8-d1d4-4a46-8060-5c20525b6721	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-11-22	Expense	50	100.00	5000.00	2025-11-22 14:56:24.482735+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0094	\N
0e39908a-40c5-4b9e-a77d-b9cd2b922621	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-09-12	Expense	100	100.00	10000.00	2025-10-22 08:04:07.777908+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0015	\N
d81b14a5-63ea-416d-a03a-d3f5d5ce3ffb	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-09-11	Expense	50	100.00	5000.00	2025-10-22 08:16:08.1107+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0016	\N
d2de375b-adea-43ce-9137-d71362f370bc	\N	2025-09-01	Factory Rent  Sep 2025	1	5500.00	5500.00	2025-10-22 12:56:32.250538+00	12	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0021	\N
d3cab802-2630-4c59-822d-2a4b8963dcfa	\N	2025-09-30	Office Rent  Sep 2025	1	5000.00	5000.00	2025-10-22 12:58:59.583283+00	23	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0022	\N
351233d5-3496-4b11-bbac-2671309b5fd7	\N	2025-10-12	Stedfast Bill	1	2540.00	2540.00	2025-10-23 05:11:01.785317+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0026	\N
a68d109b-1eb6-42f5-be9f-53cd302a5cba	\N	2025-10-12	stories cafe machine crrying cost	1	1100.00	1100.00	2025-10-23 05:11:53.50448+00	19	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0028	\N
e79139e4-1a08-4d9d-8737-b625374f6ed0	\N	2025-10-12	Office to The Stories Cafe Mirpur	1	200.00	200.00	2025-10-23 05:12:16.794218+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0029	\N
d709c20e-9e92-4dc5-8b6f-0a50b1b366c1	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-10-05	Expense	100	100.00	10000.00	2025-10-23 05:24:40.4038+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0030	\N
3285125f-8a72-4c6f-ac4f-defe0e459612	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-10-05	Expense	50	100.00	5000.00	2025-10-23 05:25:46.696461+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0031	\N
166fa795-4a9f-4b85-aca8-59aab2aaf954	277b890a-f8fe-4cb2-a106-066731d848e3	2025-10-07	Expense	50	100.00	5000.00	2025-10-23 05:26:47.350307+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0032	\N
8a33a37f-556e-4c7f-89da-555ed04d0b94	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-10-07	Expense	50	100.00	5000.00	2025-10-23 05:27:50.385312+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0034	\N
f4aa37ec-56c8-4b4f-b096-931bd9e813d6	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-09	Expense	100	100.00	10000.00	2025-10-23 05:29:23.50293+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0036	\N
bd96ad27-2781-4821-ba6f-8dc27c2561e2	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-10-09	Expense	100	100.00	10000.00	2025-10-23 05:29:48.118873+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0037	\N
2de1fccd-d996-4283-8446-853c41e7d38e	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-10-12	Expense	100	100.00	10000.00	2025-10-23 05:30:36.079598+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0038	\N
3ca8acbd-2632-4482-a562-2fc33b96ccee	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-11-03	Expense	100	100.00	10000.00	2025-11-03 11:55:46.769494+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0053	\N
19174d80-0546-47e2-b739-f11267a8f697	d5a1699b-e816-4560-b055-433d69949c23	2025-10-28	Office to MadChef Office Banani Agreement Signing	1	200.00	200.00	2025-11-04 06:32:33.621973+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0055	\N
c17e0e64-d030-4bd7-a7c6-f9730652409d	\N	2025-09-01	Salary - Md Sajibur Rahman (Support Eng) Sep 2025	1	13000.00	13000.00	2025-10-22 12:55:25.484353+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10018	clw-ex-0020	\N
f430b2e0-41a4-48aa-9e1a-a8d96cd54962	\N	2025-10-29	Expense	1	1400.00	1400.00	2025-11-04 06:35:58.947777+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0057	\N
4c934f4d-7d9e-4bed-8bcf-9e6b08dc9d66	\N	2025-09-01	Salary - Md. Sohel Rana (Accounts)-Sep 2025	1	18000.00	18000.00	2025-10-22 12:55:06.780814+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10016	clw-ex-0019	\N
747899da-366c-419f-a3bd-830463216df4	d5a1699b-e816-4560-b055-433d69949c23	2025-10-30	MadChef Baily Road Machine Carrying Cost 	1	2600.00	2600.00	2025-10-30 10:41:31.495621+00	19	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0051	\N
a4a6eaf3-a6da-447f-a537-8244d1cc61d5	\N	2025-09-01	Salary - Md. Arman Al Sharif - Sep 2025	1	48000.00	48000.00	2025-10-22 12:54:01.88964+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10006	clw-ex-0017	\N
e053a5ed-b6e4-493a-922e-b180b21d51c7	\N	2025-09-01	Salary - Badhon Roy(Engineer) - Sep 2025	1	18000.00	18000.00	2025-10-22 12:54:45.152932+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10011	clw-ex-0018	\N
aec8bf09-12b6-43c8-a0ee-75d02a342bef	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-10-26	Expense	50	100.00	5000.00	2025-10-26 11:06:23.87009+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0041	\N
c8ec2c0f-cbe2-4222-82f1-89bc235f2cca	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-27	Expense	100	100.00	10000.00	2025-10-27 11:52:52.606062+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0043	\N
3f2546ab-d840-47fe-a9d7-8891e8d9e618	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-10-07	Expense	50	100.00	5000.00	2025-10-23 05:27:12.449525+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0033	\N
386b6679-0887-4acd-873d-1b5651d17158	\N	2025-10-01	Expense	1	18000.00	18000.00	2025-11-04 06:38:54.938338+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10016	clw-ex-0059	\N
f936ff30-7341-4399-bd9d-f97e92be5225	3869bce6-8e5d-4e64-9197-24400000d168	2025-10-27	Expense	100	100.00	10000.00	2025-10-27 12:00:38.55022+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0045	\N
8b8cfa7e-3d13-4601-a417-e222d32c909f	d5a1699b-e816-4560-b055-433d69949c23	2025-10-08	Factory 	100	100.00	10000.00	2025-10-23 05:28:41.629616+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0035	\N
f11e6748-87c4-4675-abb1-a6490ce3911c	\N	2025-10-01	Expense	1	13000.00	13000.00	2025-11-04 06:39:59.381772+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10018	clw-ex-0061	\N
49c04cdc-ff37-4b9b-a9ce-4d35f25207da	\N	2025-10-01	Expense	1	3000.00	3000.00	2025-11-04 06:41:24.791421+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10021	clw-ex-0063	\N
b2ed583a-c81f-4ac5-baf8-8ba4f0797f12	\N	2025-10-31	Expense	1	5000.00	5000.00	2025-11-04 06:42:29.313508+00	23	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0065	\N
9234bee3-f3ec-4756-bfbc-3edca3c59368	\N	2025-10-31	Expense	1	4856.00	4856.00	2025-11-04 06:44:44.98656+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0067	\N
bc9bbaf7-e5c5-4c94-b8fa-eaec33d8b8a9	\N	2025-11-01	Ncc bank depostit - Rezaul	1	100.00	100.00	2025-11-04 06:51:50.907783+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0069	\N
cf39294a-348c-4d44-8049-fa8db5a92b7b	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-11-02	Shanghigh doll delivery	1	100.00	100.00	2025-11-04 06:55:14.067005+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0071	\N
6dcd0efe-edb3-4b3c-911b-08fc07aefa34	\N	2025-11-04	Stedfast Bill	1	760.00	760.00	2025-11-04 06:56:03.998483+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0073	\N
d413bbf1-1690-4bd0-aed0-dca7338e13f7	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-11-04	Expense	50	100.00	5000.00	2025-11-04 11:04:42.476559+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0075	\N
dca9ebd3-f9f0-4bc3-898b-f764f791642f	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-11-12	Expense	100	100.00	10000.00	2025-11-12 11:38:16.592502+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0079	\N
5d4b6517-1887-44df-9ba4-ba132b0a07c1	\N	2025-11-13	Stedfast Bill	1	1320.00	1320.00	2025-11-13 05:13:53.249819+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0081	\N
2084cb4c-4ff1-43e4-838c-e4e4cd68c52b	33a1a534-951a-4f86-a832-188fa5117b57	2025-11-13	Office to MadChef Dhanmondi New Machine Setup	1	100.00	100.00	2025-11-13 05:14:46.709355+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0083	\N
d92d0c81-4fa8-400f-abe5-7a0f7b7ef983	\N	2025-10-27	Stamp paper 6 pcs	6	145.00	870.00	2025-10-27 12:09:42.0267+00	9	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0049	Stamp paper 
a009d560-3692-4313-9986-2daa5b3f1f56	\N	2025-10-06	sticker print + ( transport muyed)	1	1700.00	1700.00	2025-10-23 05:10:16.379407+00	9	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0025	Sticker(MadChef)
7aaed73d-e9c1-48e1-9fb7-7cfe2f174e4d	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-11-17	Expense	100	100.00	10000.00	2025-11-17 05:21:07.943174+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0087	\N
1acd05da-aa00-435f-a8f5-a91e731c4fe0	\N	2025-10-14	Hand Tools	1	60.00	60.00	2025-10-23 05:11:22.480696+00	9	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0027	Dalie-10mm
0d547522-2e6d-4279-b01e-ec5418d8fd2a	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-11-17	Expense	50	100.00	5000.00	2025-11-17 11:39:41.472715+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0089	\N
ee0f636a-7659-4a89-bdb7-d944e8dae586	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-11-23	Expense	100	100.00	10000.00	2025-11-23 12:17:22.80337+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0096	\N
1b03ee57-f614-49c3-af96-65c464e9a287	\N	2025-11-25	Expense	1	960.00	960.00	2025-11-25 05:29:45.382898+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0097	\N
8e16ca7a-81ad-415a-9993-f6d5ef8f233a	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-11-25	MadChfe Mirpur	100	100.00	10000.00	2025-11-26 04:42:01.132157+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0098	\N
6678afc1-326d-4bd5-90ff-2cf2e08c0de8	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-11-30	Office to MadChef Mirpur-10 Brunch Visit +Lunch	1	330.00	330.00	2025-11-30 10:20:07.429855+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0099	\N
a5ed0fd1-7dff-48b4-9089-694d8fe888b1	\N	2025-11-27	Office to baily Deil & Madchef Khilgaon	1	300.00	300.00	2025-11-30 10:20:39.558289+00	10	\N	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0100	\N
38d86dac-4e8d-44d7-b97a-397d7d2790a0	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-11-30	Office to MadChef Mirpur-10 Machine Setup\nLunch	1	350.00	350.00	2025-11-30 10:21:06.588892+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0101	\N
6d397a8a-682a-4671-8f57-1e503a8f4aaa	\N	2025-11-27	Stedfast Bill	1	250.00	250.00	2025-11-30 10:25:18.946085+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0102	\N
024cfc1d-e006-49d0-b6bc-dd33a01382c5	\N	2025-11-12	Dinning Lounge Bill collection Oct 2025 + deposit	1	250.00	250.00	2025-11-30 10:29:57.711758+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0103	\N
c8f9a58d-b4e7-4a5b-8fb2-9d6ed19d6355	\N	2025-11-20	Sand Paper 3 pcs	3	30.00	90.00	2025-11-30 10:31:18.880857+00	9	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0104	Sand Paper 
cb706717-6a9d-48bf-b6f7-336a7c49dcf1	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-11-20	ChefMate Lounge Bill Collection	1	100.00	100.00	2025-11-30 10:31:52.383224+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0105	\N
b9f31664-57f4-4243-b205-0f12fd09874e	95394e96-0af0-42c5-9fcc-e41e116ec592	2025-11-20	Sticker Print 1pcs(Madchef)	1	1700.00	1700.00	2025-11-30 10:32:41.786358+00	9	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0106	Sticker Print 1pcs
ef28502e-20f7-46d1-83fb-623b60e768c4	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-11-30	Expense	100	100.00	10000.00	2025-11-30 11:12:32.745663+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0108	\N
7439ddd6-e56c-4268-bed8-b559837c8eb9	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-11-30	Expense	50	100.00	5000.00	2025-11-30 11:12:54.624707+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0109	\N
db063c43-2231-4b54-a374-78b611acee1c	\N	2025-11-30	Expense	1	400.00	400.00	2025-12-01 12:03:53.018755+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0110	\N
7a3672fd-2f5d-44e7-a059-811705db93c5	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-02	Half-Monthly Bill Collection Receipt (1–15 November 2025) – The Cafe Rio, Mirpur	1	40.00	40.00	2025-12-03 05:02:30.752192+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0111	\N
8003102c-4f8a-47b4-b1da-505ed9db38e1	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-03	Expense	100	100.00	10000.00	2025-12-03 11:14:25.348825+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0112	\N
298271fa-e5de-4d41-bfbe-653abd04b1da	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-03	Expense	100	100.00	10000.00	2025-12-03 11:15:17.657048+00	18	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0113	\N
d6bbbac4-c90a-41a9-b135-7cdb95f98c49	277b890a-f8fe-4cb2-a106-066731d848e3	2025-12-04	Expense	50	100.00	5000.00	2025-12-04 08:06:10.596495+00	18	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0114	\N
070498d4-1e49-4d92-ac6e-64d7c0e2143c	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-12-04	Expense	50	100.00	5000.00	2025-12-04 08:07:55.928167+00	18	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0115	\N
456d9e84-a555-4959-9b89-371144347804	\N	2025-11-01	Expense	1	18000.00	18000.00	2025-12-06 05:28:48.752262+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10016	clw-ex-0116	\N
36e2d293-1bc2-45d7-af71-702e3b363582	\N	2025-11-01	Expense	1	18000.00	18000.00	2025-12-06 05:29:28.45742+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10011	clw-ex-0118	\N
77088524-1515-4ac2-8f0d-18228d23f28f	\N	2025-11-01	Expense	1	13000.00	13000.00	2025-12-06 05:29:41.438211+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10018	clw-ex-0119	\N
df0d5f36-1b66-47f7-ae6e-0eb62ea46965	\N	2025-11-01	Expense	1	3000.00	3000.00	2025-12-06 05:30:01.901362+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10021	clw-ex-0120	\N
34985abb-23e8-40ba-a9fc-b6c2aeabb40c	\N	2025-11-01	Expense	1	5500.00	5500.00	2025-12-06 05:30:24.673052+00	12	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0121	\N
45aa5e2f-e25f-4212-997a-2408fe17bd12	\N	2025-11-01	Expense	1	5000.00	5000.00	2025-12-06 05:31:20.194855+00	23	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0122	\N
f82afca9-a55b-4100-81c1-149c47d6eea0	\N	2025-11-01	Expense	1	5000.00	5000.00	2025-12-06 05:31:44.130647+00	15	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0123	\N
788633ad-73d3-4c7b-9d60-c4ce4c4650d3	\N	2025-11-30	Expense	1	4896.00	4896.00	2025-12-06 05:32:03.329983+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0124	\N
e93d8f3b-d305-4fce-a575-71c428ec158b	\N	2025-11-01	Expense	1	48000.00	48000.00	2025-12-06 05:29:09.009796+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10006	clw-ex-0117	\N
3f3230f6-1ec3-4c34-80e0-7a5d48d34f15	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-12-07	“Visited Pizzaburg, Mirpur-1 for Clowee Machine Maintenance Work”	1	80.00	80.00	2025-12-07 09:41:11.376749+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0125	\N
67c5fe3a-64ee-48e0-b90e-e9c0ad155ba5	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-12-07	Expense	100	100.00	10000.00	2025-12-07 10:01:54.886468+00	18	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0126	\N
95caf1bd-bad3-445f-8648-85340d532879	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-12-08	bill collection by rafid 	1	240.00	240.00	2025-12-08 12:42:45.965845+00	10	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0127	\N
5edc19e2-9ba8-46c1-bcf7-15e21bd4333f	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-12-07	Coin acceptor fixed by RAFID	1	80.00	80.00	2025-12-08 12:43:39.493253+00	10	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0128	\N
0173fc2a-617d-41e4-93a0-e1e4963d74b2	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-12-07	Agreement collection	1	180.00	180.00	2025-12-08 12:44:30.991203+00	10	d2fabda9-ee77-4536-a783-67d66406889a	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0129	\N
0adc5461-ac4a-4c56-bc61-a290424ba599	\N	2025-12-04	asdf	1	150000.00	150000.00	2025-12-11 09:05:18.63656+00	\N	\N	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	\N	\N
e5ca98a7-f9a5-4bec-a1a8-fa5fa376037b	\N	2025-12-04	sadf	1	150000.00	150000.00	2025-12-11 09:06:51.072312+00	\N	\N	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	\N	\N
d40dc46d-be3b-418b-9884-4ab3c8ad69e8	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-12-17	Expense	100	100.00	10000.00	2025-12-17 13:24:07.131691+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0139	\N
9a7925f7-3580-4ae9-9ff2-e2af5e84d5aa	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-17	Visited The Cafe Rio via Metro Rail to Collect Bill	1	60.00	60.00	2025-12-17 13:26:46.333784+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0140	\N
e7bf9410-6125-42ca-bc3e-04a291939583	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-12-17	Visited Dhanmondi 27 to Submit Cheque	1	50.00	50.00	2025-12-17 13:30:09.231683+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0141	\N
7d11c88c-71f7-4f67-9aeb-8d81e368585d	\N	2025-12-04	Profit share OCt 2025 - 150k(90+60K)	1	150000.00	150000.00	2025-12-11 09:51:23.993134+00	22	841a7673-e6b8-4f07-9d2a-5f14ee159df6	975b7b9b-f608-45c0-861d-d91695ec79e9	\N	clw-ex-0130	\N
26820e83-dee4-4297-9140-ddfab10b11d1	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-14	Expense	100	100.00	10000.00	2025-12-14 10:18:45.503991+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0131	\N
702d9911-8d8f-4b89-a5f4-ede5e5c1806e	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-12-14	Expense	100	100.00	10000.00	2025-12-14 10:19:05.657267+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0132	\N
7d5d6472-d33a-4cff-96a6-7710e8746e74	\N	2025-12-14	Expense	1	980.00	980.00	2025-12-14 12:05:34.327876+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0133	\N
7cf1c2ce-41b0-4d5d-a9b7-fa776a51ce49	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-12-14	Office to Uttara Machine Health Check 	1	145.00	145.00	2025-12-14 12:15:46.126345+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0134	\N
59cda2fa-c678-4824-a00f-ef2e43d806e3	277b890a-f8fe-4cb2-a106-066731d848e3	2025-12-14	Office to Uttara Machine Health Check 	1	145.00	145.00	2025-12-14 12:16:03.236569+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0135	\N
3f800f91-8040-4bf5-8407-10a77c9b69a2	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-12-14	Office to Uttara Machine Health Check 	1	145.00	145.00	2025-12-14 12:16:17.621836+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0136	\N
519789f3-c5bd-47e8-b4aa-abea6a2bc41f	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-12-14	Office to Uttara Machine Health Check 	1	145.00	145.00	2025-12-14 12:16:35.377575+00	10	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0137	\N
a8a3c740-661a-4279-85b2-0094009ec5cc	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-12-17	Expense	100	100.00	10000.00	2025-12-17 13:23:20.297098+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0138	\N
4757e73c-f289-45a3-aa91-65e6f7b77b1b	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-18	Expense	100	100.00	10000.00	2025-12-18 11:57:37.242891+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0142	\N
e1259594-1eeb-4096-98b9-bb6eb6250acb	33a1a534-951a-4f86-a832-188fa5117b57	2025-12-18	Expense	100	100.00	10000.00	2025-12-18 11:58:09.171439+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0143	\N
6698f88f-123e-4b27-b431-bcd22c825c40	33a1a534-951a-4f86-a832-188fa5117b57	2025-11-13	Jueil Vai MadChef Dhanmondi Machine delivery 	1	920.00	920.00	2025-11-13 05:15:36.509478+00	19	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0085	\N
0fa210de-15f8-41df-9e1e-a55a0b743e0c	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-12-21	Expense	100	100.00	10000.00	2025-12-21 13:07:29.855709+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0144	\N
c51e50ec-4dfa-4678-adc1-66aa1868dcc9	\N	2025-12-22	Expense	1	1470.00	1470.00	2025-12-22 05:52:44.582322+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0146	\N
6ae8532b-e4f8-4dde-adf2-f603c4cc6a39	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-12-21	Expense	50	100.00	5000.00	2025-12-21 13:07:58.433097+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0145	\N
60b06470-59a8-47f0-aab8-30f3ef3673b3	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-12-24	Bike Visit from Gulshan-2 to Pizzaburg, Mirpur for Bill Collection (Clowee)	1	300.00	300.00	2025-12-24 05:57:17.539803+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0147	\N
f5d5952e-0092-4870-85c9-d1cf7d67b1a7	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-23	Rickshaw Visit to Cafe Rio, Mirpur for Bill Collection	1	40.00	40.00	2025-12-24 05:59:50.334446+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0148	\N
284db695-791b-41ad-ba52-aa336880f5df	\N	2025-12-24	Clowee bill deposited at NCC Bank.	1	120.00	120.00	2025-12-24 07:58:40.339224+00	10	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0149	\N
28b79744-9322-4243-8f10-9ec3deb414ca	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-12-24	Expense	50	100.00	5000.00	2025-12-24 14:07:33.557739+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0150	\N
e375e28a-b7d4-4fdb-907c-4170d5b5f718	\N	2025-12-29	Expense	1	780.00	780.00	2025-12-29 04:31:19.832197+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0152	\N
a29a394d-f338-4542-9fdd-e54dc2fbfe3b	\N	2025-11-25	Acrylic Boad & Cutting - 11 pcs	10	170.00	1700.00	2025-11-30 10:34:10.77204+00	9	\N	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0107	Acrylic Boad & Cutting 
e017ecb1-e914-4d89-98f4-51d5dfe8c28c	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-12-28	Expense	100	100.00	10000.00	2025-12-28 05:42:46.858133+00	18	d2fabda9-ee77-4536-a783-67d66406889a	eb521af0-7f91-4dc5-9b13-70094e501da3	\N	clw-ex-0151	\N
252f698b-d2f3-482b-a2a9-9736203c10a4	\N	2025-12-30	SMS Service Charge  Bank\n\n	1	345.00	345.00	2025-12-30 11:08:36.899235+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0154	\N
84d7733b-3a67-4a51-90a4-c70af50c1fd0	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-30	Bank Balance Adjustment	1	514.81	514.81	2025-12-30 11:20:38.160242+00	18	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0155	\N
7dbdf754-0148-47d1-bec5-9824866e8c2c	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-30	Bank Balance Adjustment	99	95.81	9485.19	2025-12-30 11:08:06.420127+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0153	\N
23cf8e05-d995-447f-b2a0-0af8f0e26420	\N	2025-12-01	Expense	1	18000.00	18000.00	2026-01-01 05:02:38.088606+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10016	clw-ex-0156	\N
48a0ef74-cdab-4dbd-81a5-9732514e32b2	\N	2025-12-01	Expense	1	48000.00	48000.00	2026-01-01 05:02:55.933818+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10006	clw-ex-0157	\N
70f2913a-cc85-416c-b5f0-fe3467234405	\N	2025-12-01	Expense	1	18000.00	18000.00	2026-01-01 05:03:23.519498+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10011	clw-ex-0158	\N
98340e02-eb2a-4512-b136-e56bd63dec7c	\N	2025-12-01	Expense	1	3000.00	3000.00	2026-01-01 05:03:57.954419+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10021	clw-ex-0160	\N
eee4669c-4bef-480f-b269-3c5012ec10f9	\N	2025-12-01	Expense	1	13000.00	13000.00	2026-01-01 05:03:35.931169+00	11	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10018	clw-ex-0159	\N
91bbe778-dd6b-4d03-b7cc-64024791ade1	\N	2025-12-01	Expense	1	5000.00	5000.00	2026-01-01 05:05:07.348902+00	23	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0161	\N
c1dbfeb7-6522-457a-a294-dbd559d9838c	\N	2025-12-01	Expense	1	5500.00	5500.00	2026-01-01 05:05:27.898641+00	12	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0162	\N
c8efcc6e-a9e0-4cdb-acbc-a8298ad171f0	\N	2025-12-01	Expense	1	5000.00	5000.00	2026-01-01 05:05:48.224756+00	15	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0163	\N
1998548f-32c2-47c9-9fe7-840c4b5913ae	\N	2025-12-31	Expense	1	4896.00	4896.00	2026-01-01 05:06:08.203652+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0164	\N
5cb6f994-84d4-49f7-a755-50ef9e089cf2	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-31	SiM Recharge Baily Deli	1	20.00	20.00	2026-01-01 05:07:36.457309+00	16	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0165	\N
46057060-ee4e-4d1f-80e5-7e1be13ad42b	\N	2025-12-31	Oct-2024 to Dec-2025 NPSB Charge 	1	2000.00	2000.00	2026-01-01 06:55:41.89078+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0166	\N
5904fdf7-7c70-403e-823e-7a15afadf7bd	3869bce6-8e5d-4e64-9197-24400000d168	2025-12-31	Expense	1	250.00	250.00	2026-01-01 12:16:26.25721+00	17	d2fabda9-ee77-4536-a783-67d66406889a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0167	\N
4a730537-3cd5-43c8-865a-46cfc925f2e8	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2026-01-01	Expense	100	100.00	10000.00	2026-01-01 12:23:55.546466+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0168	\N
e40a7686-ce8b-4c17-8cf3-620c35cc1b07	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2026-01-01	Expense	50	100.00	5000.00	2026-01-01 12:24:18.411225+00	18	8c018b67-1073-45ce-af3b-4c2cf980badc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	\N	clw-ex-0169	\N
\.


--
-- Data for Name: machine_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_payments (id, machine_id, bank_id, payment_date, amount, remarks, created_at, invoice_id, created_by) FROM stdin;
ba6147ee-18ec-4db2-990e-19173ff40aa5	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	16546.00	Received by Rajaul cash	2025-10-20 09:58:00.394442+00	6804c358-e42b-46f6-a423-a1d6bde9bcbb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
193e7661-4805-496e-b862-0a26c36781e6	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	25354.00	Received by Rajaul cash	2025-10-20 09:58:44.885504+00	4d9c9bd1-e785-4b1f-ac2c-44a35dcd51c9	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5699a941-f0e3-4c60-a259-556ad97ba7cb	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-26	3578.00	Sharif 	2025-12-29 04:49:12.900764+00	61daf5b4-28c1-4b79-ba4d-ef96186a7a5d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
37038ba8-8afd-47f4-adde-1e27aa8eac3f	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-28	38556.25	Received by Rajaul cash	2025-10-13 12:28:55.435396+00	ba688357-6037-495b-8074-16308ed7144f	\N
8531d68b-33c4-481c-b55d-f3d1a2c47512	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	8025.00	Received by Rajaul cash	2025-10-14 07:30:53.404116+00	1edaf64e-6ef9-4a38-97a9-3eb515c2a177	\N
cccc86aa-c49b-4726-afbe-a3236e777fdb	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-31	6462.00		2026-01-01 09:55:08.41878+00	b7f9f4b8-ac50-41b1-a954-040f79effe3d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ff23f030-f383-4e14-8d43-6b190c753cfc	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2026-01-04	3920.00	Sharif 	2026-01-04 07:16:30.964379+00	f04c3002-1849-432c-951e-4a0a36ec5d9b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ad845555-1ee9-4b56-ade7-b039c3161e3c	aa75ca99-9bf5-4156-af35-4467c84f44fd	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	11537.50		2025-10-16 05:13:04.381706+00	bd1c789b-3c18-4c47-8fef-cfa60fb11159	b61a9829-5b43-41bc-b09a-3d74a0e05767
d642de04-135d-4a7f-84d1-05841c72ce1e	8cb8bd6f-be4d-4964-8e10-eddd392cff87	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	15012.50		2025-10-16 05:14:44.489364+00	9ab884d3-be80-4801-be6a-6008dca9d4fe	b61a9829-5b43-41bc-b09a-3d74a0e05767
c0cb50ac-188c-4422-85ff-5c8a850f1810	ae0f877f-a5b4-4955-a295-317855b3ff27	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	2552.50		2025-10-16 05:15:07.085898+00	ef270f9d-fa2e-4283-834f-08ffc516d7cb	b61a9829-5b43-41bc-b09a-3d74a0e05767
c3d36cd9-45a1-494d-8ced-a5df2a733bb5	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-19	4085.00		2025-10-19 11:21:34.890077+00	7c3114af-8292-4993-bf95-91acc86655e3	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c813a567-d187-4506-ba38-4053ae04ba7b	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	19300.00	Received by Rajaul cash	2025-10-20 09:57:20.306628+00	1ca5bf33-f699-4265-865d-7f660324e01a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5c0d5587-498e-4744-a750-785536509883	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-26	9600.00	shajib	2025-10-27 11:17:18.158049+00	7b2f818e-5d2f-4a26-9af0-8abc722031b5	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b5f808ec-b25b-4b88-97f2-14b166301232	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-24	37500.00	Received by Shajib cash	2025-10-22 07:15:41.764379+00	468b3487-ad6b-442f-86d6-eff14c788171	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
40b1908d-6e29-486f-9d5e-f8420f5ab55e	3531f437-b29d-4f5c-8891-2463ae8e70b5	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-23	18400.00	Received by Shajib cash	2025-10-22 07:16:27.809714+00	5fc4a18c-949f-4446-a95a-b082931706d1	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
72f728c5-5553-430d-87e2-e2c7f63e44ec	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-29	9796.00	Received by Shajib cash	2025-10-22 07:17:17.955787+00	22647618-ebd1-420d-824b-8f9ee177ef00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
cda13bc9-fe85-4b09-be6f-6704a78455e4	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-09-18	2282.00		2025-10-22 07:18:04.787492+00	998f54d2-a739-4e08-9f89-192de04b7f68	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5ca82951-427d-48da-b9a3-e5c5dc2acd39	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-02	8952.00		2025-10-22 07:25:35.915915+00	526a8c38-7cf4-4103-9445-d09b43d94c38	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
bd25c0fb-26ba-4fa7-b35d-cc5cdf261908	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-02	10548.00		2025-10-22 07:25:57.498926+00	c1d52844-af7c-46d5-a2f4-2fd26fb42bfe	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
3fafd8ff-3177-4ae9-af10-e326b4c19e9f	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-23	4400.00	Shajib	2025-10-22 07:37:24.375042+00	2415e8c0-d670-40b0-9173-f89a9345bebf	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ec656997-79d2-410f-bb36-2cdaa524ebe1	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-21	9852.00		2025-10-23 04:36:19.5036+00	2b8f2d71-505c-49e5-83e9-953eba7154e0	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
6805595f-b627-4534-a952-9eab0813a9c8	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-22	12498.00		2025-10-23 04:37:35.650424+00	6b82d9e1-1030-446a-82c9-d5db1d60152b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
20bc4b95-3d25-4564-be33-af64d01447c4	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-22	4158.00		2025-10-23 04:37:59.301005+00	05a29ec7-5290-48fe-a93d-a5dc3782eaaf	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
39638ef2-d15b-40bd-9991-a588ff4f6b1a	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-22	9036.00		2025-10-23 04:38:26.435734+00	2b1a4eef-c85d-4c7e-9505-34dd51e746ee	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ae083adc-e6e0-44c3-9627-a5fbc64f408c	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	697.50	the stories cafe 30 sep 2025 \nsales adjustment with food rail(due to remove the machine)	2025-10-24 15:25:37.841358+00	4542d8d8-182a-4f1b-8dbe-7a9ae6ce7d10	975b7b9b-f608-45c0-861d-d91695ec79e9
ce3600b0-3695-41d2-9c2a-8c1b2abc1366	4c5dda16-9682-4bba-aed0-c38e82ec5356	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-29	7100.00	Rajul Vai	2025-10-30 04:09:36.788228+00	8fd198de-b3bf-472e-9363-f720655f1514	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f2550e3a-4939-4f97-93f3-d8d2b40ce551	b5327e30-7b83-4fda-99aa-99a107bbcca9	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-20	37500.00	Received by Rajaul cash	2025-10-21 12:52:36.613107+00	8c86e40d-60cf-4b06-a0ae-bb2278216b5b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
48e14eeb-22d8-4cc4-84ae-c97fea7eca40	3531f437-b29d-4f5c-8891-2463ae8e70b5	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-19	10090.00		2025-10-21 10:28:03.022353+00	1329d001-e4bf-4624-be6d-a4e04f13e54e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b195c077-72fb-41e3-aa36-10bf54e631f5	3531f437-b29d-4f5c-8891-2463ae8e70b5	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-18	13300.00		2025-10-21 10:27:42.394235+00	140362ff-e43a-4cad-8f61-e9b40be43c31	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5a90df3f-1491-4fe9-9dba-d558d31b18b4	b084d7e5-1c69-4d42-9650-3b2ee45443d3	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	6327.50		2025-11-02 10:06:18.317649+00	4e6cd023-e793-4195-8a78-3232ab9504c6	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
446c350c-332a-47f9-9890-ea2537a59de5	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-06	4610.00		2025-11-06 06:51:24.204878+00	bb6cfbbf-7a8e-4ca5-9c9b-f4e656c61b6a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
4fc44ddf-9406-4813-9e80-9c706bf8e315	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-09	3500.00		2025-12-09 10:00:12.964831+00	c6cdd527-abc8-48a2-869d-645b56efebcd	eb521af0-7f91-4dc5-9b13-70094e501da3
7040c484-9be9-4859-ab4e-f4195a8fa93d	3531f437-b29d-4f5c-8891-2463ae8e70b5	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-25	10900.00		2025-11-25 10:29:24.945986+00	d8bffeb1-e4b7-4705-9686-088a722a29cc	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
345231e5-a75e-41ef-83a1-099289d8dbdc	3869bce6-8e5d-4e64-9197-24400000d168	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-11	19100.00		2025-11-11 07:01:55.044639+00	066febcc-d276-41ee-a9e1-84bcea64803e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
6ec769ef-0633-4bc0-b0ce-28ab56ea658f	3869bce6-8e5d-4e64-9197-24400000d168	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-11	24100.00		2025-11-11 07:02:47.431142+00	3ac79576-2cf2-44ff-8237-179a934c933f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
dd4ea9c0-246c-4658-bbf6-1f1b7871ab01	b084d7e5-1c69-4d42-9650-3b2ee45443d3	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-13	6767.50		2025-11-13 04:44:30.253806+00	4bc5f925-fe9c-4308-8c8d-41827138d85e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d2f66fb1-cbeb-4bb0-90a8-eec0198c0b17	ae0f877f-a5b4-4955-a295-317855b3ff27	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-13	5237.50		2025-11-13 04:44:46.922888+00	e3b8447f-0229-4f91-9004-58bac2b510c1	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ea3043c2-9fc6-4cfd-af1a-b7a6ce0e03b4	aa75ca99-9bf5-4156-af35-4467c84f44fd	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-13	9432.50		2025-11-13 04:45:07.07875+00	6f49a417-220f-417a-8c66-74b78d71acd4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fb6f3fe0-f52e-459f-9eb3-a8793941366a	8cb8bd6f-be4d-4964-8e10-eddd392cff87	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-13	14742.50		2025-11-13 04:45:35.740601+00	67532dc1-c754-4433-ba08-c9d301bb256f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fa576f91-a72a-4c6d-b15f-b4c21de14b33	b5327e30-7b83-4fda-99aa-99a107bbcca9	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-27	30000.00		2025-11-27 09:35:35.092208+00	c9fd44a2-b746-4980-be5a-5e618832b7d4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
ec37cdbf-996b-44dd-a0b1-4843574b0cff	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-15	8118.00		2025-11-16 04:27:51.67607+00	935718f6-77a9-4104-a238-547d56abc38c	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
06bec2b7-bb45-4bae-9c3b-5bd78b9bf323	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-15	10032.00		2025-11-16 04:28:51.089588+00	74ef0a2b-1343-4234-8fac-3bff42e1989a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
3f3278fd-3c5f-4b24-813b-1dec506c880b	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-19	5700.00	cash received by rafid	2025-11-19 11:11:18.333074+00	ffa1cd3e-4869-432f-87e8-e591183dd93b	b61a9829-5b43-41bc-b09a-3d74a0e05767
e0462a15-361b-4006-920d-238cb6b98542	4c5dda16-9682-4bba-aed0-c38e82ec5356	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-30	2461.25	Razul vai	2025-12-30 04:49:46.720744+00	9b4d0e81-c52b-436b-ab25-95e1fbbd0914	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
74bc76b6-3974-4ac1-b5e8-a3cc530b57be	3531f437-b29d-4f5c-8891-2463ae8e70b5	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-30	11493.75		2025-12-30 11:07:23.017335+00	d57271bb-e5ba-4795-a591-de362169f4ee	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
178fab76-1484-4477-a2ca-9229a0f904c0	4c5dda16-9682-4bba-aed0-c38e82ec5356	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-17	3323.00		2025-11-19 04:51:25.075909+00	e68d61d9-c975-4eb8-8d37-7faa18c2f7b9	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
579934c8-0eca-44e1-88b4-3a0c671555ad	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-31	7668.00		2026-01-01 09:55:28.454895+00	0ff96a21-6abf-46c1-8f13-26000c079f58	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
e6fcbc69-eada-4a26-a58d-c98a2170af3a	d5a1699b-e816-4560-b055-433d69949c23	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-18	13812.00		2025-11-19 07:39:52.316291+00	1617e0a9-2714-48b0-ba78-d0a5d1df38bb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fb9900eb-ec17-48d2-a684-ffb27337de4f	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-11-19	4047.00		2025-11-19 09:03:16.641547+00	9502e834-312f-4841-84ed-e4474ac07177	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f4fd629e-721e-432f-8046-e09d12b1175d	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-23	18844.00		2025-11-22 14:53:46.868727+00	a47a0b58-1e18-4034-926f-bc832163c53f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b268b8a3-b310-4340-b6ae-4ea8b43e646a	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-23	26736.00		2025-11-22 14:54:33.245427+00	1f19dc8a-8804-4820-9371-367147438041	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
95725be8-0f0c-406d-a8a6-ee6dd7f2f8c2	3869bce6-8e5d-4e64-9197-24400000d168	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-11-27	25690.00		2025-11-30 11:10:42.608625+00	e88b9c2e-e7f0-4c5d-889b-323993a779d6	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a128331d-d878-4a94-9f11-9b92d4dcc5d2	d5a1699b-e816-4560-b055-433d69949c23	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-03	13272.00		2025-12-03 07:32:42.035115+00	eb6ebf85-c392-441c-a6ab-b5d87ed1b76d	eb521af0-7f91-4dc5-9b13-70094e501da3
755ff7d9-e3d0-4474-a1c1-5a9d7eb42ee1	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-03	33780.00	Receved by Rafid	2025-12-03 10:16:09.510214+00	6c059588-5ef1-4954-995a-b8472bb70267	eb521af0-7f91-4dc5-9b13-70094e501da3
13d63988-0fdd-4e17-bde7-cb0bb49fd996	33a1a534-951a-4f86-a832-188fa5117b57	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-04	9372.00		2025-12-04 08:01:27.419823+00	f41a1290-e5bd-49ea-854b-f26147ba35d8	eb521af0-7f91-4dc5-9b13-70094e501da3
9473101f-a3a4-43af-b4c0-eaa8e4fff168	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-08	2987.00		2025-12-08 09:52:24.484893+00	1ac78b81-e358-4a42-b7db-6af610985992	eb521af0-7f91-4dc5-9b13-70094e501da3
a3821e70-4f15-4fa4-bba3-dbf342cff474	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-09	7400.00		2025-12-09 09:59:14.012836+00	96171229-26ad-4df5-85b8-30a55c189ef1	eb521af0-7f91-4dc5-9b13-70094e501da3
d563ca8f-2825-4382-b951-e460910db36f	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-23	13620.00		2025-11-22 14:54:06.328268+00	3c9859bc-2442-4046-ad2b-fb4169cae9f4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
73e49d62-84c9-4fd5-82f4-05a3040c5a27	aa75ca99-9bf5-4156-af35-4467c84f44fd	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-15	5977.50		2025-12-15 12:22:05.422497+00	85246a06-a1b5-4b43-8e7f-59bfa5ca6e37	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
dafc4bce-9833-45b2-86f6-69dee054aa30	ae0f877f-a5b4-4955-a295-317855b3ff27	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-15	947.50		2025-12-15 12:22:52.94917+00	113fab24-e3f0-49a1-b765-153992b82a8f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
8fc62193-6496-4c13-9051-616edfb5241c	d3e8eb14-b460-4f82-b334-790165c2a922	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-05	1510.00	Sharif vai 	2025-11-06 04:25:37.246314+00	5fa0762a-00af-4b36-bf0f-f136d748409f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
291d2e4f-ce9e-4616-b8c0-8267c0330c5e	4c5dda16-9682-4bba-aed0-c38e82ec5356	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-08	5436.25	RECEIVED BY by RAFID cash	2025-12-08 12:40:37.369279+00	953ef75f-fb02-44dd-8a7e-932f24e6d26d	975b7b9b-f608-45c0-861d-d91695ec79e9
5062e183-dfb3-4773-8eae-c702c2e6894f	4c5dda16-9682-4bba-aed0-c38e82ec5356	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-30	2938.75	Razul Vai	2025-12-30 04:50:26.654754+00	590d6f11-92bb-443f-89ce-bdf54ebccfbf	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
cf34353c-fece-4516-99ef-42bd75b23186	3531f437-b29d-4f5c-8891-2463ae8e70b5	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-30	13125.00		2025-12-30 11:07:37.406425+00	0a45999a-c3d6-471c-96f1-8b60f5d4fa63	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
226345d6-0ef1-4f50-bce7-f39a8b3eb5ba	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-15	3678.00		2025-12-15 17:41:24.070388+00	b3858511-5be3-4209-b5eb-8917d44fe833	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b9c8f08e-8319-43c9-a904-8dea566d574c	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-15	7536.00		2025-12-15 17:41:42.280129+00	ae4c642e-15c3-4fd1-ba0c-ecd4f1975bf8	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c342520a-d19b-4c72-a4d4-a3a3b560fa2e	feb921c1-425c-4a8a-8748-f7d958a7d3e0	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-15	3966.00		2025-12-15 17:42:00.439814+00	e1f6fb47-7a4e-471b-8143-8a838a871110	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b0b0af3f-0cdb-49e3-8122-cc4c065fd13d	b957c84b-8cc1-4ee9-a24c-a80565676721	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-15	9654.00		2025-12-15 17:42:19.001394+00	49e9f5f2-a1d7-444c-871c-863fda247d50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
fee45478-60ef-4b28-9222-d1bb94b80163	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-15	26660.00	Rafid	2025-12-15 17:43:29.251289+00	e15f5783-f388-4d28-9c29-1c00e7145203	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
bc2e4231-2b05-431e-9f70-b7f9787eea7f	3869bce6-8e5d-4e64-9197-24400000d168	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-17	28345.00		2025-12-17 12:00:04.118617+00	7a2ff977-249f-4061-bee5-371c377e476d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
cb4fa618-7b6c-44ff-b0ad-b8c76f4d91f9	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2026-01-02	3895.50		2026-01-02 06:50:04.646866+00	7f5e1ba0-7530-45c7-a9cf-e4e165f22dfd	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
e7ccd602-e3bb-4d04-9c2b-bf0522a13d29	33a1a534-951a-4f86-a832-188fa5117b57	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-17	8292.00	Razul 	2025-12-18 04:25:54.894695+00	41e63f49-d98d-484e-be0d-0226e7e614c0	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0b6051b4-f435-48b9-b668-e9b7cb14e848	d5a1699b-e816-4560-b055-433d69949c23	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-18	16272.00		2025-12-18 12:07:57.430595+00	6b57782e-748a-43a6-b280-9480d5cf60ed	eb521af0-7f91-4dc5-9b13-70094e501da3
4a6f5b97-4da8-408c-8ada-4d0ff8a0b993	b084d7e5-1c69-4d42-9650-3b2ee45443d3	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-15	3887.50		2025-12-15 12:21:27.018581+00	1546b65a-6cb1-4bd7-b188-4b6c25239b03	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
6b0be6c9-c6e0-4690-8b45-8ec952d2b748	8cb8bd6f-be4d-4964-8e10-eddd392cff87	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-15	11327.50		2025-12-15 12:22:31.685504+00	39f07e05-f704-4de9-9b32-61bbb736d18d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
34bd3ad6-7810-4dd4-9a3e-55908e491881	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-20	3893.75	sharif bkash-15	2025-10-20 10:15:04.647152+00	7775baa6-afc0-4f78-a611-0ef48c5a4d7b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f5e76172-9f4b-4b31-8185-2ea116142de3	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-18	4000.00	sharif bkash-	2025-10-20 10:37:36.797444+00	90b4df42-3e3e-4751-841c-3bddf5e7c685	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
32021409-55f6-4969-9910-e601ef902ec2	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-15	5995.00	Shajib	2025-10-20 11:28:05.54319+00	cb423190-9e99-457b-8cd4-900fe20d3319	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a0d0187c-8588-4749-93be-b5a574346463	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-05	8000.00	sharif bkash-30	2025-10-16 05:09:23.102656+00	10529031-7ca1-49e7-bbd5-b6711a0119f7	b61a9829-5b43-41bc-b09a-3d74a0e05767
d02ccd1d-aafa-472c-b315-ed65d06ff1ae	1885a455-019b-43d3-80e6-7a4fcc1e1232	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-11	5087.00	sharif bkash-30	2025-10-16 05:10:11.18311+00	60c79403-7c6e-4962-ac41-080dcb53fb77	b61a9829-5b43-41bc-b09a-3d74a0e05767
99b6cabc-3fb2-4b24-ad21-4d81ee61d683	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-02	6726.25	sharif bkash-30	2025-10-16 05:10:51.762482+00	c10916aa-a1a9-445c-85b2-4633054fd9ee	b61a9829-5b43-41bc-b09a-3d74a0e05767
e7f59f4a-e196-4c34-90b9-b707c527d94d	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	4000.00	Shajibi bkash	2025-10-16 10:36:28.599013+00	8c475278-a066-4d07-bfe8-2c8c3ff3a6cb	b61a9829-5b43-41bc-b09a-3d74a0e05767
8820bcb7-df98-44e0-bfa3-29e239b70340	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	3587.50	Shajibi bkash	2025-10-16 10:37:15.833524+00	8e7599fd-e273-46f0-9a28-622b94e3a94f	b61a9829-5b43-41bc-b09a-3d74a0e05767
f914e6e5-b5e3-4b2e-8d20-08b53e6100ea	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	5315.00	Shajibi bkash	2025-10-16 10:37:55.818363+00	68323bce-d41e-40e1-aff8-f6cfa00b2394	b61a9829-5b43-41bc-b09a-3d74a0e05767
0b1353dc-4a3b-427a-acca-7cab77823456	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-15	3592.00	Shajibi bkash-15	2025-10-16 10:41:20.651879+00	57104d42-67c0-4056-8d65-43ff0df1d45e	b61a9829-5b43-41bc-b09a-3d74a0e05767
82de9550-b30a-4efe-b665-4e8389248abe	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-18	2237.75	sharif bkash-15	2025-10-19 05:01:08.618788+00	19fada62-2490-4f28-b1ec-f092fd732672	b61a9829-5b43-41bc-b09a-3d74a0e05767
4b6b5b6e-bba5-4295-8b9d-b15f3a3aefb6	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-20	6470.00	shajib bkash-15	2025-10-21 13:03:49.323176+00	1cdc5c7c-078d-414f-99e6-b12165388d8b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
508877f0-5f81-442b-931d-df9354c5691b	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-21	5265.00	sharif bkash	2025-10-22 04:46:56.388309+00	5b3bb8c1-db71-45fd-9813-a6647f29f76c	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b2b68391-13f2-49c5-960e-3d806f8a8c55	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-21	4815.00	sharif bkash	2025-10-22 04:47:53.066874+00	ed45916e-8234-40c9-b870-ca1b86e50160	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0b6df67e-866d-49c4-9997-204b4b167973	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-17	4000.00	sharif bkash-15	2025-10-22 07:18:49.306101+00	40a3c156-2337-4657-97c3-1fc281053bfb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
67b4468f-fc58-4cfa-8f78-cd87395a8a48	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-24	4070.00	sharif bkash-15	2025-10-22 07:20:47.181142+00	b469538e-1104-46fe-a067-091630c9831b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5880bba3-4eba-4de4-a50e-f69317339fa3	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-19	5430.00	shajib bkash-15	2025-10-22 07:21:24.596908+00	724d0837-5889-4e84-8d52-3baa2453776e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a215db16-152f-45c9-893b-01424053202b	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-16	5975.00	shajib	2025-10-22 07:46:33.714644+00	ffa17cff-558c-44b8-b8b3-58173167a8bf	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
afcc0a09-6e48-409c-8767-5ee7e05555fd	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-07	4868.75	sharif bkash-15	2025-10-22 07:47:28.54366+00	4542d8d8-182a-4f1b-8dbe-7a9ae6ce7d10	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b5e9635c-c280-4749-beed-b061c929b3b5	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-23	4798.00	Sharif Vai	2025-10-23 07:33:02.832209+00	5139b4d7-5c0d-42e5-ba24-00962089bd0a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b7ced6f3-2e6f-45cc-94bf-f46428605914	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-05	3305.75	sharif bkash-30	2025-10-16 05:28:47.267296+00	fc3fa8a4-b8cb-46c8-9d79-fd12a702b2c7	b61a9829-5b43-41bc-b09a-3d74a0e05767
38209d41-af44-4261-b91e-cde81d157f23	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-25	4655.88	sharif bkash-15	2025-10-22 07:26:51.968513+00	0ddb3608-b727-4e99-be09-b7809537c8af	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
8d3cebbb-0c10-45f3-ba53-91c8cafb3f41	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-03	5480.00	sharif bkash-31	2025-11-03 12:18:55.406669+00	d5b5e2c5-f97b-401a-a245-41037f13cf5e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
daa7f581-2851-4cff-be67-512738b692cb	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-03	3066.00	sharif bkash-31	2025-11-03 12:19:22.442466+00	09e86a21-078c-44b6-9543-59deea61a494	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
2368c131-01ed-4542-94b2-1c5ae6c50276	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-03	2048.75	Sharif vai	2025-11-04 05:18:04.36625+00	90b4df42-3e3e-4751-841c-3bddf5e7c685	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a7181939-d518-47af-9eca-5cde852e3fc2	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-03	3952.00	sharif vai	2025-11-04 05:18:56.684104+00	11de7713-28b5-4f5b-a63b-0ac73bec529d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9c68cff7-c909-4787-9abb-aaa803094c05	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-04	7230.00	Sharif Vai	2025-11-04 08:59:51.730393+00	26789a34-c804-4af0-b60c-700d22deaf32	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9655dc5b-c542-458d-b481-d41d401820b7	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-05	3625.00	Sharif	2025-11-05 13:01:50.182604+00	2cb637f3-fdcc-448d-8b00-1156f8e2f4ce	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
778e08e2-cdc9-4973-a346-9495cf05d80b	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-05	6570.00	Sharif Vai	2025-11-05 13:02:47.884136+00	89b82af8-072a-4977-8d1f-da69c96e39d8	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
465e437b-5704-469d-b7aa-9b9a640b0cc1	d3e8eb14-b460-4f82-b334-790165c2a922	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-05	1110.00	Sharif vai 	2025-11-06 04:24:40.263296+00	b6c1c0e9-c2f2-4d95-99df-bfdd9668359b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b29089b4-47a3-468e-ac50-42cd3625d378	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-23	5390.00	Sharif vai 	2025-11-06 06:02:09.999012+00	ddc518ff-4803-4243-a4c6-6405e39ae6bb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f67f2419-626e-416d-9ba3-05fc70d46f64	1885a455-019b-43d3-80e6-7a4fcc1e1232	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-08	5800.00	Sharif vai	2025-11-08 10:14:27.792173+00	588bf3cf-6ff0-4729-bbca-29b6d79ba674	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b13f4240-f2e5-45d9-8bd6-a9ff8699002d	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-08	6610.00	Sharif Vai 	2025-11-09 04:28:29.92847+00	1fb7bbfc-31c5-4a96-8de1-5ef458219493	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d4444c2f-832d-40df-a2d8-eeb446435118	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-08	7216.00	Sharif vai	2025-11-09 04:29:38.899091+00	6b0bfbe3-378e-4fbe-95e3-37a49a2063ba	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5db6449c-9e7e-4278-96b0-2eeaa426760b	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-09	2097.00	Sharif Vai 	2025-11-10 04:36:45.078871+00	ad1885d8-47ba-4c3a-95f8-dc42b8667151	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f2ac2449-1896-4b5d-9566-877e82da3eef	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-11	4240.00	Shajib	2025-11-11 06:49:48.283966+00	2a66d064-bda6-4ad5-bda3-ee73dfc54f5e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
e9c67a65-d1ab-4afa-9911-2a02420e1e39	1885a455-019b-43d3-80e6-7a4fcc1e1232	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-13	2988.00	Sharif Vai	2025-11-13 06:26:57.20134+00	eda4423b-6f0e-4741-81af-44cf7abebc6f	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b2c96bf7-81d4-4918-b387-97a1ca99036e	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-16	4410.00	Sharif Vai	2025-11-16 09:13:29.271106+00	4780ac53-7c57-4aaa-bdeb-c848430566c8	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
e267a81d-ae22-4001-aa7e-d1dc2b174dff	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-15	4285.00	Sharif Vai	2025-11-16 10:19:01.480959+00	4738565c-35bc-4fb5-a7c5-9c1b3c33cab4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b3a2f11a-68f4-41d0-a28e-3f90d6f87370	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-16	2000.00	Shajib	2025-11-17 09:42:41.748361+00	d0259d7e-2f38-4a48-a8a2-37b42eef80ef	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
648eef5d-0bca-4fa7-8a0f-2008330eb02e	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-17	2525.00	Sharif Vai 	2025-11-19 04:53:40.505883+00	c62ab849-ee33-46d6-b35e-e6cf25bcb920	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
e0e87f07-9412-41a1-aa26-8fc9c0dc745d	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-19	3658.00	Sharif Vai	2025-11-20 04:28:55.214051+00	78782288-7419-4f68-bbe3-377e0eac6944	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
551d5e9c-1d74-4f91-94fb-21fd5ab4f88f	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-20	5166.00	Sharif Vai	2025-11-20 07:15:50.911241+00	142a358b-9c9d-48ed-a1a8-c3e8eadbb319	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0061916e-759b-4308-aba8-808a7ea44233	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-23	3160.00	Shajib	2025-11-23 05:07:02.707175+00	8742c1ad-3033-4c61-b60e-247cab753def	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f7ad26c2-3a13-4433-9d30-2bd589c21701	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-22	3330.00	Sharif 	2025-11-23 05:07:27.984579+00	c623e8b0-6e14-442f-a666-26dfca787578	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b59f4e9d-ce76-4412-b164-3d07c28a9433	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-20	4110.00	Sharif	2025-11-23 05:09:14.072012+00	4fd45151-0731-4c86-a6f4-c1a0ff6ba480	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
32b25467-c77c-4210-a2bd-9fa195260228	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-11-24	6666.00	PMD, Sharif Bhai	2025-11-24 10:51:28.739768+00	c574b35c-95bd-4b8e-b9c7-7c0902cd843a	b61a9829-5b43-41bc-b09a-3d74a0e05767
a7e08e4e-f7b5-403f-9708-257720f7aaa5	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-03	3760.00	Sharif Vai 	2025-12-03 09:39:54.520742+00	65944461-e61d-4dca-8dc3-b131f404b89d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f3cde133-fe96-4e9f-8408-4f7f5c251726	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-03	4090.00	Sharif Vai 	2025-12-03 09:40:23.100511+00	a1af55f5-d63e-4f87-8762-eb6b858f3800	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a80d21e1-e7c1-402b-aa10-48611b0e7abc	277b890a-f8fe-4cb2-a106-066731d848e3	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-05	3781.00	Sharif	2025-12-05 16:32:32.539987+00	d97125dc-c0e7-4eda-ae76-e0c85d0869d4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a4e4504b-6f6d-4ddc-8218-abc41c4db8f6	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-05	3512.00	Sharif 	2025-12-05 16:32:55.200101+00	5bc95bd5-f7d3-4d98-8622-9b71960919a4	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f81ff10c-3daf-4825-932e-b5ab4f086d22	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-06	2500.00	Sharif	2025-12-06 16:43:50.084219+00	a5936ae7-ab7c-43a2-acd8-4916c63172eb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
64642582-b303-43b5-ad76-1dec9f8d4312	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-08	2690.00	(Bikash) Sarif	2025-12-08 11:29:04.728393+00	c0f90e86-945b-4b70-822e-c303a87acd39	eb521af0-7f91-4dc5-9b13-70094e501da3
4c8620c5-96fb-4d14-b7b9-52d70116e740	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-09	3430.00	Sajib	2025-12-09 10:08:15.90482+00	10cd9c0f-1078-4859-ae68-77bed10699a2	eb521af0-7f91-4dc5-9b13-70094e501da3
7e3a118c-6d74-4b63-8b11-1acc643826ea	d3e8eb14-b460-4f82-b334-790165c2a922	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-15	840.00	Sarif (Bikash)	2025-12-10 06:10:22.016647+00	dc95b90d-a6ea-4cbc-9c3c-63dfbdedd3b5	eb521af0-7f91-4dc5-9b13-70094e501da3
2a557eda-7c75-40a5-9d71-a82db8133a45	d3e8eb14-b460-4f82-b334-790165c2a922	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-31	1440.00	Sarif (Bikash)	2025-12-10 06:11:37.360502+00	84ad0a5e-6e6b-4fba-a8a1-cabdacbb2841	eb521af0-7f91-4dc5-9b13-70094e501da3
573e0120-269f-4667-95c8-3732ee12b94f	6d29d8b3-9777-4a01-8431-53acbcad9363	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-03	4370.00	Sharif 	2025-12-14 04:19:53.114355+00	b3d6fee4-dc5f-4eee-9088-25832cbb78b9	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
15b84b0e-d772-496c-84a4-86c228f8b8af	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-06	2726.00	Sharif	2025-12-14 04:20:39.733927+00	54f8a476-9b6d-43ee-8164-22c1faf1fbe5	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5b5787b0-7a8c-4c94-a502-95b32897de6e	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-15	1631.00	Sharif	2025-12-15 17:11:08.434098+00	a5936ae7-ab7c-43a2-acd8-4916c63172eb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d2ab86b9-bd04-4deb-81fe-c4b8fc5a515d	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-15	631.00	Sharif	2025-12-15 17:11:37.023741+00	11de7713-28b5-4f5b-a63b-0ac73bec529d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
019d3e67-dc40-47e2-a79d-18750cff4cde	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-17	3750.00	Sharif	2025-12-17 12:14:02.725754+00	74063bb6-eb00-4da8-9895-605a365e856c	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
25ee34ac-7bf3-4666-9b8c-94b2a87a9b9c	ee68bac1-c967-4b3e-be4c-53aeba1f1249	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-17	4450.00	sharif 	2025-12-17 12:26:44.147408+00	725bae2b-fb4e-4b44-83b1-3769d63b3168	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
5be7a98a-c75c-493f-8feb-84dc8348d850	07490f7a-5244-4e67-bcc0-4fd1df88ed92	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-18	3657.00	(BIKASH) SARIF	2025-12-18 12:00:11.373193+00	14c48ffa-1507-4516-92f4-7c5b74c48581	eb521af0-7f91-4dc5-9b13-70094e501da3
17ab442e-2ca5-4cfd-a0ff-d94dbb8288dd	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-19	3990.00	Sharif	2025-12-19 17:35:33.59704+00	46671eaf-362c-43d8-ad6f-d09eea6533fb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
cdf7c68c-64ab-4656-b78e-2896af046729	95394e96-0af0-42c5-9fcc-e41e116ec592	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-21	4032.00		2025-12-21 12:10:23.57937+00	4694b1d6-5dd1-4989-9a01-aa26edea19a8	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c90b4fa7-fe71-47e9-8d49-db3e37e027d1	bf03337a-93fd-45a5-84c1-79fb21d59745	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-21	1991.00	sharif	2025-12-21 13:00:56.204887+00	0fca90ab-9ef6-4aaf-842c-9fb150c4a5db	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
914e8309-b3a1-42ba-9e07-1dbdc1a2a04a	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-15	238.00	Sharif	2025-12-15 17:12:06.660513+00	896b6c8f-3437-48d8-9153-2c196954c27c	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a49b843c-575b-418b-8cb1-81c6fcbbb7f5	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-12-22	4690.00		2025-12-22 06:37:06.858512+00	7221c350-1bd4-4997-89f7-be271f8b3ef3	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f3481621-6ce8-4da1-bcef-8ce1052f5447	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-23	13400.00	Rafid	2025-12-23 04:17:07.837102+00	e3001caf-bf1d-44d9-8f15-96f06df0c986	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f384a2b2-7792-4cc1-add4-2c84d8eb002f	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-23	15086.00	Rafid	2025-12-23 04:17:40.560235+00	40203ac5-2379-4a05-9d77-00564086a7fb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c13b78b9-c8e4-4d12-a6e4-fec88846100d	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-12-23	15416.00	Rafid 	2025-12-23 04:18:12.477058+00	e320b880-c661-4fbe-aaf4-68c2226342a8	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
269a3cf2-d4cd-4d70-867a-ec572fcb8f8e	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-24	3520.00	Sharif 	2025-12-24 03:56:07.750512+00	0c86c553-b56d-40c4-881d-1758cac2bd3d	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9a498873-9332-47b3-a15e-e97e5067bf05	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-12-24	28150.00	Rafid 	2025-12-24 03:57:44.247415+00	53586993-2821-4f9f-87f6-442e25508e17	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
0694e8c3-19bd-47bc-bb05-e5402a1e7f69	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	d2fabda9-ee77-4536-a783-67d66406889a	2026-01-01	5330.00	Sharif 	2026-01-01 08:25:27.645546+00	0fc6bffc-b392-4bcb-ae84-ef391a701fdb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
d7456da8-54a3-4bec-b2ff-6f4715f6ce19	d3e8eb14-b460-4f82-b334-790165c2a922	d2fabda9-ee77-4536-a783-67d66406889a	2026-01-01	4085.00		2026-01-02 06:51:11.122624+00	e0070b71-d9bf-4ce0-8602-665ba1e31ef9	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
\.


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machines (id, machine_name, machine_number, esp_id, franchise_id, branch_location, installation_date, initial_coin_counter, initial_prize_counter, notes, created_at, is_active) FROM stdin;
bf03337a-93fd-45a5-84c1-79fb21d59745	Fino 	15	Clowee_0006	643bfd3f-24b6-491c-bed7-2d7d17968924	Uttara	2025-09-06	27	12		2025-10-13 11:21:29.062237+00	t
6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	Pizzburg Mirpur	2	pizzaburg_mirpur_0023\t	29248edb-d4a3-4a78-9800-a10f60ad3488	Mirpur	2023-08-22	3795	2139		2025-10-12 05:09:40.887631+00	t
6ee6ed8e-bff1-43d0-a29b-1764668b2b29	Pizzburg Dhanmondi	3	pizzaburg_dhanmondi_0024	29248edb-d4a3-4a78-9800-a10f60ad3488	Dhanmondi	2025-10-12	47361	2825		2025-10-12 05:15:57.240551+00	t
b5327e30-7b83-4fda-99aa-99a107bbcca9	The Cafe Rio Mirpur	6	Cafe_Rio_Mirpur_39	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Mirpur	2025-10-12	51120	3334		2025-10-12 05:37:41.794156+00	t
74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	The Cafe Rio Mohammadpur 	5	Cafe_Rio_Mohammadpur_03	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Mohammadpur	2025-10-12	20424	1376		2025-10-12 11:53:17.776646+00	t
aa75ca99-9bf5-4156-af35-4467c84f44fd	The Dining Lounge Wari	9	dinning_lounge_wari_0033	45f8ecfd-161e-476c-80eb-ad4655cdb752	Wari	2024-02-08	19431	1200		2025-10-12 12:39:00.511858+00	t
8cb8bd6f-be4d-4964-8e10-eddd392cff87	The Dining Lounge Narayanganj	10	dinning_lounge_narayangonj_0027	45f8ecfd-161e-476c-80eb-ad4655cdb752	Narayanganj	2025-10-12	35744	2879		2025-10-12 12:40:30.018196+00	t
ae0f877f-a5b4-4955-a295-317855b3ff27	The Dining Lounge Khilgaon	8	Dining_Lounge_Khilgaon	45f8ecfd-161e-476c-80eb-ad4655cdb752	Khilgaon	2024-03-04	12916	1394		2025-10-12 12:42:44.275018+00	t
3869bce6-8e5d-4e64-9197-24400000d168	Baily Deli\t	17	Baily_Deli_0026	01e5be66-b965-4adb-bc9a-2cfa16954161	Bailey Rd	2023-09-20	11690	6849		2025-10-12 12:51:34.753072+00	t
29e89cc6-04f5-475d-8dd7-c2efe05d4c55	Crush Station Sonir Akhra	13	crush_station_sonirakhra_0047	c41a6043-e460-480b-a569-430c96d00541	Sonir Akhra	2024-05-14	52161	3647		2025-10-13 11:00:13.889636+00	t
4f9ad276-ec83-423b-bb6a-3431e5b5d74f	Crush Station Narayanganj	14	crush_station_narayanganj_0048	c41a6043-e460-480b-a569-430c96d00541	Narayanganj	2025-10-13	14037	42481		2025-10-13 11:06:34.204629+00	t
ee68bac1-c967-4b3e-be4c-53aeba1f1249	Crush Station Uttara	11	Crush_Station_Uttara_0045	c41a6043-e460-480b-a569-430c96d00541	Uttara	2024-10-20	15873	2171		2025-10-13 11:09:02.870478+00	t
b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	Crush Station Dhanmondi	12	Crush_Station_Dhanmondi_37	c41a6043-e460-480b-a569-430c96d00541	Dhanmondi	2024-10-17	25639	1604		2025-10-13 11:10:21.114507+00	t
277b890a-f8fe-4cb2-a106-066731d848e3	Fuoco Uttara	16	Fuoco_Mirpur_35	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	Uttara	2025-10-13	9199	1295		2025-10-13 11:16:09.960621+00	t
dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	Keedlee CTG 	20	keedlee_0049	c754765f-279d-4800-88dd-c08b89803b36	CTG	2025-03-02	6096	1932		2025-10-13 11:23:43.311615+00	t
feb921c1-425c-4a8a-8748-f7d958a7d3e0	Shang High Restaurant-1	27	Shang_High_Restaurant_53	c9168bd5-0b15-49dc-9a35-cc5b52535600	Dhanmondi	2025-08-12	1105	775		2025-10-13 11:26:52.111616+00	t
b957c84b-8cc1-4ee9-a24c-a80565676721	Shang High Restaurant-2	28	Shang_High_Restaurant_54	c9168bd5-0b15-49dc-9a35-cc5b52535600	Dhanmondi	2025-08-12	16227	975		2025-10-13 11:28:23.615687+00	t
72cbe2e1-4a91-425e-8a53-71533ffbdb0e	Food Rail	26	Food_Rail_52	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	Mirpur	2025-07-01	2370	912		2025-10-13 11:33:08.034646+00	t
6d29d8b3-9777-4a01-8431-53acbcad9363	Chick E Cheese Narayangonj	19	Chick_E_Cheese_0046	c41a6043-e460-480b-a569-430c96d00541	Narayanganj	2024-04-12	6548	1773		2025-10-13 11:35:03.722062+00	t
4c5dda16-9682-4bba-aed0-c38e82ec5356	ChefMate Lounge	24	Clowee_00024	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	Dhanmondi	2025-09-18	46	15	[STATUS:active]	2025-10-13 11:44:38.759773+00	t
b084d7e5-1c69-4d42-9650-3b2ee45443d3	The Dining Lounge Uttara	7	Dining_Lounge_Uttara_41	45f8ecfd-161e-476c-80eb-ad4655cdb752	Uttara	2024-05-04	26237	1942	[STATUS:active]	2025-10-12 12:44:22.163041+00	t
d3e8eb14-b460-4f82-b334-790165c2a922	Chick E Cheese Sonir Akhra	18	Cafe_Rio_Mirpur_2_39	c41a6043-e460-480b-a569-430c96d00541	Sonir Akhra	2024-05-13	6032	2111	[STATUS:active]	2025-10-13 11:36:43.640884+00	t
3531f437-b29d-4f5c-8891-2463ae8e70b5	The Cafe Rio Uttara 	4	Cafe_Rio_Uttara_2_40	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Uttara	2024-05-13	36493	3004	[STATUS:active]	2025-10-12 11:51:39.119882+00	t
d5a1699b-e816-4560-b055-433d69949c23	MadChef Baily Road 	22	ESP32_Clowee_00022	9f092d84-60ed-481b-9466-ec5862e4acf9	Baily Road	2025-10-30	40	591	[STATUS:active]	2025-10-30 10:41:00.627054+00	t
33a1a534-951a-4f86-a832-188fa5117b57	MadChef Dhanmondi	23	\tESP32_Clowee_00023	9f092d84-60ed-481b-9466-ec5862e4acf9	Dhanmondi	2025-11-12	10850	24695	[STATUS:active]	2025-11-12 06:18:31.528824+00	t
07490f7a-5244-4e67-bcc0-4fd1df88ed92	Kolapata	29	Kolapata_Narayanganj_0045	3002befd-50db-4aca-964e-9476d0521850	Narayanganj	2024-09-18	17789	1045	[STATUS:active]	2025-10-16 05:25:19.515851+00	t
2fd45c00-2dce-471f-a4d8-f5ede2d712c4	Pizzburg Gulshan 	1	pizzaburg_gulshan_0022	29248edb-d4a3-4a78-9800-a10f60ad3488	Gulshan	2023-08-22	34223	3092	[STATUS:active] sff	2025-10-12 04:50:21.479401+00	t
1885a455-019b-43d3-80e6-7a4fcc1e1232	Mr. Manik Food's Uttara	21	Manik_Foods_41	9bbb9704-569c-4293-bbf8-df983d8ed37b	Uttara	2024-06-03	9915	24645	[STATUS:inactive]	2025-10-13 11:48:46.330038+00	f
95394e96-0af0-42c5-9fcc-e41e116ec592	MadChef Mirpur	21	ESP32_MadChef_Mirpur_55	9f092d84-60ed-481b-9466-ec5862e4acf9	Mirpur-10	2025-11-30	549	25	[STATUS:active]	2025-11-26 08:02:36.724852+00	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, notification_type, message, related_module, user_id, status, created_at) FROM stdin;
3c80c840-0be8-4a50-b083-56820aeb4c8d	Info	Database backup completed	System	\N	read	2025-10-15 10:40:32.729643+00
41059d52-ae2a-4a79-8e92-2a2acfe0d363	Success	New franchise onboarded	Franchises	\N	read	2025-10-15 10:40:32.729643+00
e7105504-9ed9-4b75-a346-c378809931c9	Info	Monthly report generated	Reports	\N	read	2025-10-15 10:40:32.729643+00
89367c39-44f6-4fdd-b20b-082881f5de78	Warning	Low inventory alert for Machine #001	Machines	\N	read	2025-10-15 10:40:32.729643+00
027819bf-5c5d-4447-b92c-0bd2aff08b5a	Success	System initialized successfully	System	\N	read	2025-10-15 10:40:32.729643+00
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, franchise_id, effective_date, coin_price, doll_price, electricity_cost, vat_percentage, created_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, machine_id, franchise_id, sales_date, coin_sales, sales_amount, prize_out_quantity, prize_out_cost, created_at, invoice_number, payment_status, coin_adjustment, prize_adjustment, adjustment_notes, vat_amount, net_sales_amount, clowee_profit, pay_to_clowee, created_by, amount_adjustment, electricity_cost) FROM stdin;
1ca5bf33-f699-4265-865d-7f660324e01a	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-30	1072	26800.00	110	14300.00	2025-10-12 04:58:35.292683+00	clw/01/2025/09	Due	58	-52	\N	0.00	26800.00	5000.00	19300.00	\N	0.00	0.00
6804c358-e42b-46f6-a423-a1d6bde9bcbb	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-30	937	23425.00	92	11960.00	2025-10-12 05:12:53.286852+00	clw/02/2025/09	Due	16	-25	\N	0.00	23425.00	4586.00	16546.00	\N	0.00	0.00
8e7599fd-e273-46f0-9a28-622b94e3a94f	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	203	5075.00	15	2100.00	2025-10-14 05:03:59.820352+00	clw/12/2025/09H2	Due	0	0	\N	0.00	5075.00	1487.50	3587.50	\N	0.00	0.00
8c475278-a066-4d07-bfe8-2c8c3ff3a6cb	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	236	5900.00	15	2100.00	2025-10-14 05:04:43.348661+00	clw/11/2025/09H2	Due	0	3	\N	0.00	5900.00	1900.00	4000.00	\N	0.00	0.00
68323bce-d41e-40e1-aff8-f6cfa00b2394	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	358	8950.00	12	1680.00	2025-10-14 05:05:33.525467+00	clw/14/2025/09H2	Due	15	0	\N	0.00	8950.00	3635.00	5315.00	\N	0.00	0.00
ed45916e-8234-40c9-b870-ca1b86e50160	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	262	6550.00	22	3080.00	2025-10-14 05:06:28.708681+00	clw/13/2025/09H2	Due	11	-2	\N	0.00	6550.00	1735.00	4815.00	\N	0.00	0.00
6b82d9e1-1030-446a-82c9-d5db1d60152b	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-30	591	17730.00	31	4650.00	2025-10-14 05:55:06.014358+00	clw/27/2025/09H2	Due	141	0	\N	0.00	17730.00	7848.00	12498.00	\N	0.00	0.00
2b8f2d71-505c-49e5-83e9-953eba7154e0	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-30	474	14220.00	22	3300.00	2025-10-14 05:55:35.031259+00	clw/28/2025/09H2	Due	261	0	\N	0.00	14220.00	6552.00	9852.00	\N	0.00	0.00
ddc518ff-4803-4243-a4c6-6405e39ae6bb	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	336	8400.00	17	2380.00	2025-10-14 06:06:11.149945+00	clw/19/2025/09H2	Due	1	-2	\N	0.00	8400.00	3010.00	5390.00	\N	0.00	0.00
5fa0762a-00af-4b36-bf0f-f136d748409f	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	104	2600.00	3	420.00	2025-10-14 06:09:45.237288+00	clw/18/2025/09H2	Due	24	0	\N	0.00	2600.00	1090.00	1510.00	\N	0.00	0.00
60c79403-7c6e-4962-ac41-080dcb53fb77	1885a455-019b-43d3-80e6-7a4fcc1e1232	9bbb9704-569c-4293-bbf8-df983d8ed37b	2025-09-30	260	6500.00	24	3360.00	2025-10-14 06:30:24.084802+00	clw/21/2025/09	Due	61	-21	\N	0.00	6500.00	1413.00	5087.00	\N	0.00	0.00
c10916aa-a1a9-445c-85b2-4633054fd9ee	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-09-30	364	9100.00	28	4200.00	2025-10-14 05:44:42.80383+00	clw/15/2025/09H2	Due	33	-24	\N	0.00	9100.00	2205.00	6726.25	\N	0.00	169.00
5b3bb8c1-db71-45fd-9813-a6647f29f76c	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	298	7450.00	22	3080.00	2025-10-16 07:58:04.833845+00	clw/13/2025/10H1	Due	17	0	\N	0.00	7450.00	2185.00	5265.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
19fada62-2490-4f28-b1ec-f092fd732672	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-10-15	120	3000.00	12	1560.00	2025-10-16 09:35:59.439263+00	clw/16/2025/10H1	Due	23	-1	\N	0.00	3000.00	684.00	2237.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
05a29ec7-5290-48fe-a93d-a5dc3782eaaf	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-15	201	6030.00	9	1350.00	2025-10-19 06:36:51.74218+00	clw/28/2025/10H1	Due	217	0	\N	0.00	6030.00	2808.00	4158.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
2b1a4eef-c85d-4c7e-9505-34dd51e746ee	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-15	422	12660.00	24	3600.00	2025-10-19 06:36:54.056613+00	clw/27/2025/10H1	Due	250	0	\N	0.00	12660.00	5436.00	9036.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
5139b4d7-5c0d-42e5-ba24-00962089bd0a	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-10-14	268	6700.00	19	2850.00	2025-10-16 05:41:06.213566+00	clw/15/2025/10H1	Due	6	0		0.00	6700.00	1925.00	4605.50	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.75	0.00
7775baa6-afc0-4f78-a611-0ef48c5a4d7b	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-10-15	246	6150.00	10	1400.00	2025-10-19 07:07:39.167399+00	clw/23/2025/10H1	Due	37	-5	\N	0.00	6150.00	2256.25	3893.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
4d9c9bd1-e785-4b1f-ac2c-44a35dcd51c9	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-29	1588	39700.00	122	15860.00	2025-10-12 05:17:54.379438+00	clw/03/2025/09	Due	49	-12		0.00	39700.00	9536.00	25354.00	\N	42.00	0.00
8c86e40d-60cf-4b06-a0ae-bb2278216b5b	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-10	2271	56775.00	144	21600.00	2025-10-16 06:15:21.487841+00	clw/06/2025/10H1	Due	185	0		2838.75	53936.25	16168.13	37500.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	18.13	0.00
57104d42-67c0-4056-8d65-43ff0df1d45e	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	209	5225.00	14	1960.00	2025-10-16 07:02:11.171902+00	clw/11/2025/10H1	Due	0	-4		0.00	5225.00	1632.50	3592.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.50	0.00
1cdc5c7c-078d-414f-99e6-b12165388d8b	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	378	9450.00	25	3500.00	2025-10-16 09:42:33.750625+00	clw/12/2025/10H1	Due	0	0		0.00	9450.00	2975.00	6470.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	5.00	0.00
fc3fa8a4-b8cb-46c8-9d79-fd12a702b2c7	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-09-30	186	4650.00	13	1820.00	2025-10-16 05:28:07.558036+00	clw/23/2025/09H2	Due	34	0		0.00	4650.00	1415.00	3235.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
1edaf64e-6ef9-4a38-97a9-3eb515c2a177	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	400	10000.00	47	7050.00	2025-10-14 04:55:00.274342+00	clw/05/2025/09H2	Due	0	0	\N	500.00	9500.00	1225.00	8025.00	\N	0.00	250.00
9ab884d3-be80-4801-be6a-6008dca9d4fe	8cb8bd6f-be4d-4964-8e10-eddd392cff87	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	812	20300.00	80	10400.00	2025-10-14 05:28:46.940629+00	clw/10/2025/09	Due	26	-3	\N	0.00	20300.00	4950.00	15012.50	\N	0.00	337.50
ef270f9d-fa2e-4283-834f-08ffc516d7cb	ae0f877f-a5b4-4955-a295-317855b3ff27	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	148	3700.00	16	2080.00	2025-10-14 05:29:37.140631+00	clw/08/2025/09	Due	6	-4	\N	0.00	3700.00	810.00	2552.50	\N	0.00	337.50
3ac79576-2cf2-44ff-8237-179a934c933f	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-09-30	1635	40875.00	72	7920.00	2025-10-12 12:59:56.46755+00	clw/17/2025/09H2	Due	27	-27		2043.75	38831.25	15455.63	23327.22	\N	48.41	0.00
bd1c789b-3c18-4c47-8fef-cfa60fb11159	aa75ca99-9bf5-4156-af35-4467c84f44fd	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	664	16600.00	55	7150.00	2025-10-14 05:27:57.014243+00	clw/09/2025/09	Due	31	-2		0.00	16600.00	4725.00	11537.50	\N	0.00	337.50
ba688357-6037-495b-8074-16308ed7144f	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	2270	56750.00	158	23700.00	2025-10-12 05:45:03.33597+00	clw/06/2025/09H2	Due	401	-1		2837.50	53912.50	15106.25	38556.25	\N	0.00	250.00
10529031-7ca1-49e7-bbd5-b6711a0119f7	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-09-30	432	10800.00	39	5070.00	2025-10-16 05:08:46.100134+00	clw/16/2025/09H2	Due	63	-8	\N	0.00	10800.00	2721.75	8000.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	78.25
90b4df42-3e3e-4751-841c-3bddf5e7c685	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-09-30	354	8850.00	20	3000.00	2025-10-20 10:36:59.569311+00	clw/26/2025/09H2	Due	100	8	\N	0.00	8850.00	2632.50	6048.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	169.00
7b2f818e-5d2f-4a26-9af0-8abc722031b5	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-15	516	12900.00	50	7500.00	2025-10-16 10:57:56.852987+00	clw/05/2025/10H1	Due	0	35		645.00	12255.00	2377.50	9600.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	27.50	0.00
8fd198de-b3bf-472e-9363-f720655f1514	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-10-15	410	10250.00	24	3600.00	2025-10-16 09:52:47.705357+00	clw/24/2025/10H1	Due	13	-1		0.00	10250.00	3325.00	6767.50	b61a9829-5b43-41bc-b09a-3d74a0e05767	-11.25	0.00
7c3114af-8292-4993-bf95-91acc86655e3	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-10-15	248	6200.00	10	1500.00	2025-10-19 11:19:56.567986+00	clw/20/2025/10	Due	74	0		0.00	6200.00	2350.00	3850.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
d0259d7e-2f38-4a48-a8a2-37b42eef80ef	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-09-30	220	5500.00	7	1050.00	2025-10-14 05:52:26.001275+00	clw/20/2025/09H2	Due	96	0		0.00	5500.00	2225.00	3275.00	\N	0.00	0.00
cb423190-9e99-457b-8cd4-900fe20d3319	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	390	9750.00	16	2240.00	2025-10-20 10:59:17.538245+00	clw/14/2025/10H1	Due	13	-2	\N	0.00	9750.00	3755.00	5995.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
dc95b90d-a6ea-4cbc-9c3c-63dfbdedd3b5	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	56	1400.00	2	280.00	2025-10-21 10:20:54.489341+00	clw/18/2025/10H1	Due	16	-1	\N	0.00	1400.00	560.00	840.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
1329d001-e4bf-4624-be6d-a4e04f13e54e	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-15	656	16400.00	34	5100.00	2025-10-21 10:26:58.477822+00	clw/04/2025/10H1	Due	1158	18	\N	820.00	15580.00	5240.00	10090.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
2cb637f3-fdcc-448d-8b00-1156f8e2f4ce	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	234	5850.00	10	1400.00	2025-10-20 09:13:17.217168+00	clw/19/2025/10H1	Due	0	-3		0.00	5850.00	2225.00	3625.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
84ad0a5e-6e6b-4fba-a8a1-cabdacbb2841	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	96	2400.00	3	420.00	2025-11-04 05:15:03.556284+00	clw/18/2025/10H2	Due	27	0	\N	0.00	2400.00	990.00	1410.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
11de7713-28b5-4f5b-a63b-0ac73bec529d	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-10-15	272	6800.00	15	2250.00	2025-10-20 09:28:44.593792+00	clw/26/2025/10H1	Due	1	4		0.00	6800.00	2275.00	4355.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.75	0.00
4542d8d8-182a-4f1b-8dbe-7a9ae6ce7d10	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-09-15	314	7850.00	21	3150.00	2025-10-22 06:41:08.123129+00	clw/26/2025/09H1	Due	0	0	Manual Entry\n\nThe Stories cafe adjustment\n30 sep 2025\n3 pcs doll\n36 pcs coin	0.00	7850.00	2350.00	5331.25	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	169.00
ffa17cff-558c-44b8-b8b3-58173167a8bf	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	338	8450.00	25	3500.00	2025-10-22 05:38:54.905301+00	clw/11/2025/09H1	Due	0	0	Manual Entry	0.00	0.00	2475.00	5875.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
40a3c156-2337-4657-97c3-1fc281053bfb	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	220	5500.00	18	2520.00	2025-10-22 05:49:36.564911+00	clw/13/2025/09H1	Due	0	0	Manual Entry	0.00	5500.00	1490.00	4000.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10.00	0.00
724d0837-5889-4e84-8d52-3baa2453776e	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	356	8900.00	14	1960.00	2025-10-22 05:53:01.338654+00	clw/14/2025/09H1	Due	0	0	Manual Entry	0.00	6940.00	3470.00	5430.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
2415e8c0-d670-40b0-9173-f89a9345bebf	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	820	20500.00	48	6720.00	2025-10-22 06:09:11.351226+00	clw/19/2025/09H1	Due	0	0	Manual Entry	0.00	13779.99	6890.00	13610.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
0ddb3608-b727-4e99-be09-b7809537c8af	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-09-15	223	5575.00	26	3640.00	2025-10-22 06:22:11.59163+00	clw/23/2025/09H1	Due	0	0	Manual Entry	0.00	1838.25	919.13	4655.88	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
526a8c38-7cf4-4103-9445-d09b43d94c38	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-15	404	12120.00	28	4200.00	2025-10-22 06:52:49.769471+00	clw/27/2025/09H1	Due	0	0	Manual Entry	0.00	7920.00	4752.00	8952.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
c1d52844-af7c-46d5-a2f4-2fd26fb42bfe	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-15	486	14580.00	30	4500.00	2025-10-22 06:54:30.893071+00	clw/28/2025/09H1	Due	0	0	Manual Entry	0.00	10080.00	6048.00	10548.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
b469538e-1104-46fe-a067-091630c9831b	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-09-14	225	5625.00	18	2520.00	2025-10-22 05:46:22.288659+00	clw/12/2025/09H1	Due	0	0	Manual Entry	0.00	5625.00	1552.50	4070.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	2.50	0.00
998f54d2-a739-4e08-9f89-192de04b7f68	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-09-14	112	2800.00	11	1650.00	2025-10-22 06:19:17.623137+00	clw/20/2025/09H1	Due	0	0	Manual Entry	0.00	2800.00	575.00	2224.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.50	0.00
4e6cd023-e793-4195-8a78-3232ab9504c6	b084d7e5-1c69-4d42-9650-3b2ee45443d3	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	372	9300.00	31	4030.00	2025-11-02 10:04:42.826652+00	clw/07/2025/09	Due	118	0	\N	0.00	9300.00	2635.00	6327.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
b6c1c0e9-c2f2-4d95-99df-bfdd9668359b	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	72	1800.00	3	420.00	2025-10-22 06:06:13.453873+00	clw/18/2025/09H1	Due	0	0	Manual Entry	0.00	1800.00	690.00	1110.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
d8bffeb1-e4b7-4705-9686-088a722a29cc	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-31	800	20000.00	22	3300.00	2025-11-02 06:58:31.407134+00	clw/04/2025/10H2	Due	52	0	\N	1000.00	19000.00	7850.00	10900.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
140362ff-e43a-4cad-8f61-e9b40be43c31	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	800	20000.00	54	8100.00	2025-10-21 10:23:13.721251+00	clw/04/2025/09H2	Due	55	-15	\N	1000.00	19000.00	5450.00	13300.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	250.00
5fc4a18c-949f-4446-a95a-b082931706d1	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-14	1208	30200.00	58	8700.00	2025-10-22 05:13:58.814116+00	clw/04/2025/09H1	Due	0	0	Manual Entry	1510.00	28690.00	9995.00	18400.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	45.00	250.00
22647618-ebd1-420d-824b-8f9ee177ef00	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-14	486	12150.00	57	8550.00	2025-10-22 05:18:55.982467+00	clw/05/2025/09H1	Due	0	0	Manual Entry	607.50	11542.50	1496.25	9796.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	250.00
468b3487-ad6b-442f-86d6-eff14c788171	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-15	2136	53400.00	166	24900.00	2025-10-22 05:24:40.089246+00	clw/06/2025/09H1	Due	0	0	Manual Entry	2670.00	50730.00	12915.00	37500.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	65.00	250.00
d5b5e2c5-f97b-401a-a245-41037f13cf5e	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	360	9000.00	14	1960.00	2025-11-02 07:06:23.947071+00	clw/14/2025/10H2	Due	17	0	\N	0.00	9000.00	3520.00	5480.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
1fb7bbfc-31c5-4a96-8de1-5ef458219493	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	372	9300.00	28	3920.00	2025-11-02 07:08:05.296829+00	clw/13/2025/10H2	Due	18	0	\N	0.00	9300.00	2690.00	6610.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
bb6cfbbf-7a8e-4ca5-9c9b-f4e656c61b6a	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-10-31	296	7400.00	8	1200.00	2025-11-02 07:47:49.881381+00	clw/20/2025/10	Due	82	0	\N	0.00	7400.00	2790.00	4610.00	12ad4585-93b8-4559-b76b-9b4ff2dabc9a	0.00	0.00
935718f6-77a9-4104-a238-547d56abc38c	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-31	431	12930.00	6	900.00	2025-11-02 08:18:32.547569+00	clw/27/2025/10H2	Due	42	0	\N	0.00	12930.00	7218.00	8118.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
74ef0a2b-1343-4234-8fac-3bff42e1989a	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-31	514	15420.00	13	1950.00	2025-11-02 08:18:55.488232+00	clw/28/2025/10H2	Due	10	0	\N	0.00	15420.00	8082.00	10032.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
4bc5f925-fe9c-4308-8c8d-41827138d85e	b084d7e5-1c69-4d42-9650-3b2ee45443d3	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-10-31	428	10700.00	27	3510.00	2025-11-02 10:05:29.763053+00	clw/07/2025/10	Due	131	0	\N	0.00	10700.00	3595.00	6767.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
e3b8447f-0229-4f91-9004-58bac2b510c1	ae0f877f-a5b4-4955-a295-317855b3ff27	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-10-31	264	6600.00	35	4550.00	2025-11-02 10:12:12.290107+00	clw/08/2025/10	Due	7	-4	\N	0.00	6600.00	1025.00	5237.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
6f49a417-220f-417a-8c66-74b78d71acd4	aa75ca99-9bf5-4156-af35-4467c84f44fd	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-10-31	584	14600.00	38	4940.00	2025-11-02 10:13:01.130895+00	clw/09/2025/10	Due	37	-1	\N	0.00	14600.00	4830.00	9432.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
67532dc1-c754-4433-ba08-c9d301bb256f	8cb8bd6f-be4d-4964-8e10-eddd392cff87	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-10-31	832	20800.00	72	9360.00	2025-11-02 10:14:03.55513+00	clw/10/2025/10	Due	37	-7	\N	0.00	20800.00	5720.00	14742.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
c9fd44a2-b746-4980-be5a-5e618832b7d4	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-31	2344	58600.00	167	25050.00	2025-11-02 07:47:22.606249+00	clw/06/2025/10H2	Due	288	0		2930.00	55670.00	15310.00	40100.00	12ad4585-93b8-4559-b76b-9b4ff2dabc9a	10.00	0.00
588bf3cf-6ff0-4729-bbca-29b6d79ba674	1885a455-019b-43d3-80e6-7a4fcc1e1232	9bbb9704-569c-4293-bbf8-df983d8ed37b	2025-10-31	318	7950.00	23	3220.00	2025-11-02 07:27:56.218304+00	clw/21/2025/10	Due	38	0		0.00	7950.00	2365.00	5563.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	21.50	0.00
6b0bfbe3-378e-4fbe-95e3-37a49a2063ba	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-10-31	380	9500.00	32	4800.00	2025-11-02 07:12:51.70925+00	clw/15/2025/10H2	Due	4	0		0.00	9500.00	2350.00	6981.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	0.00
ad1885d8-47ba-4c3a-95f8-dc42b8667151	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-10-31	114	2850.00	11	1430.00	2025-11-02 07:19:13.064792+00	clw/16/2025/10H2	Due	59	-5		0.00	2850.00	710.00	2061.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	0.00
066febcc-d276-41ee-a9e1-84bcea64803e	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-09-15	1307	32675.00	54	5940.00	2025-10-22 04:59:08.897932+00	clw/17/2025/09H1	Due	0	0	Manual Entry	1633.75	31041.25	12550.63	18472.47	975b7b9b-f608-45c0-861d-d91695ec79e9	18.16	0.00
2a66d064-bda6-4ad5-bda3-ee73dfc54f5e	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	261	6525.00	14	1960.00	2025-11-02 07:09:31.812931+00	clw/12/2025/10H2	Due	0	-1		0.00	6525.00	2282.50	4240.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	2.50	0.00
e68d61d9-c975-4eb8-8d37-7faa18c2f7b9	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-10-31	200	5000.00	11	1650.00	2025-11-02 07:34:48.781748+00	clw/24/2025/10H2	Due	0	0		0.00	5000.00	1675.00	3155.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.75	0.00
ffa1cd3e-4869-432f-87e8-e591183dd93b	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-31	312	7800.00	30	4500.00	2025-11-02 07:00:10.136893+00	clw/05/2025/10H2	Due	-1	0		390.00	7410.00	1455.00	5700.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	5.00	0.00
89b82af8-072a-4977-8d1f-da69c96e39d8	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	436	10900.00	16	2240.00	2025-11-02 10:47:36.241747+00	clw/19/2025/10H2	Due	12	0	\N	0.00	10900.00	4330.00	6570.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
09e86a21-078c-44b6-9543-59deea61a494	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-10-31	188	4700.00	9	1260.00	2025-11-02 12:19:16.255964+00	clw/23/2025/10H2	Due	31	-2	\N	0.00	4700.00	1634.00	3066.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
26789a34-c804-4af0-b60c-700d22deaf32	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-10-31	416	10400.00	29	4060.00	2025-11-03 12:14:41.89426+00	clw/11/2025/10H2	Due	1	-6	\N	0.00	10400.00	3170.00	7230.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
a47a0b58-1e18-4034-926f-bc832163c53f	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-10-31	1120	28000.00	98	12740.00	2025-11-03 12:57:20.432031+00	clw/01/2025/10	Due	36	-26	\N	0.00	28000.00	6104.00	18844.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
eda4423b-6f0e-4741-81af-44cf7abebc6f	1885a455-019b-43d3-80e6-7a4fcc1e1232	9bbb9704-569c-4293-bbf8-df983d8ed37b	2025-11-12	144	3600.00	16	2240.00	2025-11-12 10:08:02.652737+00	clw/21/2025/11	Due	11	-4	\N	0.00	3600.00	612.00	2988.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
4738565c-35bc-4fb5-a7c5-9c1b3c33cab4	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-11-15	298	7450.00	8	1120.00	2025-11-16 04:45:48.630003+00	clw/14/2025/11H1	Due	14	0	\N	0.00	7450.00	3165.00	4285.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
c62ab849-ee33-46d6-b35e-e6cf25bcb920	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-11-15	156	3900.00	9	1170.00	2025-11-16 06:09:30.035538+00	clw/16/2025/11H1	Due	51	-3	\N	0.00	3900.00	1296.75	2525.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
1617e0a9-2714-48b0-ba78-d0a5d1df38bb	d5a1699b-e816-4560-b055-433d69949c23	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-11-15	784	19600.00	37	5550.00	2025-11-16 06:53:32.781897+00	clw/22/2025/11H1	Due	1	0	\N	0.00	19600.00	8430.00	13812.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
d57271bb-e5ba-4795-a591-de362169f4ee	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-15	850	21250.00	22	3300.00	2025-11-16 09:06:43.533197+00	clw/04/2025/11H1	Due	50	0	\N	1062.50	20187.50	8443.75	11493.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
142a358b-9c9d-48ed-a1a8-c3e8eadbb319	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-11-15	348	8700.00	9	1260.00	2025-11-16 10:26:59.546128+00	clw/29/2025/11H1	Due	29	-3	\N	0.00	8700.00	3534.00	5166.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
8742c1ad-3033-4c61-b60e-247cab753def	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-11-15	180	4500.00	13	1820.00	2025-11-16 12:54:16.915897+00	clw/12/2025/11H1	Due	0	-1	\N	0.00	4500.00	1340.00	3160.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
c623e8b0-6e14-442f-a666-26dfca787578	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-11-15	188	4700.00	14	1960.00	2025-11-17 05:31:56.614885+00	clw/13/2025/11H1	Due	7	0	\N	0.00	4700.00	1370.00	3330.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
e1f6fb47-7a4e-471b-8143-8a838a871110	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-11-15	177	5310.00	13	1950.00	2025-11-17 05:57:43.157939+00	clw/27/2025/11H1	Due	180	0	\N	0.00	5310.00	2016.00	3966.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
49e9f5f2-a1d7-444c-871c-863fda247d50	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-11-15	453	13590.00	25	3750.00	2025-11-17 06:08:03.549806+00	clw/28/2025/11H1	Due	253	0	\N	0.00	13590.00	5904.00	9654.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
4fd45151-0731-4c86-a6f4-c1a0ff6ba480	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-11-15	256	6400.00	13	1820.00	2025-11-17 10:41:52.4473+00	clw/19/2025/11H1	Due	5	-3	\N	0.00	6400.00	2290.00	4110.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
9502e834-312f-4841-84ed-e4474ac07177	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-11-15	260	6500.00	7	1050.00	2025-11-16 05:33:37.408618+00	clw/20/2025/11	Due	75	0		0.00	6500.00	2725.00	3774.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.50	0.00
b981b6b1-24cd-4fe2-b7cf-1154bba0b7cd	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-11-15	1398	34950.00	84	9240.00	2025-11-19 12:48:16.957622+00	clw/17/2025/11H1	Due	39	-29	\N	1747.50	33202.50	11382.19	21820.31	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
78782288-7419-4f68-bbe3-377e0eac6944	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-10-31	244	6100.00	7	1050.00	2025-11-04 05:08:55.708675+00	clw/26/2025/10H2	Due	93	10		0.00	6100.00	2525.00	3405.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.75	0.00
1f19dc8a-8804-4820-9371-367147438041	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-10-31	1800	45000.00	112	14560.00	2025-11-03 13:04:44.909812+00	clw/03/2025/10	Due	99	-19		0.00	45000.00	12176.00	26736.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
3c9859bc-2442-4046-ad2b-fb4169cae9f4	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-10-31	896	22400.00	60	7800.00	2025-11-22 10:46:55.148139+00	clw/02/2025/10	Due	10	-25		0.00	22400.00	5840.00	13620.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	20.00	0.00
65944461-e61d-4dca-8dc3-b131f404b89d	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	256	6400.00	8	1120.00	2025-12-02 06:56:46.040451+00	clw/14/2025/11H2	Due	8	0		0.00	6400.00	2640.00	3760.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
c574b35c-95bd-4b8e-b9c7-7c0902cd843a	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-11-15	340	8500.00	32	4800.00	2025-11-16 04:56:41.092888+00	clw/15/2025/11H1	Due	24	-2		0.00	8500.00	1850.00	6481.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	0.00
d97125dc-c0e7-4eda-ae76-e0c85d0869d4	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-11-30	200	5000.00	20	2600.00	2025-12-02 07:21:04.387907+00	clw/16/2025/11H2	Due	18	-10		0.00	5000.00	1200.00	3721.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.75	0.00
4780ac53-7c57-4aaa-bdeb-c848430566c8	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-11-15	280	7000.00	13	1820.00	2025-11-16 04:43:31.563266+00	clw/11/2025/11H1	Due	1	-2		0.00	7000.00	2590.00	4410.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
eb6ebf85-c392-441c-a6ab-b5d87ed1b76d	d5a1699b-e816-4560-b055-433d69949c23	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-11-30	748	18700.00	37	5550.00	2025-12-02 07:15:13.200046+00	clw/22/2025/11H2	Due	0	-4	\N	0.00	18700.00	7890.00	13272.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
e88b9c2e-e7f0-4c5d-889b-323993a779d6	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-10-15	1700	42500.00	86	9460.00	2025-10-16 07:45:29.296864+00	clw/17/2025/10H1	Due	63	-42		2125.00	40375.00	15457.50	24917.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.50	0.00
e15f5783-f388-4d28-9c29-1c00e7145203	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-30	1464	36600.00	127	19050.00	2025-12-01 09:47:00.826441+00	clw/06/2025/11H2	Due	273	-28	\N	1830.00	34770.00	7860.00	26660.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
0a45999a-c3d6-471c-96f1-8b60f5d4fa63	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-30	880	22000.00	39	5850.00	2025-12-01 09:54:51.046851+00	clw/04/2025/11H2	Due	18	-5	\N	1100.00	20900.00	7525.00	13125.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
c0f90e86-945b-4b70-822e-c303a87acd39	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	148	3700.00	12	1680.00	2025-12-02 06:58:47.869939+00	clw/13/2025/11H2	Due	14	0	\N	0.00	3700.00	1010.00	2690.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
a1af55f5-d63e-4f87-8762-eb6b858f3800	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	232	5800.00	17	2380.00	2025-12-02 07:03:32.620179+00	clw/11/2025/11H2	Due	0	0	\N	0.00	5800.00	1710.00	4090.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
1546b65a-6cb1-4bd7-b188-4b6c25239b03	b084d7e5-1c69-4d42-9650-3b2ee45443d3	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-11-30	260	6500.00	15	1950.00	2025-12-02 07:29:00.213074+00	clw/07/2025/11	Due	15	0	\N	0.00	6500.00	2275.00	3887.50	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
85246a06-a1b5-4b43-8e7f-59bfa5ca6e37	aa75ca99-9bf5-4156-af35-4467c84f44fd	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-11-30	396	9900.00	21	2730.00	2025-12-02 07:34:14.064607+00	clw/09/2025/11	Due	9	-2	\N	0.00	9900.00	3585.00	5977.50	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
39f07e05-f704-4de9-9b32-61bbb736d18d	8cb8bd6f-be4d-4964-8e10-eddd392cff87	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-11-30	668	16700.00	51	6630.00	2025-12-02 07:36:26.040806+00	clw/10/2025/11	Due	7	-3	\N	0.00	16700.00	5035.00	11327.50	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
113fab24-e3f0-49a1-b765-153992b82a8f	ae0f877f-a5b4-4955-a295-317855b3ff27	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-11-30	56	1400.00	9	1170.00	2025-12-02 07:41:13.692688+00	clw/08/2025/11	Due	3	0	\N	0.00	1400.00	115.00	947.50	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
6c059588-5ef1-4954-995a-b8472bb70267	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-15	1944	48600.00	146	21900.00	2025-11-16 12:28:09.926834+00	clw/06/2025/11H1	Due	300	0		2430.00	46170.00	12135.00	33780.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	5.00	0.00
f41a1290-e5bd-49ea-854b-f26147ba35d8	33a1a534-951a-4f86-a832-188fa5117b57	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-11-30	484	12100.00	38	5700.00	2025-12-02 08:41:49.637809+00	clw/23/2025/11H2	Due	-1	0		0.00	12100.00	3840.00	9372.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
c6cdd527-abc8-48a2-869d-645b56efebcd	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-30	182	4550.00	22	3300.00	2025-12-01 09:56:53.804464+00	clw/05/2025/11H2	Due	0	0		227.50	4322.50	511.25	3500.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	61.25	0.00
96171229-26ad-4df5-85b8-30a55c189ef1	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-11-15	426	10650.00	35	5250.00	2025-11-16 07:18:39.460771+00	clw/05/2025/11H1	Due	2	33		532.50	10117.50	2433.75	7400.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	33.75	0.00
10cd9c0f-1078-4859-ae68-77bed10699a2	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	202	5050.00	13	1820.00	2025-12-02 07:08:33.366341+00	clw/12/2025/11H2	Due	2	0		0.00	5050.00	1615.00	3430.00	eb521af0-7f91-4dc5-9b13-70094e501da3	5.00	0.00
5bc95bd5-f7d3-4d98-8622-9b71960919a4	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-11-30	222	5550.00	9	1260.00	2025-12-02 08:45:26.874801+00	clw/29/2025/11H2	Due	32	0		0.00	5550.00	2145.00	3404.75	eb521af0-7f91-4dc5-9b13-70094e501da3	0.25	0.00
a5936ae7-ab7c-43a2-acd8-4916c63172eb	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-11-15	244	6100.00	14	2100.00	2025-11-19 07:45:52.774408+00	clw/26/2025/11H1	Due	138	1		0.00	6100.00	2000.00	3931.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	0.00
54f8a476-9b6d-43ee-8164-22c1faf1fbe5	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-11-30	132	3300.00	16	2400.00	2025-12-02 07:26:26.207578+00	clw/15/2025/11H2	Due	0	-2		0.00	3300.00	450.00	2681.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.25	0.00
953ef75f-fb02-44dd-8a7e-932f24e6d26d	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-11-15	344	8600.00	13	1950.00	2025-11-16 08:43:37.221689+00	clw/24/2025/11H1	Due	0	-1		0.00	8600.00	3325.00	5103.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	2.50	0.00
b3d6fee4-dc5f-4eee-9088-25832cbb78b9	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	260	6500.00	16	2240.00	2025-12-02 08:49:18.652704+00	clw/19/2025/11H2	Due	0	-4	\N	0.00	6500.00	2130.00	4370.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
590d6f11-92bb-443f-89ce-bdf54ebccfbf	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-11-30	172	4300.00	11	1650.00	2025-12-02 09:00:39.377385+00	clw/24/2025/11H2	Due	13	0	\N	0.00	4300.00	1192.50	2938.75	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
0ff96a21-6abf-46c1-8f13-26000c079f58	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-12-15	346	10380.00	24	3600.00	2025-12-18 07:15:42.316508+00	clw/28/2025/12H1	Due	70	20	\N	0.00	10380.00	4068.00	7668.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
1aecb052-0478-4335-abc0-ea5a252505d9	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-11-30	892	22300.00	55	6050.00	2025-12-02 07:28:36.221324+00	clw/17/2025/11H2	Due	42	7		1115.00	21185.00	7567.50	13617.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
40203ac5-2379-4a05-9d77-00564086a7fb	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-11-30	986	24650.00	67	8710.00	2025-12-03 11:23:23.450317+00	clw/02/2025/11	Due	19	-18	\N	0.00	24650.00	6376.00	15086.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
b3858511-5be3-4209-b5eb-8917d44fe833	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-11-30	181	5430.00	7	1050.00	2025-12-03 11:34:12.891071+00	clw/27/2025/11H2	Due	201	0	\N	0.00	5430.00	2628.00	3678.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
ae4c642e-15c3-4fd1-ba0c-ecd4f1975bf8	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-11-30	382	11460.00	11	1650.00	2025-12-03 11:34:53.886395+00	clw/28/2025/11H2	Due	41	0	\N	0.00	11460.00	5886.00	7536.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
41e63f49-d98d-484e-be0d-0226e7e614c0	33a1a534-951a-4f86-a832-188fa5117b57	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-15	452	11300.00	28	4200.00	2025-12-17 11:34:03.397541+00	clw/23/2025/12H1	Due	0	-3		0.00	11300.00	4260.00	8292.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
14c48ffa-1507-4516-92f4-7c5b74c48581	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-12-15	228	5700.00	10	1400.00	2025-12-17 15:20:12.067801+00	clw/29/2025/12H1	Due	41	-2		0.00	5700.00	2150.00	3549.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.50	0.00
9d8e42a0-b723-444e-8d07-817fc212a92e	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-12-15	384	9600.00	23	3450.00	2025-12-17 12:09:13.705468+00	clw/05/2025/12H1	Due	0	0	\N	480.00	9120.00	2835.00	6035.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
e0070b71-d9bf-4ce0-8602-665ba1e31ef9	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-11-30	282	7050.00	8	1120.00	2025-12-10 08:29:17.053393+00	clw/18/2025/11H2	Due	162	0		0.00	7050.00	2965.00	4085.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
725bae2b-fb4e-4b44-83b1-3769d63b3168	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-12-15	244	6100.00	20	2800.00	2025-12-17 11:21:50.004445+00	clw/11/2025/12H1	Due	0	-1		0.00	6100.00	1650.00	4450.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
9b4d0e81-c52b-436b-ab25-95e1fbbd0914	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-12-15	152	3800.00	8	1200.00	2025-12-17 12:31:14.000094+00	clw/24/2025/12H1	Due	0	0	\N	0.00	3800.00	1170.00	2461.25	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
7221c350-1bd4-4997-89f7-be271f8b3ef3	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-12-15	292	7300.00	10	1500.00	2025-12-17 12:41:15.986303+00	clw/20/2025/12	Due	127	0	\N	0.00	7300.00	2610.00	4690.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
b29443fe-8c7d-431b-aea0-bd05e833bc34	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-12-15	1880	47000.00	126	13860.00	2025-12-17 12:54:54.052986+00	clw/17/2025/12H1	Due	61	0	\N	2350.00	44650.00	14625.25	30024.75	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
1ac78b81-e358-4a42-b7db-6af610985992	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-11-30	178	4450.00	8	1200.00	2025-12-03 08:54:50.450452+00	clw/20/2025/11	Due	128	-4		0.00	4450.00	1625.00	2824.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.50	0.00
7a2ff977-249f-4061-bee5-371c377e476d	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-10-31	1804	45100.00	112	12320.00	2025-11-02 10:55:05.975066+00	clw/17/2025/10H2	Due	84	-17		2255.00	42845.00	15262.50	27581.87	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.63	0.00
61daf5b4-28c1-4b79-ba4d-ef96186a7a5d	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-12-15	208	5200.00	15	1950.00	2025-12-17 10:15:06.686989+00	clw/16/2025/12H1	Due	41	-5	\N	0.00	5200.00	1543.75	3578.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
0c86c553-b56d-40c4-881d-1758cac2bd3d	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-12-15	192	4800.00	16	2240.00	2025-12-17 11:10:54.70227+00	clw/12/2025/12H1	Due	0	-3	\N	0.00	4800.00	1280.00	3520.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
74063bb6-eb00-4da8-9895-605a365e856c	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-12-15	244	6100.00	10	1400.00	2025-12-17 11:17:01.521339+00	clw/14/2025/12H1	Due	16	0	\N	0.00	6100.00	2350.00	3750.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
4694b1d6-5dd1-4989-9a01-aa26edea19a8	95394e96-0af0-42c5-9fcc-e41e116ec592	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-15	204	5100.00	19	2850.00	2025-12-17 11:27:37.954757+00	clw/21/2025/12H1	Due	9	-1	\N	0.00	5100.00	1350.00	4032.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
6b57782e-748a-43a6-b280-9480d5cf60ed	d5a1699b-e816-4560-b055-433d69949c23	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-15	892	22300.00	51	7650.00	2025-12-17 11:40:57.069794+00	clw/22/2025/12H1	Due	13	0	\N	0.00	22300.00	8790.00	16272.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
53586993-2821-4f9f-87f6-442e25508e17	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-12-15	1580	39500.00	129	19350.00	2025-12-17 11:59:35.867219+00	clw/06/2025/12H1	Due	292	0		1975.00	37525.00	9087.50	28150.00	eb521af0-7f91-4dc5-9b13-70094e501da3	37.50	0.00
46671eaf-362c-43d8-ad6f-d09eea6533fb	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-12-15	224	5600.00	17	2380.00	2025-12-17 11:04:37.480056+00	clw/13/2025/12H1	Due	14	0		0.00	5600.00	1610.00	3990.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
7765c558-56fa-47e5-b35e-6435f24f0e31	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-12-15	80	2000.00	9	1350.00	2025-12-17 13:11:36.766647+00	clw/26/2025/12H1	Due	0	-6	\N	0.00	2000.00	292.50	1538.75	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
b5b26052-61c8-4197-9f0c-38cb29da2c8e	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-12-15	318	7950.00	7	980.00	2025-12-17 13:17:26.960592+00	clw/19/2025/12H1	Due	0	0	\N	0.00	7950.00	3485.00	4465.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
b7f9f4b8-ac50-41b1-a954-040f79effe3d	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-12-15	299	8970.00	18	2700.00	2025-12-18 07:11:54.762838+00	clw/27/2025/12H1	Due	161	10	\N	0.00	8970.00	3762.00	6462.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
896b6c8f-3437-48d8-9153-2c196954c27c	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-11-30	196	4900.00	13	1950.00	2025-12-14 04:36:08.487176+00	clw/26/2025/11H2	Due	222	3		0.00	4900.00	1475.00	3256.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.25	0.00
4d7900df-d28d-4c45-a6af-d8194657f4b4	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-12-15	920	23000.00	52	7800.00	2025-12-18 12:15:38.048382+00	clw/04/2025/12H2	Due	26	-5		1150.00	21850.00	7025.00	14575.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
e3001caf-bf1d-44d9-8f15-96f06df0c986	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-11-30	880	22000.00	59	7670.00	2025-12-03 11:30:09.710453+00	clw/01/2025/11	Due	14	-47		0.00	22000.00	5732.00	13400.00	eb521af0-7f91-4dc5-9b13-70094e501da3	2.00	0.00
0fca90ab-9ef6-4aaf-842c-9fb150c4a5db	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-12-15	108	2700.00	10	1500.00	2025-12-17 12:34:44.506337+00	clw/15/2025/12H1	Due	14	0		0.00	2700.00	600.00	1931.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.25	0.00
e320b880-c661-4fbe-aaf4-68c2226342a8	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-11-30	1020	25500.00	67	8710.00	2025-12-02 09:56:57.183069+00	clw/03/2025/11	Due	79	-12		0.00	25500.00	6716.00	15416.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10.00	0.00
d20fddc2-2de4-4811-9f0b-2d43b0b90a22	95394e96-0af0-42c5-9fcc-e41e116ec592	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-31	262	6550.00	22	3300.00	2026-01-01 05:47:10.185886+00	clw/21/2025/12H2	Due	1	0	\N	0.00	6550.00	1950.00	5082.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
238fcfa8-d7b3-481a-ab46-93748d93591b	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-12-31	276	6900.00	11	1650.00	2026-01-01 04:47:14.506309+00	clw/24/2025/12H2	Due	0	0	\N	0.00	6900.00	2362.50	4368.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
9eb68dac-52db-424d-800c-cb9c0d1f828b	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-12-31	392	9800.00	10	1500.00	2026-01-01 05:11:56.487887+00	clw/20/2025/12	Due	159	5	\N	0.00	9800.00	3735.00	6065.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
7ddf5deb-31d0-476c-afb6-5d3dc44fd30f	33a1a534-951a-4f86-a832-188fa5117b57	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-31	528	13200.00	29	4350.00	2026-01-01 05:44:44.469445+00	clw/23/2025/12H2	Due	-2	5	\N	0.00	13200.00	5310.00	9492.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
b454403b-fc2d-4a7a-9502-106b5dfa22e7	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-12-31	1696	42400.00	106	11660.00	2026-01-01 06:12:25.079552+00	clw/17/2025/12H2	Due	30	0	\N	2120.00	40280.00	13594.50	26685.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
84e6b760-4ab0-4900-9d1b-c2f4b424962d	d5a1699b-e816-4560-b055-433d69949c23	9f092d84-60ed-481b-9466-ec5862e4acf9	2025-12-31	844	21100.00	42	6300.00	2026-01-01 06:37:46.58673+00	clw/22/2025/12H2	Due	6	0	\N	0.00	21100.00	8880.00	15012.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
f04c3002-1849-432c-951e-4a0a36ec5d9b	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-12-31	220	5500.00	18	2340.00	2026-01-01 06:43:10.407779+00	clw/16/2025/12H2	Due	11	2	\N	0.00	5500.00	1501.00	3920.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
7f5e1ba0-7530-45c7-a9cf-e4e165f22dfd	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-12-31	236	5900.00	12	1680.00	2026-01-01 06:47:52.605826+00	clw/29/2025/12H2	Due	33	-4	\N	0.00	5900.00	2004.50	3895.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
411fe506-ed7b-4007-8545-93f5c8f77941	b084d7e5-1c69-4d42-9650-3b2ee45443d3	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-12-31	304	7600.00	25	3250.00	2026-01-01 07:01:39.866706+00	clw/07/2025/12	Due	57	0	\N	0.00	7600.00	2175.00	5087.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
6bc97b88-f381-40f5-84a8-6612134df6a1	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-12-31	1120	28000.00	62	9300.00	2026-01-01 07:20:16.704007+00	clw/04/2025/12H2	Due	17	0	\N	1400.00	26600.00	8650.00	17700.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
0fc6bffc-b392-4bcb-ae84-ef391a701fdb	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-12-31	376	9400.00	9	1260.00	2026-01-01 07:37:14.496144+00	clw/14/2025/12H2	Due	18	-4		0.00	9400.00	4070.00	5330.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
ea816354-c520-4680-830b-fd92d9b31bc6	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-12-31	2884	72100.00	165	24750.00	2026-01-01 07:46:40.100783+00	clw/06/2025/12H2	Due	348	22	\N	3605.00	68495.00	21872.50	46372.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
add70182-20a9-4a7f-8c79-dcb581a6f806	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-12-31	156	3900.00	13	1950.00	2026-01-01 08:28:46.290811+00	clw/15/2025/12H2	Due	5	0	\N	0.00	3900.00	877.50	2853.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
7850d830-c112-45a4-aee3-741a780657e9	8cb8bd6f-be4d-4964-8e10-eddd392cff87	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-12-31	520	13000.00	37	4810.00	2026-01-01 09:28:45.803435+00	clw/10/2025/12	Due	12	-3	\N	0.00	13000.00	4095.00	8567.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
25ee174a-539c-47d2-b898-f68199f1775f	ae0f877f-a5b4-4955-a295-317855b3ff27	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-12-31	106	2650.00	10	1300.00	2026-01-01 09:31:13.756024+00	clw/08/2025/12	Due	8	-2	\N	0.00	2650.00	675.00	1637.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
94245709-aed5-4a91-ae48-cd4997e8074d	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-12-31	178	4450.00	4	560.00	2026-01-01 09:38:18.724346+00	clw/12/2025/12H2	Due	1	1	\N	0.00	4450.00	1945.00	2505.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
7d1b1959-faba-4ad5-bdcc-b7c597ee3374	aa75ca99-9bf5-4156-af35-4467c84f44fd	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-12-31	368	9200.00	29	3770.00	2026-01-01 10:30:46.548992+00	clw/09/2025/12	Due	27	-2	\N	0.00	9200.00	2715.00	6147.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
d7497432-d807-497e-9636-503a8db01d7c	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-12-31	1908	47700.00	149	19370.00	2026-01-01 11:05:37.329963+00	clw/03/2025/12	Due	171	-37	\N	0.00	47700.00	11332.00	30702.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
64e68188-230c-46f7-b0a9-cb5704ca252d	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-12-31	312	7800.00	6	840.00	2026-01-01 12:50:25.462808+00	clw/19/2025/12H2	Due	13	0	\N	0.00	7800.00	3480.00	4320.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
d11150b6-06ac-4950-985e-96d8e56a3b5c	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-12-31	186	4650.00	14	1960.00	2026-01-04 06:21:59.79079+00	clw/13/2025/12H2	Due	11	0	\N	0.00	4650.00	1345.00	3305.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
cfca4838-cf48-454d-8f00-73aef6142693	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-12-31	24	600.00	1	140.00	2026-01-04 07:15:36.118128+00	clw/18/2025/12H2	Due	5	0	\N	0.00	600.00	230.00	370.00	eb521af0-7f91-4dc5-9b13-70094e501da3	0.00	0.00
\.


--
-- Data for Name: stock_out_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_out_history (id, out_date, machine_id, item_id, quantity, remarks, handled_by, created_at, updated_at, adjustment_type, category, item_name, unit_price, total_price) FROM stdin;
c0e20745-a1ad-477e-ab22-ca9ec9d24d81	2025-10-29	3531f437-b29d-4f5c-8891-2463ae8e70b5	396e59cb-91bd-433e-90d2-f56ea4201823	1	sticker change	System	2025-11-14 20:42:36.578257	2025-11-14 20:42:36.578257	\N	\N	\N	\N	\N
4e67eed0-8c69-40a0-88f6-5d3230b680c5	2025-11-13	b5327e30-7b83-4fda-99aa-99a107bbcca9	4b9ff4a9-7437-45ff-8b38-6f88cbc1b22e	1	Cafe rio mirpur sicker chaange 	System	2025-11-14 19:43:07.016079	2025-11-14 19:43:07.016079	\N	\N	\N	\N	\N
192b877a-d632-48d3-8adb-7f1b3f7cce63	2025-10-28	d5a1699b-e816-4560-b055-433d69949c23	d92d0c81-4fa8-400f-abe5-7a0f7b7ef983	3	for agreement	System	2025-11-14 20:33:34.966843	2025-11-14 20:33:34.966843	\N	\N	\N	\N	\N
bfbe3fe6-26a8-4968-a100-f90fefa3e95b	2025-10-29	d5a1699b-e816-4560-b055-433d69949c23	a009d560-3692-4313-9986-2daa5b3f1f56	1		\N	2025-11-16 14:29:40.761537	2025-11-16 14:29:40.761537	\N	\N	\N	\N	\N
00b3b08f-1e6b-4b73-ba56-8a4d5365761d	2025-11-19	\N	\N	3	Stock In	\N	2025-11-20 14:09:38.021405	2025-11-20 14:09:38.021405	stock_in	Local Accessories	Esp32	440.00	1320.00
13147351-21a2-452a-acdb-b903a623f827	2025-11-20	07490f7a-5244-4e67-bcc0-4fd1df88ed92	\N	43		\N	2025-11-20 14:53:36.969946	2025-11-20 14:53:36.969946	doll_add	\N	\N	\N	\N
f052efcd-655b-436d-a709-6826a4eec067	2025-11-20	1885a455-019b-43d3-80e6-7a4fcc1e1232	\N	63		\N	2025-11-20 14:53:50.403756	2025-11-20 14:53:50.403756	doll_add	\N	\N	\N	\N
f36a399d-e777-42e3-8f17-ec872293c4a0	2025-11-20	4c5dda16-9682-4bba-aed0-c38e82ec5356	\N	80		\N	2025-11-20 14:54:27.110646	2025-11-20 14:54:27.110646	doll_add	\N	\N	\N	\N
a4bad196-eee3-4bbe-827d-5e4d848b2220	2025-11-20	d3e8eb14-b460-4f82-b334-790165c2a922	\N	46		\N	2025-11-20 15:01:50.971044	2025-11-20 15:01:50.971044	doll_add	\N	\N	\N	\N
47233239-4a7e-4623-91cd-db50834b1264	2025-11-20	6d29d8b3-9777-4a01-8431-53acbcad9363	\N	92		\N	2025-11-20 15:02:17.51759	2025-11-20 15:02:17.51759	doll_add	\N	\N	\N	\N
6629b42a-614c-496d-8056-b74f5b8293ea	2025-11-20	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	\N	5		\N	2025-11-20 15:02:49.988105	2025-11-20 15:02:49.988105	doll_add	\N	\N	\N	\N
ac67e7cd-9d20-46b8-ba7e-689c64f592ea	2025-11-20	b957c84b-8cc1-4ee9-a24c-a80565676721	\N	99		\N	2025-11-20 15:03:10.756721	2025-11-20 15:03:10.756721	doll_add	\N	\N	\N	\N
742aab83-7391-422d-b25b-cdd000cecbfb	2025-11-20	b957c84b-8cc1-4ee9-a24c-a80565676721	\N	29		\N	2025-11-20 15:04:07.669351	2025-11-20 15:04:07.669351	doll_add	\N	\N	\N	\N
672badab-8a2d-49be-9932-339ffa686deb	2025-11-20	feb921c1-425c-4a8a-8748-f7d958a7d3e0	\N	31		\N	2025-11-20 15:04:19.323491	2025-11-20 15:04:19.323491	doll_add	\N	\N	\N	\N
253b5f86-d3f8-46fc-acbd-49f843acda87	2025-11-20	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	\N	100		\N	2025-11-20 15:04:49.428714	2025-11-20 15:04:49.428714	doll_add	\N	\N	\N	\N
14a64f23-909a-400e-a65c-4c9c8694382e	2025-11-20	bf03337a-93fd-45a5-84c1-79fb21d59745	\N	172		\N	2025-11-20 15:05:11.48544	2025-11-20 15:05:11.48544	doll_add	\N	\N	\N	\N
8fb2daca-5cd4-4bbb-8b48-2dbee1588f64	2025-11-20	277b890a-f8fe-4cb2-a106-066731d848e3	\N	69		\N	2025-11-20 15:05:44.000327	2025-11-20 15:05:44.000327	doll_add	\N	\N	\N	\N
94c4e86a-88fc-408d-ac67-82f01e91adad	2025-11-20	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	\N	15		\N	2025-11-20 15:06:09.693291	2025-11-20 15:06:09.693291	doll_add	\N	\N	\N	\N
160b55f7-b685-4edb-9868-2534e9d04417	2025-11-20	ee68bac1-c967-4b3e-be4c-53aeba1f1249	\N	133		\N	2025-11-20 15:06:31.115067	2025-11-20 15:06:31.115067	doll_add	\N	\N	\N	\N
d30c2238-5367-48a8-a491-1c7cc6bfcb2c	2025-11-20	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	\N	84		\N	2025-11-20 15:07:45.061341	2025-11-20 15:07:45.061341	doll_add	\N	\N	\N	\N
cc1903e0-5de3-41b7-bf67-864164379a09	2025-11-20	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	\N	10		\N	2025-11-20 15:08:10.700195	2025-11-20 15:08:10.700195	doll_add	\N	\N	\N	\N
0e571bd5-7f03-44d4-9e60-2dc8e792d7ba	2025-11-20	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	\N	63		\N	2025-11-20 15:08:30.423191	2025-11-20 15:08:30.423191	doll_add	\N	\N	\N	\N
183017ea-99e7-4af5-a3ac-b63bd92b8b8c	2025-11-20	3869bce6-8e5d-4e64-9197-24400000d168	\N	123		\N	2025-11-20 15:08:54.937683	2025-11-20 15:08:54.937683	doll_add	\N	\N	\N	\N
6cfcb7b7-1b32-4c23-a018-33b2d71fee70	2025-11-20	b084d7e5-1c69-4d42-9650-3b2ee45443d3	\N	75		\N	2025-11-20 15:09:29.217906	2025-11-20 15:09:29.217906	doll_add	\N	\N	\N	\N
7e01ac29-6fb1-4380-81a2-c241b82b3b55	2025-11-20	ae0f877f-a5b4-4955-a295-317855b3ff27	\N	134		\N	2025-11-20 15:09:50.941031	2025-11-20 15:09:50.941031	doll_add	\N	\N	\N	\N
e012eabb-18a1-4d03-b111-a97e1aac29a4	2025-11-20	8cb8bd6f-be4d-4964-8e10-eddd392cff87	\N	92		\N	2025-11-20 15:10:16.645592	2025-11-20 15:10:16.645592	doll_add	\N	\N	\N	\N
74f17020-c09f-465e-b304-3cc72e0fce4c	2025-11-20	aa75ca99-9bf5-4156-af35-4467c84f44fd	\N	67		\N	2025-11-20 15:10:38.287291	2025-11-20 15:10:38.287291	doll_add	\N	\N	\N	\N
ed77c750-3b19-492a-bdee-9f0a0dd1c29f	2025-11-20	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	\N	51		\N	2025-11-20 15:15:08.828157	2025-11-20 15:15:08.828157	doll_add	\N	\N	\N	\N
d1a272d1-af92-43eb-a213-2aac87cd4879	2025-11-20	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	\N	136		\N	2025-11-20 15:15:34.912127	2025-11-20 15:15:34.912127	doll_add	\N	\N	\N	\N
0950f68f-0101-4b66-b8fe-afb23f411b3e	2025-11-20	3531f437-b29d-4f5c-8891-2463ae8e70b5	\N	141		\N	2025-11-20 15:15:54.459979	2025-11-20 15:15:54.459979	doll_add	\N	\N	\N	\N
ad43fbb2-4198-42c0-9740-b40902c475c1	2025-11-20	b5327e30-7b83-4fda-99aa-99a107bbcca9	\N	93		\N	2025-11-20 15:16:15.280938	2025-11-20 15:16:15.280938	doll_add	\N	\N	\N	\N
570382a2-93b4-4bb0-8032-ea5e3218b3be	2025-11-20	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	\N	206		\N	2025-11-20 15:16:41.385346	2025-11-20 15:16:41.385346	doll_add	\N	\N	\N	\N
0b86457b-da85-4b08-9612-090edd78148d	2025-11-20	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	\N	-100		\N	2025-11-20 15:17:05.097763	2025-11-20 15:17:05.097763	doll_deduct	\N	\N	\N	\N
d7e6cd7e-eec2-4466-b6c7-e9eb33498c39	2025-11-20	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	\N	92		\N	2025-11-20 15:17:29.473764	2025-11-20 15:17:29.473764	doll_add	\N	\N	\N	\N
10f6db57-e553-4110-ad1a-2757709b460d	2025-11-20	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	\N	32		\N	2025-11-20 15:17:52.601948	2025-11-20 15:17:52.601948	doll_add	\N	\N	\N	\N
d962432c-94c2-4223-8a54-e8043d548daf	2025-12-15	4c5dda16-9682-4bba-aed0-c38e82ec5356	\N	-100		sajibur@sohub.com.bd	2025-12-15 12:10:19.069921	2025-12-15 12:10:19.069921	doll_deduct	\N	\N	\N	\N
c221e5d8-004d-4e32-af92-e6240624aba7	2025-12-18	d3e8eb14-b460-4f82-b334-790165c2a922	\N	3		sajibur@sohub.com.bd	2025-12-18 05:10:16.03351	2025-12-18 05:10:16.03351	doll_add	\N	\N	\N	\N
84348f14-394e-4d17-b373-8a5a9dcb0a49	2025-11-25	95394e96-0af0-42c5-9fcc-e41e116ec592	b9f31664-57f4-4243-b205-0f12fd09874e	1		sajibur@sohub.com.bd	2025-12-24 05:18:30.48292	2025-12-24 05:18:30.48292	\N	\N	\N	\N	\N
3ce0783c-025a-4bae-8fa7-dbd6cbbe3982	2025-11-25	95394e96-0af0-42c5-9fcc-e41e116ec592	c8f9a58d-b4e7-4a5b-8fb2-9d6ed19d6355	3		sajibur@sohub.com.bd	2025-12-24 05:18:54.452424	2025-12-24 05:18:54.452424	\N	\N	\N	\N	\N
207396d8-f4d2-49ec-839b-b0144a8d25e1	2025-11-26	95394e96-0af0-42c5-9fcc-e41e116ec592	8bc1ac12-a66f-423d-b44e-2be1b7de9821	2		sajibur@sohub.com.bd	2025-12-24 05:20:04.430149	2025-12-24 05:20:04.430149	\N	\N	\N	\N	\N
d9a6db9e-4ab6-4b9c-a5f1-ea1e439fe452	2025-12-29	\N	\N	18	Stock In	rafid@sohub.com.bd	2025-12-29 12:42:36.113395	2025-12-29 12:42:36.113395	stock_in	Import Accessories	Meter	10.00	180.00
6e72c2b7-4e0e-4366-a651-37dc7d1ccf92	2025-12-29	\N	\N	5	Stock In	rafid@sohub.com.bd	2025-12-29 12:43:15.863075	2025-12-29 12:43:15.863075	stock_in	Import Accessories	power switch	10.00	50.00
6daa7212-0c1b-45ea-ab6d-c5c95737ca1e	2025-12-29	\N	\N	1	Stock In	rafid@sohub.com.bd	2025-12-29 12:44:40.320111	2025-12-29 12:44:40.320111	stock_in	Local Accessories	Speaker	10.00	10.00
d6a4a752-abfe-4454-ba36-0018f78bda11	2025-12-29	\N	\N	6	Stock In	rafid@sohub.com.bd	2025-12-29 12:45:26.403699	2025-12-29 12:45:26.403699	stock_in	Import Accessories	Rabar Big	10.00	60.00
58984232-e51c-4434-92ac-abb6a506d6fa	2025-12-29	\N	\N	3	Stock In	rafid@sohub.com.bd	2025-12-29 12:45:56.357551	2025-12-29 12:45:56.357551	stock_in	Import Accessories	Rabar Small	10.00	30.00
3b85c6bc-fb9a-474b-b45c-c1f15434b716	2025-12-29	\N	\N	1	Stock In	rafid@sohub.com.bd	2025-12-29 12:47:32.525482	2025-12-29 12:47:32.525482	stock_in	Import Accessories	Coin Accepter Light	10.00	10.00
543dc01a-c861-48ec-8d05-c93fe64a65f6	2025-12-29	\N	\N	2	Stock In	rafid@sohub.com.bd	2025-12-29 12:48:07.726576	2025-12-29 12:48:07.726576	stock_in	Import Accessories	Press Button	10.00	20.00
d5454530-f8e5-43df-82de-7f49fa1b9eab	2025-12-29	\N	\N	11	Stock In	rafid@sohub.com.bd	2025-12-29 12:48:42.407571	2025-12-29 12:48:42.407571	stock_in	Import Accessories	Press	10.00	110.00
8451e7df-67c0-4271-ad9c-50f8a90d9779	2025-12-29	\N	\N	30	Stock In	rafid@sohub.com.bd	2025-12-29 12:49:24.646765	2025-12-29 12:49:24.646765	stock_in	Import Accessories	Switch	10.00	300.00
ec73cbfd-0894-46a2-bfc9-880d71cfd570	2025-12-29	\N	\N	10	Stock In	rafid@sohub.com.bd	2025-12-29 12:50:00.869224	2025-12-29 12:50:00.869224	stock_in	Import Accessories	Press Switch	10.00	100.00
195bfc4d-7f50-479b-a89d-10e234b5bab1	2025-12-29	\N	\N	2	Stock In	rafid@sohub.com.bd	2025-12-29 12:50:27.545892	2025-12-29 12:50:27.545892	stock_in	Local Accessories	Power Cable	10.00	20.00
d2f18109-aae2-48a3-92a5-de462fe59fa5	2025-12-29	\N	\N	4	Stock In	rafid@sohub.com.bd	2025-12-29 12:51:29.956261	2025-12-29 12:51:29.956261	stock_in	Import Accessories	Power Supply	10.00	40.00
f12487a3-06d7-4423-b8d1-5aaafacc2cd4	2025-12-29	\N	\N	5	Stock In	rafid@sohub.com.bd	2025-12-29 12:52:00.345462	2025-12-29 12:52:00.345462	stock_in	Import Accessories	Coin Acceptor	10.00	50.00
24a5d798-d4ab-4401-b868-d974e4bdcf67	2025-12-29	\N	\N	1	Stock In	rafid@sohub.com.bd	2025-12-29 12:52:26.803403	2025-12-29 12:52:26.803403	stock_in	Import Accessories	Sensore	10.00	10.00
11076f9d-fd32-4e05-9ca7-e3794d9b4d11	2025-12-29	\N	\N	11	Stock In	rafid@sohub.com.bd	2025-12-29 13:02:26.896367	2025-12-29 13:02:26.896367	stock_in	Import Accessories	controller	10.00	110.00
528bc9dc-059a-4dc0-83c4-10c59530a28a	2025-12-29	\N	\N	5	Stock In	rafid@sohub.com.bd	2025-12-29 13:03:13.848536	2025-12-29 13:03:13.848536	stock_in	Import Accessories	Pulley Roller Big	10.00	50.00
0065d316-ff19-4caa-9941-780a801f08f0	2025-12-29	\N	\N	5	Stock In	rafid@sohub.com.bd	2025-12-29 13:04:13.409614	2025-12-29 13:04:13.409614	stock_in	Import Accessories	Pulley Roller Small	10.00	50.00
8e32837d-7b07-404c-8eae-9db6a2c541b8	2025-12-29	\N	\N	10	Stock In	rafid@sohub.com.bd	2025-12-29 13:04:48.191509	2025-12-29 13:04:48.191509	stock_in	Import Accessories	Nylon Cord	10.00	100.00
a3620256-fb6b-488c-b147-829a39303f0d	2025-12-29	\N	\N	456	Stock In	rafid@sohub.com.bd	2025-12-29 12:40:26.764138	2025-12-29 12:40:26.764138	stock_in	Import Accessories	coin	1.00	456.00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, password_hash, role, franchise_id, created_at, first_name, last_name, username) FROM stdin;
b0f6f617-9414-4a96-9e45-3a7ecc7957d3	sohel@sohub.com.bd	Md Sohel Rana	$2b$10$fEhtjBVa0xWrVkuza2GKJeTX9DnEkmKxo09qBVntL.tu89CJ/Yfuq	admin	\N	2025-10-21 05:40:01.896554+00	\N	\N	\N
12ad4585-93b8-4559-b76b-9b4ff2dabc9a	superadmin@clowee.com	Super Admin	$2b$10$sQ6qwAaxpvuLIFBs2g4nFO0BPuBoUD62Z8bpUfWzCPLtQ9tQPESbi	super_admin	\N	2025-10-27 17:23:39.016352+00	Super	Admin	superadmin
08b40687-8d35-4cbb-8bf5-70e5e49d19cd	temp_1763980965481@temp.com	temp	$2b$12$LyDuLKBZORLyFLpAcLhIgeKRRvFe6ZeCcIuM4jjH0sGBq5uyysZ3u	user	\N	2025-11-24 10:42:50.01908+00	\N	\N	\N
b61a9829-5b43-41bc-b09a-3d74a0e05767	admin@clowee.com	Clowee Admin	$2b$12$YeBZdlDT//hInpot/jTyQ.vomCEIeicH2ANyeQYBS6C3RBR5riya6	admin	\N	2025-09-29 06:57:39.400135+00	Clowee	Admin	clowee_admin
975b7b9b-f608-45c0-861d-d91695ec79e9	sharif@sohub.com.bd	Md Arman Al Sharif	$2b$12$W8DbvavL0wrpVAzafSWGf.8juL01A9HfNaINqor8jcUHNFUeVR9fC	admin	\N	2025-10-19 09:57:13.029986+00	\N	\N	\N
85a76007-66f5-430b-932f-96519561f30d	temp_1764153953830@temp.com	temp	$2b$12$z90r5r9XOYZqc5QL8OgXZ.DOHgpL.IFQaN05SJRiCYi5Y6nRtIsxm	user	\N	2025-11-26 10:45:50.211442+00	\N	\N	\N
39a5646f-a007-4bbd-8611-9172a1115674	temp_1764154015185@temp.com	temp	$2b$12$AnAbArw.5drJRnVl7073f.47uA7r3ZQVTxDs9R85IAMMBTnL4alz2	user	\N	2025-11-26 10:46:51.917575+00	\N	\N	\N
bd7906bc-332a-4df6-9d7d-2bca8b4ea7a6	temp_1764154156950@temp.com	temp	$2b$12$5tpivegJ7FX3cNMOB/OZDu4S.7MQlZhJ0DZlIJNZawfzMkug9C3PS	user	\N	2025-11-26 10:49:25.194988+00	\N	\N	\N
eb521af0-7f91-4dc5-9b13-70094e501da3	rafid@sohub.com.bd	Rafid	$2b$12$zsRWmMPqlwTSbMizzzLAv.c1ux58cXYEN7UyoL9kbmuEtDNJWK/E2	admin	\N	2025-11-26 10:48:25.512371+00	\N	\N	\N
a7bfa98e-7d3e-4628-a4ef-69d27411a20b	temp_1764154734007@temp.com	temp	$2b$12$4bzU1bMLCbWnqENrEK8/P.6vvbmuD9OGc1XeqgQCRZmhhCp21.8ry	user	\N	2025-11-26 10:59:02.26942+00	\N	\N	\N
db2b532b-bbbe-438f-ab63-664330c9cd1b	temp_1764154989987@temp.com	temp	$2b$12$Ii1e0vTttcI0iXJlh/ytre3tRZ932fmJJJS5/.3UXcBPtvXW5Ekdu	user	\N	2025-11-26 11:03:18.118241+00	\N	\N	\N
319b1b43-16d6-4b1a-b55c-6cfdab1887f8	temp_1764155147738@temp.com	temp	$2b$12$UvCEInAbalnRAXfbP1qvHO.9bubvxkTNL9hd8oIyEQvYvrOhlriSa	user	\N	2025-11-26 11:05:55.949831+00	\N	\N	\N
48de882b-bc22-4521-9f55-fe9011b68e20	jrrafi16@gmail.com	Rafi	$2b$12$e3b/5ZpnmiF.tb6wvTm7Ie08y64Y2WNrV/S6r6SAGU/fJmIV9FRne	admin	\N	2025-09-29 10:49:33.232587+00	Md. Ariful	Islam	jrrafi11
d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	sajibur@sohub.com.bd	Sajibur Rahman	$2b$12$N7k/jxUoAZvNk5.pJD0/zOL6ANkEu7F7fK4Ndye6dnEOTHXVkLvKK	admin	\N	2025-10-19 09:54:29.085382+00	Md Sajibur	Rahman	Sajibur Rahman
0bdac82c-42e0-4061-a269-47a34ef457b2	spectator01@clowee.com	Spectator_Tester	$2b$12$1BdsaJ//Y.4VftmwQTJpeujQgfzWAzJnTbOqMVOZz9K1AhsIw6cA2	spectator	\N	2025-10-15 10:48:43.49989+00	\N	\N	\N
\.


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 23, true);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_money_logs bank_money_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_money_logs
    ADD CONSTRAINT bank_money_logs_pkey PRIMARY KEY (id);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_category_name_key UNIQUE (category_name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: franchise_agreements franchise_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.franchise_agreements
    ADD CONSTRAINT franchise_agreements_pkey PRIMARY KEY (id);


--
-- Name: franchises franchises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.franchises
    ADD CONSTRAINT franchises_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: machine_counters machine_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_counters
    ADD CONSTRAINT machine_counters_pkey PRIMARY KEY (id);


--
-- Name: machine_expenses machine_expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: machine_expenses machine_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_pkey PRIMARY KEY (id);


--
-- Name: machine_payments machine_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_payments
    ADD CONSTRAINT machine_payments_pkey PRIMARY KEY (id);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stock_out_history stock_out_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_out_history
    ADD CONSTRAINT stock_out_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- Name: idx_bank_money_logs_bank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_money_logs_bank_id ON public.bank_money_logs USING btree (bank_id);


--
-- Name: idx_bank_money_logs_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_money_logs_date ON public.bank_money_logs USING btree (transaction_date);


--
-- Name: idx_franchises_payment_bank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_franchises_payment_bank_id ON public.franchises USING btree (payment_bank_id);


--
-- Name: idx_inventory_transactions_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_transactions_item_id ON public.inventory_transactions USING btree (item_id);


--
-- Name: idx_machine_counters_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_counters_machine_id ON public.machine_counters USING btree (machine_id);


--
-- Name: idx_machine_expenses_bank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_expenses_bank_id ON public.machine_expenses USING btree (bank_id);


--
-- Name: idx_machine_expenses_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_expenses_machine_id ON public.machine_expenses USING btree (machine_id);


--
-- Name: idx_machine_payments_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_payments_invoice_id ON public.machine_payments USING btree (invoice_id);


--
-- Name: idx_machine_payments_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_payments_machine_id ON public.machine_payments USING btree (machine_id);


--
-- Name: idx_machines_franchise_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machines_franchise_id ON public.machines USING btree (franchise_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_sales_franchise_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_franchise_id ON public.sales USING btree (franchise_id);


--
-- Name: idx_sales_invoice_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_invoice_number ON public.sales USING btree (invoice_number);


--
-- Name: idx_sales_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_machine_id ON public.sales USING btree (machine_id);


--
-- Name: idx_sales_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_payment_status ON public.sales USING btree (payment_status);


--
-- Name: idx_stock_out_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_out_date ON public.stock_out_history USING btree (out_date);


--
-- Name: idx_stock_out_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_out_item_id ON public.stock_out_history USING btree (item_id);


--
-- Name: idx_stock_out_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_out_machine_id ON public.stock_out_history USING btree (machine_id);


--
-- Name: sales trigger_auto_invoice_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_invoice_number BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.auto_generate_invoice_number();


--
-- Name: attachments attachments_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: audit_logs audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: bank_money_logs bank_money_logs_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_money_logs
    ADD CONSTRAINT bank_money_logs_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id) ON DELETE CASCADE;


--
-- Name: users fk_users_franchise; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_franchise FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: franchise_agreements franchise_agreements_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.franchise_agreements
    ADD CONSTRAINT franchise_agreements_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: franchises franchises_payment_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.franchises
    ADD CONSTRAINT franchises_payment_bank_id_fkey FOREIGN KEY (payment_bank_id) REFERENCES public.banks(id);


--
-- Name: machine_counters machine_counters_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_counters
    ADD CONSTRAINT machine_counters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: machine_counters machine_counters_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_counters
    ADD CONSTRAINT machine_counters_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: machine_expenses machine_expenses_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: machine_expenses machine_expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: machine_expenses machine_expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: machine_expenses machine_expenses_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_expenses
    ADD CONSTRAINT machine_expenses_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: machine_payments machine_payments_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_payments
    ADD CONSTRAINT machine_payments_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: machine_payments machine_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_payments
    ADD CONSTRAINT machine_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: machine_payments machine_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_payments
    ADD CONSTRAINT machine_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales(id);


--
-- Name: machine_payments machine_payments_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_payments
    ADD CONSTRAINT machine_payments_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: machines machines_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: price_history price_history_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: sales sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales sales_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: sales sales_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: stock_out_history stock_out_history_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_out_history
    ADD CONSTRAINT stock_out_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.machine_expenses(id);


--
-- Name: stock_out_history stock_out_history_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_out_history
    ADD CONSTRAINT stock_out_history_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vWwVqTFdyFhpuyuGR0qJn8Gh2tIRnc0pW9OY55SyEhHLgot7mpi4QOkl2dWLzOF

