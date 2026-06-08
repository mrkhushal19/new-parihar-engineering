require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const multer = require('multer');
const db = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3005;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'parihar1990';

// Initialize Supabase connection
db.initSupabase();

// Check if running in a serverless environment (Netlify)
const isServerless = !!(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.FUNCTIONS_SIGNATURE);
const uploadDir = isServerless 
  ? '/tmp' 
  : path.join(__dirname, 'public', 'uploads');

// Ensure upload directory exists
try {
  if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Warning: Could not create upload directory:', err.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed (jpeg, jpg, png, webp, gif)!"));
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Middleware to ensure database connection is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await db.initSupabase();
  } catch (err) {
    console.error('Failed to initialize Supabase in middleware:', err.message);
  }
  next();
});

// Static files directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// LOCAL JSON HELPERS (Offline Fallback)
// ============================================
const getDataFilePath = (fileName) => {
  const paths = [
    path.join(__dirname, 'data', fileName),
    path.join(process.cwd(), 'data', fileName),
    path.join(__dirname, '..', 'data', fileName)
  ];
  for (const p of paths) {
    if (fsSync.existsSync(p)) return p;
  }
  return paths[0]; // fallback
};

async function readJSONFile(fileName) {
  try {
    const filePath = getDataFilePath(fileName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
}

async function writeJSONFile(fileName, data) {
  if (isServerless) {
    console.warn(`⚠️ Warning: Write operation for ${fileName} ignored in serverless mode (read-only filesystem).`);
    return false;
  }
  try {
    await fs.writeFile(getDataFilePath(fileName), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    return false;
  }
}

async function safeDbCall(promise) {
  try {
    return await promise;
  } catch (err) {
    console.error('Supabase query exception:', err.message);
    return { data: null, error: err };
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
  next();
}

// ============================================
// REST API ENDPOINTS
// ============================================

// 1. POST /api/auth/login - Staff Authentication
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_PASSWORD });
  }
  res.status(401).json({ error: 'Incorrect password.' });
});

// Temporary Diagnostic Route to debug environment variables in production
app.get('/api/debug-env', (req, res) => {
  res.json({
    SUPABASE_URL_exists: !!process.env.SUPABASE_URL,
    SUPABASE_URL_val: process.env.SUPABASE_URL || 'not set',
    SUPABASE_KEY_exists: !!process.env.SUPABASE_KEY,
    SUPABASE_KEY_length: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0,
    isOnline: db.isOnline(),
    initError: db.getInitError ? db.getInitError() : 'unknown method',
    isServerless: isServerless,
    env_keys: Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPABASE') || k.toUpperCase().includes('DATABASE') || k.toUpperCase().includes('URL') || k.toUpperCase().includes('KEY'))
  });
});

// 2. POST /api/upload - Secure Image Upload Endpoint (secured)
app.post('/api/upload', requireAdminAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const uploadedUrls = [];

    if (db.isOnline()) {
      for (const file of req.files) {
        try {
          const fileBuffer = await fs.readFile(file.path);
          const { data, error } = await db.getSupabase().storage
            .from('uploads')
            .upload(file.filename, fileBuffer, {
              contentType: file.mimetype,
              upsert: true
            });
          
          if (!error) {
            const { data: urlData } = db.getSupabase().storage
              .from('uploads')
              .getPublicUrl(file.filename);
            uploadedUrls.push(urlData.publicUrl);
            
            // Clean up the local temp file since it is in Supabase storage now
            try {
              await fs.unlink(file.path);
            } catch (unlinkErr) {
              console.warn('Failed to clean up temp file:', unlinkErr.message);
            }
          } else {
            console.warn(`Supabase storage upload failed for ${file.filename}:`, error.message);
            uploadedUrls.push(`/uploads/${file.filename}`);
          }
        } catch (uploadErr) {
          console.error(`Error uploading ${file.filename} to Supabase storage:`, uploadErr.message);
          uploadedUrls.push(`/uploads/${file.filename}`);
        }
      }
    } else {
      // Offline fallback: Use the local file paths
      req.files.forEach(file => {
        uploadedUrls.push(`/uploads/${file.filename}`);
      });
    }

    res.status(201).json({ urls: uploadedUrls });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process file uploads.' });
  }
});

// ============================================
// PRODUCTS CRUD
// ============================================

// 3. GET /api/products - Retrieve all products
app.get('/api/products', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase().from('products').select('*');
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('Supabase products empty or error:', error ? error.message : 'No rows returned');
    } catch (err) {
      console.error('Supabase products fetch exception:', err.message);
    }
  }
  const products = await readJSONFile('products.json');
  res.json(products);
});

