/**
 * ALL copy for the public landing page, Privacy and Terms, in one place.
 *
 * Honesty rules (team agreement):
 * - No testimonials, user counts, ratings, logos or invented quotes.
 * - Every statistic links to its source (verified before use).
 * - Only features that exist on main are 'live'; everything else carries a
 *   visible badge. Flip `status` here when a feature merges.
 * - Prices are labelled as launch pricing.
 */

export type Status = 'live' | 'coming-soon' | 'in-development';

export const STATUS_LABEL: Record<Exclude<Status, 'live'>, string> = {
	'coming-soon': 'Coming soon',
	'in-development': 'In development'
};

/** Set when the team sends the address; until then a visible placeholder is shown. */
export const CONTACT_EMAIL: string | null = null;
export const CONTACT_PLACEHOLDER = '[team email]';

export const site = {
	name: 'TeamKid',
	title: 'TeamKid: the co-parenting app where your child has a voice',
	description:
		'TeamKid helps separated parents share a calendar, swap days and message calmly, and gives kids a safe, friendly space with Pebble the turtle to share what they want their parents to know.',
	tagline: 'Two homes. One team. One kid.'
};

export const nav = [
	{ href: '#how-it-works', label: 'How it works' },
	{ href: '#pebble', label: 'Pebble' },
	{ href: '#safety', label: 'Safety' },
	{ href: '#pricing', label: 'Pricing' },
	{ href: '#faq', label: 'FAQ' }
];

export const hero = {
	headline: 'Two homes. One team. One kid.',
	subhead: 'The co-parenting app where your child finally has a voice.',
	body: 'A shared calendar, calm messages and fair swaps for parents. A safe, friendly space for kids, with Pebble the turtle.',
	primaryCta: 'Start free',
	secondaryCta: 'See how it works',
	kidLink: 'Kid login',
	signedInCta: 'Open TeamKid'
};

export const problem = {
	title: 'Separation is common. Kids feel the conflict.',
	stats: [
		{
			value: '1M+',
			text: 'US children see their parents divorce each year',
			source:
				'Cao, Fine & Zhou, Clinical Child and Family Psychology Review, 2022 (based on U.S. Census data)',
			href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8805665'
		},
		{
			value: 'Nearly 1 in 3',
			text: 'American children go through parental divorce before adulthood',
			source: 'Johnston, Jones & Pope, NBER Working Paper 33776, 2025',
			href: 'https://www.nber.org/papers/w33776'
		},
		{
			value: '10.2M',
			text: 'US one-parent families with kids under 18',
			source: 'U.S. Census Bureau, via FRED (series TTLOPFWCU), 2025',
			href: 'https://fred.stlouisfed.org/series/TTLOPFWCU'
		}
	],
	closing:
		'Research keeps finding that conflict between parents is one of the biggest factors in how kids cope with divorce. Most co-parenting apps help parents argue less. TeamKid also listens to the child.',
	closingSource: {
		label: 'Cao, Fine & Zhou, 2022',
		href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8805665'
	}
};

export const howItWorks = {
	title: 'How it works',
	intro:
		'Three spaces, one family plan. Each parent has their own login; your child has their own, too.',
	columns: [
		{
			icon: 'calendar',
			title: 'Parent workspace',
			status: 'live' as Status,
			items: [
				{
					text: 'Shared custody calendar with 2-2-3 and other templates',
					status: 'live' as Status
				},
				{ text: 'Swap requests: accept, decline or counter', status: 'live' as Status },
				{ text: "Messages that can't be edited or deleted", status: 'live' as Status },
				{ text: 'Shared expenses and records', status: 'live' as Status }
			]
		},
		{
			icon: 'sparkles',
			title: 'AI assistant',
			status: 'live' as Status,
			items: [
				{ text: 'Calm rewrites before a heated message goes out', status: 'live' as Status },
				{ text: 'Parenting-plan PDF turned into your calendar', status: 'live' as Status },
				{
					text: '"Plan my weekend" ideas based on what your child likes',
					status: 'coming-soon' as Status
				}
			]
		},
		{
			icon: 'turtle',
			title: "Kids' space with Pebble",
			status: 'in-development' as Status,
			items: [
				{ text: 'A 2-minute check-in with faces and colors', status: 'in-development' as Status },
				{ text: 'Wish cards about what they want to do', status: 'in-development' as Status },
				{ text: 'The child decides what parents see', status: 'in-development' as Status }
			]
		}
	]
};

export const pebble = {
	title: 'Meet Pebble',
	status: 'in-development' as Status,
	intro:
		'Pebble is a friendly turtle who helps kids aged 6 to 12 say how they feel and what they would love to do, in their own time, at either home.',
	steps: [
		{
			title: 'Lily checks in',
			text: 'She taps a face for how she feels today. It takes about two minutes.'
		},
		{
			title: 'She picks wish cards',
			text: '"Build a blanket fort." "Go to the zoo." Small things that matter to her.'
		},
		{
			title: 'Pebble asks first',
			text: '"Want me to tell Mom and Dad about the zoo?" Nothing is shared unless she says yes.'
		},
		{
			title: 'Both parents hear the same thing',
			text: 'A short, gentle summary and an idea for the weekend, identical in both homes.'
		}
	],
	whyTitle: 'Why a turtle?',
	why: [
		'A turtle carries its home everywhere it goes, just like a child who lives in two homes.',
		'"Tuck in and breathe" is a calming step many US preschools teach. Pebble does it with your child.'
	]
};

