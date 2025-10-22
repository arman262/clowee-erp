--
-- PostgreSQL database dump
--

\restrict 3CozxLTpfHKnIzcuKxOcTcVduqscp4dXaLVfssPoKjmzOGHLCK99a45AfjQaJw7

-- Dumped from database version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)

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

DROP DATABASE IF EXISTS clowee_erp;
--
-- Name: clowee_erp; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE clowee_erp WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.UTF-8';


ALTER DATABASE clowee_erp OWNER TO postgres;

\unrestrict 3CozxLTpfHKnIzcuKxOcTcVduqscp4dXaLVfssPoKjmzOGHLCK99a45AfjQaJw7
\connect clowee_erp
\restrict 3CozxLTpfHKnIzcuKxOcTcVduqscp4dXaLVfssPoKjmzOGHLCK99a45AfjQaJw7

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
    CONSTRAINT bank_money_logs_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['add'::character varying, 'deduct'::character varying])::text[])))
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


ALTER TABLE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    expense_date date NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

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
    payment_bank_id uuid
);


ALTER TABLE public.franchises OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    item_name character varying(255) NOT NULL,
    sku character varying(100),
    category character varying(100),
    quantity integer DEFAULT 0,
    unit_cost numeric(10,2),
    total_value numeric(10,2),
    supplier character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    unit character varying(50) DEFAULT 'pcs'::character varying,
    purchase_price numeric(10,2) DEFAULT 0,
    selling_price numeric(10,2) DEFAULT 0,
    date_of_entry date DEFAULT CURRENT_DATE,
    remarks text,
    low_stock_threshold integer DEFAULT 10,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: TABLE inventory_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.inventory_items IS 'Stores all inventory items with stock levels and pricing';


--
-- Name: inventory_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    type character varying(10) NOT NULL,
    quantity integer NOT NULL,
    remaining_stock integer NOT NULL,
    handled_by character varying(255),
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_logs_type_check CHECK (((type)::text = ANY ((ARRAY['add'::character varying, 'deduct'::character varying])::text[])))
);


ALTER TABLE public.inventory_logs OWNER TO postgres;

--
-- Name: TABLE inventory_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.inventory_logs IS 'Tracks all stock adjustments (add/deduct) with audit trail';


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
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    franchise_id uuid,
    machine_id uuid,
    invoice_date date NOT NULL,
    total_sales numeric(10,2) NOT NULL,
    total_prize_cost numeric(10,2) NOT NULL,
    electricity_cost numeric(10,2),
    vat_amount numeric(10,2),
    net_profit numeric(10,2) NOT NULL,
    franchise_share_amount numeric(10,2) NOT NULL,
    clowee_share_amount numeric(10,2) NOT NULL,
    pay_to_clowee numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO postgres;

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
    unique_id character varying(100),
    quantity integer DEFAULT 1,
    item_price numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category_id integer,
    bank_id uuid,
    created_by uuid
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
    created_at timestamp with time zone DEFAULT now()
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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying, 'spectator'::character varying])::text[])))
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
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banks (id, bank_name, account_number, account_holder_name, branch_name, routing_number, is_active, created_at) FROM stdin;
841a7673-e6b8-4f07-9d2a-5f14ee159df6	NCC Bank	00120210025913	I3 Technologies	Gulshan Branch	160261721	t	2025-10-06 14:05:45.735694+06
503f5f0e-c268-49b8-adf4-190b10c8cdcc	Bkash(Personal)	01784457062				t	2025-10-06 14:06:34.446856+06
8c018b67-1073-45ce-af3b-4c2cf980badc	Midland Bank Limited	00111050008790	I3 TECHNOLOGIES	Gulshan Branch	285261727	t	2025-09-28 00:29:48.525882+06
d2fabda9-ee77-4536-a783-67d66406889a	Cash	Cash				t	2025-10-06 14:05:58.574379+06
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
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, category, amount, expense_date, description, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: franchise_agreements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.franchise_agreements (id, franchise_id, effective_date, coin_price, doll_price, franchise_share, clowee_share, electricity_cost, vat_percentage, payment_duration, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: franchises; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.franchises (id, name, coin_price, doll_price, electricity_cost, vat_percentage, franchise_share, clowee_share, payment_duration, maintenance_percentage, security_deposit_type, security_deposit_notes, agreement_copy, trade_nid_copy, created_at, updated_at, payment_bank_id) FROM stdin;
45f8ecfd-161e-476c-80eb-ad4655cdb752	The Dinning Lounge\t	25.00	130.00	337.50	0.00	50.00	50.00	Monthly	\N	\N	\N	\N	{}	2025-10-12 18:37:26.623+06	2025-10-18 00:17:29.631+06	8c018b67-1073-45ce-af3b-4c2cf980badc
29248edb-d4a3-4a78-9800-a10f60ad3488	PizzaBurg	25.00	130.00	0.00	0.00	60.00	40.00	Monthly	\N	\N	\N	\N	{}	2025-10-12 10:47:58.31+06	2025-10-12 10:47:58.31+06	8c018b67-1073-45ce-af3b-4c2cf980badc
01e5be66-b965-4adb-bc9a-2cfa16954161	Baily Deli\t	25.00	110.00	0.00	5.00	50.00	50.00	Half Monthly	5.00	\N	\N	\N	{}	2025-10-12 18:49:18.478+06	2025-10-13 15:10:00.275+06	8c018b67-1073-45ce-af3b-4c2cf980badc
cd9b585a-fefd-44bf-a97e-7d9b3624126d	The Cafe Rio 	25.00	150.00	250.00	5.00	50.00	50.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-12 11:35:35.788+06	2025-10-13 18:23:23.192+06	8c018b67-1073-45ce-af3b-4c2cf980badc
643bfd3f-24b6-491c-bed7-2d7d17968924	Fino 	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 16:56:16.927+06	2025-10-16 12:42:13.938+06	8c018b67-1073-45ce-af3b-4c2cf980badc
c754765f-279d-4800-88dd-c08b89803b36	Keedlee	25.00	150.00	0.00	0.00	50.00	50.00	Half Month	10.00	\N	\N	\N	{}	2025-10-13 16:53:12.682+06	2025-10-16 13:06:38.88+06	841a7673-e6b8-4f07-9d2a-5f14ee159df6
c41a6043-e460-480b-a569-430c96d00541	Crush Station	25.00	140.00	0.00	0.00	50.00	50.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-13 16:48:50.617+06	2025-10-16 13:11:50.577+06	8c018b67-1073-45ce-af3b-4c2cf980badc
3002befd-50db-4aca-964e-9476d0521850	Kolapata Burger	25.00	140.00	0.00	0.00	50.00	50.00	Half Monthly	5.00	\N	\N	\N	{}	2025-10-16 11:22:28.99+06	2025-10-16 16:34:10.751+06	8c018b67-1073-45ce-af3b-4c2cf980badc
9bbb9704-569c-4293-bbf8-df983d8ed37b	Mr Manik Food 	25.00	140.00	0.00	0.00	50.00	50.00	Monthly	10.00	\N	\N	\N	{}	2025-10-13 17:45:50.089+06	2025-10-16 16:34:20.482+06	8c018b67-1073-45ce-af3b-4c2cf980badc
5ff5d038-a23e-431e-a26c-e98a0bcac2ed	ChefMate Lounge	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 17:43:46.795+06	2025-10-16 16:34:29.756+06	8c018b67-1073-45ce-af3b-4c2cf980badc
d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	Food Rail	25.00	150.00	168.75	0.00	50.00	50.00	Half Monthly	10.00	\N	\N	\N	{}	2025-10-13 17:31:57.469+06	2025-10-16 16:34:36.283+06	8c018b67-1073-45ce-af3b-4c2cf980badc
c9168bd5-0b15-49dc-9a35-cc5b52535600	Shang High	30.00	150.00	0.00	0.00	40.00	60.00	Half Monthly	\N	\N	\N	\N	{}	2025-10-13 16:54:31.972+06	2025-10-16 16:34:44.315+06	841a7673-e6b8-4f07-9d2a-5f14ee159df6
ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	Fuoco	25.00	130.00	78.25	0.00	50.00	50.00	Half Monthly	5.00	\N	\N	\N	{}	2025-10-13 16:52:19.237+06	2025-10-16 16:34:53.581+06	8c018b67-1073-45ce-af3b-4c2cf980badc
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, item_name, sku, category, quantity, unit_cost, total_value, supplier, created_at, unit, purchase_price, selling_price, date_of_entry, remarks, low_stock_threshold, updated_at) FROM stdin;
ac319fc5-3abf-42a8-b11f-bc8a3792a3bd	Coin Token - Gold	\N	Tokens	500	\N	\N	Token Supplier Ltd	2025-10-20 18:47:23.851393+06	pcs	2.50	5.00	2025-10-20	Standard gold tokens for machines	100	2025-10-20 18:47:23.851393
496af922-abc9-4444-ac53-ff3527c6ff42	Prize Doll - Small	\N	Prizes	45	\N	\N	Toy World	2025-10-20 18:47:23.851393+06	pcs	150.00	300.00	2025-10-20	Small size plush dolls	20	2025-10-20 18:47:23.851393
761e2ca7-9fd2-429c-a588-c80bf21fc28f	Prize Doll - Medium	\N	Prizes	25	\N	\N	Toy World	2025-10-20 18:47:23.851393+06	pcs	250.00	500.00	2025-10-20	Medium size plush dolls	15	2025-10-20 18:47:23.851393
1f85d3b0-66c2-4fc7-87fd-1946d3c429aa	Prize Doll - Large	\N	Prizes	8	\N	\N	Toy World	2025-10-20 18:47:23.851393+06	pcs	400.00	800.00	2025-10-20	Large premium dolls	5	2025-10-20 18:47:23.851393
1d23b9f2-cbc9-49ca-98f1-71445895bb65	Machine Cleaning Kit	\N	Maintenance	12	\N	\N	Clean Pro	2025-10-20 18:47:23.851393+06	box	500.00	0.00	2025-10-20	Complete cleaning supplies	5	2025-10-20 18:47:23.851393
e7863c40-0a12-468b-94f6-d8c6cc43845f	LED Light Strip	\N	Parts	30	\N	\N	Electronics Hub	2025-10-20 18:47:23.851393+06	pcs	350.00	0.00	2025-10-20	RGB LED strips for machines	10	2025-10-20 18:47:23.851393
034dc663-04bf-4406-a644-d8017c786e37	Coin Mechanism	\N	Parts	6	\N	\N	Machine Parts Co	2025-10-20 18:47:23.851393+06	pcs	2500.00	0.00	2025-10-20	Replacement coin acceptors	3	2025-10-20 18:47:23.851393
ef5ec7da-38a9-4ebc-a935-7108015c944b	Claw Gripper	\N	Parts	15	\N	\N	Machine Parts Co	2025-10-20 18:47:23.851393+06	pcs	800.00	0.00	2025-10-20	Standard claw grippers	5	2025-10-20 18:47:23.851393
a74c189b-5dcd-4de2-a151-aa557005a2ee	Power Supply Unit	\N	Parts	4	\N	\N	Electronics Hub	2025-10-20 18:47:23.851393+06	pcs	3500.00	0.00	2025-10-20	12V power supply units	2	2025-10-20 18:47:23.851393
94c484e7-fd65-4e65-bbce-9f1b6b5b9275	Prize Box - Cardboard	\N	Packaging	200	\N	\N	Pack Solutions	2025-10-20 18:47:23.851393+06	pcs	15.00	0.00	2025-10-20	Standard prize packaging boxes	50	2025-10-20 18:47:23.851393
a4b8bc44-5168-463d-a262-2966d747ac47		\N		0	\N	\N		2025-10-20 18:50:01.883175+06	pcs	0.00	0.00	2025-10-20		10	2025-10-20 18:50:01.883175
\.


