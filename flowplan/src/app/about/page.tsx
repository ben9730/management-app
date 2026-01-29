'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header Breadcrumb */}
                <div className="flex items-center gap-2 mb-12 text-slate-500">
                    <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                        <span className="material-icons text-lg">home</span>
                        בית
                    </Link>
                    <span className="material-icons text-sm">chevron_left</span>
                    <span className="text-sm font-medium">אודות</span>
                </div>

                {/* Profile Section */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-[24px] p-8 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

                    <div className="relative flex flex-col md:flex-row items-center gap-12">
                        {/* Image Wrapper */}
                        <div className="relative">
                            <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl relative z-10">
                                <Image
                                    src="/images/ben-profile.jpeg"
                                    alt="בן גוטמן"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>
                        </div>

                        {/* Content Wrapper */}
                        <div className="flex-1 text-right">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">בן גוטמן</h1>
                            <h2 className="text-xl text-primary font-medium mb-8">בוגר מדעי המחשב | מפתח תוכנה</h2>

                            {/* Professional English Summary (User's specific text) */}
                            <div className="mt-6 p-8 bg-slate-800/50 rounded-2xl border border-primary/10 italic text-slate-300 font-sans leading-relaxed text-left text-lg" dir="ltr">
                                "My name is Ben Gutman I graduated in Computer Science from the College of Management Academic Studies.
                                I'm a hard worker, autodidactic, highly motivated, and eager to learn new technologies. I'm a team player and enthusiastic about working in a cooperative environment."
                            </div>
                        </div>
                    </div>
                </div>

                {/* Internship Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-8 flex items-center justify-between">
                        <div className="text-right">
                            <h3 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-2">התמחות נוכחית</h3>
                            <p className="text-2xl font-bold">International Center of AI</p>
                        </div>
                        <div className="w-32 h-32 relative bg-white rounded-xl p-3 flex items-center justify-center shadow-lg border border-slate-200">
                            <Image
                                src="/images/internship-logo.jpeg"
                                alt="Logo"
                                width={120}
                                height={120}
                                className="object-contain rounded"
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-2xl p-8 flex items-center justify-center text-center">
                        <div>
                            <p className="text-slate-300 font-medium italic mb-2">"נלהב ליצור פתרונות טכנולוגיים חכמים"</p>
                            <div className="h-1 w-12 bg-primary mx-auto rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
