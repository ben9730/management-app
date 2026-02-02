'use client';

import React, { useState } from 'react';
import { Menu, X, CheckCircle, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
    const { user, signOut, isLoading } = useAuth();
    const router = useRouter();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    // Get user display info
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

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
                        {user ? (
                            <>
                                <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-800">
                                    <div className="text-left leading-tight hidden sm:block">
                                        <p className="text-sm font-semibold text-foreground">{userName}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                        {userInitials}
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoading}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="התנתק"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                                >
                                    התחבר
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                                >
                                    הירשם
                                </Link>
                            </>
                        )}
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
                        {user ? (
                            <>
                                <div className="pt-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                        {userInitials}
                                    </div>
                                    <div className="text-right leading-tight flex-1">
                                        <p className="text-sm font-semibold text-foreground">{userName}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 text-red-400 hover:bg-red-500/10 p-3 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>התנתק</span>
                                </button>
                            </>
                        ) : (
                            <div className="pt-4 flex flex-col gap-3">
                                <Link
                                    href="/login"
                                    onClick={closeMenu}
                                    className="w-full text-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                >
                                    התחבר
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={closeMenu}
                                    className="w-full text-center px-4 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                                >
                                    הירשם
                                </Link>
                            </div>
                        )}

                    </nav>
                </div>
            )}
        </header>
    );
};
