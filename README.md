# Dental Clinic Management System

A comprehensive web-based dental clinic management system built with Node.js, Express, and EJS. The system supports both MongoDB and local JSON file storage, making it flexible for different deployment scenarios.

## Features

### 📋 Patient Management
- Add, edit, and delete patient records
- Search patients by name, phone, or email
- View patient appointment history
- Manage patient appointments directly from patient profiles

### 👨‍⚕️ Doctor Management
- Manage doctor profiles with specializations
- View doctor-specific dashboards with statistics
- Track doctor schedules and appointments
- Delete doctors with automatic appointment cleanup

### 📅 Appointment Management
- Schedule, reschedule, and cancel appointments
- View appointments by date and doctor
- Track appointment status (pending, confirmed, completed, cancelled)
- Doctor schedule management with time slot availability

### 📦 Inventory Management
- Track medical supplies and equipment
- Monitor stock levels with low-stock alerts
- Add/subtract inventory quantities
- Usage tracking by doctor and item
- Comprehensive usage history reports

### 📊 Dashboard & Analytics
- Real-time dashboard with key metrics
- Today's appointments overview
- Patient and doctor statistics
- Low stock item alerts
- Recent activity summaries

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templating, Bootstrap 5
- **Database**: MongoDB (with Mongoose) or Local JSON files
- **Session Management**: Express Session
- **Date Handling**: Day.js
- **Development**: Nodemon for hot reloading

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (optional - can use local JSON storage)
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/engomaressam/dental-clinic-management.git
   cd dental-clinic-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   
   # MongoDB Configuration (optional)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dental_clinic
   
   # Use local JSON storage instead of MongoDB
   USE_LOCAL_DB=true
   ```

4. **Start the application**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
dental-clinic-management-system/
├── src/
│   ├── config.js                 # Application configuration
│   ├── server.js                 # Main server file
│   ├── controllers/              # Route controllers
│   │   ├── appointmentsController.js
│   │   ├── dashboardController.js
│   │   ├── doctorsController.js
│   │   ├── inventoryController.js
│   │   └── patientsController.js
│   ├── db/
│   │   └── localDb.js           # Local JSON database operations
│   ├── models/                  # MongoDB models
│   │   ├── Appointment.js
│   │   ├── Doctor.js
│   │   ├── InventoryItem.js
│   │   └── Patient.js
│   ├── public/                  # Static assets
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── routes/                  # Express routes
│   │   ├── index.js
│   │   ├── appointments.js
│   │   ├── doctors.js
│   │   ├── inventory.js
│   │   └── patients.js
│   └── views/                   # EJS templates
│       ├── layout.ejs
│       ├── dashboard.ejs
│       ├── appointments/
│       ├── doctors/
│       ├── inventory/
│       └── patients/
├── data/                        # JSON data files (when using local storage)
│   ├── appointments.json
│   ├── doctors.json
│   ├── inventory.json
│   ├── patients.json
│   └── usage.json
├── package.json
├── .env
└── README.md
```

## Database Options

### Option 1: Local JSON Storage (Default)
The system can operate entirely with local JSON files, making it easy to deploy without external database dependencies.

- Set `USE_LOCAL_DB=true` in your `.env` file
- Data is stored in the `data/` directory
- Automatic file creation and management
- Perfect for small clinics or development

### Option 2: MongoDB
For larger deployments or when you need advanced querying capabilities.

- Set up a MongoDB instance (local or cloud)
- Configure `MONGODB_URI` in your `.env` file
- Set `USE_LOCAL_DB=false` or remove the variable
- The system will automatically use MongoDB models

## API Endpoints

### Dashboard
- `GET /` - Main dashboard

### Patients
- `GET /patients` - List all patients
- `GET /patients/new` - New patient form
- `POST /patients` - Create new patient
- `GET /patients/:id` - View patient details
- `GET /patients/:id/edit` - Edit patient form
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient
- `GET /patients/search` - Search patients

### Doctors
- `GET /doctors` - List all doctors
- `GET /doctors/new` - New doctor form
- `POST /doctors` - Create new doctor
- `GET /doctors/:id` - View doctor details
- `GET /doctors/:id/edit` - Edit doctor form
- `PUT /doctors/:id` - Update doctor
- `DELETE /doctors/:id` - Delete doctor

### Appointments
- `GET /appointments` - List all appointments
- `GET /appointments/new` - New appointment form
- `POST /appointments` - Create new appointment
- `GET /appointments/:id` - View appointment details
- `GET /appointments/:id/edit` - Edit appointment form
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Delete appointment

### Inventory
- `GET /inventory` - List all inventory items
- `GET /inventory/new` - New item form
- `POST /inventory` - Create new item
- `GET /inventory/:id/edit` - Edit item form
- `PUT /inventory/:id` - Update item
- `DELETE /inventory/:id` - Delete item
- `POST /inventory/:id/quantity` - Update item quantity
- `GET /inventory/usage-history` - View usage history
- `GET /inventory/low-stock` - Get low stock items

## Features in Detail

### Dual Database Support
The system intelligently switches between MongoDB and local JSON storage based on configuration, ensuring flexibility in deployment scenarios.

### Smart Data Relationships
- Automatic patient-appointment linking
- Doctor-appointment associations
- Inventory usage tracking by doctor
- Cascading deletes for data integrity

### Responsive Design
- Mobile-friendly interface
- Bootstrap 5 for modern UI components
- Intuitive navigation and user experience

### Real-time Updates
- Live dashboard statistics
- Instant inventory level updates
- Dynamic appointment scheduling

## Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for automatic server restarts on file changes.

### Adding New Features
1. Create new routes in `src/routes/`
2. Add corresponding controllers in `src/controllers/`
3. Create EJS templates in `src/views/`
4. Update the database layer in `src/db/localDb.js` for JSON storage
5. Add MongoDB models in `src/models/` if using MongoDB

### Database Schema

#### Patients
```javascript
{
  _id: String,
  name: String,
  email: String,
  phone: String,
  address: String,
  dateOfBirth: Date,
  medicalHistory: String,
  createdAt: Date
}
```

#### Doctors
```javascript
{
  _id: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  specialization: String,
  schedule: Object,
  createdAt: Date
}
```

#### Appointments
```javascript
{
  _id: String,
  patientId: String,
  doctorId: String,
  dateTime: Date,
  duration: Number,
  reason: String,
  status: String,
  notes: String,
  createdAt: Date
}
```

#### Inventory Items
```javascript
{
  _id: String,
  name: String,
  sku: String,
  category: String,
  quantity: Number,
  minQuantity: Number,
  unit: String,
  cost: Number,
  supplier: String,
  lastRestocked: Date,
  createdAt: Date
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team.

## Roadmap

- [ ] User authentication and role-based access
- [ ] Email notifications for appointments
- [ ] SMS integration for appointment reminders
- [ ] Advanced reporting and analytics
- [ ] Multi-clinic support
- [ ] Integration with payment systems
- [ ] Mobile app development
- [ ] API documentation with Swagger

---

**Note**: This system is designed for educational and small clinic use. For production deployment in healthcare environments, ensure compliance with relevant healthcare data protection regulations (HIPAA, GDPR, etc.).