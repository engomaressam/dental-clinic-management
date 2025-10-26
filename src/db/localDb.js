const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');

async function ensureDataDir() {
	await fs.mkdir(dataDir, { recursive: true });
}

function collectionPath(name) {
	return path.join(dataDir, `${name}.json`);
}

async function readCollection(name) {
	await ensureDataDir();
	const file = collectionPath(name);
	try {
		const buf = await fs.readFile(file, 'utf-8');
		return JSON.parse(buf || '[]');
	} catch (err) {
		if (err.code === 'ENOENT') return [];
		throw err;
	}
}

async function writeCollection(name, value) {
	await ensureDataDir();
	const file = collectionPath(name);
	await fs.writeFile(file, JSON.stringify(value, null, 2));
}

function generateId() {
	const rand = Math.random().toString(36).slice(2, 10);
	return `${Date.now().toString(36)}_${rand}`;
}

// Patients
async function listPatients(options = {}) {
	const { q = '', hasAppointment = false, sort = 'name', order = 'asc' } = options;
	let patients = await readCollection('patients');
	const qNorm = q.trim();
	if (qNorm) {
		const regex = new RegExp(qNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		patients = patients.filter((p) => regex.test(p.name || ''));
	}
	let appointments = [];
	if (hasAppointment || sort === 'appointment') {
		appointments = await readCollection('appointments');
	}
	if (hasAppointment) {
		const hasApptSet = new Set(appointments.map((a) => String(a.patient)));
		patients = patients.filter((p) => hasApptSet.has(String(p._id)));
	}
	const direction = order === 'desc' ? -1 : 1;
	if (sort === 'appointment') {
		const byPatient = new Map();
		for (const appt of appointments) {
			const key = String(appt.patient);
			const cur = byPatient.get(key);
			if (!cur || new Date(appt.date) < new Date(cur)) {
				byPatient.set(key, appt.date);
			}
		}
		patients.sort((a, b) => {
			const da = byPatient.get(String(a._id));
			const db = byPatient.get(String(b._id));
			const va = da ? new Date(da).getTime() : Number.POSITIVE_INFINITY;
			const vb = db ? new Date(db).getTime() : Number.POSITIVE_INFINITY;
			return direction * (va - vb);
		});
	} else if (sort === 'createdAt') {
		patients.sort((a, b) => direction * (new Date(a.createdAt) - new Date(b.createdAt)));
	} else {
		patients.sort((a, b) => direction * String(a.name || '').localeCompare(String(b.name || '')));
	}
	return patients.slice(0, 200);
}

async function createPatient(data) {
	const patients = await readCollection('patients');
	const now = new Date().toISOString();
	const patient = {
		_id: generateId(),
		name: data.name,
		age: data.age ? Number(data.age) : undefined,
		gender: data.gender || 'other',
		phone: data.phone,
		location: data.location,
		createdAt: now,
		updatedAt: now,
	};
	patients.push(patient);
	await writeCollection('patients', patients);
	return patient;
}

async function getPatientById(id) {
	const patients = await readCollection('patients');
	return patients.find(p => p._id === id);
}

async function updatePatient(id, data) {
	const patients = await readCollection('patients');
	const index = patients.findIndex(p => p._id === id);
	if (index === -1) {
		throw new Error('Patient not found');
	}
	
	patients[index] = {
		...patients[index],
		...data,
		age: data.age ? Number(data.age) : undefined,
		updatedAt: new Date().toISOString(),
	};
	
	await writeCollection('patients', patients);
	return patients[index];
}

async function deletePatient(id) {
	const patients = await readCollection('patients');
	const filtered = patients.filter(p => p._id !== id);
	if (filtered.length === patients.length) {
		throw new Error('Patient not found');
	}
	await writeCollection('patients', filtered);
	
	// Also delete related appointments
	const appointments = await readCollection('appointments');
	const filteredAppts = appointments.filter(a => a.patient !== id);
	await writeCollection('appointments', filteredAppts);
}

// Appointments
async function createAppointment(data) {
	const appointments = await readCollection('appointments');
	const appt = {
		_id: generateId(),
		patient: String(data.patient),
		date: new Date(data.date).toISOString(),
		reason: data.reason || '',
		status: 'scheduled',
		createdAt: new Date().toISOString(),
	};
	appointments.push(appt);
	await writeCollection('appointments', appointments);
	return appt;
}

async function countTodayAppointments() {
	const list = await readCollection('appointments');
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const end = new Date();
	end.setHours(23, 59, 59, 999);
	return list.filter((a) => {
		const d = new Date(a.date);
		return d >= start && d <= end;
	}).length;
}

async function countPatients() {
	const patients = await readCollection('patients');
	return patients.length;
}

async function countLowStock() {
	const items = await readCollection('inventory');
	return items.filter((i) => Number(i.quantity || 0) <= 5).length;
}

// Doctors
async function listDoctors(options = {}) {
	const { q = '', specialization = '', status = '' } = options;
	let doctors = await readCollection('doctors');
	
	if (q) {
		const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		doctors = doctors.filter((d) => 
			regex.test(d.firstName || '') || 
			regex.test(d.lastName || '') || 
			regex.test(d.specialization || '')
		);
	}
	
	if (specialization) {
		const regex = new RegExp(specialization.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		doctors = doctors.filter((d) => regex.test(d.specialization || ''));
	}
	
	if (status) {
		doctors = doctors.filter((d) => d.status === status);
	}
	
	return doctors.sort((a, b) => String(a.firstName || '').localeCompare(String(b.firstName || '')));
}

async function createDoctor(data) {
	const doctors = await readCollection('doctors');
	const now = new Date().toISOString();
	const doctor = {
		_id: generateId(),
		username: data.username,
		password: data.password,
		firstName: data.firstName,
		lastName: data.lastName,
		email: data.email,
		phone: data.phone,
		specialization: data.specialization,
		licenseNumber: data.licenseNumber,
		experience: data.experience || 0,
		status: data.status || 'active',
		role: data.role || 'doctor',
		createdAt: now,
		updatedAt: now,
	};
	doctors.push(doctor);
	await writeCollection('doctors', doctors);
	return doctor;
}

async function getDoctorById(id) {
	const doctors = await readCollection('doctors');
	return doctors.find(d => d._id === id);
}

async function updateDoctor(id, data) {
	const doctors = await readCollection('doctors');
	const index = doctors.findIndex(d => d._id === id);
	if (index === -1) {
		throw new Error('Doctor not found');
	}
	
	doctors[index] = {
		...doctors[index],
		...data,
		experience: data.experience ? Number(data.experience) : doctors[index].experience,
		updatedAt: new Date().toISOString(),
	};
	
	await writeCollection('doctors', doctors);
	return doctors[index];
}

async function deleteDoctor(id) {
	const doctors = await readCollection('doctors');
	const filtered = doctors.filter(d => d._id !== id);
	if (filtered.length === doctors.length) {
		throw new Error('Doctor not found');
	}
	await writeCollection('doctors', filtered);
	
	// Also delete related appointments
	const appointments = await readCollection('appointments');
	const filteredAppts = appointments.filter(a => a.doctor !== id);
	await writeCollection('appointments', filteredAppts);
}

// Enhanced Appointments
async function listAppointments(options = {}) {
	const { date, doctorId, status, patientId } = options;
	let appointments = await readCollection('appointments');
	
	if (date) {
		const targetDate = new Date(date);
		targetDate.setHours(0, 0, 0, 0);
		const nextDate = new Date(targetDate);
		nextDate.setDate(nextDate.getDate() + 1);
		
		appointments = appointments.filter((a) => {
			const apptDate = new Date(a.date);
			return apptDate >= targetDate && apptDate < nextDate;
		});
	}
	
	if (doctorId) {
		appointments = appointments.filter((a) => a.doctor === doctorId);
	}
	
	if (status) {
		appointments = appointments.filter((a) => a.status === status);
	}
	
	if (patientId) {
		appointments = appointments.filter((a) => a.patient === patientId);
	}
	
	return appointments.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		if (dateA.getTime() !== dateB.getTime()) {
			return dateA.getTime() - dateB.getTime();
		}
		return (a.time || '').localeCompare(b.time || '');
	});
}