export const features = {
	title: 'What you get',
	items: [
		{
			icon: 'calendar',
			title: 'Custody calendar',
			text: '2-2-3, week on / week off and alternate weekends, set up in a minute.',
			status: 'live' as Status
		},
		{
			icon: 'repeat',
			title: 'Swap requests',
			text: 'Ask for a different night; your co-parent accepts, declines or counters.',
			status: 'live' as Status
		},
		{
			icon: 'sparkles',
			title: 'AI tone check',
			text: 'Before you hit send, see a calmer version of a heated message.',
			status: 'live' as Status
		},
		{
			icon: 'check-check',
			title: 'Read receipts',
			text: 'Know when a message was read. Messages are kept as a record.',
			status: 'live' as Status
		},
		{
			icon: 'radio',
			title: 'Live updates',
			text: 'Both parents see changes the moment they happen.',
			status: 'live' as Status
		},
		{
			icon: 'file-text',
			title: 'Parenting-plan import',
			text: 'Upload your plan as a PDF and get the calendar filled in.',
			status: 'live' as Status
		},
		{
			icon: 'map',
			title: 'Weekend planner',
			text: 'Ideas for your time together, based on what your child likes.',
			status: 'coming-soon' as Status
		},
		{
			icon: 'wallet',
			title: 'Shared expenses',
			text: 'Log costs, agree on splits and see who owes whom.',
			status: 'live' as Status
		},
		{
			icon: 'folder-lock',
			title: 'Documents vault',
			text: 'Keep the plan, school letters and insurance cards in one safe place.',
			status: 'live' as Status
		}
	]
};

export const safety = {
	title: 'Built to protect your child',
	intro: 'These rules are part of the product, not settings you have to find.',
	points: [
		"Parents never see the child's words, only a gentle summary the child chose to share.",
		'Both parents see the same summary. No one gets a different version.',
		"Nothing from the kids' space can be exported or used in court.",
		'Both parents must agree before a child account exists.',
		'No ads, no selling data, no tracking scripts.',
		'Pebble is a friendly companion, not a therapist, and points kids to trusted grown-ups.',
		"Built with the U.S. children's privacy law (COPPA) in mind."
	],
	crisis: 'If you or your child are in crisis, call or text 988.'
};

export const professionals = {
	title: 'For family lawyers, mediators and parenting coordinators',
	text: "Parent messages can't be edited or deleted and every change to the calendar is logged, so the record is the record. Read-only access for professionals is planned.",
	cta: 'Contact us'
};

export const pricing = {
	title: 'Simple pricing',
	note: 'Launch pricing. Hardship waivers available.',
	subnote: 'Paid plans open after launch. Everyone can start on Free today.',
	plans: [
		{
			name: 'Free',
			price: '$0',
			period: '',
			status: 'live' as Status,
			highlight: false,
			items: [
				{ text: 'Shared custody calendar and swaps', status: 'live' as Status },
				{ text: 'Messages with read receipts', status: 'live' as Status },
				{ text: 'Basic Pebble for your child', status: 'in-development' as Status }
			]
		},
		{
			name: 'Family Plus',
			price: '$11.99',
			period: 'per parent / month, or $99 / year',
			status: 'live' as Status,
			highlight: true,
			items: [
				{ text: 'Full AI assistant with tone check', status: 'live' as Status },
				{ text: 'Parenting-plan import', status: 'live' as Status },
				{ text: 'Weekend planner', status: 'coming-soon' as Status },
				{ text: "Weekly insights about your child's week", status: 'in-development' as Status }
			]
		},
		{
			name: 'Court-ready add-on',
			price: 'Price TBA',
			period: '',
			status: 'coming-soon' as Status,
			highlight: false,
			items: [
				{ text: 'Certified reports of messages and the calendar', status: 'coming-soon' as Status }
			]
		}
	]
};

