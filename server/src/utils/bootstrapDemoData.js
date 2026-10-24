import bcryptjs from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import ClinicalRecord from '../models/ClinicalRecord.js';
import RadiologyRecord from '../models/RadiologyRecord.js';
import logger from '../utils/logger.js';
import GoogleSheetsService from '../services/GoogleSheetsService.js';

export const HOSPITALS_DATA = [
  {
    name: 'Sanjivani Hospital',
    facilityId: 'JC-HOSP-SANJIVANI-001',
    street: '42 Vinoba Puram',
    city: 'Mysore',
    state: 'Karnataka',
    zipCode: '570001',
    phone: '+91-0821-4321567',
    email: 'admin@sanjivani-mysore.in',
    registrationNumber: 'KA-SANJ-2015-001',
  },
  {
    name: 'Aarogya Kendra',
    facilityId: 'JC-HOSP-AAROGYA-KENDRA-001',
    street: '156 NH Highway',
    city: 'Mandya',
    state: 'Karnataka',
    zipCode: '571401',
    phone: '+91-08232-256789',
    email: 'admin@aarogya-mandya.in',
    registrationNumber: 'KA-AARO-2016-001',
  },
];

export function getDemoPassword(firstName, lastName) {
  if (process.env.DEMO_USER_PASSWORD) return process.env.DEMO_USER_PASSWORD;
  const cleanFirst = (firstName || '').replace(/[^a-zA-Z]/g, '');
  const cleanLast = (lastName || '').replace(/[^a-zA-Z]/g, '');
  return `${cleanFirst}${cleanLast}@123`;
}

export const ADMINS_DATA = [
  {
    firstName: 'Prakash',
    lastName: 'Rao',
    email: 'prakash.rao@sanjivani.in',
    hospitalIndex: 0,
    phone: '+91-9845012340',
  },
  {
    firstName: 'Revathi',
    lastName: 'Kumar',
    email: 'revathi.kumar@aarogya.in',
    hospitalIndex: 1,
    phone: '+91-9845012341',
  },
];

export const SANJIVANI_DOCTORS = [
  {
    firstName: 'Soundarya',
    lastName: 'Shetty',
    email: 'soundarya.shetty@sanjivani.in',
    specialization: 'Internal Medicine',
    licenseId: 'KA-LIC-SMD-2015-001',
    phone: '+91-9845110001',
  },
  {
    firstName: 'Christopher',
    lastName: 'Matthews',
    email: 'christopher.matthews@sanjivani.in',
    specialization: 'Cardiology',
    licenseId: 'KA-LIC-CM-2014-002',
    phone: '+91-9845110002',
  },
  {
    firstName: 'Manjunath',
    lastName: 'Rao',
    email: 'manjunath.rao@sanjivani.in',
    specialization: 'Orthopedics',
    licenseId: 'KA-LIC-MR-2013-003',
    phone: '+91-9845110003',
  },
  {
    firstName: 'Asia',
    lastName: 'Begum',
    email: 'asia.begum@sanjivani.in',
    specialization: 'Pediatrics',
    licenseId: 'KA-LIC-AB-2016-004',
    phone: '+91-9845110004',
  },
  {
    firstName: 'Ansh',
    lastName: 'Kumar',
    email: 'ansh.kumar@sanjivani.in',
    specialization: 'Neurology',
    licenseId: 'KA-LIC-AK-2017-005',
    phone: '+91-9845110005',
  },
];

export const AAROGYA_DOCTORS = [
  {
    firstName: 'Harshith',
    lastName: 'Bagrecha',
    email: 'harshith.bagrecha@aarogya.in',
    specialization: 'General Surgery',
    licenseId: 'KA-LIC-HB-2015-006',
    phone: '+91-9845220001',
  },
  {
    firstName: 'Ashwin',
    lastName: 'S.',
    email: 'ashwin.s@aarogya.in',
    specialization: 'ENT',
    licenseId: 'KA-LIC-AS-2014-007',
    phone: '+91-9845220002',
  },
  {
    firstName: 'Apoorva',
    lastName: 'Santosh',
    email: 'apoorva.santosh@aarogya.in',
    specialization: 'Obstetrics & Gynecology',
    licenseId: 'KA-LIC-AP-2016-008',
    phone: '+91-9845220003',
  },
  {
    firstName: 'Siri',
    lastName: 'M.N.',
    email: 'siri.mn@aarogya.in',
    specialization: 'Dermatology',
    licenseId: 'KA-LIC-SM-2015-009',
    phone: '+91-9845220004',
  },
  {
    firstName: 'Vinay',
    lastName: 'Kumar',
    email: 'vinay.kumar@aarogya.in',
    specialization: 'Radiology',
    licenseId: 'KA-LIC-VK-2017-010',
    phone: '+91-9845220005',
  },
];

