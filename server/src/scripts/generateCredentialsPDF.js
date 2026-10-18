/**
 * Generate Credentials PDF for JeevaCare Demo
 * Fetches credentials from seeded database and creates comprehensive reference PDF
 * 
 * ⚠️ IMPORTANT:
 * - Run ONLY after npm run seed:synthetic has successfully completed
 * - Requires a seeded jeevacare-test database
 * - Passwords are fetched from database (hashed) and plaintext used for demo reference only
 * - Generated PDF contains plaintext passwords and should not be committed or distributed
 * 
 * Usage:
 *   TEST_MONGODB_URI=mongodb://localhost:27017/jeevacare-test node generateCredentialsPDF.js
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';

async function generatePDF() {
  try {
    // Verify TEST_MONGODB_URI is set
    const mongoUri = process.env.TEST_MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ TEST_MONGODB_URI not set');
      console.error('   This script generates PDF from seeded demo data.');
      console.error('   Set TEST_MONGODB_URI and run seed:synthetic first.');
      process.exit(1);
    }

    console.log('🔌 Connecting to seeded database...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected');

    // Fetch hospitals
    const hospitals = await Hospital.find().lean();
    if (hospitals.length === 0) {
      console.error('❌ No hospitals found in database');
      console.error('   Run: npm run seed:synthetic (with TEST_MONGODB_URI set)');
      process.exit(1);
    }

    console.log(`✓ Found ${hospitals.length} hospitals`);

    // Build credential data from database
    const credentialData = {
      generatedAt: new Date().toISOString(),
      hospitals: [],
    };

    for (const hospital of hospitals) {
      const hospitalData = {
        name: hospital.name,
        facilityId: hospital.facilityId,
        city: `${hospital.address.city}, ${hospital.address.state}`,
        administrators: [],
        doctors: [],
        patients: [],
      };

      // Find hospital admins
      const adminUsers = await User.find({ 
        role: 'HOSPITAL_ADMIN',
        'profile.hospitalId': hospital._id 
      }).select('email profile').lean();

      for (const admin of adminUsers) {
        hospitalData.administrators.push({
          name: `${admin.profile.firstName} ${admin.profile.lastName}`,
          email: admin.email,
          note: '(Check .env or secure credential store for password)',
        });
      }

      // Find hospital doctors
      const doctorStaff = await HospitalStaff.find({
        hospitalId: hospital._id,
        role: 'doctor',
      }).populate('userId', 'email profile').lean();

      for (const staff of doctorStaff) {
        const doc = staff.userId;
        if (doc) {
          hospitalData.doctors.push({
            name: `${doc.profile.firstName} ${doc.profile.lastName}`,
            email: doc.email,
            specialization: staff.specialization ? staff.specialization[0] : 'Unspecified',
          });
        }
      }

      // Find hospital patients
      const patients = await User.find({
        role: 'PATIENT',
        'profile.hospitalId': hospital._id,
      }).select('email profile').lean();

      hospitalData.patients = patients.map(p => ({
        name: `${p.profile.firstName} ${p.profile.lastName}`,
        email: p.email,
      }));

      credentialData.hospitals.push(hospitalData);
    }

    // Generate PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
    });

    const outputPath = path.join(__dirname, '../../..', 'JeevaCare_Demo_Credentials_and_Test_Guide.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('JeevaCare Demo Credentials', { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text(`Generated from seeded database: ${new Date().toLocaleString()}`, { align: 'center' })
      .moveDown(1);

    // Warning
    doc
      .fillColor('red')
      .rect(40, doc.y, 515, 50)
      .fill()
      .fillColor('white')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('⚠️  SYNTHETIC DEMO DATA ONLY', 50, doc.y - 40, { width: 500, align: 'center' })
      .fontSize(9)
      .font('Helvetica')
      .text('These are fictional demo accounts. Keep this PDF private.', 50, doc.y, { width: 500, align: 'center' })
      .moveDown(2)
      .fillColor('black');

    // Content
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Hospitals');

    for (const h of credentialData.hospitals) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`\n${h.name}`)
        .fontSize(9)
        .font('Helvetica')
        .text(`Facility ID: ${h.facilityId}`)
        .text(`Location: ${h.city}`)
        .text(`Administrators: ${h.administrators.length}`)
        .text(`Doctors: ${h.doctors.length}`)
        .text(`Patients: ${h.patients.length}`);
    }

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .moveDown(2)
      .text('This document should not be committed to version control or distributed publicly.', { align: 'center' })
      .text('For credential details, contact your deployment administrator.', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`\n✅ PDF created: ${outputPath}`);
        console.log(`   Database source: jeevacare-test`);
        console.log(`   Records: ${credentialData.hospitals.reduce((a, h) => a + h.doctors.length + h.patients.length, 0)} accounts across ${credentialData.hospitals.length} hospitals`);
        console.log('\n⚠️  Keep this PDF private. Do not commit or distribute publicly.');
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

generatePDF().then(() => process.exit(0)).catch(() => process.exit(1));
