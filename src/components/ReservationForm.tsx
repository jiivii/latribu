import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  Reservation,
  CalendarBlock,
  SlotType,
  SLOT_PRESETS,
  EXTRA_OPTIONS,
  EVENT_TYPES,
  AVAILABLE_HOURS,
  intervalsOverlap,
  calculateReservationPrice,
  timeToMinutes,
  isWeekendDate,
} from '../types/booking';
import { LaTribuHouseLogo } from './LaTribuLogo';

interface ReservationFormProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  reservations: Reservation[];
  blocks: CalendarBlock[];
  onSubmitReservation: (
    newRes: Omit<Reservation, 'id' | 'code' | 'createdAt' | 'status' | 'source'>
  ) => Reservation;
}

export const ReservationForm: React.FC<ReservationFormProps> = ({
  selectedDate,
  onSelectDate,
  reservations,
  blocks,
  onSubmitReservation,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [slotType, setSlotType] = useState<SlotType>('afternoon');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('21:00');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [guests, setGuests] = useState(25);
  const [extras, setExtras] = useState<string[]>(['limpieza']);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedReservation, setSubmittedReservation] = useState<Reservation | null>(null);

  // Sync preset hours when slotType changes
  const handleSelectSlotPreset = (type: SlotType) => {
    setSlotType(type);
    const preset = SLOT_PRESETS.find((p) => p.id === type);
    if (preset) {
      setStartTime(preset.defaultStart);
      setEndTime(preset.defaultEnd);
    }
    setErrorMessage(null);
  };

  // Automatically pick a free slot when selectedDate changes if current slot is occupied
  useEffect(() => {
    setErrorMessage(null);
  }, [selectedDate]);

  // Check if a given interval overlaps on selectedDate
  const checkConflict = (start: string, end: string): { hasConflict: boolean; reason: string } => {
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      return {
        hasConflict: true,
        reason: 'La hora de finalización debe ser posterior a la hora de inicio.',
      };
    }
    if (timeToMinutes(end) - timeToMinutes(start) < 120) {
      return {
        hasConflict: true,
        reason: 'La duración mínima de alquiler del espacio es de 2 horas.',
      };
    }

    const dayBlocks = blocks.filter((b) => b.date === selectedDate);
    for (const blk of dayBlocks) {
      if (intervalsOverlap(start, end, blk.startTime, blk.endTime)) {
        return {
          hasConflict: true,
          reason: `El tramo ${blk.startTime}–${blk.endTime} está bloqueado en el calendario.`,
        };
      }
    }

    const dayRes = reservations.filter(
      (r) =>
        r.date === selectedDate &&
        (r.status === 'confirmed' || r.status === 'pending')
    );
    for (const res of dayRes) {
      if (intervalsOverlap(start, end, res.startTime, res.endTime)) {
        return {
          hasConflict: true,
          reason: `El horario ${res.startTime}–${res.endTime} ya está ${
            res.status === 'confirmed' ? 'reservado' : 'solicitado por otro cliente'
          } en esta fecha.`,
        };
      }
    }

    return { hasConflict: false, reason: '' };
  };

  const currentConflict = useMemo(
    () => checkConflict(startTime, endTime),
    [selectedDate, startTime, endTime, reservations, blocks]
  );

  const totalPrice = useMemo(
    () => calculateReservationPrice(selectedDate, slotType, startTime, endTime, extras),
    [selectedDate, slotType, startTime, endTime, extras]
  );

  const toggleExtra = (id: string) => {
    setExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (cleanFirst.length < 2) {
      setErrorMessage('Por favor, introduce tu nombre (obligatorio).');
      return;
    }
    if (cleanLast.length < 2) {
      setErrorMessage('Por favor, introduce tus apellidos (obligatorio).');
      return;
    }
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setErrorMessage('Por favor, selecciona una fecha válida en el calendario.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage('Por favor, indica el horario de inicio y fin de la reserva.');
      return;
    }

    const digitsOnlyPhone = cleanPhone.replace(/\D/g, '');
    if (digitsOnlyPhone.length < 9) {
      setErrorMessage('Por favor, introduce un teléfono válido de contacto (mínimo 9 dígitos).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Por favor, introduce un correo electrónico válido para recibir la confirmación.');
      return;
    }

    if (currentConflict.hasConflict) {
      setErrorMessage(currentConflict.reason);
      return;
    }

    const created = onSubmitReservation({
      firstName: cleanFirst,
      lastName: cleanLast,
      phone: cleanPhone,
      email: cleanEmail,
      date: selectedDate,
      startTime,
      endTime,
      slotType,
      eventType,
      guests,
      extras,
      notes: notes.trim(),
      totalPrice,
    });

    setSubmittedReservation(created);
  };

  if (submittedReservation) {
    return (
      <div className="bg-[#FFF9F1] border border-[#9AA08A] rounded-2xl p-6 sm:p-8 text-center">
        <LaTribuHouseLogo className="w-20 h-20 mx-auto" />
        <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#4A5240]">
          <CheckCircle2 className="w-5 h-5 text-[#707A63]" />
          <span>Solicitud de Reserva Registrada</span>
        </div>

        <h3 className="font-display font-extrabold text-2xl text-[#707A63] mt-2">
          ¡Gracias, {submittedReservation.firstName}!
        </h3>
        <p className="text-sm text-[#707A63]/90 max-w-md mx-auto mt-2 leading-relaxed">
          Hemos bloqueado provisionalmente tu fecha y horario en el calendario de{' '}
          <strong>La Tribu</strong>. Te contactaremos al teléfono{' '}
          <span className="font-mono-tabular font-semibold">{submittedReservation.phone}</span> y al correo{' '}
          <span className="font-semibold">{submittedReservation.email}</span> para confirmar tu reserva.
        </p>

        <div className="mt-6 bg-[#F8EFE1] border border-[#C39D70]/35 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between items-center border-b border-[#C39D70]/20 pb-2">
            <span className="text-[#707A63]/80">Localizador de reserva</span>
            <span className="font-mono-tabular font-bold text-[#4A5240]">
              {submittedReservation.code}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#707A63]/80">Titular</span>
            <span className="font-bold text-[#707A63]">
              {submittedReservation.firstName} {submittedReservation.lastName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#707A63]/80">Fecha y Horario</span>
            <span className="font-mono-tabular font-bold text-[#707A63]">
              {submittedReservation.date} · {submittedReservation.startTime} a {submittedReservation.endTime}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#707A63]/80">Celebración</span>
            <span className="font-semibold text-[#707A63]">
              {submittedReservation.eventType} ({submittedReservation.guests} asist.)
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#C39D70]/20">
            <span className="font-bold text-[#707A63]">Total estimado</span>
            <span className="font-mono-tabular font-extrabold text-lg text-[#4A5240]">
              {submittedReservation.totalPrice} €
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSubmittedReservation(null);
              setFirstName('');
              setLastName('');
              setPhone('');
              setEmail('');
              setNotes('');
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] text-[#4A5240] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Hacer otra solicitud
          </button>
        </div>
      </div>
    );
  }

  const isWeekend = isWeekendDate(selectedDate);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#FFF9F1] border border-[#C39D70]/35 rounded-2xl p-5 sm:p-7 space-y-5"
      noValidate
    >
      <div className="border-b border-[#C39D70]/20 pb-4">
        <div className="text-xs font-semibold text-[#9AA08A]">
          Reserva directa sin registro · Confirmación rápida
        </div>
        <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#707A63] mt-1">
          Solicitar Reserva del Local
        </h3>
        <p className="text-sm text-[#707A63]/85 mt-1">
          Completa tus datos obligatorios y el horario deseado. No necesitas crear cuenta ni iniciar sesión.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#DFAEA1]/30 border border-[#CC8F81] text-[#6E382D] text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Fecha y Modalidad Horaria */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-[#707A63]">
          1. Fecha y Horario de la Reserva <span className="text-[#CC8F81]">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-xs font-semibold text-[#707A63]/80 mb-1">
              Fecha seleccionada <span className="text-[#CC8F81]">*</span>
            </span>
            <div className="relative">
              <input
                type="date"
                required
                min="2026-09-30"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#F8EFE1]/50 text-[#4A5240] font-mono-tabular font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#F8EFE1]/70 border border-[#C39D70]/25 text-xs text-[#707A63]">
              <span className="font-bold block text-[#4A5240]">
                Tarifa aplicable: {isWeekend ? 'Fin de semana / Víspera (V–D)' : 'Entre semana (L–J)'}
              </span>
              <span>Selecciona un turno o ajusta las horas exactas</span>
            </div>
          </div>
        </div>

        {/* Preset Slot Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {SLOT_PRESETS.map((preset) => {
            const active = slotType === preset.id;
            const price = isWeekend ? preset.weekendPrice : preset.weekdayPrice;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectSlotPreset(preset.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#F1BF70]/35 border-[#707A63] text-[#4A5240] shadow-xs'
                    : 'bg-[#F8EFE1]/40 border-[#C39D70]/30 text-[#707A63] hover:bg-[#F8EFE1]'
                }`}
              >
                <div className="font-bold text-xs whitespace-nowrap truncate">
                  {preset.shortLabel}
                </div>
                <div className="font-mono-tabular text-[11px] text-[#707A63]/90 mt-0.5">
                  {preset.id === 'custom' ? `${price} €/h` : `${price} €`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Exact Start and End Time Selectors (Mandatory) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Hora de inicio <span className="text-[#CC8F81]">*</span>
            </label>
            <div className="relative">
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setSlotType('custom');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] font-mono-tabular font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              >
                {AVAILABLE_HOURS.slice(0, -2).map((h) => (
                  <option key={`start-${h}`} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Hora de finalización <span className="text-[#CC8F81]">*</span>
            </label>
            <div className="relative">
              <select
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setSlotType('custom');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] font-mono-tabular font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              >
                {AVAILABLE_HOURS.slice(2).map((h) => (
                  <option key={`end-${h}`} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Availability Feedback for Chosen Hours */}
        {currentConflict.hasConflict ? (
          <div className="p-3 rounded-xl bg-[#DFAEA1]/25 border border-[#CC8F81] text-xs text-[#6E382D] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{currentConflict.reason}</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#9AA08A]/15 border border-[#9AA08A]/45 text-xs text-[#4A5240] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#707A63] shrink-0" />
            <span>
              Horario <strong className="font-mono-tabular">{startTime} – {endTime}</strong> disponible el día{' '}
              <strong className="font-mono-tabular">{selectedDate}</strong>.
            </span>
          </div>
        )}
      </div>

      {/* 2. Datos Personales Obligatorios (Nombre, Apellidos, Teléfono, Correo) */}
      <div className="space-y-3 pt-2 border-t border-[#C39D70]/20">
        <label className="block text-sm font-bold text-[#707A63]">
          2. Datos de Contacto del Titular <span className="text-[#CC8F81]">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Nombre <span className="text-[#CC8F81]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9AA08A] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="Ej. María"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Apellidos <span className="text-[#CC8F81]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Fernández López"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Teléfono móvil <span className="text-[#CC8F81]">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#9AA08A] absolute left-3 top-3 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="Ej. 600 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] font-mono-tabular text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Correo electrónico <span className="text-[#CC8F81]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9AA08A] absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detalles del Evento y Extras */}
      <div className="space-y-3 pt-2 border-t border-[#C39D70]/20">
        <label className="block text-sm font-bold text-[#707A63]">
          3. Detalles de la Celebración
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Tipo de celebración
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
            >
              {EVENT_TYPES.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#707A63] mb-1">
              Asistentes aprox. (máx. 55)
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-[#9AA08A] absolute left-3 top-3 pointer-events-none" />
              <input
                type="number"
                min={1}
                max={55}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] font-mono-tabular text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
              />
            </div>
          </div>
        </div>

        {/* Optional Extras */}
        <div className="space-y-2 pt-1">
          <span className="block text-xs font-semibold text-[#707A63]">
            Servicios adicionales opcionales
          </span>
          {EXTRA_OPTIONS.map((ext) => {
            const checked = extras.includes(ext.id);
            return (
              <label
                key={ext.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                  checked
                    ? 'bg-[#F1BF70]/20 border-[#C39D70]'
                    : 'bg-[#F8EFE1]/40 border-[#C39D70]/25 hover:bg-[#F8EFE1]/80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleExtra(ext.id)}
                    className="mt-0.5 accent-[#707A63] rounded"
                  />
                  <div>
                    <div className="font-bold text-[#4A5240]">{ext.label}</div>
                    <div className="text-[#707A63]/80">{ext.detail}</div>
                  </div>
                </div>
                <span className="font-mono-tabular font-bold text-[#4A5240] shrink-0">
                  +{ext.price} €
                </span>
              </label>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#707A63] mb-1">
            Notas o necesidades especiales (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Indícanos si necesitas tronas, calienta biberones, o algún detalle especial..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#C39D70]/45 bg-[#FFF9F1] text-[#4A5240] text-sm focus:outline-none focus:ring-2 focus:ring-[#707A63]"
          />
        </div>
      </div>

      {/* Price Summary & Primary Honey Yellow CTA */}
      <div className="pt-3 border-t border-[#C39D70]/25 flex flex-col gap-3">
        <div className="flex items-center justify-between bg-[#F8EFE1] px-4 py-3 rounded-xl border border-[#C39D70]/30">
          <div>
            <span className="text-xs font-semibold text-[#707A63] block">
              Importe total de la reserva
            </span>
            <span className="text-[11px] text-[#707A63]/80 font-mono-tabular">
              {selectedDate} · {startTime} a {endTime}
            </span>
          </div>
          <span className="font-mono-tabular font-extrabold text-2xl text-[#4A5240]">
            {totalPrice} €
          </span>
        </div>

        <button
          type="submit"
          disabled={currentConflict.hasConflict}
          className="w-full py-3.5 px-6 rounded-xl bg-[#F1BF70] hover:bg-[#E5AE56] disabled:opacity-50 disabled:cursor-not-allowed text-[#4A5240] font-display font-extrabold text-base transition-colors shadow-xs cursor-pointer whitespace-nowrap"
        >
          Solicitar Reserva en La Tribu
        </button>
      </div>
    </form>
  );
};
