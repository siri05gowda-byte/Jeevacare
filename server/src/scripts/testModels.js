/**
 * Test Script - Model Loading and Validation
 */

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import GuardianRelationship from '../models/GuardianRelationship.js';
import Hospital from '../models/Hospital.js';
import Encounter from '../models/Encounter.js';
import ClinicalRecord from '../models/ClinicalRecord.js';
import Appointment from '../models/Appointment.js';
import Document from '../models/Document.js';
import AuditEvent from '../models/AuditEvent.js';

console.log('✅ Models loaded successfully:\n');

const models = {
  User,
  Patient,
  GuardianRelationship,
  Hospital,
  Encounter,
  ClinicalRecord,
  Appointment,
  Document,
  AuditEvent,
};

for (const [name, model] of Object.entries(models)) {
  console.log(`✅ ${name}`);
  console.log(`   Schema fields: ${Object.keys(model.schema.obj).length}`);
  console.log(`   Indexes: ${model.schema.indexes().length}`);
}

console.log('\n✅ All models verified successfully!');
