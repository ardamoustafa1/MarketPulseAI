import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '../../components/ui/Text';

describe('Text component', () => {
  it('renders content and variant styles', () => {
    const { getByText } = render(<Text variant="h2">MarketPulse</Text>);

    expect(getByText('MarketPulse')).toBeTruthy();
  });

  it('applies custom color and alignment props', () => {
    const { getByText } = render(
      <Text color="#ffffff" align="center">
        Premium
      </Text>
    );

    const node = getByText('Premium');
    expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#ffffff' })]));
    expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ textAlign: 'center' })]));
  });
});
