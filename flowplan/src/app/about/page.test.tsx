import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AboutPage from './page'
import React from 'react'

describe('About Page', () => {
    it('renders Ben Gutman name and introduction', () => {
        render(<AboutPage />)
        expect(screen.getByText('בן גוטמן')).toBeInTheDocument()
        expect(screen.getByText(/I graduated in Computer Science/i)).toBeInTheDocument()
    })

    it('renders the profile image and internship logo', () => {
        render(<AboutPage />)
        const images = screen.getAllByRole('img')
        const imageSources = images.map(img => img.getAttribute('src'))

        // Since Next.js Image component might change the src, we check if it contains the substring
        expect(imageSources.some(src => src?.includes('ben-profile.jpeg'))).toBe(true)
        expect(imageSources.some(src => src?.includes('internship-logo.jpeg'))).toBe(true)
    })

    it('renders the professional summary provided by the user and does NOT render the Hebrew translation', () => {
        render(<AboutPage />)
        const introText = "My name is Ben Gutman I graduated in Computer Science from the College of Management Academic Studies. I'm a hard worker, autodidactic, highly motivated, and eager to learn new technologies. I'm a team player and enthusiastic about working in a cooperative environment."
        expect(screen.getByText(new RegExp(introText, 'i'))).toBeInTheDocument()

        // Check that specific Hebrew phrases from the previous version are gone
        expect(screen.queryByText(/שמי בן גוטמן/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/אני אדם חרוץ/i)).not.toBeInTheDocument()
    })
})
