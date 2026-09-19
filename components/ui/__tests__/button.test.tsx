import React from 'react';
import { render } from '@testing-library/react-native';
import { Button } from '../button';

describe('Button', () => {
  it('adds busy state when isLoading is true', () => {
    const { getByRole } = render(<Button isLoading>Click Me</Button>);
    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true })
    );
  });

  it('does not have busy state when isLoading is false', () => {
    const { getByRole } = render(<Button>Click Me</Button>);
    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );
    expect(button.props.accessibilityState.busy).toBeFalsy();
  });
});