// 4. GET /api/products/:id - Retrieve specific product details
app.get('/api/products/:id', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase()
        .from('products').select('*').eq('id', req.params.id).single();
      if (!error && data) return res.json(data);
      if (error && error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
      console.warn('Supabase product empty or error:', error ? error.message : 'No row returned');
    } catch (err) {
      console.error('Supabase product fetch exception:', err.message);
    }
  }
  const products = await readJSONFile('products.json');
  const product = products.find(p => p.id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

// 5. POST /api/products - Create a new product (secured)
app.post('/api/products', requireAdminAuth, async (req, res) => {
  const { name, category, description, image, images, specifications, features, applications } = req.body;

  if (!name || !category || !description) {
    return res.status(400).json({ error: 'Name, category, and description are required fields.' });
  }

  const imageList = Array.isArray(images) ? images : (image ? [image] : []);
  const primaryImage = imageList.length > 0 ? imageList[0] : '/images/block_cutter_6ft.png';

  const newProduct = {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4),
    name,
    category,
    description,
    image: primaryImage,
    images: imageList,
    specifications: specifications || {},
    features: Array.isArray(features) ? features : [],
    applications: Array.isArray(applications) ? applications : []
  };

  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('products').insert(newProduct).select().single()
    );
    if (!error) return res.status(201).json(data);
    console.error('Supabase product insert error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }

  // Fallback to local JSON
  const products = await readJSONFile('products.json');
  products.push(newProduct);
  const success = await writeJSONFile('products.json', products);
  if (success) {
    res.status(201).json(newProduct);
  } else {
    res.status(500).json({ error: 'Failed to write to products database.' });
  }
});

// 6. PUT /api/products/:id - Update product details (secured)
app.put('/api/products/:id', requireAdminAuth, async (req, res) => {
  const { name, category, description, image, images, specifications, features, applications } = req.body;

  const imageList = Array.isArray(images) ? images : (image ? [image] : null);
  const primaryImage = imageList && imageList.length > 0 ? imageList[0] : null;

  if (db.isOnline()) {
    // Build update object, only include fields that are provided
    const updates = {};
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (description) updates.description = description;
    if (primaryImage) updates.image = primaryImage;
    if (imageList) updates.images = imageList;
    if (specifications) updates.specifications = specifications;
    if (Array.isArray(features)) updates.features = features;
    if (Array.isArray(applications)) updates.applications = applications;

    const { data, error } = await safeDbCall(
      db.getSupabase().from('products').update(updates).eq('id', req.params.id).select().single()
    );
    if (!error) return res.json(data);
    if (error && error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found.' });
    console.error('Supabase product update error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }

  // Fallback to local JSON
  const products = await readJSONFile('products.json');
  const index = products.findIndex(p => p.id === req.params.id);

  if (index !== -1) {
    products[index] = {
      ...products[index],
      name: name || products[index].name,
      category: category || products[index].category,
      description: description || products[index].description,
      image: primaryImage || products[index].image,
      images: imageList || products[index].images || [products[index].image],
      specifications: specifications || products[index].specifications,
      features: Array.isArray(features) ? features : products[index].features,
      applications: Array.isArray(applications) ? applications : products[index].applications
    };

    const success = await writeJSONFile('products.json', products);
    if (success) {
      res.json(products[index]);
    } else {
      res.status(500).json({ error: 'Failed to update products database.' });
    }
  } else {
    res.status(404).json({ error: 'Product not found.' });
  }
});

// 7. DELETE /api/products/:id - Delete a product (secured)
app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('products').delete().eq('id', req.params.id).select()
    );
    if (!error) {
      if (data && data.length === 0) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ message: 'Product deleted successfully' });
    }
    console.error('Supabase product delete error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }

  const products = await readJSONFile('products.json');
  const filtered = products.filter(p => p.id !== req.params.id);

  if (products.length === filtered.length) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const success = await writeJSONFile('products.json', filtered);
  if (success) {
    res.json({ message: 'Product deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// ============================================
// REVIEWS
// ============================================

// 8. GET /api/reviews - Retrieve all reviews
app.get('/api/reviews', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase()
        .from('reviews').select('*').order('date', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('Supabase reviews empty or error:', error ? error.message : 'No rows returned');
    } catch (err) {
      console.error('Supabase reviews fetch exception:', err.message);
    }
  }
  const reviews = await readJSONFile('reviews.json');
  res.json(reviews);
});

// 9. POST /api/reviews - Submit a new review
app.post('/api/reviews', async (req, res) => {
  const { name, location, product, rating, comment } = req.body;

  if (!name || !rating || !comment) {
    return res.status(400).json({ error: 'Name, rating, and comment are required fields.' });
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    name,
    location: location || 'Anonymous',
    product: product || 'General Feedback',
    rating: parseInt(rating),
    comment,
    date: new Date().toISOString().split('T')[0]
  };

  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('reviews').insert(newReview).select().single()
    );
    if (!error) return res.status(201).json(data);
    console.error('Supabase review insert error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }

  const reviews = await readJSONFile('reviews.json');
  reviews.unshift(newReview);
  const success = await writeJSONFile('reviews.json', reviews);
  if (success) {
    res.status(201).json(newReview);
  } else {
    res.status(500).json({ error: 'Failed to write to database' });
  }
});

// ============================================
// INQUIRIES
// ============================================

// 10. POST /api/inquiries - Submit a new inquiry
app.post('/api/inquiries', async (req, res) => {
  console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);
  console.log('db.isOnline():', db.isOnline());

  const { name, email, phone, company, message, items } = req.body;

  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'Name, phone number, and inquiry message are required fields.' });
  }

  const newInquiry = {
    id: `inq-${Date.now()}`,
    name,
    email: email || '',
    phone,
    company: company || '',
    message,
    items: Array.isArray(items) ? items : [],
    date: new Date().toISOString(),
    status: 'pending'
  };

  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('inquiries').insert(newInquiry).select().single()
    );
    if (!error) return res.status(201).json(data);
    console.error('Supabase inquiry insert error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }

  const inquiries = await readJSONFile('inquiries.json');
  inquiries.unshift(newInquiry);
  const success = await writeJSONFile('inquiries.json', inquiries);
  if (success) {
    res.status(201).json(newInquiry);
  } else {
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// ============================================
// ABOUT US
// ============================================

// 11. GET /api/about - Retrieve about content
app.get('/api/about', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase()
        .from('about').select('*').eq('id', 1).single();
      if (!error && data && Object.keys(data).length > 0) return res.json(data);
      console.warn('Supabase about empty or error:', error ? error.message : 'No row returned');
    } catch (err) {
      console.error('Supabase about fetch exception:', err.message);
    }
  }
  const about = await readJSONFile('about.json');
  res.json(about);
});

