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
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
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
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
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
      createdFromIp: String,
      lastLoginIp: String,
      loginAttempts: {
        type: Number,
        default: 0,
      },
      lastLoginAttemptAt: Date,
      lockedUntil: Date,
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

  try {
    const salt = await bcryptjs.genSalt(10);
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.twoFactorSecret;
  return userObject;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

