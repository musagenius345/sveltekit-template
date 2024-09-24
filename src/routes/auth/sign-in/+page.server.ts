// auth/signin/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { lucia } from '$lib/server/lucia';
import { Argon2id } from 'oslo/password';
import { getUserByEmail } from '$lib/server/database/user-model';

const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

export const load = async (event) => {
    if (event.locals.user) {
        throw redirect(302, '/dashboard');
    }
    const form = await superValidate(event, signInSchema);
    return { form };
};

export const actions = {
    default: async (event) => {
        const form = await superValidate(event, signInSchema);
        console.log('Form data:', form.data);

        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            const email = form.data.email.toLowerCase();
            const user = await getUserByEmail(email);
            console.log('User found:', !!user);

            if (!user || !user.password) {
                console.log('User not found or no password');
                form.error = 'Invalid credentials';
                return fail(400, { form });
            }

            const validPassword = await new Argon2id().verify(user.password, form.data.password);
            console.log('Password valid:', validPassword);

            if (!validPassword) {
                form.error = 'Invalid credentials';
                return fail(400, { form });
            }

            // Set expiration to 30 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const session = await lucia.createSession(user.id, {
                expiresAt: expiresAt
            });
            console.log('Session created:', session.id);

            const sessionCookie = lucia.createSessionCookie(session.id);
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: '.',
                ...sessionCookie.attributes
            });

            console.log('Session cookie set, redirecting');
            throw redirect(302, '/dashboard');
        } catch (error) {
            console.error('Sign-in error:', error);
            if (error instanceof Response && error.status === 302) {
                throw error; // Re-throw redirect
            }
            form.error = 'An unexpected error occurred';
            return fail(500, { form });
        }
    }
};