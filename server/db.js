
const mongoose = require('mongoose');

// --- CONFIGURATION ---
const SYSTEM_VERSION = '4.5.0-NEURAL';

// --- Shared Sub-Schemas ---

// GeoJSON Point for military-grade spatial queries
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

// --- User Schema: The Operator ---
// Stores profile, credentials, MFA secrets, and progressive career stats
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    minlength: 3,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  avatarUrl: {
    type: String,
    default: null // Base64 or CDN URL
  },
  
  // -- Auth & Security (Rockhound-GO Auth Spec) --
  roles: [{ 
    type: String, 
    enum: ['user', 'admin', 'scout', 'geologist'], 
    default: ['user'] 
  }],
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, select: false }, // Store TOTP secret
    backupCodes: [String]
  },
  
  // -- Career Progression --
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  rankTitle: { type: String, default: 'Novice Scout' },
  credits: { type: Number, default: 0 },
  
  // -- Tactical Stats --
  operatorStats: {
    totalScans: { type: Number, default: 0 },
    distanceTraveled: { type: Number, default: 0 }, // in km
    uniqueSpeciesFound: { type: Number, default: 0 },
    legendaryFinds: { type: Number, default: 0 },
    highestRarityFound: { type: Number, default: 0 },
    scanStreak: { type: Number, default: 0 }
  },

  // -- Unlocks --
  badges: [{
    id: String,
    dateUnlocked: { type: Date, default: Date.now }
  }],

  // -- System Preferences --
  settings: {
    theme: { type: String, default: 'cyber_dark' },
    hapticsEnabled: { type: Boolean, default: true },
    audioEnabled: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  },

  isAdmin: { type: Boolean, default: false }, // Legacy flag, migrate to roles
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// --- Rock Schema: The Specimen ---
const rockSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  id: { type: String, required: true, unique: true },
  
  name: { type: String, required: true, index: true },
  scientificName: String,
  type: { 
    type: String, 
    required: true,
    enum: ['Igneous', 'Sedimentary', 'Metamorphic', 'Mineral', 'Fossil', 'Unknown', 'Synthetic'] 
  },
  description: String,
  funFact: String,
  
  rarityScore: { type: Number, default: 0, min: 0, max: 100 },
  hardness: { type: Number, default: 0, min: 0, max: 10 },
  color: [String],
  composition: [String],
  
  aiConfidence: { type: Number, default: 0.95 },
  modelVersion: { type: String, default: 'gemini-3-flash' },
  spectralHash: { type: String },
  
  imageUrl: String,
  comparisonImageUrl: String,
  
  location: {
    type: pointSchema,
    index: '2dsphere'
  },
  
  dateFound: { type: Number, default: Date.now, index: -1 },
  status: {
    type: String,
    enum: ['approved', 'pending', 'flagged'],
    default: 'approved'
  },
  
  // Expert fields
  expertExplanation: String,
  petrology: String,
  formationGenesis: String,
  fusionData: mongoose.Schema.Types.Mixed
});

// --- Audit Log Schema ---
// Powers the Admin Dashboard and Security Monitoring
const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, expires: '30d' },
  action: { 
    type: String, 
    required: true,
    enum: [
        'AUTH_REGISTER', 'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAIL', 
        'AUTH_MFA_CHALLENGE', 'AUTH_MFA_SUCCESS', 'AUTH_MFA_FAIL',
        'SCAN_CREATE', 'SCAN_DELETE', 'ADMIN_ACTION', 
        'AI_REQUEST', 'AI_RESPONSE', 'SECURITY_ALERT'
    ]
  },
  severity: { type: String, enum: ['INFO', 'WARN', 'CRITICAL'], default: 'INFO' },
  details: mongoose.Schema.Types.Mixed,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: String
});

rockSchema.index({ 'location.coordinates': '2dsphere' });
rockSchema.index({ type: 1, rarityScore: -1 });

const User = mongoose.model('User', userSchema);
const Rock = mongoose.model('Rock', rockSchema);
const SystemLog = mongoose.model('SystemLog', auditLogSchema);

module.exports = { User, Rock, SystemLog };
