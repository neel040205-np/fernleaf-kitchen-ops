import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums';

describe('RolesGuard — Server-Side Access Control (RBAC)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  const createMockContext = (userRole?: Role): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { id: 'user-1', email: 'test@test.com', role: userRole } : null,
        }),
      }),
    } as any;
  };

  it('should allow access when endpoint requires no specific roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext(Role.KITCHEN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches required ADMIN role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject access with ForbiddenException when user role (KITCHEN) attempts ADMIN endpoint', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.KITCHEN);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject access with ForbiddenException when user role (DRIVER) attempts ADMIN endpoint', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.DRIVER);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
