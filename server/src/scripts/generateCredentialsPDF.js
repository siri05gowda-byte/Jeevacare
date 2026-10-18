/**
 * Generate Credentials PDF for JeevaCare Demo
 * Creates a comprehensive PDF with all demo identities and login information
 * 
 * Usage:
 *   node generateCredentialsPDF.js
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Demo Data Structure
const DEMO_DATA = {
  hospitals: [
    {
      name: 'Sanjivani Hospital',
      city: 'Mysore, Karnataka, India',
      facilityId: 'JC-HOSP-SANJIVANI-001',
      admin: {
        name: 'Prakash Rao',
        email: 'prakash.rao@sanjivani.in',
        password: 'PrakashRao@123',
      },
      doctors: [
        {
          name: 'Soundarya Shetty',
          email: 'soundarya.shetty@sanjivani.in',
          password: 'SoundaryaShetty@123',
          specialization: 'Internal Medicine',
          license: 'KA-LIC-SMD-2015-001',
        },
        {
          name: 'Christopher Matthews',
          email: 'christopher.matthews@sanjivani.in',
          password: 'ChristopherMatthews@123',
          specialization: 'Cardiology',
          license: 'KA-LIC-CM-2014-002',
        },
        {
          name: 'Manjunath Rao',
          email: 'manjunath.rao@sanjivani.in',
          password: 'ManjunathRao@123',
          specialization: 'Orthopedics',
          license: 'KA-LIC-MR-2013-003',
        },
        {
          name: 'Asia Begum',
          email: 'asia.begum@sanjivani.in',
          password: 'AsiaBegum@123',
          specialization: 'Pediatrics',
          license: 'KA-LIC-AB-2016-004',
        },
        {
          name: 'Ansh Kumar',
          email: 'ansh.kumar@sanjivani.in',
          password: 'AnshKumar@123',
          specialization: 'Neurology',
          license: 'KA-LIC-AK-2017-005',
        },
      ],
      patients: [
        { name: 'Rajesh Kumar', email: 'rajesh.kumar.pat@sanjivani.in', password: 'Patient@123', dob: '1965-03-15' },
        { name: 'Meera Singh', email: 'meera.singh.pat@sanjivani.in', password: 'Patient@123', dob: '1972-07-22' },
        { name: 'Anil Patel', email: 'anil.patel.pat@sanjivani.in', password: 'Patient@123', dob: '1958-11-08' },
        { name: 'Divya Sharma', email: 'divya.sharma.pat@sanjivani.in', password: 'Patient@123', dob: '1985-05-19' },
        { name: 'Suresh Desai', email: 'suresh.desai.pat@sanjivani.in', password: 'Patient@123', dob: '1970-09-27' },
        { name: 'Priya Nair', email: 'priya.nair.pat@sanjivani.in', password: 'Patient@123', dob: '1992-02-14' },
        { name: 'Vikram Rao', email: 'vikram.rao.pat@sanjivani.in', password: 'Patient@123', dob: '1975-12-03' },
        { name: 'Anjali Chopra', email: 'anjali.chopra.pat@sanjivani.in', password: 'Patient@123', dob: '1988-06-10' },
        { name: 'Arjun Gupta', email: 'arjun.gupta.pat@sanjivani.in', password: 'Patient@123', dob: '1968-08-25' },
        { name: 'Kavya Iyer', email: 'kavya.iyer.pat@sanjivani.in', password: 'Patient@123', dob: '1995-01-17' },
      ],
    },
    {
      name: 'Aarogya Kendra',
      city: 'Mandya, Karnataka, India',
      facilityId: 'JC-HOSP-AAROGYA-KENDRA-001',
      admin: {
        name: 'Revathi Kumar',
        email: 'revathi.kumar@aarogya.in',
        password: 'RevathiKumar@123',
      },
      doctors: [
        {
          name: 'Harshith Bagrecha',
          email: 'harshith.bagrecha@aarogya.in',
          password: 'HarshithBagrecha@123',
          specialization: 'General Surgery',
          license: 'KA-LIC-HB-2015-006',
        },
        {
          name: 'Ashwin S.',
          email: 'ashwin.s@aarogya.in',
          password: 'AshwinS@123',
          specialization: 'ENT',
          license: 'KA-LIC-AS-2014-007',
        },
        {
          name: 'Apoorva Santosh',
          email: 'apoorva.santosh@aarogya.in',
          password: 'ApoorvaSantosh@123',
          specialization: 'Obstetrics & Gynecology',
          license: 'KA-LIC-AP-2016-008',
        },
        {
          name: 'Siri M.N.',
          email: 'siri.mn@aarogya.in',
          password: 'SiriMN@123',
          specialization: 'Dermatology',
          license: 'KA-LIC-SM-2015-009',
        },
        {
          name: 'Vinay Kumar',
          email: 'vinay.kumar@aarogya.in',
          password: 'VinayKumar@123',
          specialization: 'Radiology',
          license: 'KA-LIC-VK-2017-010',
        },
      ],
      patients: [
        { name: 'Ramesh Krishnan', email: 'ramesh.krishnan.pat@aarogya.in', password: 'Patient@123', dob: '1962-04-12' },
        { name: 'Sneha Verma', email: 'sneha.verma.pat@aarogya.in', password: 'Patient@123', dob: '1980-10-21' },
        { name: 'Nikhil Pandey', email: 'nikhil.pandey.pat@aarogya.in', password: 'Patient@123', dob: '1975-06-18' },
        { name: 'Isha Joshi', email: 'isha.joshi.pat@aarogya.in', password: 'Patient@123', dob: '1987-03-09' },
        { name: 'Rohan Bansal', email: 'rohan.bansal.pat@aarogya.in', password: 'Patient@123', dob: '1970-09-14' },
        { name: 'Neha Menon', email: 'neha.menon.pat@aarogya.in', password: 'Patient@123', dob: '1993-07-26' },
        { name: 'Sanjay Agarwal', email: 'sanjay.agarwal.pat@aarogya.in', password: 'Patient@123', dob: '1966-12-05' },
        { name: 'Pallavi Saxena', email: 'pallavi.saxena.pat@aarogya.in', password: 'Patient@123', dob: '1982-11-30' },
        { name: 'Ashok Tripathi', email: 'ashok.tripathi.pat@aarogya.in', password: 'Patient@123', dob: '1973-02-28' },
        { name: 'Ritika Pathak', email: 'ritika.pathak.pat@aarogya.in', password: 'Patient@123', dob: '1996-05-13' },
      ],
    },
  ],
  sharedDoctor: {
    name: 'Swami Murti',
    email: 'swami.murti@jeevacare.in',
    password: 'SwamiMurti@123',
    specialization: 'Anesthesiology',
    license: 'KA-LIC-SM-2013-011',
    hospitals: ['Sanjivani Hospital', 'Aarogya Kendra'],
  },
  systemAdmin: {
    name: 'System Administrator',
    email: 'Contact your deployment administrator',
    password: 'Provisioned via JEEVACARE_ADMIN_SECRET environment variable',
    note: 'System admin accounts are created using the /api/v1/auth/provision-system-admin endpoint with the JEEVACARE_ADMIN_SECRET for secure bootstrapping.',
  },
};

function generatePDF() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  });

  const outputPath = path.join(__dirname, '../../..', 'JeevaCare_Demo_Credentials_and_Test_Guide.pdf');
  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  // ============================================================================
  // TITLE PAGE
  // ============================================================================
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('JeevaCare', { align: 'center' })
    .fontSize(18)
    .font('Helvetica')
    .text('Multi-Hospital Healthcare Platform', { align: 'center' })
    .moveDown(0.5)
    .fontSize(14)
    .text('Demo Credentials & Test Guide', { align: 'center' })
    .moveDown(2)
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text('Synthetic Healthcare Dataset for Development & Testing', { align: 'center' })
    .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
    .moveDown(3);

  // Warning
  doc
    .fillColor('red')
    .rect(40, doc.y, 515, 60)
    .fill()
    .fillColor('white')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('⚠️  SYNTHETIC DEMO DATA ONLY', 50, doc.y - 50, { width: 500, align: 'center' })
    .fontSize(9)
    .font('Helvetica')
    .text('These are fictional demo accounts created for testing and demonstration purposes.', 50, doc.y, { width: 500, align: 'center' })
    .text('Never use these credentials in production. All data is synthetic and for demo use only.', 50, doc.y, { width: 500, align: 'center' })
    .moveDown(2);

  // Quick Start
  doc
    .fillColor('black')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('🚀 Quick Start')
    .fontSize(9)
    .font('Helvetica')
    .text('1. Go to https://jeevacare-cmdm.vercel.app (frontend)', { indent: 20 })
    .text('2. Click "Login"', { indent: 20 })
    .text('3. Use any credentials from this document', { indent: 20 })
    .text('4. Explore the hospital portals and patient dashboards', { indent: 20 })
    .moveDown(1.5);

  // Cross-Browser Testing
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('🔄 Cross-Browser Approval Testing')
    .fontSize(9)
    .font('Helvetica')
    .text('Chrome: Register a new doctor using the "Register as Staff" form', { indent: 20 })
    .text('Edge: Login as hospital admin and approve the request', { indent: 20 })
    .text('Chrome: Refresh to see the approved status', { indent: 20 })
    .moveDown(1.5);

  // Navigation
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('📖 In This Document')
    .fontSize(9)
    .font('Helvetica')
    .text('• Hospital Information & Administrators', { indent: 20 })
    .text('• Doctor Credentials & Specializations', { indent: 20 })
    .text('• Patient Credentials & Affiliations', { indent: 20 })
    .text('• Shared Doctor Information', { indent: 20 })
    .text('• System Administrator Provisioning', { indent: 20 })
    .text('• Complete Test Walkthrough', { indent: 20 });

  // Page break
  doc.addPage();

  // ============================================================================
  // HOSPITAL INFORMATION
  // ============================================================================
  for (const hospital of DEMO_DATA.hospitals) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`🏥 ${hospital.name}`)
      .fontSize(9)
      .font('Helvetica')
      .text(`Location: ${hospital.city}`, { indent: 10 })
      .text(`Facility ID: ${hospital.facilityId}`, { indent: 10 })
      .moveDown(0.5);

    // Hospital Admin
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Hospital Administrator')
      .fontSize(9)
      .font('Helvetica')
      .text(`Name: ${hospital.admin.name}`, { indent: 20 })
      .text(`Email: ${hospital.admin.email}`, { indent: 20 })
      .text(`Password: ${hospital.admin.password}`, { indent: 20 })
      .moveDown(0.5);

    // Doctors
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Doctors (${hospital.doctors.length})`)
      .fontSize(9)
      .font('Helvetica');

    for (const doctor of hospital.doctors) {
      doc.text(`${doctor.name} (${doctor.specialization})`, { indent: 20 });
      doc.text(`Email: ${doctor.email}`, { indent: 30 });
      doc.text(`Password: ${doctor.password}`, { indent: 30 });
      doc.text(`License: ${doctor.license}`, { indent: 30 });
    }

    doc.moveDown(0.5);

    // Patients (summary)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Patients (${hospital.patients.length})`)
      .fontSize(9)
      .font('Helvetica');

    for (const patient of hospital.patients) {
      doc.text(`${patient.name}`, { indent: 20 });
      doc.text(`Email: ${patient.email} | Password: ${patient.password}`, { indent: 30 });
    }

    doc.moveDown(1.5);
    if (hospital !== DEMO_DATA.hospitals[DEMO_DATA.hospitals.length - 1]) {
      doc.addPage();
    }
  }

  // ============================================================================
  // SHARED DOCTOR
  // ============================================================================
  doc.addPage();
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('👨‍⚕️ Shared Doctor (Multi-Hospital Affiliation)')
    .fontSize(9)
    .font('Helvetica')
    .text(`Name: ${DEMO_DATA.sharedDoctor.name}`, { indent: 10 })
    .text(`Email: ${DEMO_DATA.sharedDoctor.email}`, { indent: 10 })
    .text(`Password: ${DEMO_DATA.sharedDoctor.password}`, { indent: 10 })
    .text(`Specialization: ${DEMO_DATA.sharedDoctor.specialization}`, { indent: 10 })
    .text(`License: ${DEMO_DATA.sharedDoctor.license}`, { indent: 10 })
    .moveDown(0.5)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Hospital Affiliations:')
    .fontSize(9)
    .font('Helvetica');

  for (const hospital of DEMO_DATA.sharedDoctor.hospitals) {
    doc.text(`• ${hospital}`, { indent: 20 });
  }

  doc.moveDown(1)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Important Notes:')
    .fontSize(9)
    .font('Helvetica')
    .text(
      'This doctor has a single stable identity and login that grants access to patients in both hospitals according to the authorization context.',
      { indent: 20, width: 450 }
    )
    .text(
      'The doctor is NOT duplicated into two separate accounts. All hospital affiliations are managed through the HospitalStaff collection.',
      { indent: 20, width: 450 }
    );

  // ============================================================================
  // SYSTEM ADMIN
  // ============================================================================
  doc.addPage();
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('🔐 System Administrator Provisioning')
    .fontSize(9)
    .font('Helvetica')
    .moveDown(0.5)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Provisioning Method:')
    .fontSize(9)
    .font('Helvetica')
    .text(
      DEMO_DATA.systemAdmin.note,
      { indent: 20, width: 450 }
    )
    .moveDown(1)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('How to Create a System Admin:')
    .fontSize(9)
    .font('Helvetica')
    .text('1. Obtain the JEEVACARE_ADMIN_SECRET from your deployment environment', { indent: 20 })
    .text('2. Make a POST request to /api/v1/auth/provision-system-admin with:', { indent: 20 })
    .text('   { "email": "admin@example.com", "password": "secure_password", "secret": "JEEVACARE_ADMIN_SECRET" }', { indent: 30 })
    .text('3. The endpoint will create the admin account and return the credentials', { indent: 20 })
    .moveDown(1)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Development Environment:')
    .fontSize(9)
    .font('Helvetica')
    .text('JEEVACARE_ADMIN_SECRET is defined in your .env file (local development only)', { indent: 20 })
    .text('Never expose the admin secret in production or version control', { indent: 20 });

  // ============================================================================
  // TEST WALKTHROUGH
  // ============================================================================
  doc.addPage();
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('🧪 Complete Test Walkthrough')
    .moveDown(0.5);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Scenario 1: Hospital Admin Dashboard')
    .fontSize(9)
    .font('Helvetica')
    .text('1. Navigate to https://jeevacare-cmdm.vercel.app', { indent: 10 })
    .text('2. Click "Login"', { indent: 10 })
    .text('3. Use credentials:', { indent: 10 })
    .text(`   Email: ${DEMO_DATA.hospitals[0].admin.email}`, { indent: 20 })
    .text(`   Password: ${DEMO_DATA.hospitals[0].admin.password}`, { indent: 20 })
    .text('4. You should see a hospital-specific dashboard', { indent: 10 })
    .text('5. View "Pending Staff Requests" (if any)', { indent: 10 })
    .text('6. Review pending doctor registrations', { indent: 10 })
    .text('7. Approve or reject requests', { indent: 10 })
    .moveDown(1);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Scenario 2: Doctor Portal')
    .fontSize(9)
    .font('Helvetica')
    .text('1. Login with any doctor credential', { indent: 10 })
    .text(`   Example: ${DEMO_DATA.hospitals[0].doctors[0].email}`, { indent: 20 })
    .text('2. Access patient list and medical records', { indent: 10 })
    .text('3. View radiology reports for assigned patients', { indent: 10 })
    .text('4. Create appointments and clinical notes', { indent: 10 })
    .moveDown(1);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Scenario 3: Patient Dashboard')
    .fontSize(9)
    .font('Helvetica')
    .text('1. Login with any patient credential', { indent: 10 })
    .text(`   Example: ${DEMO_DATA.hospitals[0].patients[0].email}`, { indent: 20 })
    .text('2. View medical records and appointments', { indent: 10 })
    .text('3. Check radiology reports', { indent: 10 })
    .text('4. Access emergency profile settings', { indent: 10 })
    .moveDown(1);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Scenario 4: Cross-Browser Approval Workflow')
    .fontSize(9)
    .font('Helvetica')
    .text('Browser 1 (Chrome):', { indent: 10 })
    .text('  1. Go to frontend and click "Register as Staff"', { indent: 15 })
    .text('  2. Fill in: Email, Select hospital, Role: Doctor', { indent: 15 })
    .text('  3. Submit registration request', { indent: 15 })
    .text('  4. You should see a "Pending" status', { indent: 15 })
    .moveDown(0.5)
    .text('Browser 2 (Edge):', { indent: 10 })
    .text('  1. Login as hospital administrator', { indent: 15 })
    .text('  2. Go to "Staff Registrations" → "Pending"', { indent: 15 })
    .text('  3. Find the new request', { indent: 15 })
    .text('  4. Click "Approve"', { indent: 15 })
    .moveDown(0.5)
    .text('Browser 1 (Chrome) - Verify:', { indent: 10 })
    .text('  1. Refresh the page', { indent: 15 })
    .text('  2. Request status should now show "Approved"', { indent: 15 })
    .text('  3. New doctor can now login to the system', { indent: 15 });

  // ============================================================================
  // FOOTER
  // ============================================================================
  doc.addPage();
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('📋 Quick Reference')
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Frontend URLs:')
    .fontSize(9)
    .font('Helvetica')
    .text('Production: https://jeevacare-cmdm.vercel.app', { indent: 10 })
    .text('Local Dev: http://localhost:3000', { indent: 10 })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Backend URLs:')
    .fontSize(9)
    .font('Helvetica')
    .text('Production: https://jeevacare-th88.onrender.com', { indent: 10 })
    .text('Local Dev: http://localhost:5000', { indent: 10 })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('API Endpoints:')
    .fontSize(9)
    .font('Helvetica')
    .text('Login: POST /api/v1/auth/login', { indent: 10 })
    .text('Patients: GET /api/v1/patients', { indent: 10 })
    .text('Staff Registration: POST /api/v1/staff-registration/request', { indent: 10 })
    .text('Approve Staff: POST /api/v1/staff-registration/:id/approve', { indent: 10 })
    .text('Radiology: GET /api/v1/radiology', { indent: 10 })
    .moveDown(1.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Important Security Notes:')
    .fontSize(9)
    .font('Helvetica')
    .text('✓ All passwords are hashed using bcryptjs', { indent: 10 })
    .text('✓ Never expose plaintext passwords except during testing', { indent: 10 })
    .text('✓ Delete or rotate demo accounts before production deployment', { indent: 10 })
    .text('✓ Use strong unique passwords for actual system administrators', { indent: 10 })
    .moveDown(2)
    .fontSize(8)
    .font('Helvetica-Oblique')
    .text(
      'This document is for internal development and testing only. Treat all credentials with appropriate confidentiality during active testing phases.',
      { align: 'center' }
    )
    .text(
      'JeevaCare © 2024 - Synthetic Healthcare Platform for Lifelong Health Journeys',
      { align: 'center' }
    );

  // Finalize PDF
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`\n✅ PDF generated successfully: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

// Main
generatePDF()
  .then(path => {
    console.log(`📄 Credentials PDF available at: ${path}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to generate PDF:', error.message);
    process.exit(1);
  });
