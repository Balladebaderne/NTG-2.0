const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { createUsersRepository } = require('../login/users.repository')

async function createTempUsersFile(users) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ntg-users-'))
  const filePath = path.join(dir, 'users.json')
  await fs.writeFile(filePath, `${JSON.stringify(users, null, 2)}\n`)
  return filePath
}

describe('Users repository', () => {
  it('finds users by email case-insensitively', async () => {
    const filePath = await createTempUsersFile([
      { id: 'usr_one', email: 'One@ntg.local', password: 'secret' },
    ])
    const repository = createUsersRepository({ filePath })

    const user = await repository.findByEmail('one@NTG.local')

    expect(user).toEqual({ id: 'usr_one', email: 'One@ntg.local', password: 'secret' })
  })

  it('persists created users to the json file', async () => {
    const filePath = await createTempUsersFile([])
    const repository = createUsersRepository({ filePath })

    await repository.create({
      email: 'new@ntg.local',
      id: 'usr_new',
      name: 'New User',
      password: 'secret',
      role: 'customer',
      roleLabel: 'Customer',
    })

    const contents = JSON.parse(await fs.readFile(filePath, 'utf8'))
    expect(contents).toEqual([
      {
        email: 'new@ntg.local',
        id: 'usr_new',
        name: 'New User',
        password: 'secret',
        role: 'customer',
        roleLabel: 'Customer',
      },
    ])
  })

  it('rejects duplicate emails', async () => {
    const filePath = await createTempUsersFile([
      { id: 'usr_existing', email: 'existing@ntg.local', password: 'secret' },
    ])
    const repository = createUsersRepository({ filePath })

    await expect(repository.create({
      email: 'EXISTING@ntg.local',
      id: 'usr_new',
      name: 'Duplicate User',
      password: 'secret',
      role: 'driver',
      roleLabel: 'Driver',
    })).rejects.toMatchObject({ code: 'DUPLICATE_EMAIL' })
  })
})
