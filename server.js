const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3005;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'parihar1990';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
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

// Static files directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for reading/writing files
const getDataFilePath = (fileName) => path.join(__dirname, 'data', fileName);

async function readJSONFile(fileName) {
  try {
    const data = await fs.readFile(getDataFilePath(fileName), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
}

async function writeJSONFile(fileName, data) {
  try {
    await fs.writeFile(getDataFilePath(fileName), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    return false;
  }
}

// Authentication Middleware
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

// REST API Endpoints

// 1. POST /api/auth/login - Staff Authentication
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_PASSWORD });
  }
  res.status(401).json({ error: 'Incorrect password.' });
});

// 2. POST /api/upload - Secure Image Upload Endpoint (secured)
app.post('/api/upload', requireAdminAuth, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }
    const filePaths = req.files.map(file => `/uploads/${file.filename}`);
    res.status(201).json({ urls: filePaths });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process file uploads.' });
  }
});

// 3. GET /api/products - Retrieve all products
app.get('/api/products', async (req, res) => {
  const products = await readJSONFile('products.json');
  res.json(products);
});

// 4. GET /api/products/:id - Retrieve specific product details
app.get('/api/products/:id', async (req, res) => {
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

  const products = await readJSONFile('products.json');
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

  const products = await readJSONFile('products.json');
  const index = products.findIndex(p => p.id === req.params.id);

  if (index !== -1) {
    const imageList = Array.isArray(images) ? images : (image ? [image] : null);
    const primaryImage = imageList && imageList.length > 0 ? imageList[0] : null;

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

// 8. GET /api/reviews - Retrieve all reviews
app.get('/api/reviews', async (req, res) => {
  const reviews = await readJSONFile('reviews.json');
  res.json(reviews);
});

// 9. POST /api/reviews - Submit a new review
app.post('/api/reviews', async (req, res) => {
  const { name, location, product, rating, comment } = req.body;

  if (!name || !rating || !comment) {
    return res.status(400).json({ error: 'Name, rating, and comment are required fields.' });
  }

  const reviews = await readJSONFile('reviews.json');
  const newReview = {
    id: `rev-${Date.now()}`,
    name,
    location: location || 'Anonymous',
    product: product || 'General Feedback',
    rating: parseInt(rating),
    comment,
    date: new Date().toISOString().split('T')[0]
  };

  reviews.unshift(newReview);
  const success = await writeJSONFile('reviews.json', reviews);

  if (success) {
    res.status(201).json(newReview);
  } else {
    res.status(500).json({ error: 'Failed to write to database' });
  }
});

// 10. POST /api/inquiries - Submit a new inquiry
app.post('/api/inquiries', async (req, res) => {
  const { name, email, phone, company, message, items } = req.body;

  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'Name, phone number, and inquiry message are required fields.' });
  }

  const inquiries = await readJSONFile('inquiries.json');
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

  inquiries.unshift(newInquiry);
  const success = await writeJSONFile('inquiries.json', inquiries);

  if (success) {
    res.status(201).json(newInquiry);
  } else {
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// 11. GET /api/about - Retrieve about content
app.get('/api/about', async (req, res) => {
  const about = await readJSONFile('about.json');
  res.json(about);
});

// 12. PUT /api/about - Update about details (secured)
app.put('/api/about', requireAdminAuth, async (req, res) => {
  const success = await writeJSONFile('about.json', req.body);
  if (success) {
    res.json(req.body);
  } else {
    res.status(500).json({ error: 'Failed to update about us database.' });
  }
});

// 12b. GET /api/contact - Retrieve contact details
app.get('/api/contact', async (req, res) => {
  const contact = await readJSONFile('contact.json');
  res.json(contact);
});

// 12c. PUT /api/contact - Update contact details (secured)
app.put('/api/contact', requireAdminAuth, async (req, res) => {
  const success = await writeJSONFile('contact.json', req.body);
  if (success) {
    res.json(req.body);
  } else {
    res.status(500).json({ error: 'Failed to update contact database.' });
  }
});

// 13. GET /api/videos - Retrieve all video clips
app.get('/api/videos', async (req, res) => {
  const videos = await readJSONFile('videos.json');
  res.json(videos);
});

// 14. POST /api/videos - Add new video clip (secured)
app.post('/api/videos', requireAdminAuth, async (req, res) => {
  const { title, duration, description, thumbnail, url } = req.body;
  if (!title || !duration || !description || !url) {
    return res.status(400).json({ error: 'Title, duration, description, and video URL are required fields.' });
  }

  const videos = await readJSONFile('videos.json');
  const newVideo = {
    id: `vid-${Date.now()}`,
    title,
    duration,
    description,
    thumbnail: thumbnail || '/images/cnc_router_3axis.png',
    url
  };

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

// 17. GET /api/photos - Retrieve all photo gallery items
app.get('/api/photos', async (req, res) => {
  const photos = await readJSONFile('photos.json');
  res.json(photos);
});

// 18. POST /api/photos - Add new photo item (secured)
app.post('/api/photos', requireAdminAuth, async (req, res) => {
  const { url, caption, category } = req.body;
  if (!url || !caption || !category) {
    return res.status(400).json({ error: 'Image file path, caption, and category details are required.' });
  }

  const photos = await readJSONFile('photos.json');
  const newPhoto = {
    id: `pic-${Date.now()}`,
    url,
    caption,
    category
  };

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

// Admin REST APIs (Secured)

// 21. GET /api/inquiries - Retrieve all inquiries (Admin Panel)
app.get('/api/inquiries', requireAdminAuth, async (req, res) => {
  const inquiries = await readJSONFile('inquiries.json');
  res.json(inquiries);
});

// 22. PUT /api/inquiries/:id/status - Update status of inquiry (Admin Panel)
app.put('/api/inquiries/:id/status', requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
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

// Serve frontend routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` New Parihar Engineering Works server running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`===================================================`);
});
