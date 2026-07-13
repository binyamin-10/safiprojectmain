"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  themeColor?: "indigo" | "emerald";
}

export default function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  themeColor = "indigo",
}: CalendarModalProps) {
  // Parse initial state from selectedDate or fallback to today
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );

  if (!isOpen) return null;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelectDate(formattedDate);
    onClose();
  };

  // Generate day cells
  const firstDayIdx = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayCells = [];

  // Empty placeholder cells for offset
  for (let i = 0; i < firstDayIdx; i++) {
    dayCells.push(<div key={`empty-${i}`} className="w-9 h-9" />);
  }

  // Actual day cells
  for (let day = 1; day <= totalDays; day++) {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = selectedDate === formattedDate;

    let activeBg = "bg-indigo-600 hover:bg-indigo-700 text-white";
    if (themeColor === "emerald") {
      activeBg = "bg-emerald-600 hover:bg-emerald-700 text-white";
    }

    dayCells.push(
      <button
        key={day}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`w-9 h-9 flex items-center justify-center text-sm font-bold rounded-xl transition-all ${
          isSelected
            ? `${activeBg} shadow-md`
            : "text-[#0f172a] hover:bg-[#f1f5f9]"
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-5 w-full max-w-[340px] z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Title & Close button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-extrabold text-sm text-slate-200 tracking-tight">
            Select Date of Birth
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#f1f5f9] rounded-lg text-slate-400 hover:text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month/Year selectors & Chevrons */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-[#f1f5f9] rounded-xl text-slate-500 hover:text-[#0f172a] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="bg-[#f8fafc] text-[#0f172a] text-xs font-extrabold py-1 px-2 rounded-xl border border-slate-200 outline-none cursor-pointer hover:bg-[#f1f5f9] transition-colors"
            >
              {months.map((m, i) => (
                <option key={m} value={i} className="bg-white text-[#0f172a]">
                  {m}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="bg-[#f8fafc] text-[#0f172a] text-xs font-extrabold py-1 px-2 rounded-xl border border-slate-200 outline-none cursor-pointer hover:bg-[#f1f5f9] transition-colors"
            >
              {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y} className="bg-white text-[#0f172a]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-[#f1f5f9] rounded-xl text-slate-500 hover:text-[#0f172a] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday Names */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
            <span key={dayName} className="text-xs font-black text-slate-400">
              {dayName}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {dayCells}
        </div>
      </div>
    </div>
  );
}
