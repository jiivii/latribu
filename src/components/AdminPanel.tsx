import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  PhoneCall,
  Calendar as CalendarIcon,
  Lock,
  Unlock,
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  Reservation,
  CalendarBlock,
  SlotType,
  ReservationStatus,
  BookingSource,
  SLOT_PRESETS,
  EVENT_TYPES,
  AVAILABLE_HOURS,
  calculateReservationPrice,
  intervalsOverlap,
  timeToMinutes,
} from '../types/booking';
import { AvailabilityCalendar } from './AvailabilityCalendar';

interface AdminPanelProps {
  reservations: Reservation[];
  blocks: CalendarBlock[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  currentYear: number;
  currentMonth: number;
  onChangeMonth: (year: number, month: number) => void;
  onUpdateReservationStatus: (id: string, status: ReservationStatus) => void;
  onUpdateReservation: (updated: Reservation) => void;
  onDeleteReservation: (id: string) => void;
  onCreateManualReservation: (
    res: Omit<Reservation, 'id' | 'code' | 'createdAt'>
  ) => Reservation;
  onCreateBlock: (block: Omit<CalendarBlock, 'id' | 'createdAt'>) => void;
  onUpdateBlock: (block: CalendarBlock) => void;
  onDeleteBlock: (id: string) => void;
  onBackToPublic: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  reservations,
  blocks,
  selectedDate,
  onSelectDate,
  currentYear,
  currentMonth,
  onChangeMonth,
  onUpdateReservationStatus,
  onUpdateReservation,
  onDeleteReservation,
  onCreateManualReservation,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onBackToPublic,
}) => {
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'calendario_bloqueos' | 'reserva_manual'>('solicitudes');
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editingBlock, setEditingBlock] = useState<CalendarBlock | null>(null);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Manual phone reservation state
  const [mFirstName, setMFirstName] = useState('');
  const [mLastName, setMLastName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mDate, setMDate] = useState(selectedDate);
  const [mSlotType, setMSlotType] = useState<SlotType>('afternoon');
  const [mStartTime, setMStartTime] = useState('16:00');
  const [mEndTime, setMEndTime] = useState('21:00');
  const [mEventType, setMEventType] = useState(EVENT_TYPES[0]);
  const [mGuests, setMGuests] = useState(25);
  const [mSource, setMSource] = useState<BookingSource>('phone');
  const [mStatus, setMStatus] = useState<ReservationStatus>('confirmed');
  const [mCustomPrice, setMCustomPrice] = useState<number>(190);
  const [mNotes, setMNotes] = useState('');
  const [mError, setMError] = useState<string | null>(null);

  // New calendar block state
  const [bSlotType, setBSlotType] = useState<SlotType>('full_day');
  const [bStartTime, setBStartTime] = useState('09:00');
  const [bEndTime, setBEndTime] = useState('23:00');
  const [bReason, setBReason] = useState('Bloqueo manual / Evento propio');

  const showNotice = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // KPI Metrics
  const stats = useMemo(() => {
    const pendingCount = reservations.filter((r) => r.status === 'pending').length;
    const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
    const confirmedRevenue = reservations
      .filter((r) => r.status === 'confirmed')
      .reduce((acc, r) => acc + r.totalPrice, 0);
    const pendingRevenue = reservations
      .filter((r) => r.status === 'pending')
      .reduce((acc, r) => acc + r.totalPrice, 0);
    return {
      pendingCount,
      confirmedCount,
      blocksCount: blocks.length,
      confirmedRevenue,
      pendingRevenue,
    };
  }, [reservations, blocks]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.date.includes(q)
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [reservations, statusFilter, searchQuery]);

  // Selected Day Reservations and Blocks for Calendar Block Manager
  const selectedDayBlocks = useMemo(
    () => blocks.filter((b) => b.date === selectedDate),
    [blocks, selectedDate]
  );

  const selectedDayReservations = useMemo(
    () => reservations.filter((r) => r.date === selectedDate),
    [reservations, selectedDate]
  );

  const handleManualSlotChange = (type: SlotType) => {
    setMSlotType(type);
    const preset = SLOT_PRESETS.find((p) => p.id === type);
    if (preset) {
      setMStartTime(preset.defaultStart);
      setMEndTime(preset.defaultEnd);
      const suggested = calculateReservationPrice(
        mDate,
        type,
        preset.defaultStart,
        preset.defaultEnd,
        []
      );
      setMCustomPrice(suggested);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMError(null);

    if (mFirstName.trim().length < 2 || mLastName.trim().length < 2) {
      setMError('Introduce nombre y apellidos del cliente.');
      return;
    }
    if (mPhone.trim().length < 6) {
      setMError('Introduce el teléfono de contacto de la reserva.');
      return;
    }
    if (mEmail.trim().length < 5 || !mEmail.includes('@')) {
      setMError('Introduce un correo electrónico válido (o pulsa "Autocompletar email telefónico").');
      return;
    }
    if (timeToMinutes(mEndTime) <= timeToMinutes(mStartTime)) {
      setMError('La hora de salida debe ser posterior a la de entrada.');
      return;
    }

    // Check overlap with confirmed reservations or blocks
    const dayBlocks = blocks.filter((b) => b.date === mDate);
    for (const blk of dayBlocks) {
      if (intervalsOverlap(mStartTime, mEndTime, blk.startTime, blk.endTime)) {
        setMError(`Conflicto: Ese tramo está bloqueado (${blk.startTime}–${blk.endTime}: ${blk.reason}). Desbloquéalo antes si deseas reservarlo.`);
        return;
      }
    }

    const created = onCreateManualReservation({
      firstName: mFirstName.trim(),
      lastName: mLastName.trim(),
      phone: mPhone.trim(),
      email: mEmail.trim(),
      date: mDate,
      startTime: mStartTime,
      endTime: mEndTime,
      slotType: mSlotType,
      eventType: mEventType,
      guests: mGuests,
      extras: [],
      notes: mNotes.trim() || 'Reserva manual registrada desde el panel de administración.',
      totalPrice: Number(mCustomPrice) || 0,
      status: mStatus,
      source: mSource,
    });

    showNotice(`Reserva manual ${created.code} (${created.firstName} ${created.lastName}) guardada para el ${created.date}.`);
    setMFirstName('');
    setMLastName('');
    setMPhone('');
    setMEmail('');
    setMNotes('');
    onSelectDate(mDate);
    setActiveTab('solicitudes');
  };

  const handleCreateBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeToMinutes(bEndTime) <= timeToMinutes(bStartTime)) {
      showNotice('La hora de fin del bloqueo debe ser posterior a la hora de inicio.');
      return;
    }
    onCreateBlock({
      date: selectedDate,
      slotType: bSlotType,
      startTime: bStartTime,
      endTime: bEndTime,
      reason: bReason.trim() || 'Bloqueado por administración',
    });
    showNotice(`Tramo ${bStartTime}–${bEndTime} bloqueado en el calendario para el día ${selectedDate}.`);
  };

  const handleQuickBlockPreset = (
    type: SlotType,
    start: string,
    end: string,
    defaultReason: string
  ) => {
    setBSlotType(type);
    setBStartTime(start);
    setBEndTime(end);
    setBReason(defaultReason);
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Admin Header */}
      <div className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#9AA08A]">
            LA TRIBU · Gestión Interna de Reservas y Disponibilidad
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#707A63] mt-0.5">
            Panel Administrativo
          </h1>
          <p className="text-sm text-[#707A63]/85 mt-1">
            Confirma solicitudes recibidas, registra reservas por llamada telefónica y modifica bloqueos de fechas en el calendario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMDate(selectedDate);
              setActiveTab('reserva_manual');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+ Reserva por Llamada</span>
          </button>
          <button
            type="button"
            onClick={onBackToPublic}
            className="px-4 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#F8EFE1] hover:bg-[#C39D70]/20 text-[#707A63] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ver Web Pública</span>
          </button>
        </div>
      </div>

      {adminToast && (
        <div className="p-4 rounded-xl bg-[#9AA08A]/25 border border-[#707A63] text-[#4A5240] text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#707A63] shrink-0" />
            <span>{adminToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="text-xs underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFF9F1] border border-[#C39D70]/30 rounded-2xl p-4">
          <span className="text-xs font-semibold text-[#707A63]/80 block">
            Solicitudes Pendientes
          </span>
          <div className="font-mono-tabular font-extrabold text-2xl sm:text-3xl text-[#9A6B1F] mt-1">
            {stats.pendingCount}
          </div>
          <span className="text-xs text-[#707A63]/75 mt-1 block">
            Requieren confirmación
          </span>
        </div>

        <div className="bg-[#FFF9F1] border border-[#C39D70]/30 rounded-2xl p-4">
          <span className="text-xs font-semibold text-[#707A63]/80 block">
            Reservas Confirmadas
          </span>
          <div className="font-mono-tabular font-extrabold text-2xl sm:text-3xl text-[#4A5240] mt-1">
            {stats.confirmedCount}
          </div>
          <span className="text-xs text-[#707A63]/75 mt-1 block">
            Bloqueadas en firme
          </span>
        </div>

        <div className="bg-[#FFF9F1] border border-[#C39D70]/30 rounded-2xl p-4">
          <span className="text-xs font-semibold text-[#707A63]/80 block">
            Bloqueos Manuales
          </span>
          <div className="font-mono-tabular font-extrabold text-2xl sm:text-3xl text-[#7A5835] mt-1">
            {stats.blocksCount}
          </div>
          <span className="text-xs text-[#707A63]/75 mt-1 block">
            Tramos cerrados en calendario
          </span>
        </div>

        <div className="bg-[#FFF9F1] border border-[#C39D70]/30 rounded-2xl p-4">
          <span className="text-xs font-semibold text-[#707A63]/80 block">
            Importe Confirmado
          </span>
          <div className="font-mono-tabular font-extrabold text-2xl sm:text-3xl text-[#4A5240] mt-1">
            {stats.confirmedRevenue} €
          </div>
          <span className="text-xs text-[#707A63]/75 mt-1 block font-mono-tabular">
            +{stats.pendingRevenue} € en solicitudes
          </span>
        </div>
      </div>

      {/* Interactive Workspace Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FFF9F1] border border-[#C39D70]/30 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'solicitudes'
              ? 'bg-[#707A63] text-[#FFF9F1]'
              : 'text-[#707A63] hover:bg-[#F8EFE1]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Solicitudes y Reservas ({reservations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendario_bloqueos')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'calendario_bloqueos'
              ? 'bg-[#707A63] text-[#FFF9F1]'
              : 'text-[#707A63] hover:bg-[#F8EFE1]'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendario y Bloqueos de Fechas ({blocks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMDate(selectedDate);
            setActiveTab('reserva_manual');
          }}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'reserva_manual'
              ? 'bg-[#707A63] text-[#FFF9F1]'
              : 'text-[#707A63] hover:bg-[#F8EFE1]'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Anexar Reserva Manual (Llamada / WhatsApp)</span>
        </button>
      </div>

      {/* TAB 1: GESTIÓN DE SOLICITUDES Y RESERVAS */}
      {activeTab === 'solicitudes' && (
        <div className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#C39D70]/20">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'pending', label: `Pendientes (${stats.pendingCount})` },
                  { id: 'confirmed', label: `Confirmadas (${stats.confirmedCount})` },
                  { id: 'cancelled', label: 'Canceladas' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-[#F1BF70] text-[#4A5240]'
                      : 'bg-[#F8EFE1] text-[#707A63] hover:bg-[#C39D70]/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#9AA08A] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, tel, fecha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#C39D70]/40 bg-[#F8EFE1]/50 text-xs sm:text-sm text-[#4A5240] focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-base font-bold text-[#707A63]">
                No hay reservas que coincidan con el filtro seleccionado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-[#F8EFE1] border border-[#C39D70]/40 text-xs font-bold text-[#707A63] cursor-pointer"
              >
                Mostrar todas las reservas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map((res) => {
                const isEditing = editingReservation?.id === res.id;

                if (isEditing && editingReservation) {
                  return (
                    <div
                      key={res.id}
                      className="p-5 rounded-xl bg-[#F8EFE1] border-2 border-[#707A63] space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#C39D70]/30 pb-2">
                        <span className="font-display font-extrabold text-sm text-[#4A5240]">
                          Editando Reserva {res.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingReservation(null)}
                          className="text-xs font-bold text-[#707A63] flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={editingReservation.firstName}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-sm text-[#4A5240]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Apellidos
                          </label>
                          <input
                            type="text"
                            value={editingReservation.lastName}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                lastName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-sm text-[#4A5240]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Teléfono
                          </label>
                          <input
                            type="text"
                            value={editingReservation.phone}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Correo electrónico
                          </label>
                          <input
                            type="email"
                            value={editingReservation.email}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-sm text-[#4A5240]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Fecha
                          </label>
                          <input
                            type="date"
                            value={editingReservation.date}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                date: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Hora inicio
                          </label>
                          <select
                            value={editingReservation.startTime}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                startTime: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                          >
                            {AVAILABLE_HOURS.map((h) => (
                              <option key={`edit-s-${h}`} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Hora fin
                          </label>
                          <select
                            value={editingReservation.endTime}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                endTime: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                          >
                            {AVAILABLE_HOURS.map((h) => (
                              <option key={`edit-e-${h}`} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Estado
                          </label>
                          <select
                            value={editingReservation.status}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                status: e.target.value as ReservationStatus,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-sm text-[#4A5240]"
                          >
                            <option value="pending">Pendiente de confirmar</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="completed">Completada</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Importe total (€)
                          </label>
                          <input
                            type="number"
                            value={editingReservation.totalPrice}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                totalPrice: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#707A63] mb-1">
                            Notas internas / cliente
                          </label>
                          <input
                            type="text"
                            value={editingReservation.notes}
                            onChange={(e) =>
                              setEditingReservation({
                                ...editingReservation,
                                notes: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-sm text-[#4A5240]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateReservation(editingReservation);
                            setEditingReservation(null);
                            showNotice(`Reserva ${editingReservation.code} actualizada correctamente.`);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={res.id}
                    className="p-4 sm:p-5 rounded-xl bg-[#F8EFE1]/65 border border-[#C39D70]/35 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#707A63]">
                        <span className="font-mono-tabular font-bold text-[#4A5240]">
                          {res.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular font-bold text-[#4A5240]">
                          Fecha: {res.date} ({res.startTime} – {res.endTime})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold">
                          Estado:{' '}
                          {res.status === 'pending'
                            ? 'Pendiente de confirmar'
                            : res.status === 'confirmed'
                            ? 'Confirmada'
                            : res.status === 'cancelled'
                            ? 'Cancelada'
                            : 'Completada'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Vía:{' '}
                          {res.source === 'phone'
                            ? 'Llamada telefónica'
                            : res.source === 'whatsapp'
                            ? 'WhatsApp'
                            : res.source === 'walkin'
                            ? 'Presencial'
                            : 'Web'}
                        </span>
                      </div>

                      <div className="font-display font-extrabold text-base sm:text-lg text-[#4A5240]">
                        {res.firstName} {res.lastName}{' '}
                        <span className="font-normal text-sm text-[#707A63]">
                          — {res.eventType} ({res.guests} asistentes)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#707A63]">
                        <span>
                          Tel: <strong className="font-mono-tabular text-[#4A5240]">{res.phone}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Email: <strong className="text-[#4A5240]">{res.email}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Importe: <strong className="font-mono-tabular text-[#4A5240]">{res.totalPrice} €</strong>
                        </span>
                      </div>

                      {res.notes && (
                        <p className="text-xs text-[#707A63]/90 italic pt-0.5">
                          Nota: “{res.notes}”
                        </p>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {res.status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateReservationStatus(res.id, 'confirmed');
                            showNotice(`Reserva ${res.code} de ${res.firstName} CONFIRMADA en el calendario.`);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#9AA08A] hover:bg-[#707A63] text-[#FFF9F1] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar</span>
                        </button>
                      )}

                      {res.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateReservationStatus(res.id, 'cancelled');
                            showNotice(`Reserva ${res.code} marcada como cancelada (horario liberado).`);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#DFAEA1]/40 hover:bg-[#DFAEA1] text-[#6E382D] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancelar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingReservation(res)}
                        className="px-3 py-2 rounded-xl border border-[#C39D70]/50 bg-[#FFF9F1] hover:bg-[#F1BF70]/30 text-[#707A63] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteReservation(res.id);
                          showNotice(`Reserva ${res.code} eliminada del registro.`);
                        }}
                        className="p-2 rounded-xl border border-[#C39D70]/35 text-[#9E5344] hover:bg-[#DFAEA1]/30 transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALENDARIO INTERACTIVO Y MODIFICACIÓN DE BLOQUEOS */}
      {activeTab === 'calendario_bloqueos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <AvailabilityCalendar
              reservations={reservations}
              blocks={blocks}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onChangeMonth={onChangeMonth}
              isAdminMode={true}
            />
          </div>

          <div className="lg:col-span-5 bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="border-b border-[#C39D70]/20 pb-3">
              <div className="text-xs font-semibold text-[#9AA08A]">
                Gestión directa sobre el calendario
              </div>
              <h3 className="font-display font-extrabold text-xl text-[#707A63] mt-0.5">
                Bloqueos del Día{' '}
                <span className="font-mono-tabular underline decoration-[#F1BF70]">
                  {selectedDate}
                </span>
              </h3>
              <p className="text-xs text-[#707A63]/85 mt-1">
                Bloquea días completos o tramos horarios, o modifica/elimina bloqueos existentes.
              </p>
            </div>

            {/* Existing Blocks on Selected Date */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-[#707A63]">
                Bloqueos activos en esta fecha ({selectedDayBlocks.length})
              </h4>

              {selectedDayBlocks.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-[#F8EFE1]/60 border border-[#C39D70]/25 text-xs text-[#707A63]">
                  No hay bloqueos manuales en el día {selectedDate}.
                </div>
              ) : (
                selectedDayBlocks.map((blk) => {
                  const isEditingBlk = editingBlock?.id === blk.id;
                  if (isEditingBlk && editingBlock) {
                    return (
                      <div
                        key={blk.id}
                        className="p-3.5 rounded-xl bg-[#F8EFE1] border-2 border-[#707A63] space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-[#707A63]">
                              Inicio
                            </label>
                            <select
                              value={editingBlock.startTime}
                              onChange={(e) =>
                                setEditingBlock({ ...editingBlock, startTime: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-xs"
                            >
                              {AVAILABLE_HOURS.map((h) => (
                                <option key={`bs-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#707A63]">
                              Fin
                            </label>
                            <select
                              value={editingBlock.endTime}
                              onChange={(e) =>
                                setEditingBlock({ ...editingBlock, endTime: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] font-mono-tabular text-xs"
                            >
                              {AVAILABLE_HOURS.map((h) => (
                                <option key={`be-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#707A63]">
                            Motivo del bloqueo
                          </label>
                          <input
                            type="text"
                            value={editingBlock.reason}
                            onChange={(e) =>
                              setEditingBlock({ ...editingBlock, reason: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#C39D70]/50 bg-[#FFF9F1] text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBlock(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#707A63] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateBlock(editingBlock);
                              setEditingBlock(null);
                              showNotice('Bloqueo de calendario actualizado.');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F1BF70] text-[#4A5240] text-xs font-bold cursor-pointer"
                          >
                            Guardar Bloqueo
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blk.id}
                      className="p-3.5 rounded-xl bg-[#C39D70]/20 border border-[#C39D70]/55 flex items-center justify-between gap-3"
                    >
                      <div className="text-xs text-[#5A4228]">
                        <div className="font-bold font-mono-tabular flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {blk.startTime} – {blk.endTime}
                          </span>
                        </div>
                        <div className="mt-0.5">{blk.reason}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingBlock(blk)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FFF9F1] border border-[#C39D70]/45 text-xs font-bold text-[#707A63] hover:bg-[#F1BF70]/30 cursor-pointer"
                        >
                          Modificar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteBlock(blk.id);
                            showNotice(`Bloqueo eliminado en ${blk.date} (${blk.startTime}–${blk.endTime}).`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#DFAEA1]/45 hover:bg-[#DFAEA1] text-xs font-bold text-[#6E382D] flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Desbloquear</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form to Add New Block on Selected Date */}
            <form
              onSubmit={handleCreateBlockSubmit}
              className="pt-4 border-t border-[#C39D70]/25 space-y-3"
            >
              <h4 className="text-xs font-bold text-[#707A63]">
                Añadir nuevo bloqueo en {selectedDate}
              </h4>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickBlockPreset(
                      'full_day',
                      '09:00',
                      '23:00',
                      'Día completo cerrado / Evento propio'
                    )
                  }
                  className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                    bSlotType === 'full_day'
                      ? 'bg-[#F1BF70]/40 border-[#707A63] text-[#4A5240]'
                      : 'bg-[#F8EFE1]/60 border-[#C39D70]/30 text-[#707A63]'
                  }`}
                >
                  Día Completo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickBlockPreset(
                      'morning',
                      '10:00',
                      '14:30',
                      'Turno Mañana bloqueado'
                    )
                  }
                  className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                    bSlotType === 'morning'
                      ? 'bg-[#F1BF70]/40 border-[#707A63] text-[#4A5240]'
                      : 'bg-[#F8EFE1]/60 border-[#C39D70]/30 text-[#707A63]'
                  }`}
                >
                  Solo Mañana
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickBlockPreset(
                      'afternoon',
                      '16:00',
                      '21:00',
                      'Turno Tarde bloqueado'
                    )
                  }
                  className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                    bSlotType === 'afternoon'
                      ? 'bg-[#F1BF70]/40 border-[#707A63] text-[#4A5240]'
                      : 'bg-[#F8EFE1]/60 border-[#C39D70]/30 text-[#707A63]'
                  }`}
                >
                  Solo Tarde
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#707A63] mb-1">
                    Desde hora
                  </label>
                  <select
                    value={bStartTime}
                    onChange={(e) => {
                      setBStartTime(e.target.value);
                      setBSlotType('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-xs font-bold text-[#4A5240]"
                  >
                    {AVAILABLE_HOURS.map((h) => (
                      <option key={`blk-s-${h}`} value={h}>
                        {h} h
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#707A63] mb-1">
                    Hasta hora
                  </label>
                  <select
                    value={bEndTime}
                    onChange={(e) => {
                      setBEndTime(e.target.value);
                      setBSlotType('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-xs font-bold text-[#4A5240]"
                  >
                    {AVAILABLE_HOURS.map((h) => (
                      <option key={`blk-e-${h}`} value={h}>
                        {h} h
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#707A63] mb-1">
                  Motivo del bloqueo
                </label>
                <input
                  type="text"
                  required
                  value={bReason}
                  onChange={(e) => setBReason(e.target.value)}
                  placeholder="Ej. Mantenimiento, Reserva telefónica, Festivo..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-xs text-[#4A5240]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#C39D70] hover:bg-[#B0895B] text-[#FFF9F1] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Bloquear Horario en {selectedDate}</span>
              </button>
            </form>

            {/* Also show all blocks across the calendar for quick management */}
            <div className="pt-4 border-t border-[#C39D70]/25 space-y-2">
              <h4 className="text-xs font-bold text-[#707A63]">
                Todos los bloqueos del calendario ({blocks.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-lg bg-[#F8EFE1]/70 border border-[#C39D70]/30 flex items-center justify-between gap-2 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDate(b.date)}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <span className="font-mono-tabular font-bold text-[#4A5240]">
                        {b.date} ({b.startTime}–{b.endTime})
                      </span>
                      <span className="block text-[#707A63] truncate max-w-[200px]">
                        {b.reason}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBlock(b.id)}
                      className="px-2 py-1 rounded bg-[#DFAEA1]/40 hover:bg-[#DFAEA1] text-[#6E382D] font-bold text-[11px] cursor-pointer shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NUEVA RESERVA MANUAL (POR LLAMADA / WHATSAPP) */}
      {activeTab === 'reserva_manual' && (
        <div className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-5 sm:p-7 max-w-3xl mx-auto space-y-5">
          <div className="border-b border-[#C39D70]/20 pb-4">
            <div className="text-xs font-semibold text-[#9AA08A]">
              Registro directo para reservas telefónicas o presenciales
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#707A63] mt-0.5">
              Crear Reserva Manual
            </h3>
            <p className="text-sm text-[#707A63]/85 mt-1">
              Utiliza este formulario cuando un cliente reserve por llamada o WhatsApp para dejar su fecha y horario bloqueados en el calendario.
            </p>
          </div>

          {mError && (
            <div className="p-3.5 rounded-xl bg-[#DFAEA1]/35 border border-[#CC8F81] text-[#6E382D] text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{mError}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Canal de entrada
                </label>
                <select
                  value={mSource}
                  onChange={(e) => setMSource(e.target.value as BookingSource)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#F8EFE1]/50 text-sm font-semibold text-[#4A5240]"
                >
                  <option value="phone">Llamada telefónica</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="walkin">Visita presencial en local</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Estado inicial de la reserva
                </label>
                <select
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value as ReservationStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#F8EFE1]/50 text-sm font-semibold text-[#4A5240]"
                >
                  <option value="confirmed">Confirmada directamente (Bloquea en firme)</option>
                  <option value="pending">Pendiente de recibir señal / Bizum</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Nombre del cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto"
                  value={mFirstName}
                  onChange={(e) => setMFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-sm text-[#4A5240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Torres Vega"
                  value={mLastName}
                  onChange={(e) => setMLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-sm text-[#4A5240]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Teléfono de contacto *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 622 98 76 54"
                  value={mPhone}
                  onChange={(e) => setMPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#707A63]">
                    Correo electrónico *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanTel = mPhone.replace(/\D/g, '') || 'cliente';
                      setMEmail(`reserva.${cleanTel}@latribueventos.es`);
                    }}
                    className="text-[11px] font-bold text-[#CC8F81] hover:underline cursor-pointer"
                  >
                    Autocompletar email telefónico
                  </button>
                </div>
                <input
                  type="email"
                  required
                  placeholder="cliente@correo.es"
                  value={mEmail}
                  onChange={(e) => setMEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-sm text-[#4A5240]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#C39D70]/20">
              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Fecha de la reserva *
                </label>
                <input
                  type="date"
                  required
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Hora de inicio *
                </label>
                <select
                  value={mStartTime}
                  onChange={(e) => setMStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                >
                  {AVAILABLE_HOURS.map((h) => (
                    <option key={`ms-${h}`} value={h}>
                      {h} h
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Hora de fin *
                </label>
                <select
                  value={mEndTime}
                  onChange={(e) => setMEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                >
                  {AVAILABLE_HOURS.map((h) => (
                    <option key={`me-${h}`} value={h}>
                      {h} h
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SLOT_PRESETS.map((preset) => (
                <button
                  key={`mp-${preset.id}`}
                  type="button"
                  onClick={() => handleManualSlotChange(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    mSlotType === preset.id
                      ? 'bg-[#F1BF70]/40 border-[#707A63] text-[#4A5240]'
                      : 'bg-[#F8EFE1]/60 border-[#C39D70]/30 text-[#707A63]'
                  }`}
                >
                  {preset.label} ({preset.defaultStart}–{preset.defaultEnd})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Tipo de evento
                </label>
                <select
                  value={mEventType}
                  onChange={(e) => setMEventType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-sm text-[#4A5240]"
                >
                  {EVENT_TYPES.map((ev) => (
                    <option key={`mev-${ev}`} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Asistentes estimados
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={mGuests}
                  onChange={(e) => setMGuests(Number(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular text-sm text-[#4A5240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707A63] mb-1">
                  Importe acordado (€)
                </label>
                <input
                  type="number"
                  min={0}
                  value={mCustomPrice}
                  onChange={(e) => setMCustomPrice(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] font-mono-tabular font-bold text-sm text-[#4A5240]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#707A63] mb-1">
                Notas de la llamada / Acuerdos de pago
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Pagará 50€ de señal por Bizum hoy y el resto el día del evento..."
                value={mNotes}
                onChange={(e) => setMNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-sm text-[#4A5240]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('solicitudes')}
                className="px-4 py-2.5 rounded-xl border border-[#C39D70]/45 text-xs sm:text-sm font-bold text-[#707A63] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-display font-extrabold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar Reserva en Calendario</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
