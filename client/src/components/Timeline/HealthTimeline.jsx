import React, { useState, useMemo } from 'react';
import {
  FileText,
  Pill,
  Heart,
  Syringe,
  Activity,
  AlertCircle,
  Filter,
  ChevronDown,
} from 'lucide-react';
import LoadingSkeleton from '../State/LoadingSkeleton';
import EmptyState from '../State/EmptyState';

/**
 * HealthTimeline Component
 * 
 * Displays chronological health events with filtering and search.
 * Events include appointments, labs, medications, vaccinations, records, etc.
 * 
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.events - Timeline events array
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {string} [props.error=null] - Error message
 * @param {number} [props.pageSize=10] - Events per page
 * @returns {React.ReactElement}
 */
export default function HealthTimeline({ events = [], isLoading = false, error = null, pageSize = 10 }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Event type icons and colors
  const eventTypeConfig = {
    appointment: { icon: Activity, color: 'bg-blue-100', textColor: 'text-blue-800', label: 'Appointment' },
    lab_result: { icon: FileText, color: 'bg-green-100', textColor: 'text-green-800', label: 'Lab Result' },
    medication: { icon: Pill, color: 'bg-purple-100', textColor: 'text-purple-800', label: 'Medication' },
    vaccination: { icon: Syringe, color: 'bg-orange-100', textColor: 'text-orange-800', label: 'Vaccination' },
    vital: { icon: Heart, color: 'bg-red-100', textColor: 'text-red-800', label: 'Vital Sign' },
    record: { icon: FileText, color: 'bg-gray-100', textColor: 'text-gray-800', label: 'Health Record' },
    alert: { icon: AlertCircle, color: 'bg-amber-100', textColor: 'text-amber-800', label: 'Alert' },
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(event.type)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.detail?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [events, selectedTypes, searchTerm]);

  // Paginate events
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

  // Get unique event types for filter
  const availableTypes = [...new Set(events.map((e) => e.type))];

  const toggleTypeFilter = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="timeline" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <p>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        type="no-records"
        title="No health records yet"
        description="Your health timeline will appear here as records are added by your healthcare providers."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input pl-10"
            aria-label="Search health timeline"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 w-full">
            <Filter size={16} />
            Filter by Type:
          </label>
          {availableTypes.map((type) => {
            const config = eventTypeConfig[type] || eventTypeConfig.record;
            const isSelected = selectedTypes.includes(type);

            return (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? `${config.color} ${config.textColor} shadow-sm`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={isSelected}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-600">
          Showing {paginatedEvents.length} of {filteredEvents.length} events
        </p>
      </div>

      {/* Timeline */}
      {paginatedEvents.length > 0 ? (
        <div className="space-y-4">
          {paginatedEvents.map((event, index) => {
            const config = eventTypeConfig[event.type] || eventTypeConfig.record;
            const Icon = config.icon;
            const date = new Date(event.date || event.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={event.id || index}
                className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 p-3 rounded transition-colors"
              >
                {/* Timeline marker */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                  <Icon size={20} className={config.textColor} />
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {event.title || config.label}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                      )}
                      {event.detail && (
                        <p className="text-xs text-gray-500 mt-2">
                          {event.detail}
                        </p>
                      )}
                    </div>

                    {/* Date and time */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-gray-700">
                        {formattedDate}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formattedTime}
                      </p>
                    </div>
                  </div>

                  {/* Event metadata (if available) */}
                  {event.metadata && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        value && (
                          <span key={key} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {key}: {value}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          type="no-search"
          description="No events match your search criteria."
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
