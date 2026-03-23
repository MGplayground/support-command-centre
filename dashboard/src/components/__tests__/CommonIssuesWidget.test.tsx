import React from 'react';
import { render, screen } from '@testing-library/react';
import CommonIssuesWidget from '../CommonIssuesWidget';

describe('CommonIssuesWidget', () => {
    it('shows an empty state when issues list is empty', () => {
        render(<CommonIssuesWidget issues={[]} />);
        expect(screen.getByText(/No recent issue trends found/i)).toBeInTheDocument();
    });

    it('shows the empty state when issues is undefined (uses default empty array)', () => {
        // issues defaults to [] via the prop default, so the "no trends" message appears
        render(<CommonIssuesWidget issues={undefined} />);
        expect(screen.getByText(/No recent issue trends found/i)).toBeInTheDocument();
    });

    it('renders a list of issue themes', () => {
        const mockIssues = [
            {
                issue_theme: 'technical bugs',
                frequency: 12,
                example_ticket: 'Widget not displaying on live site',
            },
            {
                issue_theme: 'billing',
                frequency: 5,
                example_ticket: 'Incorrect charge on my account',
            },
        ];

        render(<CommonIssuesWidget issues={mockIssues} />);
        expect(screen.getByText(/technical bugs/i)).toBeInTheDocument();
        expect(screen.getByText(/billing/i)).toBeInTheDocument();
    });
});