--
-- Data for Name: inventory_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_logs (id, item_id, type, quantity, remaining_stock, handled_by, remarks, created_at) FROM stdin;
2f25a588-7317-48db-90aa-8c5c1df72e53	ac319fc5-3abf-42a8-b11f-bc8a3792a3bd	add	100	500	System Admin	Initial stock entry	2025-10-20 18:47:23.854733
f4f9aeb3-d3dd-425e-b456-91defd117c18	496af922-abc9-4444-ac53-ff3527c6ff42	add	100	45	System Admin	Initial stock entry	2025-10-20 18:47:23.854733
5a9b133e-9ef1-4fed-ba3e-785a96b74b30	761e2ca7-9fd2-429c-a588-c80bf21fc28f	add	100	25	System Admin	Initial stock entry	2025-10-20 18:47:23.854733
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, item_id, transaction_type, quantity, transaction_date, related_invoice, notes, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, franchise_id, machine_id, invoice_date, total_sales, total_prize_cost, electricity_cost, vat_amount, net_profit, franchise_share_amount, clowee_share_amount, pay_to_clowee, status, pdf_url, created_at) FROM stdin;
8c1ef525-cb70-4aa6-ad7e-d419b7846947	29248edb-d4a3-4a78-9800-a10f60ad3488	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-09-30	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Draft	\N	2025-10-12 10:52:23.656149+06
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
99fc6762-7f9f-422d-807b-fa9d19522004	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	2025-09-30	35353	3150		2025-10-12 10:51:51.819367+06	\N
05b876e1-4ac1-4564-ac4b-a5304a96a9de	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	2025-09-30	4748	2206		2025-10-12 11:10:22.022137+06	\N
d5625581-c3c6-442e-98c7-aef5b1c7b588	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	2025-09-30	49198	2935		2025-10-12 11:16:41.167682+06	\N
26b73420-e01f-4f70-abc3-47d79aa72f45	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-09-30	53791	3491		2025-10-12 11:42:32.931121+06	\N
96b5415d-590d-44bc-9179-252e4a2123eb	3869bce6-8e5d-4e64-9197-24400000d168	2025-09-30	13352	6894		2025-10-12 18:52:32.023729+06	\N
78ea3608-70a2-4fad-9b2e-581f7dcc7704	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-09-30	20824	1423		2025-10-14 10:49:37.34701+06	\N
cdf8e3e4-7880-48fa-b885-affd650d0b3f	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-09-30	52434	3667		2025-10-14 10:59:08.064458+06	\N
976cd2d7-fff5-4429-ba9f-2e9bae9af9ae	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-09-30	14410	42493		2025-10-14 11:01:25.419586+06	\N
27055443-8d1a-41bb-9ded-f37ad958b136	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-09-30	16109	2189		2025-10-14 11:02:14.921282+06	\N
82659336-a65b-4797-ad28-f4a1c01a4242	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-09-30	25842	1619		2025-10-14 11:02:46.524782+06	\N
88305ebe-56c3-436e-8fda-8c5d44314d29	aa75ca99-9bf5-4156-af35-4467c84f44fd	2025-09-30	20126	1253		2025-10-14 11:12:57.311241+06	\N
c956e914-bdc5-42a0-b925-d0758301961d	8cb8bd6f-be4d-4964-8e10-eddd392cff87	2025-09-30	36582	2956		2025-10-14 11:13:32.775364+06	\N
a96efe7b-570e-4eaf-a5a8-e5d9829657b3	ae0f877f-a5b4-4955-a295-317855b3ff27	2025-09-30	13070	1406		2025-10-14 11:14:10.212464+06	\N
1d86fc62-bee5-4957-8fdf-a5cce5fef5b8	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-09-30	26727	1973		2025-10-14 11:14:43.359382+06	\N
08574b1d-c896-4f81-9b44-07bdb407b7f6	277b890a-f8fe-4cb2-a106-066731d848e3	2025-09-30	9694	1326		2025-10-14 11:38:21.19013+06	\N
b54938dc-6981-41ef-b270-34cbbfa7dcda	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-09-30	424	16		2025-10-14 11:43:02.04616+06	\N
0455025f-9857-4945-a33a-d2f4a97debb1	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-09-30	6412	1939		2025-10-14 11:50:34.183366+06	\N
987b7f85-9489-4f83-a8b2-a170dce45864	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-09-30	1837	806		2025-10-14 11:53:26.454391+06	\N
796aa512-8a07-4465-966a-0c71be9825a3	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-09-30	16962	997		2025-10-14 11:54:24.863799+06	\N
07c66665-11c7-4da4-9c36-9b1e4a879cda	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-09-30	6885	1788		2025-10-14 12:04:06.805592+06	\N
fcb5966d-81ef-4833-8f0b-27524963159c	d3e8eb14-b460-4f82-b334-790165c2a922	2025-09-30	6160	2114		2025-10-14 12:04:35.476399+06	\N
20737c2d-6235-4e2c-908c-8e87f2c7a55a	1885a455-019b-43d3-80e6-7a4fcc1e1232	2025-09-30	10236	24648		2025-10-14 12:26:43.351096+06	\N
5c48977c-5e1d-4383-8bef-19adf486cdf5	ee68bac1-c967-4b3e-be4c-53aeba1f1249	2025-10-15	16318	2199		2025-10-16 10:32:16.231479+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
a3980e05-b30e-486c-8f9e-16a76e283221	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-09-30	18009	1053		2025-10-16 11:27:30.150351+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
d64bb0c1-e420-4d1e-9422-20b76ba01cbf	bf03337a-93fd-45a5-84c1-79fb21d59745	2025-10-15	698	35		2025-10-16 11:31:52.260525+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
fb526ac8-0481-4526-b275-beffaffc381c	b5327e30-7b83-4fda-99aa-99a107bbcca9	2025-10-15	56547	3635		2025-10-16 12:08:58.231878+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
2c98c10e-a154-4254-ba21-a091e2528a2f	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	2025-10-15	6734	1949		2025-10-16 12:38:34.289218+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
b4313bef-3ac5-4e01-8007-3fbe92459961	3869bce6-8e5d-4e64-9197-24400000d168	2025-10-15	15115	6938		2025-10-16 13:34:21.914608+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
30efc8f4-eb5c-4fa6-b390-5f493b0ce8a5	07490f7a-5244-4e67-bcc0-4fd1df88ed92	2025-10-15	18292	1058		2025-10-16 13:54:44.695707+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
5669d5a6-b81d-4f54-97aa-d1a9bc2ec36f	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	2025-10-15	52749	3689		2025-10-16 13:56:42.010521+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
000ce0b9-428c-4794-bcd9-97f9fcbd152b	277b890a-f8fe-4cb2-a106-066731d848e3	2025-10-15	9837	1337		2025-10-16 15:33:27.861355+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
11e392fe-c2d3-473e-9556-58fa9374b706	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-10-15	26220	1644		2025-10-16 15:41:20.320053+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
08dea6f2-ed18-4688-b3a5-fb488013cd84	d3e8eb14-b460-4f82-b334-790165c2a922	2025-10-15	6232	2115		2025-10-16 15:43:34.950333+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
dd5b2507-b5df-437e-a66a-209580bd05fd	4c5dda16-9682-4bba-aed0-c38e82ec5356	2025-10-15	469	38		2025-10-16 15:49:40.539576+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
9171d100-621e-4898-80e4-1c7e1759869d	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	2025-10-15	21340	1508		2025-10-16 16:55:46.046878+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
5e56711a-4ee1-44d1-a7cf-fbb7dc7695c8	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-10-15	3097	959		2025-10-19 11:53:04.974057+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
6b53703a-c9f4-437a-bef5-14076bc9b656	feb921c1-425c-4a8a-8748-f7d958a7d3e0	2025-10-15	2509	830		2025-10-19 12:08:56.057547+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
c90d7a6a-33be-4604-b43e-fb49e92e5484	b957c84b-8cc1-4ee9-a24c-a80565676721	2025-10-15	17380	1006		2025-10-19 12:29:24.64463+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
3db3c0ed-5574-4f0c-acf8-352c7f5b542d	b084d7e5-1c69-4d42-9650-3b2ee45443d3	2025-10-15	39162	3095		2025-10-19 13:40:36.397833+06	b61a9829-5b43-41bc-b09a-3d74a0e05767
f83f5c22-73fb-4530-85c5-ace922ffd236	6d29d8b3-9777-4a01-8431-53acbcad9363	2025-10-15	7135	1795		2025-10-19 16:00:09.544567+06	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
aae8a08b-a40b-4de1-95eb-4018b83357e5	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	2025-09-30	2824	940		2025-10-20 16:35:36.749509+06	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
7e1b0ddb-dfbf-433a-a716-bec90b33e51d	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	2025-10-15	14813	42507		2025-10-20 16:58:32.036836+06	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
1ca9927e-3919-49b7-8779-50586c9495a2	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-09-30	37348	3043		2025-10-21 15:48:51.916596+06	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
9c7f812d-1168-471f-8181-d91c2e63ee8c	3531f437-b29d-4f5c-8891-2463ae8e70b5	2025-10-15	39162	3095		2025-10-21 15:49:30.143091+06	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
\.


