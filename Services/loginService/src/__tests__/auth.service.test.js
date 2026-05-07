const { createAuthService } = require('../login/auth.service')

const user = {
  id: 'usr_test',
  email: 'test@ntg.local',
  name: 'Test User',
  password: 'secret123',
  role: 'support',
  roleLabel: 'Customer Support',
}

function createService({ foundUser = user } = {}) {
  const jwtService = {
    signForUser: jest.fn().mockReturnValue('signed-token'),
  }
  const usersRepository = {
    findByEmail: jest.fn().mockResolvedValue(foundUser),
  }

  return {
    authService: createAuthService({ jwtService, usersRepository }),
    jwtService,
    usersRepository,
  }
}

describe('Auth service', () => {
  it('returns a token for valid credentials', async () => {
    const { authService, jwtService, usersRepository } = createService()

    const result = await authService.login({
      email: user.email,
      password: user.password,
    })

    expect(result).toEqual({ token: 'signed-token' })
    expect(usersRepository.findByEmail).toHaveBeenCalledWith(user.email)
    expect(jwtService.signForUser).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleLabel: user.roleLabel,
    })
  })

  it('rejects unknown email addresses', async () => {
    const { authService, jwtService } = createService({ foundUser: null })

    await expect(
      authService.login({
        email: 'unknown@ntg.local',
        password: user.password,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(jwtService.signForUser).not.toHaveBeenCalled()
  })

  it('rejects invalid passwords', async () => {
    const { authService, jwtService } = createService()

    await expect(
      authService.login({
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(jwtService.signForUser).not.toHaveBeenCalled()
  })

  it('rejects missing credentials', async () => {
    const { authService, usersRepository } = createService()

    await expect(authService.login({ email: '', password: '' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })

    expect(usersRepository.findByEmail).not.toHaveBeenCalled()
  })
})
