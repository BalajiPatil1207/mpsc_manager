const { db } = require('../config/firebase');

exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      // Default guest / aspirant feature structure
      return res.json({ 
        success: true, 
        data: { 
          id: userId, 
          features: { ticker: false, quoteNotifications: false } 
        } 
      });
    }

    const userData = doc.data() || {};
    const email = (userData.email || '').toLowerCase().trim();
    
    // Auto-resolve special features from DB or default privileges
    const features = {
      ticker: userData.features?.ticker ?? (email === 'balu@gmail.com'),
      quoteNotifications: userData.features?.quoteNotifications ?? (email === 'balu@gmail.com'),
      ...(userData.features || {})
    };

    res.json({ success: true, data: { id: doc.id, ...userData, features } });
  } catch(err) {
    next(err);
  }
};

exports.syncUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email, displayName, features: incomingFeatures } = req.body;
    
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const existing = doc.exists ? doc.data() : {};

    const cleanEmail = (email || existing.email || '').toLowerCase().trim();
    
    const finalFeatures = {
      ...(existing.features || {}),
      ...(incomingFeatures || {})
    };

    // Guarantee privileges for administrator / designated accounts
    if (cleanEmail === 'balu@gmail.com') {
      finalFeatures.ticker = true;
      finalFeatures.quoteNotifications = true;
    }

    const profileData = {
      email: cleanEmail,
      displayName: displayName || existing.displayName || 'Aspirant',
      features: finalFeatures,
      updatedAt: new Date().toISOString()
    };

    await userRef.set(profileData, { merge: true });
    res.json({ success: true, data: { id: userId, ...profileData } });
  } catch(err) {
    next(err);
  }
};
