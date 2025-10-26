require('dotenv').config();

const config = {
	port: process.env.PORT || 3000,
	mongoUri:
		process.env.MONGODB_URI ||
		'mongodb+srv://nada:<db_password>@cluster0.yidqhkl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
};

module.exports = config;