-- ===================================================
-- NEW PARIHAR ENGINEERING WORKS — Supabase SQL Schema
-- ===================================================
-- Copy and run this script in your Supabase SQL Editor:
-- (Dashboard → SQL Editor → New Query → Paste → Run)

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    image TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    features TEXT[] DEFAULT '{}'::text[],
    applications TEXT[] DEFAULT '{}'::text[],
    images TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMER LEADS / INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    items TEXT[] DEFAULT '{}'::text[],
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved'))
);

-- 3. REVIEWS & TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT DEFAULT 'Anonymous',
    product TEXT DEFAULT 'General Feedback',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE
);

-- 4. ABOUT SECTION TABLE
CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    history TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    milestones TEXT[] DEFAULT '{}'::text[]
);

-- 5. CONTACT & COORDINATES TABLE
CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    heading TEXT,
    subheading TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    contact JSONB DEFAULT '{}'::jsonb,
    map JSONB DEFAULT '{}'::jsonb
);

-- 6. PHOTO GALLERY TABLE
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VIDEOS GALLERY TABLE
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE about ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 1. PRODUCTS Policies
DROP POLICY IF EXISTS "Allow public select on products" ON products;
DROP POLICY IF EXISTS "Allow admin insert on products" ON products;
DROP POLICY IF EXISTS "Allow admin update on products" ON products;
DROP POLICY IF EXISTS "Allow admin delete on products" ON products;
CREATE POLICY "Allow public select on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow admin insert on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update on products" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow admin delete on products" ON products FOR DELETE USING (true);

-- 2. INQUIRIES Policies
DROP POLICY IF EXISTS "Allow public insert on inquiries" ON inquiries;
DROP POLICY IF EXISTS "Allow admin select on inquiries" ON inquiries;
DROP POLICY IF EXISTS "Allow admin update on inquiries" ON inquiries;
DROP POLICY IF EXISTS "Allow admin delete on inquiries" ON inquiries;
CREATE POLICY "Allow public insert on inquiries" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin select on inquiries" ON inquiries FOR SELECT USING (true);
CREATE POLICY "Allow admin update on inquiries" ON inquiries FOR UPDATE USING (true);
CREATE POLICY "Allow admin delete on inquiries" ON inquiries FOR DELETE USING (true);

-- 3. REVIEWS Policies
DROP POLICY IF EXISTS "Allow public select on reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public insert on reviews" ON reviews;
DROP POLICY IF EXISTS "Allow admin delete on reviews" ON reviews;
CREATE POLICY "Allow public select on reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert on reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin delete on reviews" ON reviews FOR DELETE USING (true);

-- 4. ABOUT Policies
DROP POLICY IF EXISTS "Allow public select on about" ON about;
DROP POLICY IF EXISTS "Allow admin update on about" ON about;
CREATE POLICY "Allow public select on about" ON about FOR SELECT USING (true);
CREATE POLICY "Allow admin update on about" ON about FOR UPDATE USING (true);

-- 5. CONTACT Policies
DROP POLICY IF EXISTS "Allow public select on contact" ON contact;
DROP POLICY IF EXISTS "Allow admin update on contact" ON contact;
CREATE POLICY "Allow public select on contact" ON contact FOR SELECT USING (true);
CREATE POLICY "Allow admin update on contact" ON contact FOR UPDATE USING (true);

-- 6. PHOTOS Policies
DROP POLICY IF EXISTS "Allow public select on photos" ON photos;
DROP POLICY IF EXISTS "Allow admin modify on photos" ON photos;
CREATE POLICY "Allow public select on photos" ON photos FOR SELECT USING (true);
CREATE POLICY "Allow admin modify on photos" ON photos FOR ALL USING (true);

-- 7. VIDEOS Policies
DROP POLICY IF EXISTS "Allow public select on videos" ON videos;
DROP POLICY IF EXISTS "Allow admin modify on videos" ON videos;
CREATE POLICY "Allow public select on videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Allow admin modify on videos" ON videos FOR ALL USING (true);

