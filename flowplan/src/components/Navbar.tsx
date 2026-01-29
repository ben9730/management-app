'use client';

import React, { useState } from 'react';
import { Menu, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavLinkProps {
    href: string;
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

const NavLink = ({ href, children, active, onClick, className }: NavLinkProps) => {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "transition-colors",
                active
                    ? "text-primary font-semibold"
                    : "text-slate-500 hover:text-primary dark:text-slate-400",
                className
            )}
        >
            {children}
        </Link>
    );
};

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    const navLinks = [
        { href: "/", label: "לוח בקרה" },
        { href: "/about", label: "אודות" },
        { href: "#", label: "ממצאים" },
        { href: "#", label: "צוות" },
        { href: "#", label: "פרויקטים" },
    ];

    return (
        <header className="border-b border-slate-200 dark:border-slate-800 bg-surface sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo & Nav (Right side - RTL) */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg">
                            <CheckCircle className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            FlowPlan <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">BETA</span>
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <NavLink key={link.label} href={link.href}>
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* User Profile & Mobile Toggle (Left side - RTL) */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
                            <span className="material-icons">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-800">
                            <div className="text-left leading-tight hidden sm:block">
                                <p className="text-sm font-semibold text-foreground">דוד כהן</p>
                                <p className="text-xs text-slate-500">מנהל פרויקט</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">DC</div>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        onClick={toggleMenu}
                        aria-label="Toggle Menu"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isOpen && (
                <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-surface animate-in slide-in-from-top duration-200">
                    <nav className="flex flex-col p-4 gap-4">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.label}
                                href={link.href}
                                onClick={closeMenu}
                                className="text-lg py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                            >
                                {link.label}
                            </NavLink>
                        ))}
                        <div className="pt-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">DC</div>
                            <div className="text-right leading-tight">
                                <p className="text-sm font-semibold text-foreground">דוד כהן</p>
                                <p className="text-xs text-slate-500">מנהל פרויקט</p>
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};
