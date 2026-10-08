/**
 * Timeline Routes
 * 
 * Handles patient lifelong clinical timeline queries.
 * Aggregates appointments, encounters, and clinical records chronologically.
 * Full authorization integration.
 * 
 * Endpoints:
 * GET    /timeline/patient/:patientId           - Get patient's full timeline
 * GET    /timeline/patient/:patientId/recent    - Get recent events (dashboard)
 * GET    /timeline/patient/:patientId/stats     - Get timeline statistics
 * GET    /timeline/encounter/:encounterId/context - Get encounter in timeline context
 */

const express = require('express');
const router = express.Router();
const TimelineService = require('../services/TimelineService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /timeline/patient/:patientId
 * Get patient's complete chronological timeline
 * 
 * Query params:
 * - sortOrder: 'asc' | 'desc' (default: 'desc', most recent first)
 * - startDate: optional ISO8601 (filter from this date)
 * - endDate: optional ISO8601 (filter until this date)
 * - types: optional comma-separated list (appointment,encounter,record)
 *          defaults to all types
 * 
 * Response: {
 *   timeline: [
 *     {
 *       id: string,
 *       type: 'appointment' | 'encounter' | 'clinical_record' | 'clinical_amendment',
 *       date: ISO8601,
 *       status: string,
 *       title: string,
 *       facilityId: string,
 *       description: string,
 *       eventData: object
 *     }
 *   ],
 *   summary: {
 *     totalEvents: number,
 *     dateRange: { from, to },
 *     eventTypeBreakdown: { appointments, encounters, records, amendments }
 *   }
 * }
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { sortOrder = 'desc', startDate, endDate, types } = req.query;

    // Parse types if provided as comma-separated string
    let parsedTypes = null;
    if (types) {
      parsedTypes = types.split(',').map(t => t.trim());
    }

    const result = await TimelineService.getPatientTimeline(patientId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, {
      sortOrder: sortOrder || 'desc',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      types: parsedTypes,
    });

    res.json({
      success: true,
      data: result.timeline,
      summary: result.summary,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /timeline/patient/:patientId/recent
 * Get recent timeline events (useful for dashboards)
 * 
 * Query params:
 * - limit: number of recent events (default: 10)
 * 
 * Response: {
 *   recentEvents: [...],
 *   lastEventDate: ISO8601,
 *   totalAvailable: number
 * }
 */
router.get('/patient/:patientId/recent', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Cap at 100

    const result = await TimelineService.getRecentEvents(patientId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, limit);

    res.json({
      success: true,
      data: result.recentEvents,
      lastEventDate: result.lastEventDate,
      totalAvailable: result.totalAvailable,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /timeline/patient/:patientId/stats
 * Get timeline statistics summary
 * 
 * Response: {
 *   totalEvents: number,
 *   eventTypeBreakdown: { appointments, encounters, records, amendments },
 *   facilitiesVisited: number,
 *   doctorsVisited: number,
 *   recordTypeBreakdown: { diagnosis: N, prescription: N, ... },
 *   appointmentStats: { completed, cancelled, total }
 * }
 */
router.get('/patient/:patientId/stats', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    const stats = await TimelineService.getTimelineStats(patientId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /timeline/encounter/:encounterId/context
 * Get encounter in full timeline context
 * Shows the encounter + linked appointment + related clinical records
 * 
 * Response: {
 *   encounter: {...},
 *   appointment: {...} or null,
 *   relatedRecords: [...]
 * }
 */
router.get('/encounter/:encounterId/context', authenticateToken, async (req, res) => {
  try {
    const { encounterId } = req.params;

    const context = await TimelineService.getEncounterContext(encounterId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

module.exports = router;
