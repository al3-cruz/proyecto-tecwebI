import { Test, TestingModule } from "@nestjs/testing";
import { TramitesController } from "./tramites.controller";
import { TramitesService } from "./tramites.service";
import { JwtService } from "@nestjs/jwt";
import { REQUIRED_ROLES } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

describe("TramitesController", () => {
  let controller: TramitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TramitesController],
      providers: [
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: RolesGuard, useValue: { canActivate: jest.fn() } },
        {
          provide: PrismaService,
          useValue: { usuario: { findUnique: jest.fn() } },
        },
        {
          provide: TramitesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            replace: jest.fn(),
            update: jest.fn(),
            agregarRequisito: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TramitesController>(TramitesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it.each([
    "create",
    "updateFull",
    "updatePartial",
    "agregarRequisito",
    "remove",
  ])("%s is restricted to administrators", (method) => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES, TramitesController.prototype[method]),
    ).toEqual(["ADMIN"]);
  });

  it("restricts global catalog statistics to administrators", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_ROLES,
        Object.getOwnPropertyDescriptor(
          TramitesController.prototype,
          "obtenerEstadisticas",
        )?.value,
      ),
    ).toEqual(["ADMIN"]);
  });
});
