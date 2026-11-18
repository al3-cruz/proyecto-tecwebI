import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  EstadoTramite,
  TipoRequisitoCompraventa,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CompraventasService } from "./compraventas.service.js";

describe("CompraventasService", () => {
  let service: CompraventasService;

  const tx = {
    secuenciaTramiteCompraventa: { upsert: jest.fn() },
    tramiteCompraventa: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    requisitoCompraventa: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    mensajeTramite: {
      create: jest.fn(),
    },
  };
  const prismaMock = {
    $transaction: jest.fn(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    tramiteCompraventa: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompraventasService(prismaMock as unknown as PrismaService);
  });

  it("creates a unique code and all base requirements in one transaction", async () => {
    tx.secuenciaTramiteCompraventa.upsert.mockResolvedValue({
      anio: 2026,
      ultimo: 3,
    });
    tx.tramiteCompraventa.create.mockResolvedValue({ id: 8 });

    await service.crear(
      {
        folioReal: "1.01.1.01.0001234",
        vendedorNombre: "Vendedora",
        vendedorDocumento: "123456",
        compradorNombre: "Comprador",
        compradorDocumento: "654321",
        esBienGanancial: false,
        conApoderado: false,
        montoArancel: 900,
        observaciones: "Revisar el documento original.",
      },
      7,
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.tramiteCompraventa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codigoTramite: "DDRR-CV-2026-0003",
          usuarioId: 7,
          bitacora: {
            create: {
              autorId: 7,
              mensaje: "Revisar el documento original.",
            },
          },
          requisitos: {
            create: [
              { tipoRequisito: TipoRequisitoCompraventa.TITULO_TRANSFERENCIA },
              { tipoRequisito: TipoRequisitoCompraventa.IMPUESTO_ANUAL_IMPBI },
              {
                tipoRequisito: TipoRequisitoCompraventa.IMPUESTO_TRANSFERENCIA,
              },
              {
                tipoRequisito:
                  TipoRequisitoCompraventa.PLANO_Y_CERTIFICADO_CATASTRAL,
              },
              {
                tipoRequisito: TipoRequisitoCompraventa.CEDULA_IDENTIDAD_O_NIT,
              },
            ],
          },
        }),
      }),
    );
  });

  it("adds the power document and rejects missing attorney data", async () => {
    await expect(
      service.crear(
        {
          folioReal: "folio",
          vendedorNombre: "Vendedora",
          vendedorDocumento: "123",
          compradorNombre: "Comprador",
          compradorDocumento: "456",
          esBienGanancial: false,
          conApoderado: true,
          montoArancel: 900,
        },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    tx.secuenciaTramiteCompraventa.upsert.mockResolvedValue({
      anio: 2026,
      ultimo: 1,
    });
    tx.tramiteCompraventa.create.mockResolvedValue({ id: 9 });
    await service.crear(
      {
        folioReal: "folio",
        vendedorNombre: "Vendedora",
        vendedorDocumento: "123",
        compradorNombre: "Comprador",
        compradorDocumento: "456",
        esBienGanancial: false,
        conApoderado: true,
        apoderadoNombre: "Apoderado",
        apoderadoDocumento: "789",
        numeroPoderNotarial: "P-10",
        montoArancel: 900,
      },
      7,
    );

    expect(tx.tramiteCompraventa.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requisitos: {
            create: expect.arrayContaining([
              {
                tipoRequisito: TipoRequisitoCompraventa.PODER_NOTARIADO,
              },
            ]),
          },
        }),
      }),
    );
  });

  it("only advances after every required document is verified", async () => {
    tx.tramiteCompraventa.findFirst.mockResolvedValue({
      id: 1,
      estado: EstadoTramite.VENTANILLA_INFORMACIONES,
      requisitos: [
        {
          tipoRequisito: TipoRequisitoCompraventa.TITULO_TRANSFERENCIA,
          verificado: false,
          presentoOriginal: false,
          cantidadFotocopias: 0,
        },
      ],
      conApoderado: false,
    });

    await expect(
      service.avanzarEtapa(
        1,
        { estado: EstadoTramite.INSCRIPCION_RAPIDA },
        7,
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.tramiteCompraventa.update).not.toHaveBeenCalled();
  });

  it("does not advance when the required checklist is incomplete", async () => {
    tx.tramiteCompraventa.findFirst.mockResolvedValue({
      id: 1,
      estado: EstadoTramite.VENTANILLA_INFORMACIONES,
      requisitos: [],
      conApoderado: false,
    });

    await expect(
      service.avanzarEtapa(
        1,
        { estado: EstadoTramite.INSCRIPCION_RAPIDA },
        7,
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.tramiteCompraventa.update).not.toHaveBeenCalled();
  });

  it("does not let a user read a compraventa owned by another user", async () => {
    prismaMock.tramiteCompraventa.findFirst.mockResolvedValue(null);

    await expect(service.obtener(1, 7, false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.tramiteCompraventa.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, usuarioId: 7 } }),
    );
  });

  it("stores updated observations as authored bitacora messages", async () => {
    tx.tramiteCompraventa.findFirst.mockResolvedValue({
      id: 1,
      estado: EstadoTramite.VENTANILLA_INFORMACIONES,
      arancelPagado: false,
      requisitos: [],
    });
    tx.mensajeTramite.create.mockResolvedValue({ id: 2 });
    tx.tramiteCompraventa.update.mockResolvedValue({ id: 1 });

    await service.actualizar(
      1,
      { observaciones: "Documento verificado." },
      7,
      false,
    );

    expect(tx.mensajeTramite.create).toHaveBeenCalledWith({
      data: {
        tramiteId: 1,
        autorId: 7,
        mensaje: "Documento verificado.",
      },
    });
    expect(tx.tramiteCompraventa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {},
      }),
    );
  });

  it("blocks deletion after registry processing has started", async () => {
    tx.tramiteCompraventa.findFirst.mockResolvedValue({
      id: 1,
      estado: EstadoTramite.EN_PROCESO_REGISTRO,
      requisitos: [],
    });

    await expect(service.eliminar(1, 7, false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.tramiteCompraventa.delete).not.toHaveBeenCalled();
  });
});