-- ===================================================
-- SEED DATA — Insert Existing JSON Records
-- ===================================================

-- Seed Products
INSERT INTO products (id, name, category, description, image, specifications, features, applications, images) VALUES
(
    'block-cutter-6ft', 
    '6 Feet Pillar Block Cutter Machine', 
    'Block Cutting Machine', 
    'A robust, high-precision pillar-type block cutting machine designed for cutting granite, marble, and sandstone blocks. The heavy-duty cast iron pillars ensure maximum stability and zero vibration during high-speed cutting operations.', 
    '/images/block_cutter_6ft.png',
    '{"Weight": "4.5 Tons", "Table Size": "3000 x 1800 mm", "Motor Power": "20 HP (14.9 kW)", "Power Supply": "3-Phase, 415 V, 50 Hz", "Blade Capacity": "650 mm (26 inches) to 1200 mm", "Max Cutting Depth": "450 mm"}'::jsonb,
    ARRAY['Heavy-duty oil-bathed guide pillars for smooth vertical movement', 'Automatic water-feeding system to keep the blade cool and suppress dust', 'Microprocessor-controlled automatic slab thickness indexing', 'Highly durable cast iron frame structure for longevity'],
    ARRAY['Granite slab manufacturing', 'Marble block dressing', 'Sandstone block sizing', 'Industrial stone cutting workshops'],
    ARRAY['/images/block_cutter_6ft.png']
),
(
    'block-cutter-7ft', 
    '7 Feet Pillar Block Cutter Machine', 
    'Block Cutting Machine', 
    'An intermediate, high-performance stone block cutter featuring a reinforced dual-pillar design and a 25 HP main motor. It is perfectly optimized for mid-to-large sized processing units seeking high output with lower power consumption.', 
    '/images/block_cutter_7ft.png',
    '{"Weight": "5.8 Tons", "Table Size": "3200 x 2000 mm", "Motor Power": "25 HP (18.6 kW)", "Power Supply": "3-Phase, 415 V, 50 Hz", "Blade Capacity": "1800 mm", "Max Cutting Depth": "700 mm"}'::jsonb,
    ARRAY['Rigid crossbeam design to prevent alignment errors', 'Variable frequency drive (VFD) for adjustable blade speeds', 'Touchscreen Human-Machine Interface (HMI) for operation monitoring', 'Rust-resistant coated components for wet environments'],
    ARRAY['Heavy stone slab slicing', 'Custom monument block shaping', 'Limestone sizing in processing units'],
    ARRAY['/images/block_cutter_7ft.png']
),
(
    'block-cutter-8ft', 
    '8 Feet Pillar Block Cutter Machine', 
    'Block Cutting Machine', 
    'Our flagship block cutter featuring massive 8-foot structural capacity, a high-torque 30 HP motor, and advanced hydraulic horizontal cutting systems. Engineered to handle the hardest granite blocks with effortless precision.', 
    '/images/block_cutter_8ft.png',
    '{"Weight": "7.5 Tons", "Table Size": "3500 x 2200 mm", "Motor Power": "30 HP (22.4 kW)", "Power Supply": "3-Phase, 415 V, 50 Hz", "Blade Capacity": "2200 mm", "Max Cutting Depth": "950 mm"}'::jsonb,
    ARRAY['Hydraulic power unit for high-speed cutting feed', 'Laser line guide alignment system for perfect cut accuracy', 'Dual vertical pillars with chrome-plated finish to resist wear', 'Automatic block-end sensor to stop operation upon completion'],
    ARRAY['Extra-large block slabbing', 'Infrastructure construction stone processing', 'Mining quarry slab production lines'],
    ARRAY['/images/block_cutter_8ft.png']
),
(
    'cnc-router-3axis', 
    'Stone CNC Router Machine, 3 Axis', 
    'CNC Machines', 
    'A high-precision 3-axis CNC router built specifically for stone fabrication. Features a heavy-duty water cooling system for the spindle and a fully welded steel gantry to maintain accuracy under heavy stone load.', 
    '/images/cnc_router_3axis.png',
    '{"Maximum Speed": "20,000 mm/min", "Drive System": "Stepper Motor / Hybrid Servo", "Spindle Power": "5.5 kW Water Cooled", "Control System": "DSP controller / NC Studio", "Transmission": "X/Y Axis Helical Rack & Pinion, Z Axis Ball Screw", "Working Area (X x Y x Z)": "1300 x 2500 x 300 mm"}'::jsonb,
    ARRAY['T-slot aluminum table with protective PVC layer and water tank', 'Double water cooling nozzles for tool longevity', 'Dustproof and waterproof design on all axes to protect guides', 'Resume print memory function after power failure'],
    ARRAY['3D stone carving and reliefs', 'Kitchen countertop edge profile carving', 'Tombstone engraving and lettering', 'Architectural moldings and panels'],
    ARRAY['/images/cnc_router_3axis.png']
),
(
    'cnc-stone-engraving', 
    'CNC Stone Engraving Machine', 
    'CNC Machines', 
    'A specialized engraving setup optimal for lettering, drawing, and shallow engraving on stones like marble, granite, tiles, and slate. Combines affordability with heavy-duty construction.', 
    '/images/cnc_stone_engraving.png',
    '{"Bed Frame": "Thick walled square steel tubes", "Lubrication": "Manual central lubrication system", "Spindle Power": "3.2 kW / 4.5 kW", "Working Area": "1200 x 1800 x 200 mm", "Spindle Speed": "0 - 24,000 RPM", "Spindle Cooling": "High-flow water pump system"}'::jsonb,
    ARRAY['High accuracy square guide rails', 'Heavy load bearing frame structure with rust prevention painting', 'DSP handheld controller for offline operations', 'Compatible with Type3, Artcam, and JDpaint software'],
    ARRAY['Nameplates and memorial plaques', 'Wall mural engraving', 'Decorative tile pattern carving'],
    ARRAY['/images/cnc_stone_engraving.png']
),
(
    'cnc-router-basic', 
    'CNC Router Machine', 
    'CNC Machines', 
    'A versatile CNC router capable of processing wood, MDF, acrylics, soft metals, and stone. Features a hybrid vacuum table and t-slot design, making it the perfect multi-utility machine for mixed fabrication workshops.', 
    '/images/cnc_router_basic.png',
    '{"Frame": "Seamless welded steel structure", "Inverter": "5.5 kW Fuling Inverter", "Table Type": "Hybrid Vacuum & T-Slot", "Working Area": "1300 x 2500 x 200 mm", "Spindle Power": "4.5 kW Air/Water Cooled"}'::jsonb,
    ARRAY['Vaccum pump suction for easy wood/acrylic clamping', 'Auxiliary T-slots for mechanical clamping of heavy stone pieces', 'Highly responsive limit switches on all axes for safety', 'Automatic tool sensor calibrator included'],
    ARRAY['Wooden door and cabinet carving', 'Hybrid wood-stone furniture design', 'Advertising sign boards and 3D letters'],
    ARRAY['/images/cnc_router_basic.png']
),
(
    'cnc-carving-stone', 
    'Stone CNC Carving Machine', 
    'CNC Machines', 
    'An advanced CNC machine optimized for high-depth 3D carvings, sculpture works, and pillar designs. Comes with optional rotary axes for machining cylinders and pillars.', 
    '/images/cnc_carving_stone.png',
    '{"Motor": "Leadshine Easy Servo Motor & Driver", "Rotary Axis": "Optional, 300 mm diameter", "Working Area": "1500 x 3000 x 400 mm", "Spindle Power": "7.5 kW high-torque spindle", "Max Spindle Speed": "18,000 RPM"}'::jsonb,
    ARRAY['High clearance Z-axis for thick block processing', 'Optional heavy-duty rotary axis for carving pillar statues', 'Cast steel structure frame for heavy duty shock absorption', 'Industrial water cooling system with digital temp display'],
    ARRAY['Temple pillar and column carving', '3D stone statues and busts', 'Large scale landscaping stone work'],
    ARRAY['/images/cnc_carving_stone.png']
),
(
    'crane-double-girder', 
    'Double Girder EOT Cranes, Span: 20 m', 
    'Crane', 
    'Heavy-duty overhead crane featuring a double girder design for high load capacities and long spans. Ideal for heavy machinery handling, factories, steel mills, and heavy stone yards where safe and smooth lifting is critical.', 
    '/images/crane_double_girder.png',
    '{"Span": "20 meters", "Control": "Cabin control or wireless radio remote control", "Duty Class": "Class II / Class III (M5 / M6 IS-807)", "Travel Speed": "10 - 20 m/min (VF Control)", "Lifting Height": "12 to 18 meters", "Lifting Capacity": "5 to 50 Tons"}'::jsonb,
    ARRAY['Double beam box-type girders with deflection analysis', 'Low headroom design for maximum space utilization', 'Variable frequency drives (VFD) for smooth hoisting', 'Full-length maintenance platforms with handrails'],
    ARRAY['Heavy block lifting in stone cutting yards', 'Steel fabrications workshop material shifting', 'Heavy equipment assembly lines'],
    ARRAY['/images/crane_double_girder.png']
),
(
    'crane-single-girder', 
    'Single Girder EOT Cranes, Span: 10 m', 
    'Crane', 
    'Cost-effective, highly efficient, and light-weight crane system for smaller factories and workshops. The single girder design provides compact headroom while delivering exceptional stability.', 
    '/images/crane_single_girder.png',
    '{"Span": "10 meters", "Control": "Pendant control switch or wireless remote", "Duty Class": "Class II (M4 IS-807)", "Lifting Height": "6 to 10 meters", "Lifting Capacity": "1 to 15 Tons", "Cross Travel Speed": "5 - 15 m/min"}'::jsonb,
    ARRAY['Minimal wheel load on factory gantry structures', 'Compact wire rope hoist for maximized hook approaches', 'Thermal overload protection for hoist motors', 'Anti-fall safety locks on end carriages'],
    ARRAY['Light manufacturing assembly lines', 'Machine shop maintenance and tooling setup', 'Warehouse material loading and unloading'],
    ARRAY['/images/crane_single_girder.png']
),
(
    'crane-gantry-double', 
    'Double Beam Gantry Crane, 20 m, 30 Ton', 
    'Industrial Crane', 
    'Self-supporting outdoor gantry crane designed for stone processing yards, ports, and construction sites. Eliminates the need for overhead building runways, operating directly on floor-level rails.', 
    '/images/crane_gantry_double.png',
    '{"Span": "20 meters", "Leg Design": "A-Frame / L-Frame heavy structural columns", "Travel Rails": "Standard CR70/CR80 rails", "Power Supply": "Cable drag chain / Busbar system", "Lifting Height": "10 meters", "Lifting Capacity": "30 Tons"}'::jsonb,
    ARRAY['Wind speed alarm sensor for outdoor safety', 'Heavy-duty long-travel motors with thruster brakes', 'Walkway platforms on legs and beams for inspections', 'Rain protection covers for hoisting trolley'],
    ARRAY['Unloading raw blocks from transport trucks', 'Stockpile yard block management', 'Infrastructure fabrication yards'],
    ARRAY['/images/crane_gantry_double.png']
),
(
    'crane-overhead', 
    'Overhead Crane', 
    'Factory Crane', 
    'Custom-designed factory overhead crane system built to fit specific workspace constraints. Built in compliance with international lifting standards, optimizing load handling and workspace footprint.', 
    '/images/crane_overhead.png',
    '{"Span": "Customizable (8m to 25m)", "Structure": "Box girder / I-beam", "Lifting Height": "Customizable", "Lifting Capacity": "1 to 30 Tons", "Control System": "VFD control with soft-start functionality"}'::jsonb,
    ARRAY['Tailor-made to fit low ceilings or obstruction-heavy environments', 'Precision step-less acceleration for fragile loads', 'Fail-safe electro-magnetic brakes on hoist and travel', 'LED load weight display screen on girder (optional)'],
    ARRAY['General manufacturing storage facilities', 'Paper and textile production plants', 'Automotive components lifting'],
    ARRAY['/images/crane_overhead.png']
)
ON CONFLICT (id) DO NOTHING;

