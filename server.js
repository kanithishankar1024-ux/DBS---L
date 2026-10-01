import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const defaultDepartments = [
  { department_id: 1, department_name: 'Cardiology' },
  { department_id: 2, department_name: 'Neurology' },
  { department_id: 3, department_name: 'Pediatrics' },
  { department_id: 4, department_name: 'Orthopedics' },
];

const defaultDoctors = [
  { doctor_id: 1, doctor_name: 'Dr. Rajesh Kumar', specialization: 'Cardiologist', department_id: 1, phone: '+91 98765 43210', availability: 'Mon, Wed, Fri', email: 'rajesh@hospital.com', password: 'doctor123' },
  { doctor_id: 2, doctor_name: 'Dr. Anitha Sharma', specialization: 'Neurologist', department_id: 2, phone: '+91 99887 66554', availability: 'Tue, Thu, Sat', email: 'anitha@hospital.com', password: 'doctor123' },
  { doctor_id: 3, doctor_name: 'Dr. Priya Reddy', specialization: 'Pediatrician', department_id: 3, phone: '+91 91234 56789', availability: 'Mon, Tue, Thu', email: 'priya@hospital.com', password: 'doctor123' },
  { doctor_id: 4, doctor_name: 'Dr. Arjun Rao', specialization: 'Orthopedic Specialist', department_id: 4, phone: '+91 93456 78901', availability: 'Wed, Fri, Sat', email: 'arjun@hospital.com', password: 'doctor123' },
];

const defaultPatients = [
  { patient_id: 1, patient_name: 'Srilaxmi', age: 28, gender: 'Female', phone: '+91 98765 11111', email: 'srilaxmi@example.com', password: 'patient123' },
  { patient_id: 2, patient_name: 'Rahul Kumar', age: 34, gender: 'Male', phone: '+91 98765 22222', email: 'rahul@example.com', password: 'patient123' },
  { patient_id: 3, patient_name: 'Sneha Reddy', age: 25, gender: 'Female', phone: '+91 98765 33333', email: 'sneha@example.com', password: 'patient123' },
  { patient_id: 4, patient_name: 'Arjun Sharma', age: 30, gender: 'Male', phone: '+91 98765 44444', email: 'arjun@example.com', password: 'patient123' },
];

const defaultAppointments = [
  { appointment_id: 1, patient_id: 1, doctor_id: 1, appointment_date: '2026-09-12', appointment_time: '10:00', status: 'Booked' },
  { appointment_id: 2, patient_id: 2, doctor_id: 2, appointment_date: '2026-09-13', appointment_time: '14:30', status: 'Completed' },
  { appointment_id: 3, patient_id: 3, doctor_id: 3, appointment_date: '2026-09-14', appointment_time: '11:00', status: 'Booked' },
  { appointment_id: 4, patient_id: 4, doctor_id: 4, appointment_date: '2026-09-15', appointment_time: '09:00', status: 'Cancelled' },
];

const inMemoryStore = {
  departments: [...defaultDepartments],
  doctors: [...defaultDoctors],
  patients: [...defaultPatients],
  appointments: [...defaultAppointments],
};

let mysqlPool = null;
let usingMySQL = false;

function sanitizeDoctorRecord(doctor) {
  const sanitizedDoctor = { ...doctor };
  delete sanitizedDoctor.password;
  return sanitizedDoctor;
}

