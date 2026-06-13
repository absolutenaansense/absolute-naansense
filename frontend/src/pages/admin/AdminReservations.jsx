import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { reservationsApi } from '../../services/api'
import { FLOOR_SECTIONS } from '../../config/floorLayout'

const TIME_SLOTS = ['12:00 PM', '1:00 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM']

export default function AdminReservations() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ guestName: '', phone: '', guestCount: 2, tableLabel: '', timeSlot: '8:00 PM', notes: '', date: new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'}) })
  const queryClient = useQueryClient()

  const { data: reservationsData } = useQuery({
    queryKey: ['admin-reservations', format(currentMonth, 'yyyy-MM')],
    queryFn: () => reservationsApi.all({
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
    }).then(r => r.data),
  })

  const { mutate: createReservation, isPending } = useMutation({
    mutationFn: (data) => reservationsApi.create(data),
    onSuccess: () => {
      toast.success('Reservation confirmed!')
      queryClient.invalidateQueries(['admin-reservations'])
      setShowModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create reservation'),
  })

  const { mutate: cancelReservation } = useMutation({
    mutationFn: (id) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled')
      queryClient.invalidateQueries(['admin-reservations'])
    },
  })

  const reservations = reservationsData?.reservations || []

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()

  const getReservationsForDate = (date) =>
    reservations.filter(r => isSameDay(new Date(r.date), date) && r.status === 'CONFIRMED')

  const selectedDateReservations = getReservationsForDate(selectedDate)

  const handleSubmit = () => {
    if (!form.guestName || !form.phone) {
      toast.error('Guest name and phone are required')
      return
    }
    createReservation({ ...form, guestCount: parseInt(form.guestCount), status: 'CONFIRMED' })
  }

  return (
    <AdminLayout title="Reservations">
      <div className="grid grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="col-span-2">
          <div className="card p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-ghost p-2">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-sm font-semibold text-stone-800">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-ghost p-2">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map(day => {
                const dayReservations = getReservationsForDate(day)
                const isSelected = isSameDay(day, selectedDate)
                const todayDay = isToday(day)
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                      isSelected ? 'bg-brand-500 text-white' :
                      todayDay ? 'border-2 border-brand-300 text-brand-600 font-semibold' :
                      'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {dayReservations.length > 0 && (
                      <div className={`flex gap-0.5 mt-0.5 ${isSelected ? 'opacity-70' : ''}`}>
                        {dayReservations.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-400'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Selected day panel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-700">{format(selectedDate, 'dd MMM yyyy')}</h3>
            <button
              onClick={() => { setForm(f => ({ ...f, date: format(selectedDate, 'yyyy-MM-dd') })); setShowModal(true) }}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <Plus size={13} /> New booking
            </button>
          </div>

          {selectedDateReservations.length === 0 ? (
            <div className="card p-6 text-center">
              <div className="text-stone-300 text-3xl mb-2">📅</div>
              <div className="text-sm text-stone-400">No reservations</div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateReservations.map(r => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{r.guestName}</div>
                      <div className="text-xs text-stone-400">{r.phone}</div>
                    </div>
                    <button
                      onClick={() => cancelReservation(r.id)}
                      className="text-stone-300 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><Users size={11} /> {r.guestCount} guests</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {r.timeSlot}</span>
                  </div>
                  {r.tableLabel && <div className="text-xs text-brand-500 mt-1">Table {r.tableLabel}</div>}
                  {r.notes && <div className="text-xs text-stone-400 mt-1 italic">{r.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New booking modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-stone-800">New reservation</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Guest name</label>
                  <input className="input" placeholder="Sharma family" value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="98765 43210" maxLength={10} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Time slot</label>
                  <select className="input" value={form.timeSlot} onChange={e => setForm(p => ({ ...p, timeSlot: e.target.value }))}>
                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">No. of guests</label>
                  <input className="input" type="number" min="1" max="50" value={form.guestCount} onChange={e => setForm(p => ({ ...p, guestCount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Table</label>
                  <select className="input" value={form.tableLabel} onChange={e => setForm(p => ({ ...p, tableLabel: e.target.value }))}>
                    <option value="">Any table</option>
                    {FLOOR_SECTIONS.map(section => (
                      <optgroup key={section.name} label={section.name}>
                        {section.tables.map(t => (
                          <option key={t.label} value={t.label}>{t.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Anniversary, veg only, wheelchair, etc." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 justify-center">
                {isPending ? 'Saving…' : 'Confirm reservation'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
