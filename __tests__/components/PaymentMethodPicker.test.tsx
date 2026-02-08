import { PaymentMethodPicker } from '@/components/sales/PaymentMethodPicker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

describe('PaymentMethodPicker', () => {
    const mockOnSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render all payment methods', () => {
        render(<PaymentMethodPicker selected="Cash" onSelect={mockOnSelect} />);

        expect(screen.getByText('Cash')).toBeTruthy();
        expect(screen.getByText('Transfer')).toBeTruthy();
        expect(screen.getByText('POS')).toBeTruthy();
        expect(screen.getByText('Pay Later')).toBeTruthy();
    });

    it('should render Payment title', () => {
        render(<PaymentMethodPicker selected="Cash" onSelect={mockOnSelect} />);

        expect(screen.getByText('Payment')).toBeTruthy();
    });

    it('should call onSelect when a method is pressed', () => {
        render(<PaymentMethodPicker selected="Cash" onSelect={mockOnSelect} />);

        fireEvent.press(screen.getByText('Transfer'));

        expect(mockOnSelect).toHaveBeenCalledWith('Transfer');
    });

    it('should call onSelect with Pay Later when pressed', () => {
        render(<PaymentMethodPicker selected="Cash" onSelect={mockOnSelect} />);

        fireEvent.press(screen.getByText('Pay Later'));

        expect(mockOnSelect).toHaveBeenCalledWith('Pay Later');
    });
});
