import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App entry point', () => {
  it('renders root component without crashing', () => {
    const result = render(<App />);
    expect(result.toJSON()).toBeTruthy();
  });
});
