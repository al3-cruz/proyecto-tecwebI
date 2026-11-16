import type { ModoRutaGps } from './dto/calcular-ruta-gps.dto';

export interface Coordenada {
  latitud: number;
  longitud: number;
}

export interface GeometriaGeoJson {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface PasoNavegacion {
  instrucciones: string;
  nombreCalle: string;
  distanciaMetros: number;
  duracionSegundos: number;
}

export interface ResultadoRutaOsrm {
  distanciaMetros: number;
  duracionSegundos: number;
  geometriaGeoJson: GeometriaGeoJson;
  pasosNavegacion: PasoNavegacion[];
}

export interface ResultadoRutaGps {
  distanciaMetros: number;
  duracionSegundos: number | null;
  geometriaGeoJson: GeometriaGeoJson | null;
  pasosNavegacion: PasoNavegacion[];
  googleMapsUrl: string;
}

const RADIO_TIERRA_METROS = 6_371_000;

export function calcularDistanciaHaversine(
  origen: Coordenada,
  destino: Coordenada,
): number {
  const latitudOrigen = gradosARadianes(origen.latitud);
  const latitudDestino = gradosARadianes(destino.latitud);
  const diferenciaLatitud = gradosARadianes(
    destino.latitud - origen.latitud,
  );
  const diferenciaLongitud = gradosARadianes(
    destino.longitud - origen.longitud,
  );
  const a =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(latitudOrigen) *
      Math.cos(latitudDestino) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  return Math.round(
    2 * RADIO_TIERRA_METROS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

export function crearGoogleMapsUrl(
  origen: Coordenada,
  destino: Coordenada,
  modo: ModoRutaGps,
): string {
  const travelMode = modo === 'foot' ? 'walking' : 'driving';
  return `https://www.google.com/maps/dir/?api=1&origin=${origen.latitud},${origen.longitud}&destination=${destino.latitud},${destino.longitud}&travelmode=${travelMode}`;
}

function gradosARadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}
