/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Reservation,
  CalendarBlock,
  ReservationStatus,
  INITIAL_RESERVATIONS,
  INITIAL_BLOCKS,
  SLOT_PRESETS,
} from './types/booking';
import { LaTribuRainbowLogo, LaTribuHouseLogo } from './components/LaTribuLogo';
import { AvailabilityCalendar } from './components/AvailabilityCalendar';
import { ReservationForm } from './components/ReservationForm';
import { AdminPanel } from './components/AdminPanel';
import {
  syncReservationToFirestore,
  syncBlockToFirestore,
  deleteBlockFromFirestore,
} from './lib/firebase';

const STORAGE_KEY_RES = 'la_tribu_reservations_v1';
const STORAGE_KEY_BLK = 'la_tribu_blocks_v1';

const HERO_IMAGE = '/src/assets/images/hero_la_tribu_sala_1790793441181.jpg';
const KIDS_IMAGE = '/src/assets/images/zona_infantil_montessori_1790793453643.jpg';
const OFFICE_IMAGE = '/src/assets/images/zona_office_merienda_1790793465326.jpg';
const PARTY_IMAGE = '/src/assets/images/evento_cumpleanos_tribu_1790793475509.jpg';

const FAQS = [
  {
    q: '¿Necesito registrarme o crear una cuenta para reservar?',
    a: 'No. En La Tribu puedes reservar directamente eligiendo tu fecha y horario en el calendario e indicando tu nombre, apellidos, teléfono y correo electrónico.',
  },
  {
    q: '¿Cómo se confirma definitivamente mi solicitud de reserva?',
    a: 'Al enviar el formulario, tu fecha y tramo horario quedan pre-bloqueados como "En solicitud". Nuestro equipo revisa la solicitud en el panel administrativo y te contacta por teléfono o WhatsApp para confirmar la señal y entregarte el código de acceso.',
  },
  {
    q: '¿Podemos llevar nuestra propia comida, bebida y decoración?',
    a: 'Sí, el alquiler del local es 100% en exclusiva para tu grupo. Disponéis de office completo con nevera gran capacidad, congelador, microondas, cafetera y menaje de apoyo sin coste adicional.',
  },
  {
    q: '¿Y si prefiero reservar llamando por teléfono?',
    a: 'También atendemos reservas telefónicas en el 644 00 11 22. Anotamos tus datos manualmente en el mismo calendario en tiempo real para que el tramo quede bloqueado al instante.',
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to initial
    }
    return INITIAL_RESERVATIONS;
  });

  const [blocks, setBlocks] = useState<CalendarBlock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BLK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback to initial
    }
    return INITIAL_BLOCKS;
  });

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-05');
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 9 = Octubre
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Initial fetch from backend /api/state
  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.reservations) && Array.isArray(data.blocks)) {
          setReservations(data.reservations);
          setBlocks(data.blocks);
          localStorage.setItem(STORAGE_KEY_RES, JSON.stringify(data.reservations));
          localStorage.setItem(STORAGE_KEY_BLK, JSON.stringify(data.blocks));
        }
      })
      .catch(() => {
        // Offline / local fallback already initialized
      });
  }, []);

  const persistState = (nextReservations: Reservation[], nextBlocks: CalendarBlock[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_RES, JSON.stringify(nextReservations));
      localStorage.setItem(STORAGE_KEY_BLK, JSON.stringify(nextBlocks));
    } catch {
      // ignore storage quota errors
    }

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservations: nextReservations, blocks: nextBlocks }),
    }).catch(() => {
      // fallback is localStorage
    });
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    if (y && m) {
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }
  };

  const handleCreatePublicReservation = (
    input: Omit<Reservation, 'id' | 'code' | 'createdAt' | 'status' | 'source'>
  ): Reservation => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newRes: Reservation = {
      ...input,
      id: `res_${Date.now()}`,
      code: `TRIBU-${randomCode}`,
      status: 'pending',
      source: 'web',
      createdAt: new Date().toISOString(),
    };

    const next = [...reservations, newRes];
    setReservations(next);
    persistState(next, blocks);
    syncReservationToFirestore(newRes).catch(() => {});
    return newRes;
  };

  const handleCreateManualReservation = (
    input: Omit<Reservation, 'id' | 'code' | 'createdAt'>
  ): Reservation => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newRes: Reservation = {
      ...input,
      id: `res_${Date.now()}`,
      code: `TRIBU-${randomCode}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...reservations, newRes];
    setReservations(next);
    persistState(next, blocks);
    syncReservationToFirestore(newRes).catch(() => {});
    return newRes;
  };

  const handleUpdateReservationStatus = (id: string, status: ReservationStatus) => {
    const next = reservations.map((r) => (r.id === id ? { ...r, status } : r));
    setReservations(next);
    persistState(next, blocks);
    const found = next.find((r) => r.id === id);
    if (found) {
      syncReservationToFirestore(found).catch(() => {});
    }
  };

  const handleUpdateReservation = (updated: Reservation) => {
    const next = reservations.map((r) => (r.id === updated.id ? updated : r));
    setReservations(next);
    persistState(next, blocks);
    syncReservationToFirestore(updated).catch(() => {});
  };

  const handleDeleteReservation = (id: string) => {
    const next = reservations.filter((r) => r.id !== id);
    setReservations(next);
    persistState(next, blocks);
  };

  const handleCreateBlock = (blockInput: Omit<CalendarBlock, 'id' | 'createdAt'>) => {
    const newBlk: CalendarBlock = {
      ...blockInput,
      id: `blk_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...blocks, newBlk];
    setBlocks(next);
    persistState(reservations, next);
    syncBlockToFirestore(newBlk).catch(() => {});
  };

  const handleUpdateBlock = (updatedBlk: CalendarBlock) => {
    const next = blocks.map((b) => (b.id === updatedBlk.id ? updatedBlk : b));
    setBlocks(next);
    persistState(reservations, next);
    syncBlockToFirestore(updatedBlk).catch(() => {});
  };

  const handleDeleteBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    persistState(reservations, next);
    deleteBlockFromFirestore(id).catch(() => {});
  };

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8EFE1] text-[#707A63]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FFF9F1]/95 backdrop-blur-xs border-b border-[#C39D70]/30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('public');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display font-extrabold text-xl sm:text-2xl tracking-wider text-[#707A63] whitespace-nowrap shrink-0"
          >
            LA TRIBU
          </a>

          {/* Zone 2: 4 Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#707A63]">
            <a
              href="#espacio"
              onClick={() => setViewMode('public')}
              className="hover:text-[#4A5240] hover:underline decoration-[#DFAEA1] decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
            >
              El Espacio
            </a>
            <a
              href="#tarifas"
              onClick={() => setViewMode('public')}
              className="hover:text-[#4A5240] hover:underline decoration-[#DFAEA1] decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
            >
              Tarifas y Horarios
            </a>
            <a
              href="#reservar"
              onClick={() => setViewMode('public')}
              className="hover:text-[#4A5240] hover:underline decoration-[#DFAEA1] decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
            >
              Calendario y Reserva
            </a>
            <a
              href="#preguntas"
              onClick={() => setViewMode('public')}
              className="hover:text-[#4A5240] hover:underline decoration-[#DFAEA1] decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
            >
              Normas y Dudas
            </a>
          </nav>

          {/* Zone 3: Primary Actions (Admin Switch + Primary Book CTA) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === 'admin' ? 'public' : 'admin'))
              }
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-[#707A63] text-[#FFF9F1] border-[#707A63]'
                  : 'bg-[#F8EFE1] text-[#707A63] border-[#C39D70]/45 hover:bg-[#C39D70]/20'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {viewMode === 'admin'
                  ? 'Salir de Admin'
                  : `Panel Admin (${pendingCount})`}
              </span>
            </button>

            {viewMode === 'public' && (
              <a
                href="#reservar"
                className="px-4 py-2 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-display font-extrabold text-xs sm:text-sm transition-colors whitespace-nowrap"
              >
                Reservar Fecha
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Switch: Admin Panel vs Public Venue Site */}
      {viewMode === 'admin' ? (
        <main className="flex-1">
          <AdminPanel
            reservations={reservations}
            blocks={blocks}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onChangeMonth={(y, m) => {
              setCurrentYear(y);
              setCurrentMonth(m);
            }}
            onUpdateReservationStatus={handleUpdateReservationStatus}
            onUpdateReservation={handleUpdateReservation}
            onDeleteReservation={handleDeleteReservation}
            onCreateManualReservation={handleCreateManualReservation}
            onCreateBlock={handleCreateBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onBackToPublic={() => setViewMode('public')}
          />
        </main>
      ) : (
        <main id="inicio" className="flex-1">
          {/* HERO SECTION */}
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-14 sm:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Column: Brand Identity & Value Proposition */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-4">
                  <LaTribuRainbowLogo showText={false} size="md" />
                  <div>
                    <span className="font-display font-extrabold text-2xl sm:text-3xl tracking-wider text-[#9AA08A] block leading-none">
                      LA TRIBU
                    </span>
                    <span className="font-subtitle font-semibold text-sm sm:text-base text-[#707A63] block mt-1">
                      Celebraciones que se quedan en la memoria
                    </span>
                  </div>
                </div>

                <h1
                  className="font-display font-extrabold text-3xl sm:text-5xl text-[#707A63] leading-[1.12] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Tu espacio privado y cálido para celebrar en familia
                </h1>

                <p className="text-base sm:text-lg text-[#707A63]/90 leading-relaxed max-w-xl">
                  Un local diáfano diseñado con maderas naturales, zona de juego infantil inspirada en pedagogía libre y comedor equipado. Alquila en exclusiva por turnos o por horas y reserva tu fecha al instante sin necesidad de registro.
                </p>

                {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-semibold text-[#707A63]">
                  <span>140 m² en planta calle</span>
                  <span aria-hidden="true">·</span>
                  <span>Aforo hasta 55 personas</span>
                  <span aria-hidden="true">·</span>
                  <span>100% privado para tu grupo</span>
                  <span aria-hidden="true">·</span>
                  <span>Sin registro ni contraseñas</span>
                </div>

                {/* Single Dominant Focal CTA + Secondary Link */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href="#reservar"
                    className="px-6 py-3.5 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-display font-extrabold text-base transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs"
                  >
                    <span>Ver Calendario y Reservar</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <a
                    href="#espacio"
                    className="text-sm font-bold text-[#CC8F81] hover:text-[#707A63] underline decoration-[#DFAEA1] decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    Explorar zonas del local
                  </a>
                </div>
              </div>

              {/* Right Column: High-Impact 16:9 Venue Hero Visual with Scrim */}
              <div className="lg:col-span-6">
                <div className="relative rounded-2xl overflow-hidden border border-[#C39D70]/40 bg-[#FFF9F1] aspect-video">
                  {!imgErrors.hero ? (
                    <img
                      src={HERO_IMAGE}
                      alt="Sala principal de celebraciones La Tribu con arcoíris y mesas de madera natural"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((p) => ({ ...p, hero: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#FFF9F1] via-[#F8EFE1] to-[#DFAEA1]/30">
                      <LaTribuRainbowLogo size="lg" showText={true} showTagline={true} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-5 sm:p-6">
                    <div className="text-[#FFF9F1] flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                      <div>
                        <div className="font-display font-extrabold text-base sm:text-lg">
                          Sala La Tribu · Alquiler íntegro por evento
                        </div>
                        <div className="text-xs text-[#F8EFE1]/90">
                          Zona infantil Montessori · Office completo · Climatización y sonido
                        </div>
                      </div>
                      <span className="font-mono-tabular font-bold text-sm text-[#F1BF70] shrink-0">
                        Desde 130 € / turno
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 01: EL ESPACIO & EQUIPAMIENTO (ASYMMETRIC BENTO GRID) */}
          <section
            id="espacio"
            className="py-14 bg-[#FFF9F1] border-y border-[#C39D70]/25"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#9AA08A]">
                    01. Pensado para niños y adultos
                  </span>
                  <h2
                    className="font-subtitle font-semibold text-2xl sm:text-4xl text-[#707A63] mt-1"
                    style={{ textWrap: 'balance' }}
                  >
                    Un entorno cálido donde cada detalle acompaña tu celebración
                  </h2>
                </div>
                <p className="text-sm text-[#707A63]/85 max-w-md">
                  Olvídate de los locales ruidosos o fríos. Hemos diseñado La Tribu como una extensión del hogar, con materiales nobles y visibilidad completa desde cualquier punto.
                </p>
              </div>

              {/* Asymmetric Bento Grid (col-span-7 + col-span-5) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Card 01: Zona Infantil Montessori */}
                <div className="lg:col-span-7 bg-[#F8EFE1] border border-[#C39D70]/35 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="aspect-[16/9] w-full bg-[#FFF9F1] overflow-hidden">
                    {!imgErrors.kids ? (
                      <img
                        src={KIDS_IMAGE}
                        alt="Zona infantil de madera natural estilo Montessori en La Tribu"
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrors((p) => ({ ...p, kids: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F8EFE1]">
                        <LaTribuHouseLogo className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-2">
                    <div className="text-xs font-semibold text-[#9AA08A]">
                      01. Juego libre y seguro · De 0 a 9 años
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#707A63]">
                      Zona Infantil Montessori en Madera Natural
                    </h3>
                    <p className="text-sm text-[#707A63]/90 leading-relaxed">
                      Estructura de escalada Pikler, rampa deslizante, piscina de bolas en tonos suaves, cocinita de madera, rincón de lectura y colchonetas amortiguadas a la vista de las mesas de adultos.
                    </p>
                  </div>
                </div>

                {/* Card 02: Office y Comedor */}
                <div className="lg:col-span-5 bg-[#F8EFE1] border border-[#C39D70]/35 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="aspect-[4/3] w-full bg-[#FFF9F1] overflow-hidden">
                    {!imgErrors.office ? (
                      <img
                        src={OFFICE_IMAGE}
                        alt="Office equipado y mesa de madera para celebraciones en La Tribu"
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrors((p) => ({ ...p, office: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F8EFE1]">
                        <LaTribuHouseLogo className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-2">
                    <div className="text-xs font-semibold text-[#9AA08A]">
                      02. Comodidad para tus invitados · Trae tu catering
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#707A63]">
                      Office Completo y Mesas de Roble
                    </h3>
                    <p className="text-sm text-[#707A63]/90 leading-relaxed">
                      Equipado con frigorífico de gran capacidad, congelador para tartas y hielo, microondas, cafetera de cápsulas, hervidor, tronas infantiles y cambiador en baño adaptado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Second Row of Asymmetric Bento: Photo Corner + Concrete Proof Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 bg-[#F8EFE1] border border-[#C39D70]/35 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="aspect-[4/3] w-full bg-[#FFF9F1] overflow-hidden">
                    {!imgErrors.party ? (
                      <img
                        src={PARTY_IMAGE}
                        alt="Mesa dulce decorada con globos orgánicos en La Tribu"
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrors((p) => ({ ...p, party: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F8EFE1]">
                        <LaTribuRainbowLogo size="md" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-2">
                    <div className="text-xs font-semibold text-[#9AA08A]">
                      03. Rincón de fotos y ambientación
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#707A63]">
                      Mural Arcoíris La Tribu y Mesa Dulce
                    </h3>
                    <p className="text-sm text-[#707A63]/90 leading-relaxed">
                      Iluminación cálida regulable, altavoz Bluetooth ambiental y nuestro icónico arcoíris en tonos salvia, miel y rosa empolvado para que las fotos del soplado de velas sean inolvidables.
                    </p>
                  </div>
                </div>

                {/* Claim-to-Proof Adjacency: Quantified Proof + Attributable Testimonials */}
                <div className="lg:col-span-7 bg-[#F8EFE1] border border-[#C39D70]/35 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="flex items-start justify-between gap-4 border-b border-[#C39D70]/25 pb-5">
                    <div>
                      <span className="text-xs font-bold text-[#9AA08A]">
                        Confianza y experiencia real
                      </span>
                      <h3 className="font-display font-extrabold text-2xl text-[#707A63] mt-1">
                        Por qué las familias repiten cada año en La Tribu
                      </h3>
                    </div>
                    <LaTribuHouseLogo className="w-14 h-14 shrink-0" />
                  </div>

                  {/* Quantified Precision Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#FFF9F1] border border-[#C39D70]/25">
                      <div className="font-mono-tabular font-extrabold text-2xl text-[#4A5240]">
                        +420 eventos
                      </div>
                      <div className="text-xs text-[#707A63] mt-1">
                        Celebrados en los últimos 24 meses con entrega puntual
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FFF9F1] border border-[#C39D70]/25">
                      <div className="font-mono-tabular font-extrabold text-2xl text-[#4A5240]">
                        100% exclusivo
                      </div>
                      <div className="text-xs text-[#707A63] mt-1">
                        Un único grupo por turno con margen de limpieza e higienización
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FFF9F1] border border-[#C39D70]/25">
                      <div className="font-mono-tabular font-extrabold text-2xl text-[#4A5240]">
                        &lt; 2 horas
                      </div>
                      <div className="text-xs text-[#707A63] mt-1">
                        Tiempo medio de confirmación tras enviar tu solicitud web
                      </div>
                    </div>
                  </div>

                  {/* Attributable Testimonials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <blockquote className="p-4 rounded-xl bg-[#FFF9F1] border border-[#C39D70]/25 text-xs text-[#707A63] space-y-2">
                      <p className="leading-relaxed">
                        “Buscábamos un sitio tranquilo para el primer cumpleaños de Leo donde los bebés pudieran gatear seguros mientras los abuelos charlaban cómodos. Reservamos el turno de tarde desde la web sin registros y todo estuvo impecable.”
                      </p>
                      <footer className="font-bold text-[#4A5240]">
                        Marta Domínguez · Madre de Leo (Cumpleaños 1 año, Septiembre 2026)
                      </footer>
                    </blockquote>

                    <blockquote className="p-4 rounded-xl bg-[#FFF9F1] border border-[#C39D70]/25 text-xs text-[#707A63] space-y-2">
                      <p className="leading-relaxed">
                        “Llamamos por teléfono para alquilar el día completo por el bautizo de nuestra sobrina. Nos bloquearon la fecha al momento en el calendario y contratamos el arco de globos y la limpieza final. Repetiremos seguro.”
                      </p>
                      <footer className="font-bold text-[#4A5240]">
                        David y Clara Morales · Celebración familiar (38 invitados)
                      </footer>
                    </blockquote>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 02: TARIFAS Y HORARIOS */}
          <section id="tarifas" className="py-14 max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#9AA08A]">
                  02. Tarifas claras y flexibles
                </span>
                <h2 className="font-subtitle font-semibold text-2xl sm:text-4xl text-[#707A63] mt-1">
                  Elige el turno u horario que mejor se adapte a tu evento
                </h2>
              </div>
              <p className="text-sm text-[#707A63]/85 max-w-md">
                Todas las modalidades incluyen el uso exclusivo de los 140 m², office equipado, zona infantil de madera, climatización y altavoz ambiental.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SLOT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[#9AA08A] font-mono-tabular">
                      {preset.id === 'custom'
                        ? 'De 09:00 a 23:00 (mín. 3h)'
                        : `Horario: ${preset.defaultStart} a ${preset.defaultEnd} h`}
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#707A63]">
                      {preset.label}
                    </h3>
                    <p className="text-xs text-[#707A63]/85 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#C39D70]/20">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[#707A63]">Lunes a Jueves</span>
                      <span className="font-mono-tabular font-extrabold text-xl text-[#4A5240]">
                        {preset.weekdayPrice} €{preset.id === 'custom' ? '/h' : ''}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[#707A63]">Viernes a Domingo</span>
                      <span className="font-mono-tabular font-extrabold text-xl text-[#4A5240]">
                        {preset.weekendPrice} €{preset.id === 'custom' ? '/h' : ''}
                      </span>
                    </div>

                    <a
                      href="#reservar"
                      className="block w-full text-center py-2.5 px-4 rounded-xl bg-[#F8EFE1] hover:bg-[#F1BF70] text-[#4A5240] font-bold text-xs transition-colors whitespace-nowrap"
                    >
                      Elegir en el calendario
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 03: CALENDARIO DE DISPONIBILIDAD Y RESERVA DIRECTA */}
          <section
            id="reservar"
            className="py-14 bg-[#FFF9F1]/60 border-t border-[#C39D70]/25"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#9AA08A]">
                    03. Disponibilidad en tiempo real · Sin login
                  </span>
                  <h2 className="font-subtitle font-semibold text-2xl sm:text-4xl text-[#707A63] mt-1">
                    Consulta el calendario y solicita tu reserva
                  </h2>
                </div>
                <p className="text-sm text-[#707A63]/85 max-w-md">
                  Selecciona un día libre o parcial en el calendario de la izquierda y completa a la derecha tu nombre, apellidos, horario, teléfono y correo.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <AvailabilityCalendar
                    reservations={reservations}
                    blocks={blocks}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    onChangeMonth={(y, m) => {
                      setCurrentYear(y);
                      setCurrentMonth(m);
                    }}
                    isAdminMode={false}
                  />
                </div>

                <div className="lg:col-span-5">
                  <ReservationForm
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    reservations={reservations}
                    blocks={blocks}
                    onSubmitReservation={handleCreatePublicReservation}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 04: NORMAS Y PREGUNTAS FRECUENTES */}
          <section id="preguntas" className="py-14 max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold text-[#9AA08A]">
                  04. Información práctica
                </span>
                <h2 className="font-subtitle font-semibold text-2xl sm:text-3xl text-[#707A63]">
                  Preguntas frecuentes y funcionamiento del alquiler
                </h2>
                <p className="text-sm text-[#707A63]/85 leading-relaxed">
                  Queremos que tu única preocupación sea disfrutar con los tuyos. Si prefieres hacer tu reserva por llamada telefónica o consultar un horario especial, llámanos directamente.
                </p>

                <div className="p-5 rounded-2xl bg-[#FFF9F1] border border-[#C39D70]/35 space-y-3 text-sm">
                  <div className="font-display font-extrabold text-[#4A5240]">
                    Atención directa y reservas telefónicas
                  </div>
                  <div className="flex items-center gap-2.5 text-[#707A63]">
                    <Phone className="w-4 h-4 text-[#9AA08A]" />
                    <span className="font-mono-tabular font-bold text-[#4A5240]">
                      +34 644 00 11 22
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#707A63]">
                    <Mail className="w-4 h-4 text-[#9AA08A]" />
                    <span>reservas@latribueventos.es</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#707A63]">
                    <MapPin className="w-4 h-4 text-[#9AA08A]" />
                    <span>Calle del Bosque 18, Local Bajo · Acceso adaptado</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {FAQS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={item.q}
                      className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-display font-bold text-base text-[#707A63] hover:bg-[#F8EFE1]/50 transition-colors cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-[#707A63]/90 leading-relaxed border-t border-[#C39D70]/15 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* QUIET FOOTER */}
      <footer className="bg-[#FFF9F1] border-t border-[#C39D70]/30 py-10 mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LaTribuHouseLogo className="w-12 h-12" />
            <div>
              <span className="font-display font-extrabold text-lg text-[#707A63] block leading-none">
                LA TRIBU
              </span>
              <span className="text-xs text-[#707A63]/80">
                Celebraciones que se quedan en la memoria · Alquiler de espacio para eventos
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#707A63]">
            <a
              href="#espacio"
              onClick={() => setViewMode('public')}
              className="hover:text-[#CC8F81] transition-colors"
            >
              El Espacio
            </a>
            <a
              href="#tarifas"
              onClick={() => setViewMode('public')}
              className="hover:text-[#CC8F81] transition-colors"
            >
              Tarifas
            </a>
            <a
              href="#reservar"
              onClick={() => setViewMode('public')}
              className="hover:text-[#CC8F81] transition-colors"
            >
              Calendario de Reserva
            </a>
            <button
              type="button"
              onClick={() => {
                setViewMode('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[#CC8F81] hover:text-[#707A63] font-bold underline cursor-pointer"
            >
              Acceso Panel Administrativo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