export const SHARED_DOCTOR = {
  firstName: 'Swami',
  lastName: 'Murti',
  email: 'swami.murti@jeevacare.in',
  specialization: 'Anesthesiology',
  licenseId: 'KA-LIC-SM-2013-011',
  phone: '+91-9845330001',
};

export const SANJIVANI_PATIENTS = [
  { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar.pat@sanjivani.in', dob: '1965-03-15', sex: 'M', bloodGroup: 'O+' },
  { firstName: 'Meera', lastName: 'Singh', email: 'meera.singh.pat@sanjivani.in', dob: '1972-07-22', sex: 'F', bloodGroup: 'A+' },
  { firstName: 'Anil', lastName: 'Patel', email: 'anil.patel.pat@sanjivani.in', dob: '1958-11-08', sex: 'M', bloodGroup: 'B+' },
  { firstName: 'Divya', lastName: 'Sharma', email: 'divya.sharma.pat@sanjivani.in', dob: '1985-05-19', sex: 'F', bloodGroup: 'O-' },
  { firstName: 'Suresh', lastName: 'Desai', email: 'suresh.desai.pat@sanjivani.in', dob: '1970-09-27', sex: 'M', bloodGroup: 'AB+' },
  { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair.pat@sanjivani.in', dob: '1992-02-14', sex: 'F', bloodGroup: 'A-' },
  { firstName: 'Vikram', lastName: 'Rao', email: 'vikram.rao.pat@sanjivani.in', dob: '1975-12-03', sex: 'M', bloodGroup: 'B-' },
  { firstName: 'Anjali', lastName: 'Chopra', email: 'anjali.chopra.pat@sanjivani.in', dob: '1988-06-10', sex: 'F', bloodGroup: 'O+' },
  { firstName: 'Arjun', lastName: 'Gupta', email: 'arjun.gupta.pat@sanjivani.in', dob: '1968-08-25', sex: 'M', bloodGroup: 'AB-' },
  { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya.iyer.pat@sanjivani.in', dob: '1995-01-17', sex: 'F', bloodGroup: 'O+' },
];

export const AAROGYA_PATIENTS = [
  { firstName: 'Ramesh', lastName: 'Krishnan', email: 'ramesh.krishnan.pat@aarogya.in', dob: '1962-04-12', sex: 'M', bloodGroup: 'B+' },
  { firstName: 'Sneha', lastName: 'Verma', email: 'sneha.verma.pat@aarogya.in', dob: '1980-10-21', sex: 'F', bloodGroup: 'O+' },
  { firstName: 'Nikhil', lastName: 'Pandey', email: 'nikhil.pandey.pat@aarogya.in', dob: '1975-06-18', sex: 'M', bloodGroup: 'A+' },
  { firstName: 'Isha', lastName: 'Joshi', email: 'isha.joshi.pat@aarogya.in', dob: '1987-03-09', sex: 'F', bloodGroup: 'AB+' },
  { firstName: 'Rohan', lastName: 'Bansal', email: 'rohan.bansal.pat@aarogya.in', dob: '1970-09-14', sex: 'M', bloodGroup: 'O-' },
  { firstName: 'Neha', lastName: 'Menon', email: 'neha.menon.pat@aarogya.in', dob: '1993-07-26', sex: 'F', bloodGroup: 'A-' },
  { firstName: 'Sanjay', lastName: 'Agarwal', email: 'sanjay.agarwal.pat@aarogya.in', dob: '1966-12-05', sex: 'M', bloodGroup: 'B-' },
  { firstName: 'Pallavi', lastName: 'Saxena', email: 'pallavi.saxena.pat@aarogya.in', dob: '1982-11-30', sex: 'F', bloodGroup: 'O+' },
  { firstName: 'Ashok', lastName: 'Tripathi', email: 'ashok.tripathi.pat@aarogya.in', dob: '1973-02-28', sex: 'M', bloodGroup: 'AB-' },
  { firstName: 'Ritika', lastName: 'Pathak', email: 'ritika.pathak.pat@aarogya.in', dob: '1996-05-13', sex: 'F', bloodGroup: 'A+' },
];

/**
 * Bootstrap demonstration hospitals, admins, clinicians, and patients.
 * Completely safe and idempotent. Never overwrites or deletes existing accounts.
 */
export async function bootstrapDemoHospitalsAndAccounts() {
  try {
    logger.info('🏥 Bootstrapping JeevaCare demo hospitals and accounts...');

    // 1. Hospitals
    const hospitals = [];
    for (const hConfig of HOSPITALS_DATA) {
      let hospital = await Hospital.findOne({ facilityId: hConfig.facilityId });
      if (!hospital) {
        hospital = new Hospital({
          facilityId: hConfig.facilityId,
          name: hConfig.name,
          facilityType: 'general_hospital',
          address: {
            street: hConfig.street,
            city: hConfig.city,
            state: hConfig.state,
            country: 'India',
            zipCode: hConfig.zipCode,
          },
          contactInfo: {
            phone: hConfig.phone,
            email: hConfig.email,
            website: `www.${hConfig.facilityId.toLowerCase()}.in`,
          },
          registration: {
            registrationNumber: hConfig.registrationNumber,
            registrationType: 'state_registration',
            issuingAuthority: 'Karnataka Medical Council',
            issueDate: new Date('2015-01-01'),
            expiryDate: new Date('2030-12-31'),
          },
          services: ['emergency', 'cardiology', 'orthopedics', 'pediatrics', 'general_surgery', 'radiology', 'anesthesiology'],
          status: 'active',
          verificationStatus: 'verified',
        });
        await hospital.save();
        logger.info(`  ✓ Created hospital: ${hospital.name} (${hospital._id})`);
      }
      hospitals.push(hospital);
      GoogleSheetsService.recordHospital(hospital).catch(() => {});
    }

    // 2. Hospital Administrators
    for (const aConfig of ADMINS_DATA) {
      const hospital = hospitals[aConfig.hospitalIndex];
      let user = await User.findOne({ email: aConfig.email });
      if (!user) {
        user = new User({
          email: aConfig.email,
          passwordHash: getDemoPassword(aConfig.firstName, aConfig.lastName), // Pre-save hook will hash once
          role: 'HOSPITAL_ADMIN',
          profile: {
            firstName: aConfig.firstName,
            lastName: aConfig.lastName,
            phone: aConfig.phone,
            hospitalId: hospital._id,
          },
          verificationStatus: 'verified',
          status: 'active',
        });
        await user.save();
        logger.info(`  ✓ Created hospital admin: ${aConfig.firstName} ${aConfig.lastName} (${aConfig.email})`);
      }

      // Link HospitalStaff
      let staff = await HospitalStaff.findOne({ userId: user._id, hospitalId: hospital._id });
      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospital._id,
          role: 'hospital_admin',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2015-01-01'),
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            manageStaff: true,
            manageFacility: true,
            accessEmergencyProfiles: true,
            approveEmergencyAccess: true,
          },
        });
        await staff.save();
      }

      // Ensure hospital has admin in administrators array
      if (!hospital.administrators.includes(user._id)) {
        hospital.administrators.push(user._id);
        await hospital.save();
      }

      GoogleSheetsService.recordUser(user, { hospitalName: hospital.name }).catch(() => {});
    }

    // 3. Doctors helper
    const setupDoctor = async (docConfig, targetHospital, isShared = false) => {
      let user = await User.findOne({ email: docConfig.email });
      if (!user) {
        user = new User({
          email: docConfig.email,
          passwordHash: getDemoPassword(docConfig.firstName, docConfig.lastName),
          role: 'DOCTOR',
          profile: {
            firstName: docConfig.firstName,
            lastName: docConfig.lastName,
            phone: docConfig.phone,
            hospitalId: targetHospital._id,
          },
          verificationStatus: 'verified',
          status: 'active',
        });
        await user.save();
        logger.info(`  ✓ Created doctor: Dr. ${docConfig.firstName} ${docConfig.lastName} (${docConfig.specialization})`);
      }

      // HospitalStaff association for target hospital
      let staff = await HospitalStaff.findOne({ userId: user._id, hospitalId: targetHospital._id });
      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: targetHospital._id,
          role: 'doctor',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2016-01-01'),
          specialization: [docConfig.specialization],
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            accessEmergencyProfiles: true,
          },
        });
        await staff.save();
      }

      // HealthcareProfessional profile
      let professional = await HealthcareProfessional.findOne({ userId: user._id });
      if (!professional) {
        professional = new HealthcareProfessional({
          userId: user._id,
          firstName: docConfig.firstName,
          lastName: docConfig.lastName,
          email: docConfig.email,
          phone: docConfig.phone,
          professionalType: 'doctor',
          specialization: [docConfig.specialization],
          licenseNumber: docConfig.licenseId,
          verificationStatus: 'verified',
          accountStatus: 'active',
          facilityAssociations: [staff._id],
        });
        await professional.save();
      } else if (!professional.facilityAssociations.includes(staff._id)) {
        professional.facilityAssociations.push(staff._id);
        await professional.save();
      }

      GoogleSheetsService.recordDoctor(user, professional, targetHospital).catch(() => {});
      return { user, staff, professional };
    };

    // Sanjivani doctors
    const sanjivaniDoctors = [];
    for (const d of SANJIVANI_DOCTORS) {
      sanjivaniDoctors.push(await setupDoctor(d, hospitals[0]));
    }

    // Aarogya Kendra doctors
    const aarogyaDoctors = [];
    for (const d of AAROGYA_DOCTORS) {
      aarogyaDoctors.push(await setupDoctor(d, hospitals[1]));
    }

    // Shared doctor: Swami Murti
    const sharedDocUser = await setupDoctor(SHARED_DOCTOR, hospitals[0], true);
    await setupDoctor(SHARED_DOCTOR, hospitals[1], true);
    logger.info(`  ✓ Verified shared doctor Dr. Swami Murti affiliated with both hospitals`);

    // 4. Patients helper
    const setupPatients = async (patientsList, hospital, primaryDoctorUser) => {
      for (const pConfig of patientsList) {
        let user = await User.findOne({ email: pConfig.email });
        if (!user) {
          user = new User({
            email: pConfig.email,
            passwordHash: getDemoPassword(pConfig.firstName, pConfig.lastName),
            role: 'PATIENT',
            profile: {
              firstName: pConfig.firstName,
              lastName: pConfig.lastName,
              phone: '+91-98765' + Math.floor(10000 + Math.random() * 90000),
            },
            verificationStatus: 'verified',
            status: 'active',
          });
          await user.save();

          const patient = new Patient({
            userId: user._id,
            personalIdentity: {
              firstName: pConfig.firstName,
              lastName: pConfig.lastName,
              dateOfBirth: new Date(pConfig.dob),
              sex: pConfig.sex,
              phone: user.profile.phone,
              email: pConfig.email,
            },
            bloodGroup: {
              group: pConfig.bloodGroup,
              source: 'provider_verified',
              verificationStatus: 'verified',
              recordedAt: new Date(),
            },
            facilities: [
              {
                facilityId: hospital._id,
                registeredAt: new Date(),
              },
            ],
            status: 'active',
            identityVerification: {
              status: 'verified',
              method: 'demo',
              verifiedAt: new Date(),
            },
          });
          await patient.save();

          // Link a clinical record establishing patient history
          const clinicalRecord = new ClinicalRecord({
            patientId: patient._id,
            providerId: primaryDoctorUser._id,
            hospitalId: hospital._id,
            recordType: 'consultation',
            status: 'completed',
            visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            chiefComplaint: 'Routine health checkup and monitoring',
            clinicalNotes: 'Patient vital signs stable. Baseline metabolic profile within normal limits.',
            diagnosis: [
              {
                condition: 'General Health Maintenance',
                status: 'active',
                type: 'primary',
                diagnosedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            ],
          });
          await clinicalRecord.save();

          // Link a demo radiology record for demo patient #1 of each hospital
          if (pConfig === patientsList[0]) {
            const radiologyRecord = new RadiologyRecord({
              patientId: patient._id,
              hospitalId: hospital._id,
              studyDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              reportDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              modalityType: 'x_ray',
              bodyPart: 'Chest',
              clinicalIndication: 'Evaluation for cough and shortness of breath',
              radiologistName: 'Dr. Vinay Kumar',
              radiologistLicense: 'KA-LIC-VK-2017-010',
              findings: 'Lungs are clear bilaterally. Cardiothoracic ratio is normal (< 0.50). No pleural effusion, pneumothorax, or focal airspace consolidation. Costophrenic angles are sharp.',
              impression: 'Normal frontal chest radiograph. No acute cardiopulmonary disease.',
              recommendation: 'Clinical correlation recommended. Follow up as needed.',
              aiAnalysis: {
                status: 'completed',
                detectedModality: 'chest_xray',
                model: 'TorchXRayVision-ResNet50',
                confidence: 0.94,
                isMockData: false,
                analyzedAt: new Date(),
                findings: [
                  { pathology: 'Pneumonia', confidence: 0.05, severity: 'low' },
                  { pathology: 'Cardiomegaly', confidence: 0.08, severity: 'low' },
                  { pathology: 'Effusion', confidence: 0.03, severity: 'low' },
                  { pathology: 'Consolidation', confidence: 0.04, severity: 'low' }
                ],
                summary: 'AI decision support indicates low probability (< 10%) across 18 tested thoracic pathologies. Normal cardiopulmonary structures.',
                explanation: 'Frontal chest radiograph demonstrates clear lung parenchyma without focal infiltrates or vascular congestion. Heart size is within normal physiological limits.',
                limitations: [
                  'Automated decision support only. Not an independent medical diagnosis.',
                  'Radiological interpretation must be verified by a board-certified radiologist.'
                ]
              },
              ocrStatus: 'extracted',
              ocrData: {
                extractedText: 'CHEST X-RAY PA VIEW: Lung fields are normal. Cardiac silhouette is normal in size and contour. Bony thorax intact. IMPRESSION: Normal study.',
                confidence: 0.98,
                extractedAt: new Date(),
              },
              imageReference: {
                cloudinaryPublicId: 'demo/sample_chest_xray',
                cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                fileSize: 245000,
                mimeType: 'image/jpeg',
                originalFilename: 'chest_xray_frontal.jpg',
              },
            });
            await radiologyRecord.save();
          }

          GoogleSheetsService.recordPatient(user, patient, hospital).catch(() => {});
        }
      }
    };

    await setupPatients(SANJIVANI_PATIENTS, hospitals[0], sanjivaniDoctors[0].user);
    await setupPatients(AAROGYA_PATIENTS, hospitals[1], aarogyaDoctors[0].user);
    logger.info('  ✓ Seeded 20 patients (10 Sanjivani, 10 Aarogya Kendra)');

    // 5. System Administrator Demo Account
    let sysAdmin = await User.findOne({ email: 'admin@jeevacare.demo' });
    if (!sysAdmin) {
      sysAdmin = new User({
        email: 'admin@jeevacare.demo',
        passwordHash: 'DemoAdmin@123',
        role: 'SYSTEM_ADMIN',
        profile: {
          firstName: 'System',
          lastName: 'Administrator',
          phone: '+91-9900000001',
        },
        verificationStatus: 'verified',
        status: 'active',
      });
      await sysAdmin.save();
      logger.info('  ✓ Created system administrator: admin@jeevacare.demo');
      GoogleSheetsService.recordUser(sysAdmin, { role: 'SYSTEM_ADMIN' }).catch(() => {});
    }

    logger.info('✅ JeevaCare demo hospitals and accounts bootstrap COMPLETE.');
    return {
      success: true,
      hospitals: hospitals.length,
      doctors: sanjivaniDoctors.length + aarogyaDoctors.length + 1,
      patients: SANJIVANI_PATIENTS.length + AAROGYA_PATIENTS.length,
    };
  } catch (error) {
    logger.error(`❌ Bootstrap demo data error: ${error.message}`);
    logger.error(error.stack);
    return { success: false, error: error.message };
  }
}

export default bootstrapDemoHospitalsAndAccounts;
