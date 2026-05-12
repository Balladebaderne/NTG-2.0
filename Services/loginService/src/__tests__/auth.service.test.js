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
    verifyToken: jest.fn().mockReturnValue({ role: 'admin', sub: 'usr_admin' }),
  }
  const usersRepository = {
    create: jest.fn().mockImplementation(async (newUser) => newUser),
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
      customerId: null,
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

  it('includes customerId in tokens for customer-scoped users', async () => {
    const logisticsUser = {
      ...user,
      customerId: 'customer-42',
      role: 'logistics',
      roleLabel: 'Logistics Manager',
    }
    const { authService, jwtService } = createService({ foundUser: logisticsUser })

    await authService.login({
      email: logisticsUser.email,
      password: logisticsUser.password,
    })

    expect(jwtService.signForUser).toHaveBeenCalledWith({
      customerId: 'customer-42',
      id: logisticsUser.id,
      email: logisticsUser.email,
      name: logisticsUser.name,
      role: logisticsUser.role,
      roleLabel: logisticsUser.roleLabel,
    })
  })
})

describe('Auth service user creation', () => {
  it('allows an admin to create a driver login', async () => {
    const { authService, jwtService, usersRepository } = createService()

    const result = await authService.createUser({
      actorToken: 'admin-token',
      user: {
        email: 'NEW.DRIVER@NTG.LOCAL',
        id: 'driver-1',
        name: 'New Driver',
        password: 'driver-secret',
        role: 'driver',
      },
    })

    expect(jwtService.verifyToken).toHaveBeenCalledWith('admin-token')
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'new.driver@ntg.local',
      id: 'driver-1',
      name: 'New Driver',
      password: 'driver-secret',
      role: 'driver',
      roleLabel: 'Driver',
    })
    expect(result).toEqual({
      user: {
        email: 'new.driver@ntg.local',
        id: 'driver-1',
        name: 'New Driver',
        role: 'driver',
        roleLabel: 'Driver',
      },
    })
  })

  it('sets customerId for customer logins', async () => {
    const { authService, usersRepository } = createService()

    await authService.createUser({
      actorToken: 'admin-token',
      user: {
        email: 'customer2@ntg.local',
        id: 'customer-2',
        name: 'Customer Two',
        password: 'customer-secret',
        role: 'customer',
      },
    })

    expect(usersRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-2',
      id: 'customer-2',
      role: 'customer',
    }))
  })

  it('requires customerId for logistics logins', async () => {
    const { authService, usersRepository } = createService()

    await expect(authService.createUser({
      actorToken: 'admin-token',
      user: {
        email: 'logistics2@ntg.local',
        name: 'Logistics Two',
        password: 'logistics-secret',
        role: 'logistics',
      },
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })

    expect(usersRepository.create).not.toHaveBeenCalled()
  })

  it('rejects non-admin creators', async () => {
    const { authService, jwtService, usersRepository } = createService()
    jwtService.verifyToken.mockReturnValue({ role: 'support', sub: 'usr_support' })

    await expect(authService.createUser({
      actorToken: 'support-token',
      user: {
        email: 'driver2@ntg.local',
        id: 'driver-2',
        name: 'Driver Two',
        password: 'driver-secret',
        role: 'driver',
      },
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })

    expect(usersRepository.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate emails from the repository', async () => {
    const { authService, usersRepository } = createService()
    const error = new Error('Duplicate email')
    error.code = 'DUPLICATE_EMAIL'
    usersRepository.create.mockRejectedValue(error)

    await expect(authService.createUser({
      actorToken: 'admin-token',
      user: {
        email: 'driver2@ntg.local',
        id: 'driver-2',
        name: 'Driver Two',
        password: 'driver-secret',
        role: 'driver',
      },
    })).rejects.toMatchObject({ code: 'DUPLICATE_EMAIL' })
  })
})
