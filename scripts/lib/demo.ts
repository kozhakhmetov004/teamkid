/** Demo accounts (local + demo deployments only; documented in README "Demo accounts"). */
export const DEMO = {
	carter: { name: 'Carter family', code: 'TURTLE-1234' },
	diaz: { name: 'Diaz family', code: 'CORAL-5678' },
	mom: { email: 'mom@demo.teamkid.app', password: 'DemoMom!2026', name: 'Mom' },
	dad: { email: 'dad@demo.teamkid.app', password: 'DemoDad!2026', name: 'Dad' },
	ana: { email: 'ana@demo.teamkid.app', password: 'DemoAna!2026', name: 'Ana' },
	lily: { firstName: 'Lily', birthYear: 2018, pin: '1234' },
	leo: { firstName: 'Leo', birthYear: 2017, pin: '4321' }
} as const;
