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

        try {
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
        } catch (error) {
            console.error('Session creation error:', error);
            form.error = 'An unexpected error occurred';
            return fail(500, { form });
        }

        // Perform the redirect outside of any try-catch block
        throw redirect(302, '/dashboard');
    }
};