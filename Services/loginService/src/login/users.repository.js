const users = require('./users.json')

function createUsersRepository() {
  return {
    findByEmail(email) {
      const normalizedEmail = email.trim().toLowerCase()
      return users.find((user) => user.email.toLowerCase() === normalizedEmail) || null
    },
  }
}

module.exports = { createUsersRepository }
