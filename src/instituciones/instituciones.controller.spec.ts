import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { REQUIRED_ROLES } from "../auth/roles.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { InstitucionesController } from "./instituciones.controller.js";
import { InstitucionesService } from "./instituciones.service.js";

describe("InstitucionesController", () => {
  let controller: InstitucionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitucionesController],
      providers: [
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: RolesGuard, useValue: { canActivate: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        {
          provide: PrismaService,
          useValue: { usuario: { findUnique: jest.fn() } },
        },
        {
          provide: InstitucionesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InstitucionesController>(InstitucionesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it.each(["create", "remove"])(
    "%s is restricted to administrators",
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(
        InstitucionesController.prototype,
        method,
      )?.value;
      expect(Reflect.getMetadata(REQUIRED_ROLES, handler)).toEqual(["ADMIN"]);
    },
  );

  it("allows authenticated users to list institutions without an admin role", () => {
    const handler = Object.getOwnPropertyDescriptor(
      InstitucionesController.prototype,
      "findAll",
    )?.value;
    expect(Reflect.getMetadata(REQUIRED_ROLES, handler)).toBeUndefined();
  });
});
