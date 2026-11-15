/**
 * /plan moved into the Calendar ("Plan this weekend" panel). Old links and
 * bookmarks land there. /plan/import (parenting-plan PDF) is unchanged.
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => redirect(308, '/calendar#plan');
