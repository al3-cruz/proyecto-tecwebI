import { Test, TestingModule } from "@nestjs/testing";
import { DireccionesController } from "./direcciones.controller";
import { DireccionesService } from "./direcciones.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service.js";

describe("DireccionesController", () => {
  let controller: DireccionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DireccionesController],
      providers: [
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: PrismaService, useValue: { usuario: { findFirst: jest.fn() } } },
        {
          provide: DireccionesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            replace: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DireccionesController>(DireccionesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
