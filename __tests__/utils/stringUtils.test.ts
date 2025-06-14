import { capitalizeFirstLetter } from '../../utils/stringUtils';

describe('capitalizeFirstLetter', () => {
  it('capitalizes the first letter of a word', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello');
  });

  it('returns an empty string for empty input', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });

  it('leaves already capitalized strings unchanged', () => {
    expect(capitalizeFirstLetter('Hello')).toBe('Hello');
  });
});
