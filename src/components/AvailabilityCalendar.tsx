import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Reservation,
  CalendarBlock,
  intervalsOverlap,
} from '../types/booking';

interface AvailabilityCalendarProps {
  reservations: Reservation[];
  blocks: CalendarBlock[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Enero, 9 = Octubre)
  onChangeMonth: (year: number, month: number) => void;
  isAdminMode?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface DayAvailabilitySummary {
  dateStr: string;
  dayNumber: number;
  isPast: boolean;
  morningState: 'free' | 'pending' | 'confirmed' | 'blocked';
  afternoonState: 'free' | 'pending' | 'confirmed' | 'blocked';
  dayReservations: Reservation[];
  dayBlocks: CalendarBlock[];
  overallLabel: string;
  overallTone: 'free' | 'partial' | 'pending' | 'full' | 'blocked';
}

export function getDayAvailability(
  dateStr: string,
  dayNumber: number,
  reservations: Reservation[],
  blocks: CalendarBlock[]
): DayAvailabilitySummary {
  const activeRes = reservations.filter(
    (r) => r.date === dateStr && (r.status === 'confirmed' || r.status === 'pending')
  );
  const activeBlocks = blocks.filter((b) => b.date === dateStr);

  const checkIntervalState = (start: string, end: string): 'free' | 'pending' | 'confirmed' | 'blocked' => {
    const hasBlock = activeBlocks.some((b) => intervalsOverlap(start, end, b.startTime, b.endTime));
    if (hasBlock) return 'blocked';

    const hasConfirmed = activeRes.some(
      (r) => r.status === 'confirmed' && intervalsOverlap(start, end, r.startTime, r.endTime)
    );
    if (hasConfirmed) return 'confirmed';

    const hasPending = activeRes.some(
      (r) => r.status === 'pending' && intervalsOverlap(start, end, r.startTime, r.endTime)
    );
    if (hasPending) return 'pending';

    return 'free';
  };

  const morningState = checkIntervalState('10:00', '14:30');
  const afternoonState = checkIntervalState('16:00', '21:00');

  const isPast = dateStr < '2026-09-30';

  let overallLabel = 'Disponible';
  let overallTone: DayAvailabilitySummary['overallTone'] = 'free';

  if (morningState === 'blocked' && afternoonState === 'blocked') {
    overallLabel = 'Bloqueado';
    overallTone = 'blocked';
  } else if (
    (morningState === 'confirmed' || morningState === 'blocked') &&
    (afternoonState === 'confirmed' || afternoonState === 'blocked')
  ) {
    overallLabel = 'Completo';
    overallTone = 'full';
  } else if (morningState === 'free' && afternoonState === 'free' && activeRes.length === 0 && activeBlocks.length === 0) {
    overallLabel = 'Libre';
    overallTone = 'free';
  } else if (morningState === 'pending' || afternoonState === 'pending') {
    if (morningState === 'free') {
      overallLabel = 'Mañana libre';
    } else if (afternoonState === 'free') {
      overallLabel = 'Tarde libre';
    } else {
      overallLabel = 'En solicitud';
    }
    overallTone = 'pending';
  } else {
    if (morningState === 'free') {
      overallLabel = 'Mañana libre';
    } else if (afternoonState === 'free') {
      overallLabel = 'Tarde libre';
    } else {
      overallLabel = 'Parcial';
    }
    overallTone = 'partial';
  }

  return {
    dateStr,
    dayNumber,
    isPast,
    morningState,
    afternoonState,
    dayReservations: activeRes,
    dayBlocks: activeBlocks,
    overallLabel,
    overallTone,
  };
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  reservations,
  blocks,
  selectedDate,
  onSelectDate,
  currentYear,
  currentMonth,
  onChangeMonth,
  isAdminMode = false,
}) => {
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<DayAvailabilitySummary | null> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      cells.push(getDayAvailability(dateStr, d, reservations, blocks));
    }

    return cells;
  }, [currentYear, currentMonth, reservations, blocks]);

  const selectedDayInfo = useMemo(() => {
    const parts = selectedDate.split('-').map(Number);
    const dayNum = parts[2] || 1;
    return getDayAvailability(selectedDate, dayNum, reservations, blocks);
  }, [selectedDate, reservations, blocks]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onChangeMonth(currentYear - 1, 11);
    } else {
      onChangeMonth(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onChangeMonth(currentYear + 1, 0);
    } else {
      onChangeMonth(currentYear, currentMonth + 1);
    }
  };

  const renderSlotStateLabel = (state: 'free' | 'pending' | 'confirmed' | 'blocked', prefix: string) => {
    switch (state) {
      case 'free':
        return (
          <span className="text-[11px] text-[#5B664E] flex items-center justify-between">
            <span>{prefix}</span>
            <span className="font-semibold">Libre</span>
          </span>
        );
      case 'pending':
        return (
          <span className="text-[11px] text-[#9A6B1F] flex items-center justify-between">
            <span>{prefix}</span>
            <span className="font-semibold">Solicitado</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="text-[11px] text-[#9E5344] flex items-center justify-between">
            <span>{prefix}</span>
            <span className="font-semibold">Ocupado</span>
          </span>
        );
      case 'blocked':
        return (
          <span className="text-[11px] text-[#7A5835] flex items-center justify-between">
            <span>{prefix}</span>
            <span className="font-semibold">Cerrado</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FFF9F1] border border-[#C39D70]/30 rounded-2xl p-5 sm:p-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#C39D70]/20">
        <div>
          <h3 className="font-display font-extrabold text-xl text-[#707A63] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#9AA08A]" />
            <span>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </h3>
          <p className="text-sm text-[#707A63]/80 mt-0.5">
            Pulsa sobre cualquier día para consultar los tramos horarios o elegir fecha
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-3 py-2 rounded-lg border border-[#C39D70]/35 bg-[#F8EFE1]/70 text-[#707A63] hover:bg-[#F1BF70]/30 transition-colors text-sm font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(2026, 9)}
            className="px-3 py-2 rounded-lg border border-[#C39D70]/35 bg-[#FFF9F1] text-[#707A63] hover:bg-[#F1BF70]/25 transition-colors text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            Octubre 2026
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="px-3 py-2 rounded-lg border border-[#C39D70]/35 bg-[#F8EFE1]/70 text-[#707A63] hover:bg-[#F1BF70]/30 transition-colors text-sm font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
            aria-label="Mes siguiente"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend (Explicit Text + Visual Swatch for Accessibility) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5 text-xs text-[#707A63] border-b border-[#C39D70]/15">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#9AA08A]/25 border border-[#707A63]" />
          <span>Libre (Mañana y Tarde)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#F1BF70]/45 border border-[#B88228]" />
          <span>Parcial o Solicitud Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#DFAEA1]/50 border border-[#B56A5A]" />
          <span>Reservado / Completo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#C39D70]/40 border border-[#8C673E]" />
          <span>Bloqueado por La Tribu</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-4 mb-2 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-xs font-subtitle font-bold text-[#707A63] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarDays.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[78px] sm:min-h-[96px] rounded-xl bg-[#F8EFE1]/35 border border-transparent"
              />
            );
          }

          const isSelected = cell.dateStr === selectedDate;

          let surfaceClass = 'bg-[#FFF9F1] border-[#9AA08A]/40 hover:border-[#707A63]';
          if (cell.overallTone === 'blocked') {
            surfaceClass = 'bg-[#C39D70]/20 border-[#C39D70]/60 hover:border-[#8C673E]';
          } else if (cell.overallTone === 'full') {
            surfaceClass = 'bg-[#DFAEA1]/25 border-[#DFAEA1] hover:border-[#CC8F81]';
          } else if (cell.overallTone === 'pending' || cell.overallTone === 'partial') {
            surfaceClass = 'bg-[#F1BF70]/20 border-[#F1BF70] hover:border-[#C39D70]';
          } else {
            surfaceClass = 'bg-[#9AA08A]/10 border-[#9AA08A]/45 hover:border-[#707A63]';
          }

          if (cell.isPast && !isAdminMode) {
            surfaceClass = 'bg-[#F8EFE1]/60 border-[#C39D70]/20 opacity-55';
          }

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={cell.isPast && !isAdminMode}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[78px] sm:min-h-[96px] p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer disabled:cursor-not-allowed ${surfaceClass} ${
                isSelected
                  ? 'ring-2 ring-[#707A63] ring-offset-2 ring-offset-[#FFF9F1] shadow-sm'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`font-mono-tabular text-sm sm:text-base font-bold ${
                    isSelected ? 'text-[#4A5240]' : 'text-[#707A63]'
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {cell.overallTone === 'blocked' && (
                  <Lock className="w-3.5 h-3.5 text-[#8C673E] shrink-0" />
                )}
                {cell.overallTone === 'free' && !cell.isPast && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#707A63] shrink-0 hidden sm:block" />
                )}
                {(cell.overallTone === 'pending' || cell.overallTone === 'partial') && (
                  <Clock className="w-3.5 h-3.5 text-[#9A6B1F] shrink-0 hidden sm:block" />
                )}
              </div>

              {/* Desktop M / T Breakdown */}
              <div className="hidden md:flex flex-col gap-0.5 my-1 border-t border-[#C39D70]/20 pt-1">
                {renderSlotStateLabel(cell.morningState, 'M:')}
                {renderSlotStateLabel(cell.afternoonState, 'T:')}
              </div>

              {/* Bottom Status Text (Never color alone) */}
              <div className="w-full truncate text-[10px] sm:text-[11px] font-semibold text-[#4A5240] leading-tight">
                {cell.isPast && !isAdminMode ? 'Pasado' : cell.overallLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Live Schedule Breakdown */}
      <div className="mt-5 pt-5 border-t border-[#C39D70]/25 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#707A63]" />
            <span className="font-subtitle font-bold text-sm text-[#707A63]">
              Estado de horarios para el día{' '}
              <span className="font-mono-tabular underline decoration-[#F1BF70] decoration-2">
                {selectedDate}
              </span>
            </span>
          </div>
          <span className="text-xs text-[#707A63]/80">
            Mañana (10:00–14:30) · Tarde (16:00–21:00) · Día completo (10:00–22:00)
          </span>
        </div>

        {selectedDayInfo.dayBlocks.length === 0 && selectedDayInfo.dayReservations.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-[#9AA08A]/15 border border-[#9AA08A]/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-[#4A5240]">
              <CheckCircle2 className="w-4 h-4 text-[#707A63] shrink-0" />
              <span>
                <strong>Todos los horarios disponibles.</strong> Puedes reservar Mañana, Tarde, Día Completo o por horas.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {selectedDayInfo.dayBlocks.map((blk) => (
              <div
                key={blk.id}
                className="p-3 rounded-xl bg-[#C39D70]/20 border border-[#C39D70]/50 flex items-start gap-2.5 text-xs text-[#5A4228]"
              >
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold font-mono-tabular">
                    Bloqueado: {blk.startTime} – {blk.endTime}
                  </div>
                  <div className="mt-0.5">
                    {isAdminMode ? blk.reason : 'Tramo no disponible para reservas'}
                  </div>
                </div>
              </div>
            ))}
            {selectedDayInfo.dayReservations.map((res) => (
              <div
                key={res.id}
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  res.status === 'confirmed'
                    ? 'bg-[#DFAEA1]/25 border-[#DFAEA1] text-[#6E382D]'
                    : 'bg-[#F1BF70]/25 border-[#F1BF70] text-[#6B4A12]'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold font-mono-tabular">
                    {res.startTime} – {res.endTime} ·{' '}
                    {res.status === 'confirmed' ? 'Reserva Confirmada' : 'Solicitud Pendiente'}
                  </div>
                  <div className="mt-0.5">
                    {isAdminMode
                      ? `${res.firstName} ${res.lastName} · ${res.eventType} (${res.phone})`
                      : `Tramo ${res.status === 'confirmed' ? 'ocupado' : 'solicitado pendiente de confirmación'}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
