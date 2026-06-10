import { render } from '@testing-library/react';
import App from './App.tsx';

test('renders the file system tree list', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.dx-treelist')).toBeTruthy();
});
