export type SlotType = 'morning' | 'afternoon' | 'full_day' | 'custom';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type BookingSource = 'web' | 'phone' | 'whatsapp' | 'walkin';

export interface Reservation {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slotType: SlotType;
  eventType: string;
  guests: number;
  extras: string[];
  notes: string;
  totalPrice: number;
  status: ReservationStatus;
  source: BookingSource;
  createdAt: string;
}

export interface CalendarBlock {
  id: string;
  date: string; // YYYY-MM-DD
  slotType: SlotType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason: string;
  createdAt: string;
}

export interface SlotPreset {
  id: SlotType;
  label: string;
  shortLabel: string;
  defaultStart: string;
  defaultEnd: string;
  weekdayPrice: number;
  weekendPrice: number;
  description: string;
}

export const SLOT_PRESETS: SlotPreset[] = [
  {
    id: 'morning',
    label: 'Turno de Mañana',
    shortLabel: 'Mañana',
    defaultStart: '10:00',
    defaultEnd: '14:30',
    weekdayPrice: 130,
    weekendPrice: 160,
    description: 'Ideal para bautizos, almuerzos familiares y talleres matinales (10:00 a 14:30).',
  },
  {
    id: 'afternoon',
    label: 'Turno de Tarde',
    shortLabel: 'Tarde',
    defaultStart: '16:00',
    defaultEnd: '21:00',
    weekdayPrice: 150,
    weekendPrice: 190,
    description: 'El favorito para cumpleaños infantiles, meriendas y celebraciones (16:00 a 21:00).',
  },
  {
    id: 'full_day',
    label: 'Día Completo',
    shortLabel: 'Día Completo',
    defaultStart: '10:00',
    defaultEnd: '22:00',
    weekdayPrice: 240,
    weekendPrice: 295,
    description: 'Disfruta del espacio sin prisas durante 12 horas continuas (10:00 a 22:00).',
  },
  {
    id: 'custom',
    label: 'Horario a Medida',
    shortLabel: 'Por Horas',
    defaultStart: '17:00',
    defaultEnd: '20:30',
    weekdayPrice: 35, // per hour
    weekendPrice: 45, // per hour
    description: 'Elige exactamente tu hora de entrada y salida (mínimo 3 horas).',
  },
];

export interface ExtraOption {
  id: string;
  label: string;
  price: number;
  detail: string;
}

export const EXTRA_OPTIONS: ExtraOption[] = [
  {
    id: 'limpieza',
    label: 'Servicio de recogida y limpieza integral',
    price: 35,
    detail: 'Olvídate de limpiar al terminar tu evento',
  },
  {
    id: 'arco_globos',
    label: 'Arco orgánico de globos colores La Tribu',
    price: 65,
    detail: 'En tonos verde salvia, amarillo miel y rosa empolvado',
  },
  {
    id: 'mesa_dulce',
    label: 'Montaje de carrito de madera y soportes para mesa dulce',
    price: 40,
    detail: 'Incluye stands de madera natural, bandejas y guirnalda cálida',
  },
];

export const EVENT_TYPES = [
  'Cumpleaños infantil',
  'Primer añito / Baby Shower',
  'Bautizo / Comunión',
  'Reunión familiar / Aniversario',
  'Taller / Evento corporativo',
];

export const AVAILABLE_HOURS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00',
];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

export function isWeekendDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  // Friday (5), Saturday (6), Sunday (0) count as weekend rate
  return day === 0 || day === 5 || day === 6;
}