async function createAppointment(data) {
	const appointments = await readCollection('appointments');
	const appt = {
		_id: generateId(),
		patient: String(data.patient),
		doctor: String(data.doctor),
		date: new Date(data.date).toISOString(),
		time: data.time,
		duration: data.duration || 30,
		reason: data.reason || '',
		notes: data.notes || '',
		status: data.status || 'scheduled',
		priority: data.priority || 'medium',
		assignedTo: 'doctor',
		createdAt: new Date().toISOString(),
	};
	appointments.push(appt);
	await writeCollection('appointments', appointments);
	return appt;
}

async function getAppointmentById(id) {
	const appointments = await readCollection('appointments');
	return appointments.find(a => a._id === id);
}

async function updateAppointment(id, data) {
	const appointments = await readCollection('appointments');
	const index = appointments.findIndex(a => a._id === id);
	if (index === -1) {
		throw new Error('Appointment not found');
	}
	
	appointments[index] = {
		...appointments[index],
		...data,
		date: data.date ? new Date(data.date).toISOString() : appointments[index].date,
		duration: data.duration ? Number(data.duration) : appointments[index].duration,
		updatedAt: new Date().toISOString(),
	};
	
	await writeCollection('appointments', appointments);
	return appointments[index];
}

async function deleteAppointment(id) {
	const appointments = await readCollection('appointments');
	const filtered = appointments.filter(a => a._id !== id);
	if (filtered.length === appointments.length) {
		throw new Error('Appointment not found');
	}
	await writeCollection('appointments', filtered);
}

