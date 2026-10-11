import { describe, it, expect } from 'vitest';
import Logo from './Logo';
import iconLight from '../assets/logos/jeevacare-icon.svg';
import iconDark from '../assets/logos/jeevacare-icon-dark.svg';
import iconMonochrome from '../assets/logos/jeevacare-icon-monochrome.svg';

describe('Logo Component', () => {
  it('imports valid SVG asset paths', () => {
    expect(iconLight).toBeTruthy();
    expect(iconDark).toBeTruthy();
    expect(iconMonochrome).toBeTruthy();
  });

  it('renders default light logo element', () => {
    const element = Logo({});
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });

  it('renders dark variant when requested', () => {
    const element = Logo({ variant: 'dark' });
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });

  it('renders wrapped in Link when href is provided', () => {
    const element = Logo({ href: '/dashboard' });
    expect(element).toBeDefined();
    expect(element.props.to).toBe('/dashboard');
  });
});
