import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { appointmentService } from '../services/appointmentService';

/**
 * HospitalSchedulePage
 * 
 * Calendar view of doctor's schedule with appointments organized by date and time.
 */
export default function HospitalSchedulePage() {
  const { user } = useAuthStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // week or day

  useEffect(() => {
    loadSchedule();
  }, [user, selectedDate]);

  const loadSchedule = async () => {
    if (!user || user.role !== 'DOCTOR') {
      setIsLoading(false);
      setError('Access restricted to doctors only');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const professionalId = user.professionalId || user._id;
      const filters = {};
      
      if (user.facilityId) {
        filters.facilityId = user.facilityId;
      }

      const response = await appointmentService.getDoctorAppointments(professionalId, filters);
      
      if (response?.success && response?.data) {
        setAppointments(response.data);
      } else if (Array.isArray(response)) {
        setAppointments(response);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      const serverCode = error.response?.data?.code;
      const serverMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      if (serverCode === 'NO_FACILITY_ASSOCIATION' || error.response?.status === 403 || error.message?.includes('400')) {
        setError(serverMessage || 'No active hospital facility association found for your doctor account. Please contact your hospital administrator for onboarding approval.');
      } else {
        setError(serverMessage || 'Failed to load schedule');
      }
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const getWeekDates = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = date.toDateString();
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDateTime);
      return aptDate.toDateString() === dateStr;
    }).sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'arrived':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <SectionTitle title="My Schedule" icon={<Calendar size={32} />} />
        <LoadingSkeleton count={5} />
      </PageContainer>
    );
  }

  if (error) {
    const isNoFacility =
      error.toLowerCase().includes('facility') ||
      error.toLowerCase().includes('administrator') ||
      error.toLowerCase().includes('association');

    return (
      <PageContainer>
        <SectionTitle title="My Schedule" icon={<Calendar size={32} />} />
        {isNoFacility ? (
          <div className="card border-amber-200 bg-amber-50 p-6 text-center">
            <div className="flex justify-center mb-3">
              <AlertCircle size={40} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Hospital Facility Association Required
            </h3>
            <p className="text-amber-800 text-sm max-w-lg mx-auto mb-4">
              {error}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={loadSchedule} className="btn-secondary text-sm">
                Check Again
              </button>
            </div>
          </div>
        ) : (
          <div className="card border-red-200 bg-red-50">
            <p className="text-red-800">{error}</p>
            <button onClick={loadSchedule} className="btn-secondary mt-4">
              Retry
            </button>
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <SectionTitle
        title="My Schedule"
        description="View your appointment schedule"
        icon={<Calendar size={32} />}
      />

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'week' 
                ? `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="btn-secondary text-sm"
            >
              Today
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
              className="btn-secondary text-sm"
            >
              {viewMode === 'week' ? 'Day View' : 'Week View'}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule View */}
      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {getWeekDates().map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const dayAppointments = getAppointmentsForDate(date);

            return (
              <div key={idx} className={`card ${isToday ? 'border-2 border-jeevacare-blue' : ''}`}>
                <div className={`text-center mb-3 pb-3 border-b ${isToday ? 'border-jeevacare-blue' : 'border-gray-200'}`}>
                  <p className="text-xs font-medium text-gray-600">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? 'text-jeevacare-blue' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </p>
                </div>

                {dayAppointments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No appointments</p>
                ) : (
                  <div className="space-y-2">
                    {dayAppointments.map((apt) => {
                      const aptTime = new Date(apt.scheduledDateTime);
                      return (
                        <div
                          key={apt._id}
                          className={`p-2 rounded border text-xs ${getStatusColor(apt.status)}`}
                        >
                          <p className="font-medium flex items-center gap-1 mb-1">
                            <Clock size={12} />
                            {aptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="font-semibold truncate">{apt.patientName || 'Unknown'}</p>
                          <p className="truncate text-xs opacity-75">{apt.reason || 'Consultation'}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Day View
        <div className="card">
          {getAppointmentsForDate(selectedDate).length === 0 ? (
            <EmptyState
              title="No Appointments"
              description="You have no appointments scheduled for this day."
              icon={<Calendar size={48} className="text-gray-300" />}
            />
          ) : (
            <div className="space-y-3">
              {getAppointmentsForDate(selectedDate).map((apt) => {
                const aptTime = new Date(apt.scheduledDateTime);
                return (
                  <div key={apt._id} className={`p-4 rounded-lg border-2 ${getStatusColor(apt.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={18} />
                        <span className="text-lg font-bold">
                          {aptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                        {apt.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{apt.patientName || 'Unknown Patient'}</h3>
                    <p className="text-sm mb-2">{apt.reason || 'General Consultation'}</p>
                    <p className="text-xs opacity-75">JeevaCare ID: {apt.patientJeevaId || 'N/A'}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
