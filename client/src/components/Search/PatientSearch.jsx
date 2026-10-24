import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, AlertCircle, Loader } from 'lucide-react';
import LoadingSkeleton from '../State/LoadingSkeleton';
import { patientService } from '../../services/patientService';
import api from '../../services/api';

/**
 * PatientSearch Component
 * 
 * Real-time patient search with autocomplete for providers.
 * Searches by name, ID, email, or phone number.
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onSelectPatient - Callback when patient selected: (patient) => void
 * @param {Function} [props.onSearch] - Custom search function: (query) => Promise<patients[]>
 * @param {boolean} [props.isLoading=false] - Loading state
 * @returns {React.ReactElement}
 */
export default function PatientSearch({ onSelectPatient, onSearch = null, isLoading = false, facilityId = null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // API-backed search function
  const defaultSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return [];

    try {
      // Call backend patient search API
      const facilityQuery = facilityId ? `&facilityId=${encodeURIComponent(facilityId)}` : '';
      const response = await api.get(`/patients/search?q=${encodeURIComponent(searchQuery)}&limit=10${facilityQuery}`);
      
      if (response.success && response.data?.patients) {
        // Transform backend data to component format
        return response.data.patients.map(patient => ({
          id: patient._id,
          name: `${patient.personalIdentity?.firstName || ''} ${patient.personalIdentity?.lastName || ''}`.trim(),
          email: patient.personalIdentity?.email || 'N/A',
          phone: patient.personalIdentity?.phone || 'N/A',
          dateOfBirth: patient.personalIdentity?.dateOfBirth,
          jeevaId: patient.jeevaId || 'N/A',
          lastVisit: patient.lastVisit ? new Date(patient.lastVisit) : new Date(),
          status: patient.status || 'active',
          avatar: patient.personalIdentity?.gender === 'F' ? '👩' : patient.personalIdentity?.gender === 'M' ? '👨' : '🧑',
          // Include full patient object for downstream use
          _raw: patient
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Patient search API error:', error);
      // Return empty array on error to show "no results" UI
      return [];
    }
  }, [facilityId]);

  // Handle search input
  const handleSearch = useCallback(
    async (value) => {
      setQuery(value);
      setSelectedIndex(-1);

      if (!value.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const searchFn = onSearch || defaultSearch;
        const searchResults = await searchFn(value);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [onSearch, defaultSearch]
  );

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectPatient(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
      default:
        break;
    }
  };

  const handleSelectPatient = (patient) => {
    onSelectPatient?.(patient);
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        if (inputRef.current && !inputRef.current.contains(e.target)) {
          setShowResults(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name, email, phone, or JeevaCare ID..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowResults(true)}
          className="form-input pl-10"
          aria-label="Search patients"
          aria-autocomplete="list"
          aria-expanded={showResults}
          role="combobox"
        />
        {isSearching && (
          <Loader size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-jeevacare-blue animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto"
          role="listbox"
        >
          {isSearching ? (
            <div className="p-4">
              <LoadingSkeleton type="avatar" count={2} />
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {results.map((patient, index) => (
                <li key={patient.id} role="option" aria-selected={index === selectedIndex}>
                  <button
                    onClick={() => handleSelectPatient(patient)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left p-4 hover:bg-blue-50 transition-colors focus-visible:outline-offset-2 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 text-2xl">{patient.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                          <span>{patient.jeevaId}</span>
                          <span>•</span>
                          <span>{patient.email}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Last visit:{' '}
                          {patient.lastVisit.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="badge-success">Active</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center">
              {query ? (
                <>
                  <AlertCircle size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No patients found matching "{query}"</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Start typing to search for a patient</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
