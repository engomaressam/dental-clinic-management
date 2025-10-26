const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const { port, mongoUri } = require('./config');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const session = require('express-session');

const app = express();

// View engine + layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Static assets
app.use('/static', express.static(path.join(__dirname, 'public')));

// Session middleware for flash messages
app.use(session({
    secret: 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

// Routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// 404 handler
app.use((req, res) => {
	res.status(404).render('layout', {
		title: 'Not Found',
		content: '<div class="container py-5"><h1 class="display-6">404 - Page Not Found</h1></div>',
	});
});

// Connect to MongoDB and start server
async function start() {
	try {
		const useLocal = process.env.USE_LOCAL_DB === 'true';
		if (!useLocal) {
			if (!mongoUri || mongoUri.includes('<db_password>')) {
				console.warn('MONGODB_URI not set or contains <db_password>. Set USE_LOCAL_DB=true to use local JSON storage.');
			} else {
				await mongoose.connect(mongoUri, { dbName: 'dentist_clinic' });
				console.log('Connected to MongoDB');
			}
		} else {
			console.log('Using local JSON database (USE_LOCAL_DB=true)');
		}
		app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
	} catch (err) {
		console.error('Failed to start server:', err.message);
		process.exit(1);
	}
}

start();