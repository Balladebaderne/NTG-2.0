const jwt = require('jsonwebtoken')

function createJwtService({ expiresIn, secret }) {
  return {
    signForUser(user) {
      return jwt.sign(
        {
          customerId: user.customerId || null,
          email: user.email,
          name: user.name,
          role: user.role,
          roleLabel: user.roleLabel,
        },
        secret,
        {
          expiresIn,
          subject: user.id,
        },
      )
    },
    verifyToken(token) {
      return jwt.verify(token, secret)
    },
  }
}

module.exports = { createJwtService }