// 12. PUT /api/about - Update about details (secured)
app.put('/api/about', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('about').upsert({ id: 1, ...req.body }).select().single()
    );
    if (!error) return res.json(data);
    console.error('Supabase about update error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }
  const success = await writeJSONFile('about.json', req.body);
  if (success) {
    res.json(req.body);
  } else {
    res.status(500).json({ error: 'Failed to update about us database.' });
  }
});

// ============================================
// CONTACT
// ============================================

// 12b. GET /api/contact - Retrieve contact details
app.get('/api/contact', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase()
        .from('contact').select('*').eq('id', 1).single();
      if (!error && data && Object.keys(data).length > 0) return res.json(data);
      console.warn('Supabase contact empty or error:', error ? error.message : 'No row returned');
    } catch (err) {
      console.error('Supabase contact fetch exception:', err.message);
    }
  }
  const contact = await readJSONFile('contact.json');
  res.json(contact);
});

// 12c. PUT /api/contact - Update contact details (secured)
app.put('/api/contact', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await safeDbCall(
      db.getSupabase().from('contact').upsert({ id: 1, ...req.body }).select().single()
    );
    if (!error) return res.json(data);
    console.error('Supabase contact update error:', error ? error.message : 'No data returned');
    return res.status(500).json({ error: `Supabase database error: ${error ? error.message : 'Unknown error'}` });
  }
  const success = await writeJSONFile('contact.json', req.body);
  if (success) {
    res.json(req.body);
  } else {
    res.status(500).json({ error: 'Failed to update contact database.' });
  }
});

// ============================================
// VIDEOS CRUD
// ============================================

// 13. GET /api/videos - Retrieve all video clips
app.get('/api/videos', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase().from('videos').select('*');
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('Supabase videos empty or error:', error ? error.message : 'No rows returned');
    } catch (err) {
      console.error('Supabase videos fetch exception:', err.message);
    }
  }
  const videos = await readJSONFile('videos.json');
  res.json(videos);
});

