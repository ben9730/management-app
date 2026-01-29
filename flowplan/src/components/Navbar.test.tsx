import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navbar } from './Navbar';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Menu: () => <div data-testid="menu-icon">Menu</div>,
    X: () => <div data-testid="x-icon">X</div>,
    CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
}));

describe('Navbar Component', () => {
    it('renders desktop navigation links', () => {
        // Note: We might need to mock window.innerWidth or use a specific layout if testing media queries with JSDOM
        render(<Navbar />);
        expect(screen.getByText('לוח בקרה')).toBeInTheDocument();
        expect(screen.getByText('אודות')).toBeInTheDocument();
    });

    it('renders hamburger menu on mobile (implied by design)', () => {
        render(<Navbar />);
        // Check if hamburger button exists
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('toggles mobile menu when hamburger icon is clicked', () => {
        render(<Navbar />);

        // Initially menu content might be hidden (depending on implementation - if using state)
        // For this test, let's assume we toggle visibility
        const menuButton = screen.getByTestId('menu-icon').parentElement;
        if (menuButton) {
            fireEvent.click(menuButton);
            // After click, X icon should be visible
            expect(screen.getByTestId('x-icon')).toBeInTheDocument();
        }
    });

    it('closes mobile menu when X icon is clicked', () => {
        render(<Navbar />);

        const menuButton = screen.getByTestId('menu-icon').parentElement;
        if (menuButton) {
            fireEvent.click(menuButton);
            const closeButton = screen.getByTestId('x-icon').parentElement;
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
            }
        }
    });
});
