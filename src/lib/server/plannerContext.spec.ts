import { describe, expect, it } from 'vitest';
import { scrubName } from './plannerContext.js';

describe('scrubName', () => {
	it("removes the child's name before anything goes to the LLM", () => {
		expect(
			scrubName(['Go to the zoo with Lily', "Lily's fort", 'LILY wants pizza'], 'Lily')
		).toEqual(['Go to the zoo with my child', "my child's fort", 'my child wants pizza']);
	});

	it('leaves words that only contain the name alone', () => {
		expect(scrubName(['Lilypad pond'], 'Lily')).toEqual(['Lilypad pond']);
		expect(scrubName(['zoo'], null)).toEqual(['zoo']);
	});
});
