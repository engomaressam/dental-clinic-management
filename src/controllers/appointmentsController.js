const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const localDb = require('../db/localDb');

exports.listAppointments = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        // Get success message from query parameter
        const success = req.query.success;
        
        if (!isDbReady) {
            // Use local JSON storage
            const { date, doctorId, status, patientId } = req.query;
            let appointments = await localDb.listAppointments({ date, doctorId, status, patientId });
            const patients = await localDb.readCollection('patients');
            const doctors = await localDb.readCollection('doctors');
            
            // For local storage, manually populate patient and doctor names
            appointments = appointments.map(apt => {
                const patient = patients.find(p => p._id === apt.patient);
                const doctor = doctors.find(d => d._id === apt.doctor);
                return {
                    ...apt,
                    patientName: patient ? patient.name : apt.patient,
                    doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : apt.doctor
                };
            });
            
            return res.render('appointments/index.ejs', {
                title: 'Appointments',
                appointments,
                patients,
                doctors,
                query: { date: date || '', doctorId: doctorId || '', status: status || '', patientId: patientId || '' },
                success: success
            });
        }
        
        // Use MongoDB
        const { date, doctorId, status, patientId } = req.query;
        const filter = {};
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            filter.date = { $gte: startDate, $lte: endDate };
        }
        
        if (doctorId) filter.doctor = doctorId;
        if (status) filter.status = status;
        if (patientId) filter.patient = patientId;
        
        const appointments = await Appointment.find(filter)
            .populate('patient', 'name phone')
            .populate('doctor', 'firstName lastName specialization')
            .sort({ date: 1, time: 1 })
            .limit(200);
            
        const patients = await Patient.find().sort({ name: 1 });
        const doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
        
        res.render('appointments/index.ejs', {
            title: 'Appointments',
            appointments,
            patients,
            doctors,
            query: { date: date || '', doctorId: doctorId || '', status: status || '', patientId: patientId || '' },
            success: success
        });
    } catch (error) {
        res.status(500).render('layout', {
            title: 'Error',
            content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
        });
    }
};

exports.getNewAppointment = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            const patients = await localDb.readCollection('patients');
            const doctors = await localDb.readCollection('doctors');
            
            // Ensure we always have arrays, even if empty
            return res.render('appointments/new.ejs', { 
                title: 'New Appointment', 
                patients: patients || [], 
                doctors: doctors || [] 
            });
        }
        
        // Use MongoDB
        const patients = await Patient.find().sort({ name: 1 });
        const doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
        
        // Ensure we always have arrays, even if empty
        res.render('appointments/new.ejs', { 
            title: 'New Appointment', 
            patients: patients || [], 
            doctors: doctors || [] 
        });
    } catch (error) {
        res.status(500).render('layout', {
            title: 'Error',
            content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
        });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const { patientId, doctorId, date, time, duration, reason, notes, priority } = req.body;
        
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            const patients = await localDb.readCollection('patients');
            const doctors = await localDb.readCollection('doctors');
            
            // Validate that patient and doctor exist
            const patient = patients.find(p => p._id === patientId);
            const doctor = doctors.find(d => d._id === doctorId);
            
            if (!patient || !doctor) {
                return res.status(400).render('appointments/new.ejs', {
                    title: 'New Appointment',
                    error: 'Invalid patient or doctor ID',
                    patients: patients,
                    doctors: doctors
                });
            }

            await localDb.createAppointment({
                patient: patientId,
                doctor: doctorId,
                date: new Date(date),
                time,
                duration: Number(duration),
                reason,
                notes,
                priority,
                status: 'scheduled'
            });

            return res.redirect('/appointments?success=Appointment scheduled successfully');
        }
        
        // Use MongoDB
        const patient = await Patient.findById(patientId);  // Ensure valid patient
        const doctor = await Doctor.findById(doctorId);    // Ensure valid doctor
        
        if (!patient || !doctor) {
            // Get fresh data for the form
            const patients = await Patient.find().sort({ name: 1 });
            const doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
            
            return res.status(400).render('appointments/new.ejs', {
                title: 'New Appointment',
                error: 'Invalid patient or doctor ID',
                patients: patients,
                doctors: doctors
            });
        }

        await Appointment.create({
            patient: patient._id,  // Store the patient ObjectId
            doctor: doctor._id,    // Store the doctor ObjectId
            date: new Date(date),
            time,
            duration: Number(duration),
            reason,
            notes,
            priority,
            status: 'scheduled'
        });

        // Redirect with success message
        res.redirect('/appointments?success=Appointment scheduled successfully');
    } catch (error) {
        // Get fresh data for the form in case of error
        try {
            const mongoose = require('mongoose');
            const isDbReady = mongoose.connection.readyState === 1;
            
            let patients = [];
            let doctors = [];
            
            if (!isDbReady) {
                patients = await localDb.readCollection('patients');
                doctors = await localDb.readCollection('doctors');
            } else {
                patients = await Patient.find().sort({ name: 1 });
                doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
            }
            
            res.status(400).render('appointments/new.ejs', {
                title: 'New Appointment',
                error: error.message,
                patients: patients,
                doctors: doctors
            });
        } catch (renderError) {
            res.status(500).render('layout', {
                title: 'Error',
                content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
            });
        }
    }
};


