import { Test, TestingModule } from "@nestjs/testing";
import { TareasController } from "./tareas.controller";
import { TareasService } from "./tareas.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JwtService } from "@nestjs/jwt";

describe("TareasController", () => {
  let controller: TareasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TareasController],
      providers: [
        TareasService,
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    controller = module.get<TareasController>(TareasController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
