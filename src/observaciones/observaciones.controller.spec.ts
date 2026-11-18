import { Test, TestingModule } from "@nestjs/testing";
import { ObservacionesController } from "./observaciones.controller";
import { ObservacionesService } from "./observaciones.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service.js";

describe("ObservacionesController", () => {
  let controller: ObservacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservacionesController],
      providers: [
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: PrismaService, useValue: { usuario: { findFirst: jest.fn() } } },
        {
          provide: ObservacionesService,
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

    controller = module.get<ObservacionesController>(ObservacionesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
