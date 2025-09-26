const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = (passport) => {
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { googleId: profile.id }
      });

      if (user) {
        // Update user info if needed
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: profile.displayName,
            avatar: profile.photos[0]?.value,
            updatedAt: new Date()
          }
        });
        return done(null, user);
      }

      // Check if user exists with the same email
      user = await prisma.user.findUnique({
        where: { email: profile.emails[0].value }
      });

      if (user) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.id,
            avatar: profile.photos[0]?.value,
            updatedAt: new Date()
          }
        });
        return done(null, user);
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
          role: 'INTERN'
        }
      });

      return done(null, user);
    } catch (error) {
      console.error('Google strategy error:', error);
      return done(error, null);
    }
  }));

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: require('../utils/jwt').JWT_SECRET
  },
  async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });

      if (user && user.isActive) {
        return done(null, user);
      }

      return done(null, false);
    } catch (error) {
      console.error('JWT strategy error:', error);
      return done(error, false);
    }
  }));
};
