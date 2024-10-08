import { lucia } from '$lib/server/lucia';
import { redirect, type Handle } from '@sveltejs/kit';
import type { HandleServerError } from '@sveltejs/kit';

import log from '$lib/server/log';

export const handleError: HandleServerError = async ({ error, event }) => {
	const errorId = crypto.randomUUID();

	event.locals.error = error?.toString() || '';
	if (error instanceof Error) {
		event.locals.errorStackTrace = error.stack || '';
	} else {
		event.locals.errorStackTrace = '';
	}
	event.locals.errorId = errorId;
	log(500, event);

	return {
		message: 'An unexpected error occurred.',
		errorId
	};
};
export const handle: Handle = async ({ event, resolve }) => {
	const startTimer = Date.now();
	event.locals.startTimer = startTimer;

	const sessionId = event.cookies.get(lucia.sessionCookieName);
	const { session, user } = sessionId
  ? await lucia.validateSession(sessionId)
  : { session: null, user: null };
console.log('Session validated:', !!session, 'User:', !!user);

	// Handle authentication for protected routes
    if (event.url.pathname.startsWith('/(protected)')) {
        if (!user) {
            console.log('Redirecting unauthenticated user from protected route');
            throw redirect(303, '/auth/sign-in');
        }
        if (!user.verified && event.url.pathname !== '/auth/verify/email') {
            console.log('Redirecting unverified user to email verification');
            throw redirect(303, '/auth/verify/email');
        }
    }

    // Handle admin routes
    if (event.url.pathname.startsWith('/(admin)')) {
        if (!user || user.role !== 'ADMIN') {
            console.log('Redirecting non-admin user from admin route');
            throw redirect(303, '/auth/sign-in');
        }
    }

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	event.locals.user = user;
	event.locals.session = session;

	if (event.route.id?.startsWith('/(protected)')) {
		if (!user) redirect(302, '/auth/sign-in');
		if (!user.verified) redirect(302, '/auth/verify/email');
	}
	if (event.route.id?.startsWith('/(admin)')) {
		if (user?.role !== 'ADMIN') redirect(302, '/auth/sign-in');
	}

	const response = await resolve(event);
	log(response.status, event);
	return response;
};
