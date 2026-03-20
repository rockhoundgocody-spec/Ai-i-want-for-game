
/**
 * RockHound GO // NEURAL NET CORE
 * Version: 4.5.1-SECURE
 * Status: ONLINE
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const compression = require('compression');
const NodeCache = require('node-cache');
const { User, Rock, SystemLog } = require('./db');

const app = express();
const cache = new NodeCache({ stdTTL: 60 });
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rockhound-neural-key-v4';
const MFA_ISSUER = 'RockHound-GO';

// --- MIDDLEWARE STACK ---
app.use(compression());
const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); 

// --- AUDIT LOGGER ---
const logAudit = async (action, severity, details, userId, req) => {
    try {
        await new SystemLog({
            action,
            severity,
            details,
            userId,
            ip: req?.ip || '0.0.0.0'
        }).save();
    } catch (e) {
        console.error("AUDIT LOG FAILURE", e);
    }
};

// --- RATE LIMITING ---
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "UPLINK SATURATION DETECTED. COOLDOWN ACTIVE." }
});
app.use('/api/', apiLimiter);

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rockhound', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ NEURAL DATABASE LINKED'))
.catch(err => console.error('❌ DB CONNECTION FAILURE:', err));

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "SIGNAL LOST: AUTH REQUIRED" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "ACCESS DENIED: INVALID TOKEN" });
    req.user = user;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (!user.isAdmin && !user.roles.includes('admin'))) {
            return res.status(403).json({ message: "CLEARANCE LEVEL INSUFFICIENT" });
        }
        next();
    } catch (e) {
        res.status(500).json({ message: "ADMIN VERIFICATION FAILED" });
    }
};

// --- ROUTES ---

// 1. REGISTRATION
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body; 
    
    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(400).json({ message: 'IDENTITY ALREADY REGISTERED' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isFirst = (await User.countDocuments()) === 0;
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isAdmin: isFirst,
      roles: isFirst ? ['admin', 'user'] : ['user'],
      settings: { theme: 'cyber_dark' }
    });

    await user.save();
    await logAudit('AUTH_REGISTER', 'INFO', { email }, user._id, req);

    const token = jwt.sign({ id: user._id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'REGISTRATION PROTOCOL FAILED', error: error.message });
  }
});

// 2. LOGIN (MFA Aware)
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +mfa.secret');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await logAudit('AUTH_LOGIN_FAIL', 'WARN', { email }, null, req);
      return res.status(400).json({ message: 'INVALID CREDENTIALS' });
    }

    // MFA CHECK
    if (user.mfa && user.mfa.enabled) {
        // Issue temporary token for MFA verification step
        const tempToken = jwt.sign({ id: user._id, stage: 'mfa_pending' }, JWT_SECRET, { expiresIn: '5m' });
        await logAudit('AUTH_MFA_CHALLENGE', 'INFO', { userId: user._id }, user._id, req);
        return res.json({ mfaRequired: true, tempToken });
    }

    // NORMAL LOGIN SUCCESS
    user.lastLogin = Date.now();
    await user.save();
    await logAudit('AUTH_LOGIN_SUCCESS', 'INFO', { method: 'password' }, user._id, req);

    const token = jwt.sign({ id: user._id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'LOGIN SEQUENCE ABORTED', error: error.message });
  }
});

// 3. MFA VERIFY (Second Factor)
app.post('/auth/mfa/verify', async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        // Verify temp token
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (decoded.stage !== 'mfa_pending') return res.status(401).json({ message: "INVALID SESSION" });

        const user = await User.findById(decoded.id).select('+mfa.secret');
        
        // MOCK TOTP VERIFICATION (In production use 'otplib' or similar)
        // For demo: verify if code is 6 digits. In a real app, verify(code, user.mfa.secret)
        const isValid = /^\d{6}$/.test(code); 

        if (!isValid) {
            await logAudit('AUTH_MFA_FAIL', 'WARN', {}, user._id, req);
            return res.status(400).json({ message: "INVALID MFA CODE" });
        }

        user.lastLogin = Date.now();
        await user.save();
        await logAudit('AUTH_MFA_SUCCESS', 'INFO', {}, user._id, req);

        const token = jwt.sign({ id: user._id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: sanitizeUser(user) });
    } catch (e) {
        res.status(401).json({ message: "SESSION EXPIRED" });
    }
});

// 4. MFA ENROLL (Enable)
app.post('/auth/mfa/enroll', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        // Generate mock secret
        user.mfa.enabled = true;
        user.mfa.secret = "MOCK_SECRET_BASE32"; 
        await user.save();
        await logAudit('SECURITY_ALERT', 'INFO', { msg: "MFA Enabled" }, user._id, req);
        res.json({ message: "MFA PROTOCOL ACTIVE", user: sanitizeUser(user) });
    } catch (e) {
        res.status(500).json({ message: "ENROLLMENT FAILED" });
    }
});

// 5. GATEWAY OBSERVER (AI Logging)
app.post('/api/gateway/log', authenticateToken, async (req, res) => {
    try {
        const { model, tokens, intent } = req.body;
        await logAudit('AI_REQUEST', 'INFO', { model, tokens, intent }, req.user.id, req);
        res.json({ status: "LOGGED" });
    } catch (e) {
        res.status(200).json({ status: "OK" }); // Fail open
    }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/stats', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const cachedStats = cache.get("admin_stats");
        if (cachedStats) return res.json(cachedStats);

        const [totalUsers, activeUsers, totalRocks] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 86400000) } }),
            Rock.countDocuments()
        ]);

        const recentLogs = await SystemLog.find().sort({ timestamp: -1 }).limit(20);
        
        const activityData = await Rock.aggregate([
            { $match: { dateFound: { $gte: new Date(Date.now() - 7 * 86400000).getTime() } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$dateFound" } } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const locations = await Rock.find({ 'location.type': 'Point' }, { 'location': 1 }).limit(500)
            .then(docs => docs.map(d => ({ lat: d.location.coordinates[1], lng: d.location.coordinates[0] })));

        const stats = { totalUsers, activeUsers, totalRocks, activityData, locations, logs: recentLogs };
        cache.set("admin_stats", stats);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'STATS AGGREGATION FAILED', error: error.message });
    }
});

// --- ROCK DATA ROUTES ---

app.get('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rocks = await Rock.find({ userId: req.user.id }).sort({ dateFound: -1 });
    const formattedRocks = rocks.map(r => ({
        ...r.toObject(),
        location: r.location ? { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } : null
    }));
    res.json(formattedRocks);
  } catch (error) {
    res.status(500).json({ message: 'VAULT ACCESS DENIED' });
  }
});

app.post('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rockData = req.body;
    let location = undefined;
    if (rockData.location) {
        location = { type: 'Point', coordinates: [rockData.location.lng, rockData.location.lat] };
    }

    const newRock = new Rock({
      ...rockData,
      userId: req.user.id,
      location,
      dateFound: rockData.dateFound || Date.now()
    });
    
    await newRock.save();
    await logAudit('SCAN_CREATE', 'INFO', { rockId: newRock.id, type: newRock.type }, req.user.id, req);
    
    // Gamification
    const user = await User.findById(req.user.id);
    let userStats = null;
    if (user) {
      const xpGained = 50 + (rockData.rarityScore || 0);
      user.xp += xpGained;
      user.level = Math.floor(user.xp / 100) + 1;
      
      if (!user.operatorStats) user.operatorStats = {};
      user.operatorStats.totalScans = (user.operatorStats.totalScans || 0) + 1;
      if (rockData.rarityScore > 90) user.operatorStats.legendaryFinds = (user.operatorStats.legendaryFinds || 0) + 1;

      await user.save();
      userStats = { xp: user.xp, level: user.level, xpGained, leveledUp: false }; // simplified
    }

    cache.del("admin_stats");
    res.status(201).json({ rock: newRock, userStats });
  } catch (error) {
    res.status(500).json({ message: 'DATA UPLOAD FAILED', error: error.message });
  }
});

app.delete('/api/rocks/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Rock.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'ASSET NOT FOUND' });
    await logAudit('SCAN_DELETE', 'WARN', { rockId: req.params.id }, req.user.id, req);
    cache.del("admin_stats");
    res.json({ message: 'ASSET PURGED' });
  } catch (error) {
    res.status(500).json({ message: 'PURGE PROTOCOL FAILED' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
      const { username, email, avatarUrl } = req.body;
      const updatedUser = await User.findByIdAndUpdate(req.user.id, { username, email, avatarUrl }, { new: true });
      res.json(sanitizeUser(updatedUser));
    } catch (e) { res.status(500).json({ message: "UPDATE FAILED" }); }
});

const sanitizeUser = (user) => {
    const u = user.toObject();
    delete u.password;
    delete u.mfa?.secret; 
    return u;
};

app.listen(PORT, () => {
  console.log(`🚀 SYSTEM ONLINE :: PORT ${PORT} :: SECURE`);
});