-- Seed Inquiries
INSERT INTO inquiries (id, name, email, phone, company, message, items, date, status) VALUES
(
    'inq-1', 
    'Ramesh Patel', 
    'ramesh@patelstones.com', 
    '9876543210', 
    'Patel Stone Industries', 
    'Interested in buying the 3 Axis Stone CNC Router. Please send the quotation and delivery timeline to Jodhpur.', 
    ARRAY['Stone CNC Router Machine, 3 Axis'], 
    '2026-06-04T10:15:30.000Z'::timestamptz, 
    'pending'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Reviews
INSERT INTO reviews (id, name, location, product, rating, comment, date) VALUES
('rev-1', 'Kailash', 'Jodhpur, Rajasthan', 'Stone CNC Router Machine, 3 Axis', 5, 'Excellent Response and service. Highly recommended manufacturer in Jodhpur.', '2026-02-19'),
('rev-2', 'Yashpal', 'Chomu, Rajasthan', 'Stone CNC Router Machine, 3 Axis', 5, 'We have used many other machines but the quality and performance of your machine is many times better than other machines.', '2026-02-17'),
('rev-3', 'Devendra Parihar', 'Jodhpur, Rajasthan', '6 Feet Pillar Block Cutter Machine', 5, 'The pillar block cutter has been running 18 hours a day in our quarry. Zero breakdown in 12 months. Incredible build quality.', '2026-03-01'),
('rev-4', 'Rajesh Kumar', 'Makrana, Rajasthan', 'CNC Stone Engraving Machine', 5, 'Excellent engraving speed and software compatibility. The water cooling system for the tool works perfectly.', '2026-03-15'),
('rev-5', 'Amit Sharma', 'Udaipur, Rajasthan', 'Double Girder EOT Cranes, Span: 20 m', 5, 'Installed the 20m span crane in our marble yard. The load handling is extremely smooth and the remote control makes operations super safe.', '2026-03-29'),
('rev-6', 'Sanjay Singh', 'Jaipur, Rajasthan', 'Single Girder EOT Cranes, Span: 10 m', 5, 'Very satisfied with the installation. The team was professional, and the crane runs smoothly. Excellent value for money.', '2026-04-10'),
('rev-7', 'Vikram Rathore', 'Kishangarh, Rajasthan', 'Double Beam Gantry Crane, 20 m, 30 Ton', 5, 'Robust construction crane. Ideal for heavy marble block unloading. R Parihar and his team provided great support.', '2026-04-25'),
('rev-8', 'Hari Om Stone Works', 'Jodhpur, Rajasthan', 'Stone CNC Carving Machine', 5, 'Amazing 3D relief carving detail on sandstone. Simple to operate and low maintenance overhead.', '2026-05-02'),
('rev-9', 'Competitor Bot', 'Unknown', 'CNC Router Machine', 1, 'Delivered with minor delay. Support response took longer than expected.', '2026-01-10'),
('rev-10', 'Anonymous Buyer', 'Ahmedabad, Gujarat', '6 Feet Pillar Block Cutter Machine', 1, 'Installation service was delayed by a few days due to transport strike. The machine works well, but logistics should be better.', '2026-01-25')
ON CONFLICT (id) DO NOTHING;

-- Seed About
INSERT INTO about (id, history, details, milestones) VALUES
(
    1,
    'Established in 1990 by R Parihar, New Parihar Engineering Works has grown from a local machining workshop in Jodhpur to a premier manufacturer of heavy-duty cranes and advanced stone processing machines. With decades of field experience, we produce reliable, robust, and precision-engineered systems customized for construction, factories, mining, and stone finishing sectors.

Our infrastructure includes heavy fabrication facilities, high-capacity welding portals, precise lathe shops, and an experienced engineering design team. By using top-grade steel and advanced components, we ensure each crane and CNC Router meets stringent Indian Standards (IS-807 & IS-3177) for safety and structural deflection.',
    '{"natureOfBusiness": "OEM Manufacturer & Supplier", "legalStatus": "Proprietorship Firm", "owner": "R Parihar", "turnover": "₹1.5 - ₹5.0 Crores", "gst": "08**********1Z5", "registrationDate": "April 2018"}'::jsonb,
    ARRAY['1990: Inception as custom machinery workshop in Jodhpur.', '2004: Launched heavy-duty single & double girder overhead cranes line.', '2012: Developed Jodhpur''s first indigenously designed 3-Axis Stone CNC carving machine.', '2018: Upgraded fabrication facility with computerized structural alignment testers.']
)
ON CONFLICT (id) DO UPDATE SET
    history = EXCLUDED.history, details = EXCLUDED.details, milestones = EXCLUDED.milestones;

-- Seed Contact
INSERT INTO contact (id, heading, subheading, address, contact, map) VALUES
(
    1,
    'Ready to discuss your custom machinery requirements?',
    'We usually answer phone inquiries immediately and email quotes within 24 hours. You can also visit our assembly yard in Jodhpur.',
    '{"title": "Registered Address", "line1": "New Parihar Engineering Works", "line2": "Industrial Area, Jodhpur, Rajasthan, India"}'::jsonb,
    '{"gstin": "08**********1Z5", "phone": "+91 98290 85934", "title": "Contact Details", "email": "info@newpariharengineering.com", "primaryContact": "R Parihar (Owner)"}'::jsonb,
    '{"link": "https://maps.google.com", "title": "Assembly Yard Location Map", "address": "Jodhpur Industrial Estate Phase II, Jodhpur, Rajasthan"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    heading = EXCLUDED.heading, subheading = EXCLUDED.subheading, address = EXCLUDED.address, contact = EXCLUDED.contact, map = EXCLUDED.map;

-- Seed Photos
INSERT INTO photos (id, url, caption, category) VALUES
('pic-1', '/images/block_cutter_6ft.png', '6 Feet Pillar Block Cutter', 'Granite Processing Installation'),
('pic-2', '/images/cnc_router_3axis.png', 'Stone CNC Router Machine', 'Precision carving head'),
('pic-3', '/images/crane_double_girder.png', 'Double Girder Crane', 'Span: 20m, 30 Ton Capacity'),
('pic-4', '/images/crane_gantry_double.png', 'Double Beam Gantry Crane', 'Outdoor stone block yard'),
('pic-5', '/images/block_cutter_6ft.png', 'Manufacturing Yard', 'Pillar block assembly units'),
('pic-6', '/images/cnc_router_3axis.png', 'Finished CNC Router', 'Pre-dispatch final checks')
ON CONFLICT (id) DO NOTHING;

-- Seed Videos
INSERT INTO videos (id, title, duration, description, thumbnail, url) VALUES
('vid-1', 'CNC Stone Engraving Machine', 'Duration: 2:45 Mins', 'Watch our dual-spindle CNC engraver execute micro-detailed lettering on Rajasthan sandstone.', '/images/cnc_router_3axis.png', 'cnc_stone_demo.mp4'),
('vid-2', 'Double Girder EOT Cranes', 'Duration: 4:12 Mins', 'Live load testing and horizontal alignment check of a 20-meter span crane at stone yard.', '/images/crane_double_girder.png', 'crane_test.mp4'),
('vid-3', 'Stone CNC Router Machine', 'Duration: 3:30 Mins', 'Countertop profiling and 3D relief carving setup on high-grade granite slabs.', '/images/cnc_router_3axis.png', 'cnc_installation.mp4'),
('vid-4', 'Stone CNC Carving Machine', 'Duration: 5:02 Mins', 'Watch 3D sculpture machining using customized rotary attachments on marble columns.', '/images/cnc_router_3axis.png', 'cnc_carving.mp4')
ON CONFLICT (id) DO NOTHING;