--
-- Data for Name: machine_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_expenses (id, machine_id, expense_date, expense_details, unique_id, quantity, item_price, total_amount, created_at, category_id, bank_id, created_by) FROM stdin;
42601b0a-f13f-4612-bc52-bb7c9f970e16	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	2025-09-30	test	\N	1	1000.00	1000.00	2025-10-14 18:40:57.369246+06	20	\N	\N
5bdfcf16-c288-48f1-a096-7a19abd65405	\N	2025-10-12	edfsv	\N	1	1290.00	1290.00	2025-10-15 13:35:53.101916+06	10	8c018b67-1073-45ce-af3b-4c2cf980badc	\N
35236ab0-d71f-4875-a721-f72dbf33c572	\N	2025-10-11	Expense	\N	1	1000.00	1000.00	2025-10-12 18:21:39.140716+06	22	841a7673-e6b8-4f07-9d2a-5f14ee159df6	\N
\.


--
-- Data for Name: machine_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_payments (id, machine_id, bank_id, payment_date, amount, remarks, created_at, invoice_id, created_by) FROM stdin;
ba6147ee-18ec-4db2-990e-19173ff40aa5	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	16546.00	Received by Rajaul cash	2025-10-20 15:58:00.394442+06	6804c358-e42b-46f6-a423-a1d6bde9bcbb	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
193e7661-4805-496e-b862-0a26c36781e6	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	25354.00	Received by Rajaul cash	2025-10-20 15:58:44.885504+06	4d9c9bd1-e785-4b1f-ac2c-44a35dcd51c9	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
34bd3ad6-7810-4dd4-9a3e-55908e491881	07490f7a-5244-4e67-bcc0-4fd1df88ed92	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-20	3893.75	sharif bkash-15	2025-10-20 16:15:04.647152+06	7775baa6-afc0-4f78-a611-0ef48c5a4d7b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f5e76172-9f4b-4b31-8185-2ea116142de3	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-18	4000.00	sharif bkash-	2025-10-20 16:37:36.797444+06	90b4df42-3e3e-4751-841c-3bddf5e7c685	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
37038ba8-8afd-47f4-adde-1e27aa8eac3f	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-28	38556.25	Received by Rajaul cash	2025-10-13 18:28:55.435396+06	ba688357-6037-495b-8074-16308ed7144f	\N
8531d68b-33c4-481c-b55d-f3d1a2c47512	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	d2fabda9-ee77-4536-a783-67d66406889a	2025-09-30	8025.00	Received by Rajaul cash	2025-10-14 13:30:53.404116+06	1edaf64e-6ef9-4a38-97a9-3eb515c2a177	\N
32021409-55f6-4969-9910-e601ef902ec2	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-15	5995.00	Shajib	2025-10-20 17:28:05.54319+06	cb423190-9e99-457b-8cd4-900fe20d3319	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b195c077-72fb-41e3-aa36-10bf54e631f5	3531f437-b29d-4f5c-8891-2463ae8e70b5	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-20	13300.00		2025-10-21 16:27:42.394235+06	140362ff-e43a-4cad-8f61-e9b40be43c31	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
a0d0187c-8588-4749-93be-b5a574346463	277b890a-f8fe-4cb2-a106-066731d848e3	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-05	8000.00	sharif bkash-30	2025-10-16 11:09:23.102656+06	10529031-7ca1-49e7-bbd5-b6711a0119f7	b61a9829-5b43-41bc-b09a-3d74a0e05767
d02ccd1d-aafa-472c-b315-ed65d06ff1ae	1885a455-019b-43d3-80e6-7a4fcc1e1232	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-11	5087.00	sharif bkash-30	2025-10-16 11:10:11.18311+06	60c79403-7c6e-4962-ac41-080dcb53fb77	b61a9829-5b43-41bc-b09a-3d74a0e05767
99b6cabc-3fb2-4b24-ad21-4d81ee61d683	bf03337a-93fd-45a5-84c1-79fb21d59745	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-02	6726.25	sharif bkash-30	2025-10-16 11:10:51.762482+06	c10916aa-a1a9-445c-85b2-4633054fd9ee	b61a9829-5b43-41bc-b09a-3d74a0e05767
ad845555-1ee9-4b56-ade7-b039c3161e3c	aa75ca99-9bf5-4156-af35-4467c84f44fd	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	11537.50		2025-10-16 11:13:04.381706+06	bd1c789b-3c18-4c47-8fef-cfa60fb11159	b61a9829-5b43-41bc-b09a-3d74a0e05767
d642de04-135d-4a7f-84d1-05841c72ce1e	8cb8bd6f-be4d-4964-8e10-eddd392cff87	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	15012.50		2025-10-16 11:14:44.489364+06	9ab884d3-be80-4801-be6a-6008dca9d4fe	b61a9829-5b43-41bc-b09a-3d74a0e05767
c0cb50ac-188c-4422-85ff-5c8a850f1810	ae0f877f-a5b4-4955-a295-317855b3ff27	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	2552.50		2025-10-16 11:15:07.085898+06	ef270f9d-fa2e-4283-834f-08ffc516d7cb	b61a9829-5b43-41bc-b09a-3d74a0e05767
811e9dcf-e6a5-4ee2-a1cb-a417dc29ff26	b084d7e5-1c69-4d42-9650-3b2ee45443d3	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-05	6327.50		2025-10-16 11:15:40.000497+06	4d269933-5138-4505-8b0e-c250f1481d84	b61a9829-5b43-41bc-b09a-3d74a0e05767
b7ced6f3-2e6f-45cc-94bf-f46428605914	07490f7a-5244-4e67-bcc0-4fd1df88ed92	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-06	2973.25	sharif bkash-30	2025-10-16 11:28:47.267296+06	fc3fa8a4-b8cb-46c8-9d79-fd12a702b2c7	b61a9829-5b43-41bc-b09a-3d74a0e05767
e7f59f4a-e196-4c34-90b9-b707c527d94d	ee68bac1-c967-4b3e-be4c-53aeba1f1249	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-09-30	4000.00	Shajibi bkash	2025-10-16 16:36:28.599013+06	8c475278-a066-4d07-bfe8-2c8c3ff3a6cb	b61a9829-5b43-41bc-b09a-3d74a0e05767
8820bcb7-df98-44e0-bfa3-29e239b70340	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-09-30	3587.50	Shajibi bkash	2025-10-16 16:37:15.833524+06	8e7599fd-e273-46f0-9a28-622b94e3a94f	b61a9829-5b43-41bc-b09a-3d74a0e05767
f914e6e5-b5e3-4b2e-8d20-08b53e6100ea	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-09-30	5315.00	Shajibi bkash	2025-10-16 16:37:55.818363+06	68323bce-d41e-40e1-aff8-f6cfa00b2394	b61a9829-5b43-41bc-b09a-3d74a0e05767
0b1353dc-4a3b-427a-acca-7cab77823456	ee68bac1-c967-4b3e-be4c-53aeba1f1249	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-15	3592.00	Shajibi bkash-15	2025-10-16 16:41:20.651879+06	57104d42-67c0-4056-8d65-43ff0df1d45e	b61a9829-5b43-41bc-b09a-3d74a0e05767
82de9550-b30a-4efe-b665-4e8389248abe	277b890a-f8fe-4cb2-a106-066731d848e3	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-18	2237.75	sharif bkash-15	2025-10-19 11:01:08.618788+06	19fada62-2490-4f28-b1ec-f092fd732672	b61a9829-5b43-41bc-b09a-3d74a0e05767
c3d36cd9-45a1-494d-8ced-a5df2a733bb5	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	841a7673-e6b8-4f07-9d2a-5f14ee159df6	2025-10-19	4085.00		2025-10-19 17:21:34.890077+06	7c3114af-8292-4993-bf95-91acc86655e3	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
c813a567-d187-4506-ba38-4053ae04ba7b	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-19	19300.00	Received by Rajaul cash	2025-10-20 15:57:20.306628+06	1ca5bf33-f699-4265-865d-7f660324e01a	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
48e14eeb-22d8-4cc4-84ae-c97fea7eca40	3531f437-b29d-4f5c-8891-2463ae8e70b5	8c018b67-1073-45ce-af3b-4c2cf980badc	2025-10-20	10090.00		2025-10-21 16:28:03.022353+06	1329d001-e4bf-4624-be6d-a4e04f13e54e	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
f2550e3a-4939-4f97-93f3-d8d2b40ce551	b5327e30-7b83-4fda-99aa-99a107bbcca9	d2fabda9-ee77-4536-a783-67d66406889a	2025-10-21	37500.00	Received by Rajaul cash	2025-10-21 18:52:36.613107+06	8c86e40d-60cf-4b06-a0ae-bb2278216b5b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
4b6b5b6e-bba5-4295-8b9d-b15f3a3aefb6	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-20	6470.00	shajib bkash-15	2025-10-21 19:03:49.323176+06	1cdc5c7c-078d-414f-99e6-b12165388d8b	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
508877f0-5f81-442b-931d-df9354c5691b	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-21	5265.00	sharif bkash	2025-10-22 10:46:56.388309+06	5b3bb8c1-db71-45fd-9813-a6647f29f76c	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
b2b68391-13f2-49c5-960e-3d806f8a8c55	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	503f5f0e-c268-49b8-adf4-190b10c8cdcc	2025-10-21	4815.00	sharif bkash	2025-10-22 10:47:53.066874+06	ed45916e-8234-40c9-b870-ca1b86e50160	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27
\.


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machines (id, machine_name, machine_number, esp_id, franchise_id, branch_location, installation_date, initial_coin_counter, initial_prize_counter, notes, created_at) FROM stdin;
2fd45c00-2dce-471f-a4d8-f5ede2d712c4	Pizzburg Gulshan	1	pizzaburg_gulshan_0022	29248edb-d4a3-4a78-9800-a10f60ad3488	Gulshan	2023-08-22	34223	3092	sff	2025-10-12 10:50:21.479401+06
bf03337a-93fd-45a5-84c1-79fb21d59745	Fino 	15	Clowee_0006	643bfd3f-24b6-491c-bed7-2d7d17968924	Uttara	2025-09-06	27	12		2025-10-13 17:21:29.062237+06
6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	Pizzburg Mirpur	2	pizzaburg_mirpur_0023\t	29248edb-d4a3-4a78-9800-a10f60ad3488	Mirpur	2023-08-22	3795	2139		2025-10-12 11:09:40.887631+06
6ee6ed8e-bff1-43d0-a29b-1764668b2b29	Pizzburg Dhanmondi	3	pizzaburg_dhanmondi_0024	29248edb-d4a3-4a78-9800-a10f60ad3488	Dhanmondi	2025-10-12	47361	2825		2025-10-12 11:15:57.240551+06
b5327e30-7b83-4fda-99aa-99a107bbcca9	The Cafe Rio Mirpur	6	Cafe_Rio_Mirpur_39	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Mirpur	2025-10-12	51120	3334		2025-10-12 11:37:41.794156+06
74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	The Cafe Rio Mohammadpur 	5	Cafe_Rio_Mohammadpur_03	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Mohammadpur	2025-10-12	20424	1376		2025-10-12 17:53:17.776646+06
aa75ca99-9bf5-4156-af35-4467c84f44fd	The Dining Lounge Wari	9	dinning_lounge_wari_0033	45f8ecfd-161e-476c-80eb-ad4655cdb752	Wari	2024-02-08	19431	1200		2025-10-12 18:39:00.511858+06
8cb8bd6f-be4d-4964-8e10-eddd392cff87	The Dining Lounge Narayanganj	10	dinning_lounge_narayangonj_0027	45f8ecfd-161e-476c-80eb-ad4655cdb752	Narayanganj	2025-10-12	35744	2879		2025-10-12 18:40:30.018196+06
ae0f877f-a5b4-4955-a295-317855b3ff27	The Dining Lounge Khilgaon	8	Dining_Lounge_Khilgaon	45f8ecfd-161e-476c-80eb-ad4655cdb752	Khilgaon	2024-03-04	12916	1394		2025-10-12 18:42:44.275018+06
3869bce6-8e5d-4e64-9197-24400000d168	Baily Deli\t	17	Baily_Deli_0026	01e5be66-b965-4adb-bc9a-2cfa16954161	Bailey Rd	2023-09-20	11690	6849		2025-10-12 18:51:34.753072+06
29e89cc6-04f5-475d-8dd7-c2efe05d4c55	Crush Station Sonir Akhra	13	crush_station_sonirakhra_0047	c41a6043-e460-480b-a569-430c96d00541	Sonir Akhra	2024-05-14	52161	3647		2025-10-13 17:00:13.889636+06
4f9ad276-ec83-423b-bb6a-3431e5b5d74f	Crush Station Narayanganj	14	crush_station_narayanganj_0048	c41a6043-e460-480b-a569-430c96d00541	Narayanganj	2025-10-13	14037	42481		2025-10-13 17:06:34.204629+06
ee68bac1-c967-4b3e-be4c-53aeba1f1249	Crush Station Uttara	11	Crush_Station_Uttara_0045	c41a6043-e460-480b-a569-430c96d00541	Uttara	2024-10-20	15873	2171		2025-10-13 17:09:02.870478+06
b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	Crush Station Dhanmondi	12	Crush_Station_Dhanmondi_37	c41a6043-e460-480b-a569-430c96d00541	Dhanmondi	2024-10-17	25639	1604		2025-10-13 17:10:21.114507+06
277b890a-f8fe-4cb2-a106-066731d848e3	Fuoco Uttara	16	Fuoco_Mirpur_35	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	Uttara	2025-10-13	9199	1295		2025-10-13 17:16:09.960621+06
dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	Keedlee CTG 	20	keedlee_0049	c754765f-279d-4800-88dd-c08b89803b36	CTG	2025-03-02	6096	1932		2025-10-13 17:23:43.311615+06
feb921c1-425c-4a8a-8748-f7d958a7d3e0	Shang High Restaurant-1	27	Shang_High_Restaurant_53	c9168bd5-0b15-49dc-9a35-cc5b52535600	Dhanmondi	2025-08-12	1105	775		2025-10-13 17:26:52.111616+06
b957c84b-8cc1-4ee9-a24c-a80565676721	Shang High Restaurant-2	28	Shang_High_Restaurant_54	c9168bd5-0b15-49dc-9a35-cc5b52535600	Dhanmondi	2025-08-12	16227	975		2025-10-13 17:28:23.615687+06
72cbe2e1-4a91-425e-8a53-71533ffbdb0e	Food Rail	26	Food_Rail_52	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	Mirpur	2025-07-01	2370	912		2025-10-13 17:33:08.034646+06
6d29d8b3-9777-4a01-8431-53acbcad9363	Chick E Cheese Narayangonj	19	Chick_E_Cheese_0046	c41a6043-e460-480b-a569-430c96d00541	Narayanganj	2024-04-12	6548	1773		2025-10-13 17:35:03.722062+06
1885a455-019b-43d3-80e6-7a4fcc1e1232	Mr. Manik Food's Uttara	21	Manik_Foods_41	9bbb9704-569c-4293-bbf8-df983d8ed37b	Uttara	2024-06-04	9915	24645	[STATUS:active]	2025-10-13 17:48:46.330038+06
07490f7a-5244-4e67-bcc0-4fd1df88ed92	Kolapata	23	Kolapata_Narayanganj_0045	3002befd-50db-4aca-964e-9476d0521850	Narayanganj	2024-09-19	17789	1045	[STATUS:active]	2025-10-16 11:25:19.515851+06
4c5dda16-9682-4bba-aed0-c38e82ec5356	ChefMate Lounge	24	Clowee_00024	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	Dhanmondi	2025-09-18	46	15	[STATUS:active]	2025-10-13 17:44:38.759773+06
b084d7e5-1c69-4d42-9650-3b2ee45443d3	The Dining Lounge Uttara	7	Dining_Lounge_Uttara_41	45f8ecfd-161e-476c-80eb-ad4655cdb752	Uttara	2024-05-04	26237	1942	[STATUS:active]	2025-10-12 18:44:22.163041+06
d3e8eb14-b460-4f82-b334-790165c2a922	Chick E Cheese Sonir Akhra	18	Cafe_Rio_Mirpur_2_39	c41a6043-e460-480b-a569-430c96d00541	Sonir Akhra	2024-05-13	6032	2111	[STATUS:active]	2025-10-13 17:36:43.640884+06
3531f437-b29d-4f5c-8891-2463ae8e70b5	The Cafe Rio Uttara 	4	Cafe_Rio_Uttara_2_40	cd9b585a-fefd-44bf-a97e-7d9b3624126d	Uttara	2024-05-13	36493	3004	[STATUS:active]	2025-10-12 17:51:39.119882+06
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, notification_type, message, related_module, user_id, status, created_at) FROM stdin;
3c80c840-0be8-4a50-b083-56820aeb4c8d	Info	Database backup completed	System	\N	read	2025-10-15 16:40:32.729643+06
41059d52-ae2a-4a79-8e92-2a2acfe0d363	Success	New franchise onboarded	Franchises	\N	read	2025-10-15 16:40:32.729643+06
e7105504-9ed9-4b75-a346-c378809931c9	Info	Monthly report generated	Reports	\N	read	2025-10-15 16:40:32.729643+06
89367c39-44f6-4fdd-b20b-082881f5de78	Warning	Low inventory alert for Machine #001	Machines	\N	read	2025-10-15 16:40:32.729643+06
027819bf-5c5d-4447-b92c-0bd2aff08b5a	Success	System initialized successfully	System	\N	read	2025-10-15 16:40:32.729643+06
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
1ca5bf33-f699-4265-865d-7f660324e01a	2fd45c00-2dce-471f-a4d8-f5ede2d712c4	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-30	1072	26800.00	110	14300.00	2025-10-12 10:58:35.292683+06	clw/01/2025/09	Due	58	-52	\N	0.00	26800.00	5000.00	19300.00	\N	0.00	0.00
6804c358-e42b-46f6-a423-a1d6bde9bcbb	6f603dc0-90ac-4d7d-ac3a-ee7bfe9557c8	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-30	937	23425.00	92	11960.00	2025-10-12 11:12:53.286852+06	clw/02/2025/09	Due	16	-25	\N	0.00	23425.00	4586.00	16546.00	\N	0.00	0.00
3ac79576-2cf2-44ff-8237-179a934c933f	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-09-30	1635	40875.00	72	7920.00	2025-10-12 18:59:56.46755+06	clw/17/2025/09H2	Due	27	-27	\N	2043.75	38831.25	15455.63	23375.63	\N	0.00	0.00
7b2f818e-5d2f-4a26-9af0-8abc722031b5	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-15	516	12900.00	50	7500.00	2025-10-16 16:57:56.852987+06	clw/05/2025/10H1	Due	0	35	\N	645.00	12255.00	2377.50	9627.50	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
1edaf64e-6ef9-4a38-97a9-3eb515c2a177	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	400	10000.00	47	7050.00	2025-10-14 10:55:00.274342+06	clw/05/2025/09H2	Due	0	0	\N	500.00	9500.00	1225.00	8025.00	\N	0.00	0.00
8e7599fd-e273-46f0-9a28-622b94e3a94f	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	203	5075.00	15	2100.00	2025-10-14 11:03:59.820352+06	clw/12/2025/09H2	Due	0	0	\N	0.00	5075.00	1487.50	3587.50	\N	0.00	0.00
8c475278-a066-4d07-bfe8-2c8c3ff3a6cb	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	236	5900.00	15	2100.00	2025-10-14 11:04:43.348661+06	clw/11/2025/09H2	Due	0	3	\N	0.00	5900.00	1900.00	4000.00	\N	0.00	0.00
68323bce-d41e-40e1-aff8-f6cfa00b2394	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	358	8950.00	12	1680.00	2025-10-14 11:05:33.525467+06	clw/14/2025/09H2	Due	15	0	\N	0.00	8950.00	3635.00	5315.00	\N	0.00	0.00
ed45916e-8234-40c9-b870-ca1b86e50160	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	262	6550.00	22	3080.00	2025-10-14 11:06:28.708681+06	clw/13/2025/09H2	Due	11	-2	\N	0.00	6550.00	1735.00	4815.00	\N	0.00	0.00
bd1c789b-3c18-4c47-8fef-cfa60fb11159	aa75ca99-9bf5-4156-af35-4467c84f44fd	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	664	16600.00	55	7150.00	2025-10-14 11:27:57.014243+06	clw/09/2025/09	Due	31	-2	\N	0.00	16600.00	4725.00	11537.50	\N	0.00	0.00
9ab884d3-be80-4801-be6a-6008dca9d4fe	8cb8bd6f-be4d-4964-8e10-eddd392cff87	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	812	20300.00	80	10400.00	2025-10-14 11:28:46.940629+06	clw/10/2025/09	Due	26	-3	\N	0.00	20300.00	4950.00	15012.50	\N	0.00	0.00
ef270f9d-fa2e-4283-834f-08ffc516d7cb	ae0f877f-a5b4-4955-a295-317855b3ff27	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	148	3700.00	16	2080.00	2025-10-14 11:29:37.140631+06	clw/08/2025/09	Due	6	-4	\N	0.00	3700.00	810.00	2552.50	\N	0.00	0.00
4d269933-5138-4505-8b0e-c250f1481d84	b084d7e5-1c69-4d42-9650-3b2ee45443d3	45f8ecfd-161e-476c-80eb-ad4655cdb752	2025-09-30	372	9300.00	31	4030.00	2025-10-14 11:34:16.540514+06	clw/07/2025/09	Due	118	0	\N	0.00	9300.00	2635.00	6327.50	\N	0.00	0.00
c10916aa-a1a9-445c-85b2-4633054fd9ee	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-09-30	364	9100.00	28	4200.00	2025-10-14 11:44:42.80383+06	clw/15/2025/09H2	Due	33	-24	\N	0.00	9100.00	2205.00	6726.25	\N	0.00	0.00
d0259d7e-2f38-4a48-a8a2-37b42eef80ef	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-09-30	220	5500.00	7	1050.00	2025-10-14 11:52:26.001275+06	clw/20/2025/09H2	Due	96	0	\N	0.00	5500.00	2002.50	3497.50	\N	0.00	0.00
6b82d9e1-1030-446a-82c9-d5db1d60152b	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-30	591	17730.00	31	4650.00	2025-10-14 11:55:06.014358+06	clw/27/2025/09H2	Due	141	0	\N	0.00	17730.00	7848.00	12498.00	\N	0.00	0.00
2b8f2d71-505c-49e5-83e9-953eba7154e0	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-09-30	474	14220.00	22	3300.00	2025-10-14 11:55:35.031259+06	clw/28/2025/09H2	Due	261	0	\N	0.00	14220.00	6552.00	9852.00	\N	0.00	0.00
ddc518ff-4803-4243-a4c6-6405e39ae6bb	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	336	8400.00	17	2380.00	2025-10-14 12:06:11.149945+06	clw/19/2025/09H2	Due	1	-2	\N	0.00	8400.00	3010.00	5390.00	\N	0.00	0.00
5fa0762a-00af-4b36-bf0f-f136d748409f	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-09-30	104	2600.00	3	420.00	2025-10-14 12:09:45.237288+06	clw/18/2025/09H2	Due	24	0	\N	0.00	2600.00	1090.00	1510.00	\N	0.00	0.00
60c79403-7c6e-4962-ac41-080dcb53fb77	1885a455-019b-43d3-80e6-7a4fcc1e1232	9bbb9704-569c-4293-bbf8-df983d8ed37b	2025-09-30	260	6500.00	24	3360.00	2025-10-14 12:30:24.084802+06	clw/21/2025/09	Due	61	-21	\N	0.00	6500.00	1413.00	5087.00	\N	0.00	0.00
ba688357-6037-495b-8074-16308ed7144f	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	2270	56750.00	158	23700.00	2025-10-12 11:45:03.33597+06	clw/06/2025/09H2	Due	401	-1		2837.50	53912.50	15106.25	38556.25	\N	0.00	0.00
10529031-7ca1-49e7-bbd5-b6711a0119f7	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-09-30	432	10800.00	39	5070.00	2025-10-16 11:08:46.100134+06	clw/16/2025/09H2	Due	63	-8	\N	0.00	10800.00	2721.75	8000.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
fc3fa8a4-b8cb-46c8-9d79-fd12a702b2c7	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-09-30	186	4650.00	8	1120.00	2025-10-16 11:28:07.558036+06	clw/23/2025/09H2	Due	34	0	\N	0.00	4650.00	1676.75	2973.25	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
5139b4d7-5c0d-42e5-ba24-00962089bd0a	bf03337a-93fd-45a5-84c1-79fb21d59745	643bfd3f-24b6-491c-bed7-2d7d17968924	2025-10-15	268	6700.00	19	2850.00	2025-10-16 11:41:06.213566+06	clw/15/2025/10H1	Due	6	0	\N	0.00	6700.00	1732.50	4798.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
e88b9c2e-e7f0-4c5d-889b-323993a779d6	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-10-15	1700	42500.00	86	9460.00	2025-10-16 13:45:29.296864+06	clw/17/2025/10H1	Due	63	-42	\N	2125.00	40375.00	14684.63	25690.38	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
5b3bb8c1-db71-45fd-9813-a6647f29f76c	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	298	7450.00	22	3080.00	2025-10-16 13:58:04.833845+06	clw/13/2025/10H1	Due	17	0	\N	0.00	7450.00	2185.00	5265.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
19fada62-2490-4f28-b1ec-f092fd732672	277b890a-f8fe-4cb2-a106-066731d848e3	ab390752-da90-4d3f-9a9d-1f2f4b2f5eae	2025-10-15	120	3000.00	12	1560.00	2025-10-16 15:35:59.439263+06	clw/16/2025/10H1	Due	23	-1	\N	0.00	3000.00	684.00	2237.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
8fd198de-b3bf-472e-9363-f720655f1514	4c5dda16-9682-4bba-aed0-c38e82ec5356	5ff5d038-a23e-431e-a26c-e98a0bcac2ed	2025-10-15	410	10250.00	24	3600.00	2025-10-16 15:52:47.705357+06	clw/24/2025/10H1	Due	13	-1	\N	0.00	10250.00	2992.50	7088.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
05a29ec7-5290-48fe-a93d-a5dc3782eaaf	b957c84b-8cc1-4ee9-a24c-a80565676721	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-15	201	6030.00	9	1350.00	2025-10-19 12:36:51.74218+06	clw/28/2025/10H1	Due	217	0	\N	0.00	6030.00	2808.00	4158.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
2b1a4eef-c85d-4c7e-9505-34dd51e746ee	feb921c1-425c-4a8a-8748-f7d958a7d3e0	c9168bd5-0b15-49dc-9a35-cc5b52535600	2025-10-15	422	12660.00	24	3600.00	2025-10-19 12:36:54.056613+06	clw/27/2025/10H1	Due	250	0	\N	0.00	12660.00	5436.00	9036.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
7775baa6-afc0-4f78-a611-0ef48c5a4d7b	07490f7a-5244-4e67-bcc0-4fd1df88ed92	3002befd-50db-4aca-964e-9476d0521850	2025-10-15	246	6150.00	10	1400.00	2025-10-19 13:07:39.167399+06	clw/23/2025/10H1	Due	37	-5	\N	0.00	6150.00	2256.25	3893.75	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.00	0.00
7c3114af-8292-4993-bf95-91acc86655e3	dfbbdc7f-e2de-4351-be66-4a05ee1aa6ed	c754765f-279d-4800-88dd-c08b89803b36	2025-10-15	248	6200.00	10	1500.00	2025-10-19 17:19:56.567986+06	clw/20/2025/10	Due	74	0	\N	0.00	6200.00	2115.00	4085.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
11de7713-28b5-4f5b-a63b-0ac73bec529d	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-10-15	272	6800.00	15	2250.00	2025-10-20 15:28:44.593792+06	clw/26/2025/10H1	Due	1	4	\N	0.00	6800.00	2047.50	4583.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
4d9c9bd1-e785-4b1f-ac2c-44a35dcd51c9	6ee6ed8e-bff1-43d0-a29b-1764668b2b29	29248edb-d4a3-4a78-9800-a10f60ad3488	2025-09-29	1788	44700.00	122	15860.00	2025-10-12 11:17:54.379438+06	clw/03/2025/09	Due	49	-12		0.00	44700.00	11536.00	25354.00	\N	2042.00	0.00
90b4df42-3e3e-4751-841c-3bddf5e7c685	72cbe2e1-4a91-425e-8a53-71533ffbdb0e	d2f93e6d-44a3-4fbf-9a2b-e74661e0ea7a	2025-09-30	354	8850.00	20	3000.00	2025-10-20 16:36:59.569311+06	clw/26/2025/09H2	Due	100	8	\N	0.00	8850.00	2632.50	6048.75	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
8c86e40d-60cf-4b06-a0ae-bb2278216b5b	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-10	2271	56775.00	144	21600.00	2025-10-16 12:15:21.487841+06	clw/06/2025/10H1	Due	185	0		2838.75	53936.25	16168.13	37500.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	18.13	0.00
57104d42-67c0-4056-8d65-43ff0df1d45e	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	209	5225.00	14	1960.00	2025-10-16 13:02:11.171902+06	clw/11/2025/10H1	Due	0	-4		0.00	5225.00	1632.50	3592.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	0.50	0.00
1cdc5c7c-078d-414f-99e6-b12165388d8b	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	378	9450.00	25	3500.00	2025-10-16 15:42:33.750625+06	clw/12/2025/10H1	Due	0	0		0.00	9450.00	2975.00	6470.00	b61a9829-5b43-41bc-b09a-3d74a0e05767	5.00	0.00
cb423190-9e99-457b-8cd4-900fe20d3319	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	390	9750.00	16	2240.00	2025-10-20 16:59:17.538245+06	clw/14/2025/10H1	Due	13	-2	\N	0.00	9750.00	3755.00	5995.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
dc95b90d-a6ea-4cbc-9c3c-63dfbdedd3b5	d3e8eb14-b460-4f82-b334-790165c2a922	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	56	1400.00	2	280.00	2025-10-21 16:20:54.489341+06	clw/18/2025/10H1	Due	16	-1	\N	0.00	1400.00	560.00	840.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
140362ff-e43a-4cad-8f61-e9b40be43c31	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-30	800	20000.00	54	8100.00	2025-10-21 16:23:13.721251+06	clw/04/2025/09H2	Due	55	-15	\N	1000.00	19000.00	5450.00	13300.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
1329d001-e4bf-4624-be6d-a4e04f13e54e	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-10-15	656	16400.00	34	5100.00	2025-10-21 16:26:58.477822+06	clw/04/2025/10H1	Due	1158	18	\N	820.00	15580.00	5240.00	10090.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
2cb637f3-fdcc-448d-8b00-1156f8e2f4ce	6d29d8b3-9777-4a01-8431-53acbcad9363	c41a6043-e460-480b-a569-430c96d00541	2025-10-15	234	5850.00	10	1400.00	2025-10-20 15:13:17.217168+06	clw/19/2025/10H1	Due	0	-3		0.00	5850.00	2225.00	3625.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
066febcc-d276-41ee-a9e1-84bcea64803e	3869bce6-8e5d-4e64-9197-24400000d168	01e5be66-b965-4adb-bc9a-2cfa16954161	2025-09-15	1307	32675.00	54	5940.00	2025-10-22 10:59:08.897932+06	clw/17/2025/09H1	Due	0	0	Manual Entry	1634.00	31041.00	11923.00	19118.00	975b7b9b-f608-45c0-861d-d91695ec79e9	0.00	0.00
5fc4a18c-949f-4446-a95a-b082931706d1	3531f437-b29d-4f5c-8891-2463ae8e70b5	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-15	1208	30200.00	58	8700.00	2025-10-22 11:13:58.814116+06	clw/04/2025/09H1	Due	0	0	Manual Entry	1510.00	28690.00	19990.00	18445.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	249.98
22647618-ebd1-420d-824b-8f9ee177ef00	74077ddb-cbfc-46de-a0b6-1e2d1b68e4aa	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-15	486	12150.00	57	8550.00	2025-10-22 11:18:55.982467+06	clw/05/2025/09H1	Due	0	0	Manual Entry	607.50	11543.00	1496.00	9796.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	249.98
468b3487-ad6b-442f-86d6-eff14c788171	b5327e30-7b83-4fda-99aa-99a107bbcca9	cd9b585a-fefd-44bf-a97e-7d9b3624126d	2025-09-14	2136	53400.00	166	24900.00	2025-10-22 11:24:40.089246+06	clw/06/2025/09H1	Due	0	0	Manual Entry	2670.00	50730.00	12915.00	37500.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	65.00	249.98
ffa17cff-558c-44b8-b8b3-58173167a8bf	ee68bac1-c967-4b3e-be4c-53aeba1f1249	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	338	8450.00	25	3500.00	2025-10-22 11:38:54.905301+06	clw/11/2025/09H1	Due	0	0	Manual Entry	0.00	0.00	2475.00	5875.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
b469538e-1104-46fe-a067-091630c9831b	b873dc83-b55c-4fdc-98b9-7dc25e9d5a10	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	225	5625.00	18	2520.00	2025-10-22 11:46:22.288659+06	clw/12/2025/09H1	Due	0	0	Manual Entry	0.00	3105.00	1552.50	4072.50	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
40a3c156-2337-4657-97c3-1fc281053bfb	29e89cc6-04f5-475d-8dd7-c2efe05d4c55	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	220	5500.00	18	2520.00	2025-10-22 11:49:36.564911+06	clw/13/2025/09H1	Due	0	0	Manual Entry	0.00	5500.00	1490.00	4000.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	10.00	0.00
724d0837-5889-4e84-8d52-3baa2453776e	4f9ad276-ec83-423b-bb6a-3431e5b5d74f	c41a6043-e460-480b-a569-430c96d00541	2025-09-15	356	8900.00	14	1960.00	2025-10-22 11:53:01.338654+06	clw/14/2025/09H1	Due	0	0	Manual Entry	0.00	6940.00	3470.00	5430.00	d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	0.00	0.00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, password_hash, role, franchise_id, created_at, first_name, last_name, username) FROM stdin;
48de882b-bc22-4521-9f55-fe9011b68e20	jrrafi16@gmail.com	Rafi	1234@qwer	admin	\N	2025-09-29 16:49:33.232587+06	Md. Ariful	Islam	jrrafi11
b61a9829-5b43-41bc-b09a-3d74a0e05767	admin@clowee.com	Clowee Admin	admin123	admin	\N	2025-09-29 12:57:39.400135+06	Clowee	Admin	clowee_admin
0bdac82c-42e0-4061-a269-47a34ef457b2	spectator01@clowee.com	Spectator_Tester	admin123	spectator	\N	2025-10-15 16:48:43.49989+06	\N	\N	\N
3ce2c337-a8b5-4e5b-8d43-dac84743f31c	asif@sohub.com.bd	Asif Sahariwar (SOHUB)	admin123	admin	\N	2025-10-19 15:44:00.461777+06	\N	\N	\N
975b7b9b-f608-45c0-861d-d91695ec79e9	sharif@sohub.com.bd	Arman Al Sharif	admin123	admin	\N	2025-10-19 15:57:13.029986+06	\N	\N	\N
d47a8b5b-567f-40d3-9f7f-f2341b3a5d27	sajibur@sohub.com.bd	Sajibur Rahman	admin123	admin	\N	2025-10-19 15:54:29.085382+06	Md Sajiur	Rahman	\N
b0f6f617-9414-4a96-9e45-3a7ecc7957d3	sohel@sohub.com.bd	Md Sohel Rana	sohel@cloweeerp	admin	\N	2025-10-21 11:40:01.896554+06	\N	\N	\N
\.


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 22, true);


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
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


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
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_logs inventory_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


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
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_franchises_payment_bank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_franchises_payment_bank_id ON public.franchises USING btree (payment_bank_id);


--
-- Name: idx_inventory_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_items_category ON public.inventory_items USING btree (category);


--
-- Name: idx_inventory_items_quantity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_items_quantity ON public.inventory_items USING btree (quantity);


--
-- Name: idx_inventory_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_logs_created_at ON public.inventory_logs USING btree (created_at DESC);


--
-- Name: idx_inventory_logs_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_logs_item_id ON public.inventory_logs USING btree (item_id);


--
-- Name: idx_inventory_transactions_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_transactions_item_id ON public.inventory_transactions USING btree (item_id);


--
-- Name: idx_invoices_franchise_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_franchise_id ON public.invoices USING btree (franchise_id);


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
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


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
-- Name: inventory_logs inventory_logs_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: inventory_transactions inventory_transactions_related_invoice_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_related_invoice_fkey FOREIGN KEY (related_invoice) REFERENCES public.invoices(id);


--
-- Name: invoices invoices_franchise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES public.franchises(id);


--
-- Name: invoices invoices_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


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
-- PostgreSQL database dump complete
--

\unrestrict 3CozxLTpfHKnIzcuKxOcTcVduqscp4dXaLVfssPoKjmzOGHLCK99a45AfjQaJw7

