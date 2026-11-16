// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const getMyAssignedPatients = vi.hoisted(() => vi.fn());
vi.mock('../../services/patientService', () => ({ patientService: { getMyAssignedPatients } }));

import AssignedPatients from './AssignedPatients';

afterEach(() => {
  cleanup();
  getMyAssignedPatients.mockReset();
});

describe('AssignedPatients', () => {
  it('lists the doctor\'s patients and reports the one clicked', async () => {
    getMyAssignedPatients.mockResolvedValue({
      success: true,
      data: [
        { _id: 'p1', jeevaId: 'JJ26-AAAAA', personalIdentity: { firstName: 'Divya', lastName: 'Sharma' } },
        { _id: 'p2', jeevaId: 'JJ26-BBBBB', personalIdentity: { firstName: 'Meera', lastName: 'Singh' } },
      ],
    });
    const onSelect = vi.fn();
    render(<AssignedPatients onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText('Divya Sharma')).toBeTruthy());
    expect(screen.getByText('Meera Singh')).toBeTruthy();
    fireEvent.click(screen.getByText('Meera Singh'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ _id: 'p2' }));
  });

  it('says so when nobody is assigned', async () => {
    getMyAssignedPatients.mockResolvedValue({ success: true, data: [] });
    render(<AssignedPatients />);
    await waitFor(() => expect(screen.getByText(/No patients are assigned to you yet/)).toBeTruthy());
  });

  it('shows the reason when loading fails', async () => {
    getMyAssignedPatients.mockRejectedValue({ response: { data: { message: 'Not allowed' } } });
    render(<AssignedPatients />);
    await waitFor(() => expect(screen.getByText('Not allowed')).toBeTruthy());
  });
});
