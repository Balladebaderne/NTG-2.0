const fs = require('fs/promises')
const path = require('path')

const defaultUsersFilePath = path.join(__dirname, 'users.json')

async function readUsers(filePath) {
  const contents = await fs.readFile(filePath, 'utf8')
  return JSON.parse(contents)
}

async function writeUsers(filePath, users) {
  await fs.writeFile(filePath, `${JSON.stringify(users, null, 2)}\n`)
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function createUsersRepository({ filePath = defaultUsersFilePath } = {}) {
  return {
    async findByEmail(email) {
      const users = await readUsers(filePath)
      const normalizedEmail = normalizeEmail(email)
      return users.find((user) => user.email.toLowerCase() === normalizedEmail) || null
    },
    async create(user) {
      const users = await readUsers(filePath)
      const normalizedEmail = normalizeEmail(user.email)
      const duplicateEmail = users.some((existing) => normalizeEmail(existing.email) === normalizedEmail)
      const duplicateId = users.some((existing) => String(existing.id) === String(user.id))

      if (duplicateEmail || duplicateId) {
        const error = new Error('User already exists')
        error.code = duplicateEmail ? 'DUPLICATE_EMAIL' : 'DUPLICATE_ID'
        throw error
      }

      const savedUser = { ...user, email: normalizedEmail }
      await writeUsers(filePath, [...users, savedUser])
      return savedUser
    },
  }
}

module.exports = { createUsersRepository }