// 14. POST /api/videos - Add new video clip (secured)
app.post('/api/videos', requireAdminAuth, async (req, res) => {
  const { title, duration, description, thumbnail, url } = req.body;
  if (!title || !duration || !description || !url) {
    return res.status(400).json({ error: 'Title, duration, description, and video URL are required fields.' });
  }

  const newVideo = {
    id: `vid-${Date.now()}`,
    title,
    duration,
    description,
    thumbnail: thumbnail || '/images/cnc_router_3axis.png',
    url
  };

  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('videos').insert(newVideo).select().single();
    if (!error) return res.status(201).json(data);
    console.error('Supabase video insert error:', error.message);
  }

  const videos = await readJSONFile('videos.json');
  videos.push(newVideo);
  const success = await writeJSONFile('videos.json', videos);
  if (success) {
    res.status(201).json(newVideo);
  } else {
    res.status(500).json({ error: 'Failed to update videos database.' });
  }
});

// 15. PUT /api/videos/:id - Update video details (secured)
app.put('/api/videos/:id', requireAdminAuth, async (req, res) => {
  const { title, duration, description, thumbnail, url } = req.body;

  if (db.isOnline()) {
    const updates = {};
    if (title) updates.title = title;
    if (duration) updates.duration = duration;
    if (description) updates.description = description;
    if (thumbnail) updates.thumbnail = thumbnail;
    if (url) updates.url = url;

    const { data, error } = await db.getSupabase()
      .from('videos').update(updates).eq('id', req.params.id).select().single();
    if (!error) return res.json(data);
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Video not found.' });
    console.error('Supabase video update error:', error.message);
  }

  const videos = await readJSONFile('videos.json');
  const index = videos.findIndex(v => v.id === req.params.id);

  if (index !== -1) {
    videos[index] = {
      ...videos[index],
      title: title || videos[index].title,
      duration: duration || videos[index].duration,
      description: description || videos[index].description,
      thumbnail: thumbnail || videos[index].thumbnail,
      url: url || videos[index].url
    };

    const success = await writeJSONFile('videos.json', videos);
    if (success) {
      res.json(videos[index]);
    } else {
      res.status(500).json({ error: 'Failed to update videos database.' });
    }
  } else {
    res.status(404).json({ error: 'Video not found.' });
  }
});

// 16. DELETE /api/videos/:id - Delete video clip (secured)
app.delete('/api/videos/:id', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('videos').delete().eq('id', req.params.id).select();
    if (!error) {
      if (data.length === 0) return res.status(404).json({ error: 'Video not found.' });
      return res.json({ message: 'Video deleted successfully' });
    }
    console.error('Supabase video delete error:', error.message);
  }

  const videos = await readJSONFile('videos.json');
  const filtered = videos.filter(v => v.id !== req.params.id);

  if (videos.length === filtered.length) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const success = await writeJSONFile('videos.json', filtered);
  if (success) {
    res.json({ message: 'Video deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete video.' });
  }
});

// ============================================
// PHOTOS GALLERY CRUD
// ============================================

// 17. GET /api/photos - Retrieve all photo gallery items
app.get('/api/photos', async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase().from('photos').select('*');
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('Supabase photos empty or error:', error ? error.message : 'No rows returned');
    } catch (err) {
      console.error('Supabase photos fetch exception:', err.message);
    }
  }
  const photos = await readJSONFile('photos.json');
  res.json(photos);
});

// 18. POST /api/photos - Add new photo item (secured)
app.post('/api/photos', requireAdminAuth, async (req, res) => {
  const { url, caption, category } = req.body;
  if (!url || !caption || !category) {
    return res.status(400).json({ error: 'Image file path, caption, and category details are required.' });
  }

  const newPhoto = {
    id: `pic-${Date.now()}`,
    url,
    caption,
    category
  };

  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('photos').insert(newPhoto).select().single();
    if (!error) return res.status(201).json(data);
    console.error('Supabase photo insert error:', error.message);
  }

  const photos = await readJSONFile('photos.json');
  photos.push(newPhoto);
  const success = await writeJSONFile('photos.json', photos);
  if (success) {
    res.status(201).json(newPhoto);
  } else {
    res.status(500).json({ error: 'Failed to update photos database.' });
  }
});

// 19. PUT /api/photos/:id - Update photo item details (secured)
app.put('/api/photos/:id', requireAdminAuth, async (req, res) => {
  const { url, caption, category } = req.body;

  if (db.isOnline()) {
    const updates = {};
    if (url) updates.url = url;
    if (caption) updates.caption = caption;
    if (category) updates.category = category;

    const { data, error } = await db.getSupabase()
      .from('photos').update(updates).eq('id', req.params.id).select().single();
    if (!error) return res.json(data);
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Photo not found.' });
    console.error('Supabase photo update error:', error.message);
  }

  const photos = await readJSONFile('photos.json');
  const index = photos.findIndex(p => p.id === req.params.id);

  if (index !== -1) {
    photos[index] = {
      ...photos[index],
      url: url || photos[index].url,
      caption: caption || photos[index].caption,
      category: category || photos[index].category
    };

    const success = await writeJSONFile('photos.json', photos);
    if (success) {
      res.json(photos[index]);
    } else {
      res.status(500).json({ error: 'Failed to update photos database.' });
    }
  } else {
    res.status(404).json({ error: 'Photo not found.' });
  }
});

