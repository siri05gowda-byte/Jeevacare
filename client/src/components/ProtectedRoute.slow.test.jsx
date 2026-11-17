// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Spinner } from './ProtectedRoute';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('loading spinner', () => {
  it('explains the wait only after it has gone on for a while', () => {
    vi.useFakeTimers();
    render(<Spinner label="Loading your account…" hintAfterMs={6000} />);
    expect(screen.queryByText(/waking up/i)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(screen.getByText(/waking up/i)).toBeTruthy();
  });

  it('stays quiet when it has no label', () => {
    vi.useFakeTimers();
    render(<Spinner />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText(/waking up/i)).toBeNull();
  });
});