async function ensureMySQLTables() {
  if (!mysqlPool || !usingMySQL) return;

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      department_id INT PRIMARY KEY AUTO_INCREMENT,
      department_name VARCHAR(100) NOT NULL
    )
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS doctors (
      doctor_id INT PRIMARY KEY AUTO_INCREMENT,
      doctor_name VARCHAR(100) NOT NULL,
      specialization VARCHAR(100) NOT NULL,
      department_id INT NOT NULL,
      phone VARCHAR(50),
      availability VARCHAR(120),
      FOREIGN KEY (department_id) REFERENCES departments(department_id)
    )
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      patient_id INT PRIMARY KEY AUTO_INCREMENT,
      patient_name VARCHAR(100) NOT NULL,
      age INT NOT NULL,
      gender VARCHAR(20) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id INT PRIMARY KEY AUTO_INCREMENT,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'Booked',
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
    )
  `);
}
async function seedMySQLIfEmpty() {
  if (!mysqlPool || !usingMySQL) return;

  const [depts] = await mysqlPool.query('SELECT COUNT(*) AS count FROM departments');
  if (Number(depts[0].count) === 0) {
    await mysqlPool.query(
      'INSERT INTO departments (department_id, department_name) VALUES (?, ?), (?, ?), (?, ?), (?, ?)',
      [1, 'Cardiology', 2, 'Neurology', 3, 'Pediatrics', 4, 'Orthopedics'],
    );

    await mysqlPool.query(
      'INSERT INTO doctors (doctor_id, doctor_name, specialization, department_id, phone, availability) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
      [1, 'Dr. Rajesh Kumar', 'Cardiologist', 1, '+91 98765 43210', 'Mon, Wed, Fri', 2, 'Dr. Anitha Sharma', 'Neurologist', 2, '+91 99887 66554', 'Tue, Thu, Sat', 3, 'Dr. Priya Reddy', 'Pediatrician', 3, '+91 91234 56789', 'Mon, Tue, Thu', 4, 'Dr. Arjun Rao', 'Orthopedic Specialist', 4, '+91 93456 78901', 'Wed, Fri, Sat'],
    );

    await mysqlPool.query(
      'INSERT INTO patients (patient_id, patient_name, age, gender, phone, email, password) VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
      [1, 'Srilaxmi', 28, 'Female', '+91 98765 11111', 'srilaxmi@example.com', 'patient123', 2, 'Rahul Kumar', 34, 'Male', '+91 98765 22222', 'rahul@example.com', 'patient123', 3, 'Sneha Reddy', 25, 'Female', '+91 98765 33333', 'sneha@example.com', 'patient123', 4, 'Arjun Sharma', 30, 'Male', '+91 98765 44444', 'arjun@example.com', 'patient123'],
    );

    await mysqlPool.query(
      'INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
      [1, 1, 1, '2026-09-12', '10:00:00', 'Booked', 2, 2, 2, '2026-09-13', '14:30:00', 'Completed', 3, 3, 3, '2026-09-14', '11:00:00', 'Booked', 4, 4, 4, '2026-09-15', '09:00:00', 'Cancelled'],
    );
  }
}

function getNextId(items, key) {
  return items.length ? Math.max(...items.map((item) => item[key])) + 1 : 1;
}

function isDoctorBooked(doctorId, date, time, excludeId = null) {
  return inMemoryStore.appointments.some((appointment) => {
    if (excludeId && appointment.appointment_id === excludeId) return false;
    return (
      Number(appointment.doctor_id) === Number(doctorId) &&
      appointment.appointment_date === date &&
      appointment.appointment_time === time &&
      appointment.status !== 'Cancelled'
    );
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dataSource: usingMySQL ? 'mysql' : 'memory' });
});

app.get('/api/departments', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query('SELECT * FROM departments ORDER BY department_id');
    return res.json(rows);
  }

  return res.json(inMemoryStore.departments);
});

app.post('/api/departments', async (req, res) => {
  const { department_name } = req.body;
  if (!department_name || !department_name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (usingMySQL && mysqlPool) {
    const [result] = await mysqlPool.query('INSERT INTO departments (department_name) VALUES (?)', [department_name.trim()]);
    const [rows] = await mysqlPool.query('SELECT * FROM departments WHERE department_id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  }

  const newDepartment = {
    department_id: getNextId(inMemoryStore.departments, 'department_id'),
    department_name: department_name.trim(),
  };

  inMemoryStore.departments.push(newDepartment);
  return res.status(201).json(newDepartment);
});

app.put('/api/departments/:id', async (req, res) => {
  const { department_name } = req.body;
  if (!department_name || !department_name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (usingMySQL && mysqlPool) {
    await mysqlPool.query('UPDATE departments SET department_name = ? WHERE department_id = ?', [department_name.trim(), req.params.id]);
    const [rows] = await mysqlPool.query('SELECT * FROM departments WHERE department_id = ?', [req.params.id]);
    return res.json(rows[0]);
  }

  const index = inMemoryStore.departments.findIndex((department) => department.department_id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  inMemoryStore.departments[index].department_name = department_name.trim();
  return res.json(inMemoryStore.departments[index]);
});

app.delete('/api/departments/:id', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM departments WHERE department_id = ?', [req.params.id]);
    return res.json({ message: 'Department deleted successfully.' });
  }

  const initialLength = inMemoryStore.departments.length;
  inMemoryStore.departments = inMemoryStore.departments.filter((department) => department.department_id !== Number(req.params.id));

  if (inMemoryStore.departments.length === initialLength) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  return res.json({ message: 'Department deleted successfully.' });
});

app.get('/api/doctors', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query(
      `SELECT d.*, dept.department_name
       FROM doctors d
       JOIN departments dept ON dept.department_id = d.department_id
       ORDER BY d.doctor_id`,
    );
    return res.json(rows);
  }

  return res.json(
    inMemoryStore.doctors.map((doctor) => ({
      ...sanitizeDoctorRecord(doctor),
      department_name: inMemoryStore.departments.find((department) => department.department_id === doctor.department_id)?.department_name || 'Unknown',
    })),
  );
});

app.post('/api/doctors', async (req, res) => {
  const { doctor_name, specialization, department_id, phone, availability, email, password } = req.body;
  if (!doctor_name || !specialization || !department_id) {
    return res.status(400).json({ message: 'Doctor name, specialization, and department are required.' });
  }

  if (usingMySQL && mysqlPool) {
    const [result] = await mysqlPool.query(
      'INSERT INTO doctors (doctor_name, specialization, department_id, phone, availability) VALUES (?, ?, ?, ?, ?)',
      [doctor_name.trim(), specialization.trim(), department_id, phone || '', availability || ''],
    );

    const [rows] = await mysqlPool.query(
      `SELECT d.*, dept.department_name
       FROM doctors d JOIN departments dept ON dept.department_id = d.department_id
       WHERE d.doctor_id = ?`,
      [result.insertId],
    );
    return res.status(201).json(rows[0]);
  }

  const generatedEmail = email ? email.trim() : `doctor${getNextId(inMemoryStore.doctors, 'doctor_id')}@hospital.com`;
  const generatedPassword = password || 'doctor123';

  const newDoctor = {
    doctor_id: getNextId(inMemoryStore.doctors, 'doctor_id'),
    doctor_name: doctor_name.trim(),
    specialization: specialization.trim(),
    department_id: Number(department_id),
    phone: phone || '',
    availability: availability || 'Flexible',
    email: generatedEmail,
    password: generatedPassword,
  };

  inMemoryStore.doctors.push(newDoctor);
  return res.status(201).json({
    ...sanitizeDoctorRecord(newDoctor),
    department_name: inMemoryStore.departments.find((department) => department.department_id === Number(department_id))?.department_name || 'Unknown',
  });
});

app.put('/api/doctors/:id', async (req, res) => {
  const { doctor_name, specialization, department_id, phone, availability, email, password } = req.body;
  if (!doctor_name || !specialization || !department_id) {
    return res.status(400).json({ message: 'Doctor name, specialization, and department are required.' });
  }

  if (usingMySQL && mysqlPool) {
    await mysqlPool.query(
      'UPDATE doctors SET doctor_name = ?, specialization = ?, department_id = ?, phone = ?, availability = ? WHERE doctor_id = ?',
      [doctor_name.trim(), specialization.trim(), department_id, phone || '', availability || '', req.params.id],
    );
    const [rows] = await mysqlPool.query(
      `SELECT d.*, dept.department_name
       FROM doctors d JOIN departments dept ON dept.department_id = d.department_id
       WHERE d.doctor_id = ?`,
      [req.params.id],
    );
    return res.json(rows[0]);
  }

  const index = inMemoryStore.doctors.findIndex((doctor) => doctor.doctor_id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: 'Doctor not found.' });
  }

  inMemoryStore.doctors[index] = {
    ...inMemoryStore.doctors[index],
    doctor_name: doctor_name.trim(),
    specialization: specialization.trim(),
    department_id: Number(department_id),
    phone: phone || '',
    availability: availability || 'Flexible',
    email: email ? email.trim() : inMemoryStore.doctors[index].email,
    password: password || inMemoryStore.doctors[index].password,
  };

  return res.json({
    ...sanitizeDoctorRecord(inMemoryStore.doctors[index]),
    department_name: inMemoryStore.departments.find((department) => department.department_id === inMemoryStore.doctors[index].department_id)?.department_name || 'Unknown',
  });
});

app.delete('/api/doctors/:id', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM doctors WHERE doctor_id = ?', [req.params.id]);
    return res.json({ message: 'Doctor deleted successfully.' });
  }

  const initialLength = inMemoryStore.doctors.length;
  inMemoryStore.doctors = inMemoryStore.doctors.filter((doctor) => doctor.doctor_id !== Number(req.params.id));

  if (inMemoryStore.doctors.length === initialLength) {
    return res.status(404).json({ message: 'Doctor not found.' });
  }

  inMemoryStore.appointments = inMemoryStore.appointments.filter((appointment) => appointment.doctor_id !== Number(req.params.id));
  return res.json({ message: 'Doctor deleted successfully.' });
});

app.get('/api/patients', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query('SELECT * FROM patients ORDER BY patient_id');
    return res.json(rows);
  }

  return res.json(inMemoryStore.patients);
});

app.post('/api/patients', async (req, res) => {
  const { patient_name, age, gender, phone, email, password } = req.body;
  if (!patient_name || !age || !gender || !phone || !email || !password) {
    return res.status(400).json({ message: 'All patient fields are required.' });
  }

  if (usingMySQL && mysqlPool) {
    try {
      const [result] = await mysqlPool.query(
        'INSERT INTO patients (patient_name, age, gender, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)',
        [patient_name.trim(), age, gender.trim(), phone.trim(), email.trim(), password],
      );

      const [rows] = await mysqlPool.query('SELECT * FROM patients WHERE patient_id = ?', [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (error) {
      return res.status(400).json({ message: 'Email already exists or request is invalid.' });
    }
  }

  const existing = inMemoryStore.patients.find((patient) => patient.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ message: 'Patient with this email already exists.' });
  }

  const newPatient = {
    patient_id: getNextId(inMemoryStore.patients, 'patient_id'),
    patient_name: patient_name.trim(),
    age: Number(age),
    gender: gender.trim(),
    phone: phone.trim(),
    email: email.trim(),
    password,
  };

  inMemoryStore.patients.push(newPatient);
  return res.status(201).json(newPatient);
});

app.put('/api/patients/:id', async (req, res) => {
  const { patient_name, age, gender, phone, email, password } = req.body;
  if (!patient_name || !age || !gender || !phone || !email) {
    return res.status(400).json({ message: 'All patient fields are required.' });
  }

  if (usingMySQL && mysqlPool) {
    await mysqlPool.query(
      'UPDATE patients SET patient_name = ?, age = ?, gender = ?, phone = ?, email = ?, password = ? WHERE patient_id = ?',
      [patient_name.trim(), age, gender.trim(), phone.trim(), email.trim(), password || '', req.params.id],
    );
    const [rows] = await mysqlPool.query('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
    return res.json(rows[0]);
  }

  const index = inMemoryStore.patients.findIndex((patient) => patient.patient_id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: 'Patient not found.' });
  }

  inMemoryStore.patients[index] = {
    ...inMemoryStore.patients[index],
    patient_name: patient_name.trim(),
    age: Number(age),
    gender: gender.trim(),
    phone: phone.trim(),
    email: email.trim(),
    password: password || inMemoryStore.patients[index].password,
  };

  return res.json(inMemoryStore.patients[index]);
});

app.delete('/api/patients/:id', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM patients WHERE patient_id = ?', [req.params.id]);
    return res.json({ message: 'Patient deleted successfully.' });
  }

  const initialLength = inMemoryStore.patients.length;
  inMemoryStore.patients = inMemoryStore.patients.filter((patient) => patient.patient_id !== Number(req.params.id));

  if (inMemoryStore.patients.length === initialLength) {
    return res.status(404).json({ message: 'Patient not found.' });
  }

  inMemoryStore.appointments = inMemoryStore.appointments.filter((appointment) => appointment.patient_id !== Number(req.params.id));
  return res.json({ message: 'Patient deleted successfully.' });
});

app.get('/api/appointments', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query(
      `SELECT a.*, p.patient_name, d.doctor_name, dept.department_name
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
       JOIN doctors d ON d.doctor_id = a.doctor_id
       JOIN departments dept ON dept.department_id = d.department_id
       ORDER BY a.appointment_date DESC, a.appointment_time`,
    );
    return res.json(rows);
  }

  return res.json(
    inMemoryStore.appointments.map((appointment) => {
      const patient = inMemoryStore.patients.find((item) => item.patient_id === appointment.patient_id);
      const doctor = inMemoryStore.doctors.find((item) => item.doctor_id === appointment.doctor_id);
      const department = inMemoryStore.departments.find((item) => item.department_id === doctor?.department_id);

      return {
        ...appointment,
        patient_name: patient?.patient_name || 'Unknown',
        doctor_name: doctor?.doctor_name || 'Unknown',
        department_name: department?.department_name || 'Unknown',
      };
    }),
  );
});

app.post('/api/appointments', async (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, status } = req.body;

  if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ message: 'Patient, doctor, date and time are required.' });
  }

  if (usingMySQL && mysqlPool) {
    const [doctorCheck] = await mysqlPool.query('SELECT doctor_id FROM doctors WHERE doctor_id = ?', [doctor_id]);
    if (!doctorCheck.length) {
      return res.status(400).json({ message: 'Selected doctor does not exist.' });
    }

    const [conflict] = await mysqlPool.query(
      'SELECT appointment_id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status <> "Cancelled"',
      [doctor_id, appointment_date, appointment_time],
    );

    if (conflict.length > 0) {
      return res.status(409).json({ message: 'This doctor is not available at the selected time. Please choose another time.' });
    }

    const [result] = await mysqlPool.query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?)',
      [patient_id, doctor_id, appointment_date, appointment_time, status || 'Booked'],
    );

    const [rows] = await mysqlPool.query(
      `SELECT a.*, p.patient_name, d.doctor_name, dept.department_name
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
       JOIN doctors d ON d.doctor_id = a.doctor_id
       JOIN departments dept ON dept.department_id = d.department_id
       WHERE a.appointment_id = ?`,
      [result.insertId],
    );

    return res.status(201).json(rows[0]);
  }

  if (isDoctorBooked(doctor_id, appointment_date, appointment_time)) {
    return res.status(409).json({ message: 'This doctor is not available at the selected time. Please choose another time.' });
  }

  const newAppointment = {
    appointment_id: getNextId(inMemoryStore.appointments, 'appointment_id'),
    patient_id: Number(patient_id),
    doctor_id: Number(doctor_id),
    appointment_date,
    appointment_time,
    status: status || 'Booked',
  };

  inMemoryStore.appointments.push(newAppointment);
  const patient = inMemoryStore.patients.find((item) => item.patient_id === newAppointment.patient_id);
  const doctor = inMemoryStore.doctors.find((item) => item.doctor_id === newAppointment.doctor_id);
  const department = inMemoryStore.departments.find((item) => item.department_id === doctor?.department_id);

  return res.status(201).json({
    ...newAppointment,
    patient_name: patient?.patient_name || 'Unknown',
    doctor_name: doctor?.doctor_name || 'Unknown',
    department_name: department?.department_name || 'Unknown',
  });
});

app.put('/api/appointments/:id', async (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, status } = req.body;

  if (usingMySQL && mysqlPool) {
    await mysqlPool.query(
      'UPDATE appointments SET patient_id = ?, doctor_id = ?, appointment_date = ?, appointment_time = ?, status = ? WHERE appointment_id = ?',
      [patient_id, doctor_id, appointment_date, appointment_time, status || 'Booked', req.params.id],
    );
    const [rows] = await mysqlPool.query(
      `SELECT a.*, p.patient_name, d.doctor_name, dept.department_name
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
       JOIN doctors d ON d.doctor_id = a.doctor_id
       JOIN departments dept ON dept.department_id = d.department_id
       WHERE a.appointment_id = ?`,
      [req.params.id],
    );
    return res.json(rows[0]);
  }

  const index = inMemoryStore.appointments.findIndex((appointment) => appointment.appointment_id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  inMemoryStore.appointments[index] = {
    ...inMemoryStore.appointments[index],
    patient_id: Number(patient_id),
    doctor_id: Number(doctor_id),
    appointment_date,
    appointment_time,
    status: status || 'Booked',
  };

  const patient = inMemoryStore.patients.find((item) => item.patient_id === inMemoryStore.appointments[index].patient_id);
  const doctor = inMemoryStore.doctors.find((item) => item.doctor_id === inMemoryStore.appointments[index].doctor_id);
  const department = inMemoryStore.departments.find((item) => item.department_id === doctor?.department_id);

  return res.json({
    ...inMemoryStore.appointments[index],
    patient_name: patient?.patient_name || 'Unknown',
    doctor_name: doctor?.doctor_name || 'Unknown',
    department_name: department?.department_name || 'Unknown',
  });
});

app.delete('/api/appointments/:id', async (req, res) => {
  if (usingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM appointments WHERE appointment_id = ?', [req.params.id]);
    return res.json({ message: 'Appointment deleted successfully.' });
  }

  const initialLength = inMemoryStore.appointments.length;
  inMemoryStore.appointments = inMemoryStore.appointments.filter((appointment) => appointment.appointment_id !== Number(req.params.id));

  if (inMemoryStore.appointments.length === initialLength) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  return res.json({ message: 'Appointment deleted successfully.' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@hospital.com' && password === 'admin123') {
    return res.json({ role: 'admin', name: 'Admin User', email });
  }

  if (usingMySQL && mysqlPool) {
    const [patientRows] = await mysqlPool.query('SELECT * FROM patients WHERE email = ? AND password = ?', [email, password]);
    if (patientRows.length > 0) {
      return res.json({ role: 'patient', ...patientRows[0] });
    }

    const [doctorRows] = await mysqlPool.query('SELECT * FROM doctors WHERE email = ? AND password = ?', [email, password]);
    if (doctorRows.length > 0) {
      return res.json({ role: 'doctor', ...doctorRows[0] });
    }
  } else {
    const patient = inMemoryStore.patients.find(
      (record) => record.email.toLowerCase() === String(email).trim().toLowerCase() && record.password === password,
    );

    if (patient) {
      return res.json({ role: 'patient', ...patient });
    }

    const doctor = inMemoryStore.doctors.find(
      (record) => record.email.toLowerCase() === String(email).trim().toLowerCase() && record.password === password,
    );

    if (doctor) {
      return res.json({ role: 'doctor', ...sanitizeDoctorRecord(doctor) });
    }
  }

  return res.status(401).json({ message: 'Invalid email or password.' });
});

app.listen(PORT, async () => {
  console.log(`Hospital management API running on http://localhost:${PORT}`);
  await ensureMySQLTables();
  await seedMySQLIfEmpty();
});