exports.getEditAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            const appointment = await localDb.getAppointmentById(id);
            if (!appointment) {
                return res.status(404).render('layout', {
                    title: 'Not Found',
                    content: '<div class="container py-5"><h1 class="display-6">Appointment not found</h1></div>',
                });
            }
            const patients = await localDb.readCollection('patients');
            const doctors = await localDb.readCollection('doctors');
            return res.render('appointments/edit.ejs', { 
                title: 'Edit Appointment', 
                appointment, 
                patients: patients || [], 
                doctors: doctors || [] 
            });
        }
        
        // Use MongoDB
        const appointment = await Appointment.findById(id)
            .populate('patient', 'name phone')
            .populate('doctor', 'firstName lastName specialization');
            
        if (!appointment) {
            return res.status(404).render('layout', {
                title: 'Not Found',
                content: '<div class="container py-5"><h1 class="display-6">Appointment not found</h1></div>',
            });
        }
        
        const patients = await Patient.find().sort({ name: 1 });
        const doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
        
        res.render('appointments/edit.ejs', { 
            title: 'Edit Appointment', 
            appointment, 
            patients: patients || [], 
            doctors: doctors || [] 
        });
    } catch (error) {
        res.status(500).render('layout', {
            title: 'Error',
            content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
        });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { patientId, doctorId, date, time, duration, reason, notes, priority, status } = req.body;
        
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            const patients = await localDb.readCollection('patients');
            const doctors = await localDb.readCollection('doctors');
            
            // Validate that patient and doctor exist
            const patient = patients.find(p => p._id === patientId);
            const doctor = doctors.find(d => d._id === doctorId);
            
            if (!patient || !doctor) {
                return res.status(400).render('appointments/edit.ejs', {
                    title: 'Edit Appointment',
                    appointment: { _id: id, ...req.body },
                    error: 'Invalid patient or doctor ID',
                    patients: patients || [],
                    doctors: doctors || []
                });
            }

            await localDb.updateAppointment(id, {
                patient: patientId,
                doctor: doctorId,
                date: new Date(date),
                time,
                duration: Number(duration),
                reason,
                notes,
                priority,
                status
            });

            return res.redirect('/appointments?success=Appointment updated successfully');
        }
        
        // Use MongoDB
        const patient = await Patient.findById(patientId);
        const doctor = await Doctor.findById(doctorId);

        if (!patient || !doctor) {
            // Get fresh data for the form
            const patients = await Patient.find().sort({ name: 1 });
            const doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
            
            return res.status(400).render('appointments/edit.ejs', {
                title: 'Edit Appointment',
                appointment: { _id: id, ...req.body },
                error: 'Invalid patient or doctor ID',
                patients: patients,
                doctors: doctors
            });
        }

        await Appointment.findByIdAndUpdate(id, {
            patient: patient._id,
            doctor: doctor._id,
            date: new Date(date),
            time,
            duration: Number(duration),
            reason,
            notes,
            priority,
            status
        });

        // Redirect with success message
        res.redirect('/appointments?success=Appointment updated successfully');
    } catch (error) {
        // Get fresh data for the form in case of error
        try {
            const mongoose = require('mongoose');
            const isDbReady = mongoose.connection.readyState === 1;
            
            let patients = [];
            let doctors = [];
            
            if (!isDbReady) {
                patients = await localDb.readCollection('patients');
                doctors = await localDb.readCollection('doctors');
            } else {
                patients = await Patient.find().sort({ name: 1 });
                doctors = await Doctor.find({ status: 'active' }).sort({ firstName: 1, lastName: 1 });
            }
            
            res.status(400).render('appointments/edit.ejs', {
                title: 'Edit Appointment',
                appointment: { _id: req.params.id, ...req.body },
                error: error.message,
                patients: patients,
                doctors: doctors
            });
        } catch (renderError) {
            res.status(500).render('layout', {
                title: 'Error',
                content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
            });
        }
    }
};


exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            await localDb.deleteAppointment(id);
            return res.redirect('/appointments?success=Appointment deleted successfully');
        }
        
        // Use MongoDB
        await Appointment.findByIdAndDelete(id);
        res.redirect('/appointments?success=Appointment deleted successfully');
    } catch (error) {
        res.status(500).render('layout', {
            title: 'Error',
            content: `<div class="container py-5"><h1 class="display-6">Failed to delete appointment</h1><p>${error.message}</p></div>`,
        });
    }
};

exports.getDoctorSchedule = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        const mongoose = require('mongoose');
        const isDbReady = mongoose.connection.readyState === 1;
        
        if (!isDbReady) {
            // Use local JSON storage
            const appointments = await localDb.getDoctorSchedule(doctorId, date);
            const doctor = await localDb.getDoctorById(doctorId);
            return res.render('appointments/schedule.ejs', { title: 'Doctor Schedule', appointments, doctor, date });
        }
        
        // Use MongoDB
        const filter = { doctor: doctorId };
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            filter.date = { $gte: startDate, $lte: endDate };
        }
        
        const appointments = await Appointment.find(filter)
            .populate('patient', 'name phone')
            .sort({ date: 1, time: 1 });
            
        const doctor = await Doctor.findById(doctorId);
        
        res.render('appointments/schedule.ejs', { title: 'Doctor Schedule', appointments, doctor, date });
    } catch (error) {
        res.status(500).render('layout', {
            title: 'Error',
            content: `<div class="container py-5"><h1 class="display-6">Unexpected error</h1><p>${error.message}</p></div>`,
        });
    }
};