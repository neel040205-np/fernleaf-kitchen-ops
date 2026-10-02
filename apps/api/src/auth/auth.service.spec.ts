import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'admin@test.com',
    name: 'Admin User',
    passwordHash: '',
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Test@1234', 10);
  });

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate with valid credentials and return JWT token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'admin@test.com',
        password: 'Test@1234',
      });

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token');
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: Role.ADMIN,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'wrong@test.com', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'admin@test.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
