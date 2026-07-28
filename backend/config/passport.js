import passport from 'passport'
import google from 'passport-google-oauth20'
import prisma from '../lib/prisma.js'
import { SEVEN_DAYS_IN_MS } from '../constants/index.js'

const GoogleStrategy = google.Strategy

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${process.env.PORT}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let activeUser

        const oAuthAccount = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: profile.provider,
              providerAccountId: profile.id,
            },
          },
          include: {
            user: true,
          },
        })

        if (!oAuthAccount) {
          const usernameFallBack = profile.displayName || profile.firstName || 'E-Commerce-User'

          const newOauthAccount = await prisma.oAuthAccount.create({
            data: {
              provider: profile.provider,
              providerAccountId: profile.id,
              user: {
                create: {
                  username: usernameFallBack,
                  firstName: profile.name.givenName,
                  lastName: profile.name.familyName,
                  email: profile.emails[0].value,
                  role: 'customer',
                },
              },
            },
            include: {
              user: true,
            },
          })

          activeUser = newOauthAccount.user
        } else {
          activeUser = oAuthAccount.user
        }

        const session = await prisma.session.create({
          data: {
            userId: activeUser.id,
            expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS),
          },
        })

        const user = {
          userId: activeUser.id,
          role: activeUser.role,
          sessionId: session.id,
        }

        return done(null, user)
      } catch (error) {
        return done(error, null)
      }
    },
  ),
)

export default passport
