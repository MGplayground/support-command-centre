import React from 'react';
import { render, screen } from '@testing-library/react';
import ChurnRiskCard from '../ChurnRiskCard';

describe('ChurnRiskCard', () => {
    it('shows a loading/analysing state when accounts is undefined', () => {
        render(<ChurnRiskCard accounts={undefined} />);
        expect(screen.getByText(/Analyzing customer sentiment/i)).toBeInTheDocument();
    });

    it('shows an empty state when accounts is an empty array', () => {
        render(<ChurnRiskCard accounts={[]} />);
        expect(screen.getByText(/No high-risk accounts detected recently/i)).toBeInTheDocument();
    });

    it('renders a list of churn risk accounts', () => {
        const mockAccounts = [
            {
                id: '1',
                customerEmail: 'test@example.com',
                customerName: 'Test User',
                review: 'I want to cancel my subscription',
                updatedAt: 1700000000,
                churnDriver: 'pricing',
            },
        ];

        render(<ChurnRiskCard accounts={mockAccounts} />);
        // Should show the customer name
        expect(screen.getByText('Test User')).toBeInTheDocument();
        // Should show a snippet of the review
        expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
});
