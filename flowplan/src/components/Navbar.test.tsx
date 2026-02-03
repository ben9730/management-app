import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navbar } from './Navbar';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Menu: () => <div data-testid="menu-icon">Menu</div>,
    X: () => <div data-testid="x-icon">X</div>,
    CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
    LogOut: () => <div data-testid="logout-icon">LogOut</div>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    }),
}));

describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders desktop navigation links', () => {
        render(<Navbar />);
        expect(screen.getByText('לוח בקרה')).toBeInTheDocument();
        expect(screen.getByText('אודות')).toBeInTheDocument();
    });

    it('renders hamburger menu on mobile (implied by design)', () => {
        render(<Navbar />);
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('toggles mobile menu when hamburger icon is clicked', () => {
        render(<Navbar />);

        const menuButton = screen.getByTestId('menu-icon').parentElement;
        if (menuButton) {
            fireEvent.click(menuButton);
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

    // ========================================
    // NEW TESTS: Navigation Links with Correct hrefs
    // ========================================

    describe('Navigation links have correct hrefs', () => {
        it('Team link (צוות) navigates to /team route', () => {
            render(<Navbar />);

            // Find all links with text "צוות"
            const teamLinks = screen.getAllByText('צוות');

            // At least one team link should exist
            expect(teamLinks.length).toBeGreaterThan(0);

            // Check that the link has the correct href
            const teamLink = teamLinks[0].closest('a');
            expect(teamLink).toHaveAttribute('href', '/team');
        });

        it('Projects link (פרויקטים) navigates to /projects route', () => {
            render(<Navbar />);

            const projectLinks = screen.getAllByText('פרויקטים');
            expect(projectLinks.length).toBeGreaterThan(0);

            const projectLink = projectLinks[0].closest('a');
            expect(projectLink).toHaveAttribute('href', '/projects');
        });

        it('Findings link (ממצאים) navigates to /findings route', () => {
            render(<Navbar />);

            const findingsLinks = screen.getAllByText('ממצאים');
            expect(findingsLinks.length).toBeGreaterThan(0);

            const findingsLink = findingsLinks[0].closest('a');
            expect(findingsLink).toHaveAttribute('href', '/findings');
        });

        it('Dashboard link (לוח בקרה) navigates to / route', () => {
            render(<Navbar />);

            const dashboardLinks = screen.getAllByText('לוח בקרה');
            expect(dashboardLinks.length).toBeGreaterThan(0);

            const dashboardLink = dashboardLinks[0].closest('a');
            expect(dashboardLink).toHaveAttribute('href', '/');
        });

        it('About link (אודות) navigates to /about route', () => {
            render(<Navbar />);

            const aboutLinks = screen.getAllByText('אודות');
            expect(aboutLinks.length).toBeGreaterThan(0);

            const aboutLink = aboutLinks[0].closest('a');
            expect(aboutLink).toHaveAttribute('href', '/about');
        });
    });

    describe('All navigation links are functional (not placeholder #)', () => {
        it('no navigation link should have href="#"', () => {
            render(<Navbar />);

            // Get all anchor elements
            const allLinks = document.querySelectorAll('a');

            // Filter to navigation links (exclude login/register buttons)
            const navLinks = Array.from(allLinks).filter(link => {
                const text = link.textContent || '';
                return ['לוח בקרה', 'אודות', 'ממצאים', 'צוות', 'פרויקטים'].includes(text);
            });

            // Ensure no nav link has "#" as href
            navLinks.forEach(link => {
                expect(link.getAttribute('href')).not.toBe('#');
            });
        });
    });
});
