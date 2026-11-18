import { Test, TestingModule } from "@nestjs/testing";
import { EventosController } from "./eventos.controller";
import { EventosService } from "./eventos.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service.js";

describe("EventosController", () => {
  let controller: EventosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [
        EventosService,
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: PrismaService, useValue: { usuario: { findFirst: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<EventosController>(EventosController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
