function createAuthService({ jwtService, usersRepository }) {
  return {
    async login({ email, password }) {
      if (!email || !password) {
        throw invalidCredentials()
      }

      const user = await usersRepository.findByEmail(email)
      const passwordMatches = user ? user.password === password : false

      if (!user || !passwordMatches) {
        throw invalidCredentials()
      }

      const tokenUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
      }

      return {
        token: jwtService.signForUser(tokenUser),
      }
    },
  }
}

function invalidCredentials() {
  const error = new Error('Invalid credentials')
  error.code = 'INVALID_CREDENTIALS'
  return error
}

module.exports = { createAuthService }