// 20. DELETE /api/photos/:id - Delete photo item (secured)
app.delete('/api/photos/:id', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('photos').delete().eq('id', req.params.id).select();
    if (!error) {
      if (data.length === 0) return res.status(404).json({ error: 'Photo not found.' });
      return res.json({ message: 'Photo deleted successfully' });
    }
    console.error('Supabase photo delete error:', error.message);
  }

  const photos = await readJSONFile('photos.json');
  const filtered = photos.filter(p => p.id !== req.params.id);

  if (photos.length === filtered.length) {
    return res.status(404).json({ error: 'Photo not found.' });
  }

  const success = await writeJSONFile('photos.json', filtered);
  if (success) {
    res.json({ message: 'Photo deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete photo.' });
  }
});

// ============================================
// ADMIN-ONLY ENDPOINTS
// ============================================

// 21. GET /api/inquiries - Retrieve all inquiries (Admin Panel)
app.get('/api/inquiries', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    try {
      const { data, error } = await db.getSupabase()
        .from('inquiries').select('*').order('date', { ascending: false });
      if (!error && data) return res.json(data);
      console.warn('Supabase inquiries empty or error:', error ? error.message : 'No rows returned');
    } catch (err) {
      console.error('Supabase inquiries fetch exception:', err.message);
    }
  }
  const inquiries = await readJSONFile('inquiries.json');
  res.json(inquiries);
});

// 22. PUT /api/inquiries/:id/status - Update status of inquiry (Admin Panel)
app.put('/api/inquiries/:id/status', requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('inquiries').update({ status }).eq('id', req.params.id).select().single();
    if (!error) return res.json(data);
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Inquiry not found' });
    console.error('Supabase inquiry status update error:', error.message);
  }

  const inquiries = await readJSONFile('inquiries.json');
  const index = inquiries.findIndex(inq => inq.id === req.params.id);

  if (index !== -1) {
    inquiries[index].status = status;
    const success = await writeJSONFile('inquiries.json', inquiries);
    if (success) {
      return res.json(inquiries[index]);
    } else {
      return res.status(500).json({ error: 'Failed to update inquiry' });
    }
  } else {
    res.status(404).json({ error: 'Inquiry not found' });
  }
});

// 23. DELETE /api/inquiries/:id - Delete inquiry (Admin Panel)
app.delete('/api/inquiries/:id', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('inquiries').delete().eq('id', req.params.id).select();
    if (!error) {
      if (data.length === 0) return res.status(404).json({ error: 'Inquiry not found' });
      return res.json({ message: 'Inquiry deleted successfully' });
    }
    console.error('Supabase inquiry delete error:', error.message);
  }

  const inquiries = await readJSONFile('inquiries.json');
  const filtered = inquiries.filter(inq => inq.id !== req.params.id);

  if (inquiries.length === filtered.length) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }

  const success = await writeJSONFile('inquiries.json', filtered);
  if (success) {
    res.json({ message: 'Inquiry deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

// 24. DELETE /api/reviews/:id - Delete review (Admin Panel)
app.delete('/api/reviews/:id', requireAdminAuth, async (req, res) => {
  if (db.isOnline()) {
    const { data, error } = await db.getSupabase()
      .from('reviews').delete().eq('id', req.params.id).select();
    if (!error) {
      if (data.length === 0) return res.status(404).json({ error: 'Review not found' });
      return res.json({ message: 'Review deleted successfully' });
    }
    console.error('Supabase review delete error:', error.message);
  }

  const reviews = await readJSONFile('reviews.json');
  const filtered = reviews.filter(rev => rev.id !== req.params.id);

  if (reviews.length === filtered.length) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const success = await writeJSONFile('reviews.json', filtered);
  if (success) {
    res.json({ message: 'Review deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ============================================
// FRONTEND ROUTING FALLBACK & SERVER START
// ============================================

// Serve uploads from local disk or /tmp in serverless
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid file name.' });
  }
  const filePath = path.join(uploadDir, filename);
  try {
    if (fsSync.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found.' });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Error serving file.' });
  }
});

// Serve frontend routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server only when running locally (not as a serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` New Parihar Engineering Works server running!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Admin Portal: http://localhost:${PORT}/admin.html`);
    console.log(`===================================================`);
  });
}

// Export for Netlify serverless function
module.exports = app;
