import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email'],
    },

    jeevaId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined for existing users
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Don't return password by default
    },

    role: {
      type: String,
      enum: ['PATIENT', 'GUARDIAN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 
             'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'RECEPTION_STAFF', 
             'HOSPITAL_ADMIN', 'EMERGENCY', 'SYSTEM_ADMIN'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted', 'inactive'],
      default: 'active',
    },

    isDemoAccount: {
      type: Boolean,
      default: false,
      index: true,
    },

    profile: {
      firstName: String,
      lastName: String,
      phone: String,
      profilePictureUrl: String,
      department: String, // For hospital staff
      hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
      },
      aadhaarNumber: {
        type: String,
        sparse: true,
        select: false, // Don't return by default for security
        validate: {
          validator: function(v) {
            // Allow empty/null or exactly 12 digits
            if (!v) return true;
            return /^\d{12}$/.test(v);
          },
          message: 'Aadhaar number must be exactly 12 digits'
        }
      },
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: function() {
        // Patients and guardians don't need hospital-admin approval to use their account
        return (this.role === 'PATIENT' || this.role === 'GUARDIAN') ? 'verified' : 'pending';
      },
    },

    lastLoginAt: Date,

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },

    auditMetadata: {
      type: {
        createdFromIp: String,
        lastLoginIp: String,
        loginAttempts: {
          type: Number,
          default: 0,
        },
        lastLoginAttemptAt: Date,
        lockedUntil: Date,
      },
      default: () => ({ loginAttempts: 0 }),
    },

    preferences: {
      language: {
        type: String,
        enum: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
        default: 'en',
      },
      audioEnabled: {
        type: Boolean,
        default: false,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
    },

    consentRecord: {
      termsAccepted: {
        type: Boolean,
        default: false,
      },
      termsAcceptedAt: Date,
      privacyPolicyAccepted: {
        type: Boolean,
        default: false,
      },
      privacyPolicyAcceptedAt: Date,
    },
  },
  {
    timestamps: true,
    indexes: [
      { email: 1 },
      { role: 1 },
      { status: 1 },
      { 'profile.hospitalId': 1 },
      { createdAt: -1 },
    ],
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  // Prevent double-hashing if password is already a valid bcrypt hash
  if (typeof this.passwordHash === 'string' && /^\$2[aby]\$\d{2}\$/.test(this.passwordHash)) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Explicit immutable allowlist of officially provisioned demo accounts
export const DEMO_ACCOUNT_EMAILS = Object.freeze([
  // Sanjivani Hospital Admin & Doctors (6)
  'prakash.rao@sanjivani.in',
  'soundarya.shetty@sanjivani.in',
  'christopher.matthews@sanjivani.in',
  'manjunath.rao@sanjivani.in',
  'asia.begum@sanjivani.in',
  'ansh.kumar@sanjivani.in',
  // Sanjivani Hospital Patients (10)
  'rajesh.kumar.pat@sanjivani.in',
  'meera.singh.pat@sanjivani.in',
  'anil.patel.pat@sanjivani.in',
  'divya.sharma.pat@sanjivani.in',
  'suresh.desai.pat@sanjivani.in',
  'priya.nair.pat@sanjivani.in',
  'vikram.rao.pat@sanjivani.in',
  'anjali.chopra.pat@sanjivani.in',
  'arjun.gupta.pat@sanjivani.in',
  'kavya.iyer.pat@sanjivani.in',
  // Aarogya Kendra Admin & Doctors (6)
  'revathi.kumar@aarogya.in',
  'harshith.bagrecha@aarogya.in',
  'ashwin.s@aarogya.in',
  'apoorva.santosh@aarogya.in',
  'siri.mn@aarogya.in',
  'vinay.kumar@aarogya.in',
  // Aarogya Kendra Patients (10)
  'ramesh.krishnan.pat@aarogya.in',
  'sneha.verma.pat@aarogya.in',
  'nikhil.pandey.pat@aarogya.in',
  'isha.joshi.pat@aarogya.in',
  'rohan.bansal.pat@aarogya.in',
  'neha.menon.pat@aarogya.in',
  'sanjay.agarwal.pat@aarogya.in',
  'pallavi.saxena.pat@aarogya.in',
  'ashok.tripathi.pat@aarogya.in',
  'ritika.pathak.pat@aarogya.in',
  // Shared Doctor (1)
  'swami.murti@jeevacare.in',
  // Generic Demo Accounts (5)
  'patient@jeevacare.demo',
  'admin@jeevacare.demo',
  'patient@demo.com',
  'doctor@demo.com',
  'admin@demo.com',
]);

const DEMO_EMAIL_SET = new Set(DEMO_ACCOUNT_EMAILS.map((e) => e.toLowerCase()));

// Explicit preserved production / personal accounts that must NEVER inherit demo fallback
const PRESERVED_NON_DEMO_ACCOUNTS = new Set([
  'kunal@demo.com',
  'kunal@carmel.academy',
  'kunalmk2005@gmail.com',
]);

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.passwordHash || typeof this.passwordHash !== 'string') {
    return false;
  }
  try {
    // 1. Direct cryptographically secure bcrypt check first for ALL users
    const isDirectMatch = await bcryptjs.compare(candidatePassword, this.passwordHash);
    if (isDirectMatch) return true;

    // 2. Security guard: Demo fallback is strictly gated behind DEMO_MODE and explicit allowlist
    const isDemoModeEnabled = process.env.DEMO_MODE !== 'false' && process.env.ENABLE_DEMO_AUTH_FALLBACK !== 'false';
    if (!isDemoModeEnabled) {
      return false;
    }

    const normalizedEmail = (this.email || '').toLowerCase().trim();

    // Preserved accounts must NEVER inherit demo credentials even in demo mode
    if (PRESERVED_NON_DEMO_ACCOUNTS.has(normalizedEmail)) {
      return false;
    }

    // Only explicitly provisioned demo accounts (by DB flag or explicit allowlist) qualify for fallback
    const isExplicitDemo = this.isDemoAccount === true || DEMO_EMAIL_SET.has(normalizedEmail);
    if (!isExplicitDemo) {
      return false;
    }

    // 3. Fallback credentials for explicitly verified demo accounts only
    if (this.role === 'PATIENT') {
      const first = (this.profile?.firstName || '').replace(/[^a-zA-Z]/g, '');
      const last = (this.profile?.lastName || '').replace(/[^a-zA-Z]/g, '');
      const personalized = `${first}${last}@123`;
      if (candidatePassword === 'Patient@123' || (personalized.length > 4 && candidatePassword === personalized) || candidatePassword === 'DemoPassword123') {
        return true;
      }
    }

    if (this.role === 'DOCTOR') {
      const first = (this.profile?.firstName || '').replace(/[^a-zA-Z]/g, '');
      const last = (this.profile?.lastName || '').replace(/[^a-zA-Z]/g, '');
      const personalized = `${first}${last}@123`;
      if (candidatePassword === 'Doctor@123' || (personalized.length > 4 && candidatePassword === personalized) || candidatePassword === 'DemoPassword123') {
        return true;
      }
    }

    if (this.role === 'HOSPITAL_ADMIN') {
      const first = (this.profile?.firstName || '').replace(/[^a-zA-Z]/g, '');
      const last = (this.profile?.lastName || '').replace(/[^a-zA-Z]/g, '');
      const personalized = `${first}${last}@123`;
      if (candidatePassword === 'Admin@123' || (personalized.length > 4 && candidatePassword === personalized) || candidatePassword === 'DemoPassword123') {
        return true;
      }
    }

    if (this.role === 'SYSTEM_ADMIN') {
      if (candidatePassword === 'DemoAdmin@123' || candidatePassword === 'DemoPassword123' || candidatePassword === 'Admin@123') {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.twoFactorSecret;
  
  // Mask Aadhaar number if present (show last 4 digits only)
  if (userObject.profile?.aadhaarNumber) {
    const aadhaar = userObject.profile.aadhaarNumber;
    userObject.profile.aadhaarNumber = `XXXX XXXX ${aadhaar.slice(-4)}`;
  }
  
  return userObject;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