export const faq = {
	title: 'Questions parents ask',
	items: [
		{
			q: 'Is it free?',
			a: 'Yes. The calendar, swaps and messages are free. Family Plus adds the full AI assistant and more, at launch pricing, with hardship waivers available.'
		},
		{
			q: 'Does my co-parent have to join?',
			a: 'You can start on your own and invite them with a link. Swaps and messages need both parents, and a child account needs both parents to agree.'
		},
		{
			q: 'Can my ex read what my child tells Pebble?',
			a: "No. Neither parent ever sees the child's words. Both parents see only the same short summary, and only what the child chose to share."
		},
		{
			q: 'Is this therapy?',
			a: 'No. Pebble is a friendly companion, not a therapist. It encourages kids to talk to trusted grown-ups, and shows the 988 Lifeline when someone needs help now.'
		},
		{
			q: 'Can I use it in court?',
			a: "Parent messages are kept as a record that can't be edited or deleted. Nothing from the kids' space is ever exported or used in court. TeamKid is not legal advice."
		},
		{
			q: 'What ages is Pebble for?',
			a: 'Pebble is designed for children aged 6 to 12. A version for teens is planned for later.'
		},
		{
			q: 'Where is my data stored?',
			a: 'In a managed cloud database and file storage, protected so each family can only reach its own data. We never sell data or show ads. See the Privacy page for details.'
		},
		{
			q: 'Is it available on phones?',
			a: "TeamKid is a web app: it works in any modern browser on a phone, tablet or computer. There's nothing to install."
		}
	]
};

export const finalCta = {
	title: 'Start free in two minutes',
	text: 'Set up your family, invite your co-parent, and see your week together.',
	cta: 'Start free'
};

export const footer = {
	product: [
		{ href: '/#how-it-works', label: 'How it works' },
		{ href: '/#pebble', label: 'Pebble' },
		{ href: '/#safety', label: 'Safety' },
		{ href: '/#pricing', label: 'Pricing' },
		{ href: '/#faq', label: 'FAQ' }
	],
	app: [
		{ href: '/login', label: 'Parent login' },
		{ href: '/kid-login', label: 'Kid login' }
	],
	legal: [
		{ href: '/privacy', label: 'Privacy' },
		{ href: '/terms', label: 'Terms' }
	],
	disclaimer: 'TeamKid is a Business Cup 2.0 project. Not legal advice. Not a therapy service.',
	copyright: '© 2026 TeamKid'
};

/**
 * Product screenshots (1440×900 PNG in static/landing/). Set `available`
 * to true once the file is added; until then a labelled placeholder shows.
 */
export const screenshots = {
	dashboard: {
		src: '/landing/dashboard.png',
		alt: "A parent's Today page in TeamKid",
		available: false
	},
	messages: {
		src: '/landing/messages.png',
		alt: 'A message thread with the calm-rewrite suggestion open',
		available: false
	},
	pebble: {
		src: '/landing/pebble.png',
		alt: "Pebble the turtle on a child's home screen",
		available: false
	},
	plan: { src: '/landing/plan.png', alt: 'Weekend ideas in the planner', available: false }
} as const;

export const draftNotice = 'Draft for the competition prototype.';

export const privacyPage = {
	title: 'Privacy',
	updated: 'November 2026',
	sections: [
		{
			heading: 'What we store',
			body: [
				"For parents: your email, the display name you choose, your family's calendar, swap requests, messages and the records the app keeps (an audit log of changes).",
				"For children: a first name, birth year, a PIN (stored only as a secure hash) and what they do in the kids' space."
			]
		},
		{
			heading: "Children's data",
			body: [
				'A child account exists only after both parents agree.',
				"Parents never see the child's words. They see only a short summary of trends and the wishes the child chose to share, and both parents see the same thing.",
				"Raw chat with Pebble is deleted automatically after 30 days. Nothing from the kids' space is exported, used in court, used to train AI models or used for ads.",
				"We designed TeamKid with the U.S. children's privacy law (COPPA) in mind. Before a real launch we will complete verifiable parental consent and a full review."
			]
		},
		{
			heading: 'What we never do',
			body: ['We do not sell data, show ads or use tracking or analytics scripts.']
		},
		{
			heading: 'Who processes data',
			body: [
				'Data is stored with our database and hosting providers. When you use the AI assistant, the text you choose to check is sent to an AI provider to produce a calmer version; we do not store your original draft.'
			]
		},
		{
			heading: 'Your choices',
			body: [
				'You can ask us to export or delete your account and data by email. Records shared with your co-parent (such as messages) are kept as part of the family record unless the law requires otherwise.'
			]
		}
	]
};

export const termsPage = {
	title: 'Terms',
	updated: 'November 2026',
	sections: [
		{
			heading: 'What TeamKid is',
			body: [
				'TeamKid is a prototype built for the Business Cup 2.0 competition. It helps separated parents coordinate and gives children a safe space to share what they choose.'
			]
		},
		{
			heading: 'What TeamKid is not',
			body: [
				'TeamKid is not legal advice and not a therapy or counseling service. For legal questions, talk to a lawyer. If you or your child are in crisis, call or text 988.'
			]
		},
		{
			heading: 'Your account',
			body: [
				'Keep your login private. Parents are responsible for the information they add. Messages cannot be edited or deleted once sent.'
			]
		},
		{
			heading: 'Fair use',
			body: [
				'Do not use TeamKid to harass anyone, to share content about a child that the child would not want shared, or to break the law.'
			]
		},
		{
			heading: 'Prices and changes',
			body: [
				'Prices shown are launch pricing and may change; paid plans are not open yet. We may update the product and these terms as the prototype develops.'
			]
		}
	]
};
