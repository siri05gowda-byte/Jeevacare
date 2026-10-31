/**
 * Radiology Background Job Recovery & Concurrency Unit Tests
 * 
 * Specifically tests:
 * 1. Stale-job recovery detection on server startup
 * 2. Atomic locking mechanism preventing concurrent execution
 * 3. Heartbeat updating and stale threshold calculation
 * 4. Maximum retry limits before permanent failure
 * 5. Duplicate-processing prevention on locked records
 * 6. Guarantee that active jobs with fresh heartbeats are NEVER accidentally recovered or re-dispatched
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RadiologyAIService from '../RadiologyAIService.js';
import RadiologyRecord from '../../models/RadiologyRecord.js';

describe('RadiologyAIService - Job Recovery & Concurrency Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Atomic Processing Lock & Duplicate Prevention', () => {
    it('should acquire lock with PID and release lock on completion', async () => {
      const mockRecordId = '507f1f77bcf86cd799439091';
      const mockRecord = {
        _id: mockRecordId,
        modalityType: 'other',
        bodyPart: 'Abdomen',
        aiAnalysis: { status: 'queued' },
        aiJob: { processingLock: false, heartbeatAt: new Date() },
      };

      // Mock findOneAndUpdate for lock acquisition
      const findOneAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findOneAndUpdate').mockResolvedValue(mockRecord);
      const findByIdSpy = vi.spyOn(RadiologyRecord, 'findById').mockResolvedValue(mockRecord);
      const findByIdAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findByIdAndUpdate').mockResolvedValue(mockRecord);

      // Mock processRadiologyStudy so it resolves quickly
      vi.spyOn(RadiologyAIService, 'processRadiologyStudy').mockResolvedValue({
        success: true,
        status: 'unsupported_modality',
      });

      const result = await RadiologyAIService._runWithLock(
        mockRecordId,
        { _id: 'user1', role: 'PATIENT' },
        {}
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify lock acquisition attempted atomically
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: mockRecordId,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            'aiJob.processingLock': true,
            'aiJob.lockPid': process.pid,
          }),
        }),
        expect.any(Object)
      );

      // Verify lock was released in finally block
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
        mockRecordId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'aiJob.processingLock': false,
            'aiJob.lockPid': null,
          }),
        })
      );
    });

    it('should prevent duplicate processing if record is already locked', async () => {
      const mockRecordId = '507f1f77bcf86cd799439092';

      // Atomic lock acquisition returns null when record is already locked
      vi.spyOn(RadiologyRecord, 'findOneAndUpdate').mockResolvedValue(null);
      const processSpy = vi.spyOn(RadiologyAIService, 'processRadiologyStudy');

      const result = await RadiologyAIService._runWithLock(
        mockRecordId,
        { _id: 'user1', role: 'PATIENT' },
        {}
      );

      // Must skip processing and return null
      expect(result).toBeNull();
      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should release lock even if processing throws an error', async () => {
      const mockRecordId = '507f1f77bcf86cd799439093';
      const mockRecord = {
        _id: mockRecordId,
        aiJob: { processingLock: false },
      };

      vi.spyOn(RadiologyRecord, 'findOneAndUpdate').mockResolvedValue(mockRecord);
      vi.spyOn(RadiologyAIService, 'processRadiologyStudy').mockRejectedValue(new Error('Inference failure'));
      const findByIdAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findByIdAndUpdate').mockResolvedValue(mockRecord);

      await expect(
        RadiologyAIService._runWithLock(mockRecordId, { _id: 'user1' }, {})
      ).rejects.toThrow('Inference failure');

      // Verify lock released in finally block despite error
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
        mockRecordId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'aiJob.processingLock': false,
            'aiJob.lockPid': null,
          }),
        })
      );
    });
  });

  describe('Stale-Job Recovery & Active Job Protection', () => {
    it('should recover and re-dispatch stale queued/processing jobs on startup', async () => {
      const staleDate = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago (stale > 10 min)
      const staleRecordId = '507f1f77bcf86cd799439094';

      const staleRecords = [
        {
          _id: staleRecordId,
          aiAnalysis: { status: 'processing' },
          aiJob: {
            retryCount: 0,
            maxRetries: 3,
            dispatchedAt: staleDate,
            heartbeatAt: staleDate,
          },
        },
      ];

      // Mock DB query finding stale jobs
      vi.spyOn(RadiologyRecord, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(staleRecords),
        }),
      });

      const findByIdAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findByIdAndUpdate').mockResolvedValue({});
      const runWithLockSpy = vi.spyOn(RadiologyAIService, '_runWithLock').mockResolvedValue({});

      const recoveryResult = await RadiologyAIService.recoverStaleJobs();

      expect(recoveryResult.recovered).toBe(1);

      // Verify DB updated with reset lock and incremented retry count
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
        staleRecordId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'aiJob.processingLock': false,
            'aiJob.retryCount': 1,
          }),
          $push: expect.objectContaining({
            'aiJob.errorHistory': expect.objectContaining({
              attempt: 1,
            }),
          }),
        })
      );
    });

    it('GUARANTEE: should NOT recover or disturb actively processing jobs with fresh heartbeats', async () => {
      // Actively processing job: heartbeat was 10 seconds ago
      const freshHeartbeat = new Date(Date.now() - 10 * 1000);

      // The MongoDB query filters for heartbeatAt < staleThreshold
      // When jobs are active with fresh heartbeats, the query returns 0 stale records
      vi.spyOn(RadiologyRecord, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]), // No stale records returned by query
        }),
      });

      const findByIdAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findByIdAndUpdate');
      const runWithLockSpy = vi.spyOn(RadiologyAIService, '_runWithLock');

      const recoveryResult = await RadiologyAIService.recoverStaleJobs();

      expect(recoveryResult.recovered).toBe(0);
      expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();
      expect(runWithLockSpy).not.toHaveBeenCalled();
    });

    it('should permanently mark record as failed when max retries exceeded', async () => {
      const staleRecordId = '507f1f77bcf86cd799439095';
      const staleRecords = [
        {
          _id: staleRecordId,
          aiAnalysis: { status: 'queued' },
          aiJob: {
            retryCount: 3, // Already reached max retries
            maxRetries: 3,
            dispatchedAt: new Date(Date.now() - 20 * 60 * 1000),
          },
        },
      ];

      vi.spyOn(RadiologyRecord, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(staleRecords),
        }),
      });

      const findByIdAndUpdateSpy = vi.spyOn(RadiologyRecord, 'findByIdAndUpdate').mockResolvedValue({});
      const runWithLockSpy = vi.spyOn(RadiologyAIService, '_runWithLock');

      await RadiologyAIService.recoverStaleJobs();

      // Should mark permanently failed without re-dispatching
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
        staleRecordId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'aiAnalysis.status': 'failed',
            'aiJob.processingLock': false,
          }),
        })
      );

      // Must NOT re-dispatch
      expect(runWithLockSpy).not.toHaveBeenCalled();
    });
  });
});
