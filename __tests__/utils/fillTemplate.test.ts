import { describe, expect, test } from '@jest/globals';

import { STRINGS } from '@/constants/strings';
import { fillTemplate, type TemplatePlaceholders } from '@/utils/fillTemplate';

describe('fillTemplate', () => {
  test('fills every placeholder, numbers included', () => {
    expect(fillTemplate('{count} words in {days} days', { count: 3, days: 'two' })).toBe(
      '3 words in two days',
    );
  });

  test('replaces every occurrence, not just the first', () => {
    expect(fillTemplate('{n} of {n}', { n: 5 })).toBe('5 of 5');
  });

  test('a template without placeholders comes back unchanged', () => {
    expect(fillTemplate('Done', {})).toBe('Done');
  });

  test('leaves a placeholder it has no value for as written', () => {
    const runtime: string = 'Hello {name}';
    expect(fillTemplate(runtime, {})).toBe('Hello {name}');
  });

  test('matches what the .replace chains it replaces produced for a real STRINGS template', () => {
    const template = STRINGS.FORGOT_N_TIMES;
    expect(fillTemplate(template, { count: 4 })).toBe(template.replace('{count}', '4'));
  });

  test('requires exactly the placeholders the template declares', () => {
    type Keys = TemplatePlaceholders<'{a} and {b}'>;
    const keys: Keys[] = ['a', 'b'];
    expect(keys).toHaveLength(2);

    // @ts-expect-error — `b` is missing
    fillTemplate('{a} and {b}', { a: 1 });
    // @ts-expect-error — `c` is not a placeholder of this template
    fillTemplate('{a}', { a: 1, c: 2 });
  });
});