export function calculateReservationPrice(
  dateStr: string,
  slotType: SlotType,
  startTime: string,
  endTime: string,
  extras: string[]
): number {
  const weekend = isWeekendDate(dateStr);
  const preset = SLOT_PRESETS.find((p) => p.id === slotType) || SLOT_PRESETS[1];
  let base = 0;

  if (slotType === 'custom') {
    const mins = Math.max(180, timeToMinutes(endTime) - timeToMinutes(startTime));
    const hours = mins / 60;
    const hourlyRate = weekend ? preset.weekendPrice : preset.weekdayPrice;
    base = Math.round(hours * hourlyRate);
  } else {
    base = weekend ? preset.weekendPrice : preset.weekdayPrice;
  }

  const extrasTotal = extras.reduce((acc, extId) => {
    const found = EXTRA_OPTIONS.find((e) => e.id === extId);
    return acc + (found ? found.price : 0);
  }, 0);

  return base + extrasTotal;
}

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'res_1001',
    code: 'TRIBU-4821',
    firstName: 'Lucía',
    lastName: 'Martínez Navarro',
    phone: '644 82 19 30',
    email: 'lucia.martinez@ejemplo.es',
    date: '2026-10-03',
    startTime: '16:00',
    endTime: '21:00',
    slotType: 'afternoon',
    eventType: 'Cumpleaños infantil',
    guests: 28,
    extras: ['limpieza', 'arco_globos'],
    notes: 'Cumpleaños de Mateo (3 años). Necesitamos la trona de madera disponible.',
    totalPrice: 290,
    status: 'confirmed',
    source: 'web',
    createdAt: '2026-09-28T14:20:00Z',
  },
  {
    id: 'res_1002',
    code: 'TRIBU-5190',
    firstName: 'Carlos',
    lastName: 'Sánchez Ortega',
    phone: '619 34 70 12',
    email: 'carlos.sanchez@ejemplo.es',
    date: '2026-10-04',
    startTime: '10:00',
    endTime: '14:30',
    slotType: 'morning',
    eventType: 'Bautizo / Comunión',
    guests: 35,
    extras: ['limpieza', 'mesa_dulce'],
    notes: 'Bautizo familiar de Valeria. Llegará catering a las 10:15.',
    totalPrice: 235,
    status: 'pending',
    source: 'web',
    createdAt: '2026-09-29T18:10:00Z',
  },
  {
    id: 'res_1003',
    code: 'TRIBU-5304',
    firstName: 'Elena',
    lastName: 'Gómez Serrano',
    phone: '678 91 04 55',
    email: 'elena.gomez@ejemplo.es',
    date: '2026-10-10',
    startTime: '10:00',
    endTime: '22:00',
    slotType: 'full_day',
    eventType: 'Primer añito / Baby Shower',
    guests: 42,
    extras: ['limpieza', 'arco_globos', 'mesa_dulce'],
    notes: 'Reserva realizada por llamada telefónica. Señal de 100€ abonada por Bizum.',
    totalPrice: 435,
    status: 'confirmed',
    source: 'phone',
    createdAt: '2026-09-29T11:05:00Z',
  },
  {
    id: 'res_1004',
    code: 'TRIBU-5412',
    firstName: 'Javier',
    lastName: 'Ruiz Molina',
    phone: '655 12 88 90',
    email: 'javier.ruiz@ejemplo.es',
    date: '2026-10-17',
    startTime: '16:00',
    endTime: '21:00',
    slotType: 'afternoon',
    eventType: 'Cumpleaños infantil',
    guests: 24,
    extras: ['limpieza'],
    notes: 'Solicitan confirmar si pueden entrar 15 minutos antes para colocar la tarta en nevera.',
    totalPrice: 225,
    status: 'pending',
    source: 'web',
    createdAt: '2026-09-30T09:45:00Z',
  },
];

export const INITIAL_BLOCKS: CalendarBlock[] = [
  {
    id: 'blk_2001',
    date: '2026-10-12',
    slotType: 'full_day',
    startTime: '09:00',
    endTime: '23:00',
    reason: 'Festivo Nacional — Uso privado del local La Tribu',
    createdAt: '2026-09-25T10:00:00Z',
  },
  {
    id: 'blk_2002',
    date: '2026-10-15',
    slotType: 'morning',
    startTime: '10:00',
    endTime: '14:30',
    reason: 'Mantenimiento y revisión zona infantil de madera',
    createdAt: '2026-09-27T12:00:00Z',
  },
];