async function getDoctorSchedule(doctorId, date) {
	const appointments = await readCollection('appointments');
	let filtered = appointments.filter(a => a.doctor === doctorId);
	
	if (date) {
		const targetDate = new Date(date);
		targetDate.setHours(0, 0, 0, 0);
		const nextDate = new Date(targetDate);
		nextDate.setDate(nextDate.getDate() + 1);
		
		filtered = filtered.filter((a) => {
			const apptDate = new Date(a.date);
			return apptDate >= targetDate && apptDate < nextDate;
		});
	}
	
	return filtered.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		if (dateA.getTime() !== dateB.getTime()) {
			return dateA.getTime() - dateB.getTime();
		}
		return (a.time || '').localeCompare(b.time || '');
	});
}

async function getDoctorStats(doctorId) {
	const appointments = await readCollection('appointments');
	const doctorAppts = appointments.filter(a => a.doctor === doctorId);
	
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	
	const todayAppts = doctorAppts.filter(a => {
		const apptDate = new Date(a.date);
		return apptDate >= today && apptDate < tomorrow;
	});
	
	const pendingAppts = doctorAppts.filter(a => 
		['scheduled', 'confirmed'].includes(a.status)
	);
	
	return {
		totalAppointments: doctorAppts.length,
		todayAppointments: todayAppts.length,
		pendingAppointments: pendingAppts.length
	};
}

exports.deleteAppointmentsByDoctor = async (doctorId) => {
    try {
        const appointments = await this.readCollection('appointments');
        const filteredAppointments = appointments.filter(apt => apt.doctor !== doctorId);
        await this.writeCollection('appointments', filteredAppointments);
        return true;
    } catch (error) {
        console.error('Error deleting appointments by doctor:', error);
        throw error;
    }
};

exports.deleteAppointmentsByPatient = async (patientId) => {
    try {
        const appointments = await this.readCollection('appointments');
        const filteredAppointments = appointments.filter(apt => apt.patient !== patientId);
        await this.writeCollection('appointments', filteredAppointments);
        return true;
    } catch (error) {
        console.error('Error deleting appointments by patient:', error);
        throw error;
    }
};

// Inventory functions
async function createInventoryItem(itemData) {
    try {
        const inventory = await readCollection('inventory') || [];
        const newItem = {
            _id: generateId(),
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        inventory.push(newItem);
        await writeCollection('inventory', inventory);
        return newItem;
    } catch (error) {
        throw new Error(`Failed to create inventory item: ${error.message}`);
    }
}

async function getInventoryItemById(id) {
    try {
        const inventory = await readCollection('inventory') || [];
        return inventory.find(item => item._id === id);
    } catch (error) {
        throw new Error(`Failed to get inventory item: ${error.message}`);
    }
}

async function updateInventoryItem(id, updateData) {
    try {
        const inventory = await readCollection('inventory') || [];
        const index = inventory.findIndex(item => item._id === id);
        if (index === -1) {
            throw new Error('Inventory item not found');
        }
        
        inventory[index] = {
            ...inventory[index],
            ...updateData,
            updatedAt: new Date()
        };
        
        await writeCollection('inventory', inventory);
        return inventory[index];
    } catch (error) {
        throw new Error(`Failed to update inventory item: ${error.message}`);
    }
}

async function deleteInventoryItem(id) {
    try {
        const inventory = await readCollection('inventory') || [];
        const filteredInventory = inventory.filter(item => item._id !== id);
        await writeCollection('inventory', filteredInventory);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
}

// Usage tracking functions
async function addUsageRecord(itemId, usageData) {
    try {
        const usage = await readCollection('usage') || [];
        const newRecord = {
            _id: generateId(),
            ...usageData,
            createdAt: new Date()
        };
        usage.push(newRecord);
        await writeCollection('usage', usage);
        return newRecord;
    } catch (error) {
        throw new Error(`Failed to add usage record: ${error.message}`);
    }
}

async function getItemUsageHistory(itemId) {
    try {
        const usage = await readCollection('usage') || [];
        return usage.filter(record => record.itemId === itemId).sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        throw new Error(`Failed to get usage history: ${error.message}`);
    }
}

async function getAllUsageHistory() {
    try {
        const usage = await readCollection('usage') || [];
        return usage.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        throw new Error(`Failed to get all usage history: ${error.message}`);
    }
}

module.exports = {
	readCollection,
	writeCollection,
	listPatients,
	createPatient,
	getPatientById,
	updatePatient,
	deletePatient,
	listDoctors,
	createDoctor,
	getDoctorById,
	updateDoctor,
	deleteDoctor,
	listAppointments,
	createAppointment,
	getAppointmentById,
	updateAppointment,
	deleteAppointment,
	getDoctorSchedule,
	getDoctorStats,
	countTodayAppointments,
	countPatients,
	countLowStock,
	createInventoryItem,
	getInventoryItemById,
	updateInventoryItem,
	deleteInventoryItem,
	addUsageRecord,
	getItemUsageHistory,
	getAllUsageHistory
};